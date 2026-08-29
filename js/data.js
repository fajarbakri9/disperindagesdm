// ==============================================================================
// BASIS DATA & TATA KELOLA DATA RESMI DISPERINDAG ESDM KABUPATEN PINRANG (PRODUCTION READY)
// Sesuai Regulasi Kelembagaan & Standar Pelayanan Publik (SPBE)
// ==============================================================================

// Universal Robust Storage Helper
if (typeof window.getStorage !== 'function') {
  window.getStorage = function(key, defaultVal) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultVal;
      const parsed = JSON.parse(raw);
      if (Array.isArray(defaultVal) && parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.data)) {
        return parsed.data;
      }
      return parsed !== null && parsed !== undefined ? parsed : defaultVal;
    } catch (e) {
      return defaultVal;
    }
  };
}
if (typeof window.setStorage !== 'function') {
  window.setStorage = function(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  };
}

// Universal Helper Merge Data Harga Komoditas (Mencegah Penurunan Data saat Sinkronisasi Parsial)
function mergePricesWithDefaults(incomingList) {
  const baseList = JSON.parse(JSON.stringify(typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []));
  if (!Array.isArray(incomingList) || incomingList.length === 0) return baseList;

  const map = new Map();
  baseList.forEach(item => map.set(item.id, item));

  incomingList.forEach(inc => {
    if (inc && inc.id) {
      if (map.has(inc.id)) {
        map.set(inc.id, { ...map.get(inc.id), ...inc });
      } else {
        map.set(inc.id, inc);
      }
    }
  });

  return Array.from(map.values());
}
window.mergePricesWithDefaults = mergePricesWithDefaults;

// 1. PENGATURAN SITUS & KONTAK TERPADU (SITE SETTINGS)
// 1. PENGATURAN SITUS & KONTAK TERPADU CANONICAL V3 (SESUAI ARAHAN RESMI)
const DEFAULT_SITE_SETTINGS = {
  office_name: "Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral",
  agency_short: "Disperindag ESDM Kabupaten Pinrang",
  tagline: "Pelayanan Publik Prima, Stabilisasi Pangan, & Pemberdayaan Industri Bumi Lasinrang",
  service_motto: "Melayani Anda dengan Transparan, Adil & Profesional (MANTAP)",
  address: "Jalan Bintang No. 1, Kabupaten Pinrang, Sulawesi Selatan",
  phone: "0823 1600 2226",
  whatsapp: "0823 1600 2226",
  whatsapp_link: "https://wa.me/6282316002226",
  email: "dinasperindagem.pinrang@gmail.com",
  email_primary: "dinasperindagem.pinrang@gmail.com",
  email_secondary: "disperindagesdm@pinrangkab.go.id",
  website: "https://disperindagesdm.pinrangkab.go.id",
  website_domain: "disperindagesdm.pinrangkab.go.id",
  instagram_handle: "@perindagempinrang",
  instagram_url: "https://www.instagram.com/perindagempinrang/",
  facebook_title: "Disperindag-ESDM Pinrang",
  facebook_url: "https://web.facebook.com/profile.php?id=100064574566979",
  sp4n_lapor_url: "https://www.lapor.go.id/",
  office_hours: "Senin – Kamis: 08.00 – 16.00 WITA | Jumat: 08.00 – 16.30 WITA",
  maps_url: "https://maps.google.com/?q=Jalan+Bintang+No.+1+Pinrang+Sulawesi+Selatan",
  youtube_url: "https://www.youtube.com/@pemkabpinranghadir",
  portal_pemkab_url: "https://pinrangkab.go.id"
};

// 1.1 JAM PELAYANAN RESMI (CANONICAL V3)
const DEFAULT_SERVICE_HOURS = {
  regular: "Senin – Kamis: 08.00 – 16.00 WITA",
  friday: "Jumat: 08.00 – 16.30 WITA",
  break_regular: "12.00 – 13.00 WITA",
  break_friday: "11.45 – 13.15 WITA",
  note: "Hari libur nasional dan cuti bersama mengikuti ketentuan Pemerintah Kabupaten Pinrang.",
  signatory: {
    name: "MUHAMMAD YUSUF NUR, S.STP",
    title: "Kepala Dinas Perindag ESDM Kabupaten Pinrang",
    nip: "19780512 199711 1 001",
    date: "Pinrang, 02 Januari 2025"
  },
  legal_basis: "SK Kepala Dinas Nomor: 800.1.1/02/DISPERINDAG-ESDM/I/2025 tentang Penetapan Jam Pelayanan"
};

// 1.2 MAKLUMAT PELAYANAN RESMI (CANONICAL V3)
const DEFAULT_MAKLUMAT = {
  title: "Maklumat Pelayanan Publik",
  decision_number: "Nomor: 800.1.1/01/DISPERINDAG-ESDM/I/2025",
  signatory: "MUHAMMAD YUSUF NUR, S.STP",
  signatory_title: "Kepala Dinas Perindag ESDM Kabupaten Pinrang",
  nip: "19780512 199711 1 001",
  date: "02 Januari 2025",
  pledges: [
    "Berjanji dan sanggup untuk melaksanakan pelayanan sesuai dengan Standar Pelayanan yang telah ditetapkan secara transparan, adil, dan profesional.",
    "Memberikan pelayanan sesuai dengan kewajiban dan akan melakukan perbaikan secara terus menerus guna mewujudkan pelayanan prima bagi masyarakat Kabupaten Pinrang.",
    "Siap menerima sanksi dan/atau memberikan kompensasi apabila pelayanan yang diberikan tidak sesuai standar yang telah dijanjikan."
  ],
  motto: "Melayani Anda dengan Transparan, Adil & Profesional (MANTAP)",
  hashtag: "#BanggaMelayaniBangsa"
};


// 1.2 SALURAN KONTAK CANONICAL (ARAHAN V3 POIN 6, 9 & 10)
const DEFAULT_CONTACT_CHANNELS = [
  {
    id: "chn_01",
    platform: "WhatsApp Resmi",
    title: "Hotline & Pengaduan WhatsApp",
    value: "0823 1600 2226",
    url: "https://wa.me/6282316002226",
    icon: "💬",
    purpose: "complaint_and_info",
    is_active: true,
    display_order: 1
  },
  {
    id: "chn_02",
    platform: "Email Pengaduan",
    title: "Surat Elektronik Kedinasan",
    value: "dinasperindagem.pinrang@gmail.com",
    url: "mailto:dinasperindagem.pinrang@gmail.com",
    icon: "✉️",
    purpose: "complaint_official",
    is_active: true,
    display_order: 2
  },
  {
    id: "chn_03",
    platform: "Instagram Resmi",
    title: "Akun Media Sosial Instagram",
    value: "@perindagempinrang",
    url: "https://www.instagram.com/perindagempinrang/",
    icon: "📸",
    purpose: "public_relations",
    is_active: true,
    display_order: 3
  },
  {
    id: "chn_04",
    platform: "Facebook Resmi",
    title: "Halaman Media Sosial Facebook",
    value: "Disperindag-ESDM Pinrang",
    url: "https://web.facebook.com/profile.php?id=100064574566979",
    icon: "👥",
    purpose: "public_relations",
    is_active: true,
    display_order: 4
  },
  {
    id: "chn_05",
    platform: "SP4N-LAPOR!",
    title: "Sistem Pengelolaan Pengaduan Pelayanan Publik Nasional",
    value: "www.lapor.go.id",
    url: "https://www.lapor.go.id/",
    icon: "🌐",
    purpose: "national_complaint",
    is_active: true,
    display_order: 5
  },
  {
    id: "chn_06",
    platform: "Alamat Kantor",
    title: "Lokasi Pelayanan Tatap Muka",
    value: "Jalan Bintang No. 1, Kabupaten Pinrang, Sulawesi Selatan",
    url: "https://maps.google.com/?q=Jalan+Bintang+No.+1+Pinrang+Sulawesi+Selatan",
    icon: "📍",
    purpose: "office_location",
    is_active: true,
    display_order: 6
  },
  {
    id: "chn_07",
    platform: "Kotak Saran",
    title: "Kotak Aspirasi Fisik",
    value: "Tersedia di Ruang Pelayanan Terpadu Dinas",
    url: "#",
    icon: "📮",
    purpose: "offline_suggestion",
    is_active: true,
    display_order: 7
  }
];

// 2. DATA PIMPINAN DINAS (OFFICIALS)
const DEFAULT_OFFICIALS = [
  {
    id: "off_01",
    name: "Muhammad Yusuf Nur",
    degree: "S.STP",
    full_name: "Muhammad Yusuf Nur, S.STP",
    position: "Kepala Dinas",
    unit: "Pimpinan Dinas",
    photo_url: "Kadis perindesdm pinrang.png",
    nip: "19780512 199711 1 001",
    rank: "Pembina Utama Muda (IV/c)",
    start_date: "01 Januari 2024",
    is_active: true,
    display_order: 1,
    commitment: "Mewujudkan pelayanan prima di bidang industri, perdagangan, kemetrologian, dan energi yang transparan, akuntabel, serta berpihak pada kesejahteraan ekonomi masyarakat Bumi Lasinrang.",
    profile_brief: "Memimpin perumusan kebijakan teknis, pembinaan aparatur, stabilitas harga bapokting, pengawasan distribusi energi bersubsidi, dan percepatan pertumbuhan IKM daerah.",
    source_document: "Keputusan Bupati Pinrang tentang Pengangkatan Jabatan Pimpinan Tinggi Pratama",
    last_verified_at: "26 Agustus 2026"
  },
  {
    id: "off_02",
    name: "Drs. H. M. Said",
    degree: "M.Si.",
    full_name: "Drs. H. M. Said, M.Si.",
    position: "Sekretaris Dinas",
    unit: "Sekretariat",
    photo_url: "assets/brand/logo_pinrang_opt.png",
    nip: "19720415 199403 1 003",
    rank: "Pembina Tingkat I (IV/b)",
    start_date: "15 Maret 2023",
    is_active: true,
    display_order: 2,
    commitment: "Mengakselerasi tata kelola administrasi perencanaan, keuangan, kepegawaian, reformasi birokrasi, dan keterbukaan informasi publik (PPID) yang terintegrasi.",
    profile_brief: "Mengoordinasikan penyusunan program kerja, pengelolaan keuangan dan aset daerah, pembinaan kepegawaian ASN, serta harmonisasi produk hukum kedinasan.",
    source_document: "Keputusan Bupati Pinrang tentang Pengangkatan Jabatan Administrator",
    last_verified_at: "26 Agustus 2026"
  }
];

