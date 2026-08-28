import os
import json
import re

SITE_URL = "https://disperindagesdm-pinrang.web.app"
DEFAULT_SHARE_IMG = f"{SITE_URL}/assets/social/default-share.jpg"

# Baca data berita dari js/data.js
with open("js/data.js", "r", encoding="utf-8") as f:
    data_content = f.read()

# Ekstrak objek DEFAULT_NEWS
news_match = re.search(r'const DEFAULT_NEWS\s*=\s*(\[[\s\S]*?\]);', data_content)
if not news_match:
    raise ValueError("DEFAULT_NEWS tidak ditemukan di js/data.js")

news_json_str = news_match.group(1)
# Bersihkan trailing commas dan parsing
# Karena news_json_str adalah valid JS object literal, kita gunakan regex parser atau regex extracting
import ast

# Baca template dari berita.html
with open("berita.html", "r", encoding="utf-8") as f:
    berita_template = f.read()

# Definisikan data berita secara terstruktur
ARTICLES = [
    {
        "id": "news_01",
        "slug": "tindak-lanjuti-aduan-warga-pangkalan-lpg-3-kg-nakal-di-duampanua-dijatuhi-sanksi-tegas-phu",
        "title": "Tindak Lanjuti Aduan Warga, Pangkalan LPG 3 Kg Nakal di Duampanua Dijatuhi Sanksi Tegas PHU",
        "category": "Perindustrian, Energi & SDM",
        "date": "21 Agustus 2026",
        "publishedAt": "2026-08-21T10:00:00+08:00",
        "author": "Bidang Perindustrian & ESDM",
        "img": "assets/news/sidak_lpg3kg_pinrang_hd.jpg",
        "excerpt": "Disperindag ESDM Pinrang bersama agen penyalur Pertamina menjatuhkan sanksi Pemutusan Hubungan Usaha (PHU) kepada pangkalan nakal di Desa Bungi, Kec. Duampanua yang terbukti menjual gas melon di atas HET resmi.",
        "content": """PINRANG — Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral (Disperindag ESDM) Kabupaten Pinrang bergerak cepat menindaklanjuti aduan masyarakat terkait pangkalan gas elpiji 3 kg bersubsidi di Desa Bungi, Kecamatan Duampanua yang menolak melayani warga sekitar dan menjual di atas Harga Eceran Tertinggi (HET).

Kepala Dinas Perindag ESDM Kabupaten Pinrang, Muhammad Yusuf Nur, S.STP., M.Si., menegaskan bahwa pemerintah daerah bersama agen resmi Pertamina tidak mentolerir segala bentuk penyelewengan distribusi energi bersubsidi yang menjadi hak masyarakat prasejahtera dan pelaku usaha mikro.

"Setelah menerima informasi dan aduan dari masyarakat, tim pengawas ESDM kami langsung turun ke lapangan bersama pihak agen penyalur resmi. Berdasarkan hasil pemeriksaan, pangkalan tersebut terbukti melanggar nota kesepakatan (MoU) dan menjual gas melon seharga Rp 25.000 per tabung, jauh di atas HET pangkalan resmi Pergub Sulsel sebesar Rp 18.500. Sanksi tegas berupa Pemutusan Hubungan Usaha (PHU/PHK) langsung dijatuhkan oleh agen penyalur," tegas Kepala Dinas Perindag ESDM Pinrang.

Dinas mengimbau kepada seluruh masyarakat Kabupaten Pinrang untuk tidak ragu melaporkan pangkalan yang menjual di atas HET resmi Rp 18.500 atau menolak melayani warga setempat melalui kanal pengaduan resmi WhatsApp di nomor 0823 1600 2226 atau portal SP4N-LAPOR!."""
    },
    {
        "id": "news_02",
        "slug": "kawal-kepatuhan-het-disperindag-esdm-pinrang-gelar-rakor-bersama-agen-lpg-dan-usulkan-kuota-khusus-petani",
        "title": "Kawal Kepatuhan HET, Disperindag ESDM Pinrang Gelar Rakor Bersama Agen LPG dan Usulkan Kuota Khusus Petani",
        "category": "Perindustrian, Energi & SDM",
        "date": "24 Agustus 2026",
        "publishedAt": "2026-08-24T09:30:00+08:00",
        "author": "Bidang Perindustrian & ESDM",
        "img": "assets/news/forum_konsultasi_publik_pelayanan_pinrang.jpg",
        "excerpt": "Guna mencegah kelangkaan di musim tanam, Disperindag ESDM mengumpulkan seluruh agen penyalur LPG 3 kg se-Kabupaten Pinrang dalam rapat koordinasi teknis evaluasi distribusi kuota.",
        "content": """PINRANG — Bertempat di Aula Kantor Disperindag ESDM Kabupaten Pinrang, jajaran pimpinan dinas menggelar Rapat Koordinasi Teknis Pengawasan Pendistribusian Liquefied Petroleum Gas (LPG) Tabung 3 Kg bersama pimpinan 9 agen resmi yang beroperasi di wilayah Kabupaten Pinrang.

Rapat koordinasi ini dipimpin langsung oleh Kepala Dinas Perindag ESDM Pinrang, didampingi Kepala Bidang Perindustrian dan ESDM, serta dihadiri oleh seluruh perwakilan agen penyalur.

Fokus utama rakor ini adalah penegakan sistem pencatatan digital Merchant Apps Pertamina (MAP), ketertiban logbook pangkalan, serta pengawasan berkala agar kuota elpiji 3 kg bersubsidi benar-benar terserap oleh rumah tangga prasejahtera, usaha mikro, nelayan sasaran, dan petani pemakai pompa air sawah.

"Dalam rakor ini, kami juga merumuskan usulan pemisahan alokasi kuota khusus sektor pertanian ke Pertamina dan kementerian teknis, mengingat kebutuhan petani di Pinrang saat masa tanam dan pengairan sawah sangat tinggi, sehingga tidak mengganggu jatah konsumsi rumah tangga," jelas Kadis Perindag ESDM."""
    },
    {
        "id": "news_03",
        "slug": "jamin-transaksi-adil-perlindungan-konsumen-bidang-kemetrologian-gelar-sidang-tera-ulang-timbangan-pasar-dan-spbu",
        "title": "Jamin Transaksi Adil & Perlindungan Konsumen, Bidang Kemetrologian Gelar Sidang Tera Ulang Timbangan Pasar dan SPBU",
        "category": "Kemetrologian",
        "date": "15 Agustus 2026",
        "publishedAt": "2026-08-15T08:30:00+08:00",
        "author": "Bidang Kemetrologian",
        "img": "assets/news/tera_uttp_spbu_hd.jpg",
        "excerpt": "Memastikan takaran BBM presisi dan timbangan pedagang pasar akurat, Petugas Penera Ahli Disperindag Pinrang menggelar sidang tera ulang UTTP di Pasar Sentral dan SPBU jalur poros.",
        "content": """PINRANG — Dalam rangka mewujudkan Kabupaten Pinrang sebagai Daerah Tertib Ukur serta menjamin kepastian takaran bagi masyarakat konsumen, Bidang Kemetrologian Disperindag ESDM Pinrang menggelar rangkaian Sidang Tera dan Tera Ulang Alat Ukur, Takar, Timbang, dan Perlengkapannya (UTTP).

Kegiatan tera menyasar timbangan meja, timbangan elektronik, dan timbangan gantung milik pedagang di Pasar Sentral Pinrang dan Pasar Pekkabata, serta pengujian nozel dispenser BBM di seluruh SPBU sepanjang jalur poros trans Sulawesi.

Petugas Penera Ahli melakukan pengujian teknis menggunakan bejana ukur standar 20 liter dan anak timbang standar berkalibrasi nasional. Setiap alat UTTP yang memenuhi Batas Kesalahan yang Diizinkan (BKD) dibubuhi Cap Tanda Tera Sah Tahun 2026, sedangkan alat yang mengalami pergeseran akurasi langsung dilakukan justir dan perbaikan di lokasi.

"Pelayanan tera ini merupakan bentuk kehadiran pemerintah daerah dalam melindungi hak konsumen dan memberikan kepastian hukum bagi para pelaku usaha," ungkap Kepala Bidang Kemetrologian."""
    },
    {
        "id": "news_04",
        "slug": "kendalikan-inflasi-pangan-pemkab-pinrang-dan-disperindag-esdm-gelar-operasi-pasar-beras-sphp-di-pasar-sentral",
        "title": "Kendalikan Inflasi Pangan, Pemkab Pinrang dan Disperindag ESDM Gelar Operasi Pasar Beras SPHP di Pasar Sentral",
        "category": "Pengembangan Perdagangan",
        "date": "10 Agustus 2026",
        "publishedAt": "2026-08-10T09:00:00+08:00",
        "author": "Bidang Pengembangan Perdagangan",
        "img": "assets/news/pasar_sentral_pinrang_clean_hd.jpg",
        "excerpt": "Tim Pengendali Inflasi Daerah (TPID) bersama Disperindag ESDM dan Perum Bulog menyalurkan beras program SPHP seharga Rp 12.500/kg guna menjaga stabilitas harga pangan pokok.",
        "content": """PINRANG — Menindaklanjuti arahan Tim Pengendalian Inflasi Daerah (TPID) Kabupaten Pinrang dalam menjaga stabilitas daya beli masyarakat, Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang bekerja sama dengan Perum Bulog Cabang Pinrang menggelar Gerakan Pangan Murah (GPM) dan Operasi Pasar Khusus Beras SPHP di pelataran Pasar Sentral Pinrang.

Dalam operasi pasar ini, sebanyak 10 ton beras Stabilisasi Pasokan dan Harga Pangan (SPHP) kualitas medium kemasan 5 kg disalurkan langsung kepada masyarakat dengan harga sesuai ketetapan pemerintah yakni Rp 12.500 per kilogram atau Rp 62.500 per sak 5 kg.

Kepala Bidang Pengembangan Perdagangan menyampaikan bahwa pemantauan harga bahan pokok dan penting (bapokting) dilakukan setiap pagi oleh enumerator dinas di 12 komoditas pangan utama.

"Melalui intervensi operasi pasar beras SPHP dan pemantauan harian ini, stabilitas harga pangan daerah di Kabupaten Pinrang dapat terus terjaga secara baik," tuturnya."""
    },
    {
        "id": "news_05",
        "slug": "akselerasi-umkm-naik-kelas-disperindag-pinrang-fasilitasi-sertifikasi-halal-gratis-dan-akun-siinas-bagi-pelaku-ikm",
        "title": "Akselerasi UMKM Naik Kelas, Disperindag Pinrang Fasilitasi Sertifikasi Halal Gratis dan Akun SIINas bagi Pelaku IKM",
        "category": "Perindustrian, Energi & SDM",
        "date": "04 Agustus 2026",
        "publishedAt": "2026-08-04T11:00:00+08:00",
        "author": "Bidang Perindustrian & ESDM",
        "img": "assets/news/sosialisasi_tkdn_ikm_pinrang_hd.jpg",
        "excerpt": "Klinik Fasilitasi IKM Disperindag Pinrang mendampingi puluhan pelaku usaha olahan kopi, bandeng, dan kue tradisional mendapatkan sertifikasi Halal dan akun SIINas Kemenperin.",
        "content": """PINRANG — Upaya memperkuat legalitas dan daya saing produk Industri Kecil dan Menengah (IKM) terus digencarkan oleh Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang melalui pembukaan Klinik Layanan Fasilitasi IKM.

Melalui program ini, sebanyak 45 pelaku IKM olahan pangan lokal—seperti pengrajin kopi Basseang, abon bandeng Suppa, dan kue karasa—didampingi secara intensif untuk penerbitan Nomor Induk Berusaha (NIB) berbasis risiko, pembuatan akun resmi SIINas di portal Kementerian Perindustrian RI, serta pendaftaran Sertifikasi Halal Gratis (SEHATI) melalui BPJPH Kementerian Agama.

"Dengan kepemilikan sertifikat Halal, izin edar P-IRT, dan sertifikasi Tingkat Komponen Dalam Negeri (TKDN-IKM), produk-produk unggulan Bumi Lasinrang memiliki keunggulan kompetitif untuk masuk ke etalase toko ritel modern serta e-Katalog Pengadaan Barang dan Jasa Pemerintah," jelas Kepala Bidang Perindustrian."""
    },
    {
        "id": "news_06",
        "slug": "sinergi-dekranasda-dan-disperindag-pinrang-promosikan-tenun-sutra-corak-laburasseng-di-ajang-pameran-nasional",
        "title": "Sinergi Dekranasda dan Disperindag Pinrang Promosikan Tenun Sutra Corak Laburasseng di Ajang Pameran Nasional",
        "category": "Perindustrian, Energi & SDM",
        "date": "22 Juli 2026",
        "publishedAt": "2026-07-22T13:00:00+08:00",
        "author": "Dekranasda & Humas Disperindag",
        "img": "assets/banner/tenun_sutra_pinrang_hd.jpg",
        "excerpt": "Kain tenun sutra tradisional motif corak Laburasseng karya pengrajin Mattiro Sompe binaan Dekranasda dan Disperindag Pinrang tampil memukau pada pameran kerajinan nasional.",
        "content": """JAKARTA — Produk kerajinan kain tenun sutra tradisional motif corak Laburasseng khas Kabupaten Pinrang tampil memukau dalam ajang Pameran Kerajinan Nusantara yang diselenggarakan di Jakarta Convention Center.

Keikutsertaan ini merupakan wujud sinergi dan kolaborasi strategis antara Dewan Kerajinan Nasional Daerah (Dekranasda) Kabupaten Pinrang bersama Disperindag ESDM Kabupaten Pinrang dalam melestarikan sekaligus memperluas jangkauan pasar produk kriya dan wastra daerah.

Kain tenun sutra yang dipamerkan merupakan mahakarya para penenun tradisional di Kecamatan Mattiro Sompe dan Suppa yang menggunakan Alat Tenun Bukan Mesin (ATBM) dengan pewarna ramah lingkungan, serta telah resmi mengantongi perlindungan Hak Kekayaan Intelektual (HAKI) dari Kemenkumham RI.

Apresiasi tinggi datang dari para pemerhati wastra nusantara atas kehalusan tenunan, keanggunan motif Laburasseng, dan keaslian benang sutra khas Bumi Lasinrang."""
    },
    {
        "id": "news_07",
        "slug": "kopi-robusta-pinrang",
        "title": "Kopi Robusta Pinrang: Menembus Pasar Ekspor dengan Mutu Petik Merah Dataran Tinggi Basseang",
        "category": "Perindustrian & IKM",
        "date": "25 Agustus 2026",
        "publishedAt": "2026-08-25T10:30:00+08:00",
        "author": "Bidang Perindustrian & ESDM",
        "img": "assets/news/kopi_robusta_pinrang_murni_hd.jpg",
        "excerpt": "Informasi mengenai potensi dan pengembangan Kopi Robusta pegunungan Basseang dan Benteng Paremba Kabupaten Pinrang menuju pasar nasional dan ekspor.",
        "content": """PINRANG — Potensi komoditas kopi robusta yang tumbuh subur di wilayah dataran tinggi pegunungan Basseang dan Benteng Paremba, Kecamatan Lembang, Kabupaten Pinrang kini semakin diminati para penikmat kopi nasional dan pelaku industri ekspor.

Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang secara berkelanjutan memberikan bimbingan teknis pasca-panen berbasis standar petik merah (*red cherries*), pengeringan higienis, serta proses sangrai modern guna menghasilkan cita rasa kopi yang konsisten dan berkarakter kuat.

"Kopi Robusta Pinrang memiliki keunggulan geografis dengan ketinggian di atas 800–1.200 mdpl, menghasilkan profil aroma cokelat gelap, rempah alami, serta tingkat keasaman rendah yang sangat disukai pasar kopi modern," jelas Kepala Dinas Perindag ESDM Pinrang.

Selain pendampingan mutu, dinas juga memfasilitasi legalitas P-IRT, Sertifikasi Halal BPJPH, pendaftaran akun SIINas, hingga desain kemasan berstandar ekspor agar produk kopi petani Pinrang memiliki nilai tambah yang optimal."""
    },
    {
        "id": "news_08",
        "slug": "pasar-murah-pinrang",
        "title": "Gerakan Pangan Murah (GPM) Tanggap Inflasi Digelar Serentak di 12 Kecamatan Pinrang",
        "category": "Pengembangan Perdagangan",
        "date": "23 Agustus 2026",
        "publishedAt": "2026-08-23T08:00:00+08:00",
        "author": "Bidang Pengembangan Perdagangan",
        "img": "assets/banner/pameran_gelar_dagang_pinrang_hd.jpg",
        "excerpt": "Pemerintah Kabupaten Pinrang melalui Disperindag ESDM menggelar operasi pasar murah beras SPHP, minyakita, gula pasir dan telur guna menjaga stabilitas harga pangan.",
        "content": """PINRANG — Menjawab kebutuhan masyarakat akan pasokan bahan pokok dengan harga terjangkau, Pemerintah Kabupaten Pinrang melalui Disperindag ESDM berkolaborasi dengan Perum Bulog dan distributor resmi menggelar Gerakan Pangan Murah (GPM) serentak di 12 kecamatan se-Kabupaten Pinrang.

Berbagai komoditas kebutuhan pokok dijual langsung di bawah harga pasar harian, antara lain Beras SPHP Rp 12.500/kg, Minyakita Rp 15.700/liter, Gula Pasir Kristal Rp 17.500/kg, dan Telur Ayam Ras Rp 50.000/rak.

"Program ini merupakan wujud komitmen nyata Tim Pengendalian Inflasi Daerah (TPID) Kabupaten Pinrang dalam memastikan ketersediaan pasokan, keterjangkauan harga, serta kelancaran distribusi logistik pangan pokok bagi seluruh lapisan masyarakat," tutur Kepala Bidang Pengembangan Perdagangan."""
    },
    {
        "id": "news_09",
        "slug": "monitoring-harga-pangan",
        "title": "Pantauan Harian Bapokting: Pasokan Pangan Melimpah, Deviasi Harga Pasar Sentral Terkendali Stabil",
        "category": "Pengembangan Perdagangan",
        "date": "26 Agustus 2026",
        "publishedAt": "2026-08-26T09:00:00+08:00",
        "author": "Bidang Pengembangan Perdagangan",
        "img": "assets/news/pasar_sentral_pinrang_clean_hd.jpg",
        "excerpt": "Hasil survei harian 12 komoditas pangan pokok oleh Tim Pengawas Perdagangan Disperindag ESDM Pinrang di Pasar Sentral menunjukkan tren harga stabil dan terkendali.",
        "content": """PINRANG — Tim Enumerator dan Pengawas Perdagangan Disperindag ESDM Kabupaten Pinrang kembali merilis data resmi pemantauan harga harian 12 komoditas bahan pokok dan penting (bapokting) di Pasar Sentral Pinrang, Pasar Pekkabata, dan Pasar Marawi per 26 Agustus 2026.

Berdasarkan hasil survei lapangan, indeks stabilitas harga komoditas pangan pokok berada pada tingkat sangat terkendali dengan deviasi inflasi bulanan sebesar 2.1%. Pasokan beras premium lokal tercatat mengalami penurunan harga sebesar Rp 500/kg menjadi Rp 14.500/kg seiring bergulirnya masa panen raya di Kecamatan Patampanua dan Duampanua.

Masyarakat dan pelaku usaha dapat memantau perkembangan harga harian terverifikasi secara langsung dan transparan melalui portal resmi website Disperindag ESDM Pinrang dan TV Wallboard Command Center yang diperbarui setiap pukul 09.00 WITA."""
    }
]

