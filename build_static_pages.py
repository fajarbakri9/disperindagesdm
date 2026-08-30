import os
import sys
import json
import re
import html as html_lib
import urllib.request
import urllib.parse
import base64
import binascii
import hashlib
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

SITE_URL = "https://disperindagesdm-pinrang.web.app"
DEFAULT_COVER = f"{SITE_URL}/assets/banner/cover_disperindag_esdm_pinrang.jpg"
FIREBASE_PROJECT_ID = "disperindagesdm-pinrang"
FIREBASE_WEB_API_KEY = "AIzaSyD4J1kidUcBcz7EdmYRIY66YR5jOEO477I"

# 1. BACA DATA DEFAULT_NEWS DARI js/data.js SECARA DINAMIS
with open("js/data.js", "r", encoding="utf-8") as f:
    data_content = f.read()

# Ekstrak objek DEFAULT_NEWS
news_match = re.search(r'const DEFAULT_NEWS\s*=\s*(\[[\s\S]*?\]);\s*(?:\n|//|\bconst|\blet)', data_content)
if not news_match:
    raise ValueError("DEFAULT_NEWS tidak ditemukan di js/data.js")

news_json_str = news_match.group(1)

# Parsing data artikel secara aman menggunakan regex / ast parser
# Bersihkan trailing commas dan comments
cleaned_str = re.sub(r'//.*', '', news_json_str)

# Gunakan python script parser sederhana atau def struktur jika dibutuhkan
import ast

def parse_js_array(js_code):
    try:
        # Ubah JS object literal ke Python dict
        py_code = re.sub(r'(\b\w+\b)\s*:', r'"\1":', js_code)
        py_code = re.sub(r',\s*([\]}])', r'\1', py_code)
        return json.loads(py_code)
    except Exception as e:
        # Fallback regex extractor
        items = []
        raw_blocks = re.findall(r'\{([^{}]+(?:\{[^{}]*\}[^{}]*)*)\}', js_code)
        for b in raw_blocks:
            d = {}
            id_m = re.search(r'id\s*:\s*["\']([^"\']+)["\']', b)
            if id_m: d['id'] = id_m.group(1)
            title_m = re.search(r'title\s*:\s*["\']([^"\']+)["\']', b)
            if title_m: d['title'] = title_m.group(1)
            slug_m = re.search(r'slug\s*:\s*["\']([^"\']+)["\']', b)
            if slug_m: d['slug'] = slug_m.group(1)
            cat_m = re.search(r'category\s*:\s*["\']([^"\']+)["\']', b)
            if cat_m: d['category'] = cat_m.group(1)
            date_m = re.search(r'date\s*:\s*["\']([^"\']+)["\']', b)
            if date_m: d['date'] = date_m.group(1)
            author_m = re.search(r'author\s*:\s*["\']([^"\']+)["\']', b)
            if author_m: d['author'] = author_m.group(1)
            img_m = re.search(r'img\s*:\s*["\']([^"\']+)["\']', b)
            if img_m: d['img'] = img_m.group(1)
            exc_m = re.search(r'excerpt\s*:\s*["\']([^"\']+)["\']', b)
            if exc_m: d['excerpt'] = exc_m.group(1)
            content_m = re.search(r'content\s*:\s*["\']([^"\']+)["\']', b)
            if content_m: d['content'] = content_m.group(1)
            if 'id' in d and 'title' in d:
                items.append(d)
        return items

