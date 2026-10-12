"""Sinkronkan delta master LPG lokal ke Firestore secara ketat dan dapat diaudit.

Tanpa --apply skrip hanya mengaudit. Pada mode apply, hanya record yang belum ada
yang dibuat dan dua record USWATUN HASANAH diperbarui memakai update mask.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "disperindagesdm-pinrang"
CONFIG = Path.home() / ".config/configstore/firebase-tools.json"
MASTER_PATH = ROOT / "assets/data/lpg-pangkalan.json"
USWATUN_IDS = {"PG-000478", "PG-000482"}
EXPECTED_MISSING = {f"PG-{number:06d}" for number in range(682, 698)}
USWATUN_FIELDS = [
    "identityStatus", "identityReviewDate", "identityReviewNote",
    "latestIdentityEvidence", "operationalDataStatus",
    "registrationVerificationStatus", "registrationVerificationSource", "dataVersion",
]


def firestore_value(value):
    if value is None:
        return {"nullValue": None}
    if isinstance(value, bool):
        return {"booleanValue": value}
    if isinstance(value, int):
        return {"integerValue": str(value)}
    if isinstance(value, float):
        return {"doubleValue": value}
    if isinstance(value, str):
        return {"stringValue": value}
    if isinstance(value, list):
        return {"arrayValue": {"values": [firestore_value(item) for item in value]}}
    if isinstance(value, dict):
        return {"mapValue": {"fields": {key: firestore_value(item) for key, item in value.items()}}}
    raise TypeError(type(value))


def main():
    apply = "--apply" in sys.argv
    master = json.loads(MASTER_PATH.read_text(encoding="utf-8"))
    by_id = {row["id"]: row for row in master}
    if len(master) != 723 or len(by_id) != 723:
        raise SystemExit("Master lokal wajib berisi tepat 723 ID unik.")
    if len({str(row["registrationId"]) for row in master if row.get("registrationId")}) != 424:
        raise SystemExit("Jumlah nomor registrasi unik berubah; publikasi dihentikan.")

    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    token = config.get("access_token") or config.get("tokens", {}).get("access_token")
    if not token:
        raise SystemExit("Token Firebase CLI tidak tersedia.")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    base = f"projects/{PROJECT}/databases/(default)/documents"
    remote_ids = set()
    page_token = None
    while True:
        params = {"pageSize": 300, "mask.fieldPaths": "id"}
        if page_token:
            params["pageToken"] = page_token
        response = requests.get(f"https://firestore.googleapis.com/v1/{base}/lpg_pangkalan", headers=headers, params=params, timeout=120)
        if not response.ok:
            raise SystemExit(f"Audit Firestore gagal HTTP {response.status_code}: {response.text[:500]}")
        payload = response.json()
        remote_ids.update(doc["name"].rsplit("/", 1)[-1] for doc in payload.get("documents", []))
        page_token = payload.get("nextPageToken")
        if not page_token:
            break
    missing = set(by_id) - remote_ids
    remote_only = remote_ids - set(by_id)
    if missing != EXPECTED_MISSING or remote_only:
        raise SystemExit(f"Delta tidak sesuai ekspektasi: missing={sorted(missing)}, remoteOnly={sorted(remote_only)}")

    writes = []
    for record_id in sorted(missing):
        row = by_id[record_id]
        writes.append({
            "update": {"name": f"{base}/lpg_pangkalan/{record_id}", "fields": {key: firestore_value(value) for key, value in row.items()}},
            "currentDocument": {"exists": False},
        })
    for record_id in sorted(USWATUN_IDS):
        row = by_id[record_id]
        writes.append({
            "update": {"name": f"{base}/lpg_pangkalan/{record_id}", "fields": {key: firestore_value(row.get(key)) for key in USWATUN_FIELDS}},
            "updateMask": {"fieldPaths": USWATUN_FIELDS},
            "currentDocument": {"exists": True},
        })
    print(json.dumps({
        "mode": "APPLY" if apply else "DRY_RUN", "remoteBefore": len(remote_ids),
        "local": len(master), "createCount": len(missing), "maskedUpdateCount": len(USWATUN_IDS),
        "createIds": sorted(missing), "updateIds": sorted(USWATUN_IDS),
    }, ensure_ascii=False, indent=2))
    if not apply:
        return
    response = requests.post(f"https://firestore.googleapis.com/v1/{base}:commit", headers=headers, json={"writes": writes}, timeout=120)
    if not response.ok:
        raise SystemExit(f"Commit gagal HTTP {response.status_code}: {response.text[:1000]}")
    if len(response.json().get("writeResults", [])) != len(writes):
        raise SystemExit("Jumlah hasil commit tidak sesuai jumlah write.")
    print(f"Committed {len(writes)} targeted writes; expected live total 723.")


if __name__ == "__main__":
    main()
