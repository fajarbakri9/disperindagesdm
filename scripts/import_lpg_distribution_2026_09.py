"""Impor laporan penyaluran LPG September 2026 secara deterministik.

Dataset sumber hanya mencakup tiga dari sembilan agen. Karena itu hasil impor
disimpan sebagai laporan parsial dan tidak digabungkan ke rekap kabupaten yang
lengkap sampai Juli 2026.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "Dokumen Pangkalan" / "Sepet"
MASTER_PATH = ROOT / "assets" / "data" / "lpg-pangkalan.json"
AGENTS_PATH = ROOT / "assets" / "data" / "lpg-agents.json"
OUTPUT = ROOT / "assets" / "data" / "lpg-distribution-2026-09.json"

REPORTS = (
    {
        "file": "Laporan Simol3k Sept 2026.pdf",
        "agentId": "AG-005",
        "agentName": "PT WAHYU DWI KENCANA MANDIRI",
        "soldTo": "1070992",
        "reportGeneratedAt": "2026-10-05T13:10:09+07:00",
        "attestation": "NAMED_AGENT_REPRESENTATIVE",
    },
    {
        "file": "Penyaluran Harian KABUPATEN PINRANG 2026-09 (1).pdf",
        "agentId": "AG-004",
        "agentName": "PT. NURCAHAYA ENERGI ABADI",
        "soldTo": "800914",
        "reportGeneratedAt": "2026-10-06T08:50:58+07:00",
        "attestation": "SYSTEM_REPORT_UNSIGNED",
    },
    {
        "file": "Penyaluran Harian KABUPATEN PINRANG 2026-09.pdf",
        "agentId": "AG-002",
        "agentName": "PT. HAMISA SUKRAH MULYA",
        "soldTo": "818234",
        "reportGeneratedAt": "2026-10-02T06:50:50+07:00",
        "attestation": "SYSTEM_REPORT_UNSIGNED",
    },
)


def parse_report(report: dict, master_by_registration: dict[str, dict]) -> list[dict]:
    path = DOCS / report["file"]
    records: list[dict] = []
    for page_number, page in enumerate(PdfReader(str(path)).pages, 1):
        for line in (page.extract_text(extraction_mode="layout") or "").splitlines():
            match = re.match(r"^\s*(791\d{12,13})\s+(.+)$", line)
            if not match:
                continue
            registration_id, remainder = match.groups()
            tokens = list(re.finditer(r"(?<![\w.])\d{1,3}(?:,\d{3})*(?![\w.])", remainder))
            if len(tokens) < 34:
                raise ValueError(f"Baris tabel tidak lengkap: {path.name} halaman {page_number}: {line}")
            selected = tokens[-34:]
            values = [int(token.group().replace(",", "")) for token in selected]
            allocation, daily = values[0], values[1:31]
            normal, facultative, grand_total = values[31:34]
            if sum(daily) != grand_total:
                raise ValueError(f"Total harian tidak cocok untuk {registration_id}")
            if normal + facultative != grand_total:
                raise ValueError(f"Normal + fakultatif tidak cocok untuk {registration_id}")
            master = master_by_registration.get(registration_id)
            if not master:
                raise ValueError(f"ID registrasi belum ada pada master: {registration_id}")
            report_name = remainder[: selected[0].start()].strip()
            records.append(
                {
                    "period": "2026-09",
                    "unit": "tabung",
                    "agentId": report["agentId"],
                    "agentName": report["agentName"],
                    "soldTo": report["soldTo"],
                    "registrationId": registration_id,
                    "pangkalanId": master["id"],
                    "pangkalanName": master["name"],
                    "reportPangkalanName": report_name,
                    "allocation": allocation,
                    "dailyDistribution": {
                        f"2026-09-{day:02d}": value for day, value in enumerate(daily, 1)
                    },
                    "totalNormal": normal,
                    "totalFacultative": facultative,
                    "grandTotal": grand_total,
                    "realizationPct": round(grand_total / allocation * 100, 2) if allocation else None,
                    "isAboveAllocation": grand_total > allocation,
                    "sourceDocument": report["file"],
                    "sourcePath": f'Dokumen Pangkalan/Sepet/{report["file"]}',
                    "sourcePage": page_number,
                    "sourceStatus": "AGENT_REPORTED_PERTAMINA_SYSTEM",
                    "attestation": report["attestation"],
                    "masterMatchStatus": "MATCHED_REGISTRATION_ID",
                }
            )
    return records


def main() -> None:
    master = json.loads(MASTER_PATH.read_text(encoding="utf-8"))
    agents = json.loads(AGENTS_PATH.read_text(encoding="utf-8"))
    district_corrections = {
        "Watang Sawito": "Watang Sawitto",
        "Matirro Sompe": "Mattiro Sompe",
    }
    for item in master:
        corrected = district_corrections.get(item.get("kecamatan"))
        if corrected:
            item.setdefault("kecamatanOriginal", item["kecamatan"])
            item["kecamatan"] = corrected
    master_by_registration = {
        str(item["registrationId"]): item for item in master if item.get("registrationId")
    }

    records: list[dict] = []
    for report in REPORTS:
        subset = parse_report(report, master_by_registration)
        if any(row["agentId"] != report["agentId"] for row in subset):
            raise ValueError(f"Agen tidak konsisten pada {report['file']}")
        records.extend(subset)

    expected_counts = {"AG-005": 49, "AG-004": 109, "AG-002": 65}
    actual_counts = Counter(row["agentId"] for row in records)
    if actual_counts != expected_counts:
        raise ValueError(f"Jumlah baris berubah: {actual_counts}")
    if len({row["registrationId"] for row in records}) != len(records):
        raise ValueError("Ada ID registrasi ganda antarlaporan")

    report_by_agent = {report["agentId"]: report for report in REPORTS}
    summaries = []
    for agent_id in expected_counts:
        subset = [row for row in records if row["agentId"] == agent_id]
        report = report_by_agent[agent_id]
        summaries.append(
            {
                "agentId": agent_id,
                "agentName": report["agentName"],
                "soldTo": report["soldTo"],
                "pangkalanCount": len(subset),
                "allocation": sum(row["allocation"] for row in subset),
                "totalNormal": sum(row["totalNormal"] for row in subset),
                "totalFacultative": sum(row["totalFacultative"] for row in subset),
                "grandTotal": sum(row["grandTotal"] for row in subset),
                "zeroDistributionCount": sum(row["grandTotal"] == 0 for row in subset),
                "aboveAllocationCount": sum(row["isAboveAllocation"] for row in subset),
                "sourceDocument": report["file"],
                "reportGeneratedAt": report["reportGeneratedAt"],
                "attestation": report["attestation"],
                "unit": "tabung",
            }
        )

    daily_totals = {
        f"2026-09-{day:02d}": sum(
            row["dailyDistribution"][f"2026-09-{day:02d}"] for row in records
        )
        for day in range(1, 31)
    }
    selected_master = [master_by_registration[row["registrationId"]] for row in records]
    coordinate_available = sum(
        isinstance(item.get("latitude"), (int, float))
        and isinstance(item.get("longitude"), (int, float))
        for item in selected_master
    )
    payload = {
        "schemaVersion": 1,
        "period": "2026-09",
        "unit": "tabung",
        "status": "agent-reported-partial",
        "coverage": {
            "reportedAgentCount": len(REPORTS),
            "officialAgentCount": len([a for a in agents if not a.get("isDeleted")]),
            "isCompleteRegencyCoverage": False,
            "warning": "Hanya mencakup tiga agen; tidak boleh disebut total Kabupaten Pinrang.",
        },
        "generatedAt": "2026-10-07T00:00:00+08:00",
        "recordCount": len(records),
        "totals": {
            "allocation": sum(row["allocation"] for row in records),
            "totalNormal": sum(row["totalNormal"] for row in records),
            "totalFacultative": sum(row["totalFacultative"] for row in records),
            "grandTotal": sum(row["grandTotal"] for row in records),
            "kilograms": sum(row["grandTotal"] for row in records) * 3,
            "metricTons": round(sum(row["grandTotal"] for row in records) * 3 / 1000, 3),
        },
        "dataQuality": {
            "arithmeticValidatedRecordCount": len(records),
            "registrationMatchedRecordCount": len(records),
            "duplicateRegistrationCount": 0,
            "coordinateAvailableCount": coordinate_available,
            "documentCoordinateCount": sum(
                item.get("pointType") == "DOCUMENT_COORDINATE" for item in selected_master
            ),
            "administrativeFallbackCount": sum(
                item.get("pointType") == "ADMIN_FALLBACK" for item in selected_master
            ),
            "unmappedCount": sum(item.get("pointType") == "UNMAPPED" for item in selected_master),
            "gpsFieldVerifiedCount": sum(item.get("gpsVerified") is True for item in selected_master),
        },
        "dailyTotals": daily_totals,
        "summaries": summaries,
        "records": records,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    by_registration = {row["registrationId"]: row for row in records}
    for item in master:
        row = by_registration.get(str(item.get("registrationId")))
        if not row:
            continue
        item.update(
            {
                "monthlyAllocation": row["allocation"],
                "allocationUnit": "tabung",
                "latestDistributionPeriod": "2026-09",
                "latestDistributionNormal": row["totalNormal"],
                "latestDistributionFacultative": row["totalFacultative"],
                "latestDistributionTotal": row["grandTotal"],
                "latestDistributionUnit": "tabung",
                "latestDistributionSource": row["sourceDocument"],
            }
        )
    MASTER_PATH.write_text(json.dumps(master, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary_by_agent = {item["agentId"]: item for item in summaries}
    for agent in agents:
        summary = summary_by_agent.get(agent.get("id"))
        if not summary:
            continue
        agent.update(
            {
                "soldTo": summary["soldTo"],
                "latestDistributionPeriod": "2026-09",
                "latestDistributionTotal": summary["grandTotal"],
                "latestDistributionNormal": summary["totalNormal"],
                "latestDistributionFacultative": summary["totalFacultative"],
                "distributionDataUnit": "tabung",
                "distributionDataSource": summary["sourceDocument"],
                "relationshipStatus": "Terhubung ke master pangkalan dan laporan penyaluran September 2026",
            }
        )
    AGENTS_PATH.write_text(json.dumps(agents, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({"records": len(records), "summaries": summaries, "totals": payload["totals"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
