import re

pages_meta = {
    "profil.html": {
        "title": "Profil & Tupoksi Organisasi | Disperindag ESDM Kabupaten Pinrang",
        "desc": "Profil resmi kelembagaan, visi, misi, struktur organisasi, dan rincian tupoksi Disperindag ESDM Kabupaten Pinrang berdasarkan Perbup No. 35 Tahun 2023.",
        "image": "https://disperindagesdm-pinrang.web.app/assets/brand/cover_profil.png",
        "url": "https://disperindagesdm-pinrang.web.app/profil",
        "type": "website"
    },
    "layanan.html": {
        "title": "Standar Pelayanan Publik & SOP Resmi | Disperindag ESDM Kabupaten Pinrang",
        "desc": "9 Standar Pelayanan Publik resmi Disperindag ESDM Pinrang: Perizinan Berusaha OSS, Distributor Pupuk Subsidi, Tera UTTP, Fasilitasi IKM, & Layanan Pasar.",
        "image": "https://disperindagesdm-pinrang.web.app/assets/brand/cover_layanan.png",
        "url": "https://disperindagesdm-pinrang.web.app/layanan",
        "type": "website"
    },
    "maklumat-pelayanan.html": {
        "title": "Maklumat Pelayanan MANTAP | Disperindag ESDM Kabupaten Pinrang",
        "desc": "Piagam Maklumat Pelayanan Resmi Disperindag ESDM Kabupaten Pinrang: Melayani Anda dengan Transparan, Adil, dan Profesional (MANTAP).",
        "image": "https://disperindagesdm-pinrang.web.app/assets/infografis/Maklumat_Pelayanan_Disperindag_ESDM.jpg",
        "url": "https://disperindagesdm-pinrang.web.app/maklumat-pelayanan",
        "type": "website"
    },
    "katalog-ikm.html": {
        "title": "Katalog Produk IKM Unggulan Daerah | Disperindag ESDM Kabupaten Pinrang",
        "desc": "Etalase produk unggulan IKM binaan Pinrang: Tenun Sutra Motif Laburasseng, Kopi Robusta Basseang, Abon Bandeng Suppa, dan Kerajinan Anyaman Serat Alam.",
        "image": "https://disperindagesdm-pinrang.web.app/assets/brand/cover_ikm.png",
        "url": "https://disperindagesdm-pinrang.web.app/katalog-ikm",
        "type": "website"
    },
    "ppid.html": {
        "title": "Portal PPID Pelaksana & Keterbukaan Informasi Publik | Disperindag ESDM Pinrang",
        "desc": "Layanan Keterbukaan Informasi Publik (PPID) berkala, serta merta, dan setiap saat Disperindag ESDM Kabupaten Pinrang sesuai UU KIP No. 14/2008.",
        "image": "https://disperindagesdm-pinrang.web.app/assets/brand/cover_ppid.png",
        "url": "https://disperindagesdm-pinrang.web.app/ppid",
        "type": "website"
    },
    "dokumen.html": {
        "title": "Repositori Dokumen & Regulasi Hukum Kedinasan | Disperindag ESDM Pinrang",
        "desc": "Unduh dokumen resmi: SK Standar Pelayanan, Maklumat, Perbup Tupoksi No. 35/2023, Renja, LKjIP, dan dokumen regulasi resmi Disperindag ESDM Pinrang.",
        "image": "https://disperindagesdm-pinrang.web.app/assets/brand/cover_dokumen.png",
        "url": "https://disperindagesdm-pinrang.web.app/dokumen",
        "type": "website"
    },
    "kontak.html": {
        "title": "Hubungi Kami & Saluran Komunikasi Resmi | Disperindag ESDM Kabupaten Pinrang",
        "desc": "Saluran komunikasi terpadu: WhatsApp 0823 1600 2226, email, media sosial, lokasi kantor Jl. Bintang No. 1 Pinrang, dan 8 kanal pengaduan masyarakat.",
        "image": "https://disperindagesdm-pinrang.web.app/assets/brand/cover_kontak.png",
        "url": "https://disperindagesdm-pinrang.web.app/kontak",
        "type": "website"
    },
    "arsip-berita.html": {
        "title": "Arsip Rilis Berita & Publikasi Kedinasan | Disperindag ESDM Kabupaten Pinrang",
        "desc": "Pusat rilis berita faktual dan dokumentasi kegiatan resmi Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang.",
        "image": "https://disperindagesdm-pinrang.web.app/assets/brand/cover_arsip_berita.png",
        "url": "https://disperindagesdm-pinrang.web.app/arsip-berita",
        "type": "website"
    },
    "command-center.html": {
        "title": "Command Center & Executive Wallboard | Disperindag ESDM Kabupaten Pinrang",
        "desc": "Executive Wallboard real-time: Pantauan harga 12 komoditas pangan pokok, metrologi legal, pengawasan gas LPG 3 kg, dan data industri 12 kecamatan Pinrang.",
        "image": "https://disperindagesdm-pinrang.web.app/assets/brand/cover_command_center.png",
        "url": "https://disperindagesdm-pinrang.web.app/command-center",
        "type": "website"
    },
    "media-intelligence.html": {
        "title": "Media & Social Intelligence Hub | Disperindag ESDM Kabupaten Pinrang",
        "desc": "Radar intelijen media dan monitoring sentimen isu publik terintegrasi Dinas Perindustrian, Perdagangan, ESDM Kabupaten Pinrang.",
        "image": "https://disperindagesdm-pinrang.web.app/assets/brand/cover_media_intelligence.png",
        "url": "https://disperindagesdm-pinrang.web.app/media-intelligence",
        "type": "website"
    }
}

