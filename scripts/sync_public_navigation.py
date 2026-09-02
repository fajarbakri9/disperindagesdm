"""Synchronize the home header and navigation on regular public pages.

Operational/special-purpose pages are intentionally excluded.
"""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
PAGES = {
    "index.html": "home",
    "404.html": "",
    "arsip-berita.html": "news",
    "berita.html": "news",
    "direktori-lpg.html": "directory",
    "harga-bahan-pokok.html": "directory",
    "katalog-ikm.html": "directory",
    "kontak.html": "services",
    "layanan.html": "services",
    "maklumat-pelayanan.html": "profile",
    "pasar.html": "directory",
    "penyalur-bbm.html": "directory",
    "ppid.html": "services",
    "profil.html": "profile",
    "search.html": "",
}

# Clean URL ditangani Firebase dari berkas .html. Salinan direktori tidak
# diperlukan dan berisiko mengubah basis tautan relatif.
MIRRORS = {}


def consolidate_home_transparency() -> None:
    """Keep accountability content on the service page, not duplicated at home."""
    path = ROOT / "index.html"
    text = path.read_text(encoding="utf-8")
    replacement = '''<!-- 5.5 TRANSPARANSI PELAYANAN TERKONSOLIDASI -->
  <section style="background:#F8FAFC;border-block:1px solid #E2E8F0;padding:28px 0">
    <div class="container" style="display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap">
      <div><span class="section-tag">Akuntabilitas Pelayanan</span><h2 style="color:#0F2C59;margin:7px 0 4px">Transparansi menjadi bagian dari Layanan Publik</h2><p style="color:#64748B;margin:0">Maklumat, SKM/IKM, dan rekapitulasi pengaduan tersedia bersama standar pelayanan.</p></div>
      <a href="layanan.html#transparansi-pelayanan" class="btn-primary">Lihat Transparansi Pelayanan →</a>
    </div>
  </section>'''
    updated, count = re.subn(
        r'\s*<!-- 5\.5 TRANSPARANSI.*?(?=\s*<!-- 6\. DASHBOARD HARGA)',
        "\n\n  " + replacement + "\n\n  ", text, count=1, flags=re.S
    )
    if count:
        path.write_text(updated, encoding="utf-8")


def active(current: str, target: str) -> str:
    return " active" if current == target else ""


def root_relative(fragment: str) -> str:
    """Make shared header links safe on root and nested public pages."""
    return re.sub(
        r'\b(href|src|action)="(?!https?://|/|#|mailto:|tel:)([^"]+)"',
        lambda match: f'{match.group(1)}="/{match.group(2)}"',
        fragment,
    )