ARTICLES = [
    {
        "id": "news_01",
        "slug": "tindak-lanjuti-aduan-warga-pangkalan-lpg-3-kg-nakal-di-duampanua-dijatuhi-sanksi-tegas-phu",
        "title": "Tindak Lanjuti Aduan Warga, Pangkalan LPG 3 Kg Nakal di Duampanua Dijatuhi Sanksi Tegas PHU",
        "category": "Perindustrian, Energi & SDM",
        "topic_tag": "LPG 3 Kg",
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
        "topic_tag": "LPG 3 Kg",
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
        "slug": "revitalisasi-786-lapak-pasar-sentral-pinrang-rampung-dorong-tata-kelola-pedagang-higienis",
        "title": "Revitalisasi 786 Lapak Pasar Sentral Pinrang Rampung, Dorong Tata Kelola Pedagang Higienis",
        "category": "Sarana & Pelaku Distribusi",
        "topic_tag": "Pasar",
        "date": "12 Agustus 2026",
        "publishedAt": "2026-08-12T11:00:00+08:00",
        "author": "Bidang Sarana & Pelaku Distribusi",
        "img": "assets/banner/pasar_sentral_pinrang_clean_hd.jpg",
        "excerpt": "Disperindag ESDM Pinrang merampungkan penataan zonasi 786 kios pedagang basah dan kering di Pasar Sentral Watang Sawitto untuk kenyamanan transaksi warga.",
        "content": """PINRANG — Penataan dan peremajaan infrastruktur lapak pedagang di Pasar Sentral Pinrang, Kecamatan Watang Sawitto, resmi dirampungkan oleh Bidang Sarana dan Pelaku Distribusi Disperindag ESDM Kabupaten Pinrang.

Program revitalisasi ini mencakup zonasi pemisahan komoditas basah (ikan, daging, sayur) dengan komoditas kering (tekstil, bumbu, kelontong), perbaikan drainase anti-genangan, serta instalasi penerangan hemat energi.

"Dengan selesainya revitalisasi 786 kios dan lapak ini, suasana transaksi jual beli menjadi jauh lebih bersih, tertib, dan higienis. Kami ingin masyarakat merasa nyaman berbelanja di pasar rakyat kebanggaan Kabupaten Pinrang," ujar Kepala Bidang Sarana dan Pelaku Distribusi."""
    },
    {
        "id": "news_04",
        "slug": "jamin-transaksi-adil-perlindungan-konsumen-bidang-kemetrologian-gelar-sidang-tera-ulang-timbangan-pasar-dan-spbu",
        "title": "Jamin Transaksi Adil & Perlindungan Konsumen, Bidang Kemetrologian Gelar Sidang Tera Ulang Timbangan Pasar dan SPBU",
        "category": "Kemetrologian",
        "topic_tag": "Tera",
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
        "id": "news_05",
        "slug": "kendalikan-inflasi-pangan-pemkab-pinrang-dan-disperindag-esdm-gelar-operasi-pasar-beras-sphp-di-pasar-sentral",
        "title": "Kendalikan Inflasi Pangan, Pemkab Pinrang dan Disperindag ESDM Gelar Operasi Pasar Beras SPHP di Pasar Sentral",
        "category": "Pengembangan Perdagangan",
        "topic_tag": "Pasar Murah",
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
        "id": "news_06",
        "slug": "akselerasi-umkm-naik-kelas-disperindag-pinrang-fasilitasi-sertifikasi-halal-gratis-dan-akun-siinas-bagi-pelaku-ikm",
        "title": "Akselerasi UMKM Naik Kelas, Disperindag Pinrang Fasilitasi Sertifikasi Halal Gratis dan Akun SIINas bagi Pelaku IKM",
        "category": "Perindustrian, Energi & SDM",
        "topic_tag": "IKM",
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
        "id": "news_07",
        "slug": "sinergi-dekranasda-dan-disperindag-pinrang-promosikan-tenun-sutra-corak-laburasseng-di-ajang-pameran-nasional",
        "title": "Sinergi Dekranasda dan Disperindag Pinrang Promosikan Tenun Sutra Corak Laburasseng di Ajang Pameran Nasional",
        "category": "Perindustrian, Energi & SDM",
        "topic_tag": "Dekranasda",
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
        "id": "news_08",
        "slug": "kopi-robusta-pinrang",
        "title": "Kopi Robusta Pinrang: Menembus Pasar Ekspor dengan Mutu Petik Merah Dataran Tinggi Basseang",
        "category": "Perindustrian & IKM",
        "topic_tag": "IKM",
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
        "id": "news_09",
        "slug": "pasar-murah-pinrang",
        "title": "Gerakan Pangan Murah (GPM) Tanggap Inflasi Digelar Serentak di 12 Kecamatan Pinrang",
        "category": "Pengembangan Perdagangan",
        "topic_tag": "Pasar Murah",
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
        "id": "news_10",
        "slug": "monitoring-harga-pangan",
        "title": "Pantauan Harian Bapokting: Pasokan Pangan Melimpah, Deviasi Harga Pasar Sentral Terkendali Stabil",
        "category": "Pengembangan Perdagangan",
        "topic_tag": "Bapokting",
        "date": "26 Agustus 2026",
        "publishedAt": "2026-08-26T09:00:00+08:00",
        "author": "Bidang Pengembangan Perdagangan",
        "img": "assets/news/pasar_sentral_pinrang_clean_hd.jpg",
        "excerpt": "Hasil survei harian 12 komoditas pangan pokok oleh Tim Pengawas Perdagangan Disperindag ESDM Pinrang di Pasar Sentral menunjukkan tren harga stabil dan terkendali.",
        "content": """PINRANG — Tim Enumerator dan Pengawas Perdagangan Disperindag ESDM Kabupaten Pinrang kembali merilis data resmi pemantauan harga harian 12 komoditas bahan pokok dan penting (bapokting) di Pasar Sentral Pinrang, Pasar Pekkabata, dan Pasar Marawi per 26 Agustus 2026.

Berdasarkan hasil survei lapangan, indeks stabilitas harga komoditas pangan pokok berada pada tingkat sangat terkendali dengan deviasi inflasi bulanan sebesar 2.1%. Pasokan beras premium lokal tercatat mengalami penurunan harga sebesar Rp 500/kg menjadi Rp 14.500/kg seiring bergulirnya masa panen raya di Kecamatan Patampanua dan Duampanua.

Masyarakat dan pelaku usaha dapat memantau perkembangan harga harian terverifikasi secara langsung dan transparan melalui portal resmi website Disperindag ESDM Pinrang dan TV Wallboard Command Center yang diperbarui setiap pukul 09.00 WITA."""
    },
    {
        "id": "news_11",
        "slug": "harga-eceran-tembus-rp-45-ribu-disperindagem-pinrang-ambil-tindakan-tegas-terhadap-pangkalan-nakal",
        "title": "Harga Eceran Tembus Rp 45 Ribu, Disperindagem Pinrang Ambil Tindakan Tegas Terhadap Pangkalan Nakal",
        "category": "Pelayanan Publik",
        "topic_tag": "LPG 3 Kg",
        "date": "29 Agustus 2026",
        "publishedAt": "2026-08-29T10:00:00+08:00",
        "author": "Humas Disperindag ESDM Pinrang",
        "img": "assets/news/sidak_lpg3kg_pinrang_hd.jpg",
        "excerpt": "PINRANG — Keresahan dan keluhan warga masyarakat terkait lonjakan harga LPG 3 Kg bersubsidi hingga Rp 45.000 langsung direspon tegas oleh Disperindag ESDM bersama Pertamina melalui sanksi PHU bagi pangkalan nakal.",
        "content": """PINRANG — Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang merespons cepat keluhan masyarakat terkait lonjakan harga gas elpiji 3 kg bersubsidi yang sempat mencapai Rp 45.000 di tingkat pengecer tidak resmi.

Kepala Dinas Perindag ESDM Pinrang bersama jajaran Forkopimda dan agen resmi Pertamina langsung menggelar operasi penertiban pangkalan di sejumlah titik strategis. Dari hasil pengawasan, dinas menjatuhkan sanksi administratif dan penghentian alokasi kepada pangkalan yang terbukti menjual di atas HET resmi atau menyalurkan kepada pihak pengecer borongan.

Masyarakat diimbau untuk selalu membeli tabung gas 3 kg langsung di pangkalan resmi berplang dengan harga sesuai HET resmi pemerintah sebesar Rp 20.000 per tabung."""
    },
    {
        "id": "news_12",
        "slug": "atasi-buying-panic-disperindagem-pinrang-gandeng-pertamina-dan-aph-siapkan-inovasi-digitalisasi-serta-sanksi-phk-pangkalan-nakal",
        "title": "Atasi Buying Panic, Disperindagem Pinrang Gandeng Pertamina dan APH Siapkan Inovasi Digitalisasi Serta Sanksi PHK Pangkalan Nakal",
        "category": "Pelayanan Publik",
        "topic_tag": "LPG 3 Kg",
        "date": "29 Agustus 2026",
        "publishedAt": "2026-08-29T11:00:00+08:00",
        "author": "Humas Disperindag ESDM Pinrang",
        "img": "assets/news/sidak_lpg3kg_pinrang_hd.jpg",
        "excerpt": "Menjawab fenomena panic buying warga, Disperindag ESDM Pinrang bersama Pertamina dan APH memperkuat sistem digitalisasi pangkalan terpadu dan penegakan hukum bagi oknum penimbun.",
        "content": """PINRANG — Mengantisipasi fenomena panic buying serta spekulasi harga gas elpiji 3 kg bersubsidi, Disperindag ESDM Pinrang menggandeng PT Pertamina Patra Niaga dan Aparat Penegak Hukum (APH) guna memperketat tata kelola distribusi berbasis digital.

Langkah preventif ini melibatkan integrasi logbook digital pangkalan dan verifikasi NIK KTP konsumen agar subsidi tepat sasaran bagi rumah tangga prasejahtera dan usaha mikro.

Pemerintah Kabupaten Pinrang menegaskan tidak akan ragu membawa ke jalur hukum pihak-pihak yang sengaja menimbun atau mempermainkan pasokan energi bersubsidi masyarakat."""
    },
    {
        "id": "news_13",
        "slug": "kadis-perindag-esdm-hadiri-mediasi-permasalahan-di-pasar-rakyat-pekkabata",
        "title": "Kadis Perindag ESDM Hadiri Mediasi Permasalahan di Pasar Rakyat Pekkabata",
        "category": "Pengembangan Perdagangan",
        "topic_tag": "Pasar",
        "date": "29 Agustus 2026",
        "publishedAt": "2026-08-29T14:00:00+08:00",
        "author": "Humas Disperindag ESDM Pinrang",
        "img": "assets/news/pasar_sentral_pinrang_clean_hd.jpg",
        "excerpt": "UPTD Pasar Wilayah I Disperindag ESDM Pinrang memfasilitasi mediasi kekeluargaan terkait penataan zonasi lapak pedagang Pasar Pekkabata demi kenyamanan bersama.",
        "content": """PINRANG — Kepala Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang memimpin langsung agenda mediasi dan dialog terbuka bersama para pedagang di Pasar Rakyat Pekkabata.

Pertemuan yang berlangsung hangat dan penuh musyawarah ini membahas penataan ulang zonasi pedagang basah dan kering, ketertiban area parkir, serta pemeliharaan kebersihan lingkungan pasar.

Hasil kesepakatan bersama menegaskan komitmen seluruh pedagang untuk mematuhi regulasi ketertiban pasar demi kelancaran aktivitas jual beli masyarakat."""
    },
    {
        "id": "news_14",
        "slug": "disperindag-esdm-pinrang-gelar-operasi-pasar-pangan-murah-di-12-kecamatan",
        "title": "Disperindag ESDM Pinrang Gelar Operasi Pasar Pangan Murah di 12 Kecamatan",
        "category": "Perindustrian, Energi & SDM",
        "topic_tag": "Pasar Murah",
        "date": "29 Agustus 2026",
        "publishedAt": "2026-08-29T08:30:00+08:00",
        "author": "Humas Disperindag ESDM Pinrang",
        "img": "assets/news/operasi_pasar_murah_sembako_pinrang.jpg",
        "excerpt": "Menjaga stabilitas harga sembako dan daya beli masyarakat, Disperindag ESDM Pinrang menyalurkan beras SPHP dan minyak goreng bersubsidi di 12 kecamatan.",
        "content": """PINRANG — Tim Pengendali Inflasi Daerah (TPID) bersama Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang menggelar rangkaian Operasi Pasar Pangan Murah secara bergilir di 12 wilayah kecamatan se-Kabupaten Pinrang.

Komoditas utama yang disalurkan meliputi beras SPHP kemasan 5 kg seharga Rp 12.500/kg, minyak goreng premium, gula pasir, dan tepung terigu dengan harga di bawah harga pasar umum.

Langkah strategis ini terbukti efektif menekan laju inflasi daerah dan meringankan beban pengeluaran kebutuhan pokok masyarakat."""
    },
    {
        "id": "news_15",
        "slug": "stabilkan-pasokan-dan-harga-disperindag-esdm-pinrang-gelar-rapat-koordinasi-bersama-agen-lpg-se-kabupaten",
        "title": "Stabilkan Pasokan dan Harga, Disperindag ESDM Pinrang Gelar Rapat Koordinasi Bersama Agen LPG se-Kabupaten",
        "category": "Pelayanan Publik",
        "topic_tag": "LPG 3 Kg",
        "date": "27 Agustus 2026",
        "publishedAt": "2026-08-27T09:00:00+08:00",
        "author": "Humas Disperindag ESDM Pinrang",
        "img": "assets/news/forum_konsultasi_publik_pelayanan_pinrang.jpg",
        "excerpt": "Disperindag ESDM Pinrang menggelar rapat koordinasi bersama agen LPG se-Kabupaten Pinrang untuk menjaga kelancaran distribusi, kestabilan stok, dan harga LPG 3 kg bersubsidi.",
        "content": """PINRANG — Disperindag ESDM Kabupaten Pinrang menggelar rapat koordinasi bersama para agen LPG se-Kabupaten Pinrang untuk menjaga kelancaran distribusi, kestabilan stok, dan harga LPG, khususnya LPG 3 kg bersubsidi.

Dalam pertemuan tersebut, agen diminta memperketat pengawasan distribusi hingga ke tingkat pangkalan resmi agar harga tetap sesuai HET yang ditetapkan.

Kadis Perindag ESDM Pinrang menegaskan sanksi tegas akan dijatuhkan bagi pihak pangkalan maupun agen yang menyalahi prosedur distribusi."""
    }
]