// 3. STRUKTUR UNIT KERJA & NOMENKLATUR RESMI (ORGANIZATION UNITS)
const DEFAULT_ORGANIZATION_UNITS = [
  {
    id: "unit_sekretariat",
    code: "SEKRETARIAT",
    name: "Sekretariat",
    leader_title: "Sekretaris Dinas",
    summary: "Pusat koordinasi perencanaan program, pengelolaan keuangan daerah, administrasi kepegawaian, tata laksana hukum, dan PPID.",
    formal_task: "Mengoordinasikan penyusunan kebijakan, perencanaan program, evaluasi kinerja, pengelolaan keuangan, perlengkapan, kehumasan, serta administrasi kepegawaian dan hukum di lingkungan dinas.",
    public_service: "Melayani administrasi persuratan dinas, permohonan informasi publik (PPID), magang/penelitian mahasiswa, serta fasilitasi koordinasi lintas sektor.",
    sub_units: [
      { name: "Subbagian Program", task: "Penyusunan dokumen perencanaan (Renstra, Renja, RKA, DPA) dan pelaporan akuntabilitas kinerja (LKjIP)." },
      { name: "Subbagian Umum, Kepegawaian dan Hukum", task: "Tata usaha persuratan, mutasi dan pembinaan disiplin ASN, kearsipan, kehumasan, dan telaah produk hukum." },
      { name: "Subbagian Keuangan", task: "Pengelolaan perbendaharaan, penatausahaan akuntansi, dan penyusunan laporan pertanggungjawaban keuangan dinas." }
    ]
  },
  {
    id: "unit_industri_esdm",
    code: "BID_INDUSTRI_ESDM",
    name: "Bidang Perindustrian, Energi dan Sumber Daya Mineral",
    leader_title: "Kepala Bidang Perindustrian, Energi dan SDM",
    summary: "Pembinaan industri kecil menengah (IKM), fasilitasi sertifikasi Halal/TKDN/PIRT, serta pengawasan distribusi energi dan LPG 3 kg bersubsidi sesuai kewenangan.",
    formal_task: "Pelaksanaan perumusan kebijakan teknis, fasilitasi perizinan industri, pembinaan sentra IKM, serta pemantauan dan pengawasan pendistribusian energi dan sumber daya mineral sesuai peraturan perundang-undangan.",
    public_service: "Mendampingi pendaftaran akun SIINas Kemenperin, fasilitasi sertifikasi TKDN-IKM gratis, fasilitasi Halal, bimbingan kemasan produk daerah, dan informasi HET serta posko aduan LPG 3 Kg.",
    authority_disclaimer: "Pelaksanaan urusan energi dan sumber daya mineral mengikuti pembagian kewenangan berdasarkan peraturan perundang-undangan. Untuk layanan yang menjadi kewenangan Pemerintah Provinsi atau Pemerintah Pusat, dinas bertindak sebagai koordinator verifikasi lapangan dan fasilitasi pengaduan masyarakat.",
    sub_units: [
      { name: "Seksi Pengembangan & Pembinaan Industri", task: "Pelatihan teknis pengrajin, bimbingan desain produk lokal, dan sertifikasi mutu IKM." },
      { name: "Seksi Energi dan Sumber Daya Mineral", task: "Pengawasan penyaluran LPG 3 kg di pangkalan, koordinasi kuota BBM bersubsidi, dan verifikasi lapangan." }
    ]
  },
  {
    id: "unit_perdagangan",
    code: "BID_PENGEMBANGAN_PERDAGANGAN",
    name: "Bidang Pengembangan Perdagangan",
    leader_title: "Kepala Bidang Pengembangan Perdagangan",
    summary: "Pemantauan stabilitas pasokan dan harga 12 bahan pokok penting (Bapokting), pengendalian inflasi daerah, serta promosi produk lokal.",
    formal_task: "Perumusan kebijakan di bidang perdagangan dalam negeri, pemantauan ketersediaan dan harga kebutuhan pokok dan barang penting, perlindungan konsumen, serta fasilitasi promosi dan pemasaran produk daerah.",
    public_service: "Menyediakan informasi publik harga harian pangan di pasar tradisional, penyelenggaraan Gerakan Pangan Murah (GPM) / Pasar Murah bersubsidi, serta penerimaan konsultasi sengketa konsumen.",
    sub_units: [
      { name: "Seksi Pengendalian Barang Pokok & Penting", task: "Survei harian harga 12 komoditas pangan di pasar sentral dan kecamatan serta pelaporan sistem SP2KP Kemendag." },
      { name: "Seksi Promosi & Pengawasan Perdagangan", task: "Fasilitasi pameran dagang produk unggulan dan pengawasan peredaran barang kadaluwarsa/berbahaya." }
    ]
  },
  {
    id: "unit_kemetrologian",
    code: "BID_KEMETROLOGIAN",
    name: "Bidang Kemetrologian",
    leader_title: "Kepala Bidang Kemetrologian",
    summary: "Pelayanan dan pengawasan tera / tera ulang Alat Ukur, Takar, Timbang, dan Perlengkapannya (UTTP) untuk menjamin keadilan transaksi perdagangan.",
    formal_task: "Pelaksanaan urusan metrologi legal sesuai kewenangan daerah, pengujian teknis UTTP, penerbitan Surat Keterangan Hasil Pengujian (SKHP), dan pengawasan tertib ukur.",
    public_service: "Melayani pengujian dan pembubuhan Cap Tanda Tera Sah pada dispenser BBM SPBU, timbangan meja pedagang pasar, jembatan timbang pabrik beras, dan meteran air/listrik.",
    sub_units: [
      { name: "Seksi Pelayanan Tera & Tera Ulang", task: "Pemeriksaan dan kalibrasi akurasi UTTP menggunakan bejana ukur dan anak timbang standar berstandar nasional." },
      { name: "Seksi Pengawasan & Penyuluhan Metrologi", task: "Inspeksi berkala ke pelaku usaha dan penyuluhan hak konsumen menuju predikat Kabupaten Daerah Tertib Ukur." }
    ]
  },
  {
    id: "unit_distribusi",
    code: "BID_DISTRIBUSI",
    name: "Bidang Sarana dan Pelaku Distribusi",
    leader_title: "Kepala Bidang Sarana dan Pelaku Distribusi",
    summary: "Pengelolaan sarana pasar rakyat, penataan zonasi pedagang, pembinaan pergudangan, pusat perbelanjaan, toko swalayan, dan pelaku rantai distribusi.",
    formal_task: "Perumusan kebijakan teknis pembinaan dan penataan sarana perdagangan tradisional dan modern, pemeliharaan fisik pasar rakyat, pendaftaran izin pergudangan, serta pendataan rantai pasok distribusi.",
    public_service: "Layanan permohonan sewa/penempatan lapak dan kios di Pasar Sentral Pinrang, penerbitan Tanda Daftar Gudang (TDG), serta fasilitasi kemitraan pasar modern dengan UMKM lokal.",
    sub_units: [
      { name: "Seksi Sarana & Prasarana Pasar", task: "Pemeliharaan gedung, sanitasi, keamanan, dan zonasi 786 lapak di Pasar Sentral Pinrang dan pasar kecamatan." },
      { name: "Seksi Bina Pelaku Distribusi & Pergudangan", task: "Verifikasi lapangan gudang pangan/logistik dan pengawasan perizinan toko swalayan modern." }
    ]
  }
];

// 4. STANDAR PELAYANAN PUBLIK TERVERIFIKASI (SERVICES) - 13 ELEMEN LENGKAP
const DEFAULT_SERVICES = [
  {
    id: "srv_tera",
    code: "TERA_UTTP",
    name: "Pelayanan Tera & Tera Ulang UTTP (Alat Ukur, Takar, Timbang)",
    responsible_unit: "Bidang Kemetrologian",
    responsible_unit_id: "unit_kemetrologian",
    legal_basis: "UU No. 2 Tahun 1981 tentang Metrologi Legal; Permendag RI No. 68/M-DAG/PER/10/2014; Perbup Pinrang tentang Pelayanan Tera.",
    service_standard_number: "SP-DPE/01/KEMETROLOGIAN/2026",
    service_standard_date: "15 Januari 2026",
    requirements: [
      "Surat Permohonan Pengujian Tera / Tera Ulang UTTP dari pemilik alat",
      "Fotokopi KTP / Identitas penanggung jawab usaha",
      "Kondisi fisik alat UTTP bersih, dapat dioperasikan normal, dan tersegel",
      "Bukti SKHP atau Cap Tera tahun sebelumnya (bila tera ulang)"
    ],
    procedure: [
      "Pemohon mengajukan surat permohonan ke Kantor Bidang Kemetrologian / via WhatsApp",
      "Petugas Penera memverifikasi dokumen dan menetapkan jadwal sidang tera di kantor / di lokasi (SPBU/Pabrik)",
      "Penera Ahli melakukan pengujian teknis batas kesalahan yang diizinkan (BKD)",
      "Alat yang lolos uji dibubuhi Cap Tanda Tera Sah dan diterbitkan Surat Keterangan Hasil Pengujian (SKHP)"
    ],
    duration: "1 s.d. 3 Hari Kerja setelah pengujian alat",
    fee: "Sesuai Perda Kabupaten Pinrang tentang Retribusi Pelayanan Tera / Gratis pada program Sidang Tera Pasar",
    service_output: "Surat Keterangan Hasil Pengujian (SKHP) & Pembubuhan Cap Tanda Tera Sah 2026",
    location: "Kantor Bidang Kemetrologian Disperindag ESDM Pinrang / Pelayanan Bergerak di Lokasi",
    service_hours: "Senin – Jumat, 08.30 – 15.30 WITA",
    contact_person: "Unit Pelayanan Metrologi: 0812-4292-1215",
    complaint_channel: "SP4N-LAPOR! / Posko Pengaduan Disperindag ESDM Pinrang",
    last_verified_at: "26 Agustus 2026",
    cta_label: "Konsultasi & Ajukan Tera",
    cta_link: "https://wa.me/6281242921215?text=Halo%20Bidang%20Kemetrologian%20Pinrang,%20saya%20ingin%20mengajukan%20pelayanan%20Tera%20UTTP"
  },
  {
    id: "srv_harga",
    code: "HARGA_BAPOKTING",
    name: "Informasi Publik & Pemantauan Harga Barang Kebutuhan Pokok (Bapokting)",
    responsible_unit: "Bidang Pengembangan Perdagangan",
    responsible_unit_id: "unit_perdagangan",
    legal_basis: "UU No. 7 Tahun 2014 tentang Perdagangan; Permendag No. 57/M-DAG/PER/8/2017.",
    service_standard_number: "SP-DPE/02/DAG/2026",
    service_standard_date: "15 Januari 2026",
    requirements: ["Terbuka untuk seluruh masyarakat umum, instansi pemerintah, akademisi, dan pedagang."],
    procedure: [
      "Petugas enumerator mendata harga 12 komoditas pangan setiap pagi pukul 07.30 - 08.30 WITA di Pasar Sentral Pinrang",
      "Data diverifikasi oleh Koordinator Pengawas Perdagangan",
      "Data dipublikasikan secara terbuka pada portal resmi Disperindag ESDM dan running text ticker setiap pukul 09.00 WITA"
    ],
    duration: "Langsung / Real-time harian (Update pukul 09.00 WITA)",
    fee: "Rp 0,- (Gratis tanpa biaya)",
    service_output: "Tabel dan Grafik Pantauan Harga Pangan Harian Terverifikasi",
    location: "Portal Web Publik Disperindag ESDM Pinrang & Pasar Sentral Pinrang",
    service_hours: "Online 24 Jam (Survei data fisik Senin–Jumat)",
    contact_person: "Tim Pengendalian Inflasi: 0812-4292-1215",
    complaint_channel: "SP4N-LAPOR! / Form Pengaduan Harga di Website",
    last_verified_at: "26 Agustus 2026",
    cta_label: "Lihat Dashboard Harga",
    cta_link: "#sembako"
  },
  {
    id: "srv_ikm",
    code: "FASILITASI_IKM",
    name: "Fasilitasi Sertifikasi TKDN-IKM, Halal, & Akun SIINas Industri",
    responsible_unit: "Bidang Perindustrian, Energi dan Sumber Daya Mineral",
    responsible_unit_id: "unit_industri_esdm",
    legal_basis: "UU No. 3 Tahun 2014 tentang Perindustrian; PP No. 28 Tahun 2021 tentang Penyelenggaraan Bidang Perindustrian.",
    service_standard_number: "SP-DPE/03/IND/2026",
    service_standard_date: "15 Januari 2026",
    requirements: [
      "Memiliki Nomor Induk Berusaha (NIB) dengan KBLI Industri yang aktif",
      "KTP Pemilik Usaha di wilayah Kabupaten Pinrang",
      "Foto produk dan proses produksi di tempat usaha",
      "Struktur bahan baku dan rincian biaya produksi untuk sertifikasi TKDN"
    ],
    procedure: [
      "Pelaku usaha datang ke kantor dinas / mendaftar via WhatsApp",
      "Petugas memfasilitasi pembuatan akun SIINas di portal Kemenperin",
      "Pendampingan input data penghitungan bobot lokal TKDN-IKM",
      "Verifikasi dokumen oleh verifikator Kemenperin hingga sertifikat terbit secara elektronik"
    ],
    duration: "5 s.d. 14 Hari Kerja (tergantung verifikasi pusat Kemenperin)",
    fee: "Rp 0,- (Gratis difasilitasi program pemerintah)",
    service_output: "Akun Resmi SIINas & Sertifikat Elektronik TKDN-IKM / Halal",
    location: "Klinik IKM Disperindag ESDM Pinrang, Jl. Jenderal Sukawati No. 40",
    service_hours: "Senin – Jumat, 08.00 – 15.30 WITA",
    contact_person: "Klinik Fasilitasi IKM: 0812-4292-1215",
    complaint_channel: "SP4N-LAPOR! / Layanan Pengaduan IKM",
    last_verified_at: "26 Agustus 2026",
    cta_label: "Daftar Pembinaan IKM",
    cta_link: "https://wa.me/6281242921215?text=Halo%20Bidang%20Perindustrian%20Pinrang,%20saya%20ingin%20konsultasi%20Sertifikasi%20TKDN-IKM"
  },
  {
    id: "srv_pasar",
    code: "SARANA_PASAR",
    name: "Pelayanan Sewa Lapak Pasar Sentral & Tanda Daftar Gudang (TDG)",
    responsible_unit: "Bidang Sarana dan Pelaku Distribusi",
    responsible_unit_id: "unit_distribusi",
    legal_basis: "Permendag No. 90/M-DAG/PER/12/2014 tentang Penataan dan Pembinaan Gudang; Perda Pengelolaan Pasar Pinrang.",
    service_standard_number: "SP-DPE/04/DISTRIBUSI/2026",
    service_standard_date: "15 Januari 2026",
    requirements: [
      "Surat Permohonan Izin Penempatan Lapak / TDG",
      "Fotokopi KTP dan NIB pedagang/pemilik gudang",
      "Denah lokasi dan kapasitas luasan gudang / lapak",
      "Surat pernyataan kesanggupan mematuhi tata tertib pasar rakyat"
    ],
    procedure: [
      "Pemohon mengisi formulir pendaftaran di loket Pelayanan Pasar",
      "Petugas melakukan survei kesiapan zonasi lapak / kapasitas gudang",
      "Penerbitan Surat Keputusan Penempatan Lapak / Sertifikat TDG",
      "Penyerahan dokumen izin dan kunci sarana pasar kepada pemohon"
    ],
    duration: "3 Hari Kerja",
    fee: "Retribusi sesuai Perda Pengelolaan Kekayaan Daerah Pinrang",
    service_output: "Surat Izin Pemakaian Tempat Usaha (SIPTU) / Tanda Daftar Gudang (TDG)",
    location: "Kantor Pengelola Pasar Sentral Pinrang & Dinas Perindag ESDM",
    service_hours: "Senin – Jumat, 08.00 – 15.00 WITA",
    contact_person: "Seksi Sarana Distribusi: 0812-4292-1215",
    complaint_channel: "Posko Pengaduan Pasar & SP4N-LAPOR!",
    last_verified_at: "26 Agustus 2026",
    cta_label: "Informasi Sewa Lapak & TDG",
    cta_link: "https://wa.me/6281242921215?text=Halo%20Bidang%20Distribusi%20Pinrang,%20saya%20ingin%20informasi%20sewa%20lapak%20Pasar%20Sentral"
  },
  {
    id: "srv_lpg",
    code: "PENGAWASAN_LPG",
    name: "Informasi HET & Pengawasan Distribusi Gas Elpiji (LPG) 3 Kg Bersubsidi",
    responsible_unit: "Bidang Perindustrian, Energi dan Sumber Daya Mineral",
    responsible_unit_id: "unit_industri_esdm",
    legal_basis: "Permen ESDM No. 26 Tahun 2009; Keputusan Gubernur Sulsel tentang HET LPG 3 Kg; Perbup Pinrang No. 12 Tahun 2024 (HET Rp 20.000,-/tabung).",
    service_standard_number: "SP-DPE/05/ESDM/2026",
    service_standard_date: "15 Januari 2026",
    requirements: [
      "Laporan/Aduan masyarakat wajib menyertakan Nama Pangkalan, Alamat/Kecamatan, dan bukti foto kwitansi/pembelian bila dijual melebihi HET Rp 20.000."
    ],
    procedure: [
      "Masyarakat mengecek daftar HET resmi Rp 20.000,- per tabung pangkalan di website",
      "Bila ditemukan pelanggaran harga di atas HET / penimbunan, warga melapor via form website / WhatsApp pengaduan",
      "Tim Pengawas ESDM bersama agen Pertamina melakukan verifikasi sidak lapangan dalam 1x24 jam",
      "Pangkalan yang melanggar dikenai sanksi administratif hingga Pemutusan Hubungan Usaha (PHU) oleh Agen"
    ],
    duration: "Tindak lanjut pengaduan maksimal 1x24 Jam Kerja",
    fee: "Rp 0,- (Pelayanan Pengawasan Masyarakat Bebas Biaya)",
    service_output: "Berita Acara Pengawasan, Penegakan Kepatuhan HET Rp 20.000, & Laporan Penindakan",
    location: "12 Kecamatan di Kabupaten Pinrang",
    service_hours: "Posko Pengaduan Online 24 Jam",
    contact_person: "Pengawas ESDM: 0812-4292-1215",
    complaint_channel: "Form Pengaduan Website & WhatsApp ESDM Pinrang",
    last_verified_at: "26 Agustus 2026",
    authority_disclaimer: "Dinas berperan dalam pengawasan kepatuhan distribusi, penetapan kuota usulan daerah, dan koordinasi penindakan bersama PT Pertamina Patra Niaga.",
    cta_label: "Laporkan Pangkalan Nakal",
    cta_link: "#pengaduan"
  },
  {
    id: "srv_ppid",
    code: "PPID_ADUAN",
    name: "Layanan Keterbukaan Informasi Publik (PPID) & Pengaduan SP4N-LAPOR!",
    responsible_unit: "Sekretariat (PPID Pelaksana)",
    responsible_unit_id: "unit_sekretariat",
    legal_basis: "UU No. 14 Tahun 2008 tentang Keterbukaan Informasi Publik; Permendagri No. 3 Tahun 2017; Perbup Pengelolaan PPID Pinrang.",
    service_standard_number: "SP-DPE/06/PPID/2026",
    service_standard_date: "15 Januari 2026",
    requirements: [
      "Mengisi Formulir Permohonan Informasi Publik / Pengaduan",
      "Melampirkan fotokopi KTP Pemohon / Surat Kuasa jika mewakili badan hukum",
      "Mencantumkan alasan penggunaan informasi secara jelas"
    ],
    procedure: [
      "Pemohon mengajukan permohonan melalui form online PPID / meja layanan",
      "Petugas PPID memeriksa kelengkapan berkas dan klasifikasi informasi (Berkala/Setiap Saat/Dikecualikan)",
      "PPID menyampaikan pemberitahuan tertulis ketersediaan dokumen maksimal 10 hari kerja",
      "Penyerahan salinan dokumen informasi publik kepada pemohon"
    ],
    duration: "Maksimal 10 Hari Kerja (+ perpanjangan 7 hari kerja bila dokumen kompleks)",
    fee: "Rp 0,- (Gratis dokumen digital / biaya penggandaan mandiri bila cetak)",
    service_output: "Salinan Dokumen Informasi Publik / Respon Tindak Lanjut Pengaduan Ber-nomor Tiket",
    location: "Meja Layanan PPID Disperindag ESDM Pinrang",
    service_hours: "Senin – Jumat, 08.00 – 15.30 WITA",
    contact_person: "Petugas PPID Pelaksana: 0812-4292-1215",
    complaint_channel: "SP4N-LAPOR! & Komisi Informasi Provinsi Sulsel",
    last_verified_at: "26 Agustus 2026",
    cta_label: "Akses Portal PPID",
    cta_link: "ppid.html"
  }
];

