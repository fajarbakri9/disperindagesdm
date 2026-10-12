import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "assets/data/lpg-distribution-2026-09.json"


def load():
    return json.loads(DATA.read_text(encoding="utf-8"))


def test_september_report_scope_and_totals():
    data = load()
    assert data["period"] == "2026-09"
    assert data["status"] == "agent-reported-partial"
    assert data["coverage"]["reportedAgentCount"] == 4
    assert data["coverage"]["officialAgentCount"] == 9
    assert data["coverage"]["isCompleteRegencyCoverage"] is False
    assert data["recordCount"] == 350
    assert data["totals"] == {
        "allocation": 299267,
        "totalNormal": 184240,
        "totalFacultative": 8960,
        "grandTotal": 193200,
        "kilograms": 579600,
        "metricTons": 579.6,
    }


def test_every_record_is_arithmetically_valid_and_uniquely_linked():
    data = load()
    records = data["records"]
    assert len({row["registrationId"] for row in records}) == 350
    assert len({row["pangkalanId"] for row in records}) == 350
    for row in records:
        assert len(row["dailyDistribution"]) == 30
        assert sum(row["dailyDistribution"].values()) == row["grandTotal"]
        assert row["totalNormal"] + row["totalFacultative"] == row["grandTotal"]
        assert row.get("registrationValidationStatus", "VERIFIED_IN_PERTAMINA_REPORT") == "VERIFIED_IN_PERTAMINA_REPORT"
        assert row["masterMatchStatus"] in {
            "MATCHED_REGISTRATION_ID",
            "MATCHED_NAME_AND_ASSIGNED_REGISTRATION_ID",
            "ADDED_CANDIDATE_FROM_DISTRIBUTION_REPORT",
        }


def test_agent_summaries_and_quality_are_explicit():
    data = load()
    summaries = {row["agentId"]: row for row in data["summaries"]}
    assert (summaries["AG-005"]["pangkalanCount"], summaries["AG-005"]["grandTotal"]) == (49, 13440)
    assert (summaries["AG-004"]["pangkalanCount"], summaries["AG-004"]["grandTotal"]) == (109, 52640)
    assert (summaries["AG-002"]["pangkalanCount"], summaries["AG-002"]["grandTotal"]) == (65, 46480)
    assert (summaries["AG-003"]["pangkalanCount"], summaries["AG-003"]["grandTotal"]) == (127, 80640)
    quality = data["dataQuality"]
    assert quality["registrationMatchedRecordCount"] == 350
    assert quality["coordinateAvailableCount"] == 349
    assert quality["gpsFieldVerifiedCount"] == 153


def test_inferred_candidate_locations_are_not_misrepresented_as_gps():
    master = json.loads((ROOT / "assets/data/lpg-pangkalan.json").read_text(encoding="utf-8"))
    by_registration = {str(row.get("registrationId")): row for row in master}
    expected = {
        "7912610817111010": "Mattiro Sompe",
        "7912530817111011": "Duampanua",
    }
    for registration_id, district in expected.items():
        row = by_registration[registration_id]
        assert row["kecamatan"] == district
        assert row["pointType"] == "ADMIN_FALLBACK"
        assert row["gpsVerified"] is False
        assert row["coordinateAccuracy"] == "DISTRICT_REPRESENTATIVE_NOT_BUILDING"
        assert row["identityReviewRequired"] is True


def test_master_district_names_are_canonical_after_import():
    master = json.loads((ROOT / "assets/data/lpg-pangkalan.json").read_text(encoding="utf-8"))
    districts = {row.get("kecamatan") for row in master if not row.get("isDeleted")}
    assert "Watang Sawito" not in districts
    assert "Matirro Sompe" not in districts
    assert len({name for name in districts if name}) == 12
