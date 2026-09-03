"""
SYNC SERVICE HARGA BAHAN POKOK SP2KP KEMENDAG -> DISPERINDAG ESDM PINRANG
Sumber Resmi: SP2KP Kementerian Perdagangan RI (Kabupaten Pinrang, Kode 7315)
Target Koleksi:
  - sp2kp_sync_snapshots/     : Raw audit snapshot per tanggal
  - market_prices_latest/     : Dokumen aktif per variantId untuk Website & Command Center
  - market_prices_history/    : Arsip historis harian per variantId_tanggal
  - sp2kp_pilot/              : Sandbox collection untuk pengujian & validasi
"""

import os
import sys
import json
import argparse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

import firebase_admin
from firebase_admin import firestore

ROOT_DIR = Path(__file__).resolve().parent.parent
SP2KP_API_URL = "https://api-sp2kp.kemendag.go.id/report/api/average-price/generate-perbandingan-harga"
PROVINCE_CODE = "73"       # Sulawesi Selatan
REGENCY_CODE = "7315"      # Kabupaten Pinrang
REGENCY_NAME = "Kabupaten Pinrang"
PROVINCE_NAME = "Sulawesi Selatan"
FIREBASE_PROJECT_ID = "disperindagesdm-pinrang"


def create_firestore_client():
    """Gunakan ADC/WIF; jangan pernah memakai API key browser untuk menulis."""
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", FIREBASE_PROJECT_ID)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={"projectId": project_id})
    return firestore.client()


