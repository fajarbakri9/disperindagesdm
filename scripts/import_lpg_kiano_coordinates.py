"""Impor 26 pangkalan dan koordinat dokumen PT Kiano Energi Utama."""
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path

import fitz
from shapely.geometry import Point, shape

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Dokumen Pangkalan/DAFTAR PANGKALAN DAN TITIK KOORDINAT PT. KIANO ENERGI UTAMA.pdf"
MASTER_PATH = ROOT / "assets/data/lpg-pangkalan.json"
AGENTS_PATH = ROOT / "assets/data/lpg-agents.json"
OUTPUT = ROOT / "assets/data/lpg-kiano-pangkalan-2026.json"
DISTRICTS = ROOT / "geo/pinrang/2026-06/kecamatan.geojson"
VILLAGES = ROOT / "geo/pinrang/2026-06/desa-kelurahan.geojson"
AGENT_ID = "AG-009"
AGENT_NAME = "PT Kiano Energi Utama"
SOLD_TO = "1094864"

ADMIN_ALIASES = {
    "BENTENGSAWITO": "Benteng Sawitto",
    "PAKKIE": "Fakkie",
}


def norm(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or "").upper())
    text = re.sub(r"^(DESA|KELURAHAN)\s+", "", text)
    return re.sub(r"[^A-Z0-9]+", "", text)


def canonical_village(value: str) -> str:
    stripped = re.sub(r"^(DESA|KELURAHAN)\s+", "", value, flags=re.I).strip()
    return ADMIN_ALIASES.get(norm(stripped), stripped.title())


def parse() -> list[dict]:
    lines = [line.strip() for line in fitz.open(SOURCE)[0].get_text("text").splitlines() if line.strip()]
    starts = [index for index, line in enumerate(lines) if re.fullmatch(r"\d{1,2}", line) and 1 <= int(line) <= 26]
    rows = []
    for position, start in enumerate(starts):
        end = starts[position + 1] if position + 1 < len(starts) else lines.index("DAFTAR PANGKALAN LPG 3 KG")
        values = lines[start:end]
        number, registration_id, name = int(values[0]), values[1], values[2]
        coordinate = values[-1]
        middle = values[3:-1]
        if len(middle) == 3:
            district, village, address = middle
        elif len(middle) == 2 and middle[0].startswith("WATANG SAWITO"):
            district = "Watang Sawitto"
            village = middle[0].removeprefix("WATANG SAWITO").strip()
            address = middle[1]
        else:
            raise ValueError(f"Struktur baris {number} tidak dikenali: {values}")
        latitude, longitude = [float(part.strip()) for part in coordinate.split(",")]
        rows.append({
            "sourceRow": number,
            "registrationId": registration_id,
            "name": name.strip(),
            "kecamatan": district.title(),
            "desaKelurahan": canonical_village(village),
            "sourceAdministrativeLabel": village,
            "address": address.strip(),
            "latitude": latitude,
            "longitude": longitude,
        })
    if len(rows) != 26 or len({row["registrationId"] for row in rows}) != 26:
        raise ValueError("Dokumen harus menghasilkan 26 ID registrasi unik")
    if len({(row["latitude"], row["longitude"]) for row in rows}) != 26:
        raise ValueError("Dokumen mengandung koordinat ganda")
    return rows


def validate_geography(rows: list[dict]) -> None:
    district_data = json.loads(DISTRICTS.read_text(encoding="utf-8"))
    village_data = json.loads(VILLAGES.read_text(encoding="utf-8"))
    districts = {norm(f["properties"]["WADMKC"]): shape(f["geometry"]) for f in district_data["features"]}
    villages = {
        (norm(f["properties"]["WADMKC"]), norm(f["properties"]["WADMKD"])): shape(f["geometry"])
        for f in village_data["features"]
    }
    for row in rows:
        point = Point(row["longitude"], row["latitude"])
        district = districts.get(norm(row["kecamatan"]))
        village = villages.get((norm(row["kecamatan"]), norm(row["desaKelurahan"])))
        if district is None or not district.covers(point):
            raise ValueError(f"Koordinat di luar kecamatan: {row['name']}")
        if village is None or not village.covers(point):
            raise ValueError(f"Koordinat di luar desa/kelurahan: {row['name']}")
        row["districtBoundaryValidated"] = True
        row["villageBoundaryValidated"] = True


