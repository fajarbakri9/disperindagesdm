"""Publish the canonical market snapshot to Firestore using Firebase CLI OAuth."""
from pathlib import Path
import sys

if "--explicit-recovery" not in sys.argv:
    raise SystemExit("Publikasi snapshot pasar lokal dinonaktifkan. Firestore adalah master. Gunakan --explicit-recovery hanya untuk pemulihan terencana setelah validasi administratif.")
import json, os, requests

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "disperindagesdm-pinrang"
TOKEN_FILE = Path.home() / ".config" / "configstore" / "firebase-tools.json"

def firestore_value(value):
    if value is None: return {"nullValue": None}
    if isinstance(value, bool): return {"booleanValue": value}
    if isinstance(value, int): return {"integerValue": str(value)}
    if isinstance(value, float): return {"doubleValue": value}
    if isinstance(value, str): return {"stringValue": value}
    if isinstance(value, list): return {"arrayValue": {"values": [firestore_value(v) for v in value]}}
    if isinstance(value, dict): return {"mapValue": {"fields": {k: firestore_value(v) for k, v in value.items()}}}
    raise TypeError(type(value))

auth = json.loads(TOKEN_FILE.read_text(encoding="utf-8"))
token = auth.get("access_token") or auth.get("tokens", {}).get("access_token")
if not token:
    raise SystemExit("Firebase CLI access token tidak tersedia; jalankan firebase login.")

items = json.loads((ROOT / "assets" / "data" / "markets.json").read_text(encoding="utf-8"))
writes = []
for item in items:
    fields = {k: firestore_value(v) for k, v in item.items() if k not in {"updatedAt", "updated_at"}}
    name = f"projects/{PROJECT}/databases/(default)/documents/markets/{item['id']}"
    writes.append({
        "update": {"name": name, "fields": fields},
        "updateTransforms": [
            {"fieldPath": "updatedAt", "setToServerValue": "REQUEST_TIME"},
            {"fieldPath": "updated_at", "setToServerValue": "REQUEST_TIME"},
        ],
    })

url = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents:commit"
response = requests.post(url, headers={"Authorization": f"Bearer {token}"}, json={"writes": writes}, timeout=60)
if not response.ok:
    raise SystemExit(f"Firestore commit gagal: HTTP {response.status_code} {response.text[:500]}")
print(f"Published {len(writes)} canonical market documents to Firestore.")