def fetch_sp2kp_raw(target_date_str: str, comparison_date_str: str, timeout: int = 20) -> dict:
    """Melakukan HTTP POST multipart/form-data ke endpoint resmi SP2KP Kemendag"""
    boundary = f"----DisperindagPinrangBoundary{datetime.now().strftime('%Y%m%d%H%M%S')}"
    fields = {
        "tanggal": target_date_str,
        "tanggal_pembanding": comparison_date_str,
        "kode_provinsi": PROVINCE_CODE,
        "kode_kab_kota": REGENCY_CODE
    }

    body_lines = []
    for k, v in fields.items():
        body_lines.append(f"--{boundary}")
        body_lines.append(f'Content-Disposition: form-data; name="{k}"')
        body_lines.append("")
        body_lines.append(str(v))
    body_lines.append(f"--{boundary}--")
    body_lines.append("")

    body_bytes = "\r\n".join(body_lines).encode("utf-8")
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "User-Agent": "DisperindagPinrangSync/1.0 (Kabupaten Pinrang Portal Resmi)"
    }

    req = urllib.request.Request(SP2KP_API_URL, data=body_bytes, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        if resp.status != 200:
            raise RuntimeError(f"HTTP Error dari SP2KP Kemendag: status {resp.status}")
        raw_text = resp.read().decode("utf-8")
        return json.loads(raw_text)


def fetch_current_sp2kp_dataset(start_date: datetime = None) -> tuple[dict, str, str]:
    """Ambil tepat tanggal target dan gagal tertutup jika data belum tersedia."""
    if not start_date:
        start_date = datetime.now()
    comparison_date = start_date - timedelta(days=1)
    target = start_date.strftime("%Y-%m-%d")
    comparison = comparison_date.strftime("%Y-%m-%d")
    print(f"[*] Mengambil SP2KP tanggal: {target} (pembanding: {comparison})...")
    raw = fetch_sp2kp_raw(target, comparison)
    items = raw.get("data", [])
    active_items = [item for item in items if isinstance(item.get("harga"), (int, float)) and item["harga"] > 0]
    if not active_items:
        raise RuntimeError(
            f"SP2KP tanggal {target} belum memiliki harga aktif; data Firestore terakhir dipertahankan tanpa fallback."
        )
    print(f"[+] Ditemukan {len(active_items)} komoditas aktif pada tanggal {target}.")
    return raw, target, comparison


def normalize_sp2kp_records(raw_data: dict, data_date_str: str, comp_date_str: str) -> list[dict]:
    """
    Menormalkan response SP2KP menjadi struktur data standar Disperindag Pinrang:
    - variantId, commodityName, unit
    - sourcePrice, comparisonPrice, delta, changePercent, changeStatus
    - status ('SYNCED' jika harga > 0, 'DATA_UNAVAILABLE' jika harga == 0)
    - source & provenance metadata
    """
    raw_items = raw_data.get("data", [])
    now_iso = datetime.now().isoformat()
    normalized = []

    for item in raw_items:
        variant_id = int(item.get("variant_id", 0))
        variant_name = str(item.get("variant_nama", "")).strip()
        unit = str(item.get("satuan_display", "kg")).strip().lower()

        raw_price = item.get("harga")
        raw_comp_price = item.get("harga_pembanding")

        has_valid_price = isinstance(raw_price, (int, float)) and raw_price > 0
        has_valid_comp = isinstance(raw_comp_price, (int, float)) and raw_comp_price > 0

        source_price = float(raw_price) if has_valid_price else 0.0
        comp_price = float(raw_comp_price) if has_valid_comp else 0.0
        delta = float(item.get("delta_harga", 0.0))
        change_pct = float(item.get("persen_perubahan", 0.0))
        change_status = str(item.get("status_perubahan", "Tidak Berubah")).strip()

        status = "SYNCED" if has_valid_price else "DATA_UNAVAILABLE"

        doc = {
            "variantId": variant_id,
            "commodityName": variant_name,
            "unit": unit,
            "provinceCode": PROVINCE_CODE,
            "provinceName": PROVINCE_NAME,
            "regencyCode": REGENCY_CODE,
            "regencyName": REGENCY_NAME,
            "dataDate": data_date_str,
            "comparisonDate": comp_date_str,
            "sourcePrice": source_price,
            "displayPrice": source_price,
            "comparisonPrice": comp_price,
            "delta": delta,
            "changePercent": change_pct,
            "changeStatus": change_status,
            "status": status,
            "priceSource": "SP2KP",
            "sourceName": "SP2KP Kementerian Perdagangan RI",
            "syncedAt": now_iso
        }
        normalized.append(doc)

    return normalized


def commit_documents(db, documents: list[tuple[str, str, dict]]) -> None:
    """Commit seluruh hasil sebagai satu unit; kegagalan apa pun membatalkan run."""
    if not documents:
        raise RuntimeError("Tidak ada dokumen SP2KP yang valid untuk ditulis.")
    if len(documents) > 500:
        raise RuntimeError(f"Jumlah write {len(documents)} melebihi batas batch Firestore 500.")
    batch = db.batch()
    for collection, doc_id, data in documents:
        batch.set(db.collection(collection).document(doc_id), data)
    batch.commit()


def run_sync(mode: str = "dry-run", target_date_str: str = None) -> int:
    """
    Eksekutor Sinkronisasi Utama:
    mode: 'dry-run', 'pilot', atau 'live'
    """
    print("=" * 65)
    print(f"  SINKRONISASI HARGA BAPOK SP2KP KEMENDAG -> DISPERINDAG PINRANG")
    print(f"  Mode: {mode.upper()} | Waktu Eksekusi: {datetime.now().strftime('%Y-%m-%d %H:%M:%S WITA')}")
    print("=" * 65)

    start_date = datetime.strptime(target_date_str, "%Y-%m-%d") if target_date_str else datetime.now()

    try:
        raw_json, actual_date, comp_date = fetch_current_sp2kp_dataset(start_date)
    except Exception as e:
        print(f"[!] Kegagalan fatal saat menghubungi SP2KP: {e}")
        return 1

    records = normalize_sp2kp_records(raw_json, actual_date, comp_date)
    print(f"[+] Berhasil menormalkan {len(records)} record komoditas SP2KP.")

    # Ringkasan di console
    print("\n--- RINGKASAN DATA HARGA BAPOK SP2KP KABUPATEN PINRANG ---")
    print(f"Tanggal Data Faktual: {actual_date} (Pembanding: {comp_date})")
    print("-" * 65)
    for r in records:
        price_str = f"Rp {r['sourcePrice']:,.0f}/{r['unit']}" if r['status'] == 'SYNCED' else "DATA BELUM TERSEDIA"
        delta_str = f"({r['changeStatus']}, {r['changePercent']}%)"
        print(f"[{r['variantId']:2d}] {r['commodityName']:<35} : {price_str:<22} {delta_str}")
    print("-" * 65)

    if mode == "dry-run":
        print("[*] Mode DRY-RUN selesai. Tidak ada data yang ditulis ke Firestore.")
        return 0

    try:
        db = create_firestore_client()
    except Exception as e:
        print(f"[!] Kredensial ADC/WIF Firestore tidak tersedia: {e}")
        return 1

    # Tentukan koleksi target sesuai mode
    if mode == "pilot":
        print(f"\n[*] Menulis {len(records)} record ke koleksi sandbox Firestore 'sp2kp_pilot'...")
        writes = [("sp2kp_pilot", str(record["variantId"]), record) for record in records]
        try:
            commit_documents(db, writes)
        except Exception as e:
            print(f"[!] Commit pilot dibatalkan/gagal: {e}")
            return 1
        print(f"[+] Berhasil menyimpan {len(writes)} dokumen ke 'sp2kp_pilot'.")

    elif mode == "live":
        print(f"\n[*] Mode LIVE: Menulis ke 'market_prices_latest', 'market_prices_history', dan 'sp2kp_sync_snapshots'...")
        
        # 1. Simpan Snapshot Audit Mentah
        snapshot_doc = {
            "dataDate": actual_date,
            "comparisonDate": comp_date,
            "totalItems": len(records),
            "activeItems": len([r for r in records if r["status"] == "SYNCED"]),
            "syncedAt": datetime.now().isoformat(),
            "rawJson": json.dumps(raw_json)
        }
        if len(snapshot_doc["rawJson"].encode("utf-8")) > 900_000:
            print("[!] Snapshot mentah melebihi batas aman 900 KB; tidak ada data yang ditulis.")
            return 1

        # 2. Simpan Latest & History dalam batch atomik yang sama.
        writes = [("sp2kp_sync_snapshots", actual_date, snapshot_doc)]
        for r in records:
            v_id = str(r["variantId"])
            hist_id = f"{v_id}_{actual_date}"
            writes.append(("market_prices_latest", v_id, r))
            writes.append(("market_prices_history", hist_id, r))
        try:
            commit_documents(db, writes)
        except Exception as e:
            print(f"[!] Commit live dibatalkan/gagal; data sebelumnya tetap utuh: {e}")
            return 1

        print(f"[+] Commit atomik berhasil: {len(records)} latest, {len(records)} history, 1 snapshot.")

    return 0


def main():
    parser = argparse.ArgumentParser(description="Sync Service Harga Bapok SP2KP Kemendag -> Disperindag Pinrang")
    parser.add_argument("--dry-run", action="store_true", help="Uji coba fetch tanpa menulis ke Firestore")
    parser.add_argument("--pilot", action="store_true", help="Tulis ke koleksi uji coba sp2kp_pilot")
    parser.add_argument("--live", action="store_true", help="Tulis ke koleksi produksi market_prices_latest & history")
    parser.add_argument("--date", type=str, help="Tanggal target YYYY-MM-DD (opsional)")

    args = parser.parse_args()

    mode = "dry-run"
    if args.dry_run:
        mode = "dry-run"
    elif args.live:
        mode = "live"
    elif args.pilot:
        mode = "pilot"

    sys.exit(run_sync(mode=mode, target_date_str=args.date))


if __name__ == "__main__":
    main()