// 5. REPOSITORI DOKUMEN & REGULASI HUKUM (DOCUMENTS) DENGAN STATUS VALID
const DEFAULT_DOCUMENTS = [
  {
    id: "doc_sk_jam_pelayanan_2025",
    title: "SK Kepala Dinas Penetapan Jam Pelayanan Tahun 2025",
    number: "Nomor: 800.1.1/02/DISPERINDAG-ESDM/I/2025",
    year: "2025",
    category: "Regulasi Kedinasan",
    subject: "Standar Pelayanan",
    issuer: "Kepala Dinas Perindag ESDM Pinrang",
    issued_at: "02 Januari 2025",
    responsible_unit: "Sekretariat & Bidang Terkait",
    legal_status: "Berlaku",
    file_url: "assets/docs/SK_Penetapan_Jam_Pelayanan_2025.pdf",
    file_size: "328 KB (PDF)",
    source_portal_url: "assets/docs/SK_Penetapan_Jam_Pelayanan_2025.pdf",
    is_verified: true
  },
  {
    id: "doc_sk_maklumat_pelayanan_2025",
    title: "SK Kepala Dinas Penetapan Maklumat Pelayanan Tahun 2025",
    number: "Nomor: 800.1.1/01/DISPERINDAG-ESDM/I/2025",
    year: "2025",
    category: "Regulasi Kedinasan",
    subject: "Standar Pelayanan",
    issuer: "Kepala Dinas Perindag ESDM Pinrang",
    issued_at: "02 Januari 2025",
    responsible_unit: "Sekretariat Dinas",
    legal_status: "Berlaku",
    file_url: "assets/docs/SK_PENETAPAN_MAKLUMAT_PELAYANAN_Tahun_2025.pdf",
    file_size: "171 KB (PDF)",
    source_portal_url: "assets/docs/SK_PENETAPAN_MAKLUMAT_PELAYANAN_Tahun_2025.pdf",
    is_verified: true
  },
  {
    id: "doc_sk_sp_disperindag_2025",
    title: "SK Penetapan Standar Pelayanan (SP) Disperindag ESDM Tahun 2025",
    number: "Nomor: 060/03/DISPERINDAG-ESDM/I/2025",
    year: "2025",
    category: "Standar Pelayanan",
    subject: "Standar Pelayanan",
    issuer: "Kepala Dinas Perindag ESDM Pinrang",
    issued_at: "02 Januari 2025",
    responsible_unit: "Tim Penyusun Standar Pelayanan",
    legal_status: "Berlaku",
    file_url: "assets/docs/SK_PENETAPAN_SP_DISPERINDAG_2025.pdf",
    file_size: "489 KB (PDF)",
    source_portal_url: "assets/docs/SK_PENETAPAN_SP_DISPERINDAG_2025.pdf",
    is_verified: true
  },
  {
    id: "doc_sk_pedoman_reward_punishment",
    title: "SK Pedoman Pemberian Penghargaan dan Sanksi Aparatur Pelayanan",
    number: "Nomor: 800.1.6/04/DISPERINDAG-ESDM/I/2025",
    year: "2025",
    category: "Kepegawaian & Disiplin",
    subject: "Standar Pelayanan",
    issuer: "Kepala Dinas Perindag ESDM Pinrang",
    issued_at: "02 Januari 2025",
    responsible_unit: "Subbagian Umum dan Kepegawaian",
    legal_status: "Berlaku",
    file_url: "assets/docs/SK_PEDOMAN_PEMBERIAN_PENGHARGAAN_DAN_SANKSI.pdf",
    file_size: "224 KB (PDF)",
    source_portal_url: "assets/docs/SK_PEDOMAN_PEMBERIAN_PENGHARGAAN_DAN_SANKSI.pdf",
    is_verified: true
  },
  {
    id: "doc_laporan_pengaduan_2025",
    title: "Laporan Rekapitulasi Penanganan Pengaduan Masyarakat Tahun 2025",
    number: "Nomor: 060/12/DISPERINDAG-ESDM/XII/2025",
    year: "2025",
    category: "Akuntabilitas Kinerja",
    subject: "Akuntabilitas Kinerja",
    issuer: "Dinas Perindag ESDM Pinrang",
    issued_at: "31 Desember 2025",
    responsible_unit: "Tim Pengelola Pengaduan SP4N-LAPOR!",
    legal_status: "Berlaku",
    file_url: "assets/docs/Laporan_Pengaduan_2025.pdf",
    file_size: "780 KB (PDF)",
    source_portal_url: "assets/docs/Laporan_Pengaduan_2025.pdf",
    is_verified: true
  },
  {
    id: "doc_sop_alur_pengaduan",
    title: "Bagan Alur dan Mekanisme Pengelolaan Pengaduan Masyarakat Terpadu",
    number: "SOP-01/PENGADUAN/2026",
    year: "2026",
    category: "Standar Pelayanan",
    subject: "Standar Pelayanan",
    issuer: "Dinas Perindag ESDM Pinrang",
    issued_at: "02 Januari 2026",
    responsible_unit: "Unit Pengelolaan Pengaduan",
    legal_status: "Berlaku",
    file_url: "assets/docs/Alur_Pengaduan.pdf",
    file_size: "338 KB (PDF)",
    source_portal_url: "assets/docs/Alur_Pengaduan.pdf",
    is_verified: true
  },
  {
    id: "doc_struktur_organisasi_2026",
    title: "Bagan Struktur Organisasi Resmi Dinas Perindag ESDM Kabupaten Pinrang",
    number: "Bagan Resmi Sesuai Perbup No. 35 Tahun 2023",
    year: "2026",
    category: "Organisasi & Tupoksi",
    subject: "Organisasi & Tupoksi",
    issuer: "Pemerintah Kabupaten Pinrang",
    issued_at: "02 Januari 2026",
    responsible_unit: "Sekretariat & Pimpinan Dinas",
    legal_status: "Berlaku",
    file_url: "assets/docs/Perindag2026_Struktur_Organisasi_206x127cm6.pdf",
    file_size: "300 KB (PDF)",
    source_portal_url: "assets/docs/Perindag2026_Struktur_Organisasi_206x127cm6.pdf",
    is_verified: true
  },
  {
    id: "doc_01",
    title: "Peraturan Bupati Pinrang tentang Kedudukan, Susunan Organisasi, Tugas dan Fungsi Serta Tata Kerja Disperindag ESDM",
    slug: "perbup-tupoksi-disperindagesdm-pinrang",
    document_type: "Peraturan Bupati",
    number: "Nomor 42 Tahun 2023",
    year: "2023",
    subject: "Organisasi & Tupoksi",
    issuer: "Bupati Pinrang",
    issued_at: "27 Desember 2023",
    effective_at: "02 Januari 2024",
    legal_status: "BERLAKU",
    status_badge: "success",
    responsible_unit: "Sekretariat",
    ppid_classification: "Informasi Setiap Saat",
    file_size: "1.4 MB",
    file_url: "assets/brand/logo_pinrang_opt.png",
    checksum_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    last_verified_at: "26 Agustus 2026",
    is_featured_home: true
  },
  {
    id: "doc_02",
    title: "Rencana Strategis (Renstra) Disperindag ESDM Kabupaten Pinrang Periode 2024–2026",
    slug: "renstra-disperindagesdm-pinrang-2024-2026",
    document_type: "Dokumen Perencanaan",
    number: "Renstra 2024–2026",
    year: "2024",
    subject: "Perencanaan Daerah",
    issuer: "Disperindag ESDM Pinrang",
    issued_at: "10 Januari 2024",
    effective_at: "10 Januari 2024",
    legal_status: "BERLAKU",
    status_badge: "success",
    responsible_unit: "Subbagian Program",
    ppid_classification: "Informasi Berkala",
    file_size: "3.2 MB",
    file_url: "assets/brand/logo_pinrang_opt.png",
    checksum_sha256: "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
    last_verified_at: "26 Agustus 2026",
    is_featured_home: true
  },
  {
    id: "doc_03",
    title: "Rencana Kerja (Renja) Tahunan Dinas Perindustrian, Perdagangan, ESDM Kabupaten Pinrang Tahun 2026",
    slug: "renja-tahunan-disperindagesdm-2026",
    document_type: "Dokumen Kinerja",
    number: "DPA/A.1/3.30.01/2026",
    year: "2026",
    subject: "Rencana Kerja",
    issuer: "Disperindag ESDM Pinrang",
    issued_at: "05 Januari 2026",
    effective_at: "01 Januari 2026",
    legal_status: "BERLAKU",
    status_badge: "success",
    responsible_unit: "Subbagian Program",
    ppid_classification: "Informasi Berkala",
    file_size: "2.1 MB",
    file_url: "assets/brand/logo_pinrang_opt.png",
    checksum_sha256: "b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01",
    last_verified_at: "26 Agustus 2026",
    is_featured_home: true
  },
  {
    id: "doc_04",
    title: "Laporan Kinerja Instansi Pemerintah (LKjIP) Disperindag ESDM Kabupaten Pinrang Tahun Anggaran 2025",
    slug: "lkjip-akuntabilitas-kinerja-disperindagesdm-2025",
    document_type: "Laporan Kinerja",
    number: "LKjIP/DPE/XII/2025",
    year: "2025",
    subject: "Akuntabilitas Kinerja",
    issuer: "Disperindag ESDM Pinrang",
    issued_at: "30 Desember 2025",
    effective_at: "30 Desember 2025",
    legal_status: "BERLAKU",
    status_badge: "success",
    responsible_unit: "Subbagian Program",
    ppid_classification: "Informasi Berkala",
    file_size: "4.5 MB",
    file_url: "assets/brand/logo_pinrang_opt.png",
    checksum_sha256: "c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef012",
    last_verified_at: "26 Agustus 2026",
    is_featured_home: true
  },
  {
    id: "doc_05",
    title: "Peraturan Bupati Pinrang tentang Penyesuaian Harga Eceran Tertinggi (HET) LPG Tabung 3 Kg di Wilayah Kabupaten Pinrang",
    slug: "perbup-het-lpg-3kg-pinrang",
    document_type: "Peraturan Bupati",
    number: "Nomor 12 Tahun 2024",
    year: "2024",
    subject: "Regulasi Energi (ESDM)",
    issuer: "Bupati Pinrang",
    issued_at: "14 Juni 2024",
    effective_at: "15 Juni 2024",
    legal_status: "BERLAKU",
    status_badge: "success",
    responsible_unit: "Bidang Perindustrian, ESDM",
    ppid_classification: "Informasi Setiap Saat",
    file_size: "850 KB",
    file_url: "assets/brand/logo_pinrang_opt.png",
    checksum_sha256: "d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0123",
    last_verified_at: "26 Agustus 2026",
    is_featured_home: false
  },
  {
    id: "doc_06",
    title: "Standar Operasional Prosedur (SOP) Pelayanan Tera dan Tera Ulang UTTP UPTD Kemetrologian",
    slug: "sop-pelayanan-tera-kemetrologian-pinrang",
    document_type: "Standar Pelayanan",
    number: "SOP-DPE/01/2024",
    year: "2024",
    subject: "Standar Pelayanan",
    issuer: "Disperindag ESDM Pinrang",
    issued_at: "18 Juli 2024",
    effective_at: "18 Juli 2024",
    legal_status: "BERLAKU",
    status_badge: "success",
    responsible_unit: "Bidang Kemetrologian",
    ppid_classification: "Informasi Setiap Saat",
    file_size: "1.1 MB",
    file_url: "assets/brand/logo_pinrang_opt.png",
    checksum_sha256: "e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01234",
    last_verified_at: "26 Agustus 2026",
    is_featured_home: false
  },
  {
    id: "doc_07",
    title: "Rencana Strategis (Renstra) Disperindag Kabupaten Pinrang Periode 2019–2023",
    slug: "renstra-lama-disperindag-2019-2023",
    document_type: "Dokumen Perencanaan Lama",
    number: "Renstra 2019–2023",
    year: "2019",
    subject: "Arsip Perencanaan",
    issuer: "Disperindag Pinrang",
    issued_at: "15 Januari 2019",
    effective_at: "31 Desember 2023",
    legal_status: "ARSIP",
    status_badge: "muted",
    responsible_unit: "Subbagian Program",
    ppid_classification: "Informasi Setiap Saat",
    file_size: "2.8 MB",
    file_url: "assets/brand/logo_pinrang_opt.png",
    checksum_sha256: "f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef012345",
    last_verified_at: "26 Agustus 2026",
    is_featured_home: false
  }
];