def desktop_nav(current: str) -> str:
    return f'''<ul class="nav-menu">
        <li><a href="index.html" class="nav-link{active(current, 'home')}">Beranda</a></li>

        <li class="nav-dropdown">
          <a href="profil.html" class="nav-link nav-dropdown-toggle{active(current, 'profile')}">
            Profil <span class="dropdown-arrow">▾</span>
          </a>
          <div class="nav-dropdown-menu">
            <a href="profil.html#berakhlak" class="dropdown-item">
              <div class="dropdown-icon">🎯</div><div class="dropdown-text"><span class="dropdown-title">Core Values ASN BerAKHLAK</span><span class="dropdown-desc">Tata nilai budaya kerja ASN</span></div>
            </a>
            <a href="profil.html" class="dropdown-item">
              <div class="dropdown-icon">🏛️</div><div class="dropdown-text"><span class="dropdown-title">Profil &amp; Organisasi Resmi</span><span class="dropdown-desc">Visi, misi, struktur &amp; tupoksi Perbup 35/2023</span></div>
            </a>
          </div>
        </li>

        <li class="nav-dropdown">
          <a href="layanan.html" class="nav-link nav-dropdown-toggle{active(current, 'services')}">
            Layanan Publik <span class="dropdown-arrow">▾</span>
          </a>
          <div class="nav-dropdown-menu">
            <a href="kontak.html" class="dropdown-item">
              <div class="dropdown-icon">📞</div><div class="dropdown-text"><span class="dropdown-title">Kontak &amp; Lokasi Kantor</span><span class="dropdown-desc">Alamat, peta &amp; WhatsApp dinas</span></div>
            </a>
            <a href="index.html#pengaduan" class="dropdown-item">
              <div class="dropdown-icon">📨</div><div class="dropdown-text"><span class="dropdown-title">Pengaduan Online</span><span class="dropdown-desc">Kanal resmi dan SP4N-LAPOR!</span></div>
            </a>
            <a href="layanan.html" class="dropdown-item">
              <div class="dropdown-icon">⚡</div><div class="dropdown-text"><span class="dropdown-title">Standar Pelayanan &amp; SOP</span><span class="dropdown-desc">Standar layanan publik resmi</span></div>
            </a>
            <a href="ppid.html" class="dropdown-item">
              <div class="dropdown-icon">📋</div><div class="dropdown-text"><span class="dropdown-title">PPID Pelaksana</span><span class="dropdown-desc">Informasi publik dan dokumen resmi</span></div>
            </a>
            <a href="layanan.html#transparansi-pelayanan" class="dropdown-item">
              <div class="dropdown-icon">📊</div><div class="dropdown-text"><span class="dropdown-title">Transparansi Pelayanan</span><span class="dropdown-desc">SKM, IKM, dan rekapitulasi layanan</span></div>
            </a>
          </div>
        </li>

        <li class="nav-dropdown">
          <a href="direktori-lpg.html" class="nav-link nav-dropdown-toggle{active(current, 'directory')}">
            Direktori <span class="dropdown-arrow">▾</span>
          </a>
          <div class="nav-dropdown-menu">
            <a href="direktori-lpg.html" class="dropdown-item">
              <div class="dropdown-icon">🔥</div><div class="dropdown-text"><span class="dropdown-title">Direktori Pangkalan LPG 3 KG</span><span class="dropdown-desc">Sebaran pangkalan dan agen penyalur resmi</span></div>
            </a>
            <a href="pasar.html" class="dropdown-item">
              <div class="dropdown-icon">🏬</div><div class="dropdown-text"><span class="dropdown-title">Direktori Pasar Daerah</span><span class="dropdown-desc">Sarana pasar dan status operasional</span></div>
            </a>
            <a href="penyalur-bbm.html" class="dropdown-item">
              <div class="dropdown-icon">⛽</div><div class="dropdown-text"><span class="dropdown-title">Direktori Penyalur BBM</span><span class="dropdown-desc">Sebaran SPBU &amp; Pertashop Pinrang</span></div>
            </a>
            <a href="peta-gis.html" class="dropdown-item">
              <div class="dropdown-icon">🗺️</div><div class="dropdown-text"><span class="dropdown-title">Peta GIS Disperindag ESDM</span><span class="dropdown-desc">Peta terpadu pasar, LPG, dan penyalur BBM</span></div>
            </a>
            <a href="harga-bahan-pokok.html" class="dropdown-item">
              <div class="dropdown-icon">🛒</div><div class="dropdown-text"><span class="dropdown-title">Harga Pasar &amp; Bapokting</span><span class="dropdown-desc">Pantauan komoditas harian</span></div>
            </a>
            <a href="katalog-ikm.html" class="dropdown-item">
              <div class="dropdown-icon">🏭</div><div class="dropdown-text"><span class="dropdown-title">Katalog Produk IKM</span><span class="dropdown-desc">Produk unggulan Pinrang</span></div>
            </a>
          </div>
        </li>

        <li><a href="arsip-berita.html" class="nav-link{active(current, 'news')}">Berita</a></li>
      </ul>'''


