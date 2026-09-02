"""Normalize social metadata for every deployable public HTML document."""
from __future__ import annotations

from html import escape, unescape
from pathlib import Path
import mimetypes
import re

try:
    from PIL import Image
except ImportError:  # Build CI tetap berjalan; dimensi yang sudah ada dipertahankan.
    Image = None

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://disperindagesdm-pinrang.web.app"
FB_APP_ID = "966242223397117"

ROOT_PAGES = {
    "index.html": ("/", "/assets/brand/og_cover_disperindagesdm.png"),
    "arsip-berita.html": ("/arsip-berita", "/assets/brand/cover_arsip_berita.png"),
    "berita.html": ("/berita", "/assets/brand/cover_arsip_berita.png"),
    "command-center.html": ("/command-center", "/assets/brand/cover_command_center.png"),
    "direktori-lpg.html": ("/direktori-lpg", "/assets/brand/cover_perindagesdm.jpg"),
    "harga-bahan-pokok.html": ("/harga-bahan-pokok", "/assets/news/operasi_pasar_murah_sembako_pinrang.jpg"),
    "katalog-ikm.html": ("/katalog-ikm", "/assets/brand/cover_ikm.png"),
    "kontak.html": ("/kontak", "/assets/brand/og_cover_disperindagesdm.png"),
    "layanan.html": ("/layanan", "/assets/brand/cover_layanan.png"),
    "maklumat-pelayanan.html": ("/maklumat-pelayanan", "/assets/brand/cover_layanan.png"),
    "media-intelligence.html": ("/media-intelligence", "/assets/brand/cover_media_intelligence.png"),
    "pasar.html": ("/pasar", "/assets/news/pasar_sentral_pinrang_clean_hd.jpg"),
    "peta-gis.html": ("/peta-gis", "/assets/brand/cover_command_center.png"),
    "penyalur-bbm.html": ("/penyalur-bbm", "/assets/brand/cover_perindagesdm.jpg"),
    "ppid.html": ("/ppid", "/assets/brand/cover_ppid.png"),
    "profil.html": ("/profil", "/assets/brand/cover_profil.png"),
}


def first(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, flags=re.I | re.S)
    return unescape(match.group(1).strip()) if match else None


def replace_or_insert(head: str, pattern: str, tag: str) -> str:
    if re.search(pattern, head, flags=re.I | re.S):
        return re.sub(pattern, tag, head, count=1, flags=re.I | re.S)
    return head.rstrip() + "\n  " + tag + "\n"


def absolute_image(value: str | None, fallback: str) -> str:
    value = value or fallback
    if value.startswith("https://"):
        return value
    return SITE + "/" + value.lstrip("/")


def local_image_meta(url: str) -> tuple[int, int, str] | None:
    if Image is None:
        return None
    if not url.startswith(SITE + "/"):
        return None
    local = ROOT / url.removeprefix(SITE + "/")
    if not local.exists():
        return None
    try:
        with Image.open(local) as image:
            mime = Image.MIME.get(image.format) or mimetypes.guess_type(local.name)[0] or "image/jpeg"
            return image.width, image.height, mime
    except Exception:
        return None


