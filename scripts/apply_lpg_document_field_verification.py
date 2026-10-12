"""Terapkan aturan verifikasi lapangan untuk koordinat dokumen.

Aturan otoritatif 2026-10-09:
- DOCUMENT_COORDINATE yang unik = hasil verifikasi lapangan.
- DOCUMENT_COORDINATE yang dipakai >1 pangkalan = belum terverifikasi dan wajib ditinjau.
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MASTER_PATH = ROOT / "assets/data/lpg-pangkalan.json"
AUDIT_PATH = ROOT / "assets/data/lpg-coordinate-field-verification-2026.json"
KIANO_PATH = ROOT / "assets/data/lpg-kiano-pangkalan-2026.json"
REPORT_PATHS = [ROOT / f"assets/data/lpg-distribution-2026-{month}.json" for month in ("08", "09", "10")]
VERSION = "2026-10-09-document-coordinate-field-verification-v1"


def coordinate_key(row):
    return f"{float(row['latitude']):.7f},{float(row['longitude']):.7f}"


def main():
    master = json.loads(MASTER_PATH.read_text(encoding="utf-8"))
    document_rows = [row for row in master if row.get("pointType") == "DOCUMENT_COORDINATE"]
    groups = defaultdict(list)
    for row in document_rows:
        groups[coordinate_key(row)].append(row)

    verified, review = [], []
    duplicate_groups = []
    for key, rows in sorted(groups.items()):
        duplicate = len(rows) > 1
        group_id = f"DOC-COORD-DUP-{len(duplicate_groups) + 1:02d}" if duplicate else None
        if duplicate:
            duplicate_groups.append({
                "groupId": group_id, "coordinate": key, "recordCount": len(rows),
                "records": [{"id": row["id"], "name": row["name"], "agentId": row["agentId"],
                             "registrationId": row.get("registrationId")} for row in rows],
            })
        for row in rows:
            if duplicate:
                row.update({
                    "gpsVerified": False,
                    "verificationStatus": "duplicate-coordinate-review",
                    "locationVerification": {
                        "status": "DOCUMENT_COORDINATE_DUPLICATE_REQUIRES_REVIEW",
                        "requiresAgentGps": True,
                        "checkedAt": "2026-10-09",
                        "note": f"Koordinat dokumen identik digunakan oleh {len(rows)} pangkalan ({group_id}); belum dapat dinyatakan sebagai titik lapangan unik.",
                    },
                    "coordinateDuplicateGroup": group_id,
                    "coordinateDuplicateCount": len(rows),
                    "fieldVerificationBasis": "DOCUMENT_COORDINATE_DUPLICATE_EXCLUDED",
                    "dataVersion": VERSION,
                })
                review.append(row["id"])
            else:
                row.update({
                    "gpsVerified": True,
                    "verificationStatus": "field-verified-document",
                    "locationVerification": {
                        "status": "VERIFIED",
                        "requiresAgentGps": False,
                        "verifiedAt": "2026-10-09",
                        "verifiedBy": "DOCUMENT_FIELD_VERIFICATION_RULE",
                        "note": "Koordinat unik pada dokumen agen ditetapkan sebagai hasil verifikasi lapangan sesuai ketetapan pemilik data.",
                    },
                    "coordinateDuplicateGroup": None,
                    "coordinateDuplicateCount": 1,
                    "fieldVerificationBasis": "UNIQUE_AGENT_DOCUMENT_COORDINATE",
                    "fieldVerifiedAt": "2026-10-09",
                    "dataVersion": VERSION,
                })
                verified.append(row["id"])

    if len(document_rows) != 232 or len(verified) != 214 or len(review) != 18 or len(duplicate_groups) != 7:
        raise ValueError("Jumlah klasifikasi koordinat dokumen berubah; pembaruan dihentikan.")
    MASTER_PATH.write_text(json.dumps(master, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    by_id = {row["id"]: row for row in master}
    by_registration = {str(row.get("registrationId")): row for row in master if row.get("registrationId")}
    kiano = json.loads(KIANO_PATH.read_text(encoding="utf-8"))
    for source in kiano["records"]:
        canonical = by_registration[source["registrationId"]]
        source.update({
            "gpsVerified": canonical["gpsVerified"],
            "verificationStatus": canonical["verificationStatus"],
            "locationVerification": canonical["locationVerification"],
            "fieldVerificationBasis": canonical["fieldVerificationBasis"],
        })
    kiano["status"] = "document-coordinate-field-verified"
    kiano["quality"]["gpsFieldVerifiedCount"] = sum(row["gpsVerified"] is True for row in kiano["records"])
    KIANO_PATH.write_text(json.dumps(kiano, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for path in REPORT_PATHS:
        report = json.loads(path.read_text(encoding="utf-8"))
        selected = [by_id[row["pangkalanId"]] for row in report.get("records", []) if row.get("pangkalanId") in by_id]
        quality = report.setdefault("dataQuality", {})
        quality["gpsFieldVerifiedCount"] = sum(row.get("gpsVerified") is True for row in selected)
        quality["duplicateDocumentCoordinateReviewCount"] = sum(row.get("verificationStatus") == "duplicate-coordinate-review" for row in selected)
        path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    audit = {
        "schemaVersion": 1, "ruleVersion": VERSION, "effectiveDate": "2026-10-09",
        "policy": "Koordinat pada dokumen agen merupakan hasil verifikasi lapangan apabila unik; koordinat ganda dikecualikan sampai verifikasi ulang.",
        "totalPangkalan": len(master), "documentCoordinateCount": len(document_rows),
        "uniqueDocumentCoordinateVerifiedCount": len(verified),
        "duplicateDocumentCoordinateReviewCount": len(review),
        "duplicateCoordinateGroupCount": len(duplicate_groups),
        "gpsFieldVerifiedTotal": sum(row.get("gpsVerified") is True for row in master),
        "verifiedRecordIds": verified, "reviewRecordIds": review, "duplicateGroups": duplicate_groups,
    }
    AUDIT_PATH.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: audit[key] for key in ("totalPangkalan", "documentCoordinateCount", "uniqueDocumentCoordinateVerifiedCount", "duplicateDocumentCoordinateReviewCount", "duplicateCoordinateGroupCount", "gpsFieldVerifiedTotal")}, indent=2))


if __name__ == "__main__":
    main()
