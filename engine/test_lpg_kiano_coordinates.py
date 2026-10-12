import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "assets/data/lpg-kiano-pangkalan-2026.json"


def test_kiano_document_dataset_is_complete_and_unique():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    assert data["agentId"] == "AG-009"
    assert data["soldTo"] == "1094864"
    assert data["recordCount"] == 26
    assert data["quality"] == {
        "uniqueRegistrationCount": 26,
        "uniqueCoordinateCount": 26,
        "districtBoundaryValidatedCount": 26,
        "villageBoundaryValidatedCount": 26,
        "gpsFieldVerifiedCount": 26,
    }
    assert data["districtSummary"] == {
        "Mattiro Bulu": 6,
        "Paleteang": 10,
        "Patampanua": 1,
        "Suppa": 4,
        "Tiroang": 2,
        "Watang Sawitto": 3,
    }


def test_kiano_records_are_linked_with_document_field_verification():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    master = json.loads((ROOT / "assets/data/lpg-pangkalan.json").read_text(encoding="utf-8"))
    by_registration = {str(row.get("registrationId")): row for row in master}
    for source in data["records"]:
        row = by_registration[source["registrationId"]]
        assert row["agentId"] == "AG-009"
        assert row["pointType"] == "DOCUMENT_COORDINATE"
        assert row["gpsVerified"] is True
        assert row["verificationStatus"] == "field-verified-document"
        assert row["locationVerification"]["status"] == "VERIFIED"
        assert row["districtBoundaryValidated"] is True
        assert row["villageBoundaryValidated"] is True


def test_kiano_agent_relationship_is_updated():
    agents = json.loads((ROOT / "assets/data/lpg-agents.json").read_text(encoding="utf-8"))
    agent = next(row for row in agents if row["id"] == "AG-009")
    assert agent["soldTo"] == "1094864"
    assert agent["linkedPangkalanCount"] == 26