def sync(path: Path, canonical: str, fallback_image: str) -> None:
    text = path.read_text(encoding="utf-8")
    head_match = re.search(r"(<head\b[^>]*>)(.*?)(</head>)", text, flags=re.I | re.S)
    if not head_match:
        raise RuntimeError(f"Head tidak ditemukan: {path}")
    head = head_match.group(2)
    title = first(r"<title[^>]*>(.*?)</title>", head) or "Disperindag ESDM Kabupaten Pinrang"
    description = first(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']\s*/?>', head)
    description = description or "Portal resmi Disperindag ESDM Kabupaten Pinrang."
    old_image = first(r'<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']\s*/?>', head)
    image_url = absolute_image(old_image, fallback_image)
    # Root landing pages use their explicit semantic cover; single posts retain
    # the featured image supplied by their content generator.
    if path.parent == ROOT or path == ROOT / "penyalur-bbm" / "index.html":
        image_url = absolute_image(None, fallback_image)

    canonical_url = SITE + canonical
    og_type = "article" if "berita" in path.parts and path.name != "berita.html" else "website"
    tags = [
        (r'<link\s+rel=["\']canonical["\'][^>]*>', f'<link rel="canonical" href="{escape(canonical_url)}">'),
        (r'<meta\s+name=["\']title["\'][^>]*>', f'<meta name="title" content="{escape(title, quote=True)}">'),
        (r'<meta\s+property=["\']fb:app_id["\'][^>]*>', f'<meta property="fb:app_id" content="{FB_APP_ID}">'),
        (r'<meta\s+property=["\']og:type["\'][^>]*>', f'<meta property="og:type" content="{og_type}">'),
        (r'<meta\s+property=["\']og:site_name["\'][^>]*>', '<meta property="og:site_name" content="Disperindag ESDM Kabupaten Pinrang">'),
        (r'<meta\s+property=["\']og:title["\'][^>]*>', f'<meta property="og:title" content="{escape(title, quote=True)}">'),
        (r'<meta\s+property=["\']og:description["\'][^>]*>', f'<meta property="og:description" content="{escape(description, quote=True)}">'),
        (r'<meta\s+property=["\']og:image["\'][^>]*>', f'<meta property="og:image" content="{escape(image_url)}">'),
        (r'<meta\s+property=["\']og:image:secure_url["\'][^>]*>', f'<meta property="og:image:secure_url" content="{escape(image_url)}">'),
        (r'<meta\s+property=["\']og:image:alt["\'][^>]*>', f'<meta property="og:image:alt" content="{escape(title, quote=True)}">'),
        (r'<meta\s+property=["\']og:url["\'][^>]*>', f'<meta property="og:url" content="{escape(canonical_url)}">'),
        (r'<meta\s+property=["\']og:locale["\'][^>]*>', '<meta property="og:locale" content="id_ID">'),
        (r'<meta\s+name=["\']twitter:card["\'][^>]*>', '<meta name="twitter:card" content="summary_large_image">'),
        (r'<meta\s+name=["\']twitter:title["\'][^>]*>', f'<meta name="twitter:title" content="{escape(title, quote=True)}">'),
        (r'<meta\s+name=["\']twitter:description["\'][^>]*>', f'<meta name="twitter:description" content="{escape(description, quote=True)}">'),
        (r'<meta\s+name=["\']twitter:image["\'][^>]*>', f'<meta name="twitter:image" content="{escape(image_url)}">'),
        (r'<meta\s+name=["\']twitter:image:alt["\'][^>]*>', f'<meta name="twitter:image:alt" content="{escape(title, quote=True)}">'),
    ]
    for pattern, tag in tags:
        head = replace_or_insert(head, pattern, tag)

    dimensions = local_image_meta(image_url)
    if dimensions:
        width, height, mime = dimensions
        for prop, value in (("width", width), ("height", height), ("type", mime)):
            pattern = rf'<meta\s+property=["\']og:image:{prop}["\'][^>]*>'
            head = replace_or_insert(head, pattern, f'<meta property="og:image:{prop}" content="{value}">')

    updated = text[:head_match.start(2)] + head + text[head_match.end(2):]
    path.write_text(updated, encoding="utf-8", newline="\n")


def main() -> None:
    targets: list[tuple[Path, str, str]] = []
    for filename, (canonical, image) in ROOT_PAGES.items():
        targets.append((ROOT / filename, canonical, image))
    for path in sorted((ROOT / "berita").rglob("*.html")):
        canonical = first(r'<link\s+rel=["\']canonical["\']\s+href=["\']https?://[^/]+(.*?)["\']', path.read_text("utf-8"))
        if canonical:
            targets.append((path, canonical, "/assets/brand/cover_arsip_berita.png"))
    for path in sorted((ROOT / "pasar").rglob("*.html")):
        canonical = first(r'<link\s+rel=["\']canonical["\']\s+href=["\']https?://[^/]+(.*?)["\']', path.read_text("utf-8"))
        if canonical:
            targets.append((path, canonical, "/assets/news/pasar_sentral_pinrang_clean_hd.jpg"))
    for path, canonical, image in targets:
        sync(path, canonical, image)
        print(f"OG synchronized: {path.relative_to(ROOT)} -> {canonical}")


if __name__ == "__main__":
    main()
