"""Bangun data konsolidasi kuota dan penyaluran LPG 3 kg Pinrang 2026.

Hanya data yang tercantum pada dua dokumen lokal di Dokumen Pangkalan/Baru
yang dimasukkan. Total bulanan Juni dan Juli dihitung ulang dari baris agen
karena baris total cetak tidak memasukkan PT Kiano Energi Utama.
"""
from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "data" / "lpg-quota-distribution-2026.json"

QUOTA_SOURCE = "DATA KUOTA LPG 3 KG KAB. PINRANG TAHUN 2026 (2).pdf"
DISTRIBUTION_SOURCE = "DATA PENYALURAN LPG 3 KG BULAN JULI 2026 (1).pdf"
MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]

AGENTS = [
    ("AG-003", "PT. H. ABD RAHMAN HASYIM", [80080, 71680, 80080, 74480, 73920, 78960, 80640]),
    ("AG-006", "PT. NASMAN HAFID MANDIRI", [54320, 49280, 55440, 51520, 49280, 54880, 54880]),
    ("AG-001", "PT. GASIFA MULYA PERSADA", [56000, 50760, 57320, 53200, 51520, 56560, 55950]),
    ("AG-004", "PT. NURCAHAYA ENERGI ABADI", [51520, 47600, 51520, 48720, 48160, 51520, 52080]),
    # Nama master mengikuti daftar penyalur resmi; PDF rekap menulis "SUKRIAH".
    ("AG-002", "PT. HAMISA SUKRAH MULYA", [45360, 41440, 45920, 42560, 42560, 45920, 45920]),
    ("AG-007", "PT. H. AMIRUDDIN RAHMAN", [39200, 47600, 51520, 48720, 49280, 40880, 40320]),
    ("AG-008", "PT. KAKA MIGAS UTAMA", [16800, 16240, 17360, 16800, 17360, 17920, 17920]),
    ("AG-005", "PT WAHYU DWI KENCANA MANDIRI", [11720, 11520, 12400, 11760, 12320, 12880, 11920]),
    ("AG-009", "PT Kiano Energi Utama", [0, 0, 0, 0, 0, 3960, 9720]),
]

PRINTED_MONTHLY_TOTALS = [355000, 336120, 371560, 347760, 344400, 359520, 359630]
PRINTED_GRAND_TOTAL = 2487670


def main() -> None:
    agent_summaries = []
    for agent_id, name, values in AGENTS:
        assert len(values) == len(MONTHS)
        agent_summaries.append({
            "agentId": agent_id,
            "agentName": name,
            "sourceName": "PT. HAMISA SUKRIAH MULYA" if agent_id == "AG-002" else name,
            "monthlyDistribution": dict(zip(MONTHS, values)),
            "total": sum(values),
            "unit": "tabung",
        })

    corrected_monthly = [sum(values[i] for _, _, values in AGENTS) for i in range(len(MONTHS))]
    corrected_grand = sum(corrected_monthly)
    assert corrected_grand == PRINTED_GRAND_TOTAL
    assert sum(item["total"] for item in agent_summaries) == corrected_grand

    corrections = []
    for month, printed, corrected in zip(MONTHS, PRINTED_MONTHLY_TOTALS, corrected_monthly):
        if printed != corrected:
            corrections.append({
                "period": month,
                "printedTotal": printed,
                "correctedTotal": corrected,
                "difference": corrected - printed,
                "reason": "Baris total cetak tidak memasukkan penyaluran PT Kiano Energi Utama.",
            })
    assert corrections == [
        {"period": "2026-06", "printedTotal": 359520, "correctedTotal": 363480, "difference": 3960,
         "reason": "Baris total cetak tidak memasukkan penyaluran PT Kiano Energi Utama."},
        {"period": "2026-07", "printedTotal": 359630, "correctedTotal": 369350, "difference": 9720,
         "reason": "Baris total cetak tidak memasukkan penyaluran PT Kiano Energi Utama."},
    ]

    quota_mt = 11692
    quota_kg = quota_mt * 1000
    realized_kg = corrected_grand * 3
    payload = {
        "schemaVersion": 1,
        "year": 2026,
        "region": "KABUPATEN PINRANG",
        "product": "LPG TABUNG 3 KG",
        "status": "verified-local-documents-with-corrections",
        "annualQuota": {
            "value": quota_mt,
            "unit": "MT",
            "kilograms": quota_kg,
            "equivalentCylinderCountApprox": round(quota_kg / 3, 6),
            "wholeCylinderEquivalent": quota_kg // 3,
            "conversionRemainderKg": quota_kg % 3,
            "sourceDocument": QUOTA_SOURCE,
            "sourceReference": "Lampiran 2 Nomor B-113/MG.05/DJM/2026 tanggal 6 Januari 2026, baris Kabupaten Pinrang",
        },
        "distribution": {
            "coveredPeriodStart": "2026-01-01",
            "coveredPeriodEnd": "2026-07-31",
            "coverageStatus": "complete-for-nine-listed-agents",
            "unit": "tabung",
            "agents": agent_summaries,
            "printedMonthlyTotals": dict(zip(MONTHS, PRINTED_MONTHLY_TOTALS)),
            "correctedMonthlyTotals": dict(zip(MONTHS, corrected_monthly)),
            "printedGrandTotal": PRINTED_GRAND_TOTAL,
            "correctedGrandTotal": corrected_grand,
            "sourceDocument": DISTRIBUTION_SOURCE,
            "corrections": corrections,
        },
        "derived": {
            "distributedKilograms": realized_kg,
            "distributedMT": realized_kg / 1000,
            "quotaRealizationPct": round(realized_kg / quota_kg * 100, 6),
            "remainingQuotaMT": round((quota_kg - realized_kg) / 1000, 3),
        },
        "excludedData": [
            "Angka media 13.683 tabung per hari tidak dimasukkan karena tidak memiliki rincian transaksi lokal.",
            "Tambahan 18.480 tabung tidak dimasukkan karena tidak terdapat dokumen penyaluran rinci di folder sumber.",
            "Usulan 5.040 tabung tidak dihitung sebagai realisasi karena statusnya masih usulan.",
            "Data Agustus tidak digabung karena hanya tersedia untuk tiga agen dan disimpan pada dataset terpisah.",
        ],
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