def drawer_nav(current: str, filename: str = "") -> str:
    page_active = {
        "news": "arsip-berita.html",
        "profile": "profil.html",
        "services": "layanan.html",
        "directory": "direktori-lpg.html",
    }.get(current)
    page_targets = {
        "direktori-lpg.html": "direktori-lpg.html", "katalog-ikm.html": "katalog-ikm.html",
        "kontak.html": "kontak.html", "pasar.html": "pasar.html",
        "harga-bahan-pokok.html": "harga-bahan-pokok.html",
        "penyalur-bbm.html": "penyalur-bbm.html", "ppid.html": "ppid.html",
        "peta-gis.html": "peta-gis.html",
        "maklumat-pelayanan.html": "profil.html",
    }
    page_active = page_targets.get(filename, page_active)

    def link(href: str, icon: str, label: str) -> str:
        state = " active" if href == page_active else ""
        return f'      <a href="{href}" class="drawer-link{state}"><span>{icon}</span> {label}</a>'

    return '''<div class="drawer-nav">
      <div class="mobile-nav-group-title">MENU UTAMA</div>
{main}
      <div class="mobile-nav-group-title">LAYANAN PUBLIK</div>
{services}
      <div class="mobile-nav-group-title">DIREKTORI</div>
{info}
      <div class="drawer-divider"></div>
      <a href="login.html" class="drawer-link drawer-portal-btn"><span>🔐</span> Login Pegawai ASN</a>
    </div>'''.format(
        main="\n".join([
            link("index.html", "🏠", "Beranda"),
            link("arsip-berita.html", "📰", "Berita &amp; Publikasi"),
            link("layanan.html", "⚡", "Layanan Publik"),
            link("profil.html", "🏛️", "Profil &amp; Tupoksi"),
        ]),
        info="\n".join([
            link("direktori-lpg.html", "🔥", "Direktori Pangkalan LPG 3 KG"),
            link("penyalur-bbm.html", "⛽", "Direktori Penyalur BBM"),
            link("pasar.html", "🏬", "Direktori Pasar"),
            link("harga-bahan-pokok.html", "🛒", "Harga Bahan Pokok SP2KP"),
            link("katalog-ikm.html", "🏭", "Katalog Produk IKM"),
            link("peta-gis.html", "🗺️", "Peta GIS Disperindag ESDM"),
        ]),
        services="\n".join([
            link("kontak.html", "📞", "Kontak &amp; Lokasi"),
            link("index.html#pengaduan", "📨", "Pengaduan Online"),
            link("ppid.html", "📋", "PPID Pelaksana"),
            link("layanan.html#transparansi-pelayanan", "📊", "Transparansi Pelayanan"),
        ]),
    )


def drawer(current: str, filename: str) -> str:
    return f'''<!-- MOBILE DRAWER -->
  <div class="mobile-drawer-overlay" id="mobileDrawerOverlay" aria-hidden="true"></div>
  <div class="mobile-drawer" id="mobileDrawer" aria-hidden="true">
    <div class="drawer-header">
      <div class="drawer-brand">
        <img src="assets/brand/logo_pinrang_opt.png" alt="Logo Kabupaten Pinrang">
        <div class="drawer-brand-text"><h4>DISPERINDAG ESDM</h4><p>KABUPATEN PINRANG</p></div>
      </div>
      <button class="drawer-close-btn" id="drawerCloseBtn" type="button" aria-label="Tutup menu">✕</button>
    </div>
    {drawer_nav(current, filename)}
  </div>'''


