from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FINAL_DIST = ROOT / "dist"
DIST = ROOT / "dist.__staging"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
EXCLUDED_NAMES = {
    ".git", ".firebase", ".pytest_cache", "__pycache__", "dist",
    "dist.local-preview", "dist.__staging", "dist.__previous", "engine",
    "docs", "scripts", "backup", "node_modules", "dokumen.html", "intel",
    "services-project",
    "Dokumen Pangkalan", "scratch",
    "E-SKPT E-PASAR", "EPASAR_SATU_DATA_DEVELOPER_PACK_V1",
    "ARAHAN_DEVELOPER_DISPERINDAG_ESDM_PINRANG_V2_LAYANAN_ONLINE_2026-09-03",
}
EXCLUDED_SUFFIXES = {".md", ".py", ".bat", ".cmd", ".sh", ".docx", ".xlsx", ".log"}
GENERATED_PATHS = {"berita", "pasar", "direktori-lpg", "penyalur-bbm", "sitemap.xml"}


def copy_site_sources() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    for source in ROOT.iterdir():
        if source.name in EXCLUDED_NAMES or source.name in GENERATED_PATHS or ".backup" in source.name:
            continue
        if source.is_file() and source.suffix.lower() in EXCLUDED_SUFFIXES:
            continue
        target = DIST / source.name
        if source.is_dir():
            shutil.copytree(source, target)
        else:
            shutil.copy2(source, target)


def run_generator(script: str, *arguments: str) -> None:
    command = [sys.executable, str(ROOT / script), *arguments]
    result = subprocess.run(command, cwd=DIST, check=False)
    if result.returncode:
        raise SystemExit(result.returncode)


def validate() -> None:
    required = [
        DIST / "index.html", DIST / "firebase.json", DIST / "direktori-lpg.html",
        DIST / "penyalur-bbm.html", DIST / "pasar.html", DIST / "peta-gis.html",
        DIST / "harga-bahan-pokok.html", DIST / "js" / "public-navigation.js",
        DIST / "js" / "lpg-engine.js", DIST / "js" / "bbm-engine.js",
        DIST / "js" / "e-skpt-market-engine.js",
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.is_file()]
    if missing:
        raise RuntimeError(f"Output build tidak lengkap: {', '.join(missing)}")
    if not (DIST / "berita").is_dir():
        raise RuntimeError("Output generator berita tidak ditemukan")
    if (DIST / "pasar").exists():
        raise RuntimeError("Halaman detail pasar lama tidak boleh masuk build setelah migrasi e-SKPT")
    forbidden = [DIST / "dokumen.html", DIST / "direktori-lpg" / "index.html", DIST / "penyalur-bbm" / "index.html"]
    present = [str(path.relative_to(DIST)) for path in forbidden if path.exists()]
    if present:
        raise RuntimeError(f"Halaman lama/cermin tidak boleh dipublikasikan: {', '.join(present)}")
    private_paths = [
        DIST / "services-project", DIST / "engine", DIST / "docs", DIST / "scripts",
        DIST / "Dokumen Pangkalan", DIST / "scratch",
    ]
    leaked = [str(path.relative_to(DIST)) for path in private_paths if path.exists()]
    if leaked:
        raise RuntimeError(f"Artefak internal tidak boleh masuk build publik: {', '.join(leaked)}")
    nested_builds = [DIST / "dist", DIST / "dist.local-preview", DIST / "dist.__staging", DIST / "dist.__previous"]
    nested = [str(path.relative_to(DIST)) for path in nested_builds if path.exists()]
    if nested:
        raise RuntimeError(f"Artefak build bersarang tidak boleh dipublikasikan: {', '.join(nested)}")


def main() -> None:
    if "FIREBASE_API_KEY" not in os.environ and (ROOT / "js" / "firebase-config.js").is_file():
        import re
        cfg_text = (ROOT / "js" / "firebase-config.js").read_text(encoding="utf-8")
        key_match = re.search(r'apiKey:\s*["\']([^"\']+)["\']', cfg_text)
        if key_match and key_match.group(1) != "YOUR_FIREBASE_API_KEY":
            os.environ["FIREBASE_API_KEY"] = key_match.group(1)

    if "FIREBASE_API_KEY" not in os.environ:
        raise RuntimeError("FIREBASE_API_KEY wajib tersedia untuk build produksi")
    copy_site_sources()
    # Rilis produksi harus mengambil daftar berita persis dari Firestore.
    # Pengembang yang benar-benar membutuhkan build offline wajib memilih
    # BUILD_NEWS_SOURCE=local secara eksplisit agar seed tidak terdeploy tanpa sadar.
    news_source = os.environ.get("BUILD_NEWS_SOURCE", "cloud").strip().lower()
    if news_source not in {"local", "cloud"}:
        raise RuntimeError("BUILD_NEWS_SOURCE harus bernilai 'local' atau 'cloud'")
    run_generator("build_static_pages.py", *(["--cloud"] if news_source == "cloud" else []))
    # Direktori pasar publik kini membaca master e-SKPT secara realtime.
    # Halaman detail dari master pasar lokal sengaja tidak lagi dibangkitkan.
    # Generator membuat ulang halaman berita/detail. Terapkan header publik
    # kanonis setelah seluruh generator selesai agar hasil dist tetap konsisten.
    import sync_public_navigation
    sync_public_navigation.ROOT = DIST
    sync_public_navigation.sync_all()
    # Footer selalu ditimpa dari partial kanonis setelah seluruh generator.
    # Ini mencegah template artikel/detail memunculkan kembali footer lama.
    import sync_shared_footer
    sync_shared_footer.sync_all(DIST)
    # Firebase cleanUrls melayani berkas .html secara langsung. Jangan membuat
    # salinan index dengan tautan relatif karena salinan tersebut dapat meminta
    # aset dari /pasar/css atau /penyalur-bbm/js yang tidak ada.
    # Normalisasi OG dijalankan paling akhir.
    import sync_og_metadata
    sync_og_metadata.ROOT = DIST
    sync_og_metadata.main()
    validate()

    # Publikasikan hasil hanya setelah seluruh generator dan validasi berhasil.
    # Dengan demikian koneksi terputus atau data cloud tidak valid tidak dapat
    # meninggalkan folder dist dalam kondisi setengah jadi.
    previous_dist = ROOT / "dist.__previous"
    if previous_dist.exists():
        shutil.rmtree(previous_dist)
    if FINAL_DIST.exists():
        FINAL_DIST.replace(previous_dist)
    try:
        DIST.replace(FINAL_DIST)
    except Exception:
        if previous_dist.exists() and not FINAL_DIST.exists():
            previous_dist.replace(FINAL_DIST)
        raise
    if previous_dist.exists():
        shutil.rmtree(previous_dist)
    print(f"Production build selesai: {FINAL_DIST}")


if __name__ == "__main__":
    main()
