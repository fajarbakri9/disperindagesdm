from datetime import datetime, timezone

from dedupe import exact_duplicate_key, is_exact_duplicate
from normalizers import normalize_published_at, normalize_url
from relevance import calculate_relevance
from structured_logger import JsonFormatter
import logging


def test_tracking_url_removal():
    value = normalize_url(
        "https://Example.com/news/item/?utm_source=x&fbclid=abc&id=7#comments"
    )
    assert value == "https://example.com/news/item?id=7"


def test_canonical_normalization():
    first = normalize_url("http://www.EXAMPLE.com:80/a/")
    second = normalize_url("https://example.com/a")
    assert first == second == "https://example.com/a"


def test_naive_date_uses_asia_makassar():
    parsed = normalize_published_at(
        "2026-08-30 12:00:00",
        now=datetime(2026, 8, 30, 5, 0, tzinfo=timezone.utc),
    )
    assert parsed == datetime(2026, 8, 30, 4, 0, tzinfo=timezone.utc)


def test_future_date_rejected():
    assert normalize_published_at(
        "2026-08-31T12:00:00+08:00",
        now=datetime(2026, 8, 30, 5, 0, tzinfo=timezone.utc),
    ) is None


def test_relevance_score_is_deterministic():
    result = calculate_relevance(
        "Kelangkaan LPG di Kabupaten Pinrang",
        "Disperindag ESDM memeriksa pangkalan LPG.",
        {"sourceWeight": 1.0},
        {"strategic": set(), "village": set(), "kecamatan": set(), "kabupaten": {"pinrang"}},
        {"risk": {"kelangkaan"}},
        [
            {"id": "lpg", "enabled": True, "terms": ["lpg"], "riskMultiplier": 1.0},
            {"id": "entity", "enabled": True, "terms": ["disperindag esdm"], "riskMultiplier": 1.0},
        ],
    )
    assert result["score"] == 49.8
    assert result["status"] == "monitor"


def test_exact_duplicate_ignores_tracking_parameters():
    original = exact_duplicate_key("https://portal.id/berita/abc")
    tracked = "https://www.portal.id/berita/abc/?utm_medium=social&fbclid=123"
    assert is_exact_duplicate(tracked, {original})


def test_invalid_url_has_no_duplicate_key():
    assert exact_duplicate_key("javascript:alert(1)") == ""


def test_structured_logger_emits_json():
    record = logging.LogRecord("mi", logging.INFO, __file__, 1, "collector ready", (), None)
    rendered = JsonFormatter().format(record)
    assert '"level": "INFO"' in rendered
    assert '"message": "collector ready"' in rendered
