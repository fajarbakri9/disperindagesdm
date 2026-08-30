"""Fail-closed validation for discovered media items."""
from __future__ import annotations

import hashlib
import re
from datetime import datetime
from urllib.parse import urlparse

from dedupe import exact_duplicate_key
from normalizers import normalize_published_at, normalize_url


def content_fingerprint(title: str, excerpt: str) -> str:
    text = re.sub(r"\s+", " ", f"{title} {excerpt}".lower()).strip()
    return hashlib.sha256(text.encode("utf-8")).hexdigest() if text else ""


def validate_item(source: dict, discovered_url: str, metadata: dict, *,
                  existing_url_keys: set[str] | None = None,
                  existing_content_hashes: set[str] | None = None,
                  now: datetime | None = None) -> dict:
    errors = []
    normalized_url = normalize_url(discovered_url)
    canonical_url = normalize_url(metadata.get("canonical") or discovered_url)
    title = (metadata.get("title") or "").strip()
    excerpt = (metadata.get("excerpt") or "").strip()
    published_raw = metadata.get("publishedAt") or metadata.get("published_at") or ""
    published_at = normalize_published_at(published_raw, now=now)
    allowed = set(source.get("allowed_domains") or [source.get("domain")])

    if not normalized_url:
        errors.append("INVALID_DISCOVERED_URL")
    elif urlparse(normalized_url).hostname not in allowed:
        errors.append("DISCOVERED_DOMAIN_NOT_ALLOWED")
    if not canonical_url:
        errors.append("CANONICAL_MISSING")
    elif urlparse(canonical_url).hostname not in allowed:
        errors.append("CANONICAL_DOMAIN_NOT_ALLOWED")
    if not title:
        errors.append("TITLE_MISSING")
    if not published_raw:
        errors.append("DATE_MISSING")
    elif published_at is None:
        errors.append("DATE_INVALID_OR_FUTURE")

    url_key = exact_duplicate_key(canonical_url)
    fingerprint = content_fingerprint(title, excerpt)
    duplicate_of = None
    if url_key and url_key in (existing_url_keys or set()):
        duplicate_of = url_key
        errors.append("EXACT_URL_DUPLICATE")
    elif fingerprint and fingerprint in (existing_content_hashes or set()):
        duplicate_of = fingerprint
        errors.append("EXACT_CONTENT_DUPLICATE")

    reject_codes = {"INVALID_DISCOVERED_URL", "DISCOVERED_DOMAIN_NOT_ALLOWED",
                    "CANONICAL_DOMAIN_NOT_ALLOWED", "EXACT_URL_DUPLICATE",
                    "EXACT_CONTENT_DUPLICATE"}
    status = "REJECTED" if any(code in reject_codes for code in errors) else (
        "NEEDS_REVIEW" if errors else "VERIFIED_DIRECT"
    )
    return {"verification_status": status, "verification_notes": errors,
            "normalized_url": normalized_url, "canonical_url": canonical_url,
            "published_at": published_at, "published_at_source": published_raw,
            "content_hash": fingerprint, "url_hash": url_key,
            "duplicate_of": duplicate_of}