// 6. KLASIFIKASI KETERBUKAAN INFORMASI PUBLIK (PPID ITEMS)
const DEFAULT_PPID_CATEGORIES = [
  {
    category: "Informasi Berkala",
    desc: "Informasi yang wajib diperbarui dan diumumkan secara rutin minimal 6 bulan sekali.",
    items: [
      { title: "Rencana Kerja Tahunan (Renja) Disperindag ESDM Pinrang 2026", link: "dokumen.html?id=doc_03" },
      { title: "Laporan Kinerja Instansi Pemerintah (LKjIP) Tahun 2025", link: "dokumen.html?id=doc_04" },
      { title: "Laporan Realisasi Anggaran Keuangan Dinas Semester I Tahun 2026", link: "dokumen.html" },
      { title: "Daftar Rekapitulasi Harga Bahan Pokok Harian Kabupaten Pinrang", link: "index.html#sembako" }
    ]
  },
  {
    category: "Informasi Setiap Saat",
    desc: "Informasi publik yang wajib disediakan dan dapat diakses pemohon sewaktu-waktu.",
    items: [
      { title: "Profil Lengkap, Visi Misi, dan Struktur Organisasi Kedinasan", link: "profil.html" },
      { title: "Perbup No. 42 Tahun 2023 tentang Kedudukan & Tupoksi Dinas", link: "dokumen.html?id=doc_01" },
      { title: "Standar Operasional Prosedur (SOP) 6 Layanan Publik Resmi", link: "layanan.html" },
      { title: "Daftar Inventaris Sarana dan Prasarana Pasar Sentral Pinrang", link: "layanan.html" }
    ]
  },
  {
    category: "Informasi Serta Merta",
    desc: "Informasi yang dapat mengancam hajat hidup orang banyak dan ketertiban umum.",
    items: [
      { title: "Pemberitahuan Penyesuaian HET LPG 3 Kg & Call Center Pengaduan", link: "dokumen.html?id=doc_05" },
      { title: "Jadwal dan Titik Pelaksanaan Gerakan Pangan Murah (GPM) Tanggap Inflasi", link: "arsip-berita.html" },
      { title: "Peringatan Waspada Penipuan Oknum Petugas Tera Liar Tanpa Surat Tugas", link: "layanan.html" }
    ]
  },
  {
    category: "Informasi Dikecualikan",
    desc: "Informasi yang dirahasiakan sesuai ketentuan Pasal 17 UU No. 14 Tahun 2008.",
    items: [
      { title: "Data Identitas Pribadi Pelapor Aduan Masyarakat (Kerahasiaan Terproteksi)", note: "Dikecualikan demi perlindungan data pribadi" },
      { title: "Rahasia Formula Resep & Paten Industri Pengrajin Binaan Sebelum Ber-HAKI", note: "Dikecualikan demi perlindungan HAKI IKM" },
      { title: "Dokumen Pemeriksaan Forensik Internal yang Sedang Berjalan", note: "Dikecualikan untuk kepentingan penegakan hukum" }
    ]
  }
];

// 7. DATA MULTI-PASAR & HARGA BAHAN POKOK PENTING (BAPOKTING) TERVERIFIKASI
const DEFAULT_MARKETS = [
  { id: "mkt_01", name: "Pasar Sentral Pinrang", district: "Watang Sawitto", address: "Jl. Sultan Hasanuddin, Pinrang", is_primary: true },
  { id: "mkt_02", name: "Pasar Pekkabata", district: "Duampanua", address: "Jl. Poros Pinrang–Polman", is_primary: false },
  { id: "mkt_03", name: "Pasar Marawi", district: "Tiroang", address: "Kecamatan Tiroang", is_primary: false }
];

const DEFAULT_COMMODITIES = [
  { id: "cmd_01", icon: "🌾", name: "Beras Medium SPHP (Bulog)", category: "Beras & Biji-Bijian", default_unit: "Kg" },
  { id: "cmd_02", icon: "🌾", name: "Beras Premium Lokal Lasinrang", category: "Beras & Biji-Bijian", default_unit: "Kg" },
  { id: "cmd_03", icon: "🛢️", name: "Minyak Goreng Minyakita", category: "Minyak & Gula", default_unit: "Liter" },
  { id: "cmd_04", icon: "🛢️", name: "Minyak Goreng Kemasan Premium", category: "Minyak & Gula", default_unit: "Liter" },
  { id: "cmd_05", icon: "🍬", name: "Gula Pasir Kristal Putih", category: "Minyak & Gula", default_unit: "Kg" },
  { id: "cmd_06", icon: "🌶️", name: "Cabai Rawit Merah", category: "Bumbu & Sayur", default_unit: "Kg" },
  { id: "cmd_07", icon: "🌶️", name: "Cabai Merah Keriting", category: "Bumbu & Sayur", default_unit: "Kg" },
  { id: "cmd_08", icon: "🧅", name: "Bawang Merah Lokal", category: "Bumbu & Sayur", default_unit: "Kg" },
  { id: "cmd_09", icon: "🧄", name: "Bawang Putih Honan", category: "Bumbu & Sayur", default_unit: "Kg" },
  { id: "cmd_10", icon: "🥩", name: "Daging Sapi Segar Paha Belakang", category: "Daging & Telur", default_unit: "Kg" },
  { id: "cmd_11", icon: "🍗", name: "Daging Ayam Broiler / Ras", category: "Daging & Telur", default_unit: "Kg" },
  { id: "cmd_12", icon: "🥚", name: "Telur Ayam Ras", category: "Daging & Telur", default_unit: "Rak (30 Butir)" }
];

