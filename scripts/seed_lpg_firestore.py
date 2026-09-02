"""Publish canonical LPG agents/pangkalan to Firestore in safe commit chunks."""
from pathlib import Path
import json, requests, sys

if "--explicit-recovery" not in sys.argv:
    raise SystemExit("Publikasi snapshot LPG lokal dinonaktifkan. Firestore adalah master. Gunakan --explicit-recovery hanya untuk pemulihan terencana setelah validasi administratif.")

ROOT=Path(__file__).resolve().parents[1]; PROJECT="disperindagesdm-pinrang"
auth=json.loads((Path.home()/".config"/"configstore"/"firebase-tools.json").read_text(encoding="utf-8"))
token=auth.get("access_token") or auth.get("tokens",{}).get("access_token")
if not token: raise SystemExit("Firebase CLI token tidak tersedia")

def fv(v):
    if v is None:return {"nullValue":None}
    if isinstance(v,bool):return {"booleanValue":v}
    if isinstance(v,int):return {"integerValue":str(v)}
    if isinstance(v,float):return {"doubleValue":v}
    if isinstance(v,str):return {"stringValue":v}
    if isinstance(v,list):return {"arrayValue":{"values":[fv(x) for x in v]}}
    if isinstance(v,dict):return {"mapValue":{"fields":{k:fv(x) for k,x in v.items()}}}
    raise TypeError(type(v))

writes=[]
for collection,file in [("lpg_agents","lpg-agents.json"),("lpg_pangkalan","lpg-pangkalan.json")]:
    for item in json.loads((ROOT/"assets"/"data"/file).read_text(encoding="utf-8")):
        name=f"projects/{PROJECT}/databases/(default)/documents/{collection}/{item['id']}"
        writes.append({"update":{"name":name,"fields":{k:fv(v) for k,v in item.items()}},"updateTransforms":[{"fieldPath":"updatedAt","setToServerValue":"REQUEST_TIME"}]})
url=f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents:commit"
for start in range(0,len(writes),400):
    chunk=writes[start:start+400]
    r=requests.post(url,headers={"Authorization":f"Bearer {token}"},json={"writes":chunk},timeout=120)
    if not r.ok: raise SystemExit(f"Commit {start} gagal HTTP {r.status_code}: {r.text[:500]}")
    print(f"Committed {start+1}-{start+len(chunk)} of {len(writes)}")
print(f"Published {len(writes)} canonical LPG documents.")
