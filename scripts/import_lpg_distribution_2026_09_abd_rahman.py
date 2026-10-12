"""Tambahkan laporan September PT H. Abd Rahman Hasyim ke dataset parsial."""
from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Dokumen Pangkalan/Sepet/Penyaluran Harian KABUPATEN PINRANG 2026-09 (2).pdf"
MASTER_PATH = ROOT / "assets/data/lpg-pangkalan.json"
AGENTS_PATH = ROOT / "assets/data/lpg-agents.json"
OUTPUT = ROOT / "assets/data/lpg-distribution-2026-09.json"
AGENT_ID = "AG-003"
AGENT_NAME = "PT. H. ABD RAHMAN HASYIM"
SOLD_TO = "817111"

NAME_OVERRIDES = {
    "791271817111021": "PG-000282",  # ANDI BASO L -> ANDI BASO
    "791215817111082": "PG-000372",  # HJ. ERNI MUHAMMAD -> HJ. ERNI MUHAMMAD ALI
}
CANDIDATES = {
    "7912610817111010": {
        "name": "MUH.FAJRI.S",
        "kecamatan": "Mattiro Sompe",
        "latitude": -3.808025,
        "longitude": 119.542638,
        "confidence": "HIGH_DISTRICT_INFERENCE",
        "evidence": "Semua 15 nama laporan lain dengan awalan registrasi 791261 yang cocok ke master berada di Kecamatan Mattiro Sompe.",
    },
    "7912530817111011": {
        "name": "SUNARTI",
        "kecamatan": "Duampanua",
        "latitude": -3.641385,
        "longitude": 119.550086,
        "confidence": "PROBABLE_DISTRICT_INFERENCE",
        "evidence": "Sebanyak 16 dari 17 nama laporan lain dengan awalan registrasi 791253 yang cocok ke master berada di Kecamatan Duampanua.",
    },
}


def norm(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or "").upper())
    return re.sub(r"[^A-Z0-9]+", "", text)


def parse() -> list[dict]:
    rows = []
    for page_number, page in enumerate(PdfReader(str(SOURCE)).pages, 1):
        for line in (page.extract_text(extraction_mode="layout") or "").splitlines():
            match = re.match(r"^\s*(791\d{12,13})\s+(.+)$", line)
            if not match:
                continue
            registration_id, remainder = match.groups()
            tokens = list(re.finditer(r"(?<![\w.])\d{1,3}(?:,\d{3})*(?![\w.])", remainder))
            if len(tokens) < 34:
                raise ValueError(f"Baris tidak lengkap pada halaman {page_number}: {registration_id}")
            selected = tokens[-34:]
            values = [int(token.group().replace(",", "")) for token in selected]
            allocation, daily = values[0], values[1:31]
            normal, facultative, grand = values[31:34]
            if sum(daily) != grand or normal + facultative != grand:
                raise ValueError(f"Aritmetika tidak cocok: {registration_id}")
            rows.append({
                "registrationId": registration_id,
                "reportPangkalanName": remainder[: selected[0].start()].strip(),
                "allocation": allocation,
                "daily": daily,
                "totalNormal": normal,
                "totalFacultative": facultative,
                "grandTotal": grand,
                "sourcePage": page_number,
            })
    if len(rows) != 127 or len({row["registrationId"] for row in rows}) != 127:
        raise ValueError(f"Jumlah/keunikan baris tidak sesuai: {len(rows)}")
    return rows


