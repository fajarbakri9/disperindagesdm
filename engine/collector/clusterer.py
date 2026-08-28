"""
clusterer.py — Issue Deduplication & Clustering
Rule MVP:
  1. Topik (cluster) sama
  2. Lokasi (kecamatan/desa) sama atau overlap
  3. Judul mirip > 65% (Jaccard bigram similarity)
  4. Dipublish dalam 72 jam dari mention pertama issue

Output: issueId — baru dibuat atau sudah ada
"""
from __future__ import annotations
import hashlib
import re
from datetime import datetime, timezone


# ────────────────────────────────────────────────────────────
#  DEDUPLICATE: Cari issue yang cocok
# ────────────────────────────────────────────────────────────

def find_matching_issue(
    mention: dict,
    existing_issues: list[dict],
    similarity_threshold: float = 0.65,
    time_window_hours: int = 72,
) -> str | None:
    """
    Cari issueId yang cocok untuk mention baru.
    Return issueId jika ditemukan, None jika harus buat issue baru.
    """
    mention_clusters  = set(mention.get("matchedClusters", []))
    mention_district  = mention.get("geo", {}).get("district", "").lower()
    mention_village   = mention.get("geo", {}).get("village", "").lower()
    mention_pub       = _parse_dt(mention.get("publishedAt", ""))
    mention_title     = mention.get("title", "")

    for issue in existing_issues:
        # ── 1. Cek cluster topik ──────────────────────────────
        issue_category = issue.get("category", "").lower()
        if issue_category and not mention_clusters.intersection({issue_category}):
            # Fallback: cek topics array
            issue_topics = set(t.lower() for t in issue.get("topics", []))
            mention_topics = set(t.lower() for t in mention.get("topics", []))
            if not issue_topics.intersection(mention_topics):
                continue

        # ── 2. Cek lokasi ─────────────────────────────────────
        issue_district = issue.get("location", {}).get("district", "").lower()
        issue_village  = issue.get("location", {}).get("village", "").lower()

        loc_match = (
            (mention_district and mention_district == issue_district) or
            (mention_village  and mention_village  == issue_village)  or
            (mention_district and mention_district in issue.get("title", "").lower())
        )
        if not loc_match:
            continue

        # ── 3. Cek window waktu 72 jam ───────────────────────
        issue_started = _parse_dt(issue.get("startedAt", ""))
        if mention_pub and issue_started:
            delta_hours = abs((mention_pub - issue_started).total_seconds()) / 3600
            if delta_hours > time_window_hours:
                continue

        # ── 4. Cek judul similarity ───────────────────────────
        issue_title = issue.get("title", "")
        sim = jaccard_bigram(mention_title, issue_title)
        if sim >= similarity_threshold:
            return issue["id"]

        # Bonus: relaxed match jika cluster+lokasi sangat kuat
        if sim >= 0.40 and loc_match and mention_clusters.intersection({issue_category}):
            return issue["id"]

    return None


# ────────────────────────────────────────────────────────────
#  BUAT ISSUE BARU
# ────────────────────────────────────────────────────────────

def create_new_issue(mention: dict, keywords_raw: list) -> dict:
    """Buat Master Issue baru dari mention pertama."""
    clusters  = mention.get("matchedClusters", [])
    category  = clusters[0] if clusters else "general"
    geo       = mention.get("geo", {})

    # Severity dari cluster
    severity = 30
    for cluster in keywords_raw:
        if cluster["id"] in clusters:
            severity = max(severity, cluster.get("severityBase", 30))

    # Generate issue ID
    key     = f"{category}_{geo.get('district', 'pinrang')}_{mention.get('publishedAt', '')[:10]}"
    issue_id = hashlib.md5(key.encode()).hexdigest()[:16]
    issue_id = f"{category[:8]}_{issue_id[:8]}"

    return {
        "id":               issue_id,
        "title":            _generate_issue_title(mention),
        "category":         category,
        "topics":           mention.get("topics", []),
        "status":           "monitor",
        "location": {
            "regency":  geo.get("regency", "Pinrang"),
            "district": geo.get("district", ""),
            "village":  geo.get("village", ""),
        },
        "startedAt":        mention.get("publishedAt", ""),
        "latestUpdate":     mention.get("publishedAt", ""),
        "sourceCount":      1,
        "mentionCount":     1,
        "criticalScore":    severity,
        "sentiment":        mention.get("sentiment", {}).get("label", "neutral"),
        "escalationStatus": "local",
        "escalationTimeline": [{
            "time":   _format_time(mention.get("publishedAt", "")),
            "source": mention.get("source", {}).get("name", ""),
            "tier":   mention.get("source", {}).get("tier", "A"),
        }],
        "relatedMentionIds": [mention.get("id", "")],
        "officialResponse":  "",
        "watchlistMatch":    [],
        "watchlistMultiplier": 1.0,
        "createdAt":         datetime.now(timezone.utc).isoformat(),
        "updatedAt":         datetime.now(timezone.utc).isoformat(),
    }


