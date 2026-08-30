from pathlib import Path
import json
import re


HTML = (Path(__file__).resolve().parents[2] / "media-intelligence.html").read_text(encoding="utf-8")
FIREBASE = json.loads((Path(__file__).resolve().parents[2] / "firebase.json").read_text(encoding="utf-8"))


def test_frontend_reads_only_public_snapshot():
    assert "db.collection('mi_public').doc('current')" in HTML
    for internal in ("mi_items", "mi_issues", "mi_story_clusters", "mi_source_state",
                     "mentions", "source_health", "dashboard_snapshot"):
        assert f"collection('{internal}')" not in HTML


def test_no_dummy_or_browser_intelligence_store_remains():
    for forbidden in ("MEDIA_DATA_MASTER", "localStorage", "sessionStorage",
                      "Math.random", "Citizen Voice", "Media Sosial (Off)"):
        assert forbidden not in HTML


def test_initial_kpis_are_unknown_not_manual_numbers():
    for element_id in ("statMentions", "statStories", "statSources", "statIssues"):
        match = re.search(fr'id="{element_id}">([^<]+)<', HTML)
        assert match
        assert match.group(1).strip() == "—"


def test_source_links_are_sanitized_and_open_safely():
    assert "const linkUrl = sanitizeUrl(it.canonical_url);" in HTML
    assert 'target="_blank" rel="noopener noreferrer"' in HTML


def test_cached_snapshot_never_claims_live_connection():
    assert "if (isDataFromCache || !navigator.onLine)" in HTML
    assert "handleSnapshotDisconnected();" in HTML


def test_clean_url_has_explicit_no_cache_header():
    entries = {entry["source"]: entry.get("headers", [])
               for entry in FIREBASE["hosting"]["headers"]}
    for route in ("/media-intelligence", "/media-intelligence.html"):
        assert {"key": "Cache-Control", "value": "no-cache, no-store, must-revalidate"} in entries[route]