def add_candidates(master: list[dict], rows: list[dict]) -> None:
    next_id = max(int(item["id"].split("-")[1]) for item in master) + 1
    existing_registrations = {str(item.get("registrationId")) for item in master}
    allocation_by_registration = {row["registrationId"]: row["allocation"] for row in rows}
    for registration_id, candidate in CANDIDATES.items():
        if registration_id in existing_registrations:
            continue
        master.append({
            "id": f"PG-{next_id:06d}",
            "agentId": AGENT_ID,
            "agentName": AGENT_NAME,
            "registrationId": registration_id,
            "name": candidate["name"],
            "normalizedName": norm(candidate["name"]),
            "kecamatan": candidate["kecamatan"],
            "kecamatanSource": "REGISTRATION_PREFIX_INFERENCE",
            "desaKelurahan": None,
            "desaKelurahanSource": None,
            "address": f'Kecamatan {candidate["kecamatan"]}, Kabupaten Pinrang (lokasi administratif indikatif)',
            "latitude": candidate["latitude"],
            "longitude": candidate["longitude"],
            "googleMapsUrl": f'https://www.google.com/maps?q={candidate["latitude"]},{candidate["longitude"]}',
            "pointType": "ADMIN_FALLBACK",
            "coordinateSource": "KECAMATAN_BOUNDARY_REPRESENTATIVE_POINT",
            "coordinateAccuracy": "DISTRICT_REPRESENTATIVE_NOT_BUILDING",
            "gpsVerified": False,
            "verificationStatus": "identity-and-location-review",
            "status": "candidate",
            "isDeleted": False,
            "sourceType": "PERTAMINA_DISTRIBUTION_REPORT",
            "sourceDate": "2026-10-09",
            "sourceUrl": "Dokumen Pangkalan/Sepet/Penyaluran Harian KABUPATEN PINRANG 2026-09 (2).pdf",
            "monthlyAllocation": allocation_by_registration[registration_id],
            "allocationUnit": "tabung",
            "identityReviewRequired": True,
            "locationInferenceConfidence": candidate["confidence"],
            "locationInferenceEvidence": candidate["evidence"],
            "verificationNote": "Alamat dan koordinat bangunan belum tersedia. Titik hanya mewakili wilayah kecamatan dan tidak boleh disebut GPS terverifikasi.",
            "dataVersion": "2026-10-09-september-distribution-import",
        })
        next_id += 1


