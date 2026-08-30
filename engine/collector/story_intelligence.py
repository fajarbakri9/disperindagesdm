"""Pure story-clustering helpers for the Stage 6 intelligence foundation."""
from __future__ import annotations

import re
from datetime import datetime, timezone


STOPWORDS = {
    "dan", "di", "ke", "dari", "yang", "untuk", "dengan", "pada", "ini", "itu",
    "kabupaten", "pemkab", "pinrang", "sulsel", "setelah", "hingga", "soal",
}


def title_tokens(title: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", (title or "").lower())
    return {word for word in words if len(word) > 2 and word not in STOPWORDS}


def title_similarity(left: str, right: str) -> float:
    a, b = title_tokens(left), title_tokens(right)
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _utc(value) -> datetime | None:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc) if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return None


def find_matching_story(item: dict, clusters: list[dict], *, threshold: float = 0.32,
                        window_hours: int = 72) -> str | None:
    item_topics = set(item.get("topic_ids") or [])
    item_districts = set(item.get("district_ids") or [])
    published = _utc(item.get("published_at"))
    for cluster in clusters:
        if item_topics and set(cluster.get("topic_ids") or []) and not (
                item_topics & set(cluster.get("topic_ids") or [])):
            continue
        if item_districts and set(cluster.get("district_ids") or []) and not (
                item_districts & set(cluster.get("district_ids") or [])):
            continue
        first_at = _utc(cluster.get("first_item_at"))
        if published and first_at and abs((published - first_at).total_seconds()) > window_hours * 3600:
            continue
        if title_similarity(item.get("title", ""), cluster.get("representative_title", "")) >= threshold:
            return cluster.get("cluster_id")
    return None


def severity_from_relevance(score: int | float) -> str:
    score = float(score or 0)
    if score >= 90:
        return "CRITICAL"
    if score >= 75:
        return "HIGH"
    if score >= 60:
        return "MEDIUM"
    return "LOW"