def synchronize(path: Path, current: str) -> None:
    text = path.read_text(encoding="utf-8")
    home = (ROOT / "index.html").read_text(encoding="utf-8")
    canonical_match = re.search(
        r'\s*<!-- 1\. TOP UTILITY BAR.*?(?=\s*<!-- MOBILE DRAWER NAVIGATION)',
        home,
        flags=re.S,
    )
    if not canonical_match:
        raise RuntimeError("Canonical home header not found")
    canonical = canonical_match.group(0)
    canonical, nav_count = re.subn(
        r'<ul class="nav-menu">.*?</ul>', desktop_nav(current), canonical, count=1, flags=re.S
    )
    if nav_count != 1:
        raise RuntimeError("Canonical desktop navigation not found exactly once")
    canonical = root_relative(canonical)

    updated, header_count = re.subn(
        r'\s*<!-- 1\..*?(?=\s*<!-- (?:MOBILE DRAWER|3\.))',
        canonical + "\n\n  ",
        text,
        count=1,
        flags=re.S,
    )
    if header_count == 0:
        updated, header_count = re.subn(
            r'(?<=<body>)\s*.*?(?=\s*<header class="market-detail-hero")',
            canonical + "\n\n  ",
            text,
            count=1,
            flags=re.S,
        )
    if header_count != 1:
        raise RuntimeError(f"Public header region not found exactly once: {path.name}")

    updated, drawer_count = re.subn(
        r'<div class="drawer-nav">.*?</div>\s*</div>\s*(?=<!--|<)',
        drawer_nav(current, path.name) + "\n  </div>\n\n  ",
        updated,
        count=1,
        flags=re.S,
    )
    if drawer_count == 0:
        marker_match = re.search(r'^\s*(?:<!-- (?:3\.|HERO SECTION)|<header class="market-detail-hero")', updated, flags=re.M)
        if not marker_match:
            raise RuntimeError(f"Drawer insertion marker not found: {path}")
        drawer_html = root_relative(drawer(current, path.name))
        updated = updated[:marker_match.start()] + f"\n  {drawer_html}\n" + updated[marker_match.start():]

    if path.name == "penyalur-bbm.html":
        updated = updated.replace('  <script src="js/app.js?v=20260831_nav_sync_v1"></script>\n', '')
        desktop_marker = "      <!-- Desktop Navigation Menu -->"
        if 'id="mobileMenuBtn"' not in updated:
            updated = updated.replace(
                desktop_marker,
                '      <button class="mobile-toggle" id="mobileMenuBtn" type="button" aria-label="Buka navigasi menu" aria-controls="mobileDrawer" aria-expanded="false">☰</button>\n\n' + desktop_marker,
                1,
            )

        if 'src="js/public-navigation.js' not in updated:
            updated = updated.replace(
                '  <script src="js/pinrang-live.js"></script>',
                '  <script src="js/pinrang-live.js"></script>\n  <script src="js/public-navigation.js?v=20260831_nav_sync_v1"></script>',
                1,
            )

    updated = updated.replace('/#transparansi-pelayanan', '/layanan.html#transparansi-pelayanan')
    updated = updated.replace('/index.html#transparansi-pelayanan', '/layanan.html#transparansi-pelayanan')
    updated = updated.replace('/index.html#sembako', '/harga-bahan-pokok.html')
    updated = updated.replace('/dokumen.html', '/ppid.html#dokumen-regulasi')
    updated = updated.replace('dokumen.html', 'ppid.html#dokumen-regulasi')

    path.write_text(updated, encoding="utf-8", newline="\n")


def sync_all() -> None:
    consolidate_home_transparency()
    for filename, section in PAGES.items():
        synchronize(ROOT / filename, section)
        print(f"synchronized: {filename}")
    for article in sorted((ROOT / "berita").rglob("*.html")):
        synchronize(article, "news")
        print(f"synchronized: {article.relative_to(ROOT)}")
    for market_page in sorted((ROOT / "pasar").rglob("*.html")):
        if market_page == ROOT / "pasar" / "index.html":
            continue
        synchronize(market_page, "directory")
        print(f"synchronized: {market_page.relative_to(ROOT)}")
    for source, destination in MIRRORS.items():
        mirror_path = ROOT / destination
        mirror_path.parent.mkdir(parents=True, exist_ok=True)
        mirror_path.write_text((ROOT / source).read_text(encoding="utf-8"), encoding="utf-8", newline="\n")
        print(f"mirrored: {destination}")


if __name__ == "__main__":
    sync_all()
