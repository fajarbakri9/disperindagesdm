from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_location_cards_separate_availability_from_field_verification():
    html = read("direktori-lpg.html")
    assert "Koordinat tersedia" in html
    assert 'id="lpgdCoordinateCount"' in html
    assert "GPS lapangan terverifikasi" in html
    assert 'id="lpgdGpsVerifiedCount"' in html
    assert "<span>Koordinat GPS</span>" not in html


def test_location_stats_preserve_document_coordinate_provenance():
    script = read("js/direktori-lpg.js")
    assert "DOCUMENT_COORDINATE" in script
    assert "document-sourced" in script
    assert "menunggu verifikasi lapangan" in script
    assert "item?.gpsVerified===true" in script
    assert "const fieldStatus=" in script
    assert "coordinateCount-documentCount-duplicateCount-verifiedCount" in script
    assert "duplicate-coordinate-review" in script
    assert "Koordinat ganda" in read("direktori-lpg.html")


def test_location_assets_use_release_cache_buster():
    html = read("direktori-lpg.html")
    assert "direktori-lpg.css?v=20261009_field_verified_coordinates_v1" in html
    assert "direktori-lpg.js?v=20261009_field_verified_coordinates_v1" in html