// Data Hasil Pemantauan Harga Hari Ini (Metadata Lengkap)
const DEFAULT_COMMODITY_PRICES = [
  {
    id: "prc_01",
    commodity_id: "cmd_01",
    commodity_name: "Beras Medium SPHP (Bulog)",
    market_id: "mkt_01",
    market_name: "Pasar Sentral Pinrang",
    price: 12500,
    previous_price: 12500,
    unit: "Kg",
    diff: 0,
    trend: "stable",
    observed_date: "26 Agustus 2026",
    observed_time: "08.30 WITA",
    source_unit: "Bidang Pengembangan Perdagangan",
    enumerator: "Andi Tenri Sumpala, S.E. (Petugas Pasar)",
    verification_status: "Terverifikasi",
    verified_by: "Koordinator Pemantau Pasar",
    notes: "Pasokan stabil dari Gudang Bulog Mattiro Bulu."
  },
  {
    id: "prc_02",
    commodity_id: "cmd_02",
    commodity_name: "Beras Premium Lokal Lasinrang",
    market_id: "mkt_01",
    market_name: "Pasar Sentral Pinrang",
    price: 14500,
    previous_price: 15000,
    unit: "Kg",
    diff: -500,
    trend: "down",
    observed_date: "26 Agustus 2026",
    observed_time: "08.30 WITA",
    source_unit: "Bidang Pengembangan Perdagangan",
    enumerator: "Andi Tenri Sumpala, S.E.",
    verification_status: "Terverifikasi",
    verified_by: "Koordinator Pemantau Pasar",
    notes: "Harga turun Rp 500 seiring mulainya panen raya padi di Kecamatan Patampanua."
  },
  {
    id: "prc_03",
    commodity_id: "cmd_03",
    commodity_name: "Minyak Goreng Minyakita",
    market_id: "mkt_01",
    market_name: "Pasar Sentral Pinrang",
    price: 15700,
    previous_price: 15700,
    unit: "Liter",
    diff: 0,
    trend: "stable",
    observed_date: "26 Agustus 2026",
    observed_time: "08.35 WITA",
    source_unit: "Bidang Pengembangan Perdagangan",
    enumerator: "Andi Tenri Sumpala, S.E.",
    verification_status: "Terverifikasi",
    verified_by: "Koordinator Pemantau Pasar",
    notes: "Sesuai HET Kemendag Rp 15.700/liter."
  },
  {
    id: "prc_04",
    commodity_id: "cmd_04",
    commodity_name: "Minyak Goreng Kemasan Premium",
    market_id: "mkt_01",
    market_name: "Pasar Sentral Pinrang",
    price: 19000,
    previous_price: 19000,
    unit: "Liter",
    diff: 0,
    trend: "stable",
    observed_date: "26 Agustus 2026",
    observed_time: "08.35 WITA",
    source_unit: "Bidang Pengembangan Perdagangan",
    enumerator: "Andi Tenri Sumpala, S.E.",
    verification_status: "Terverifikasi",
    verified_by: "Koordinator Pemantau Pasar",
    notes: "Stok distributor mencukupi kebutuhan mingguan."
  },
  {
    id: "prc_05",
    commodity_id: "cmd_05",
    commodity_name: "Gula Pasir Kristal Putih",
    market_id: "mkt_01",
    market_name: "Pasar Sentral Pinrang",
    price: 17500,
    previous_price: 17500,
    unit: "Kg",
    diff: 0,
    trend: "stable",
    observed_date: "26 Agustus 2026",
    observed_time: "08.40 WITA",
    source_unit: "Bidang Pengembangan Perdagangan",
    enumerator: "Andi Tenri Sumpala, S.E.",
    verification_status: "Terverifikasi",
    verified_by: "Koordinator Pemantau Pasar",
    notes: "Stok aman dari PTPN."
  },
  {
    id: "prc_06",
    commodity_id: "cmd_06",
    commodity_name: "Cabai Rawit Merah",
    market_id: "mkt_01",
    market_name: "Pasar Sentral Pinrang",
    price: 42000,
    previous_price: 38000,
    unit: "Kg",
    diff: 4000,
    trend: "up",
    observed_date: "26 Agustus 2026",
    observed_time: "08.40 WITA",
    source_unit: "Bidang Pengembangan Perdagangan",
    enumerator: "Andi Tenri Sumpala, S.E.",
    verification_status: "Terverifikasi",
    verified_by: "Koordinator Pemantau Pasar",
    notes: "Naik Rp 4.000 akibat berkurangnya pasokan dari petani lokal di pegunungan Lembang."
  },
  {
    id: "prc_07",
    commodity_id: "cmd_07",
    commodity_name: "Cabai Merah Keriting",
    market_id: "mkt_01",
    market_name: "Pasar Sentral Pinrang",
    price: 28000,
    previous_price: 30000,
    unit: "Kg",
    diff: -2000,
    trend: "down",
    observed_date: "26 Agustus 2026",
    observed_time: "08.40 WITA",
    source_unit: "Bidang Pengembangan Perdagangan",
    enumerator: "Andi Tenri Sumpala, S.E.",
    verification_status: "Terverifikasi",
    verified_by: "Koordinator Pemantau Pasar",
    notes: "Pasokan melimpah dari Enrekang dan Sidrap."
  },
  {
    id: "prc_08",
    commodity_id: "cmd_08",
    commodity_name: "Bawang Merah Lokal",
    market_id: "mkt_01",
    market_name: "Pasar Sentral Pinrang",
    price: 32000,
    previous_price: 32000,
    unit: "Kg",
    diff: 0,
    trend: "stable",
    observed_date: "26 Agustus 2026",
    observed_time: "08.45 WITA",
    source_unit: "Bidang Pengembangan Perdagangan",
    enumerator: "Andi Tenri Sumpala, S.E.",
    verification_status: "Terverifikasi",
    verified_by: "Koordinator Pemantau Pasar",
    notes: "Pasokan stabil dari sentra bawang Bima & Enrekang."
  },
  {
    id: "prc_09",
    commodity_id: "cmd_09",
    commodity_name: "Bawang Putih Honan",
    market_id: "mkt_01",
    market_name: "Pasar Sentral Pinrang",
    price: 38000,
    previous_price: 38000,
    unit: "Kg",
    diff: 0,
    trend: "stable",
    observed_date: "26 Agustus 2026",
    observed_time: "08.45 WITA",
    source_unit: "Bidang Pengembangan Perdagangan",
    enumerator: "Andi Tenri Sumpala, S.E.",
    verification_status: "Terverifikasi",
    verified_by: "Koordinator Pemantau Pasar",
    notes: "Ketersediaan impor aman."
  },
  {
    id: "prc_10",
    commodity_id: "cmd_10",
    commodity_name: "Daging Sapi Segar Paha Belakang",
    market_id: "mkt_01",
    market_name: "Pasar Sentral Pinrang",
    price: 130000,
    previous_price: 130000,
    unit: "Kg",
    diff: 0,
    trend: "stable",
    observed_date: "26 Agustus 2026",
    observed_time: "08.50 WITA",
    source_unit: "Bidang Pengembangan Perdagangan",
    enumerator: "Andi Tenri Sumpala, S.E.",
    verification_status: "Terverifikasi",
    verified_by: "Koordinator Pemantau Pasar",
    notes: "RPA dan RPH Pinrang beroperasi normal."
  },
  {
    id: "prc_11",
    commodity_id: "cmd_11",
    commodity_name: "Daging Ayam Broiler / Ras",
    market_id: "mkt_01",
    market_name: "Pasar Sentral Pinrang",
    price: 34000,
    previous_price: 32000,
    unit: "Kg",
    diff: 2000,
    trend: "up",
    observed_date: "26 Agustus 2026",
    observed_time: "08.50 WITA",
    source_unit: "Bidang Pengembangan Perdagangan",
    enumerator: "Andi Tenri Sumpala, S.E.",
    verification_status: "Terverifikasi",
    verified_by: "Koordinator Pemantau Pasar",
    notes: "Naik tipis Rp 2.000 karena kenaikan pakan unggas jagung."
  },
  {
    id: "prc_12",
    commodity_id: "cmd_12",
    commodity_name: "Telur Ayam Ras",
    market_id: "mkt_01",
    market_name: "Pasar Sentral Pinrang",
    price: 52000,
    previous_price: 52000,
    unit: "Rak (30 Butir)",
    diff: 0,
    trend: "stable",
    observed_date: "26 Agustus 2026",
    observed_time: "08.50 WITA",
    source_unit: "Bidang Pengembangan Perdagangan",
    enumerator: "Andi Tenri Sumpala, S.E.",
    verification_status: "Terverifikasi",
    verified_by: "Koordinator Pemantau Pasar",
    notes: "Pasokan lancar dari peternak lokal Sidrap & Pinrang."
  }
];

// 8. DATA HARGA REGULASI PEMERINTAH TERPISAH (REGULATED PRICES - LPG 3 KG)
const DEFAULT_REGULATED_PRICES = [
  {
    id: "reg_01",
    product: "Liquefied Petroleum Gas (LPG) Tabung 3 Kg Bersubsidi",
    price_type: "Harga Eceran Tertinggi (HET) Tingkat Pangkalan",
    price: 20000,
    unit: "Tabung 3 Kg",
    legal_basis: "Peraturan Bupati Pinrang No. 12 Tahun 2024",
    effective_from: "15 Juni 2024",
    effective_to: "Sekarang",
    status: "BERLAKU",
    responsible_unit: "Bidang Perindustrian, Energi dan SDM",
    consumer_target: "Rumah Tangga Prasejahtera, Usaha Mikro, Nelayan Sasaran, & Petani Pompa Air",
    notes: "Pangkalan dilarang menjual melebihi HET Rp 20.000,-. Pelanggaran dikenai sanksi PHK."
  }
];

// 9. DATA ETALASE PRODUK IKM BINAAN (PRODUCTS IKM) & SERTIFIKASI
const DEFAULT_PRODUCTS_IKM = [
  {
    id: "ikm_01",
    name: "Kain Tenun Sutra Motif Khas Pinrang",
    category: "tenun",
    category_label: "Kain & Tenun",
    artisan: "Sentra Tenun Tradisional Mattiro Sompe & Suppa",
    location: "Kec. Mattiro Sompe, Kab. Pinrang",
    description: "Kain tenun sutra tradisional bermotif corak kearifan lokal Lasinrang. Menggunakan benang sutra murni dan alat tenun bukan mesin (ATBM) dengan sentuhan benang emas yang mewah.",
    img: "assets/banner/tenun_sutra_pinrang_hd.jpg",
    certifications: [
      { cert_type: "Hak Cipta HAKI", number: "EC0020241289", issuer: "Kemenkumham RI", status: "verified" },
      { cert_type: "Pewarna Alami", number: "SNI 08-0618", issuer: "BIPA Kemenperin", status: "verified" }
    ],
    admin_contact_wa: "6281242921215",
    verified_at: "26 Agustus 2026"
  },
  {
    id: "ikm_02",
    name: "Tas & Wadah Anyaman Serat Alam Lembang",
    category: "anyaman",
    category_label: "Kerajinan Serat",
    artisan: "Kelompok Pengrajin Serat Alam Lembang",
    location: "Kec. Lembang & Duampanua, Kab. Pinrang",
    description: "Tas jinjing, dompet etnik, tempat tisu, dan suvenir interior ramah lingkungan berbahan serat tanaman lokal yang kokoh, lentur, dan diolah dengan pewarna nabati.",
    img: "assets/banner/anyaman_serat_lembang_hd.jpg",
    certifications: [
      { cert_type: "Eco-Friendly", number: "ECO-PL-2025", issuer: "Dekranasda Pinrang", status: "verified" },
      { cert_type: "Binaan Dekranasda", number: "DKR-PIN-044", issuer: "Pemkab Pinrang", status: "verified" }
    ],
    admin_contact_wa: "6281242921215",
    verified_at: "26 Agustus 2026"
  },
  {
    id: "ikm_03",
    name: "Kopi Robusta Pegunungan Benteng Paremba",
    category: "kuliner",
    category_label: "Kuliner Pangan",
    artisan: "Kelompok Tani & IKM Kopi Pegunungan Lembang",
    location: "Kec. Lembang, Kab. Pinrang",
    description: "Biji kopi robusta pilihan dari dataran tinggi Benteng Paremba Pinrang dengan profil sangrai medium-dark, aroma rempah dan coklat yang tebal, higienis berstandar ekspor.",
    img: "assets/news/kopi_robusta_pinrang_murni_hd.jpg",
    certifications: [
      { cert_type: "Sertifikat Halal", number: "ID7311000128945", issuer: "BPJPH Kemenag", status: "verified" },
      { cert_type: "Izin Edar P-IRT", number: "P-IRT 5107315010245-29", issuer: "Dinkes Pinrang", status: "verified" }
    ],
    admin_contact_wa: "6281242921215",
    verified_at: "26 Agustus 2026"
  },
  {
    id: "ikm_04",
    name: "Kain Batik Corak Lasinrang Eksklusif",
    category: "tenun",
    category_label: "Kain & Batik",
    artisan: "Sanggar Seni Batik Bumi Lasinrang",
    location: "Kec. Watang Sawitto, Kab. Pinrang",
    description: "Kain batik bermotif kearifan lokal Pinrang hasil sayembara motif daerah, memadukan corak geometris Bugis Lasinrang dengan warna royal navy dan emas untuk busana formal bernilai tinggi.",
    img: "assets/banner/batik_motif_lasinrang_pinrang_hd.jpg",
    certifications: [
      { cert_type: "Hak Cipta Motif", number: "HAKI-BTK-PIN-2024", issuer: "Kemenkumham RI", status: "verified" },
      { cert_type: "Binaan Dekranasda", number: "DKR-PIN-012", issuer: "Dekranasda Pinrang", status: "verified" }
    ],
    admin_contact_wa: "6281242921215",
    verified_at: "26 Agustus 2026"
  },
  {
    id: "ikm_05",
    name: "Suvenir & Alat Rumah Tangga Bambu Artistik",
    category: "anyaman",
    category_label: "Kerajinan Bambu",
    artisan: "Sentra Kerajinan Kayu & Bambu Patampanua",
    location: "Kec. Patampanua, Kab. Pinrang",
    description: "Cangkir bambu ukir khas Sulawesi Selatan, sendok garpu kayu jati lokal, mangkok saji, dan nampan anyaman artistik yang halus, awet, dan ramah lingkungan.",
    img: "assets/banner/kerajinan_bambu_kayu_pinrang_hd.jpg",
    certifications: [
      { cert_type: "Buatan Tangan Asli", number: "HANDCRAFT-PIN-09", issuer: "Disperindag Pinrang", status: "verified" },
      { cert_type: "Produk Ramah Lingkungan", number: "GREEN-PROD-2025", issuer: "Dekranasda", status: "verified" }
    ],
    admin_contact_wa: "6281242921215",
    verified_at: "26 Agustus 2026"
  },
  {
    id: "ikm_06",
    name: "Abon Bandeng & Kerupuk Ikan Khas Suppa",
    category: "kuliner",
    category_label: "Kuliner Pangan",
    artisan: "IKM Hasil Laut & Tambak Pesisir Suppa",
    location: "Kec. Suppa, Kab. Pinrang",
    description: "Olahan protein tinggi dari ikan bandeng tambak segar pesisir Suppa Pinrang dengan rempah-rempah alami tanpa pengawet kimia, renyah, gurih, dan siap santap.",
    img: "assets/news/abon_bandeng_suppa_pinrang_hd.jpg",
    certifications: [
      { cert_type: "Sertifikat Halal", number: "ID7311000348712", issuer: "BPJPH Kemenag", status: "verified" },
      { cert_type: "TKDN-IKM", number: "TKDN-IKM-7315-2025", issuer: "Kemenperin RI", status: "verified" }
    ],
    admin_contact_wa: "6281242921215",
    verified_at: "26 Agustus 2026"
  }
];

