from audit_production_articles import audit_item, decode_firestore, same_timestamp


def test_firestore_decoder_handles_nested_snapshot_values():
    value = {"mapValue": {"fields": {
        "count": {"integerValue": "8"},
        "names": {"arrayValue": {"values": [{"stringValue": "Pinrang"}]}},
    }}}
    assert decode_firestore(value) == {"count": 8, "names": ["Pinrang"]}


def test_strict_article_audit_requires_direct_publisher_and_exact_fields():
    expected = {
        "canonical_url": "https://portal.id/a", "title": "Berita Pinrang",
        "publisher": "Portal Pinrang", "published_at": "2026-08-30T04:00:00Z",
        "verification_status": "VERIFIED_DIRECT",
    }
    valid = audit_item(expected, {
        "canonical": "https://portal.id/a", "title": "Berita Pinrang",
        "publisher": "Portal Pinrang", "publishedAt": "2026-08-30T12:00:00+08:00",
        "extractedBy": "jsonld",
    })
    missing_publisher = audit_item(expected, {
        "canonical": "https://portal.id/a", "title": "Berita Pinrang",
        "publisher": "", "publishedAt": "2026-08-30T12:00:00+08:00",
        "extractedBy": "jsonld",
    })
    assert valid["passed"] is True
    assert missing_publisher["passed"] is False
    assert missing_publisher["checks"]["publisher"] is False


def test_timestamp_comparison_normalizes_wita_to_utc():
    assert same_timestamp("2026-08-30T12:00:00+08:00", "2026-08-30T04:00:00Z")