def generate_article_html(art, canonical_url):
    img_abs = f"{SITE_URL}/{art['img']}" if not art['img'].startswith('http') else art['img']
    paragraphs = art['content'].split('\n\n')
    body_html = "".join([f"<p>{p.replace(chr(10), '<br>')}</p>" for p in paragraphs])
    
    # Generate related items
    others = [o for o in ARTICLES if o['id'] != art['id']][:4]
    related_html = "".join([f'''
        <div style="display: flex; gap: 12px; align-items: center;">
          <img src="{SITE_URL}/{o['img']}" style="width: 60px; height: 48px; object-fit: cover; border-radius: 6px; flex-shrink: 0;" alt="Thumb" onerror="this.src='{SITE_URL}/assets/banner/pasar_sentral_pinrang_clean_hd.jpg'">
          <div>
            <a href="{SITE_URL}/berita/{o['slug']}" style="font-size: 0.84rem; font-weight: 800; color: var(--primary-deep); text-decoration: none; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              {o['title']}
            </a>
            <div style="font-size: 0.72rem; color: #94A3B8; margin-top: 2px;">📅 {o['date']}</div>
          </div>
        </div>''' for o in others])

    html = f'''<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{art['title']} | Disperindag ESDM Kabupaten Pinrang</title>
  <meta name="description" content="{art['excerpt']}">
  <link rel="canonical" href="{canonical_url}">
  
  <!-- OPEN GRAPH & MEDSOS SHARING DINAMIS (STATIC PRERENDERED) -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Disperindag ESDM Kabupaten Pinrang">
  <meta property="og:title" content="{art['title']}">
  <meta property="og:description" content="{art['excerpt']}">
  <meta property="og:image" content="{img_abs}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="{art['title']}">
  <meta property="og:url" content="{canonical_url}">
  <meta property="og:locale" content="id_ID">
  <meta property="article:published_time" content="{art['publishedAt']}">
  <meta property="article:author" content="Disperindag ESDM Kabupaten Pinrang">
  <meta property="article:section" content="{art['category']}">
  
  <!-- TWITTER / X CARDS -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{art['title']}">
  <meta name="twitter:description" content="{art['excerpt']}">
  <meta name="twitter:image" content="{img_abs}">

  <link rel="icon" type="image/png" href="{SITE_URL}/assets/brand/logo_pinrang_opt.png">
  <link rel="shortcut icon" type="image/x-icon" href="{SITE_URL}/favicon.ico">
  <link rel="apple-touch-icon" href="{SITE_URL}/assets/brand/logo_pinrang_opt.png">
  <link rel="stylesheet" href="{SITE_URL}/css/style.css">
  <link rel="stylesheet" href="{SITE_URL}/css/modal-system.css">
  <style>
    .article-page {{ padding: 40px 0 60px; }}
    .breadcrumb {{ display: flex; align-items: center; gap: 8px; font-size: 0.84rem; color: var(--text-muted); margin-bottom: 24px; flex-wrap: wrap; }}
    .breadcrumb a {{ color: var(--primary); font-weight: 700; text-decoration: none; }}
    .breadcrumb a:hover {{ color: var(--accent-gold-dark); text-decoration: underline; }}
    .article-layout {{ display: grid; grid-template-columns: 1.8fr 1fr; gap: 36px; align-items: start; }}
    .article-main {{ background: #FFFFFF; border-radius: var(--radius-lg); padding: 36px; border: 1.5px solid var(--border-subtle); box-shadow: var(--shadow-sm); }}
    .article-title {{ font-size: 1.85rem; font-weight: 900; color: var(--primary-deep); line-height: 1.3; margin: 14px 0 16px; }}
    .article-cover {{ width: 100%; height: 380px; border-radius: var(--radius-md); overflow: hidden; margin: 20px 0; }}
    .article-cover img {{ width: 100%; height: 100%; object-fit: cover; }}
    .article-body-text {{ font-size: 0.95rem; line-height: 1.8; color: #334155; }}
    .article-body-text p {{ margin-bottom: 18px; }}
    @media (max-width: 900px) {{ .article-layout {{ grid-template-columns: 1fr; }} .article-main {{ padding: 24px; }} .article-cover {{ height: 240px; }} }}
  </style>
</head>
<body>

  <!-- 1. TOPBAR -->
  <header class="topbar">
    <div class="container">
      <div class="topbar-left">
        <span class="live-indicator"></span>
        <span id="currentDate">Portal Berita & Dokumentasi Kedinasan</span>
      </div>

      <div class="topbar-right-actions">
        <form class="topbar-search-form" id="globalSearchForm" action="{SITE_URL}/search.html" method="GET">
          <input type="text" id="globalSearchInput" name="q" class="topbar-search-input" placeholder="Cari berita, rilis..." aria-label="Pencarian Global">
          <button type="submit" class="topbar-search-btn" aria-label="Tombol Cari">🔍</button>
        </form>

        <div class="login-gateway-wrapper">
          <button class="btn-topbar-login" type="button">
            <span>🔐</span> Portal Pegawai <span class="caret-down">▾</span>
          </button>
          <div class="login-dropdown-menu">
            <a href="{SITE_URL}/login.html" class="login-drop-item">
              <div class="drop-item-icon" style="background: #FEF3C7; color: #B45309;">🔐</div>
              <div><strong>Masuk Akun Pegawai</strong><small>Autentikasi keamanan ASN</small></div>
            </a>
            <div class="dropdown-divider"></div>
            <a href="{SITE_URL}/petugas.html" class="login-drop-item">
              <div class="drop-item-icon mobile-badge">📱</div>
              <div><strong>Aplikasi Petugas Lapangan</strong><small>Input harga pasar, sidak LPG & tera</small></div>
            </a>
            <div class="dropdown-divider"></div>
            <a href="{SITE_URL}/admin.html" class="login-drop-item">
              <div class="drop-item-icon desktop-badge">💻</div>
              <div><strong>CMS Administrator</strong><small>Kelola konten kedinasan</small></div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- 2. NAVBAR UTAMA -->
  <nav class="navbar">
    <div class="container">
      <a href="{SITE_URL}/index.html" class="brand-logo">
        <img src="{SITE_URL}/assets/brand/logo_pinrang_opt.png" alt="Logo Pemkab Pinrang">
        <div class="brand-text">
          <h1>DISPERINDAG ESDM</h1>
          <p>KABUPATEN PINRANG</p>
        </div>
      </a>

      <button class="mobile-toggle" id="mobileMenuBtn" aria-label="Buka Navigasi Menu">☰</button>

      <ul class="nav-menu" id="navMenu">
        <li><a href="{SITE_URL}/index.html" class="nav-link">Beranda</a></li>
        <li><a href="{SITE_URL}/profil.html" class="nav-link">Profil</a></li>
        <li><a href="{SITE_URL}/layanan.html" class="nav-link">Layanan Publik</a></li>
        <li><a href="{SITE_URL}/index.html#transparansi-pelayanan" class="nav-link">Transparansi</a></li>
        <li><a href="{SITE_URL}/arsip-berita.html" class="nav-link active">Berita</a></li>
      </ul>
    </div>
  </nav>

  <!-- 3. MAIN ARTICLE PAGE -->
  <main class="article-page">
    <div class="container">
      
      <!-- BREADCRUMB -->
      <div class="breadcrumb">
        <a href="{SITE_URL}/index.html">Beranda</a>
        <span>&rsaquo;</span>
        <a href="{SITE_URL}/arsip-berita.html">Arsip Berita</a>
        <span>&rsaquo;</span>
        <span id="breadcrumbCategory" style="color: var(--primary); font-weight: 700;">{art['category']}</span>
      </div>

      <div class="article-layout">
        
        <!-- KOLOM UTAMA: DETAIL BERITA -->
        <article class="article-main" id="articleContainer">
          <span class="badge-cat" style="background: #EFF6FF; color: #1D4ED8; font-weight: 800; font-size: 0.8rem; padding: 4px 10px; border-radius: 6px;">
            {art['category']}
          </span>
          <h1 class="article-title">{art['title']}</h1>
          
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid #E2E8F0; font-size: 0.82rem; color: #64748B; flex-wrap: wrap; gap: 10px;">
            <div>📅 {art['date']} &bull; ✍️ Oleh: <strong>{art['author']}</strong></div>
            <span class="verified-badge" style="background: #ECFDF5; color: #059669; font-weight: 800; padding: 4px 8px; border-radius: 4px; border: 1px solid #A7F3D0;">✓ Rilis Resmi Kedinasan</span>
          </div>

          <div class="article-cover">
            <img src="{SITE_URL}/{art['img']}" alt="{art['title']}" onerror="this.src='{SITE_URL}/assets/banner/pasar_sentral_pinrang_clean_hd.jpg'">
          </div>

          <div class="article-body-text">
            {body_html}
          </div>

          <div style="margin-top: 36px; padding-top: 20px; border-top: 2px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <a href="{SITE_URL}/arsip-berita.html" class="btn-outline" style="padding: 8px 16px; font-size: 0.85rem; text-decoration: none; border: 1.5px solid var(--border-subtle); border-radius: 6px; color: var(--primary-deep); font-weight: 700;">
              &larr; Kembali ke Arsip Berita
            </a>
            <button onclick="shareArticle()" class="btn-primary" style="padding: 8px 18px; font-size: 0.85rem; background: var(--accent-gold, #FACC15); color: #030D1B; border: none; border-radius: 6px; font-weight: 800; cursor: pointer;">
              <span>🔗</span> Bagikan Rilis
            </button>
          </div>
        </article>

        <!-- SIDEBAR: BERITA TERKAIT & BANNER LAYANAN -->
        <aside class="article-sidebar">
          
          <div style="background: #FFFFFF; border-radius: var(--radius-lg); padding: 24px; border: 1.5px solid var(--border-subtle); box-shadow: var(--shadow-sm); margin-bottom: 24px;">
            <h3 style="font-size: 1.05rem; font-weight: 900; color: var(--primary-deep); margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid var(--accent-gold);">
              📰 Rilis Berita Terkait
            </h3>
            <div style="display: flex; flex-direction: column; gap: 14px;" id="relatedNewsList">
              {related_html}
            </div>
          </div>

          <!-- BANNER PORTAL PENGADUAN -->
          <div style="background: linear-gradient(135deg, #0F2C59 0%, #1E3A8A 100%); border-radius: var(--radius-lg); padding: 24px; color: #FFFFFF; box-shadow: var(--shadow-md);">
            <div style="font-size: 1.5rem; margin-bottom: 8px;">📢</div>
            <h4 style="font-size: 1.05rem; font-weight: 900; margin-bottom: 8px;">Punya Informasi / Aduan?</h4>
            <p style="font-size: 0.82rem; color: #CBD5E1; line-height: 1.6; margin-bottom: 16px;">
              Laporkan kelangkaan LPG 3 Kg, penipuan timbangan UTTP, atau lonjakan harga pangan melalui saluran resmi terpadu.
            </p>
            <a href="{SITE_URL}/index.html#pengaduan" class="btn-primary" style="display: block; text-align: center; font-size: 0.82rem; padding: 8px 14px; background: var(--accent-gold); color: #030D1B; font-weight: 800; text-decoration: none; border-radius: 6px;">
              Kirim Pengaduan &rarr;
            </a>
          </div>

        </aside>

      </div>

    </div>
  </main>

  <!-- 4. FOOTER RESMI -->
  <footer class="main-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
            <img src="{SITE_URL}/assets/brand/logo_pinrang_opt.png" alt="Logo Kabupaten Pinrang" style="width: 44px; height: auto;">
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
            <li><a href="{SITE_URL}/layanan.html">Standar Pelayanan & SOP</a></li>
            <li><a href="{SITE_URL}/maklumat-pelayanan.html">Maklumat Pelayanan</a></li>
            <li><a href="{SITE_URL}/index.html#pengaduan">Formulir Pengaduan</a></li>
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

  <script src="{SITE_URL}/js/data.js?v=20260828_upload_web_v2"></script>
  <script src="{SITE_URL}/js/modal-system.js?v=20260828_upload_web_v2"></script>
  <script src="{SITE_URL}/js/app.js?v=20260828_upload_web_v2"></script>
  <script>
    window.shareArticle = function() {{
      if (navigator.share) {{
        navigator.share({{
          title: "{art['title']}",
          url: "{canonical_url}"
        }}).catch(() => {{}});
      }} else {{
        navigator.clipboard.writeText("{canonical_url}");
        CustomModal.alert({{
          title: "Tautan Berhasil Disalin",
          message: "Tautan rilis berita resmi telah disalin ke papan klip (*clipboard*) Anda.",
          icon: "📋",
          type: "info"
        }});
      }}
    }};
  </script>
</body>
</html>'''
    return html

# Generate semua artikel berita ke direktori berita/<slug>/index.html
os.makedirs("berita", exist_ok=True)

for art in ARTICLES:
    # Generate untuk clean URL slug
    slug_dir = os.path.join("berita", art["slug"])
    os.makedirs(slug_dir, exist_ok=True)
    slug_file = os.path.join(slug_dir, "index.html")
    canonical_url = f"{SITE_URL}/berita/{art['slug']}"
    
    html_content = generate_article_html(art, canonical_url)
    with open(slug_file, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"Generated clean url: berita/{art['slug']}/index.html")
    
    # Generate untuk ID legacy (misal berita/news_01/index.html)
    id_dir = os.path.join("berita", art["id"])
    os.makedirs(id_dir, exist_ok=True)
    id_file = os.path.join(id_dir, "index.html")
    with open(id_file, "w", encoding="utf-8") as f:
        f.write(html_content)

print(f"Selesai me-render {len(ARTICLES)} artikel berita statis lengkap dengan Open Graph dan Twitter Cards.")