def decode_firestore_value(value):
    if not isinstance(value, dict):
        return value
    scalar_types = (
        "stringValue", "booleanValue", "integerValue", "doubleValue",
        "timestampValue", "nullValue"
    )
    for key in scalar_types:
        if key in value:
            raw = value[key]
            if key == "integerValue":
                return int(raw)
            return raw
    if "arrayValue" in value:
        return [decode_firestore_value(item) for item in value["arrayValue"].get("values", [])]
    if "mapValue" in value:
        return {
            key: decode_firestore_value(item)
            for key, item in value["mapValue"].get("fields", {}).items()
        }
    return None

def fetch_published_cloud_articles():
    endpoint = (
        f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}"
        f"/databases/(default)/documents:runQuery?key={urllib.parse.quote(FIREBASE_WEB_API_KEY)}"
    )
    payload = json.dumps({
        "structuredQuery": {
            "from": [{"collectionId": "news"}],
            "where": {
                "fieldFilter": {
                    "field": {"fieldPath": "status"},
                    "op": "EQUAL",
                    "value": {"stringValue": "published"}
                }
            }
        }
    }).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        results = json.loads(response.read().decode("utf-8"))

    articles = []
    for result in results:
        document = result.get("document")
        if not document:
            continue
        item = {
            key: decode_firestore_value(value)
            for key, value in document.get("fields", {}).items()
        }
        item["id"] = item.get("id") or document["name"].rsplit("/", 1)[-1]
        item["publishedAt"] = item.get("published_at") or item.get("publishedAt") or item.get("created_at")
        item["img"] = item.get("img") or "assets/social/default-share.jpg"
        item["excerpt"] = item.get("excerpt") or item.get("title", "")
        item["content"] = item.get("content") or ""
        item["slug"] = item.get("slug") or item["id"]
        if item.get("title") and item.get("status") == "published":
            articles.append(item)
    return articles

