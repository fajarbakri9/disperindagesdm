import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def test_document_coordinate_verification_policy_is_applied_per_record():
    rows = load("assets/data/lpg-pangkalan.json")
    documents = [row for row in rows if row.get("pointType") == "DOCUMENT_COORDINATE"]
    groups = defaultdict(list)
    for row in documents:
        groups[(round(row["latitude"], 7), round(row["longitude"], 7))].append(row)
    unique = [rows[0] for rows in groups.values() if len(rows) == 1]
    duplicated = [row for rows in groups.values() if len(rows) > 1 for row in rows]
    assert len(documents) == 232
    assert len(unique) == 214
    assert len(duplicated) == 18
    assert all(row["gpsVerified"] is True and row["locationVerification"]["status"] == "VERIFIED" for row in unique)
    assert all(row["gpsVerified"] is False and row["verificationStatus"] == "duplicate-coordinate-review" for row in duplicated)


def test_coordinate_verification_audit_is_complete():
    audit = load("assets/data/lpg-coordinate-field-verification-2026.json")
    assert audit["gpsFieldVerifiedTotal"] == 214
    assert audit["duplicateCoordinateGroupCount"] == 7
    assert len(audit["verifiedRecordIds"]) == 214
    assert len(audit["reviewRecordIds"]) == 18
    assert len(set(audit["verifiedRecordIds"]) & set(audit["reviewRecordIds"])) == 0