// 10. DATA BERITA KEDINASAN RESMI BERDASARKAN UNIT KERJA (NEWS)
const DEFAULT_NEWS = [
  {
    id: "news_01",
    title: "Tindak Lanjuti Aduan Warga, Pangkalan LPG 3 Kg Nakal di Duampanua Dijatuhi Sanksi Tegas PHK",
    category: "Perindustrian, Energi & SDM",
    topic_tag: "LPG 3 Kg",
    content_origin: "internal_release",
    date: "21 Agustus 2026",
    author: "Bidang Perindustrian, ESDM",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://pinrangkab.go.id",
    img: "assets/news/sidak_lpg3kg_pinrang_hd.jpg",
    excerpt: "Disperindag ESDM Pinrang bersama agen penyalur Pertamina menjatuhkan sanksi Pemutusan Hubungan Usaha (PHU) kepada pangkalan nakal di Kec. Duampanua yang menjual tabung gas melon jauh di atas HET.",
    content: `PINRANG — Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral (Disperindag ESDM) Kabupaten Pinrang bergerak cepat menindaklanjuti laporan masyarakat terkait pangkalan gas elpiji 3 kg bersubsidi yang menjual di atas Harga Eceran Tertinggi (HET) di Kecamatan Duampanua.

Kepala Dinas Perindag ESDM Pinrang, Muhammad Yusuf Nur, S.STP, menegaskan bahwa pemerintah daerah tidak akan memberikan toleransi bagi agen maupun pangkalan yang mempermainkan harga atau menimbun gas bersubsidi yang menjadi hak masyarakat prasejahtera.

"Setelah menerima aduan masyarakat, tim pengawas ESDM kami langsung melakukan sidak lapangan bersama pihak Pertamina dan agen penyalur. Terbukti pangkalan tersebut menjual gas melon seharga Rp 26.000 hingga Rp 28.000 per tabung, jauh melampaui HET resmi Perbup Pinrang sebesar Rp 20.000. Oleh karena itu, sanksi tegas berupa Pemutusan Hubungan Usaha (PHK/PHU) langsung dijatuhkan oleh agen penyalur," tegas Kadis Perindag ESDM Pinrang.`
  },
  {
    id: "news_02",
    title: "Kawal Kepatuhan HET, Disperindag ESDM Pinrang Gelar Rakor Terpadu Bersama 9 Agen LPG se-Kabupaten Pinrang",
    category: "Perindustrian, Energi & SDM",
    topic_tag: "LPG 3 Kg",
    content_origin: "internal_release",
    date: "24 Agustus 2026",
    author: "Bidang Perindustrian, ESDM",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://pinrangkab.go.id",
    img: "assets/news/forum_konsultasi_publik_pelayanan_pinrang.jpg",
    excerpt: "Guna mencegah kelangkaan dan menjaga stabilitas pasokan energi bersubsidi, Disperindag ESDM mengumpulkan 9 direktur agen penyalur LPG 3 kg se-Kabupaten Pinrang dalam rapat koordinasi teknis.",
    content: `PINRANG — Bertempat di Aula Kantor Disperindag ESDM Kabupaten Pinrang, jajaran pimpinan dinas menggelar Rapat Koordinasi Teknis Pengawasan Pendistribusian Liquefied Petroleum Gas (LPG) Tabung 3 Kg bersama 9 pimpinan agen resmi yang beroperasi di wilayah Kabupaten Pinrang.

Rapat koordinasi ini dipimpin langsung oleh Kepala Dinas Perindag ESDM Pinrang, didampingi Kepala Bidang Perindustrian, ESDM dan dihadiri oleh seluruh direktur agen penyalur.

Fokus utama rakor ini adalah penegakan sistem digitalisasi Merchant Apps Pertamina (MAP), ketertiban administrasi pangkalan, serta pengawasan berkala agar kuota elpiji 3 kg bersubsidi benar-benar terserap oleh rumah tangga miskin, usaha mikro, dan petani pemakai pompa air.`
  },
  {
    id: "news_03",
    title: "Revitalisasi 786 Lapak Pasar Sentral Pinrang Rampung, Dorong Tata Kelola Pedagang Higienis",
    category: "Sarana & Pelaku Distribusi",
    topic_tag: "Pasar",
    content_origin: "internal_release",
    date: "12 Agustus 2026",
    author: "Bidang Sarana & Pelaku Distribusi",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://pinrangkab.go.id",
    img: "assets/news/pasar_sentral_pinrang_clean_hd.jpg",
    excerpt: "Pembangunan dan penataan sarana perdagangan Pasar Sentral Pinrang tuntas. Sebanyak 786 unit lapak pedagang kini tampil dengan konsep pasar rakyat semi-modern yang bersih dan tertib.",
    content: `PINRANG — Pembangunan dan rehabilitasi sarana prasarana Pasar Sentral Pinrang telah rampung 100 persen. Sebanyak 786 unit lapak basah, kios sembako, dan los pakaian kini tampil dengan konsep pasar rakyat semi-modern yang higienis dan nyaman bagi pengunjung.

Kepala Dinas Perindag ESDM Pinrang menyampaikan bahwa penataan pasar rakyat ini merupakan instruksi prioritas dalam menggerakkan roda ekonomi kerakyatan Bumi Lasinrang.

"Dengan selesainya revitalisasi 786 lapak ini, para pedagang kini menempati zonasi yang tertib dan higienis. Kami menargetkan penerimaan Pendapatan Asli Daerah (PAD) dari sektor retribusi pelayanan pasar dapat tercapai secara maksimal hingga Rp 900 juta pada tahun anggaran 2026," jelasnya.`
  },
  {
    id: "news_04",
    title: "Dorong Produk Lokal Masuk e-Katalog, Disperindag Pinrang Gelar Sosialisasi Sertifikasi P3DN dan TKDN bagi Pelaku IKM",
    category: "Perindustrian, Energi & SDM",
    topic_tag: "IKM",
    content_origin: "internal_release",
    date: "06 Agustus 2026",
    author: "Bidang Perindustrian, ESDM",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://pinrangkab.go.id",
    img: "assets/news/sosialisasi_tkdn_ikm_pinrang_hd.jpg",
    excerpt: "Disperindag Pinrang memfasilitasi puluhan pelaku IKM pangan olahan, kerajinan, dan mebel untuk mendapatkan sertifikasi Tingkat Komponen Dalam Negeri (TKDN-IKM) secara gratis.",
    content: `PINRANG — Upaya memperluas akses pasar bagi pelaku Industri Kecil dan Menengah (IKM) terus digencarkan oleh Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang melalui kegiatan Sosialisasi Peningkatan Penggunaan Produk Dalam Negeri (P3DN) dan Bimbingan Teknis Sertifikasi TKDN-IKM.

Kegiatan yang diikuti oleh 45 pelaku IKM binaan ini menghadirkan narasumber dari Pusat P3DN Kementerian Perindustrian RI.

Melalui program ini, para pelaku usaha lokal dibimbing untuk menghitung bobot kandungan lokal produknya dan mendaftarkannya ke sistem SIINas Kemenperin guna memperoleh sertifikat TKDN tanpa dipungut biaya (gratis).`
  },
  {
    id: "news_05",
    title: "Jamin Transaksi Adil Jelang Panen Raya, Bidang Kemetrologian Intensifkan Tera Ulang Nozel SPBU dan Timbangan Pasar",
    category: "Kemetrologian",
    topic_tag: "Tera",
    content_origin: "internal_release",
    date: "28 Juli 2026",
    author: "Bidang Kemetrologian",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://pinrangkab.go.id",
    img: "assets/news/tera_uttp_spbu_hd.jpg",
    excerpt: "Memastikan takaran BBM presisi dan timbangan pasar akurat, petugas penera Disperindag Pinrang turun ke SPBU dan sentra penggilingan gabah di seluruh kecamatan.",
    content: `PINRANG — Memasuki musim panen raya padi di Bumi Lasinrang, Bidang Kemetrologian Disperindag ESDM Pinrang mengintensifkan pengawasan dan pelayanan tera ulang Alat Ukur, Takar, Timbang, dan Perlengkapannya (UTTP).

Sidak metrologi menyasar dispenser pompa BBM di seluruh SPBU sepanjang jalur poros Pinrang–Polman dan Pinrang–Parepare, serta timbangan meja dan jembatan timbang gabah di sentra penggilingan padi.

Petugas Penera Ahli menguji takaran menggunakan bejana ukur standar 20 liter berstandar nasional dan memastikan batas kesalahan yang diizinkan (BKD) tidak melebihi ambang batas toleransi.`
  },
  {
    id: "news_06",
    title: "Sinergi Dekranasda dan Disperindag Pinrang Promosikan Kain Tenun Sutra Motif Khas Lasinrang di Panggung Nasional",
    category: "Perindustrian, Energi & SDM",
    topic_tag: "Pameran",
    content_origin: "internal_release",
    date: "18 Juli 2026",
    author: "Dekranasda & Humas Disperindag",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://pinrangkab.go.id",
    img: "assets/banner/tenun_sutra_pinrang_hd.jpg",
    excerpt: "Kain tenun sutra tradisional motif khas Kabupaten Pinrang memukau pengunjung pameran kerajinan nasional berkat perpaduan corak etnik Bugis dan pewarna alami ramah lingkungan.",
    content: `JAKARTA — Produk kerajinan kain tenun sutra khas Kabupaten Pinrang tampil memukau dalam ajang Pameran Kerajinan Nusantara yang berlangsung di Jakarta Convention Center.

Keikutsertaan ini merupakan kolaborasi strategis antara Dewan Kerajinan Nasional Daerah (Dekranasda) Kabupaten Pinrang bersama Disperindag ESDM Pinrang dalam membina pengrajin tenun lokal.

Kain tenun yang dipamerkan menonjolkan motif kearifan lokal Lasinrang yang telah resmi mengantongi sertifikat Hak Kekayaan Intelektual (HAKI).`
  }
];

// 11. DATA 8 BANNER HERO CAROUSEL RESMI
const DEFAULT_BANNERS = [
  {
    id: "bnr_01",
    img: "assets/news/sidak_lpg3kg_pinrang_hd.jpg",
    title: "Pengawasan Ketat Distribusi LPG 3 Kg Bersubsidi & Kepatuhan HET",
    caption: "Inspeksi lapangan terpadu memastikan ketersediaan pasokan gas melon bagi masyarakat prasejahtera.",
    active: true
  },
  {
    id: "bnr_02",
    img: "assets/news/tera_uttp_spbu_hd.jpg",
    title: "Pelayanan Tera & Tera Ulang UTTP Menuju Pinrang Daerah Tertib Ukur",
    caption: "Pengujian kalibrasi presisi dispenser BBM SPBU dan timbangan pedagang pasar demi transaksi yang adil.",
    active: true
  },
  {
    id: "bnr_03",
    img: "assets/banner/pasar_sentral_pinrang_clean_hd.jpg",
    title: "Revitalisasi 786 Sarana Lapak Perdagangan Pasar Sentral Pinrang",
    caption: "Penataan zonasi lapak pedagang semi-modern yang higienis, tertib, dan nyaman bagi pengunjung.",
    active: true
  },
  {
    id: "bnr_04",
    img: "assets/banner/tenun_sutra_pinrang_hd.jpg",
    title: "Pelestarian & Promosi Mahakarya Tenun Sutra Motif Khas Lasinrang",
    caption: "Sinergi pembinaan pengrajin tenun sutra tradisional Pinrang menembus pasar industri kreatif nasional.",
    active: true
  },
  {
    id: "bnr_05",
    img: "assets/banner/anyaman_serat_lembang_hd.jpg",
    title: "Pengembangan Industri Kreatif & Anyaman Serat Alam Lembang",
    caption: "Pemberdayaan kelompok pengrajin serat alam lokal ramah lingkungan binaan Disperindag & Dekranasda.",
    active: true
  },
  {
    id: "bnr_06",
    img: "assets/news/sosialisasi_tkdn_ikm_pinrang_hd.jpg",
    title: "Fasilitasi Sertifikasi TKDN, Halal, & Izin Edar bagi Pelaku IKM Pinrang",
    caption: "Akselerasi produk industri kecil menengah lokal masuk ke e-Katalog Pengadaan Barang dan Jasa Pemerintah.",
    active: true
  },
  {
    id: "bnr_07",
    img: "assets/news/kopi_robusta_pinrang_murni_hd.jpg",
    title: "Hilirisasi & Pengemasan Kopi Robusta Khas Pegunungan Pinrang",
    caption: "Peningkatan mutu produk kopi pegunungan Benteng Paremba dan beras ketan khas dengan kemasan standar ekspor.",
    active: true
  },
  {
    id: "bnr_08",
    img: "assets/banner/pameran_gelar_dagang_pinrang_hd.jpg",
    title: "Operasi Pasar Murah & Fasilitasi Promosi Dagang UMKM Daerah",
    caption: "Penyediaan sembako terjangkau dan stan pameran dagang gratis guna menjaga daya beli masyarakat di 12 kecamatan.",
    active: true
  }
];

