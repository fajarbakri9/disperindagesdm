"""GDELT DOC API adapter for secondary candidate discovery only.

Nothing returned here is verified content. The main pipeline must resolve the
original publisher, match it to the approved source registry, fetch the
publisher page, and run the normal fail-closed validator.
"""
from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

import requests

from normalizers import normalize_url

CONFIG_PATH = Path(__file__).parent.parent / "config" / "gdelt_queries.json"


def load_gdelt_config(path: Path = CONFIG_PATH) -> dict:
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def source_for_url(url: str, sources: list[dict]) -> dict | None:
    """Return an approved source only for an exact normalized hostname."""
    hostname = (urlparse(normalize_url(url) or "").hostname or "").lower()
    for source in sources:
        allowed = {str(value).lower() for value in
                   (source.get("allowed_domains") or [source.get("domain")]) if value}
        if hostname in allowed:
            return source
    return None


def discover_gdelt_candidates(config: dict | None = None, *, session=None) -> list[dict]:
    config = config or load_gdelt_config()
    if not config.get("enabled", False):
        return []
    http = session or requests.Session()
    unique: dict[str, dict] = {}
    for query in config.get("queries", []):
        response = http.get(
            config["endpoint"],
            params={"query": query, "mode": "artlist", "format": "json",
                    "maxrecords": int(config.get("max_records_per_query", 10)),
                    "timespan": config.get("timespan", "3months"), "sort": "datedesc"},
            headers={"User-Agent": "DisperindagPinrangMediaIntelligence/1.0"},
            timeout=(10, 25),
        )
        response.raise_for_status()
        payload = response.json()
        for article in payload.get("articles", []):
            url = normalize_url(article.get("url") or "")
            if not url or url in unique:
                continue
            unique[url] = {
                "url": url,
                "title": (article.get("title") or "").strip(),
                "publishedAt": article.get("seendate") or "",
                "thumbnailUrl": article.get("socialimage") or None,
                "discovery_provider": "GDELT",
                "discovery_query": query,
                "discovery_domain": article.get("domain") or urlparse(url).hostname,
            }
    limit = int(config.get("max_candidates_per_run", 20))
    return list(unique.values())[:limit]
