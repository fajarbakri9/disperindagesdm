"""Gabungkan dua laporan PDF 1-10 Oktober ke laporan parsial Oktober 2026.

Pencocokan pangkalan dilakukan dengan ID registrasi Pertamina, bukan kemiripan nama.
Laporan Agen 3444 yang sudah ada dipertahankan dan digabungkan sebagai agen ketiga.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
MASTER_PATH = ROOT / "assets/data/lpg-pangkalan.json"
AGENTS_PATH = ROOT / "assets/data/lpg-agents.json"
OUTPUT_PATH = ROOT / "assets/data/lpg-distribution-2026-10.json"
VERSION = "2026-10-12-agent-pdf-import-v1"

SOURCES = (
    {
        "path": Path(r"D:\# DOWNLOAD\Penyaluran perminggu PT.H.Abd.Rahman Hasyim TGL  01-10-10-10-2026.pdf"),
        "agentId": "AG-003",
        "agentName": "PT. H. ABD RAHMAN HASYIM",
        "soldTo": "817111",
        "expectedCount": 127,
        "expectedTotal": 27440,
    },
    {
        "path": Path(r"D:\# DOWNLOAD\Penyaluran Agen 01-10-10-10-2026_organized.pdf"),
        "agentId": "AG-002",
        "agentName": "PT. HAMISA SUKRAH MULYA",
        "soldTo": "818234",
        "expectedCount": 64,
        "expectedTotal": 14370,
    },
)

ROW_PATTERN = re.compile(
    r"^\s*(\d{6})\s+(\d{15,16})\s+(.*?)\s+"
    r"(?:CASHLESS\s+)?((?:\d+\s+){9}\d+)\s*$"
)


def parse_pdf(path: Path) -> list[dict]:
    rows = []
    for page_number, page in enumerate(PdfReader(str(path)).pages, 1):
        for line_number, raw_line in enumerate((page.extract_text() or "").splitlines(), 1):
            # Beberapa PDF tidak memberi spasi di antara ID registrasi dan nama.
            line = re.sub(r"(?<=\d)(?=[A-Za-z])", " ", raw_line)
            match = ROW_PATTERN.match(line)
            if not match:
                continue
            daily = [int(value) for value in match.group(4).split()]
            if len(daily) != 10 or any(value < 0 for value in daily):
                raise ValueError(f"Nilai harian tidak sah pada halaman {page_number}, baris {line_number}")
            rows.append({
                "stationId": match.group(1),
                "registrationId": match.group(2),
                "reportPangkalanName": match.group(3).strip(),
                "daily": daily,
                "sourcePage": page_number,
                "sourceLine": line_number,
            })
    return rows


def main() -> None:
    master = json.loads(MASTER_PATH.read_text(encoding="utf-8"))
    agents = json.loads(AGENTS_PATH.read_text(encoding="utf-8"))
    old_report = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))

    # Pertahankan laporan Agen 3444, tetapi tambahkan tanggal 9-10 bernilai nol
    # karena dokumen sumbernya hanya mencakup 1-8 Oktober.
    output_records = [row for row in old_report["records"] if row["agentId"] == "AG-007"]
    for row in output_records:
        row["dailyDistribution"].setdefault("2026-10-09", 0)
        row["dailyDistribution"].setdefault("2026-10-10", 0)

    summaries = [item for item in old_report["summaries"] if item["agentId"] == "AG-007"]
    import_results = []

    for source in SOURCES:
        parsed = parse_pdf(source["path"])
        if len(parsed) != source["expectedCount"]:
            raise ValueError(f"{source['path'].name}: terbaca {len(parsed)}, seharusnya {source['expectedCount']}")
        if len({row["stationId"] for row in parsed}) != len(parsed):
            raise ValueError(f"{source['path'].name}: ID pangkalan ganda")
        if len({row["registrationId"] for row in parsed}) != len(parsed):
            raise ValueError(f"{source['path'].name}: ID registrasi ganda")

        agent_master = [row for row in master if row.get("agentId") == source["agentId"] and not row.get("isDeleted")]
        registration_index = {str(row.get("registrationId")): row for row in agent_master if row.get("registrationId")}
        matched_ids = set()
        agent_records = []
        for parsed_row in parsed:
            target = registration_index.get(parsed_row["registrationId"])
            if not target:
                raise ValueError(
                    f"{source['agentId']}: registrasi {parsed_row['registrationId']} "
                    f"({parsed_row['reportPangkalanName']}) tidak ditemukan pada master"
                )
            if target["id"] in matched_ids:
                raise ValueError(f"Target master dipakai dua kali: {target['id']}")
            matched_ids.add(target["id"])
            total = sum(parsed_row["daily"])
            target.update({
                "pertaminaStationId": parsed_row["stationId"],
                "registrationId": parsed_row["registrationId"],
                "registrationVerificationStatus": "VERIFIED_IN_PERTAMINA_DISTRIBUTION_REPORT",
                "registrationVerificationSource": source["path"].name,
                "latestDistributionPeriod": "2026-10-01/2026-10-10",
                "latestDistributionNormal": total,
                "latestDistributionFacultative": 0,
                "latestDistributionTotal": total,
                "latestDistributionUnit": "tabung",
                "latestDistributionSource": source["path"].name,
                "dataVersion": VERSION,
            })
            record = {
                "period": "2026-10",
                "periodStart": "2026-10-01",
                "periodEnd": "2026-10-10",
                "unit": "tabung",
                "agentId": source["agentId"],
                "agentName": source["agentName"],
                "soldTo": source["soldTo"],
                "stationId": parsed_row["stationId"],
                "registrationId": parsed_row["registrationId"],
                "pangkalanId": target["id"],
                "pangkalanName": target["name"],
                "reportPangkalanName": parsed_row["reportPangkalanName"],
                "dailyDistribution": {
                    f"2026-10-{day:02d}": value for day, value in enumerate(parsed_row["daily"], 1)
                },
                "totalNormal": total,
                "totalFacultative": 0,
                "grandTotal": total,
                "sourceDocument": source["path"].name,
                "sourcePage": parsed_row["sourcePage"],
                "sourceLine": parsed_row["sourceLine"],
                "sourceStatus": "AGENT_REPORTED_PERTAMINA_SYSTEM",
                "attestation": "SYSTEM_EXPORT_UNSIGNED",
                "masterMatchStatus": "MATCHED_REGISTRATION_ID",
            }
            agent_records.append(record)
            output_records.append(record)

        agent_total = sum(row["grandTotal"] for row in agent_records)
        if agent_total != source["expectedTotal"]:
            raise ValueError(f"{source['path'].name}: total {agent_total}, seharusnya {source['expectedTotal']}")
        summaries.append({
            "agentId": source["agentId"],
            "agentName": source["agentName"],
            "soldTo": source["soldTo"],
            "pangkalanCount": len(agent_records),
            "masterMatchedCount": len(agent_records),
            "zeroDistributionCount": sum(row["grandTotal"] == 0 for row in agent_records),
            "grandTotal": agent_total,
            "unit": "tabung",
            "sourceDocument": source["path"].name,
        })
        agent = next(row for row in agents if row["id"] == source["agentId"])
        agent.update({
            "soldTo": source["soldTo"],
            "linkedPangkalanCount": len(agent_master),
            "reportedPangkalanCount": len(agent_records),
            "matchedReportedPangkalanCount": len(agent_records),
            "latestDistributionPeriod": "2026-10-01/2026-10-10",
            "latestDistributionTotal": agent_total,
            "distributionDataUnit": "tabung",
            "distributionDataSource": source["path"].name,
            "relationshipStatus": f"Seluruh {len(agent_records)} baris laporan Oktober cocok berdasarkan ID registrasi.",
        })
        import_results.append({"agentId": source["agentId"], "records": len(agent_records), "total": agent_total})

    daily_totals = {
        f"2026-10-{day:02d}": sum(row["dailyDistribution"].get(f"2026-10-{day:02d}", 0) for row in output_records)
        for day in range(1, 11)
    }
    grand_total = sum(daily_totals.values())
    matched = sum(bool(row.get("pangkalanId")) for row in output_records)
    unmatched = [row for row in output_records if not row.get("pangkalanId")]
    coordinate_available = sum(
        bool(next((x for x in master if x["id"] == row.get("pangkalanId")), {}).get("latitude"))
        for row in output_records if row.get("pangkalanId")
    )
    report = {
        "schemaVersion": 1,
        "period": "2026-10",
        "periodStart": "2026-10-01",
        "periodEnd": "2026-10-10",
        "unit": "tabung",
        "status": "agent-reported-partial-period",
        "generatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "coverage": {
            "reportedAgentCount": 3,
            "officialAgentCount": 9,
            "isCompleteRegencyCoverage": False,
            "isCompleteMonthlyPeriod": False,
            "warning": "Tiga dari sembilan agen telah tersedia; periode sumber berbeda (Agen 3444 sampai 8 Oktober, dua agen lain sampai 10 Oktober). Bukan total Kabupaten Pinrang.",
        },
        "recordCount": len(output_records),
        "totals": {
            "totalNormal": grand_total,
            "totalFacultative": 0,
            "grandTotal": grand_total,
            "kilograms": grand_total * 3,
            "metricTons": round(grand_total * 3 / 1000, 3),
        },
        "dataQuality": {
            "arithmeticValidatedRecordCount": len(output_records),
            "uniqueStationIdCount": len({row["stationId"] for row in output_records}),
            "uniqueRegistrationCount": len({row["registrationId"] for row in output_records}),
            "masterMatchedRecordCount": matched,
            "registrationMatchedRecordCount": matched,
            "unmatchedIdentityCount": len(unmatched),
            "duplicateRegistrationCount": len(output_records) - len({row["registrationId"] for row in output_records}),
            "coordinateAvailableCount": coordinate_available,
            "gpsFieldVerifiedCount": sum(bool(row.get("gpsVerified")) for row in master),
        },
        "dailyTotals": daily_totals,
        "summaries": sorted(summaries, key=lambda row: row["agentId"]),
        "unmatchedRecords": unmatched,
        "records": output_records,
        "audit": {
            "version": VERSION,
            "matchingRule": "Exact agentId + registrationId",
            "sourceDocumentCount": 3,
            "matchStatusCounts": dict(Counter(row["masterMatchStatus"] for row in output_records)),
        },
    }
    if grand_total != 52450 or daily_totals["2026-10-04"] != 0:
        raise ValueError("Rekap gabungan Oktober tidak cocok")

    OUTPUT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    MASTER_PATH.write_text(json.dumps(master, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    AGENTS_PATH.write_text(json.dumps(agents, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"imports": import_results, "combinedRecords": len(output_records), "matched": matched,
                      "unmatched": len(unmatched), "grandTotal": grand_total, "dailyTotals": daily_totals},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
