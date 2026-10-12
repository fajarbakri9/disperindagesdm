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
    "layanan-online.html": "services",
    "permohonan.html": "services",
    "dashboard-esdm.html": "directory",
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

# Salinan route-index publik tetap perlu menerima shell kanonik. Tautan di
# dalam header/drawer akan dinormalisasi menjadi root-relative sehingga aman
# walaupun halaman berada satu tingkat di bawah root.
ROUTE_INDEXES = {
    "direktori-lpg/index.html": "directory",
    "penyalur-bbm/index.html": "directory",
}


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
    item = lambda href, icon, title, desc: f'<a href="{href}" class="dropdown-item"><div class="dropdown-icon">{icon}</div><div class="dropdown-text"><span class="dropdown-title">{title}</span><span class="dropdown-desc">{desc}</span></div></a>'
    return f'''<ul class="nav-menu">
        <li><a href="index.html" class="nav-link{active(current, 'home')}">Beranda</a></li>
        <li class="nav-dropdown"><a href="profil.html" class="nav-link nav-dropdown-toggle{active(current, 'profile')}">Profil <span class="dropdown-arrow">▾</span></a><div class="nav-dropdown-menu">{item('profil.html#berakhlak','🎯','Core Values ASN BerAKHLAK','Tata nilai budaya kerja ASN')}{item('profil.html','🏛️','Profil &amp; Organisasi Resmi','Visi, misi, struktur &amp; tupoksi')}</div></li>
        <li class="nav-dropdown"><a href="layanan.html" class="nav-link nav-dropdown-toggle{active(current, 'services')}">Layanan Publik <span class="dropdown-arrow">▾</span></a><div class="nav-dropdown-menu service-mega-menu">
          <section class="nav-menu-group"><strong>Pelayanan</strong>{item('layanan.html','⚡','Standar Pelayanan &amp; SOP','Standar layanan publik resmi')}{item('maklumat-pelayanan.html','📜','Maklumat Pelayanan','Komitmen pelayanan')}{item('index.html#pengaduan','📨','Pengaduan Online','Kanal resmi dan SP4N-LAPOR!')}{item('kontak.html','📞','Kontak &amp; Lokasi','Alamat dan kanal dinas')}</section>
          <section class="nav-menu-group"><strong>Layanan Sektoral</strong>{item('harga-bahan-pokok.html','🛒','Harga Bahan Pokok','Pantauan harga terpublikasi')}{item('pasar.html','🏬','Pasar','Direktori pasar daerah')}{item('layanan.html#srv_tera','⚖️','Metrologi Legal','Tera dan tera ulang UTTP')}{item('katalog-ikm.html','🏭','Industri &amp; IKM','Produk dan layanan industri')}{item('dashboard-esdm.html','⚡','ESDM','Dashboard energi Kabupaten Pinrang')}</section>
          <section class="nav-menu-group"><strong>Layanan Online</strong>{item('permohonan.html','📝','Permohonan <small class="nav-status-badge">Dalam Pengembangan</small>','Informasi kanal permohonan digital')}{item('layanan-online.html','🌐','Informasi Layanan Digital','Katalog dan status layanan online')}{item('tv-layanan.html','📺','TV Layanan Publik','Informasi layar layanan publik')}</section>
        </div></li>
        <li class="nav-dropdown"><a href="direktori-lpg.html" class="nav-link nav-dropdown-toggle{active(current, 'directory')}">Data &amp; Peta <span class="dropdown-arrow">▾</span></a><div class="nav-dropdown-menu">{item('direktori-lpg.html','🔥','LPG 3 Kg','Agen dan pangkalan resmi')}{item('penyalur-bbm.html','⛽','Penyalur BBM','SPBU dan Pertashop')}{item('pasar.html','🏬','Pasar Daerah','Sarana perdagangan')}{item('peta-gis.html','🗺️','Peta GIS','Peta data terpadu')}{item('dashboard-esdm.html','⚡','Dashboard ESDM','Informasi energi publik')}</div></li>
        <li><a href="ppid.html" class="nav-link">Informasi Publik</a></li>
        <li><a href="arsip-berita.html" class="nav-link{active(current, 'news')}">Berita &amp; Rilis</a></li>
      </ul>'''.replace('>Layanan Publik <', '>Layanan <').replace('>Informasi Publik</a>', '>Informasi</a>').replace('>Berita &amp; Rilis</a>', '>Berita</a>')


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
            link("dashboard-esdm.html", "⚡", "Dashboard ESDM"),
        ]),
        services="\n".join([
            link("kontak.html", "📞", "Kontak &amp; Lokasi"),
            link("index.html#pengaduan", "📨", "Pengaduan Online"),
            link("ppid.html", "📋", "PPID Pelaksana"),
            link("layanan.html#transparansi-pelayanan", "📊", "Transparansi Pelayanan"),
            link("permohonan.html", "📝", "Permohonan · Dalam Pengembangan"),
            link("layanan-online.html", "🌐", "Informasi Layanan Digital"),
            link("tv-layanan.html", "📺", "TV Layanan Publik"),
        ]),
    )


def drawer(current: str, filename: str) -> str:
    return f'''<!-- MOBILE DRAWER -->
  <div class="mobile-drawer-overlay" id="mobileDrawerOverlay" aria-hidden="true"></div>
  <div class="mobile-drawer" id="mobileDrawer" role="dialog" aria-modal="true" aria-label="Navigasi utama" aria-hidden="true" tabindex="-1">
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
        r'\s*<!-- 1\. TOP UTILITY BAR.*?(?=\s*<!-- MOBILE DRAWER(?: NAVIGATION)? -->)',
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

    # Rekonstruksi seluruh blok drawer jika penanda shell tersedia. Ini juga
    # membersihkan fragmen/penutup tag lama yang pernah tertinggal di luarnya.
    updated, full_drawer_count = re.subn(
        r'\s*<!-- MOBILE DRAWER(?: NAVIGATION)? -->.*?'
        r'(?=\s*(?:<!-- (?:3\.|HERO SECTION)|<header class="market-detail-hero"))',
        "\n\n  " + root_relative(drawer(current, path.name)) + "\n\n",
        updated,
        count=1,
        flags=re.S,
    )

    if full_drawer_count:
        drawer_count = 1
    else:
        updated, drawer_count = re.subn(
            r'<div class="drawer-nav">.*?</div>\s*</div>\s*(?=<!--|<)',
            root_relative(drawer_nav(current, path.name)) + "\n  </div>\n\n  ",
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

    route_key = path.relative_to(ROOT).as_posix()
    if route_key in ROUTE_INDEXES:
        updated = re.sub(
            r'\b(href|src)="(?:\.\./)*(assets|css|js)/',
            r'\1="/\2/',
            updated,
        )

    path.write_text(updated, encoding="utf-8", newline="\n")


def sync_all() -> None:
    consolidate_home_transparency()
    for filename, section in PAGES.items():
        synchronize(ROOT / filename, section)
        print(f"synchronized: {filename}")
    for filename, section in ROUTE_INDEXES.items():
        route_path = ROOT / filename
        if route_path.is_file():
            synchronize(route_path, section)
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