def merge_cloud_articles(base_articles, cloud_articles):
    merged = {item["id"]: item for item in base_articles}
    for cloud in cloud_articles:
        existing = merged.get(cloud["id"], {})
        merged[cloud["id"]] = {**existing, **cloud}

    # Slug adalah identitas URL publik. Jika migrasi lama meninggalkan lebih
    # dari satu document id untuk slug yang sama, hanya revisi terbaru dibangun.
    by_slug = {}
    for item in merged.values():
        slug = str(item.get("slug") or item.get("id") or "").strip().lower()
        revision = (
            item.get("updated_at") or item.get("updatedAt") or
            item.get("published_at") or item.get("publishedAt") or
            item.get("created_at") or item.get("createdAt") or ""
        )
        previous = by_slug.get(slug)
        previous_revision = "" if not previous else (
            previous.get("updated_at") or previous.get("updatedAt") or
            previous.get("published_at") or previous.get("publishedAt") or
            previous.get("created_at") or previous.get("createdAt") or ""
        )
        if not previous or str(revision) >= str(previous_revision):
            by_slug[slug] = item

    return sorted(
        by_slug.values(),
        key=lambda item: str(item.get("publishedAt") or item.get("published_at") or ""),
        reverse=True
    )

def materialize_embedded_images(articles):
    """Ubah featured image data URL CMS menjadi aset Hosting yang deterministik."""
    output_dir = os.path.join("assets", "news", "generated")
    os.makedirs(output_dir, exist_ok=True)
    mime_extensions = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
    }

    for article in articles:
        source = str(article.get("img") or "")
        match = re.fullmatch(r"data:([^;,]+);base64,(.+)", source, re.DOTALL)
        if not match:
            continue
        mime_type = match.group(1).lower()
        extension = mime_extensions.get(mime_type)
        if not extension:
            article["img"] = "assets/social/default-share.jpg"
            continue
        try:
            image_bytes = base64.b64decode(match.group(2), validate=True)
        except (ValueError, binascii.Error):
            article["img"] = "assets/social/default-share.jpg"
            continue
        if not image_bytes or len(image_bytes) > 800000:
            article["img"] = "assets/social/default-share.jpg"
            continue

        safe_slug = re.sub(r"[^a-z0-9-]+", "-", str(article.get("slug") or article["id"]).lower()).strip("-")
        digest = hashlib.sha256(image_bytes).hexdigest()[:12]
        filename = f"{safe_slug[:90]}-{digest}.{extension}"
        output_path = os.path.join(output_dir, filename)
        with open(output_path, "wb") as image_file:
            image_file.write(image_bytes)
        article["img"] = f"assets/news/generated/{filename}"

