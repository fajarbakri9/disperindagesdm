"""Audit and migrate Pinrang administrative names to one authoritative Firestore master.

Dry-run is the default. Pass --commit to write. The master is sourced from the
official 2024 Pinrang sectoral statistics table stored in assets/data.
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "disperindagesdm-pinrang"
VERSION = "2026-09-02-pemkab-statistik-sektoral-2024-v1"
COLLECTIONS = ("markets", "lpg_agents", "lpg_pangkalan", "bbm_outlets")


def normalized(value):
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char)).upper()
    return re.sub(r"[^A-Z0-9]", "", re.sub(r"\b(DESA|KELURAHAN|KECAMATAN|DUSUN)\b", "", text))


def fv(value):
    if value is None: return {"nullValue": None}
    if isinstance(value, bool): return {"booleanValue": value}
    if isinstance(value, int): return {"integerValue": str(value)}
    if isinstance(value, float): return {"doubleValue": value}
    if isinstance(value, str): return {"stringValue": value}
    if isinstance(value, list): return {"arrayValue": {"values": [fv(item) for item in value]}}
    if isinstance(value, dict): return {"mapValue": {"fields": {key: fv(item) for key, item in value.items()}}}
    raise TypeError(type(value))


def plain(value):
    if not value: return None
    for key in ("stringValue", "doubleValue", "integerValue", "booleanValue", "timestampValue"):
        if key in value: return value[key]
    if "nullValue" in value: return None
    return None


def token():
    path = Path.home() / ".config" / "configstore" / "firebase-tools.json"
    auth = json.loads(path.read_text(encoding="utf-8"))
    result = auth.get("access_token") or auth.get("tokens", {}).get("access_token")
    if not result: raise SystemExit("Firebase CLI access token tidak tersedia")
    return result


def list_docs(session, collection):
    result, page = [], None
    while True:
        params = {"pageSize": 1000}
        if page: params["pageToken"] = page
        url = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/{collection}"
        response = session.get(url, params=params, timeout=90)
        response.raise_for_status()
        payload = response.json(); result.extend(payload.get("documents", [])); page = payload.get("nextPageToken")
        if not page: return result


def point_in_ring(lng, lat, ring):
    inside = False
    for index, first in enumerate(ring):
        second = ring[index - 1]
        x1, y1 = first[:2]; x2, y2 = second[:2]
        if ((y1 > lat) != (y2 > lat)) and lng < (x2 - x1) * (lat - y1) / ((y2 - y1) or 1e-15) + x1:
            inside = not inside
    return inside


def point_in_geometry(lng, lat, geometry):
    coordinates = geometry.get("coordinates", [])
    polygons = [coordinates] if geometry.get("type") == "Polygon" else coordinates
    return any(polygon and point_in_ring(lng, lat, polygon[0]) and not any(point_in_ring(lng, lat, hole) for hole in polygon[1:]) for polygon in polygons)


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--commit", action="store_true"); args = parser.parse_args()
    source = json.loads((ROOT / "assets/data/pinrang-administrative-master.json").read_text(encoding="utf-8"))
    rows = [{"district": district["name"], "name": name, "type": kind} for district in source["districts"] for name, kind in district["villages"]]
    kinds = Counter(row["type"] for row in rows)
    if len(rows) != 109 or kinds != {"Desa": 69, "Kelurahan": 40}: raise SystemExit(f"Master invalid: {len(rows)} / {dict(kinds)}")
    official = {(normalized(row["district"]), normalized(row["name"])): row for row in rows}
    by_district = {}
    for row in rows: by_district.setdefault(normalized(row["district"]), {})[normalized(row["name"])] = row

    aliases = {
        "BATULAPPA":"Batulappa", "BATULAPPA":"Batulappa", "MATUNRUTUNRUE":"Mattunru Tunrue", "KABALLANGAN":"Kaballangang",
        "LANSIRANG":"Lanrisang", "WAETUOE":"Wae Tuoe", "SABBANGPARU":"Sabbang Paru", "ULUSADDANG":"Ulusaddang",
        "BENTENGSAWITO":"Benteng Sawitto", "MATTIROADE":"Mattiro Ade", "PADANGLOANG":"Padang Loang", "WIRINGTASI":"Wiring Tasi",
        "PAKKIE":"Fakkie", "MACCORALAIE":"Macorawalie", "MACCORAWALIE":"Macorawalie", "SAWITO":"Sawitto", "MATTIROTASI":"Mattirotasi",
        "AMASSANGANG":"Amassangeng", "BUTTUSAWE":"Battusawe", "TADANGPALIE":"Tadangpalie"
    }
    composites = {
        ("DUAMPANUA","PEKKABATALAMPA"):"Pekkabata", ("LANRISANG","LANRISANGJAMPUE"):"Lanrisang", ("LEMBANG","BINANGAKARAENGPAJALELE"):"Binanga Karaeng",
        ("LEMBANG","TADOKKONGTUPPU"):"Tadokkong", ("MATTIROBULU","PANANRANGKARIANGO"):"Pananrang", ("MATTIROSOMPE","MATTONGANGTONGANGLABOLONG"):"Mattongang Tongang",
        ("PATAMPANUA","TEPPOBENTENG"):"Teppo", ("PATAMPANUA","SIPATUOMACCIRINNA"):"Sipatuo", ("LANRISANG","JAMPUE"):"Lanrisang",
        ("MATTIROSOMPE","LABOLONGSIWOLONGPOLONGKORIDOR"):"Siwolong Polong", ("PATAMPANUA","PITUMPANUAMALIMPUNGPERLUKONFIRMASI"):"Malimpung",
        ("SUPPA","MARITENGNGAEBARAKASANDA"):"Maritengngae", ("TIROANG","PAKKIEFAKKIE"):"Fakkie", ("DUAMPANUA","LAMPAKATOMPORANGPERLUPENETAPANTITIK"):"Lampa"
    }
    document_overrides = {
        # Ditjen Migas lists 78.912.01 as SPBUN Desa Binanga Karaeng, Kec. Lembang.
        ("bbm_outlets", "bbm_78_912_01"): ("Lembang", "Binanga Karaeng")
    }

    geo = json.loads((ROOT / "geo/pinrang/2026-06/desa-kelurahan.geojson").read_text(encoding="utf-8"))
    geo_features = geo.get("features", [])
    session = requests.Session(); session.headers["Authorization"] = f"Bearer {token()}"

    def resolve(district, village, lat=None, lng=None):
        dkey, vkey = normalized(district), normalized(village)
        if (dkey, vkey) in official: return official[(dkey, vkey)], "EXACT"
        alias = aliases.get(vkey)
        if alias and (dkey, normalized(alias)) in official: return official[(dkey, normalized(alias))], "ALIAS"
        composite = composites.get((dkey, vkey))
        if composite and (dkey, normalized(composite)) in official: return official[(dkey, normalized(composite))], "COMPOSITE"
        if lat is not None and lng is not None:
            try:
                lat, lng = float(lat), float(lng)
                for feature in geo_features:
                    if point_in_geometry(lng, lat, feature.get("geometry", {})):
                        props = feature.get("properties", {}); gd = props.get("WADMKC") or props.get("KECAMATAN"); gv = props.get("WADMKD") or props.get("NAMOBJ")
                        gkey = normalized(gv); mapped = aliases.get(gkey, gv)
                        match = official.get((normalized(gd), normalized(mapped)))
                        if match: return match, "SPATIAL"
            except (TypeError, ValueError): pass
        return None, "UNRESOLVED"

    changes, unresolved, documents = [], [], {}
    for collection in COLLECTIONS:
        documents[collection] = list_docs(session, collection)
        for document in documents[collection]:
            fields = document.get("fields", {})
            district = plain(fields.get("kecamatan")) or plain(fields.get("district"))
            village = plain(fields.get("desaKelurahan")) or plain(fields.get("desa")) or plain(fields.get("kelurahan")) or plain(fields.get("village"))
            lat = plain(fields.get("latitude")) or plain(fields.get("lat")); lng = plain(fields.get("longitude")) or plain(fields.get("lng"))
            doc_id = document["name"].split("/")[-1]
            override = document_overrides.get((collection, doc_id))
            if override:
                match = official.get((normalized(override[0]), normalized(override[1]))); method = "OFFICIAL_OVERRIDE"
            else:
                match, method = resolve(district, village, lat, lng)
            if not match:
                unresolved.append((collection, document["name"].split("/")[-1], district, village)); continue
            patch = {"kecamatan": match["district"], "desaKelurahan": match["name"], "administrativeType": match["type"], "administrativeMasterVersion": VERSION, "administrativeVerification": method, "administrativeSource": source["primarySource"]["url"]}
            if "desa" in fields: patch["desa"] = match["name"]
            if "kelurahan" in fields: patch["kelurahan"] = match["name"]
            before = (district, village); after = (match["district"], match["name"])
            changes.append((document["name"], patch, before, after, method))

    print(f"Audit dokumen: {sum(map(len, documents.values()))}; dapat dipetakan: {len(changes)}; belum terpetakan: {len(unresolved)}")
    for item in unresolved: print("UNRESOLVED", *item, sep=" | ")
    if unresolved: raise SystemExit("Migrasi dihentikan: masih ada dokumen yang belum terpetakan secara pasti")
    corrected = [item for item in changes if item[2] != item[3]]
    for name, _, before, after, method in corrected: print(f"CHANGE | {name.split('/')[-2]}/{name.split('/')[-1]} | {before} -> {after} | {method}")
    print(f"Perubahan nama: {len(corrected)}; standardisasi metadata: {len(changes)}")
    if not args.commit: print("DRY RUN selesai. Jalankan dengan --commit setelah audit."); return

    writes = []
    for name, patch, *_ in changes:
        writes.append({"update":{"name":name,"fields":{key:fv(value) for key,value in patch.items()}},"updateMask":{"fieldPaths":list(patch)},"updateTransforms":[{"fieldPath":"administrativeVerifiedAt","setToServerValue":"REQUEST_TIME"}]})
    expected_names = set()
    for row in rows:
        doc_id = f"{normalized(row['district']).lower()}-{normalized(row['name']).lower()}"; expected_names.add(doc_id)
        name = f"projects/{PROJECT}/databases/(default)/documents/administrative_villages/{doc_id}"
        payload = {**row,"dataVersion":VERSION,"sourceTitle":source["primarySource"]["title"],"sourceUrl":source["primarySource"]["url"]}
        writes.append({"update":{"name":name,"fields":{key:fv(value) for key,value in payload.items()}},"updateTransforms":[{"fieldPath":"verifiedAt","setToServerValue":"REQUEST_TIME"}]})
    existing_master = list_docs(session, "administrative_villages")
    for document in existing_master:
        if document["name"].split("/")[-1] not in expected_names: writes.append({"delete":document["name"]})
    meta_name=f"projects/{PROJECT}/databases/(default)/documents/administrative_meta/pinrang"
    meta={"jurisdiction":"Kabupaten Pinrang","dataVersion":VERSION,"districtCount":12,"villageCount":109,"desaCount":69,"kelurahanCount":40,"source":source["primarySource"]}
    writes.append({"update":{"name":meta_name,"fields":{key:fv(value) for key,value in meta.items()}},"updateTransforms":[{"fieldPath":"verifiedAt","setToServerValue":"REQUEST_TIME"}]})
    endpoint=f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents:commit"
    for start in range(0,len(writes),350):
        chunk=writes[start:start+350]; response=session.post(endpoint,json={"writes":chunk},timeout=120)
        if not response.ok: raise SystemExit(f"Commit {start} gagal HTTP {response.status_code}: {response.text[:800]}")
        print(f"Committed {start+1}-{start+len(chunk)} dari {len(writes)} writes")
    final_master=list_docs(session,"administrative_villages")
    if len(final_master)!=109: raise SystemExit(f"Verifikasi pascamigrasi gagal: administrative_villages={len(final_master)}")
    print(f"SELESAI: {len(changes)} dokumen distandardisasi; master Firestore tepat {len(final_master)} wilayah.")


if __name__ == "__main__": main()
