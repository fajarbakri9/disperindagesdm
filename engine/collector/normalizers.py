"""Pure normalization helpers used before any production write."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dateutil import parser as date_parser
from zoneinfo import ZoneInfo


TRACKING_QUERY_KEYS = {
    "fbclid", "gclid", "dclid", "mc_cid", "mc_eid", "ref", "ref_src",
    "source", "campaign", "igshid", "spm", "amp", "noamp",
}


def normalize_url(url: str) -> str:
    """Return a stable HTTP(S) URL without fragments or tracking parameters."""
    value = (url or "").strip()
    if not value:
        return ""

    parts = urlsplit(value)
    scheme = parts.scheme.lower()
    hostname = (parts.hostname or "").lower()
    if scheme not in {"http", "https"} or not hostname:
        return ""

    if hostname.startswith("amp."):
        hostname = hostname[4:]
    if hostname.startswith("www."):
        hostname = hostname[4:]

    port = parts.port
    netloc = hostname
    if port and not ((scheme == "http" and port == 80) or (scheme == "https" and port == 443)):
        netloc = f"{hostname}:{port}"

    path = parts.path or "/"
    if path != "/":
        path = path.rstrip("/")

    query = []
    for key, val in parse_qsl(parts.query, keep_blank_values=True):
        lowered = key.lower()
        if lowered.startswith("utm_") or lowered in TRACKING_QUERY_KEYS:
            continue
        query.append((key, val))

    return urlunsplit(("https", netloc, path, urlencode(sorted(query)), ""))


def normalize_published_at(
    value: str,
    *,
    now: datetime | None = None,
    future_tolerance_minutes: int = 10,
) -> datetime | None:
    """Parse a source date, normalize it to UTC, and reject implausible future dates."""
    if not value:
        return None
    try:
        parsed = date_parser.parse(value)
    except (TypeError, ValueError, OverflowError):
        return None

    makassar = ZoneInfo("Asia/Makassar")
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=makassar)

    normalized = parsed.astimezone(timezone.utc)
    reference = now or datetime.now(timezone.utc)
    if reference.tzinfo is None:
        reference = reference.replace(tzinfo=timezone.utc)
    else:
        reference = reference.astimezone(timezone.utc)

    if normalized > reference + timedelta(minutes=future_tolerance_minutes):
        return None
    return normalized