def main() -> None:
    rows = parse()
    master = json.loads(MASTER_PATH.read_text(encoding="utf-8"))
    agents = json.loads(AGENTS_PATH.read_text(encoding="utf-8"))
    add_candidates(master, rows)

    by_id = {item["id"]: item for item in master}
    by_registration = {str(item.get("registrationId")): item for item in master if item.get("registrationId")}
    by_agent_name: dict[str, list[dict]] = {}
    for item in master:
        if item.get("agentId") == AGENT_ID:
            by_agent_name.setdefault(norm(item.get("name")), []).append(item)

    records = []
    for row in rows:
        registration_id = row["registrationId"]
        target = by_registration.get(registration_id) or by_id.get(NAME_OVERRIDES.get(registration_id, ""))
        if not target:
            choices = by_agent_name.get(norm(row["reportPangkalanName"]), [])
            target = choices[0] if len(choices) == 1 else None
        if not target:
            raise ValueError(f"Tidak dapat mencocokkan {registration_id} {row['reportPangkalanName']}")
        if target.get("agentId") != AGENT_ID:
            raise ValueError(f"Agen master salah untuk {registration_id}")
        target["registrationId"] = registration_id
        target.update({
            "registrationVerificationStatus": "VERIFIED_IN_PERTAMINA_DISTRIBUTION_REPORT",
            "registrationVerificationSource": SOURCE.name,
            "monthlyAllocation": row["allocation"],
            "allocationUnit": "tabung",
            "latestDistributionPeriod": "2026-09",
            "latestDistributionNormal": row["totalNormal"],
            "latestDistributionFacultative": row["totalFacultative"],
            "latestDistributionTotal": row["grandTotal"],
            "latestDistributionUnit": "tabung",
            "latestDistributionSource": SOURCE.name,
        })
        if row["reportPangkalanName"] in {"7491267", "7P 91214"}:
            target["identityReviewRequired"] = True
            target["identityReviewReason"] = "Nama pada laporan menyerupai kode/nomor dan perlu konfirmasi kepada agen."
        records.append({
            "period": "2026-09", "unit": "tabung",
            "agentId": AGENT_ID, "agentName": AGENT_NAME, "soldTo": SOLD_TO,
            "registrationId": registration_id, "pangkalanId": target["id"],
            "pangkalanName": target["name"], "reportPangkalanName": row["reportPangkalanName"],
            "allocation": row["allocation"],
            "dailyDistribution": {f"2026-09-{day:02d}": value for day, value in enumerate(row["daily"], 1)},
            "totalNormal": row["totalNormal"], "totalFacultative": row["totalFacultative"],
            "grandTotal": row["grandTotal"],
            "realizationPct": round(row["grandTotal"] / row["allocation"] * 100, 2) if row["allocation"] else None,
            "isAboveAllocation": row["grandTotal"] > row["allocation"],
            "sourceDocument": SOURCE.name,
            "sourcePath": f"Dokumen Pangkalan/Sepet/{SOURCE.name}", "sourcePage": row["sourcePage"],
            "sourceStatus": "AGENT_REPORTED_PERTAMINA_SYSTEM",
            "attestation": "SYSTEM_REPORT_UNSIGNED",
            "registrationValidationStatus": "VERIFIED_IN_PERTAMINA_REPORT",
            "masterMatchStatus": "ADDED_CANDIDATE_FROM_DISTRIBUTION_REPORT" if registration_id in CANDIDATES else "MATCHED_NAME_AND_ASSIGNED_REGISTRATION_ID",
        })

    data = json.loads(OUTPUT.read_text(encoding="utf-8"))
    all_records = [item for item in data["records"] if item.get("agentId") != AGENT_ID] + records
    summaries = [item for item in data["summaries"] if item.get("agentId") != AGENT_ID]
    summaries.append({
        "agentId": AGENT_ID, "agentName": AGENT_NAME, "soldTo": SOLD_TO,
        "pangkalanCount": len(records), "allocation": sum(x["allocation"] for x in records),
        "totalNormal": sum(x["totalNormal"] for x in records),
        "totalFacultative": sum(x["totalFacultative"] for x in records),
        "grandTotal": sum(x["grandTotal"] for x in records),
        "zeroDistributionCount": sum(x["grandTotal"] == 0 for x in records),
        "aboveAllocationCount": sum(x["isAboveAllocation"] for x in records),
        "sourceDocument": SOURCE.name, "reportGeneratedAt": "2026-10-09T07:53:54+07:00",
        "attestation": "SYSTEM_REPORT_UNSIGNED", "unit": "tabung",
    })
    selected = [by_registration.get(x["registrationId"]) or next(y for y in master if y["id"] == x["pangkalanId"]) for x in all_records]
    data.update({
        "recordCount": len(all_records), "records": all_records, "summaries": summaries,
        "coverage": {
            "reportedAgentCount": len(summaries), "officialAgentCount": len([a for a in agents if not a.get("isDeleted")]),
            "isCompleteRegencyCoverage": False,
            "warning": "Hanya mencakup empat agen; tidak boleh disebut total Kabupaten Pinrang.",
        },
        "totals": {
            "allocation": sum(x["allocation"] for x in all_records),
            "totalNormal": sum(x["totalNormal"] for x in all_records),
            "totalFacultative": sum(x["totalFacultative"] for x in all_records),
            "grandTotal": sum(x["grandTotal"] for x in all_records),
            "kilograms": sum(x["grandTotal"] for x in all_records) * 3,
            "metricTons": round(sum(x["grandTotal"] for x in all_records) * 3 / 1000, 3),
        },
        "dailyTotals": {f"2026-09-{day:02d}": sum(x["dailyDistribution"][f"2026-09-{day:02d}"] for x in all_records) for day in range(1, 31)},
        "dataQuality": {
            "arithmeticValidatedRecordCount": len(all_records),
            "registrationMatchedRecordCount": len(all_records), "duplicateRegistrationCount": 0,
            "coordinateAvailableCount": sum(isinstance(x.get("latitude"), (int, float)) and isinstance(x.get("longitude"), (int, float)) for x in selected),
            "documentCoordinateCount": sum(x.get("pointType") == "DOCUMENT_COORDINATE" for x in selected),
            "administrativeFallbackCount": sum(x.get("pointType") == "ADMIN_FALLBACK" for x in selected),
            "unmappedCount": sum(x.get("pointType") == "UNMAPPED" for x in selected),
            "gpsFieldVerifiedCount": sum(x.get("gpsVerified") is True for x in selected),
        },
    })
    if len({x["registrationId"] for x in all_records}) != len(all_records):
        raise ValueError("Duplikasi registrasi pada dataset gabungan")
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    MASTER_PATH.write_text(json.dumps(master, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = summaries[-1]
    for agent in agents:
        if agent.get("id") == AGENT_ID:
            agent.update({
                "soldTo": SOLD_TO, "linkedPangkalanCount": sum(x.get("agentId") == AGENT_ID and not x.get("isDeleted") for x in master),
                "reportedPangkalanCount": len(records), "latestDistributionPeriod": "2026-09",
                "latestDistributionTotal": summary["grandTotal"], "latestDistributionNormal": summary["totalNormal"],
                "latestDistributionFacultative": summary["totalFacultative"], "distributionDataUnit": "tabung",
                "distributionDataSource": SOURCE.name,
                "relationshipStatus": "Terhubung ke master pangkalan dan laporan penyaluran September 2026",
            })
    AGENTS_PATH.write_text(json.dumps(agents, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"records": len(all_records), "agentRecords": len(records), "totals": data["totals"], "quality": data["dataQuality"], "matchStatus": Counter(x["masterMatchStatus"] for x in records)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
