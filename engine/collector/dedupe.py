"""Deterministic exact-duplicate helpers."""

from __future__ import annotations

import hashlib

from normalizers import normalize_url


def exact_duplicate_key(url: str) -> str:
    normalized = normalize_url(url)
    if not normalized:
        return ""
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def is_exact_duplicate(url: str, existing_keys: set[str]) -> bool:
    key = exact_duplicate_key(url)
    return bool(key) and key in existing_keys
