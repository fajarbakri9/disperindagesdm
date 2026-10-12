import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def test_october_partial_report_is_complete_and_arithmetically_valid():
    report = load("assets/data/lpg-distribution-2026-10.json")
    assert report["recordCount"] == 288
    assert report["totals"]["grandTotal"] == 52450
    assert report["dailyTotals"]["2026-10-04"] == 0
    assert sum(report["dailyTotals"].values()) == 52450
    assert len({row["stationId"] for row in report["records"]}) == 288
    assert len({row["registrationId"] for row in report["records"]}) == 288
    assert all(sum(row["dailyDistribution"].values()) == row["grandTotal"] for row in report["records"])
    assert {row["agentId"] for row in report["summaries"]} == {"AG-002", "AG-003", "AG-007"}


def test_october_matching_is_conservative_and_uswatun_is_resolved():
    report = load("assets/data/lpg-distribution-2026-10.json")
    master = {row["id"]: row for row in load("assets/data/lpg-pangkalan.json")}
    assert report["dataQuality"]["masterMatchedRecordCount"] == 287
    assert report["dataQuality"]["unmatchedIdentityCount"] == 1
    assert report["unmatchedRecords"][0]["reportPangkalanName"] == "ISMAIL"
    uswatun = next(row for row in report["records"] if row["reportPangkalanName"] == "USWATUN HASANAH")
    assert uswatun["pangkalanId"] == "PG-000482"
    assert master["PG-000482"]["registrationId"] == "791272818238104"
    assert master["PG-000482"]["pertaminaStationId"] == "400581"
    assert master["PG-000039"]["name"] == "SUDIRMAN T"