def _generate_issue_title(mention: dict) -> str:
    """Generate judul ringkas untuk Master Issue."""
    category = (mention.get("matchedClusters") or ["Isu"])[0].upper()
    district = mention.get("geo", {}).get("district", "Pinrang")
    return f"Isu {category} — {district}"


# ────────────────────────────────────────────────────────────
#  UPDATE ISSUE YANG ADA
# ────────────────────────────────────────────────────────────

def update_issue(issue: dict, mention: dict) -> dict:
    """Tambah mention baru ke issue yang sudah ada."""
    issue = issue.copy()
    issue["mentionCount"]   = issue.get("mentionCount", 0) + 1
    issue["latestUpdate"]   = mention.get("publishedAt", issue["latestUpdate"])
    issue["updatedAt"]      = datetime.now(timezone.utc).isoformat()

    # Update source count
    related = set(issue.get("relatedMentionIds", []))
    related.add(mention.get("id", ""))
    issue["relatedMentionIds"] = list(related)

    # Update escalation timeline
    timeline = issue.get("escalationTimeline", [])
    src_name = mention.get("source", {}).get("name", "")
    if not any(t.get("source") == src_name for t in timeline):
        timeline.append({
            "time":   _format_time(mention.get("publishedAt", "")),
            "source": src_name,
            "tier":   mention.get("source", {}).get("tier", "A"),
        })
        issue["escalationTimeline"] = sorted(timeline, key=lambda x: x.get("time", ""))

    # Deteksi escalation
    tiers = set(t.get("tier", "A") for t in issue["escalationTimeline"])
    if "B" in tiers:
        issue["escalationStatus"] = "national"
    elif len(tiers) > 1:
        issue["escalationStatus"] = "regional"

    # Update source count (unik)
    issue["sourceCount"] = len(set(t.get("source") for t in issue["escalationTimeline"]))

    # Update sentiment (dominan)
    sentiment = mention.get("sentiment", {}).get("label", "neutral")
    if sentiment == "negative":
        issue["sentiment"] = "negative"

    return issue


# ────────────────────────────────────────────────────────────
#  SIMILARITY — Jaccard Bigram
# ────────────────────────────────────────────────────────────

def jaccard_bigram(text_a: str, text_b: str) -> float:
    """Hitung Jaccard similarity berdasarkan bigram kata."""
    def bigrams(text: str) -> set:
        words = re.sub(r"[^\w\s]", "", text.lower()).split()
        return set(zip(words, words[1:])) if len(words) > 1 else set(words)

    bg_a = bigrams(text_a)
    bg_b = bigrams(text_b)
    if not bg_a or not bg_b:
        return 0.0
    intersection = len(bg_a & bg_b)
    union        = len(bg_a | bg_b)
    return intersection / union if union > 0 else 0.0


# ────────────────────────────────────────────────────────────
#  UTILS
# ────────────────────────────────────────────────────────────

def _parse_dt(dt_str: str) -> datetime | None:
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return None


def _format_time(dt_str: str) -> str:
    dt = _parse_dt(dt_str)
    if dt:
        return dt.strftime("%H:%M")
    return ""
