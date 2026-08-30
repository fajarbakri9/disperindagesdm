from datetime import datetime, timezone

from dedupe import exact_duplicate_key
from validation import content_fingerprint, validate_item

SOURCE = {"domain": "portal.id", "allowed_domains": ["portal.id"]}
NOW = datetime(2026, 8, 30, 5, 0, tzinfo=timezone.utc)


def valid_meta(index=1):
    return {"title": f"Distribusi LPG Pinrang {index}", "excerpt": f"Laporan pangkalan nomor {index}",
            "canonical": f"https://portal.id/berita/{index}",
            "publishedAt": "2026-08-30T12:00:00+08:00"}


def test_dataset_20_relevant_items_are_verified():
    results = [validate_item(SOURCE, f"https://portal.id/berita/{i}", valid_meta(i), now=NOW) for i in range(20)]
    assert all(item["verification_status"] == "VERIFIED_DIRECT" for item in results)


def test_dataset_20_irrelevant_domains_are_rejected():
    results = [validate_item(SOURCE, f"https://evil.example/{i}", valid_meta(i), now=NOW) for i in range(20)]
    assert all(item["verification_status"] == "REJECTED" for item in results)


def test_dataset_10_exact_duplicates_are_rejected():
    keys = {exact_duplicate_key(f"https://portal.id/berita/{i}") for i in range(10)}
    results = [validate_item(SOURCE, f"https://portal.id/berita/{i}?utm_source=x", valid_meta(i),
                             existing_url_keys=keys, now=NOW) for i in range(10)]
    assert all(item["verification_status"] == "REJECTED" for item in results)


def test_dataset_10_future_dates_need_review():
    results = []
    for i in range(10):
        meta = valid_meta(i)
        meta["publishedAt"] = "2026-09-10T12:00:00+08:00"
        results.append(validate_item(SOURCE, f"https://portal.id/berita/{i}", meta, now=NOW))
    assert all(item["verification_status"] == "NEEDS_REVIEW" for item in results)


def test_content_fingerprint_is_whitespace_and_case_stable():
    assert content_fingerprint("Judul LPG", "Isi  berita") == content_fingerprint("judul lpg", "Isi berita")


def test_rss_published_at_provenance_is_accepted():
    meta = valid_meta()
    meta["published_at"] = meta.pop("publishedAt")
    result = validate_item(SOURCE, "https://portal.id/berita/1", meta, now=NOW)
    assert result["verification_status"] == "VERIFIED_DIRECT"
    assert result["published_at_source"] == "2026-08-30T12:00:00+08:00"


def test_rss_fallback_is_not_mislabeled_as_direct_verification():
    meta = valid_meta()
    meta["extractedBy"] = "rss_fallback"
    result = validate_item(SOURCE, "https://portal.id/berita/1", meta, now=NOW)
    assert result["verification_status"] == "VERIFIED_FEED"
    assert result["extraction_method"] == "rss_fallback"
