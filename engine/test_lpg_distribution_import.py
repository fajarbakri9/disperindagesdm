import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_distribution_august_2026_is_consistent():
    data = json.loads((ROOT / "assets/data/lpg-distribution-2026-08.json").read_text(encoding="utf-8"))
    assert data["period"] == "2026-08"
    assert data["unit"] == "tabung"
    assert data["recordCount"] == len(data["records"]) == 159
    assert len({(x["agentId"], x["registrationId"]) for x in data["records"]}) == 159
    assert all(x["pangkalanId"] for x in data["records"])
    for row in data["records"]:
        assert len(row["dailyDistribution"]) == 31
        assert sum(row["dailyDistribution"].values()) == row["grandTotal"]
        assert row["totalNormal"] + row["totalFacultative"] == row["grandTotal"]
        assert row["unit"] == "tabung"


def test_distribution_summary_and_master_links():
    data = json.loads((ROOT / "assets/data/lpg-distribution-2026-08.json").read_text(encoding="utf-8"))
    master = json.loads((ROOT / "assets/data/lpg-pangkalan.json").read_text(encoding="utf-8"))
    agents = json.loads((ROOT / "assets/data/lpg-agents.json").read_text(encoding="utf-8"))
    by_id = {x["id"]: x for x in master}
    expected = {
        "AG-008": (46, 24999, 15700, 1660, 17360),
        "AG-005": (48, 18401, 10640, 1680, 12320),
        "AG-002": (65, 59640, 40880, 3920, 44800),
    }
    for summary in data["summaries"]:
        assert (summary["pangkalanCount"], summary["allocation"], summary["totalNormal"], summary["totalFacultative"], summary["grandTotal"]) == expected[summary["agentId"]]
    for row in data["records"]:
        assert row["pangkalanId"] in by_id
        assert by_id[row["pangkalanId"]]["agentId"] == row["agentId"]
        assert by_id[row["pangkalanId"]]["registrationId"] == row["registrationId"]
    agent_by_id = {x["id"]: x for x in agents}
    assert agent_by_id["AG-002"]["linkedPangkalanCount"] == 65
    assert agent_by_id["AG-005"]["linkedPangkalanCount"] == 51
    assert agent_by_id["AG-008"]["linkedPangkalanCount"] == 46
    assert all(agent_by_id[x]["distributionDataUnit"] == "tabung" for x in ("AG-002", "AG-005", "AG-008"))


def test_policy_documents_are_not_misrepresented_as_approved():
    data = json.loads((ROOT / "assets/data/lpg-policy-documents.json").read_text(encoding="utf-8"))
    proposal = next(x for x in data["documents"] if x["type"] == "EMERGENCY_QUOTA_PROPOSAL")
    circular = next(x for x in data["documents"] if x["type"] == "CIRCULAR_DRAFT")
    assert proposal["requestedQuantity"] == 5040
    assert proposal["unit"] == "tabung"
    assert proposal["requestedLoads"] * proposal["quantityPerLoad"] == proposal["requestedQuantity"]
    assert proposal["status"] == "PROPOSED_NOT_APPROVED"
    assert circular["status"] == "DRAFT_UNNUMBERED"
    assert not proposal["publicationAllowed"] and not circular["publicationAllowed"]
