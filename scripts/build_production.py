from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
EXCLUDED_NAMES = {
    ".git", ".firebase", ".pytest_cache", "__pycache__", "dist", "engine",
    "docs", "scripts", "backup", "node_modules", "dokumen.html", "intel"
}
EXCLUDED_SUFFIXES = {".md", ".py", ".bat", ".cmd", ".sh", ".docx", ".log"}
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


def run_generator(script: str) -> None:
    command = [sys.executable, str(ROOT / script)]
    result = subprocess.run(command, cwd=DIST, check=False)
    if result.returncode:
        raise SystemExit(result.returncode)


def validate() -> None:
    required = [
        DIST / "index.html", DIST / "firebase.json", DIST / "direktori-lpg.html",
        DIST / "penyalur-bbm.html", DIST / "pasar.html", DIST / "peta-gis.html",
        DIST / "harga-bahan-pokok.html", DIST / "js" / "public-navigation.js",
        DIST / "js" / "lpg-engine.js", DIST / "js" / "bbm-engine.js",
        DIST / "js" / "market-engine.js",
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.is_file()]
    if missing:
        raise RuntimeError(f"Output build tidak lengkap: {', '.join(missing)}")
    if not (DIST / "berita").is_dir() or not (DIST / "pasar").is_dir():
        raise RuntimeError("Output generator berita/pasar tidak ditemukan")
    forbidden = [DIST / "dokumen.html", DIST / "direktori-lpg" / "index.html", DIST / "penyalur-bbm" / "index.html"]
    present = [str(path.relative_to(DIST)) for path in forbidden if path.exists()]
    if present:
        raise RuntimeError(f"Halaman lama/cermin tidak boleh dipublikasikan: {', '.join(present)}")


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
    run_generator("build_static_pages.py")
    run_generator("build_market_pages.py")
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
    print(f"Production build selesai: {DIST}")


if __name__ == "__main__":
    main()
