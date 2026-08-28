import os
import re

def get_standard_nav(active_page):
    return f'''      <!-- Desktop Navigation Menu -->
      <ul class="nav-menu">
        <li><a href="index.html" class="nav-link {'active' if active_page == 'index' else ''}">Beranda</a></li>

        <!-- Dropdown 1: Profil & Organisasi -->
        <li class="nav-dropdown">
          <a href="profil.html" class="nav-link nav-dropdown-toggle {'active' if active_page in ['profil', 'maklumat'] else ''}">
            Profil <span class="dropdown-arrow">▾</span>
          </a>
          <div class="nav-dropdown-menu">
            <a href="profil.html" class="dropdown-item">
              <div class="dropdown-icon">🏛️</div>
              <div class="dropdown-text">
                <span class="dropdown-title">Profil & Organisasi Resmi</span>
                <span class="dropdown-desc">Visi, misi, struktur & tupoksi Perbup 35/2023</span>
              </div>
            </a>
            <a href="maklumat-pelayanan.html" class="dropdown-item">
              <div class="dropdown-icon">📜</div>
              <div class="dropdown-text">
                <span class="dropdown-title">Maklumat Pelayanan</span>
                <span class="dropdown-desc">Piagam komitmen moral aparatur dinas</span>
              </div>
            </a>
            <a href="profil.html#berakhlak" class="dropdown-item">
              <div class="dropdown-icon">🎯</div>
              <div class="dropdown-text">
                <span class="dropdown-title">Core Values ASN BerAKHLAK</span>
                <span class="dropdown-desc">Tata nilai budaya kerja ASN</span>
              </div>
            </a>
          </div>
        </li>

        <!-- Dropdown 2: Layanan Publik -->
        <li class="nav-dropdown">
          <a href="layanan.html" class="nav-link nav-dropdown-toggle {'active' if active_page in ['layanan', 'kontak'] else ''}">
            Layanan Publik <span class="dropdown-arrow">▾</span>
          </a>
          <div class="nav-dropdown-menu">
            <a href="layanan.html" class="dropdown-item">
              <div class="dropdown-icon">⚡</div>
              <div class="dropdown-text">
                <span class="dropdown-title">Standar Pelayanan & SOP</span>
                <span class="dropdown-desc">9 standar layanan publik resmi</span>
              </div>
            </a>
            <a href="index.html#pengaduan" class="dropdown-item">
              <div class="dropdown-icon">📨</div>
              <div class="dropdown-text">
                <span class="dropdown-title">Pengaduan Online</span>
                <span class="dropdown-desc">8 kanal resmi & SP4N-LAPOR!</span>
              </div>
            </a>
            <a href="kontak.html" class="dropdown-item">
              <div class="dropdown-icon">📞</div>
              <div class="dropdown-text">
                <span class="dropdown-title">Kontak & Lokasi Kantor</span>
                <span class="dropdown-desc">Alamat, peta & WhatsApp dinas</span>
              </div>
            </a>
          </div>
        </li>

        <!-- Dropdown 3: Transparansi & Data -->
        <li class="nav-dropdown">
          <a href="index.html#transparansi-pelayanan" class="nav-link nav-dropdown-toggle {'active' if active_page in ['pasar', 'ikm', 'ppid', 'dokumen'] else ''}">
            Transparansi <span class="dropdown-arrow">▾</span>
          </a>
          <div class="nav-dropdown-menu">
            <a href="index.html#transparansi-pelayanan" class="dropdown-item">
              <div class="dropdown-icon">📊</div>
              <div class="dropdown-text">
                <span class="dropdown-title">Transparansi Pelayanan</span>
                <span class="dropdown-desc">SKM, IKM & Rekapitulasi 2025</span>
              </div>
            </a>
            <a href="pasar.html" class="dropdown-item">
              <div class="dropdown-icon">🏬</div>
              <div class="dropdown-text">
                <span class="dropdown-title">Direktori Pasar Daerah</span>
                <span class="dropdown-desc">17 sarana pasar & status operasional</span>
              </div>
            </a>
            <a href="index.html#sembako" class="dropdown-item">
              <div class="dropdown-icon">🛒</div>
              <div class="dropdown-text">
                <span class="dropdown-title">Harga Pasar & Bapokting</span>
                <span class="dropdown-desc">Pantauan komoditas harian</span>
              </div>
            </a>
            <a href="katalog-ikm.html" class="dropdown-item">
              <div class="dropdown-icon">🏭</div>
              <div class="dropdown-text">
                <span class="dropdown-title">Katalog Produk IKM</span>
                <span class="dropdown-desc">Produk unggulan Pinrang</span>
              </div>
            </a>
            <a href="ppid.html" class="dropdown-item">
              <div class="dropdown-icon">📋</div>
              <div class="dropdown-text">
                <span class="dropdown-title">PPID Pelaksana</span>
                <span class="dropdown-desc">Informasi publik berkala</span>
              </div>
            </a>
            <a href="dokumen.html" class="dropdown-item">
              <div class="dropdown-icon">📁</div>
              <div class="dropdown-text">
                <span class="dropdown-title">Dokumen & Regulasi</span>
                <span class="dropdown-desc">Perbup & Renja kedinasan</span>
              </div>
            </a>
          </div>
        </li>

        <li><a href="arsip-berita.html" class="nav-link {'active' if active_page == 'berita' else ''}">Berita</a></li>
      </ul>'''

def sync_all():
    target_files = [
        ("profil.html", "profil"),
        ("layanan.html", "layanan"),
        ("ppid.html", "ppid"),
        ("dokumen.html", "dokumen"),
        ("katalog-ikm.html", "ikm"),
        ("arsip-berita.html", "berita"),
        ("berita.html", "berita"),
        ("maklumat-pelayanan.html", "maklumat"),
        ("search.html", "search"),
        ("kontak.html", "kontak"),
        ("pasar.html", "pasar")
    ]

    for fname, page_key in target_files:
        if not os.path.exists(fname):
            continue
        with open(fname, "r", encoding="utf-8") as f:
            html = f.read()

        # Pola <ul class="nav-menu"...> ... </ul>
        nav_pattern = r'<ul class="nav-menu".*?</ul>'
        new_nav = get_standard_nav(page_key)

        if re.search(nav_pattern, html, re.DOTALL):
            html = re.sub(nav_pattern, new_nav, html, flags=re.DOTALL)
            
            # Pastikan di mobile drawer juga ada link Direktori Pasar Daerah
            if 'href="pasar.html"' not in html:
                drawer_pattern = r'(<a href="index\.html#sembako".*?</a>)'
                pasar_drawer = '<a href="pasar.html" class="drawer-link"><span>🏬</span> Direktori Pasar Daerah</a>'
                html = re.sub(drawer_pattern, r'\1\n      ' + pasar_drawer, html)

            # Pastikan di footer juga ada link Direktori Pasar Daerah
            if 'pasar.html' not in html or html.count('pasar.html') < 2:
                footer_pattern = r'(<a href="index\.html#sembako">Harga Pasar & Sembako</a>)'
                pasar_footer = '<a href="pasar.html">Direktori Pasar Daerah</a>'
                html = re.sub(footer_pattern, r'\1\n            ' + pasar_footer, html)

            with open(fname, "w", encoding="utf-8") as f:
                f.write(html)
            print(f"Successfully updated navigation in: {fname}")

if __name__ == "__main__":
    sync_all()
