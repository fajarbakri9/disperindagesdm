"""
relevance.py — Relevance Score Engine & Critical Score Engine
Formula lengkap berdasarkan blueprint:

RELEVANCE SCORE = 0-100
  Geo match      max 30
  Topic match    max 30
  Entity match   max 15
  Risk keyword   max 15
  Source weight  max 10

CRITICAL SCORE = 0-100 (dihitung per Issue, bukan per artikel)
  Severity           × 0.25
  Mention velocity   × 0.20
  Source count       × 0.15
  Negative pct       × 0.10
  Citizen complaints × 0.10
  Geo spread         × 0.10
  Public engagement  × 0.10
"""
from __future__ import annotations
import re
from datetime import datetime, timezone


# ────────────────────────────────────────────────────────────
#  RELEVANCE SCORE
# ────────────────────────────────────────────────────────────

def calculate_relevance(
    title: str,
    excerpt: str,
    source: dict,
    geo: dict,           # output dari get_all_geo_terms()
    kw:  dict,           # output dari get_all_keyword_terms()
    keywords_raw: list,  # list cluster dari keyword_dictionary.json
) -> dict:
    """
    Hitung relevance score untuk satu artikel.
    Return dict: { score, geo_score, topic_score, entity_score,
                   risk_score, source_score, matched_geo, matched_keywords,
                   matched_risk, status, scope }
    """
    text  = (title + " " + excerpt).lower()
    result = {
        "score": 0,
        "geo_score": 0,
        "topic_score": 0,
        "entity_score": 0,
        "risk_score": 0,
        "source_score": 0,
        "matched_geo": [],
        "matched_clusters": [],
        "matched_keywords": [],
        "matched_risk": [],
        "status": "ignore",
        "scope": "local_issue"
    }

    # ── 1. Geographic Match (max 30) ─────────────────────────
    geo_score = 0
    matched_geo = []

    for term in geo["strategic"]:
        if term in text:
            geo_score = max(geo_score, 30)
            matched_geo.append(term)

    for term in geo["village"]:
        if term in text:
            geo_score = max(geo_score, 28)
            matched_geo.append(term)

    for term in geo["kecamatan"]:
        if term in text:
            geo_score = max(geo_score, 20)
            matched_geo.append(term)

    for term in geo["kabupaten"]:
        if term in text:
            geo_score = max(geo_score, 15)
            matched_geo.append(term)

    result["geo_score"]   = min(geo_score, 30)
    result["matched_geo"] = list(set(matched_geo))

    # ── 2. Topic Match (max 30) ───────────────────────────────
    topic_score = 0
    matched_clusters   = []
    matched_keywords   = []

    for cluster in keywords_raw:
        if not cluster.get("enabled", True):
            continue
        hits = []
        for term in cluster.get("terms", []):
            if term.lower() in text:
                hits.append(term)
        if hits:
            multiplier = min(cluster.get("riskMultiplier", 1.0), 2.5)
            score_add  = min(len(hits) * 6 * multiplier / 2.5, 30)
            topic_score = min(topic_score + score_add, 30)
            matched_clusters.append(cluster["id"])
            matched_keywords.extend(hits)

    result["topic_score"]     = min(topic_score, 30)
    result["matched_clusters"]= list(set(matched_clusters))
    result["matched_keywords"]= list(set(matched_keywords))

    # ── 3. Entity Match (max 15) ──────────────────────────────
    entity_cluster = next((c for c in keywords_raw if c["id"] == "entity"), None)
    entity_score   = 0
    if entity_cluster:
        for term in entity_cluster.get("terms", []):
            if term.lower() in text:
                entity_score += 15
                break
    result["entity_score"] = min(entity_score, 15)

    # ── 4. Risk Keyword (max 15) ──────────────────────────────
    risk_score   = 0
    matched_risk = []
    for term in kw["risk"]:
        if term in text:
            risk_score += 5
            matched_risk.append(term)
    result["risk_score"]   = min(risk_score, 15)
    result["matched_risk"] = list(set(matched_risk))

    # ── 5. Source Relevance (max 10) ─────────────────────────
    src_weight          = source.get("sourceWeight", 0.75)
    result["source_score"] = min(int(src_weight * 10), 10)

    # ── Total ─────────────────────────────────────────────────
    total = (
        result["geo_score"]    +
        result["topic_score"]  +
        result["entity_score"] +
        result["risk_score"]   +
        result["source_score"]
    )
    result["score"] = min(total, 100)

    # ── Status label ──────────────────────────────────────────
    s = result["score"]
    if   s >= 75: result["status"] = "high"
    elif s >= 60: result["status"] = "relevant"
    elif s >= 45: result["status"] = "monitor"
    elif s >= 30: result["status"] = "candidate"
    else:         result["status"] = "ignore"

    # ── Scope detection ───────────────────────────────────────
    # policy_impact: tidak ada geo Pinrang tapi ada cluster policy_impact
    has_kabupaten = any(t in text for t in geo["kabupaten"])
    if not has_kabupaten and "policy_impact" in matched_clusters:
        result["scope"] = "policy_impact"
        result["score"] = max(result["score"], 45)  # Policy impact selalu masuk monitor

    return result


