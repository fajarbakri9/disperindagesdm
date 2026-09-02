"""Apply researched coordinates and provenance to the canonical market fallback."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "assets" / "data" / "markets.json"

PATCHES = {
    "pasar-marawi": {
        "latitude": -3.8166921,
        "longitude": 119.7233924,
        "plusCode": "6P8X5PMF+89",
        "metodeKoordinat": "GOOGLE_MAPS_LISTING_AND_PLUS_CODE",
        "statusKoordinat": "Titik listing Google Maps; berada di Desa Marawi — perlu konfirmasi GPS pintu masuk",
        "coordinateConfidence": "tinggi-digital",
        "coordinateSources": ["Google Maps listing Pasar Marawi", "Plus Code 6P8X5PMF+89", "Overlay batas indikatif BIG"],
        "jadwalGoogleMaps": "Rabu / Sabtu 05:00–13:00",
        "hariPasar": ["Rabu", "Sabtu"],
        "alamat": "Jl. Poros Pinrang–Rappang KM 9, Marawi, Kec. Tiroang, Kabupaten Pinrang",
    },
    "pasar-suppa": {
        "latitude": -3.9639013,
        "longitude": 119.6046165,
        "desaKelurahan": "Watang Suppa",
        "metodeKoordinat": "GOOGLE_MAPS_LISTING",
        "statusKoordinat": "Titik listing Google Maps; berada di Watang Suppa — perlu konfirmasi GPS pintu masuk",
        "coordinateConfidence": "menengah-digital",
        "coordinateSources": ["Google Maps search Pasar Rakyat Suppa", "Overlay batas indikatif BIG"],
        "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=Pasar+Rakyat+Suppa+Pinrang",
        "alamat": "Watang Suppa, Kec. Suppa, Kabupaten Pinrang",
    },
    "pasar-tuppu": {
        "latitude": -3.5449458,
        "longitude": 119.5297239,
        "desaKelurahan": "Tadokkong / Tuppu",
        "metodeKoordinat": "GOOGLE_MAPS_AND_DOCUMENT_CROSSCHECK",
        "statusKoordinat": "Terverifikasi silang digital; berada di Desa Tadokkong — konfirmasi GPS pintu masuk tetap disarankan",
        "coordinateConfidence": "tinggi-digital",
        "coordinateSources": ["Google Maps listing Pasar Tradisional Tuppu", "Dokumen pemetaan TPS Pinrang", "Overlay batas indikatif BIG"],
    },
}

items = json.loads(JSON_PATH.read_text(encoding="utf-8"))
for item in items:
    item["dataVersion"] = "2026-08-31-market-single-source-v3"
    item["boundaryReference"] = "BIG/Batas Administrasi — batas desa/kelurahan bersifat indikatif"
    if item["id"] in PATCHES:
        item.update(PATCHES[item["id"]])

payload = json.dumps(items, ensure_ascii=False, indent=2)
JSON_PATH.write_text(payload + "\n", encoding="utf-8")
(ROOT / "js" / "markets-data.js").write_text(
    "// FALLBACK SNAPSHOT — sumber utama runtime: Firestore collection markets\n"
    "const PINRANG_ALL_MARKETS = " + payload + ";\n\n"
    'if (typeof window !== "undefined") window.PINRANG_ALL_MARKETS = PINRANG_ALL_MARKETS;\n',
    encoding="utf-8",
)
print(f"Enriched {len(items)} markets; patched {len(PATCHES)} researched records.")
