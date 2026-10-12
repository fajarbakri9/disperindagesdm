"""Publikasikan hanya 26 pangkalan PT Kiano dan relasi agennya ke Firestore."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "disperindagesdm-pinrang"
DATA_PATH = ROOT / "assets/data/lpg-kiano-pangkalan-2026.json"
AGENTS_PATH = ROOT / "assets/data/lpg-agents.json"
CONFIG = Path.home() / ".config/configstore/firebase-tools.json"


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


def main() -> None:
    apply = "--apply" in sys.argv
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    agents = json.loads(AGENTS_PATH.read_text(encoding="utf-8"))
    records = data["records"]
    if len(records) != 26 or len({row["registrationId"] for row in records}) != 26:
        raise SystemExit("Dataset Kiano tidak valid")
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    token = config.get("access_token") or config.get("tokens", {}).get("access_token")
    if not token:
        raise SystemExit("Token Firebase CLI tidak tersedia")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    base = f"projects/{PROJECT}/databases/(default)/documents"
    run_query = f"https://firestore.googleapis.com/v1/{base}:runQuery"
    query = {
        "structuredQuery": {
            "from": [{"collectionId": "lpg_pangkalan"}],
            "where": {"fieldFilter": {"field": {"fieldPath": "registrationId"}, "op": "IN", "value": {
                "arrayValue": {"values": [{"stringValue": row["registrationId"]} for row in records[:10]]}
            }}},
        }
    }
    # Firestore IN dibatasi 10/30 tergantung API; audit per kelompok agar portabel.
    conflicts = []
    for start in range(0, len(records), 10):
        query["structuredQuery"]["where"]["fieldFilter"]["value"]["arrayValue"]["values"] = [
            {"stringValue": row["registrationId"]} for row in records[start:start + 10]
        ]
        response = requests.post(run_query, headers=headers, json=query, timeout=60)
        if not response.ok:
            raise SystemExit(f"Audit Firestore gagal HTTP {response.status_code}: {response.text[:500]}")
        conflicts.extend(item["document"]["name"] for item in response.json() if "document" in item)
    if conflicts:
        raise SystemExit(f"Publikasi dihentikan; ID sudah ada: {conflicts}")

    writes = []
    for row in records:
        name = f"{base}/lpg_pangkalan/{row['id']}"
        writes.append({
            "update": {"name": name, "fields": {key: firestore_value(value) for key, value in row.items()}},
            "currentDocument": {"exists": False},
        })
    agent = next(item for item in agents if item["id"] == "AG-009")
    agent_fields = [
        "soldTo", "linkedPangkalanCount", "coordinateDocumentPangkalanCount",
        "relationshipStatus", "pangkalanDataSource", "pangkalanDataSourceDate",
    ]
    writes.append({
        "update": {
            "name": f"{base}/lpg_agents/AG-009",
            "fields": {key: firestore_value(agent.get(key)) for key in agent_fields},
        },
        "updateMask": {"fieldPaths": agent_fields},
        "currentDocument": {"exists": True},
    })
    print(json.dumps({
        "mode": "APPLY" if apply else "DRY_RUN",
        "newPangkalanWrites": 26,
        "agentMaskedUpdateWrites": 1,
        "documentIds": [row["id"] for row in records],
        "registrationIds": [row["registrationId"] for row in records],
    }, ensure_ascii=False, indent=2))
    if not apply:
        return
    response = requests.post(
        f"https://firestore.googleapis.com/v1/{base}:commit",
        headers=headers,
        json={"writes": writes},
        timeout=120,
    )
    if not response.ok:
        raise SystemExit(f"Commit gagal HTTP {response.status_code}: {response.text[:1000]}")
    results = response.json().get("writeResults", [])
    if len(results) != len(writes):
        raise SystemExit(f"Jumlah hasil write tidak sesuai: {len(results)}")
    print(f"Committed {len(writes)} targeted Firestore writes.")


if __name__ == "__main__":
    main()