def passes_tier_filter(article_text: str, source: dict, geo: dict, kw: dict, keywords_raw: list) -> bool:
    """
    Cek apakah artikel lolos filter sesuai tier sumber.
    Tier A+ pinrangSpecific → semua lolos.
    Tier A+ → geo_required + 1 topic.
    Tier A  → geo kabupaten required + 1 topic.
    Tier B  → geo kabupaten required + (entity OR kecamatan+cluster).
    """
    text = article_text.lower()
    tier = source.get("tier", "A")

    # Tier A+ yang dedicated Pinrang → skip filter
    if source.get("pinrangSpecific"):
        return True

    # Cek geo kabupaten
    has_kabupaten  = any(t in text for t in geo["kabupaten"])
    has_kecamatan  = any(t in text for t in geo["kecamatan"])
    has_topic      = any(t in text for t in kw["terms"])
    has_entity     = any(t.lower() in text for cluster in keywords_raw
                         if cluster["id"] == "entity"
                         for t in cluster.get("terms", []))

    if tier == "A+":
        return (has_kabupaten or has_kecamatan) and has_topic

    if tier == "A":
        return has_kabupaten and has_topic

    if tier == "B":
        # Cek policy_impact cluster
        policy_cluster = next((c for c in keywords_raw if c["id"] == "policy_impact"), None)
        has_policy = policy_cluster and any(t.lower() in text for t in policy_cluster.get("terms", []))
        return has_kabupaten and (has_entity or (has_kecamatan and has_topic) or has_policy)

    return has_kabupaten and has_topic


# ────────────────────────────────────────────────────────────
#  CRITICAL SCORE (per Issue, dihitung saat issue diupdate)
# ────────────────────────────────────────────────────────────

def calculate_critical_score(issue: dict, mentions: list[dict], keywords_raw: list) -> int:
    """
    Hitung Critical Score untuk satu Master Issue berdasarkan semua mentionnya.
    """
    if not mentions:
        return 0

    weights = {
        "severity":           0.25,
        "mention_velocity":   0.20,
        "source_count":       0.15,
        "negative_pct":       0.10,
        "citizen_complaints": 0.10,
        "geo_spread":         0.10,
        "public_engagement":  0.10,
    }

    # 1. Severity — dari cluster dengan severityBase tertinggi yang match
    matched_clusters = set()
    for m in mentions:
        matched_clusters.update(m.get("matchedClusters", []))

    severity = 30  # default
    for cluster in keywords_raw:
        if cluster["id"] in matched_clusters:
            severity = max(severity, cluster.get("severityBase", 30))

    # 2. Mention velocity (24 jam terakhir)
    now = datetime.now(timezone.utc)
    recent = 0
    for m in mentions:
        pub = m.get("publishedAt")
        if pub:
            try:
                dt = datetime.fromisoformat(pub.replace("Z", "+00:00"))
                if (now - dt).total_seconds() <= 86400:
                    recent += 1
            except Exception:
                pass
    velocity = min(recent * 15, 100)

    # 3. Source count (unik)
    unique_sources = len(set(m.get("source", {}).get("id", "") for m in mentions))
    source_count   = min(unique_sources * 20, 100)

    # 4. Negative sentiment %
    neg_count = sum(1 for m in mentions if m.get("sentiment", {}).get("label") == "negative")
    neg_pct   = (neg_count / len(mentions)) * 100 if mentions else 0

    # 5. Citizen complaints
    complaints    = sum(1 for m in mentions if m.get("aspiration", {}).get("type") == "complaint")
    complaint_score = min(complaints * 20, 100)

    # 6. Geographic spread (unik kecamatan)
    unique_districts = len(set(
        m.get("geo", {}).get("district", "") for m in mentions
        if m.get("geo", {}).get("district")
    ))
    geo_spread = min(unique_districts * 25, 100)

    # 7. Public engagement (proxy: sum bobot sumber)
    total_weight  = sum(m.get("source", {}).get("weight", 0.75) for m in mentions)
    engagement    = min(total_weight * 15, 100)

    # ── Hitung total ──────────────────────────────────────────
    raw = (
        severity        * weights["severity"]           +
        velocity        * weights["mention_velocity"]   +
        source_count    * weights["source_count"]       +
        neg_pct         * weights["negative_pct"]       +
        complaint_score * weights["citizen_complaints"] +
        geo_spread      * weights["geo_spread"]         +
        engagement      * weights["public_engagement"]
    )

    # ── Escalation boost ──────────────────────────────────────
    tiers = set(m.get("source", {}).get("tier", "A") for m in mentions)
    if "B" in tiers:  # isu naik ke nasional
        raw = min(raw * 1.30, 100)
    elif len(tiers) > 1:  # isu naik ke regional
        raw = min(raw * 1.15, 100)

    # Velocity boost: makin cepat makin kritis
    if len(mentions) >= 3:
        first = None
        last  = None
        for m in mentions:
            pub = m.get("publishedAt")
            if pub:
                try:
                    dt = datetime.fromisoformat(pub.replace("Z", "+00:00"))
                    if first is None or dt < first:
                        first = dt
                    if last is None or dt > last:
                        last = dt
                except Exception:
                    pass
        if first and last:
            delta_hours = (last - first).total_seconds() / 3600
            if delta_hours < 6:
                raw = min(raw * 1.20, 100)

    return int(raw)


def critical_status(score: int) -> str:
    if   score >= 90: return "kritis"
    elif score >= 75: return "tinggi"
    elif score >= 60: return "waspada"
    elif score >= 40: return "monitor"
    else:             return "normal"