if "--cloud" in sys.argv:
    try:
        cloud_articles = fetch_published_cloud_articles()
        ARTICLES = merge_cloud_articles(ARTICLES, cloud_articles)
        materialize_embedded_images(ARTICLES)
        print(f"[✓] Sinkronisasi Firestore: {len(cloud_articles)} berita published ditemukan.")
    except Exception as error:
        print(f"[!] Sinkronisasi Firestore gagal, build dibatalkan: {error}")
        sys.exit(1)

def generate_article_html(art, canonical_url):
    raw_image = str(art.get('img') or 'assets/social/default-share.jpg')
    img_abs = f"{SITE_URL}/{raw_image.lstrip('/')}" if not raw_image.startswith('http') else raw_image
    title_attr = html_lib.escape(str(art['title']), quote=True)
    excerpt_attr = html_lib.escape(str(art['excerpt']), quote=True)
    author_attr = html_lib.escape(str(art.get('author', 'Humas Disperindag ESDM Pinrang')), quote=True)
    category_attr = html_lib.escape(str(art.get('category', 'Berita Kedinasan')), quote=True)
    tag_attr = html_lib.escape(str(art.get('topic_tag', 'Disperindag')), quote=True)
    raw_content = str(art.get('content') or '')
    if re.search(r'<(?:p|div|h2|h3|ul|ol|blockquote|table)\b', raw_content, re.I):
        body_html = raw_content
    else:
        paragraphs = raw_content.split('\n\n')
        body_html = "".join([f"<p>{p.replace(chr(10), '<br>')}</p>" for p in paragraphs])
    
    # Generate related items
    others = [o for o in ARTICLES if o['id'] != art['id']][:4]
    related_html = "".join([f'''
        <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px;">
          <img src="{SITE_URL}/{o['img']}" style="width: 68px; height: 52px; object-fit: cover; border-radius: 6px; flex-shrink: 0;" alt="Thumb" onerror="this.src='{SITE_URL}/assets/banner/cover_disperindag_esdm_pinrang.jpg'">
          <div>
            <a href="{SITE_URL}/berita/{o['slug']}" style="font-size: 0.84rem; font-weight: 800; color: var(--primary-deep, #0F2C59); text-decoration: none; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              {o['title']}
            </a>
            <div style="font-size: 0.72rem; color: #94A3B8; margin-top: 3px;">📅 {o['date']} &bull; #{o.get('topic_tag', 'Dinas')}</div>
          </div>
        </div>''' for o in others])

    json_ld = json.dumps({
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": art["title"],
        "description": art["excerpt"],
        "image": [img_abs],
        "datePublished": art.get("publishedAt", "2026-08-28T08:00:00+08:00"),
        "dateModified": art.get("publishedAt", "2026-08-28T08:00:00+08:00"),
        "author": [{
            "@type": "Organization",
            "name": art.get("author", "Humas Disperindag ESDM Pinrang"),
            "url": SITE_URL
        }],
        "publisher": {
            "@type": "GovernmentOrganization",
            "name": "Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang",
            "logo": {
                "@type": "ImageObject",
                "url": f"{SITE_URL}/assets/brand/logo_pinrang_opt.png"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonical_url
        }
    }, ensure_ascii=False, indent=2)

    html = f'''<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title_attr} | Disperindag ESDM Kabupaten Pinrang</title>
  <meta name="description" content="{excerpt_attr}">
  <link rel="canonical" href="{canonical_url}">
  
  <!-- OPEN GRAPH & MEDSOS SHARING RESMI (STATIC PRERENDERED) -->
  <meta property="fb:app_id" content="966242223397117">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang">
  <meta property="og:title" content="{title_attr}">
  <meta property="og:description" content="{excerpt_attr}">
  <meta property="og:image" content="{img_abs}">
  <meta property="og:image:secure_url" content="{img_abs}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="{title_attr}">
  <meta property="og:url" content="{canonical_url}">
  <meta property="og:locale" content="id_ID">
  <meta property="article:published_time" content="{art['publishedAt']}">
  <meta property="article:author" content="{author_attr}">
  <meta property="article:section" content="{category_attr}">
  <meta property="article:tag" content="{tag_attr}">
  
  <!-- TWITTER / X CARDS -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title_attr}">
  <meta name="twitter:description" content="{excerpt_attr}">
  <meta name="twitter:image" content="{img_abs}">
  <meta name="twitter:image:alt" content="{title_attr}">

  <!-- STRUCTURED DATA JSON-LD -->
  <script type="application/ld+json">
{json_ld}
  </script>

  <link rel="icon" type="image/png" href="{SITE_URL}/assets/brand/logo_pinrang_opt.png">
  <link rel="shortcut icon" type="image/x-icon" href="{SITE_URL}/favicon.ico">
  <link rel="apple-touch-icon" href="{SITE_URL}/assets/brand/logo_pinrang_opt.png">
  <link rel="stylesheet" href="{SITE_URL}/css/style.css?v=20260830_footer_canonical_v2">
  <script src="{SITE_URL}/js/data.js"></script>
  <link rel="stylesheet" href="{SITE_URL}/css/modal-system.css">
  <style>
    .article-page {{ padding: 40px 0 60px; }}
    .breadcrumb {{ display: flex; align-items: center; gap: 8px; font-size: 0.84rem; color: var(--text-muted); margin-bottom: 24px; flex-wrap: wrap; }}
    .breadcrumb a {{ color: var(--primary); font-weight: 700; text-decoration: none; }}
    .breadcrumb a:hover {{ color: var(--accent-gold-dark); text-decoration: underline; }}
    .article-layout {{ display: grid; grid-template-columns: 1.8fr 1fr; gap: 36px; align-items: start; }}
    .article-main {{ background: #FFFFFF; border-radius: var(--radius-lg); padding: 36px; border: 1.5px solid var(--border-subtle); box-shadow: var(--shadow-sm); }}
    .article-title {{ font-size: 1.85rem; font-weight: 900; color: var(--primary-deep); line-height: 1.3; margin: 14px 0 16px; }}
    .article-cover {{ width: 100%; height: 420px; border-radius: var(--radius-md); overflow: hidden; margin: 20px 0; background: #030D1B; }}
    .article-cover img {{ width: 100%; height: 100%; object-fit: cover; }}
    .article-body-text {{ font-size: 0.98rem; line-height: 1.85; color: #334155; }}
    .article-body-text p {{ margin-bottom: 20px; }}
    .article-quote-box {{ background: linear-gradient(135deg, #FEFCE8, #FFFDF0); border-left: 4px solid var(--accent-gold, #D97706); padding: 18px 22px; border-radius: 0 12px 12px 0; margin: 24px 0; font-style: italic; color: #78350F; }}
    @media (max-width: 900px) {{ .article-layout {{ grid-template-columns: 1fr; }} .article-main {{ padding: 24px; }} .article-cover {{ height: 260px; }} .article-title {{ font-size: 1.45rem; }} }}
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
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 10px;">
            <span class="badge-cat" style="background: #EFF6FF; color: #1D4ED8; font-weight: 800; font-size: 0.8rem; padding: 4px 10px; border-radius: 6px;">
              {art['category']}
            </span>
            <span style="background: #FEF3C7; color: #92400E; font-weight: 800; font-size: 0.76rem; padding: 3px 8px; border-radius: 4px;">
              #{art.get('topic_tag', 'Dinas')}
            </span>
          </div>

          <h1 class="article-title">{art['title']}</h1>
          
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid #E2E8F0; font-size: 0.82rem; color: #64748B; flex-wrap: wrap; gap: 10px;">
            <div>📅 {art['date']} &bull; ✍️ Oleh: <strong>{art.get('author', 'Humas Disperindag ESDM Pinrang')}</strong></div>
            <span class="verified-badge" style="background: #ECFDF5; color: #059669; font-weight: 800; padding: 4px 8px; border-radius: 4px; border: 1px solid #A7F3D0;">✓ Rilis Resmi Kedinasan</span>
          </div>

          <div class="article-cover">
            <img src="{img_abs}" id="articleHeroCover" alt="{art['title']}" onerror="this.src='{DEFAULT_COVER}'">
          </div>
          <div class="article-cover-caption" id="articleHeroCaption" style="font-size: 0.8rem; color: #64748B; font-style: italic; margin-top: -12px; margin-bottom: 20px;">
            📷 {art.get('image_caption', 'Dokumentasi resmi liputan kegiatan Disperindag ESDM Pinrang.')}
          </div>

          <div class="article-body-text">
            {body_html}
          </div>

          <div style="margin-top: 36px; padding-top: 20px; border-top: 2px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <a href="{SITE_URL}/arsip-berita.html" class="btn-outline" style="padding: 8px 16px; font-size: 0.85rem; text-decoration: none; border: 1.5px solid var(--border-subtle, #CBD5E1); border-radius: 6px; color: var(--primary-deep, #0F2C59); font-weight: 700;">
              &larr; Kembali ke Arsip Berita
            </a>
            <div style="display: flex; gap: 8px;">
              <a href="https://api.whatsapp.com/send?text={art['title']}%20{canonical_url}" target="_blank" rel="noopener noreferrer" style="padding: 8px 14px; font-size: 0.82rem; background: #25D366; color: #FFFFFF; border-radius: 6px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                <span>💬</span> WhatsApp
              </a>
              <a href="https://www.facebook.com/sharer/sharer.php?u={canonical_url}" target="_blank" rel="noopener noreferrer" style="padding: 8px 14px; font-size: 0.82rem; background: #1877F2; color: #FFFFFF; border-radius: 6px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                <span>📘</span> Facebook
              </a>
              <button onclick="shareArticle()" class="btn-primary" style="padding: 8px 16px; font-size: 0.82rem; background: var(--accent-gold, #FACC15); color: #030D1B; border: none; border-radius: 6px; font-weight: 800; cursor: pointer;">
                <span>🔗</span> Salin Tautan
              </button>
            </div>
          </div>
        </article>

        <!-- SIDEBAR -->
        <aside class="article-sidebar">
          <div class="sidebar-box" style="background: #FFFFFF; border-radius: var(--radius-lg); padding: 24px; border: 1.5px solid var(--border-subtle); box-shadow: var(--shadow-sm); margin-bottom: 24px;">
            <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--primary-deep); margin-bottom: 16px; border-bottom: 2px solid var(--accent-gold); padding-bottom: 8px;">
              Berita Kedinasan Terkini
            </h3>
            {related_html}
          </div>

          <div class="sidebar-box" style="background: linear-gradient(135deg, #0F2C59, #081A3A); border-radius: var(--radius-lg); padding: 24px; color: #FFFFFF; box-shadow: var(--shadow-md);">
            <h4 style="font-size: 1rem; font-weight: 800; color: var(--accent-gold); margin-bottom: 8px;">Kanal Pengaduan Resmi</h4>
            <p style="font-size: 0.82rem; color: #CBD5E1; line-height: 1.5; margin-bottom: 16px;">
              Temukan pelanggaran HET LPG 3 kg atau kecurangan timbangan pasar? Sampaikan aduan resmi Anda:
            </p>
            <a href="https://wa.me/6282316002226" target="_blank" rel="noopener noreferrer" style="display: block; text-align: center; background: #25D366; color: #FFFFFF; font-weight: 800; font-size: 0.85rem; padding: 10px; border-radius: 8px; text-decoration: none;">
              WhatsApp Hotline: 0823 1600 2226
            </a>
          </div>
        </aside>

      </div>
    </div>
  </main>

  <!-- 4. MASTER FOOTER RESMI -->
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <div class="footer-brand-header">
            <img src="{SITE_URL}/assets/brand/logo_pinrang_opt.png" alt="Logo Pemkab Pinrang" class="footer-brand-logo">
            <div class="footer-brand-title">
              <h4>DISPERINDAG ESDM</h4>
              <p>KABUPATEN PINRANG</p>
            </div>
          </div>
          <p class="footer-desc">
            Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang berkomitmen memberikan pelayanan publik prima, menjaga stabilitas harga pokok, dan memberdayakan industri daerah.
          </p>
        </div>

        <div class="footer-col">
          <h4 class="footer-heading">Navigasi Utama</h4>
          <ul class="footer-links">
            <li><a href="{SITE_URL}/index.html">Beranda Portal</a></li>
            <li><a href="{SITE_URL}/profil.html">Profil Kedinasan</a></li>
            <li><a href="{SITE_URL}/layanan.html">Standar Pelayanan Publik</a></li>
            <li><a href="{SITE_URL}/arsip-berita.html">Arsip Berita & Publikasi</a></li>
            <li><a href="{SITE_URL}/dokumen.html">Dokumen & Regulasi</a></li>
            <li><a href="{SITE_URL}/katalog-ikm.html">Katalog Produk IKM</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4 class="footer-heading">Kontak & Lokasi</h4>
          <div class="footer-contact-item">
            <span>📍</span>
            <span>Jalan Bintang No. 1, Kabupaten Pinrang, Sulawesi Selatan</span>
          </div>
          <div class="footer-contact-item">
            <span>📞</span>
            <span>0823 1600 2226</span>
          </div>
          <div class="footer-contact-item">
            <span>✉️</span>
            <span>dinasperindagem.pinrang@gmail.com</span>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p>&copy; 2026 Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang.</p>
      </div>
    </div>
  </footer>

  <script src="{SITE_URL}/js/modal-system.js"></script>
  <script src="{SITE_URL}/js/pinrang-live.js"></script>
  <script src="{SITE_URL}/js/app.js"></script>
  <script>
    // Client-Side Live Hydration: Sinkronkan seluruh data editan terbaru (foto, judul, isi konten) dari database browser
    document.addEventListener('DOMContentLoaded', () => {{
      try {{
        const slug = "{art['slug']}";
        const id = "{art['id']}";
        const rawNews = localStorage.getItem('disperindag_news');
        if (rawNews) {{
          const list = JSON.parse(rawNews);
          const current = list.find(n => n && (n.slug === slug || n.id === id || n.title === "{art['title']}"));
          if (current) {{
            // 1. Update Foto Cover Utama jika diganti di CMS
            if (current.img) {{
              const imgEl = document.getElementById('articleHeroCover');
              if (imgEl && imgEl.getAttribute('src') !== current.img) {{
                imgEl.src = current.img;
              }}
            }}
            // 2. Update Caption Foto jika diganti di CMS
            if (current.image_caption) {{
              const capEl = document.getElementById('articleHeroCaption');
              if (capEl) capEl.textContent = '📷 ' + current.image_caption;
            }}
            // 3. Update Judul Utama jika disunting di CMS
            if (current.title) {{
              const titleEl = document.querySelector('.article-title');
              if (titleEl) titleEl.textContent = current.title;
              document.title = current.title + ' | Disperindag ESDM Pinrang';
            }}
            // 4. Update Isi Konten Berita Lengkap jika diedit di CMS
            if (current.content) {{
              const bodyEl = document.querySelector('.article-body-text');
              if (bodyEl) {{
                let html = current.content;
                if (!html.includes('<p>') && !html.includes('<div>')) {{
                  html = html.split('\\n\\n').map(p => '<p>' + p.replace(/\\n/g, '<br>') + '</p>').join('');
                }}
                bodyEl.innerHTML = typeof sanitizeNewsHtml === 'function' ? sanitizeNewsHtml(html) : '';
              }}
            }}
            // 5. Update Tanggal & Penulis
            if (current.date || current.author) {{
              const metaDiv = document.querySelector('.article-main > div:nth-of-type(2) > div:first-child');
              if (metaDiv) {{
                metaDiv.innerHTML = '📅 ' + (current.date || "{art['date']}") + ' &bull; ✍️ Oleh: <strong>' + (current.author || "{art.get('author', 'Humas Disperindag ESDM Pinrang')}") + '</strong>';
              }}
            }}
          }}
        }}
      }} catch(e) {{}}
    }});

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
    footer_partial = (Path(__file__).resolve().parent / "partials" / "footer.html").read_text(encoding="utf-8").strip()
    html = re.sub(r'<footer\s+class="(?:main-footer|footer)"[^>]*>[\s\S]*?</footer>', footer_partial, html, count=1)
    return "\n".join(line.rstrip() for line in html.splitlines()) + "\n"

# 2. GENERATE SEMUA ARTIKEL BERITA KE DIREKTORI STATIS RESMI
os.makedirs("berita", exist_ok=True)

count = 0
for art in ARTICLES:
    canonical_url = f"{SITE_URL}/berita/{art['slug']}"
    html_content = generate_article_html(art, canonical_url)
    
    # 1. berita/{slug}/index.html (Clean URL modern)
    slug_dir = os.path.join("berita", art["slug"])
    os.makedirs(slug_dir, exist_ok=True)
    with open(os.path.join(slug_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(html_content)
        
    # 2. berita/{slug}.html
    with open(f"berita/{art['slug']}.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    
    # 3. berita/{id}/index.html (Legacy ID route)
    id_dir = os.path.join("berita", art["id"])
    os.makedirs(id_dir, exist_ok=True)
    with open(os.path.join(id_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(html_content)
        
    # 4. berita/{id}.html
    with open(f"berita/{art['id']}.html", "w", encoding="utf-8") as f:
        f.write(html_content)
        
    count += 1
    print(f"  [✓] Generated Open Graph static page: berita/{art['slug']}/index.html & berita/{art['id']}.html")

# 3. GENERATE & UPDATE SITEMAP.XML RESMI
def update_sitemap_xml():
    static_pages = [
        {"loc": f"{SITE_URL}/", "priority": "1.00", "changefreq": "daily"},
        {"loc": f"{SITE_URL}/profil.html", "priority": "0.90", "changefreq": "weekly"},
        {"loc": f"{SITE_URL}/layanan.html", "priority": "0.90", "changefreq": "weekly"},
        {"loc": f"{SITE_URL}/maklumat-pelayanan.html", "priority": "0.85", "changefreq": "monthly"},
        {"loc": f"{SITE_URL}/ppid.html", "priority": "0.90", "changefreq": "weekly"},
        {"loc": f"{SITE_URL}/katalog-ikm.html", "priority": "0.85", "changefreq": "daily"},
        {"loc": f"{SITE_URL}/arsip-berita.html", "priority": "0.85", "changefreq": "daily"},
        {"loc": f"{SITE_URL}/dokumen.html", "priority": "0.80", "changefreq": "weekly"},
        {"loc": f"{SITE_URL}/kontak.html", "priority": "0.80", "changefreq": "monthly"},
        {"loc": f"{SITE_URL}/search.html", "priority": "0.70", "changefreq": "monthly"},
        {"loc": f"{SITE_URL}/command-center.html", "priority": "0.95", "changefreq": "daily"},
        {"loc": f"{SITE_URL}/pasar.html", "priority": "0.90", "changefreq": "daily"},
    ]
    
    market_slugs = [
        "pasar-sentral-pinrang", "pasar-pekkabata", "pasar-bungi", "pasar-langnga",
        "pasar-teppo-benteng", "pasar-kariango", "pasar-pajalele", "pasar-paleteang", "pasar-suppa"
    ]
    for m in market_slugs:
        static_pages.append({"loc": f"{SITE_URL}/pasar/{m}", "priority": "0.80", "changefreq": "weekly"})
        
    for a in ARTICLES:
        static_pages.append({
            "loc": f"{SITE_URL}/berita/{a['slug']}",
            "priority": "0.85",
            "changefreq": "weekly",
            "lastmod": a.get("publishedAt", "2026-08-29T10:00:00+08:00")
        })

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
        '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9',
        '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">'
    ]
    
    for p in static_pages:
        lastmod = p.get("lastmod", "2026-08-29T00:00:00+08:00")
        xml_lines.append('  <url>')
        xml_lines.append(f'    <loc>{p["loc"]}</loc>')
        xml_lines.append(f'    <lastmod>{lastmod}</lastmod>')
        xml_lines.append(f'    <changefreq>{p["changefreq"]}</changefreq>')
        xml_lines.append(f'    <priority>{p["priority"]}</priority>')
        xml_lines.append('  </url>')
        
    xml_lines.append('</urlset>')
    
    with open("sitemap.xml", "w", encoding="utf-8") as f:
        f.write("\n".join(xml_lines) + "\n")
    print(f"  [✓] Generated sitemap.xml dengan {len(ARTICLES)} rilis berita resmi dan seluruh halaman portal!")

update_sitemap_xml()

print(f"\nSelesai men-generate {count} artikel berita statis resmi dengan Open Graph, Twitter Cards, dan Sitemap!")