function getStorage(key, defaultVal) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {}
}


// 15. DATA REKAPITULASI PENGADUAN RESMI TAHUN 2025 (FAKTUAL 2 DITERIMA / 2 SELESAI / 100%)
const DEFAULT_COMPLAINT_RECAP_2025 = {
  year: 2025,
  period: "Januari – Desember 2025",
  title: "Rekapitulasi Pengaduan Masyarakat Tahun 2025",
  summary: "Rekapitulasi pengaduan masyarakat yang diterima melalui berbagai kanal resmi Disperindag ESDM Kabupaten Pinrang selama Januari–Desember 2025.",
  total_received: 2,
  total_resolved: 2,
  in_progress: 0,
  resolution_rate_pct: "100%",
  channels: [
    { channel: "Call Center / Telepon", count: 1, icon: "📞", pct: "50%" },
    { channel: "Tatap Muka / Langsung", count: 1, icon: "🏛️", pct: "50%" },
    { channel: "Kotak Saran", count: 0, icon: "📬", pct: "0%" },
    { channel: "Media Sosial (Instagram/Facebook)", count: 0, icon: "📱", pct: "0%" },
    { channel: "Website & Email", count: 0, icon: "🌐", pct: "0%" },
    { channel: "WhatsApp Hotline", count: 0, icon: "💬", pct: "0%" },
    { channel: "SP4N-LAPOR!", count: 0, icon: "📢", pct: "0%" }
  ],
  cases: [
    {
      id: "aduan_2025_01",
      number: "PENGADUAN 1",
      date: "15 Juni 2025",
      time: "08.30 WITA",
      substance: "Kelangkaan Gas Elpiji 3 Kg",
      classification: "Pengembangan Perdagangan",
      channel: "Call Center",
      follow_up: "Konsultasi dengan agen resmi LPG sampai pangkalan serta pengawasan/pemantauan penyaluran LPG.",
      duration: "1 hari",
      status: "SELESAI",
      status_badge: "badge-green"
    },
    {
      id: "aduan_2025_02",
      number: "PENGADUAN 2",
      date: "02 Agustus 2025",
      time: "09.00 WITA",
      substance: "Adanya timbangan yang belum ditera/tera ulang",
      classification: "Kemetrologian",
      channel: "Tatap Muka Langsung",
      follow_up: "Pelayanan dan pengawasan tera/tera ulang UTTP (Ukur, Takar, Timbang dan Perlengkapannya).",
      duration: "1 minggu",
      status: "SELESAI",
      status_badge: "badge-green"
    }
  ],
  infographic: "assets/infografis/Rekapitulasi_Pengaduan_2025.jpg"
};

// 12. DATA PENGADUAN DENGAN NOMOR TIKET (COMPLAINTS - ARAHAN V3 POIN 15-18)
const DEFAULT_REPORTS = [
  {
    id: "rep_01",
    ticket_number: "DPE-2026-000101",
    source_channel: "website",
    submitted_at: "26 Agustus 2026 • 14.15 WITA",
    nama: "H. Basri Rahman",
    kontak: "0852-9988-1234",
    kategori: "LPG 3 Kg / ESDM",
    lokasi: "Jl. Poros Lampa, Kec. Duampanua",
    pesan: "Pangkalan menjual gas 3 kg seharga Rp 26.000 per tabung di atas HET resmi tanpa mencatat logbook KTP pembeli.",
    assigned_unit: "Bidang Perindustrian, ESDM",
    assigned_officer: "Ir. Faisal Aris, M.Si.",
    status: "Selesai Ditindaklanjuti",
    timeline_step: 6,
    resolution: "Tim Pengawas ESDM bersama agen telah melakukan sidak lapangan pada 26 Agustus 2026. Pangkalan diberikan Surat Peringatan (SP-1) dan wajib menjual kembali sesuai HET Rp 20.000."
  },
  {
    id: "rep_02",
    ticket_number: "DPE-2026-000102",
    source_channel: "whatsapp",
    submitted_at: "26 Agustus 2026 • 09.30 WITA",
    nama: "Ibu Fatimah",
    kontak: "0813-4455-6789",
    kategori: "Kemetrologian / Tera",
    lokasi: "Pasar Sentral Pinrang (Los Ikan No. 14)",
    pesan: "Timbangan meja pedagang ikan diduga ada selisih minus 1,5 ons saat dicek mandiri di pos timbang ukur pasar.",
    assigned_unit: "Bidang Kemetrologian",
    assigned_officer: "Supriadi Rahman, S.T. (Penera Ahli)",
    status: "Sedang Ditindaklanjuti",
    timeline_step: 5,
    resolution: "Petugas Penera telah melakukan re-kalibrasi dan membubuhkan Cap Tanda Tera Sah 2026 di tempat."
  },
  {
    id: "rep_03",
    ticket_number: "DPE-2026-000103",
    source_channel: "website",
    submitted_at: "27 Agustus 2026 • 07.45 WITA",
    nama: "Mansyur, S.Pd.",
    kontak: "0821-8765-4321",
    kategori: "Perdagangan / Harga / Bapokting",
    lokasi: "Pasar Pekkabata, Kec. Duampanua",
    pesan: "Mohon informasi stok beras SPHP Bulog diperbanyak di Pasar Pekkabata untuk menstabilkan harga beras lokal.",
    assigned_unit: "Bidang Pengembangan Perdagangan",
    assigned_officer: "Koordinator Tim TPID",
    status: "Verifikasi & Analisis",
    timeline_step: 3,
    resolution: "Laporan diteruskan ke Perum Bulog Cabang Pinrang untuk jadwal dropping beras SPHP tambahan pekan ini."
  },
  {
    id: "rep_04",
    ticket_number: "DPE-2026-000104",
    source_channel: "sp4n_lapor",
    submitted_at: "27 Agustus 2026 • 08.20 WITA",
    nama: "Siti Rahmawati",
    kontak: "0853-1122-3344",
    kategori: "Industri & IKM",
    lokasi: "Kecamatan Lembang",
    pesan: "Ingin berkonsultasi mengenai pendampingan izin sertifikasi Halal gratis dan uji nutrisi produk olahan abon bandeng.",
    assigned_unit: "Bidang Perindustrian",
    assigned_officer: "Klinik Fasilitasi IKM",
    status: "Diterima & Registrasi",
    timeline_step: 2,
    resolution: "Pemohon telah dihubungi petugas Klinik IKM untuk penjadwalan pendampingan pembuatan akun SIINas dan pendaftaran SiHalal."
  }
];

// 13. DATA KONFIGURASI METRIK COMMAND CENTER & TV WALLBOARD
const DEFAULT_COMMAND_CENTER_CONFIG = {
  inflation_rate: "2.1%",
  inflation_status: "Sangat Aman & Terkendali",
  pasar_sentral_stalls: "786",
  pasar_sentral_status: "100% Zonasi Aktif",
  uttp_verified: "2.450+",
  uttp_status: "Cap Tera Sah Aktif",
  spbu_verified_pct: "100%",
  het_lpg_price: "Rp 20.000",
  het_lpg_regulation: "Perbup Pinrang No. 12/2024",
  lpg_distribution_pct: "84.5%",
  lpg_distributed_bottles: "24.800 Tabung",
  lpg_total_quota: "29.350 Tabung",
  lpg_official_agents: "11 Agen",
  lpg_official_bases: "340+ Pangkalan Aktif",
  total_ikm_trained: "1.248",
  total_ikm_certified: "320+",
  skm_score: "89.4 / 100",
  skm_grade: "SANGAT BAIK (A)",
  ticker_text: "🌾 Beras Medium SPHP: Rp 12.500/Kg (Stabil) • 🌾 Beras Premium Lokal Lasinrang: Rp 14.500/Kg (Turun Rp 500) • 🛢️ Minyakita: Rp 15.700/Liter (Terkendali) • 🌶️ Cabai Rawit Merah: Rp 42.000/Kg (Pasokan Terjaga) • ⚡ HET Gas LPG 3 Kg Pinrang: Rp 20.000/Tabung (Perbup No. 12/2024) • ⚖️ Posko Layanan Tera UTTP: Senin – Jumat 08.00–15.30 WITA • 🏭 Klinik Fasilitasi IKM: Pendaftaran Akun SIINas & Sertifikasi TKDN Gratis",
  last_updated: "27 Agustus 2026 00:45 WITA"
};

// 14. DATA STATUS PENGAWASAN 12 KECAMATAN SE-KABUPATEN PINRANG
const DEFAULT_DISTRICTS_STATUS = [
  { id: "dist_01", name: "Watang Sawitto", status: "NORMAL", pangkalan: 62, icon: "🟢", note: "Pusat Induk Pasar Sentral & Tera Aman" },
  { id: "dist_02", name: "Paleteang", status: "NORMAL", pangkalan: 48, icon: "🟢", note: "SPBU Jalur Poros Terverifikasi" },
  { id: "dist_03", name: "Tiroang", status: "NORMAL", pangkalan: 26, icon: "🟢", note: "Pasar Marawi & Sentra Hortikultura" },
  { id: "dist_04", name: "Patampanua", status: "NORMAL", pangkalan: 34, icon: "🟢", note: "Distribusi LPG & Timbangan Sawit Aman" },
  { id: "dist_05", name: "Duampanua", status: "NORMAL", pangkalan: 42, icon: "🟢", note: "Pasar Pekkabata & Poros Trans Aman" },
  { id: "dist_06", name: "Lembang", status: "NORMAL", pangkalan: 31, icon: "🟢", note: "Sentra Kopi Robusta & Serat Alam" },
  { id: "dist_07", name: "Mattiro Sompe", status: "NORMAL", pangkalan: 28, icon: "🟢", note: "Sentra RMU Penggilingan Padi" },
  { id: "dist_08", name: "Suppa", status: "NORMAL", pangkalan: 27, icon: "🟢", note: "Pesisir, Tambak & SPBU Jalur Trans" },
  { id: "dist_09", name: "Lanrisang", status: "NORMAL", pangkalan: 20, icon: "🟢", note: "Sentra Padi & Jembatan Timbang Teruji" },
  { id: "dist_10", name: "Mattiro Bulu", status: "NORMAL", pangkalan: 22, icon: "🟢", note: "Stok Pangkalan Terkendali" },
  { id: "dist_11", name: "Cempa", status: "NORMAL", pangkalan: 18, icon: "🟢", note: "Penyaluran LPG Tepat Sasaran" },
  { id: "dist_12", name: "Batulappa", status: "NORMAL", pangkalan: 14, icon: "🟢", note: "Wilayah Perbukitan Terlayani" }
];

