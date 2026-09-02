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
import re
import argparse
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SP2KP_API_URL = "https://api-sp2kp.kemendag.go.id/report/api/average-price/generate-perbandingan-harga"
PROVINCE_CODE = "73"       # Sulawesi Selatan
REGENCY_CODE = "7315"      # Kabupaten Pinrang
REGENCY_NAME = "Kabupaten Pinrang"
PROVINCE_NAME = "Sulawesi Selatan"
FIREBASE_PROJECT_ID = "disperindagesdm-pinrang"


def get_firebase_api_key() -> str:
    """Mendapatkan API Key Firebase dari env atau js/firebase-config.js"""
    key = os.environ.get("FIREBASE_API_KEY")
    if key and key != "YOUR_FIREBASE_API_KEY":
        return key

    cfg_file = ROOT_DIR / "js" / "firebase-config.js"
    if cfg_file.is_file():
        cfg_text = cfg_file.read_text(encoding="utf-8")
        m = re.search(r'apiKey:\s*["\']([^"\']+)["\']', cfg_text)
        if m and m.group(1) != "YOUR_FIREBASE_API_KEY":
            return m.group(1)
            
    return ""


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


def fetch_latest_valid_sp2kp_dataset(start_date: datetime = None, max_fallback_days: int = 7) -> tuple[dict, str, str]:
    """
    Smart Historical Fallback:
    Mencari dataset valid dengan minimal 1 harga aktif (> 0), mundur hingga max_fallback_days.
    Mengembalikan (parsed_json, actual_data_date_str, comparison_date_str).
    """
    if not start_date:
        start_date = datetime.now()

    last_raw = None
    last_t_str = ""
    last_c_str = ""

    for d in range(max_fallback_days + 1):
        cur_date = start_date - timedelta(days=d)
        comp_date = cur_date - timedelta(days=1)
        t_str = cur_date.strftime("%Y-%m-%d")
        c_str = comp_date.strftime("%Y-%m-%d")

        print(f"[*] Mencoba sinkronisasi SP2KP tanggal: {t_str} (pembanding: {c_str})...")
        try:
            raw = fetch_sp2kp_raw(t_str, c_str)
            last_raw = raw
            last_t_str = t_str
            last_c_str = c_str

            items = raw.get("data", [])
            active_items = [it for it in items if it.get("harga", 0) and it.get("harga", 0) > 0]

            if len(active_items) > 0:
                print(f"[+] Ditemukan {len(active_items)} komoditas aktif pada tanggal {t_str}!")
                return raw, t_str, c_str
            else:
                print(f"[-] Data tanggal {t_str} belum closing/kosong (0 komoditas aktif). Mundur H-1...")
        except Exception as e:
            print(f"[!] Gagal mengambil data tanggal {t_str}: {e}")

    if last_raw:
        print(f"[!] Peringatan: Tidak ditemukan data aktif dalam {max_fallback_days} hari terakhir. Menggunakan response tanggal {last_t_str}.")
        return last_raw, last_t_str, last_c_str

    raise RuntimeError("Gagal terhubung ke SP2KP Kemendag setelah beberapa kali percobaan.")


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


def firestore_rest_set_doc(collection: str, doc_id: str, data: dict, api_key: str) -> bool:
    """Menulis dokumen ke Firestore via REST API resmi Firebase"""
    url = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents/{collection}/{doc_id}?key={api_key}"

    # Konversi dictionary Python ke Firestore REST fields schema
    def to_firestore_value(val):
        if val is None:
            return {"nullValue": None}
        elif isinstance(val, bool):
            return {"booleanValue": val}
        elif isinstance(val, int):
            return {"integerValue": str(val)}
        elif isinstance(val, float):
            return {"doubleValue": val}
        elif isinstance(val, str):
            return {"stringValue": val}
        elif isinstance(val, list):
            return {"arrayValue": {"values": [to_firestore_value(x) for x in val]}}
        elif isinstance(val, dict):
            return {"mapValue": {"fields": {k: to_firestore_value(v) for k, v in val.items()}}}
        return {"stringValue": str(val)}

    fields = {k: to_firestore_value(v) for k, v in data.items()}
    body = json.dumps({"fields": fields}).encode("utf-8")

    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="PATCH")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        print(f"[!] Gagal menulis ke Firestore ({collection}/{doc_id}): {e}")
        return False


def run_sync(mode: str = "pilot", target_date_str: str = None) -> int:
    """
    Eksekutor Sinkronisasi Utama:
    mode: 'dry-run', 'pilot', atau 'live'
    """
    print("=" * 65)
    print(f"  SINKRONISASI HARGA BAPOK SP2KP KEMENDAG -> DISPERINDAG PINRANG")
    print(f"  Mode: {mode.upper()} | Waktu Eksekusi: {datetime.now().strftime('%Y-%m-%d %H:%M:%S WITA')}")
    print("=" * 65)

    api_key = get_firebase_api_key()
    if mode in ("pilot", "live") and not api_key:
        print("[!] Error: FIREBASE_API_KEY wajib tersedia untuk mode pilot/live!")
        return 1

    start_date = datetime.strptime(target_date_str, "%Y-%m-%d") if target_date_str else datetime.now()

    try:
        raw_json, actual_date, comp_date = fetch_latest_valid_sp2kp_dataset(start_date)
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

    # Tentukan koleksi target sesuai mode
    if mode == "pilot":
        print(f"\n[*] Menulis {len(records)} record ke koleksi sandbox Firestore 'sp2kp_pilot'...")
        success_count = 0
        for r in records:
            doc_id = str(r["variantId"])
            if firestore_rest_set_doc("sp2kp_pilot", doc_id, r, api_key):
                success_count += 1
        print(f"[+] Berhasil menyimpan {success_count}/{len(records)} dokumen ke 'sp2kp_pilot'!")

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
        firestore_rest_set_doc("sp2kp_sync_snapshots", actual_date, snapshot_doc, api_key)

        # 2. Simpan Latest & History
        success_latest = 0
        success_hist = 0
        for r in records:
            v_id = str(r["variantId"])
            hist_id = f"{v_id}_{actual_date}"

            if firestore_rest_set_doc("market_prices_latest", v_id, r, api_key):
                success_latest += 1
            if firestore_rest_set_doc("market_prices_history", hist_id, r, api_key):
                success_hist += 1

        print(f"[+] Berhasil update {success_latest} dokumen 'market_prices_latest'.")
        print(f"[+] Berhasil arsipkan {success_hist} dokumen 'market_prices_history'.")
        print(f"[+] Snapshot audit {actual_date} tersimpan di 'sp2kp_sync_snapshots'.")

    return 0


def main():
    parser = argparse.ArgumentParser(description="Sync Service Harga Bapok SP2KP Kemendag -> Disperindag Pinrang")
    parser.add_argument("--dry-run", action="store_true", help="Uji coba fetch tanpa menulis ke Firestore")
    parser.add_argument("--pilot", action="store_true", help="Tulis ke koleksi uji coba sp2kp_pilot")
    parser.add_argument("--live", action="store_true", help="Tulis ke koleksi produksi market_prices_latest & history")
    parser.add_argument("--date", type=str, help="Tanggal target YYYY-MM-DD (opsional)")

    args = parser.parse_args()

    mode = "pilot"
    if args.dry_run:
        mode = "dry-run"
    elif args.live:
        mode = "live"
    elif args.pilot:
        mode = "pilot"

    sys.exit(run_sync(mode=mode, target_date_str=args.date))


if __name__ == "__main__":
    main()
