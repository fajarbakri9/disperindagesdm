"""Publish the complete canonical BBM outlet master to Firestore."""
from pathlib import Path
import json
import re
import requests
import sys

if "--explicit-recovery" not in sys.argv:
    raise SystemExit("Publikasi snapshot BBM lokal dinonaktifkan. Firestore adalah master. Gunakan --explicit-recovery hanya untuk pemulihan terencana setelah validasi administratif.")

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "disperindagesdm-pinrang"

auth = json.loads((Path.home() / ".config" / "configstore" / "firebase-tools.json").read_text(encoding="utf-8"))
token = auth.get("access_token") or auth.get("tokens", {}).get("access_token")
if not token:
    raise SystemExit("Firebase CLI token tidak tersedia")

source = (ROOT / "js" / "bbm-data-seed.js").read_text(encoding="utf-8")
match = re.search(r"const DEFAULT_BBM_OUTLETS\s*=\s*(\[[\s\S]*?\]);", source)
if not match:
    raise SystemExit("DEFAULT_BBM_OUTLETS tidak ditemukan")
items = json.loads(match.group(1))
engine = (ROOT / "js" / "bbm-engine.js").read_text(encoding="utf-8")
version_match = re.search(r"REQUIRED_DATA_VERSION\s*=\s*['\"]([^'\"]+)", engine)
if not version_match:
    raise SystemExit("REQUIRED_DATA_VERSION tidak ditemukan")
VERSION = version_match.group(1)

def firestore_value(value):
    if value is None: return {"nullValue": None}
    if isinstance(value, bool): return {"booleanValue": value}
    if isinstance(value, int): return {"integerValue": str(value)}
    if isinstance(value, float): return {"doubleValue": value}
    if isinstance(value, str): return {"stringValue": value}
    if isinstance(value, list): return {"arrayValue": {"values": [firestore_value(entry) for entry in value]}}
    if isinstance(value, dict): return {"mapValue": {"fields": {key: firestore_value(entry) for key, entry in value.items()}}}
    raise TypeError(type(value))

writes = []
for item in items:
    item["dataVersion"] = VERSION
    name = f"projects/{PROJECT}/databases/(default)/documents/bbm_outlets/{item['id']}"
    writes.append({
        "update": {"name": name, "fields": {key: firestore_value(value) for key, value in item.items()}},
        "updateTransforms": [{"fieldPath": "updated_at", "setToServerValue": "REQUEST_TIME"}],
    })

url = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents:commit"
response = requests.post(url, headers={"Authorization": f"Bearer {token}"}, json={"writes": writes}, timeout=120)
if not response.ok:
    raise SystemExit(f"Commit gagal HTTP {response.status_code}: {response.text[:500]}")
print(f"Published {len(writes)} canonical BBM documents ({VERSION}).")