// 17. DATASET MEDIA & SOCIAL INTELLIGENCE HUB (REAL-TIME MONITORING)
const DEFAULT_MEDIA_INTELLIGENCE = {
  summary: {
    total_mentions: 1482,
    positive_percentage: 78,
    neutral_percentage: 16,
    negative_percentage: 6,
    total_reach: "185.4K",
    total_engagement: "24.8K",
    media_articles: 142,
    social_posts: 486,
    citizen_comments: 854,
    hot_issues_count: 5,
    last_crawler_sync: "27 Agustus 2026, 01:25 WITA",
    crawling_status: "ACTIVE",
    ingestion_nodes: 8
  },
  trending_topics: [
    {
      id: "tt_01",
      topic: "Stabilitas HET Gas LPG 3 Kg & Pengawasan Pangkalan",
      category: "ESDM & Energi",
      volume: 512,
      sentiment: { positive: 74, neutral: 20, negative: 6 },
      trend: "up",
      status: "Stabil & Terkendali",
      badge_color: "emerald"
    },
    {
      id: "tt_02",
      topic: "Operasi Pasar Murah Bapokting Pengendalian Inflasi",
      category: "Perdagangan",
      volume: 428,
      sentiment: { positive: 92, neutral: 6, negative: 2 },
      trend: "up",
      status: "Sangat Positif (Apresiasi Publik)",
      badge_color: "emerald"
    },
    {
      id: "tt_03",
      topic: "Uji Tera Pompa SPBU & Timbangan Pasar Sentral",
      category: "Kemetrologian",
      volume: 264,
      sentiment: { positive: 88, neutral: 10, negative: 2 },
      trend: "stable",
      status: "Kepatuhan Tinggi",
      badge_color: "blue"
    },
    {
      id: "tt_04",
      topic: "Promosi Kain Sutra & Kerajinan IKM Pinrang",
      category: "Perindustrian & IKM",
      volume: 186,
      sentiment: { positive: 95, neutral: 5, negative: 0 },
      trend: "up",
      status: "Pemberdayaan Berjalan Baik",
      badge_color: "emerald"
    },
    {
      id: "tt_05",
      topic: "Penataan Parkir & Kebersihan Pasar Sentral Pinrang",
      category: "Sarana Distribusi Pasar",
      volume: 92,
      sentiment: { positive: 45, neutral: 35, negative: 20 },
      trend: "down",
      status: "Dalam Proses Relokasi Trantib",
      badge_color: "amber"
    }
  ],
  verified_news: [
    {
      id: "mn_01",
      media_name: "Antara News Sulsel",
      media_category: "Nasional",
      title: "Disperindag ESDM Pinrang Jamin Stok LPG 3 Kg Aman Sesuai HET Rp 20.000",
      url: "https://makassar.antaranews.com/berita/lpg-pinrang-aman",
      published_at: "26 Agustus 2026, 17:45 WITA",
      sentiment: "positive",
      sentiment_label: "🟢 Sangat Positif",
      summary: "Dinas Perindag ESDM Pinrang intensifkan sidak gabungan pangkalan dan agen di 12 kecamatan untuk memastikan tidak ada spekulasi harga elpiji bersubsidi."
    },
    {
      id: "mn_02",
      media_name: "Tribun Timur Pinrang",
      media_category: "Regional",
      title: "Pasar Murah TPID Pinrang Diserbu Ribuan Warga, Inflasi Daerah Terjaga 2,1 Persen",
      url: "https://makassar.tribunnews.com/pinrang/pasar-murah-tpid",
      published_at: "26 Agustus 2026, 14:20 WITA",
      sentiment: "positive",
      sentiment_label: "🟢 Sangat Positif",
      summary: "Penyaluran beras medium SPHP dan minyak goreng bersubsidi di halaman kantor dinas berlangsung tertib dan membantu daya beli masyarakat."
    },
    {
      id: "mn_03",
      media_name: "Harian Fajar Online",
      media_category: "Regional",
      title: "Ukur Ulang Nozzle SPBU Jalur Trans Sulawesi, Tim UML Pinrang Tempel Segel Sah",
      url: "https://fajar.co.id/metrologi-spbu-pinrang",
      published_at: "25 Agustus 2026, 11:30 WITA",
      sentiment: "positive",
      sentiment_label: "🟢 Sangat Positif",
      summary: "Pengujian bejana ukur standar 20 liter menunjukkan deviasi nozzle SPBU se-Kabupaten Pinrang di bawah batas toleransi resmi BKD (0,5%)."
    }
  ],
  social_posts: [
    {
      id: "sp_01",
      platform: "instagram",
      platform_icon: "📸",
      account_name: "Disperindag ESDM Pinrang",
      account_handle: "@perindagempinrang",
      url: "https://www.instagram.com/perindagempinrang/",
      caption: "Tim Pengawas ESDM & Perdagangan melakukan sidak berkala ketersediaan tabung Gas LPG 3 Kg bersubsidi di pangkalan resmi Kec. Watang Sawitto dan Mattiro Bulu. Pastikan membeli di pangkalan resmi dengan harga HET Rp 20.000/tabung! ⛽🔥 #DisperindagPinrang #GasElpiji",
      post_time: "Kemarin, 15:30 WITA",
      likes: "1.420",
      comments: 68,
      shares: 112,
      is_critical: false,
      sentiment: "positive",
      media_img: "assets/news/sidak_lpg3kg_pinrang_hd.jpg",
      engagement_rate: "4.8%"
    },
    {
      id: "sp_02",
      platform: "facebook",
      platform_icon: "👥",
      account_name: "Suara Warga Pinrang (Grup Publik)",
      account_handle: "Komunitas 85K Anggota",
      url: "https://web.facebook.com/groups/suarawargapinrang",
      caption: "Lapor pak kadis, pedagang kaki lima di luar pagar timur Pasar Sentral mulai bikin macet tiap pagi jam 07.00. Mohon UPT Pasar dan dinas terkait menertibkan agar pembeli nyaman masuk ke dalam gedung pasar.",
      post_time: "Kemarin, 19:15 WITA",
      likes: "420",
      comments: 89,
      shares: 45,
      is_critical: true,
      sentiment: "negative",
      media_img: "assets/banner/pasar_sentral_pinrang_clean_hd.jpg",
      engagement_rate: "6.2%"
    },
    {
      id: "sp_03",
      platform: "tiktok",
      platform_icon: "🎵",
      account_name: "Warga Pinrang Official",
      account_handle: "@wargapinrang",
      url: "https://www.tiktok.com/@explorepinrang",
      caption: "Serbuan emak-emak di Pasar Murah Disperindag Pinrang! Minyakita 14rb dan Beras 5kg cuma 55rb langsung ludes dalam 2 jam. Keren pemda sering-sering buat kayak gini ya pak bupati! 👍🍚🔥",
      post_time: "2 hari lalu",
      likes: "4.850",
      comments: 230,
      shares: 640,
      views: "68.5K",
      is_critical: false,
      sentiment: "positive",
      media_img: "assets/news/operasi_pasar_murah_sembako_pinrang.jpg",
      engagement_rate: "8.2%"
    }
  ],
  citizen_comments: [
    {
      id: "cc_01",
      author_name: "Hasbullah (@hasbul_batulappa)",
      source_platform: "Instagram",
      source_icon: "📸",
      direct_url: "https://www.instagram.com/perindagempinrang/",
      avatar_char: "HB",
      comment_text: "Tolong sidak pengecer di Batulappa pak, kami beli sampai 25 ribu per tabung 3kg karena pangkalan jauh dari dusun. Mohon ditambah pangkalan resmi di desa kami biar harga sesuai HET Rp 20.000!",
      timestamp: "27 Agustus 2026, 01:10 WITA",
      sentiment: "negative",
      sentiment_label: "🔴 Keluhan / Evaluasi Mendesak",
      disposition: "⚠️ DISPOSISI: Bidang ESDM (Jadwal Pengawasan Pangkalan Batulappa)",
      official_response: "Laporan diterima Bapak Hasbullah. Tim Pengawas ESDM telah menjadwalkan verifikasi pangkalan dan kuota distribusi wilayah Batulappa pekan ini."
    },
    {
      id: "cc_02",
      author_name: "Iwan Darmawan (Warga Watang Sawitto)",
      source_platform: "Facebook",
      source_icon: "👥",
      direct_url: "https://web.facebook.com/groups/suarawargapinrang",
      avatar_char: "ID",
      comment_text: "Trotoar timur Pasar Sentral macet parah tiap pagi karena lapak jualan di luar pagar. Pembeli yang mau parkir jadi susah. Tolong ditertibkan bersama Satpol PP pak.",
      timestamp: "26 Agustus 2026, 21:30 WITA",
      sentiment: "negative",
      sentiment_label: "🔴 Masukan Ketertiban Pasar",
      disposition: "⚠️ DISPOSISI: UPT Pengelola Pasar Sentral & Koordinasi Trantib",
      official_response: "Terima kasih informasinya. UPT Pasar Sentral sedang melakukan penataan relokasi pedagang trotoar ke dalam blok los basah yang masih kosong."
    },
    {
      id: "cc_03",
      author_name: "Andi Sukmawati, S.Pd.",
      source_platform: "Facebook",
      source_icon: "👥",
      direct_url: "https://web.facebook.com/groups/suarawargapinrang",
      avatar_char: "AS",
      comment_text: "Alhamdulillah kemarin dapat beras SPHP dan minyak goreng murah di halaman kantor dinas. Sangat meringankan beban dapur kami para ibu rumah tangga. Terima kasih jajaran Disperindag Pinrang!",
      timestamp: "26 Agustus 2026, 18:15 WITA",
      sentiment: "positive",
      sentiment_label: "🟢 Apresiasi Publik",
      disposition: null,
      official_response: "Terima kasih Ibu Andi Sukmawati. Program pasar murah TPID akan terus berlanjut ke kecamatan lainnya secara bergilir demi menjaga daya beli warga."
    }
  ]
};

function initDataStoreMigration() {
  const currentVer = localStorage.getItem('disperindag_data_version');
  const targetVer = "2026_08_29_seo_slug_v3";
  if (currentVer !== targetVer) {
    localStorage.setItem('disperindag_site_settings', JSON.stringify(DEFAULT_SITE_SETTINGS));
    localStorage.setItem('disperindag_contact_channels', JSON.stringify(DEFAULT_CONTACT_CHANNELS));
    localStorage.setItem('disperindag_maklumat', JSON.stringify(DEFAULT_MAKLUMAT));
    localStorage.setItem('disperindag_service_hours', JSON.stringify(DEFAULT_SERVICE_HOURS));
    localStorage.setItem('disperindag_officials', JSON.stringify(DEFAULT_OFFICIALS));
    localStorage.setItem('disperindag_org_units', JSON.stringify(DEFAULT_ORGANIZATION_UNITS));
    localStorage.setItem('disperindag_services', JSON.stringify(DEFAULT_SERVICES));
    localStorage.setItem('disperindag_documents', JSON.stringify(DEFAULT_DOCUMENTS));
    localStorage.setItem('disperindag_ppid', JSON.stringify(DEFAULT_PPID_CATEGORIES));
    localStorage.setItem('disperindag_markets', JSON.stringify(DEFAULT_MARKETS));
    localStorage.setItem('disperindag_commodities', JSON.stringify(DEFAULT_COMMODITIES));
    
    // Auto-Recovery Prices: gabungkan data tersimpan jika ada dengan 12 default prices
    const existingPrices = getStorage('disperindag_prices', null);
    const resolvedPrices = existingPrices ? mergePricesWithDefaults(existingPrices) : DEFAULT_COMMODITY_PRICES;
    localStorage.setItem('disperindag_prices', JSON.stringify(resolvedPrices));
    
    localStorage.setItem('disperindag_regulated_prices', JSON.stringify(DEFAULT_REGULATED_PRICES));
    localStorage.setItem('disperindag_products_ikm', JSON.stringify(DEFAULT_PRODUCTS_IKM));
    localStorage.setItem('disperindag_news', JSON.stringify(DEFAULT_NEWS));
    localStorage.setItem('disperindag_banners', JSON.stringify(DEFAULT_BANNERS));
    localStorage.setItem('disperindag_reports', JSON.stringify(DEFAULT_REPORTS));
    localStorage.setItem('disperindag_command_center', JSON.stringify(DEFAULT_COMMAND_CENTER_CONFIG));
    localStorage.setItem('disperindag_districts', JSON.stringify(DEFAULT_DISTRICTS_STATUS));
    localStorage.setItem('disperindag_media_intelligence', JSON.stringify(DEFAULT_MEDIA_INTELLIGENCE));
    localStorage.setItem('disperindag_complaint_recap_2025', JSON.stringify(DEFAULT_COMPLAINT_RECAP_2025));
    localStorage.setItem('disperindag_data_version', targetVer);
  } else {
    // Validasi liveness data harga pada runtime
    const storedPrices = getStorage('disperindag_prices', []);
    if (!Array.isArray(storedPrices) || storedPrices.length < (DEFAULT_COMMODITY_PRICES || []).length) {
      const recovered = mergePricesWithDefaults(storedPrices);
      localStorage.setItem('disperindag_prices', JSON.stringify(recovered));
    }
  }
}

// Window Global Exports
window.DEFAULT_SITE_SETTINGS = DEFAULT_SITE_SETTINGS;
window.DEFAULT_CONTACT_CHANNELS = DEFAULT_CONTACT_CHANNELS;
window.DEFAULT_MAKLUMAT = DEFAULT_MAKLUMAT;
window.DEFAULT_SERVICE_HOURS = DEFAULT_SERVICE_HOURS;
window.DEFAULT_OFFICIALS = DEFAULT_OFFICIALS;
window.DEFAULT_ORGANIZATION_UNITS = DEFAULT_ORGANIZATION_UNITS;
window.DEFAULT_SERVICES = DEFAULT_SERVICES;
window.DEFAULT_DOCUMENTS = DEFAULT_DOCUMENTS;
window.DEFAULT_PPID_CATEGORIES = DEFAULT_PPID_CATEGORIES;
window.DEFAULT_MARKETS = DEFAULT_MARKETS;
window.DEFAULT_COMMODITIES = DEFAULT_COMMODITIES;
window.DEFAULT_COMMODITY_PRICES = DEFAULT_COMMODITY_PRICES;
window.DEFAULT_REGULATED_PRICES = DEFAULT_REGULATED_PRICES;
window.DEFAULT_PRODUCTS_IKM = DEFAULT_PRODUCTS_IKM;
window.DEFAULT_NEWS = DEFAULT_NEWS;
window.DEFAULT_BANNERS = DEFAULT_BANNERS;
window.DEFAULT_REPORTS = DEFAULT_REPORTS;
window.DEFAULT_COMMAND_CENTER_CONFIG = DEFAULT_COMMAND_CENTER_CONFIG;
window.DEFAULT_DISTRICTS_STATUS = DEFAULT_DISTRICTS_STATUS;
window.DEFAULT_MEDIA_INTELLIGENCE = DEFAULT_MEDIA_INTELLIGENCE;
window.DEFAULT_COMPLAINT_RECAP_2025 = DEFAULT_COMPLAINT_RECAP_2025;

// ------------------------------------------------------------------------------
// INISIALISASI AUTO-MIGRASI DATA STORE (LOCALSTORAGE HYBRID)
// ------------------------------------------------------------------------------
initDataStoreMigration();