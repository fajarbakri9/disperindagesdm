"""
firestore_writer.py — Tulis data ke Firebase Firestore
Menggunakan firebase-admin SDK (service account).
"""
from __future__ import annotations
import hashlib
import json
import os
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore

_db = None


def _get_db():
    global _db
    if _db is None:
        # Coba dari environment variable (GitHub Actions)
        sa_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
        if sa_json:
            sa_dict = json.loads(sa_json)
            cred = credentials.Certificate(sa_dict)
        else:
            # Fallback: file lokal saat development
            sa_path = os.path.join(os.path.dirname(__file__), "..", "firebase-sa.json")
            cred = credentials.Certificate(sa_path)

        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        _db = firestore.client()
    return _db


def url_to_doc_id(url: str) -> str:
    """Hash URL menjadi Firestore document ID."""
    return hashlib.md5(url.encode()).hexdigest()[:20]


# ────────────────────────────────────────────────────────────
#  MENTIONS
# ────────────────────────────────────────────────────────────

def get_existing_mention_hashes(limit: int = 1000) -> set[str]:
    """Ambil hash URL mention yang sudah ada di Firestore."""
    db  = _get_db()
    ref = db.collection("mentions").select(["_urlHash"]).limit(limit).stream()
    return {doc.get("_urlHash") for doc in ref if doc.get("_urlHash")}


def save_mention(mention: dict) -> str:
    """Simpan mention ke Firestore. Return doc_id."""
    db     = _get_db()
    url    = mention.get("sourceUrl", "")
    doc_id = url_to_doc_id(url)

    doc = {
        "id":           doc_id,
        "_urlHash":     doc_id,
        "type":         mention.get("type", "news"),
        "scope":        mention.get("scope", "local_issue"),
        "title":        mention.get("title", ""),
        "excerpt":      mention.get("excerpt", ""),
        "thumbnailUrl": mention.get("thumbnailUrl", ""),
        "sourceUrl":    url,
        "source": {
            "id":     mention.get("source_id", ""),
            "name":   mention.get("source_name", ""),
            "domain": mention.get("source_domain", ""),
            "tier":   mention.get("source_tier", "A"),
            "weight": mention.get("source_weight", 0.75),
        },
        "publishedAt":     mention.get("publishedAt", ""),
        "discoveredAt":    datetime.now(timezone.utc).isoformat(),
        "geo": {
            "regency":  mention.get("geo_regency",  "Pinrang"),
            "district": mention.get("geo_district", ""),
            "village":  mention.get("geo_village",  ""),
        },
        "topics":          mention.get("topics", []),
        "matchedKeywords": mention.get("matchedKeywords", []),
        "matchedClusters": mention.get("matchedClusters", []),
        "sentiment": {
            "label":  mention.get("sentiment", {}).get("label", "neutral"),
            "score":  mention.get("sentiment", {}).get("score", 0.0),
            "reason": mention.get("sentiment", {}).get("reason", ""),
        },
        "aspiration": {
            "detected": mention.get("aspiration", {}).get("detected", False),
            "type":     mention.get("aspiration", {}).get("type", "none"),
        },
        "relevanceScore":    mention.get("relevanceScore", 0),
        "criticalScore":     mention.get("criticalScore", 0),
        "issueId":           mention.get("issueId", ""),
        "verified":          False,
        "watchlistMatch":    mention.get("watchlistMatch", []),
    }

    db.collection("mentions").document(doc_id).set(doc)
    return doc_id


# ────────────────────────────────────────────────────────────
#  ISSUES
# ────────────────────────────────────────────────────────────

def get_recent_issues(limit: int = 100) -> list[dict]:
    """Ambil issue yang masih aktif (72 jam terakhir) untuk deduplication."""
    db  = _get_db()
    ref = (db.collection("issues")
             .where("status", "!=", "resolved")
             .order_by("latestUpdate", direction=firestore.Query.DESCENDING)
             .limit(limit)
             .stream())
    return [doc.to_dict() for doc in ref]


def save_issue(issue: dict):
    """Simpan atau update issue di Firestore."""
    db = _get_db()
    db.collection("issues").document(issue["id"]).set(issue, merge=True)


# ────────────────────────────────────────────────────────────
#  SOURCE HEALTH
# ────────────────────────────────────────────────────────────

def update_source_health(source_id: str, success: bool, article_count: int = 0, error: str = ""):
    db  = _get_db()
    ref = db.collection("source_health").document(source_id)
    doc = ref.get()
    data = doc.to_dict() if doc.exists else {}

    consecutive = data.get("consecutiveFailures", 0)
    total       = data.get("totalRequests", 0) + 1
    successes   = data.get("totalSuccess", 0) + (1 if success else 0)

    ref.set({
        "sourceId":            source_id,
        "status":              "healthy" if success else "error",
        "lastChecked":         datetime.now(timezone.utc).isoformat(),
        "lastArticleFound":    datetime.now(timezone.utc).isoformat() if article_count > 0 else data.get("lastArticleFound"),
        "requestSuccess":      round(successes / total * 100, 1),
        "consecutiveFailures": 0 if success else consecutive + 1,
        "lastError":           None if success else error,
        "totalRequests":       total,
        "totalSuccess":        successes,
        "lastArticleCount":    article_count,
    }, merge=True)


def register_new_source(domain: str, first_url: str, first_title: str, relevance_score: int):
    """Auto-register domain baru sebagai UNREVIEWED."""
    db     = _get_db()
    doc_id = domain.replace(".", "_").replace("-", "_")

    db.collection("config").document("sources").collection("items").document(doc_id).set({
        "id":            doc_id,
        "domain":        domain,
        "name":          domain,
        "tier":          "UNREVIEWED",
        "status":        "unreviewed",
        "sourceWeight":  0.50,
        "enabled":       True,
        "discoveredAt":  datetime.now(timezone.utc).isoformat(),
        "firstArticle":  first_url,
        "firstTitle":    first_title,
        "relevanceScore": relevance_score,
    }, merge=True)

    # Buat alert untuk admin
    db.collection("alerts").add({
        "type":           "new_source",
        "domain":         domain,
        "firstArticle":   first_url,
        "firstTitle":     first_title,
        "relevanceScore": relevance_score,
        "createdAt":      datetime.now(timezone.utc).isoformat(),
        "resolved":       False,
        "actions":        ["APPROVE", "WATCH", "BLOCK"],
    })


# ────────────────────────────────────────────────────────────
#  DASHBOARD SNAPSHOT
# ────────────────────────────────────────────────────────────

def update_dashboard_snapshot(snapshot: dict):
    """Update dokumen /dashboard/current untuk TV Wallboard."""
    db = _get_db()
    db.collection("dashboard").document("current").set({
        "data":      json.dumps(snapshot),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    })


# ────────────────────────────────────────────────────────────
#  STATS DAILY
# ────────────────────────────────────────────────────────────

def update_daily_stats(date_str: str, stats: dict):
    """Update /stats_daily/{date}."""
    db = _get_db()
    db.collection("stats_daily").document(date_str).set(stats, merge=True)
