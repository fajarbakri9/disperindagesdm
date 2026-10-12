"""Publikasikan 232 status koordinat dokumen ke Firestore dengan update mask."""
from __future__ import annotations
import json, sys
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "disperindagesdm-pinrang"
FIELDS = ["gpsVerified", "verificationStatus", "locationVerification", "coordinateDuplicateGroup",
          "coordinateDuplicateCount", "fieldVerificationBasis", "fieldVerifiedAt", "dataVersion"]

def fv(value):
    if value is None: return {"nullValue": None}
    if isinstance(value, bool): return {"booleanValue": value}
    if isinstance(value, int): return {"integerValue": str(value)}
    if isinstance(value, float): return {"doubleValue": value}
    if isinstance(value, str): return {"stringValue": value}
    if isinstance(value, list): return {"arrayValue": {"values": [fv(x) for x in value]}}
    if isinstance(value, dict): return {"mapValue": {"fields": {k: fv(v) for k,v in value.items()}}}
    raise TypeError(type(value))

def main():
    apply = "--apply" in sys.argv
    master = json.loads((ROOT / "assets/data/lpg-pangkalan.json").read_text(encoding="utf-8"))
    rows = [row for row in master if row.get("pointType") == "DOCUMENT_COORDINATE"]
    if len(rows) != 232 or sum(row.get("gpsVerified") is True for row in rows) != 214:
        raise SystemExit("Klasifikasi master tidak sesuai prasyarat.")
    config = json.loads((Path.home()/".config/configstore/firebase-tools.json").read_text(encoding="utf-8"))
    token = config.get("access_token") or config.get("tokens",{}).get("access_token")
    headers = {"Authorization":f"Bearer {token}","Content-Type":"application/json"}
    base=f"projects/{PROJECT}/databases/(default)/documents"
    writes=[]
    for row in rows:
        writes.append({"update":{"name":f"{base}/lpg_pangkalan/{row['id']}","fields":{k:fv(row.get(k)) for k in FIELDS}},
                       "updateMask":{"fieldPaths":FIELDS},"currentDocument":{"exists":True}})
    print(json.dumps({"mode":"APPLY" if apply else "DRY_RUN","writes":len(writes),"verified":214,"duplicateReview":18},indent=2))
    if not apply:return
    response=requests.post(f"https://firestore.googleapis.com/v1/{base}:commit",headers=headers,json={"writes":writes},timeout=120)
    if not response.ok:raise SystemExit(f"Commit gagal HTTP {response.status_code}: {response.text[:1000]}")
    if len(response.json().get("writeResults",[]))!=len(writes):raise SystemExit("Jumlah hasil write tidak cocok")
    print("Committed 232 document coordinate verification updates.")

if __name__=="__main__":main()
