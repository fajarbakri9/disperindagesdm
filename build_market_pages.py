import os
import json
import re
from pathlib import Path

def build_market_pages():
    data_path = os.path.join("assets", "data", "markets.json")
    if not os.path.exists(data_path):
        print(f"File {data_path} tidak ditemukan!")
        return

    with open(data_path, "r", encoding="utf-8") as f:
        markets = json.load(f)

    os.makedirs("pasar", exist_ok=True)

    template = """<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{meta_title}</title>
  <meta name="description" content="{meta_desc}">
  <link rel="canonical" href="{canonical_url}">

  <!-- OPEN GRAPH / SOCIAL SHARING -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Disperindag ESDM Kabupaten Pinrang">
  <meta property="og:title" content="{meta_title}">
  <meta property="og:description" content="{meta_desc}">
  <meta property="og:image" content="{og_image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="{market_name}">
  <meta property="og:url" content="{canonical_url}">
  <meta property="og:locale" content="id_ID">

  <!-- TWITTER CARDS -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{meta_title}">
  <meta name="twitter:description" content="{meta_desc}">
  <meta name="twitter:image" content="{og_image}">

  <link rel="icon" type="image/png" href="../../assets/brand/logo_pinrang_opt.png">
  <link rel="shortcut icon" type="image/x-icon" href="../../favicon.ico">
  <link rel="apple-touch-icon" href="../../assets/brand/logo_pinrang_opt.png">
  <link rel="stylesheet" href="../../css/style.css?v=20260830_footer_canonical_v2">
  <link rel="stylesheet" href="../../css/modal-system.css">
  <style>
    .market-detail-hero {{
      background: radial-gradient(circle at top, #0F2C59 0%, #030D1B 100%);
      color: #FFFFFF;
      padding: 48px 0 40px;
      border-bottom: 3px solid var(--accent-gold);
    }}
    .market-badge-lg {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.88rem;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    .badge-aktif {{ background: #ECFDF5; color: #065F46; border: 1.5px solid #A7F3D0; }}
    .badge-tidak-aktif {{ background: #F1F5F9; color: #334155; border: 1.5px solid #CBD5E1; }}
    .badge-verifikasi {{ background: #FFFBEB; color: #92400E; border: 1.5px solid #FDE68A; }}

    .info-card-box {{
      background: #FFFFFF;
      border-radius: 14px;
      border: 1.5px solid var(--border-subtle);
      padding: 24px;
      box-shadow: var(--shadow-sm);
      margin-bottom: 24px;
    }}
    .info-grid-2 {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }}
    .info-item-label {{
      font-size: 0.76rem;
      font-weight: 800;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }}
    .info-item-val {{
      font-size: 0.95rem;
      font-weight: 700;
      color: #0F172A;
    }}
    .source-pill {{
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    @media (max-width: 768px) {{
      .info-grid-2 {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>

  <!-- TOP BAR -->
  <div class="top-bar">
    <div class="container top-bar-container">
      <div class="top-bar-left">
        <span class="live-clock" id="liveClockWita">📅 Memuat Waktu WITA...</span>
        <span class="top-bar-divider">•</span>
        <span class="live-weather" id="liveWeatherPinrang">🌤️ Memuat Cuaca...</span>
      </div>
      <div class="top-bar-right">
        <span style="color: var(--accent-gold); font-weight: 800; font-size: 0.76rem;">#BanggaMelayaniBangsa</span>
      </div>
    </div>
  </div>

  <!-- NAVBAR -->
  <nav class="navbar" id="mainNavbar">
    <div class="container">
      <a href="../../index.html" class="brand-logo">
        <img src="../../assets/brand/logo_pinrang_opt.png" alt="Logo Pemkab Pinrang">
        <div class="brand-text">
          <h1>DISPERINDAG ESDM</h1>
          <p>KABUPATEN PINRANG</p>
        </div>
      </a>
      <button class="mobile-toggle" id="mobileMenuBtn" aria-label="Buka Menu">☰</button>
      <ul class="nav-menu" id="navMenu">
        <li><a href="../../index.html" class="nav-link">Beranda</a></li>
        <li><a href="../../profil.html" class="nav-link">Profil</a></li>
        <li><a href="../../layanan.html" class="nav-link">Layanan Publik</a></li>
        <li><a href="../../pasar.html" class="nav-link active">Direktori Pasar</a></li>
        <li><a href="../../penyalur-bbm.html" class="nav-link">Penyalur BBM</a></li>
        <li><a href="../../katalog-ikm.html" class="nav-link">Katalog IKM</a></li>
        <li><a href="../../ppid.html#dokumen-regulasi" class="nav-link">PPID &amp; Dokumen Publik</a></li>
        <li><a href="../../arsip-berita.html" class="nav-link">Berita</a></li>
        <li><a href="../../kontak.html" class="nav-link">Kontak</a></li>
      </ul>
    </div>
  </nav>

  <!-- HERO SECTION -->
  <header class="market-detail-hero">
    <div class="container">
      <div style="display: flex; gap: 8px; font-size: 0.84rem; color: #94A3B8; margin-bottom: 14px;">
        <a href="../../index.html" style="color: var(--accent-gold); text-decoration: none;">Beranda</a>
        <span>&rsaquo;</span>
        <a href="../../pasar.html" style="color: #CBD5E1; text-decoration: none;">Direktori Pasar</a>
        <span>&rsaquo;</span>
        <span style="color: #FFFFFF;">{market_name}</span>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="margin-bottom: 12px;">{badge_markup}</div>
          <h1 style="font-size: 2.2rem; font-weight: 900; color: #FFFFFF; line-height: 1.25; margin: 0 0 6px;">{market_name}</h1>
          {alt_name_markup}
          <div style="color: #94A3B8; font-size: 0.95rem; margin-top: 8px;">
            📍 Kecamatan {district}, Kabupaten Pinrang, Sulawesi Selatan
          </div>
        </div>

        <a href="../../pasar.html" class="btn-outline-gold" style="padding: 8px 18px; text-decoration: none; border-radius: 8px; font-size: 0.86rem;">
          &larr; Kembali ke Direktori
        </a>
      </div>
    </div>
  </header>

  <!-- MAIN CONTENT -->
  <main class="container" style="padding: 40px 20px 60px;">
    <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 32px;">
      
      <!-- KOLOM KIRI (PROFIL & RIWAYAT) -->
      <div>
        
        <!-- FOTO PASAR -->
        <div style="border-radius: 14px; overflow: hidden; margin-bottom: 24px; border: 1.5px solid var(--border-subtle); box-shadow: var(--shadow-sm); max-height: 400px; background: #0F2C59;">
          <img src="../../{photo_src}" alt="{market_name}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>

        <!-- PROFIL & DESKRIPSI -->
        <div class="info-card-box">
          <h2 style="font-size: 1.25rem; font-weight: 900; color: var(--primary-deep); margin: 0 0 14px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px;">
            Profil &amp; Karakteristik Sarana
          </h2>
          <p style="font-size: 0.95rem; color: #334155; line-height: 1.7; margin-bottom: 16px;">
            {description}
          </p>
          <div style="background: #F8FAFC; border-left: 4px solid var(--primary); padding: 14px 18px; border-radius: 0 8px 8px 0; font-size: 0.88rem; color: #475569; line-height: 1.6;">
            <strong>Catatan Faktual:</strong> {verification_note}
          </div>
        </div>

        <!-- RIWAYAT & KLASIFIKASI HISTORIS (KHUSUS TRANSPARANSI REGULASI) -->
        <div class="info-card-box">
          <h2 style="font-size: 1.25rem; font-weight: 900; color: var(--primary-deep); margin: 0 0 14px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px;">
            Riwayat &amp; Dasar Regulasi
          </h2>
          <div style="font-size: 0.92rem; color: #334155; line-height: 1.65; margin-bottom: 12px;">
            {history_text}
          </div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 14px;">
            <div style="background: #F1F5F9; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; color: #475569;">
              📜 <strong>Klasifikasi Historis:</strong> {klasifikasi_historis}
            </div>
            <div style="background: #F1F5F9; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; color: #475569;">
              ⚖️ <strong>Dasar Dokumen:</strong> {dasar_klasifikasi}
            </div>
          </div>
        </div>

        <!-- DATA KOMODITAS & FASILITAS (JIKA TERVERIFIKASI) -->
        {facilities_markup}

        <!-- SUMBER DATA RESMI & AUDIT VERIFIKASI (POIN 10) -->
        <div class="info-card-box">
          <h2 style="font-size: 1.25rem; font-weight: 900; color: var(--primary-deep); margin: 0 0 14px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px;">
            Sumber Data &amp; Tanggal Verifikasi
          </h2>
          <div style="margin-bottom: 16px;">
            {sources_markup}
          </div>
          <div style="font-size: 0.82rem; color: #64748B; border-top: 1px dashed #CBD5E1; padding-top: 12px;">
            📅 <strong>Terakhir Diverifikasi:</strong> {verified_date} | <strong>Tahun Data:</strong> {data_year}
          </div>
        </div>

      </div>

      <!-- KOLOM KANAN (RINGKASAN DATA OPERASIONAL & UNIT PENGELOLA) -->
      <div>
        
        <div class="info-card-box" style="position: sticky; top: 20px;">
          <h3 style="font-size: 1.15rem; font-weight: 900; color: var(--primary-deep); margin: 0 0 16px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px;">
            Informasi Operasional
          </h3>

          <div class="info-grid-2" style="margin-bottom: 18px;">
            <div>
              <div class="info-item-label">Status Operasional</div>
              <div class="info-item-val">{status_label}</div>
            </div>
            <div>
              <div class="info-item-label">Kecamatan</div>
              <div class="info-item-val">{district}</div>
            </div>
            <div>
              <div class="info-item-label">Desa / Kelurahan</div>
              <div class="info-item-val">{village}</div>
            </div>
            <div>
              <div class="info-item-label">Jadwal Hari Pasar</div>
              <div class="info-item-val">{market_days}</div>
            </div>
            <div>
              <div class="info-item-label">Jam Aktivitas</div>
              <div class="info-item-val">{operating_hours}</div>
            </div>
            <div>
              <div class="info-item-label">Unit Pengelola</div>
              <div class="info-item-val">{unit_manager}</div>
            </div>
          </div>

          <!-- SARANA TERVERIFIKASI -->
          {stalls_summary_markup}

          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
            <div class="info-item-label">Alamat Lokasi</div>
            <div style="font-size: 0.88rem; color: #334155; line-height: 1.5; margin-top: 4px;">
              {address}
            </div>
          </div>

          <div style="margin-top: 20px;">
            <a href="https://wa.me/6282316002226?text=Halo%20Disperindag%20ESDM%20Pinrang,%20saya%20ingin%20konfirmasi%20data%20sarana%20{market_name_encoded}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="display: block; text-align: center; text-decoration: none; padding: 10px; border-radius: 8px; font-size: 0.88rem;">
              💬 Konfirmasi / Update Data Pasar
            </a>
          </div>
        </div>

      </div>

    </div>
  </main>

  <!-- FOOTER -->
  <footer class="main-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
            <img src="../../assets/brand/logo_pinrang_opt.png" alt="Logo Kabupaten Pinrang" style="width: 44px; height: auto;">
            <div>
              <h4 style="margin: 0; font-size: 0.95rem; font-weight: 900; color: #FFFFFF;">DISPERINDAG ESDM</h4>
              <span style="font-size: 0.76rem; color: #94A3B8; font-weight: 700;">KABUPATEN PINRANG</span>
            </div>
          </div>
          <p style="font-size: 0.82rem; color: #CBD5E1; line-height: 1.6;">
            Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang.
          </p>
        </div>

        <div class="footer-col">
          <h4>Standar Pelayanan</h4>
          <ul class="footer-links">
            <li><a href="../../layanan.html">Standar Pelayanan &amp; SOP</a></li>
            <li><a href="../../maklumat-pelayanan.html">Maklumat Pelayanan</a></li>
            <li><a href="../../pasar.html">Direktori Pasar Daerah</a></li>
            <li><a href="../../index.html#pengaduan">Formulir Pengaduan</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Kontak Resmi</h4>
          <div style="font-size: 0.84rem; color: #CBD5E1; line-height: 1.65;">
            <div>📍 Jl. Bintang No. 1, Kab. Pinrang</div>
            <div>📱 WhatsApp: <a href="https://wa.me/6282316002226" style="color: #FDE047; text-decoration: none;">0823 1600 2226</a></div>
            <div>✉️ Email: <a href="mailto:dinasperindagem.pinrang@gmail.com" style="color: #93C5FD; text-decoration: none;">dinasperindagem.pinrang@gmail.com</a></div>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <div>&copy; 2026 Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang - <a href="https://www.instagram.com/maroaproject/" target="_blank" rel="noopener noreferrer" style="color: #FACC15; font-weight: 800; text-decoration: none;">MAROA Project</a></div>
        <div style="color: var(--accent-gold); font-size: 0.8rem; font-weight: 700;">#BanggaMelayaniBangsa</div>
      </div>
    </div>
  </footer>

  <script src="../../js/data.js?v=20260828_upload_web_v2"></script>
  <script src="../../js/pinrang-live.js"></script>
  <script src="../../js/modal-system.js?v=20260828_upload_web_v2"></script>
  <script src="../../js/app.js?v=20260828_upload_web_v2"></script>
</body>
</html>
"""

    for m in markets:
        slug = m.get("slug")
        name = m.get("nama")
        status = m.get("statusOperasional", "perlu-verifikasi")

        # Badge Markup
        if status == "aktif":
            badge_markup = '<span class="market-badge-lg badge-aktif">🟢 Status Operasional: Aktif</span>'
        elif status == "tidak-aktif":
            badge_markup = '<span class="market-badge-lg badge-tidak-aktif">⚫ Status Operasional: Tidak Aktif / Tidak Beroperasi</span>'
        else:
            badge_markup = '<span class="market-badge-lg badge-verifikasi">🟠 Status Operasional: Perlu Verifikasi Lapangan</span>'

        alt_name_markup = f'<div style="color: #FDE047; font-size: 0.95rem; font-weight: 700;">Dikenal Masyarakat: {m.get("namaAlternatif")}</div>' if m.get("namaAlternatif") else ''
        
        # Meta
        meta_title = f"{name} | Direktori Pasar Disperindag ESDM Pinrang"
        meta_desc = f"Profil {name}, Kecamatan {m.get('kecamatan')}, Kabupaten Pinrang. Status operasional: {m.get('statusLabel')}. {m.get('deskripsi')[:120]}"
        canonical_url = f"https://disperindagesdm-pinrang.web.app/pasar/{slug}"
        og_image = f"https://disperindagesdm-pinrang.web.app/{m.get('fotoUtama') or 'assets/banner/pasar_sentral_pinrang_clean_hd.jpg'}"

        # Schedule
        if status == "aktif" and m.get("hariPasar"):
            market_days = ", ".join(m.get("hariPasar"))
        elif status == "tidak-aktif":
            market_days = "Tidak Beroperasi"
        else:
            market_days = "Data sedang diperbarui"

        operating_hours = m.get("jamOperasional") or ("Tidak Beroperasi" if status == "tidak-aktif" else "Data sedang diperbarui")
        unit_manager = m.get("unitPengelola") or "Dalam konfirmasi internal dinas"
        village = m.get("desaKelurahan") or "Dalam konfirmasi"
        address = m.get("alamat") or f"Kecamatan {m.get('kecamatan')}, Kabupaten Pinrang"

        # Facilities & Commodities Markup
        facilities = m.get("fasilitas", [])
        commodities = m.get("komoditasUtama", [])
        facilities_markup = ""
        if facilities or commodities:
            comms_html = "".join([f'<span style="background: #EFF6FF; color: #1E40AF; padding: 4px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 700;">{c}</span>' for c in commodities]) if commodities else '<span style="color: #64748B; font-size: 0.86rem;">Data komoditas dalam pemutakhiran</span>'
            facs_html = "".join([f'<li style="margin-bottom: 4px;">{f}</li>' for f in facilities]) if facilities else '<li style="color: #64748B;">Data sarana fasilitas dalam pemutakhiran</li>'
            facilities_markup = f"""
            <div class="info-card-box">
              <h2 style="font-size: 1.25rem; font-weight: 900; color: var(--primary-deep); margin: 0 0 14px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px;">
                Komoditas Utama &amp; Sarana Fasilitas
              </h2>
              <div style="margin-bottom: 16px;">
                <div class="info-item-label" style="margin-bottom: 8px;">Komoditas Utama Pasar</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">{comms_html}</div>
              </div>
              <div>
                <div class="info-item-label" style="margin-bottom: 8px;">Fasilitas &amp; Kelengkapan</div>
                <ul style="margin: 0; padding-left: 20px; font-size: 0.88rem; color: #334155; line-height: 1.6;">{facs_html}</ul>
              </div>
            </div>
            """

        # Sources Markup
        sources = m.get("sumber", [])
        if sources:
            sources_markup = "".join([
                f'<div class="source-pill"><div><div style="font-weight: 800; font-size: 0.88rem; color: #0F172A;">📖 {s.get("judul")}</div><div style="font-size: 0.78rem; color: #64748B;">Instansi: {s.get("instansi")} • Tahun: {s.get("tahun")}</div></div></div>'
                for s in sources
            ])
        else:
            sources_markup = '<div style="font-size: 0.86rem; color: #64748B;">Dokumen inventarisasi internal Disperindag ESDM Pinrang.</div>'

        # Stalls summary
        stalls_summary_markup = ""
        if m.get("jumlahKios"):
            stalls_summary_markup = f"""
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 12px; margin-top: 14px;">
              <div style="font-size: 0.76rem; font-weight: 800; color: #166534; text-transform: uppercase;">Kapasitas Sarana Terverifikasi</div>
              <div style="font-size: 1.15rem; font-weight: 900; color: #15803D; margin-top: 2px;">{m.get("jumlahKios")} Lapak / Kios Aktif</div>
            </div>
            """

        import urllib.parse
        encoded_name = urllib.parse.quote(name)

        html_out = template.format(
            meta_title=meta_title,
            meta_desc=meta_desc,
            canonical_url=canonical_url,
            og_image=og_image,
            market_name=name,
            market_name_encoded=encoded_name,
            badge_markup=badge_markup,
            alt_name_markup=alt_name_markup,
            district=m.get("kecamatan"),
            photo_src=m.get("fotoUtama") or "assets/banner/pasar_sentral_pinrang_clean_hd.jpg",
            description=m.get("deskripsi") or "Data profil pasar sedang dalam tahap pemutakhiran.",
            verification_note=m.get("catatanVerifikasi") or "Data operasional diverifikasi berkala.",
            history_text=m.get("sejarahSingkat") or f"{name} tercatat dalam database sarana perdagangan daerah Kabupaten Pinrang.",
            klasifikasi_historis=m.get("klasifikasiHistoris") or "Data sedang diperbarui",
            dasar_klasifikasi=m.get("dasarKlasifikasi") or "Regulasi Daerah",
            facilities_markup=facilities_markup,
            sources_markup=sources_markup,
            verified_date=m.get("tanggalVerifikasi") or "28 Agustus 2026",
            data_year=m.get("tahunData") or "2026",
            status_label=m.get("statusLabel") or "Perlu Verifikasi",
            village=village,
            market_days=market_days,
            operating_hours=operating_hours,
            unit_manager=unit_manager,
            stalls_summary_markup=stalls_summary_markup,
            address=address
        )
        footer_partial = (Path(__file__).resolve().parent / "partials" / "footer.html").read_text(encoding="utf-8").strip()
        html_out = re.sub(r'<footer\s+class="(?:main-footer|footer)"[^>]*>[\s\S]*?</footer>', footer_partial, html_out, count=1)

        # Simpan ke pasar/<slug>/index.html
        market_dir = os.path.join("pasar", slug)
        os.makedirs(market_dir, exist_ok=True)
        with open(os.path.join(market_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(html_out)

        # Simpan juga ke pasar/<id>/index.html jika id berbeda dari slug
        market_id = m.get("id")
        if market_id and market_id != slug:
            market_id_dir = os.path.join("pasar", market_id)
            os.makedirs(market_id_dir, exist_ok=True)
            with open(os.path.join(market_id_dir, "index.html"), "w", encoding="utf-8") as f:
                f.write(html_out)

        print(f"Generated page for: {name} -> pasar/{slug}/index.html")

if __name__ == "__main__":
    build_market_pages()
