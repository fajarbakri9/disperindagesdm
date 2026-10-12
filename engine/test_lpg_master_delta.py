import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_uswatun_records_are_distinct_and_evidence_backed():
    rows = json.loads((ROOT / "assets/data/lpg-pangkalan.json").read_text(encoding="utf-8"))
    by_id = {row["id"]: row for row in rows}
    first, second = by_id["PG-000478"], by_id["PG-000482"]
    assert first["identityStatus"] == second["identityStatus"] == "DISTINCT_OFFICIAL_RECORD"
    assert first["agentId"] != second["agentId"]
    assert first["address"] != second["address"]
    assert first["registrationId"] == "791272817111121"
    assert "2026-09" in first["latestIdentityEvidence"]
    assert second["latestIdentityEvidence"] == "PERTAMINA_DISTRIBUTION_REPORT_2026-10-01_08"
    assert second["registrationVerificationStatus"] == "VERIFIED_IN_PERTAMINA_DISTRIBUTION_REPORT"


def test_master_identity_keys_are_unique():
    rows = json.loads((ROOT / "assets/data/lpg-pangkalan.json").read_text(encoding="utf-8"))
    assert len(rows) == len({row["id"] for row in rows}) == 723
    registrations = [str(row["registrationId"]) for row in rows if row.get("registrationId")]
    assert len(registrations) == len(set(registrations)) == 520
