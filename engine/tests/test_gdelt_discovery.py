from gdelt_discovery import discover_gdelt_candidates, source_for_url
from validation import validate_item


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class FakeSession:
    def __init__(self, payload):
        self.payload = payload
        self.calls = []

    def get(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return FakeResponse(self.payload)


def test_gdelt_parses_original_urls_and_deduplicates():
    session = FakeSession({"articles": [
        {"url": "https://media.test/a?utm_source=gdelt", "title": "Pinrang LPG",
         "seendate": "20260830T010000Z", "domain": "media.test"},
        {"url": "https://media.test/a", "title": "Duplikat", "domain": "media.test"},
    ]})
    config = {"enabled": True, "endpoint": "https://gdelt.test/doc", "queries": ["Pinrang LPG"],
              "max_records_per_query": 10, "max_candidates_per_run": 20, "timespan": "3months"}
    result = discover_gdelt_candidates(config, session=session)
    assert len(result) == 1
    assert result[0]["url"] == "https://media.test/a"
    assert result[0]["discovery_provider"] == "GDELT"
    assert session.calls[0][1]["params"]["mode"] == "artlist"


def test_source_matching_requires_exact_allowed_hostname():
    source = {"id": "antara", "domain": "makassar.antaranews.com",
              "allowed_domains": ["makassar.antaranews.com"]}
    assert source_for_url("https://makassar.antaranews.com/berita/a", [source]) == source
    assert source_for_url("https://evilmakassar.antaranews.com/berita/a", [source]) is None
    assert source_for_url("https://antaranews.com.evil.test/a", [source]) is None


def test_secondary_direct_duplicate_is_rejected_by_normal_validator():
    source = {"allowed_domains": ["media.test"]}
    metadata = {"title": "Harga pangan Pinrang", "excerpt": "Pasar",
                "canonical": "https://media.test/a", "publishedAt": "2026-08-30T01:00:00Z"}
    first = validate_item(source, "https://media.test/a", metadata)
    duplicate = validate_item(source, "https://media.test/a", metadata,
                              existing_url_keys={first["url_hash"]})
    assert first["verification_status"] == "VERIFIED_DIRECT"
    assert duplicate["verification_status"] == "REJECTED"
    assert "EXACT_URL_DUPLICATE" in duplicate["verification_notes"]
