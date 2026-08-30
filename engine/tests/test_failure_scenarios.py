"""Required failure scenarios: fail closed without inventing data."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest
import requests

import discovery
import extractor
from dedupe import exact_duplicate_key
from validation import content_fingerprint, validate_item


SOURCE = {
    "id": "portal", "name": "Portal", "domain": "portal.id",
    "allowed_domains": ["portal.id"], "max_candidates_per_run": 30,
}
NOW = datetime(2026, 8, 30, 5, 0, tzinfo=timezone.utc)


class Response:
    def __init__(self, status_code=200, text="", content=b""):
        self.status_code = status_code
        self.text = text
        self.content = content or text.encode()


@pytest.mark.parametrize("failure", [requests.Timeout("timeout"), requests.ConnectionError("down")])
def test_network_failure_is_reportable_not_empty_success(monkeypatch, failure):
    monkeypatch.setattr(discovery.requests, "get", lambda *args, **kwargs: (_ for _ in ()).throw(failure))
    with pytest.raises(discovery.DiscoveryError, match="Sitemap gagal"):
        discovery._parse_sitemap("https://portal.id/sitemap.xml", SOURCE)


@pytest.mark.parametrize("status", [403, 500])
def test_http_failure_is_reportable(monkeypatch, status):
    monkeypatch.setattr(discovery.requests, "get", lambda *args, **kwargs: Response(status))
    with pytest.raises(discovery.DiscoveryError, match=f"HTTP {status}"):
        discovery._parse_sitemap("https://portal.id/sitemap.xml", SOURCE)


def test_broken_empty_rss_is_reportable(monkeypatch):
    broken = SimpleNamespace(bozo=True, entries=[])
    monkeypatch.setattr(discovery.feedparser, "parse", lambda *args, **kwargs: broken)
    with pytest.raises(discovery.DiscoveryError, match="RSS tidak dapat dibaca"):
        discovery._parse_rss("https://portal.id/feed", SOURCE)


def test_missing_date_needs_review():
    result = validate_item(SOURCE, "https://portal.id/a", {
        "title": "Distribusi LPG Pinrang", "excerpt": "Laporan pangkalan",
        "canonical": "https://portal.id/a", "publishedAt": "",
    }, now=NOW)
    assert result["verification_status"] == "NEEDS_REVIEW"


def test_canonical_redirect_normalizes_to_allowed_original():
    result = validate_item(SOURCE, "https://portal.id/redirect?a=1", {
        "title": "Distribusi LPG Pinrang", "excerpt": "Laporan pangkalan",
        "canonical": "https://www.portal.id/berita/lpg/?utm_source=x",
        "publishedAt": "2026-08-30T12:00:00+08:00",
    }, now=NOW)
    assert result["verification_status"] == "VERIFIED_DIRECT"
    assert result["normalized_url"] == "https://portal.id/redirect?a=1"
    assert result["canonical_url"] == "https://portal.id/berita/lpg"


def test_duplicate_url_and_duplicate_content_are_rejected():
    meta = {
        "title": "Distribusi LPG Pinrang", "excerpt": "Laporan pangkalan",
        "canonical": "https://portal.id/a", "publishedAt": "2026-08-30T12:00:00+08:00",
    }
    url_duplicate = validate_item(
        SOURCE, "https://portal.id/a?utm_source=x", meta,
        existing_url_keys={exact_duplicate_key("https://portal.id/a")}, now=NOW)
    content_duplicate = validate_item(
        SOURCE, "https://portal.id/b", {**meta, "canonical": "https://portal.id/b"},
        existing_content_hashes={content_fingerprint(meta["title"], meta["excerpt"])}, now=NOW)
    assert url_duplicate["verification_status"] == "REJECTED"
    assert content_duplicate["verification_status"] == "REJECTED"


def test_future_date_needs_review():
    result = validate_item(SOURCE, "https://portal.id/a", {
        "title": "Distribusi LPG Pinrang", "excerpt": "Laporan pangkalan",
        "canonical": "https://portal.id/a", "publishedAt": "2026-09-10T12:00:00+08:00",
    }, now=NOW)
    assert result["verification_status"] == "NEEDS_REVIEW"


def test_markup_change_falls_back_to_rss_without_fabrication(monkeypatch):
    monkeypatch.setattr(extractor.requests, "get", lambda *args, **kwargs: Response(200, "<html><body></body></html>"))
    result = extractor.extract_metadata("https://portal.id/a", rss_entry={
        "title": "Judul RSS Asli", "summary": "Ringkasan RSS",
        "published": "2026-08-30T12:00:00+08:00",
    })
    assert result["title"] == "Judul RSS Asli"
    assert result["publishedAt"] == "2026-08-30T12:00:00+08:00"
    assert result["extractedBy"] == "rss_fallback"
    validation = validate_item(SOURCE, "https://portal.id/a", result, now=NOW)
    assert validation["verification_status"] == "VERIFIED_FEED"
    assert validation["extraction_method"] == "rss_fallback"


def test_frontend_firestore_failure_preserves_degraded_state_contract():
    html = (Path(__file__).parents[2] / "media-intelligence.html").read_text(encoding="utf-8")
    assert "if (!currentSnapshotData) renderOfflineState();" in html
    assert "handleSnapshotDisconnected();" in html
    assert "document.getElementById('statMentions').textContent = '—';" in html
