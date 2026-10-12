from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_directory_loads_latest_partial_report_and_labels_period():
    script = read("js/direktori-lpg.js")
    assert "lpg-distribution-${period}.json" in script
    assert "renderSeptemberReport" in script
    assert "bukan total Kabupaten Pinrang" in script
    assert "gpsFieldVerifiedCount" in script
    assert "Penyaluran terbaru" in read("direktori-lpg.html")


def test_esdm_dashboard_presents_september_as_partial():
    script = read("js/dashboard-esdm.js")
    assert "lpg-distribution-2026-09.json" in script
    assert "CAKUPAN PARSIAL" in script
    assert "bukan total kabupaten" in script


def test_command_center_uses_september_report_without_calling_it_regency_total():
    script = read("js/command-center.js")
    assert "lpg-distribution-2026-09.json" in script
    assert "assets/data/lpg-pangkalan.json" in script
    assert "assets/data/lpg-agents.json" in script
    assert "Realisasi September 2026" in script
    assert "tabung tidak boleh disebut total Kabupaten Pinrang" in script