for filename, meta in pages_meta.items():
    try:
        with open(filename, "r", encoding="utf-8") as f:
            content = f.read()
        
        meta_block = f'''  <title>{meta['title']}</title>
  <meta name="description" content="{meta['desc']}">
  <link rel="canonical" href="{meta['url']}">

  <!-- OPEN GRAPH & MEDSOS SHARING DINAMIS -->
  <meta property="og:type" content="{meta['type']}">
  <meta property="og:site_name" content="Disperindag ESDM Kabupaten Pinrang">
  <meta property="og:title" content="{meta['title']}">
  <meta property="og:description" content="{meta['desc']}">
  <meta property="og:image" content="{meta['image']}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:alt" content="{meta['title']}">
  <meta property="og:url" content="{meta['url']}">
  <meta property="og:locale" content="id_ID">

  <!-- TWITTER / X CARDS -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{meta['title']}">
  <meta name="twitter:description" content="{meta['desc']}">
  <meta name="twitter:image" content="{meta['image']}">'''

        head_match = re.search(r'<head>([\s\S]*?)</head>', content, re.I)
        if head_match:
            head_content = head_match.group(1)
            clean_head = re.sub(r'<title>.*?</title>', '', head_content, flags=re.DOTALL | re.I)
            clean_head = re.sub(r'<meta\s+name=["\']description["\'][^>]*>', '', clean_head, flags=re.I)
            clean_head = re.sub(r'<link\s+rel=["\']canonical["\'][^>]*>', '', clean_head, flags=re.I)
            clean_head = re.sub(r'<meta\s+property=["\']og:[^"\']+["\'][^>]*>', '', clean_head, flags=re.I)
            clean_head = re.sub(r'<meta\s+name=["\']twitter:[^"\']+["\'][^>]*>', '', clean_head, flags=re.I)
            clean_head = re.sub(r'<meta\s+property=["\']article:[^"\']+["\'][^>]*>', '', clean_head, flags=re.I)
            
            new_head = f"\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n{meta_block}\n" + re.sub(r'<meta\s+charset=[^>]*>', '', re.sub(r'<meta\s+name=["\']viewport["\'][^>]*>', '', clean_head, flags=re.I), flags=re.I)
            new_head = re.sub(r'\n\s*\n', '\n', new_head)
            
            new_content = content[:head_match.start(1)] + new_head + content[head_match.end(1):]
            with open(filename, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated clean URL metadata for: {filename}")
    except Exception as e:
        print(f"Error updating {filename}: {e}")

print("Pembaruan Clean URL Open Graph & Twitter Cards selesai.")