def main() -> None:
    rows = parse()
    validate_geography(rows)
    master = json.loads(MASTER_PATH.read_text(encoding="utf-8"))
    agents = json.loads(AGENTS_PATH.read_text(encoding="utf-8"))
    existing_registrations = {str(item.get("registrationId")) for item in master if item.get("registrationId")}
    conflicts = existing_registrations.intersection(row["registrationId"] for row in rows)
    if conflicts:
        # Idempotensi diizinkan hanya jika seluruh ID sudah dimiliki AG-009.
        owners = {str(item.get("registrationId")): item.get("agentId") for item in master}
        if any(owners[registration_id] != AGENT_ID for registration_id in conflicts):
            raise ValueError(f"ID registrasi bentrok dengan agen lain: {sorted(conflicts)}")
        master = [item for item in master if str(item.get("registrationId")) not in {row["registrationId"] for row in rows}]

    next_id = max(int(item["id"].split("-")[1]) for item in master) + 1
    created = []
    for row in rows:
        item = {
            "id": f"PG-{next_id:06d}",
            "agentId": AGENT_ID,
            "agentName": AGENT_NAME,
            "registrationId": row["registrationId"],
            "registrationVerificationStatus": "VERIFIED_IN_AGENT_COORDINATE_DOCUMENT",
            "registrationVerificationSource": SOURCE.name,
            "name": row["name"],
            "normalizedName": norm(row["name"]),
            "kecamatan": row["kecamatan"],
            "kecamatanSource": "AGENT_COORDINATE_DOCUMENT",
            "desaKelurahan": row["desaKelurahan"],
            "desaKelurahanSource": "AGENT_COORDINATE_DOCUMENT",
            "sourceAdministrativeLabel": row["sourceAdministrativeLabel"],
            "address": row["address"],
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "googleMapsUrl": f'https://www.google.com/maps?q={row["latitude"]},{row["longitude"]}',
            "pointType": "DOCUMENT_COORDINATE",
            "coordinateSource": "AGENT_COORDINATE_DOCUMENT",
            "coordinateAccuracy": "DOCUMENT_POINT_NOT_FIELD_VERIFIED",
            "districtBoundaryValidated": row["districtBoundaryValidated"],
            "villageBoundaryValidated": row["villageBoundaryValidated"],
            "gpsVerified": False,
            "verificationStatus": "document-sourced",
            "status": "ACTIVE",
            "isDeleted": False,
            "sourceType": "AGENT_COORDINATE_DOCUMENT",
            "sourceDate": "2026-10-06",
            "sourceUrl": f"Dokumen Pangkalan/{SOURCE.name}",
            "sourceLine": row["sourceRow"],
            "verificationNote": "Koordinat berasal dari daftar agen dan konsisten dengan batas kecamatan/desa; belum diverifikasi melalui kunjungan GPS lapangan.",
            "dataVersion": "2026-10-09-kiano-coordinate-import",
        }
        if norm(row["name"]) == "ALKAUTSAR":
            item["nameCollisionReview"] = True
            item["nameCollisionNote"] = "Nama yang sama terdapat pada agen lain, tetapi ID registrasi dan lokasi berbeda."
        master.append(item)
        created.append(item)
        next_id += 1

    agent = next((item for item in agents if item.get("id") == AGENT_ID), None)
    if not agent:
        raise ValueError("Agen AG-009 tidak ditemukan")
    agent.update({
        "soldTo": SOLD_TO,
        "linkedPangkalanCount": len(created),
        "coordinateDocumentPangkalanCount": len(created),
        "distributionDataUnit": "tabung",
        "relationshipStatus": "Terhubung ke 26 pangkalan pada dokumen koordinat agen",
        "pangkalanDataSource": SOURCE.name,
        "pangkalanDataSourceDate": "2026-10-06",
    })

    payload = {
        "schemaVersion": 1,
        "agentId": AGENT_ID,
        "agentName": AGENT_NAME,
        "soldTo": SOLD_TO,
        "status": "document-sourced-not-field-verified",
        "recordCount": len(created),
        "source": {
            "document": SOURCE.name,
            "documentDate": "2026-10-06",
            "sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest().upper(),
        },
        "quality": {
            "uniqueRegistrationCount": len({item["registrationId"] for item in created}),
            "uniqueCoordinateCount": len({(item["latitude"], item["longitude"]) for item in created}),
            "districtBoundaryValidatedCount": sum(item["districtBoundaryValidated"] for item in created),
            "villageBoundaryValidatedCount": sum(item["villageBoundaryValidated"] for item in created),
            "gpsFieldVerifiedCount": sum(item["gpsVerified"] is True for item in created),
        },
        "districtSummary": {
            district: sum(item["kecamatan"] == district for item in created)
            for district in sorted({item["kecamatan"] for item in created})
        },
        "records": created,
    }
    MASTER_PATH.write_text(json.dumps(master, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    AGENTS_PATH.write_text(json.dumps(agents, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"created": len(created), "master": len(master), "quality": payload["quality"], "districts": payload["districtSummary"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
