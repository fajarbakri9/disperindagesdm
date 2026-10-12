"""Publikasikan hanya 206 pembaruan dokumen agen ke Firestore.

Entri lama memakai updateMask agar field operasional lain di server tidak
tertimpa. Entri berstatus ADD dibuat sebagai dokumen baru utuh.
"""
from pathlib import Path
import json
import sys
import requests

if "--apply" not in sys.argv:
    raise SystemExit("Gunakan --apply setelah hasil audit dan master divalidasi.")

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "disperindagesdm-pinrang"
MASTER = {x["id"]: x for x in json.loads((ROOT / "assets/data/lpg-pangkalan.json").read_text(encoding="utf-8"))}
AUDIT = json.loads((ROOT / "Dokumen Pangkalan/HASIL_ANALISIS_UPDATE_PANGKALAN.json").read_text(encoding="utf-8"))["audit"]
auth = json.loads((Path.home() / ".config/configstore/firebase-tools.json").read_text(encoding="utf-8"))
token = auth.get("access_token") or auth.get("tokens", {}).get("access_token")
if not token:
    raise SystemExit("Firebase CLI token tidak tersedia.")


def fv(value):
    if value is None: return {"nullValue": None}
    if isinstance(value, bool): return {"booleanValue": value}
    if isinstance(value, int): return {"integerValue": str(value)}
    if isinstance(value, float): return {"doubleValue": value}
    if isinstance(value, str): return {"stringValue": value}
    if isinstance(value, list): return {"arrayValue": {"values": [fv(x) for x in value]}}
    if isinstance(value, dict): return {"mapValue": {"fields": {k: fv(v) for k, v in value.items()}}}
    raise TypeError(type(value))


update_fields = [
    "agentId", "agentName", "name", "normalizedName", "kecamatan", "kecamatanSource",
    "desaKelurahan", "desaKelurahanSource", "address", "latitude", "longitude",
    "registrationId", "googleMapsUrl", "googleMapsSearchUrl", "plusCode", "listingName",
    "locationPrecisionLevel", "locationMatchStatus", "locationMethod", "locationConfidence",
    "pointType", "gpsVerified", "locationVerification", "verificationStatus",
    "geolocationSource", "coordinateCorrectionNote", "dataVersion", "documentSource",
    "documentRow", "previousDocumentUpdateValue", "sourceOriginal",
]

writes = []
for row in AUDIT:
    item = MASTER[row["id"]]
    name = f"projects/{PROJECT}/databases/(default)/documents/lpg_pangkalan/{item['id']}"
    if row["action"] == "ADD":
        writes.append({"update": {"name": name, "fields": {k: fv(v) for k, v in item.items()}}})
    else:
        writes.append({
            "update": {"name": name, "fields": {k: fv(item.get(k)) for k in update_fields}},
            "updateMask": {"fieldPaths": update_fields},
        })

url = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents:commit"
for start in range(0, len(writes), 400):
    chunk = writes[start:start + 400]
    response = requests.post(url, headers={"Authorization": f"Bearer {token}"}, json={"writes": chunk}, timeout=120)
    if not response.ok:
        raise SystemExit(f"Commit gagal HTTP {response.status_code}: {response.text[:1000]}")
    print(f"Committed {start + 1}-{start + len(chunk)} of {len(writes)}")
print(f"Published {len(writes)} document-sourced LPG records.")
