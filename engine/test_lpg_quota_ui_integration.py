from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_dashboard_loads_verified_quota_dataset_and_has_safe_failure_state():
    script = read("js/dashboard-esdm.js")
    assert "assets/data/lpg-quota-distribution-2026.json" in script
    assert "correctedMonthlyTotals" in script
    assert "Tidak ada angka perkiraan yang ditampilkan" in script
    assert "Posisi 31 Juli 2026" in script


def test_directory_exposes_professional_quota_section_and_quality_note():
    page = read("direktori-lpg.html")
    script = read("js/direktori-lpg.js")
    assert 'id="lpgQuotaSection"' in page
    assert 'id="lpgQuotaContent"' in page
    assert "assets/data/lpg-quota-distribution-2026.json" in script
    assert "Data Agustus yang hanya tersedia untuk tiga agen tidak digabungkan" in script
    assert "correctedGrandTotal" in script


def test_pages_do_not_present_partial_august_as_district_total():
    dashboard = read("js/dashboard-esdm.js")
    directory = read("js/direktori-lpg.js")
    assert "lpg-distribution-2026-08.json" not in dashboard
    assert "state.quotaData" in directory
    assert "state.distributionByPangkalanId" in directory
