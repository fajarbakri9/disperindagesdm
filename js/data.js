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

// Waktu kanonis berita untuk pengurutan dan resolusi konflik secara deterministik.
function getNewsTimestamp(item) {
  if (!item) return 0;
  const candidates = [item.updated_at, item.updatedAt, item.published_at, item.publishedAt, item.created_at, item.createdAt];
  for (const value of candidates) {
    if (!value) continue;
    const dateValue = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    const timestamp = dateValue.getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return 0;
}

// Escaping untuk field teks yang dimasukkan ke template HTML.
window.escapeNewsText = function(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
};

// Sanitizer allowlist untuk isi rich-text berita. Event handler, script,
// iframe, style berbahaya, serta URL non-HTTP dibuang sebelum dirender/disimpan.
window.sanitizeNewsHtml = function(input) {
  const source = String(input ?? '');
  if (!source || typeof DOMParser === 'undefined') return source;

  const allowedTags = new Set([
    'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'H2', 'H3', 'H4',
    'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'FIGURE', 'FIGCAPTION', 'IMG',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'HR', 'DIV', 'SPAN'
  ]);
  const allowedAttributes = {
    A: new Set(['href', 'title', 'target', 'rel']),
    IMG: new Set(['src', 'alt', 'title', 'loading', 'width', 'height']),
    TH: new Set(['colspan', 'rowspan', 'scope']),
    TD: new Set(['colspan', 'rowspan']),
    DIV: new Set(['class']), BLOCKQUOTE: new Set(['class']),
    TABLE: new Set(['class']), SPAN: new Set(['class'])
  };
  const parsed = new DOMParser().parseFromString(`<body>${source}</body>`, 'text/html');

  Array.from(parsed.body.querySelectorAll('*')).forEach(node => {
    if (!allowedTags.has(node.tagName)) {
      node.replaceWith(...Array.from(node.childNodes));
      return;
    }
    Array.from(node.attributes).forEach(attr => {
      const allowed = allowedAttributes[node.tagName];
      if (!allowed || !allowed.has(attr.name.toLowerCase())) node.removeAttribute(attr.name);
    });
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (!/^(https?:|mailto:|tel:|\/|#)/i.test(href)) node.removeAttribute('href');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') || '';
      if (!/^(https?:|\/|assets\/)/i.test(src)) node.remove();
      else node.setAttribute('loading', node.getAttribute('loading') || 'lazy');
    }
  });
  return parsed.body.innerHTML;
};
window.getNewsTimestamp = getNewsTimestamp;

// Deduplikasi berdasarkan ID/slug. Jika data lama berkonflik, versi terbaru selalu menang.
function deduplicateNewsList(list) {
  if (!Array.isArray(list)) return [];
  const sorted = list.filter(Boolean).slice().sort((a, b) => getNewsTimestamp(b) - getNewsTimestamp(a));
  const seenIds = new Set();
  const seenSlugs = new Set();

  return sorted.filter(item => {
    const id = String(item.id || '').trim();
    const slug = String(item.slug || '').toLowerCase().trim();
    if ((id && seenIds.has(id)) || (slug && seenSlugs.has(slug))) return false;
    if (id) seenIds.add(id);
    if (slug) seenSlugs.add(slug);
    return true;
  });
}
window.deduplicateNewsList = deduplicateNewsList;

// Universal Helper Merge Data Berita (Mencegah Duplikasi & Menghormati Penghapusan Berita Admin)
function mergeNewsWithDefaults(incomingList) {
  // 1. Ambil daftar ID berita yang pernah dihapus oleh Admin (Tombstone Tracking)
  let deletedIds = [];
  try {
    const rawDeleted = localStorage.getItem('disperindag_deleted_news_ids');
    if (rawDeleted) deletedIds = JSON.parse(rawDeleted);
  } catch(e) {}
  const deletedSet = new Set(Array.isArray(deletedIds) ? deletedIds : []);

  // 2. Filter base default news
  const rawBaseList = JSON.parse(JSON.stringify(typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []));
  const baseList = rawBaseList.filter(item => !deletedSet.has(item.id));

  if (!Array.isArray(incomingList) || incomingList.length === 0) {
    return deduplicateNewsList(baseList);
  }

  // 3. Filter incoming list dari ID terhapus
  const cleanIncoming = incomingList.filter(item => item && item.id && !deletedSet.has(item.id));

  const baseMap = new Map();
  baseList.forEach(item => baseMap.set(item.id, item));

  // Gantikan item default dengan item editan dari incoming
  cleanIncoming.forEach(inc => {
    if (baseMap.has(inc.id)) {
      baseMap.set(inc.id, { ...baseMap.get(inc.id), ...inc });
    }
  });

  // Kumpulkan item baru yang tidak ada di default
  const newCustomItems = cleanIncoming.filter(inc => !baseList.some(b => b.id === inc.id));

  // Gabungkan custom items baru dan baseMap
  const merged = [...newCustomItems, ...Array.from(baseMap.values())];
  
  // Sortir agar artikel dengan updated_at terbaru selalu berada di paling atas
  merged.sort((a, b) => getNewsTimestamp(b) - getNewsTimestamp(a));

  return deduplicateNewsList(merged);
}
window.mergeNewsWithDefaults = mergeNewsWithDefaults;

// Universal Helper Merge Data Banner Hero Carousel
function mergeBannersWithDefaults(incomingList) {
  let deletedIds = [];
  try {
    const rawDeleted = localStorage.getItem('disperindag_deleted_banner_ids');
    if (rawDeleted) deletedIds = JSON.parse(rawDeleted);
  } catch (e) {}
  const deletedSet = new Set(Array.isArray(deletedIds) ? deletedIds : []);

  const baseList = JSON.parse(JSON.stringify(typeof DEFAULT_BANNERS !== 'undefined' ? DEFAULT_BANNERS : []))
    .filter(banner => banner && !deletedSet.has(banner.id));
  if (!Array.isArray(incomingList) || incomingList.length === 0) return baseList;

  const map = new Map();
  baseList.forEach(b => map.set(b.id, b));
  
  const customBanners = [];
  incomingList.forEach(inc => {
    if (inc && inc.id && !deletedSet.has(inc.id)) {
      if (map.has(inc.id)) {
        map.set(inc.id, { ...map.get(inc.id), ...inc });
      } else {
        customBanners.push(inc);
      }
    }
  });

  return [...customBanners, ...Array.from(map.values())];
}
window.mergeBannersWithDefaults = mergeBannersWithDefaults;

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
    photo_url: "assets/officials/kadis_muhammad_yusuf_nur_2026.jpg",
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
      { title: "Rencana Kerja Tahunan (Renja) Disperindag ESDM Pinrang 2026", link: "ppid.html?id=doc_03#dokumen-regulasi" },
      { title: "Laporan Kinerja Instansi Pemerintah (LKjIP) Tahun 2025", link: "ppid.html?id=doc_04#dokumen-regulasi" },
      { title: "Laporan Realisasi Anggaran Keuangan Dinas Semester I Tahun 2026", link: "ppid.html#dokumen-regulasi" },
      { title: "Daftar Rekapitulasi Harga Bahan Pokok Harian Kabupaten Pinrang", link: "index.html#sembako" }
    ]
  },
  {
    category: "Informasi Setiap Saat",
    desc: "Informasi publik yang wajib disediakan dan dapat diakses pemohon sewaktu-waktu.",
    items: [
      { title: "Profil Lengkap, Visi Misi, dan Struktur Organisasi Kedinasan", link: "profil.html" },
      { title: "Perbup No. 42 Tahun 2023 tentang Kedudukan & Tupoksi Dinas", link: "ppid.html?id=doc_01#dokumen-regulasi" },
      { title: "Standar Operasional Prosedur (SOP) 6 Layanan Publik Resmi", link: "layanan.html" },
      { title: "Daftar Inventaris Sarana dan Prasarana Pasar Sentral Pinrang", link: "layanan.html" }
    ]
  },
  {
    category: "Informasi Serta Merta",
    desc: "Informasi yang dapat mengancam hajat hidup orang banyak dan ketertiban umum.",
    items: [
      { title: "Pemberitahuan Penyesuaian HET LPG 3 Kg & Call Center Pengaduan", link: "ppid.html?id=doc_05#dokumen-regulasi" },
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
    slug: "tindak-lanjuti-aduan-warga-pangkalan-lpg-3-kg-nakal-di-duampanua-dijatuhi-sanksi-tegas-phu",
    title: "Tindak Lanjuti Aduan Warga, Pangkalan LPG 3 Kg Nakal di Duampanua Dijatuhi Sanksi Tegas PHU",
    category: "Perindustrian, Energi & SDM",
    topic_tag: "LPG 3 Kg",
    content_origin: "internal_release",
    date: "21 Agustus 2026",
    author: "Bidang Perindustrian & ESDM",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/news/sidak_lpg3kg_pinrang_hd.jpg",
    image_caption: "Sidak pengawasan distribusi gas elpiji 3 kg bersubsidi oleh Disperindag ESDM Pinrang bersama Pertamina.",
    excerpt: "Disperindag ESDM Pinrang bersama agen penyalur Pertamina menjatuhkan sanksi Pemutusan Hubungan Usaha (PHU) kepada pangkalan nakal di Desa Bungi, Kec. Duampanua yang terbukti menjual gas melon di atas HET resmi.",
    content: `PINRANG — Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral (Disperindag ESDM) Kabupaten Pinrang bergerak cepat menindaklanjuti aduan masyarakat terkait pangkalan gas elpiji 3 kg bersubsidi di Desa Bungi, Kecamatan Duampanua yang menolak melayani warga sekitar dan menjual di atas Harga Eceran Tertinggi (HET).

Kepala Dinas Perindag ESDM Kabupaten Pinrang, Muhammad Yusuf Nur, S.STP., M.Si., menegaskan bahwa pemerintah daerah bersama agen resmi Pertamina tidak mentolerir segala bentuk penyelewengan distribusi energi bersubsidi yang menjadi hak masyarakat prasejahtera dan pelaku usaha mikro.

"Setelah menerima informasi dan aduan dari masyarakat, tim pengawas ESDM kami langsung turun ke lapangan bersama pihak agen penyalur resmi. Berdasarkan hasil pemeriksaan, pangkalan tersebut terbukti melanggar nota kesepakatan (MoU) dan menjual gas melon seharga Rp 25.000 per tabung, jauh di atas HET pangkalan resmi Pergub Sulsel sebesar Rp 18.500. Sanksi tegas berupa Pemutusan Hubungan Usaha (PHU/PHK) langsung dijatuhkan oleh agen penyalur," tegas Kepala Dinas Perindag ESDM Pinrang.

Dinas mengimbau kepada seluruh masyarakat Kabupaten Pinrang untuk tidak ragu melaporkan pangkalan yang menjual di atas HET resmi Rp 18.500 atau menolak melayani warga setempat melalui kanal pengaduan resmi WhatsApp di nomor 0823 1600 2226 atau portal SP4N-LAPOR!.`
  },
  {
    id: "news_02",
    slug: "kawal-kepatuhan-het-disperindag-esdm-pinrang-gelar-rakor-bersama-agen-lpg-dan-usulkan-kuota-khusus-petani",
    title: "Kawal Kepatuhan HET, Disperindag ESDM Pinrang Gelar Rakor Bersama Agen LPG dan Usulkan Kuota Khusus Petani",
    category: "Perindustrian, Energi & SDM",
    topic_tag: "LPG 3 Kg",
    content_origin: "internal_release",
    date: "24 Agustus 2026",
    author: "Bidang Perindustrian & ESDM",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/news/forum_konsultasi_publik_pelayanan_pinrang.jpg",
    image_caption: "Rapat koordinasi teknis pengawasan kuota dan distribusi elpiji 3 kg bersubsidi di Aula Disperindag ESDM Pinrang.",
    excerpt: "Guna mencegah kelangkaan di musim tanam, Disperindag ESDM mengumpulkan seluruh agen penyalur LPG 3 kg se-Kabupaten Pinrang dalam rapat koordinasi teknis evaluasi distribusi kuota.",
    content: `PINRANG — Bertempat di Aula Kantor Disperindag ESDM Kabupaten Pinrang, jajaran pimpinan dinas menggelar Rapat Koordinasi Teknis Pengawasan Pendistribusian Liquefied Petroleum Gas (LPG) Tabung 3 Kg bersama pimpinan 9 agen resmi yang beroperasi di wilayah Kabupaten Pinrang.

Rapat koordinasi ini dipimpin langsung oleh Kepala Dinas Perindag ESDM Pinrang, didampingi Kepala Bidang Perindustrian dan ESDM, serta dihadiri oleh seluruh perwakilan agen penyalur.

Fokus utama rakor ini adalah penegakan sistem pencatatan digital Merchant Apps Pertamina (MAP), ketertiban logbook pangkalan, serta pengawasan berkala agar kuota elpiji 3 kg bersubsidi benar-benar terserap oleh rumah tangga prasejahtera, usaha mikro, nelayan sasaran, dan petani pemakai pompa air sawah.

"Dalam rakor ini, kami juga merumuskan usulan pemisahan alokasi kuota khusus sektor pertanian ke Pertamina dan kementerian teknis, mengingat kebutuhan petani di Pinrang saat masa tanam dan pengairan sawah sangat tinggi, sehingga tidak mengganggu jatah konsumsi rumah tangga," jelas Kadis Perindag ESDM.`
  },
  {
    id: "news_03",
    slug: "revitalisasi-786-lapak-pasar-sentral-pinrang-rampung-dorong-tata-kelola-pedagang-higienis",
    title: "Revitalisasi 786 Lapak Pasar Sentral Pinrang Rampung, Dorong Tata Kelola Pedagang Higienis",
    category: "Sarana & Pelaku Distribusi",
    topic_tag: "Pasar",
    content_origin: "internal_release",
    date: "12 Agustus 2026",
    author: "Bidang Sarana & Pelaku Distribusi",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/banner/pasar_sentral_pinrang_clean_hd.jpg",
    image_caption: "Suasana penataan zonasi lapak higienis semi-modern di Pasar Sentral Pinrang.",
    excerpt: "Disperindag ESDM Pinrang merampungkan penataan zonasi 786 kios pedagang basah dan kering di Pasar Sentral Watang Sawitto untuk kenyamanan transaksi warga.",
    content: `PINRANG — Penataan dan peremajaan infrastruktur lapak pedagang di Pasar Sentral Pinrang, Kecamatan Watang Sawitto, resmi dirampungkan oleh Bidang Sarana dan Pelaku Distribusi Disperindag ESDM Kabupaten Pinrang.

Program revitalisasi ini mencakup zonasi pemisahan komoditas basah (ikan, daging, sayur) dengan komoditas kering (tekstil, bumbu, kelontong), perbaikan drainase anti-genangan, serta instalasi penerangan hemat energi.

"Dengan selesainya revitalisasi 786 kios dan lapak ini, suasana transaksi jual beli menjadi jauh lebih bersih, tertib, dan higienis. Kami ingin masyarakat merasa nyaman berbelanja di pasar rakyat kebanggaan Kabupaten Pinrang," ujar Kepala Bidang Sarana dan Pelaku Distribusi.`
  },
  {
    id: "news_04",
    slug: "jamin-transaksi-adil-perlindungan-konsumen-bidang-kemetrologian-gelar-sidang-tera-ulang-timbangan-pasar-dan-spbu",
    title: "Jamin Transaksi Adil & Perlindungan Konsumen, Bidang Kemetrologian Gelar Sidang Tera Ulang Timbangan Pasar dan SPBU",
    category: "Kemetrologian",
    topic_tag: "Tera",
    content_origin: "internal_release",
    date: "15 Agustus 2026",
    author: "Bidang Kemetrologian",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/news/tera_uttp_spbu_hd.jpg",
    image_caption: "Petugas Penera Ahli menguji akurasi dispenser nozel BBM SPBU menggunakan bejana ukur standar 20 liter.",
    excerpt: "Memastikan takaran BBM presisi dan timbangan pedagang pasar akurat, Petugas Penera Ahli Disperindag Pinrang menggelar sidang tera ulang UTTP di Pasar Sentral dan SPBU jalur poros.",
    content: `PINRANG — Dalam rangka mewujudkan Kabupaten Pinrang sebagai Daerah Tertib Ukur serta menjamin kepastian takaran bagi masyarakat konsumen, Bidang Kemetrologian Disperindag ESDM Pinrang menggelar rangkaian Sidang Tera dan Tera Ulang Alat Ukur, Takar, Timbang, dan Perlengkapannya (UTTP).

Kegiatan tera menyasar timbangan meja, timbangan elektronik, dan timbangan gantung milik pedagang di Pasar Sentral Pinrang dan Pasar Pekkabata, serta pengujian nozel dispenser BBM di seluruh SPBU sepanjang jalur poros trans Sulawesi.

Petugas Penera Ahli melakukan pengujian teknis menggunakan bejana ukur standar 20 liter dan anak timbang standar berkalibrasi nasional. Setiap alat UTTP yang memenuhi Batas Kesalahan yang Diizinkan (BKD) dibubuhi Cap Tanda Tera Sah Tahun 2026, sedangkan alat yang mengalami pergeseran akurasi langsung dilakukan justir dan perbaikan di lokasi.

"Pelayanan tera ini merupakan bentuk kehadiran pemerintah daerah dalam melindungi hak konsumen dan memberikan kepastian hukum bagi para pelaku usaha," ungkap Kepala Bidang Kemetrologian.`
  },
  {
    id: "news_05",
    slug: "kendalikan-inflasi-pangan-pemkab-pinrang-dan-disperindag-esdm-gelar-operasi-pasar-beras-sphp-di-pasar-sentral",
    title: "Kendalikan Inflasi Pangan, Pemkab Pinrang dan Disperindag ESDM Gelar Operasi Pasar Beras SPHP di Pasar Sentral",
    category: "Pengembangan Perdagangan",
    topic_tag: "Pasar Murah",
    content_origin: "internal_release",
    date: "10 Agustus 2026",
    author: "Bidang Pengembangan Perdagangan",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/news/pasar_sentral_pinrang_clean_hd.jpg",
    image_caption: "Pelaksanaan Gerakan Pangan Murah dan Operasi Pasar Beras SPHP Disperindag ESDM Pinrang.",
    excerpt: "Tim Pengendali Inflasi Daerah (TPID) bersama Disperindag ESDM dan Perum Bulog menyalurkan beras program SPHP seharga Rp 12.500/kg guna menjaga stabilitas harga pangan pokok.",
    content: `PINRANG — Menindaklanjuti arahan Tim Pengendalian Inflasi Daerah (TPID) Kabupaten Pinrang dalam menjaga stabilitas daya beli masyarakat, Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang bekerja sama dengan Perum Bulog Cabang Pinrang menggelar Gerakan Pangan Murah (GPM) dan Operasi Pasar Khusus Beras SPHP di pelataran Pasar Sentral Pinrang.

Dalam operasi pasar ini, sebanyak 10 ton beras Stabilisasi Pasokan dan Harga Pangan (SPHP) kualitas medium kemasan 5 kg disalurkan langsung kepada masyarakat dengan harga sesuai ketetapan pemerintah yakni Rp 12.500 per kilogram atau Rp 62.500 per sak 5 kg.

Kepala Bidang Pengembangan Perdagangan menyampaikan bahwa pemantauan harga bahan pokok dan penting (bapokting) dilakukan setiap pagi oleh enumerator dinas di 12 komoditas pangan utama.

"Melalui intervensi operasi pasar beras SPHP dan pemantauan harian ini, stabilitas harga pangan daerah di Kabupaten Pinrang dapat terus terjaga secara baik," tuturnya.`
  },
  {
    id: "news_06",
    slug: "akselerasi-umkm-naik-kelas-disperindag-pinrang-fasilitasi-sertifikasi-halal-gratis-dan-akun-siinas-bagi-pelaku-ikm",
    title: "Akselerasi UMKM Naik Kelas, Disperindag Pinrang Fasilitasi Sertifikasi Halal Gratis dan Akun SIINas bagi Pelaku IKM",
    category: "Perindustrian, Energi & SDM",
    topic_tag: "IKM",
    content_origin: "internal_release",
    date: "04 Agustus 2026",
    author: "Bidang Perindustrian & ESDM",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/news/sosialisasi_tkdn_ikm_pinrang_hd.jpg",
    image_caption: "Pendampingan teknis penghitungan bobot lokal TKDN-IKM bersama Pusat P3DN Kementerian Perindustrian.",
    excerpt: "Klinik Fasilitasi IKM Disperindag Pinrang mendampingi puluhan pelaku usaha olahan kopi, bandeng, dan kue tradisional mendapatkan sertifikasi Halal dan akun SIINas Kemenperin.",
    content: `PINRANG — Upaya memperkuat legalitas dan daya saing produk Industri Kecil dan Menengah (IKM) terus digencarkan oleh Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang melalui pembukaan Klinik Layanan Fasilitasi IKM.

Melalui program ini, sebanyak 45 pelaku IKM olahan pangan lokal—seperti pengrajin kopi Basseang, abon bandeng Suppa, dan kue karasa—didampingi secara intensif untuk penerbitan Nomor Induk Berusaha (NIB) berbasis risiko, pembuatan akun resmi SIINas di portal Kementerian Perindustrian RI, serta pendaftaran Sertifikasi Halal Gratis (SEHATI) melalui BPJPH Kementerian Agama.

"Dengan kepemilikan sertifikat Halal, izin edar P-IRT, dan sertifikasi Tingkat Komponen Dalam Negeri (TKDN-IKM), produk-produk unggulan Bumi Lasinrang memiliki keunggulan kompetitif untuk masuk ke etalase toko ritel modern serta e-Katalog Pengadaan Barang dan Jasa Pemerintah," jelas Kepala Bidang Perindustrian.`
  },
  {
    id: "news_07",
    slug: "sinergi-dekranasda-dan-disperindag-pinrang-promosikan-tenun-sutra-corak-laburasseng-di-ajang-pameran-nasional",
    title: "Sinergi Dekranasda dan Disperindag Pinrang Promosikan Tenun Sutra Corak Laburasseng di Ajang Pameran Nasional",
    category: "Perindustrian, Energi & SDM",
    topic_tag: "Dekranasda",
    content_origin: "internal_release",
    date: "22 Juli 2026",
    author: "Dekranasda & Humas Disperindag",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/banner/tenun_sutra_pinrang_hd.jpg",
    image_caption: "Kain tenun sutra motif Laburasseng khas Pinrang dipamerkan dalam ajang pameran kriya nasional.",
    excerpt: "Kain tenun sutra tradisional motif corak Laburasseng karya pengrajin Mattiro Sompe binaan Dekranasda dan Disperindag Pinrang tampil memukau pada pameran kerajinan nasional.",
    content: `JAKARTA — Produk kerajinan kain tenun sutra tradisional motif corak Laburasseng khas Kabupaten Pinrang tampil memukau dalam ajang Pameran Kerajinan Nusantara yang diselenggarakan di Jakarta Convention Center.

Keikutsertaan ini merupakan wujud sinergi dan kolaborasi strategis antara Dewan Kerajinan Nasional Daerah (Dekranasda) Kabupaten Pinrang bersama Disperindag ESDM Kabupaten Pinrang dalam melestarikan sekaligus memperluas jangkauan pasar produk kriya dan wastra daerah.

Kain tenun sutra yang dipamerkan merupakan mahakarya para penenun tradisional di Kecamatan Mattiro Sompe dan Suppa yang menggunakan Alat Tenun Bukan Mesin (ATBM) dengan pewarna ramah lingkungan, serta telah resmi mengantongi perlindungan Hak Kekayaan Intelektual (HAKI) dari Kemenkumham RI.

Apresiasi tinggi datang dari para pemerhati wastra nusantara atas kehalusan tenunan, keanggunan motif Laburasseng, dan keaslian benang sutra khas Bumi Lasinrang.`
  },
  {
    id: "news_08",
    slug: "kopi-robusta-pinrang",
    title: "Kopi Robusta Pinrang: Menembus Pasar Ekspor dengan Mutu Petik Merah Dataran Tinggi Basseang",
    category: "Perindustrian & IKM",
    topic_tag: "IKM",
    content_origin: "internal_release",
    date: "25 Agustus 2026",
    author: "Bidang Perindustrian & ESDM",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/news/kopi_robusta_pinrang_murni_hd.jpg",
    image_caption: "Pengembangan komoditas Kopi Robusta pegunungan Basseang dan Benteng Paremba Pinrang.",
    excerpt: "Informasi mengenai potensi dan pengembangan Kopi Robusta pegunungan Basseang dan Benteng Paremba Kabupaten Pinrang menuju pasar nasional dan ekspor.",
    content: `PINRANG — Potensi komoditas kopi robusta yang tumbuh subur di wilayah dataran tinggi pegunungan Basseang dan Benteng Paremba, Kecamatan Lembang, Kabupaten Pinrang kini semakin diminati para penikmat kopi nasional dan pelaku industri ekspor.

Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang secara berkelanjutan memberikan bimbingan teknis pasca-panen berbasis standar petik merah (*red cherries*), pengeringan higienis, serta proses sangrai modern guna menghasilkan cita rasa kopi yang konsisten dan berkarakter kuat.

"Kopi Robusta Pinrang memiliki keunggulan geografis dengan ketinggian di atas 800–1.200 mdpl, menghasilkan profil aroma cokelat gelap, rempah alami, serta tingkat keasaman rendah yang sangat disukai pasar kopi modern," jelas Kepala Dinas Perindag ESDM Pinrang.

Selain pendampingan mutu, dinas juga memfasilitasi legalitas P-IRT, Sertifikasi Halal BPJPH, pendaftaran akun SIINas, hingga desain kemasan berstandar ekspor agar produk kopi petani Pinrang memiliki nilai tambah yang optimal.`
  },
  {
    id: "news_09",
    slug: "pasar-murah-pinrang",
    title: "Gerakan Pangan Murah (GPM) Tanggap Inflasi Digelar Serentak di 12 Kecamatan Pinrang",
    category: "Pengembangan Perdagangan",
    topic_tag: "Pasar Murah",
    content_origin: "internal_release",
    date: "23 Agustus 2026",
    author: "Bidang Pengembangan Perdagangan",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/banner/pameran_gelar_dagang_pinrang_hd.jpg",
    image_caption: "Penyaluran beras SPHP dan minyak goreng bersubsidi dalam Gerakan Pangan Murah (GPM) Pinrang.",
    excerpt: "Pemerintah Kabupaten Pinrang melalui Disperindag ESDM menggelar operasi pasar murah beras SPHP, minyakita, gula pasir dan telur guna menjaga stabilitas harga pangan.",
    content: `PINRANG — Menjawab kebutuhan masyarakat akan pasokan bahan pokok dengan harga terjangkau, Pemerintah Kabupaten Pinrang melalui Disperindag ESDM berkolaborasi dengan Perum Bulog dan distributor resmi menggelar Gerakan Pangan Murah (GPM) serentak di 12 kecamatan se-Kabupaten Pinrang.

Berbagai komoditas kebutuhan pokok dijual langsung di bawah harga pasar harian, antara lain Beras SPHP Rp 12.500/kg, Minyakita Rp 15.700/liter, Gula Pasir Kristal Rp 17.500/kg, dan Telur Ayam Ras Rp 50.000/rak.

"Program ini merupakan wujud komitmen nyata Tim Pengendalian Inflasi Daerah (TPID) Kabupaten Pinrang dalam memastikan ketersediaan pasokan, keterjangkauan harga, serta kelancaran distribusi logistik pangan pokok bagi seluruh lapisan masyarakat," tutur Kepala Bidang Pengembangan Perdagangan.`
  },
  {
    id: "news_10",
    slug: "monitoring-harga-pangan",
    title: "Pantauan Harian Bapokting: Pasokan Pangan Melimpah, Deviasi Harga Pasar Sentral Terkendali Stabil",
    category: "Pengembangan Perdagangan",
    topic_tag: "Bapokting",
    content_origin: "internal_release",
    date: "26 Agustus 2026",
    author: "Bidang Pengembangan Perdagangan",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/news/pasar_sentral_pinrang_clean_hd.jpg",
    image_caption: "Survei harian harga 12 komoditas pangan pokok oleh petugas enumerator Disperindag ESDM Pinrang.",
    excerpt: "Hasil survei harian 12 komoditas pangan pokok oleh Tim Pengawas Perdagangan Disperindag ESDM Pinrang di Pasar Sentral menunjukkan tren harga stabil dan terkendali.",
    content: `PINRANG — Tim Enumerator dan Pengawas Perdagangan Disperindag ESDM Kabupaten Pinrang kembali merilis data resmi pemantauan harga harian 12 komoditas bahan pokok dan penting (bapokting) di Pasar Sentral Pinrang, Pasar Pekkabata, dan Pasar Marawi per 26 Agustus 2026.

Berdasarkan hasil survei lapangan, indeks stabilitas harga komoditas pangan pokok berada pada tingkat sangat terkendali dengan deviasi inflasi bulanan sebesar 2.1%. Pasokan beras premium lokal tercatat mengalami penurunan harga sebesar Rp 500/kg menjadi Rp 14.500/kg seiring bergulirnya masa panen raya di Kecamatan Patampanua dan Duampanua.

Masyarakat dan pelaku usaha dapat memantau perkembangan harga harian terverifikasi secara langsung dan transparan melalui portal resmi website Disperindag ESDM Pinrang dan TV Wallboard Command Center yang diperbarui setiap pukul 09.00 WITA.`
  },
  {
    id: "news_11",
    slug: "harga-eceran-tembus-rp-45-ribu-disperindagem-pinrang-ambil-tindakan-tegas-terhadap-pangkalan-nakal",
    title: "Harga Eceran Tembus Rp 45 Ribu, Disperindagem Pinrang Ambil Tindakan Tegas Terhadap Pangkalan Nakal",
    category: "Pelayanan Publik",
    topic_tag: "LPG 3 Kg",
    content_origin: "internal_release",
    date: "29 Agustus 2026",
    author: "Humas Disperindag ESDM Pinrang",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/news/sidak_lpg3kg_pinrang_hd.jpg",
    image_caption: "Tim Pengawas Disperindag ESDM Pinrang melakukan sidak pangkalan dan menjatuhkan sanksi tegas penertiban HET.",
    excerpt: "PINRANG — Keresahan dan keluhan warga masyarakat terkait lonjakan harga LPG 3 Kg bersubsidi hingga Rp 45.000 langsung direspon tegas oleh Disperindag ESDM bersama Pertamina melalui sanksi PHU bagi pangkalan nakal.",
    content: `PINRANG — Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang merespons cepat keluhan masyarakat terkait lonjakan harga gas elpiji 3 kg bersubsidi yang sempat mencapai Rp 45.000 di tingkat pengecer tidak resmi.

Kepala Dinas Perindag ESDM Pinrang bersama jajaran Forkopimda dan agen resmi Pertamina langsung menggelar operasi penertiban pangkalan di sejumlah titik strategis. Dari hasil pengawasan, dinas menjatuhkan sanksi administratif dan penghentian alokasi kepada pangkalan yang terbukti menjual di atas HET resmi atau menyalurkan kepada pihak pengecer borongan.

Masyarakat diimbau untuk selalu membeli tabung gas 3 kg langsung di pangkalan resmi berplang dengan harga sesuai HET resmi pemerintah sebesar Rp 20.000 per tabung.`
  },
  {
    id: "news_12",
    slug: "atasi-buying-panic-disperindagem-pinrang-gandeng-pertamina-dan-aph-siapkan-inovasi-digitalisasi-serta-sanksi-phk-pangkalan-nakal",
    title: "Atasi Buying Panic, Disperindagem Pinrang Gandeng Pertamina dan APH Siapkan Inovasi Digitalisasi Serta Sanksi PHK Pangkalan Nakal",
    category: "Pelayanan Publik",
    topic_tag: "LPG 3 Kg",
    content_origin: "internal_release",
    date: "29 Agustus 2026",
    author: "Humas Disperindag ESDM Pinrang",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/news/sidak_lpg3kg_pinrang_hd.jpg",
    image_caption: "Rapat koordinasi bersama Pertamina dan Aparat Penegak Hukum (APH) dalam pengamanan rantai pasok energi bersubsidi.",
    excerpt: "Menjawab fenomena panic buying warga, Disperindag ESDM Pinrang bersama Pertamina dan APH memperkuat sistem digitalisasi pangkalan terpadu dan penegakan hukum bagi oknum penimbun.",
    content: `PINRANG — Mengantisipasi fenomena panic buying serta spekulasi harga gas elpiji 3 kg bersubsidi, Disperindag ESDM Pinrang menggandeng PT Pertamina Patra Niaga dan Aparat Penegak Hukum (APH) guna memperketat tata kelola distribusi berbasis digital.

Langkah preventif ini melibatkan integrasi logbook digital pangkalan dan verifikasi NIK KTP konsumen agar subsidi tepat sasaran bagi rumah tangga prasejahtera dan usaha mikro.

Pemerintah Kabupaten Pinrang menegaskan tidak akan ragu membawa ke jalur hukum pihak-pihak yang sengaja menimbun atau mempermainkan pasokan energi bersubsidi masyarakat.`
  },
  {
    id: "news_13",
    slug: "kadis-perindag-esdm-hadiri-mediasi-permasalahan-di-pasar-rakyat-pekkabata",
    title: "Kadis Perindag ESDM Hadiri Mediasi Permasalahan di Pasar Rakyat Pekkabata",
    category: "Pengembangan Perdagangan",
    topic_tag: "Pasar",
    content_origin: "internal_release",
    date: "29 Agustus 2026",
    author: "Humas Disperindag ESDM Pinrang",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/news/pasar_sentral_pinrang_clean_hd.jpg",
    image_caption: "Pertemuan mediasi dan dialog kekeluargaan bersama perwakilan pedagang Pasar Rakyat Pekkabata.",
    excerpt: "UPTD Pasar Wilayah I Disperindag ESDM Pinrang memfasilitasi mediasi kekeluargaan terkait penataan zonasi lapak pedagang Pasar Pekkabata demi kenyamanan bersama.",
    content: `PINRANG — Kepala Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang memimpin langsung agenda mediasi dan dialog terbuka bersama para pedagang di Pasar Rakyat Pekkabata.

Pertemuan yang berlangsung hangat dan penuh musyawarah ini membahas penataan ulang zonasi pedagang basah dan kering, ketertiban area parkir, serta pemeliharaan kebersihan lingkungan pasar.

Hasil kesepakatan bersama menegaskan komitmen seluruh pedagang untuk mematuhi regulasi ketertiban pasar demi kelancaran aktivitas jual beli masyarakat.`
  },
  {
    id: "news_14",
    slug: "disperindag-esdm-pinrang-gelar-operasi-pasar-pangan-murah-di-12-kecamatan",
    title: "Disperindag ESDM Pinrang Gelar Operasi Pasar Pangan Murah di 12 Kecamatan",
    category: "Perindustrian, Energi & SDM",
    topic_tag: "Pasar Murah",
    content_origin: "internal_release",
    date: "29 Agustus 2026",
    author: "Humas Disperindag ESDM Pinrang",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/news/operasi_pasar_murah_sembako_pinrang.jpg",
    image_caption: "Pelaksanaan Gerakan Pangan Murah dan Operasi Pasar Beras SPHP Disperindag ESDM Pinrang.",
    excerpt: "Menjaga stabilitas harga sembako dan daya beli masyarakat, Disperindag ESDM Pinrang menyalurkan beras SPHP dan minyak goreng bersubsidi di 12 kecamatan.",
    content: `PINRANG — Tim Pengendali Inflasi Daerah (TPID) bersama Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang menggelar rangkaian Operasi Pasar Pangan Murah secara bergilir di 12 wilayah kecamatan se-Kabupaten Pinrang.

Komoditas utama yang disalurkan meliputi beras SPHP kemasan 5 kg seharga Rp 12.500/kg, minyak goreng premium, gula pasir, dan tepung terigu dengan harga di bawah harga pasar umum.

Langkah strategis ini terbukti efektif menekan laju inflasi daerah dan meringankan beban pengeluaran kebutuhan pokok masyarakat.`
  },
  {
    id: "news_15",
    slug: "stabilkan-pasokan-dan-harga-disperindag-esdm-pinrang-gelar-rapat-koordinasi-bersama-agen-lpg-se-kabupaten",
    title: "Stabilkan Pasokan dan Harga, Disperindag ESDM Pinrang Gelar Rapat Koordinasi Bersama Agen LPG se-Kabupaten",
    category: "Pelayanan Publik",
    topic_tag: "LPG 3 Kg",
    content_origin: "internal_release",
    date: "27 Agustus 2026",
    author: "Humas Disperindag ESDM Pinrang",
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: "assets/news/forum_konsultasi_publik_pelayanan_pinrang.jpg",
    image_caption: "Rapat koordinasi teknis pengawasan kuota dan distribusi elpiji 3 kg bersubsidi bersama agen LPG se-Kabupaten Pinrang.",
    excerpt: "Disperindag ESDM Pinrang menggelar rapat koordinasi bersama agen LPG se-Kabupaten Pinrang untuk menjaga kelancaran distribusi, kestabilan stok, dan harga LPG 3 kg bersubsidi.",
    content: `PINRANG — Disperindag ESDM Kabupaten Pinrang menggelar rapat koordinasi bersama para agen LPG se-Kabupaten Pinrang untuk menjaga kelancaran distribusi, kestabilan stok, dan harga LPG, khususnya LPG 3 kg bersubsidi.

Dalam pertemuan tersebut, agen diminta memperketat pengawasan distribusi hingga ke tingkat pangkalan resmi agar harga tetap sesuai HET yang ditetapkan.

Kadis Perindag ESDM Pinrang menegaskan sanksi tegas akan dijatuhkan bagi pihak pangkalan maupun agen yang menyalahi prosedur distribusi.`
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
  inflation_rate: null,
  inflation_status: null,
  pasar_sentral_stalls: null,
  pasar_sentral_status: null,
  uttp_verified: null,
  uttp_verified_count: null,
  uttp_status: null,
  spbu_verified_pct: null,
  het_lpg_price: null,
  het_lpg_regulation: null,
  lpg_distribution_pct: null,
  lpg_distributed_bottles: null,
  lpg_total_quota: null,
  lpg_official_agents: null,
  lpg_official_bases: null,
  total_ikm_trained: null,
  total_ikm_certified: null,
  skm_score: null,
  skm_grade: null,
  skm_period: null,
  ticker_text: null,
  updated_at: null
};

// 14. DATA STATUS PENGAWASAN 12 KECAMATAN SE-KABUPATEN PINRANG
const DEFAULT_DISTRICTS_STATUS = [];

// Dataset Media Intelligence lama dihapus. Sumber tunggal: Firestore mi_public/current.

function initDataStoreMigration() {
  const currentVer = localStorage.getItem('disperindag_data_version');
  const targetVer = "2026_08_29_official_photo_v6";
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
    
    // 1. Auto-Recovery Prices: gabungkan data tersimpan jika ada dengan 12 default prices
    const existingPrices = getStorage('disperindag_prices', null);
    const resolvedPrices = existingPrices ? mergePricesWithDefaults(existingPrices) : DEFAULT_COMMODITY_PRICES;
    localStorage.setItem('disperindag_prices', JSON.stringify(resolvedPrices));
    
    localStorage.setItem('disperindag_regulated_prices', JSON.stringify(DEFAULT_REGULATED_PRICES));
    localStorage.setItem('disperindag_products_ikm', JSON.stringify(DEFAULT_PRODUCTS_IKM));
    
    // 2. Auto-Recovery & Deduplikasi Berita: Bersihkan tumpukan duplikat
    const existingNews = getStorage('disperindag_news', null);
    const resolvedNews = existingNews ? mergeNewsWithDefaults(existingNews) : deduplicateNewsList(DEFAULT_NEWS);
    localStorage.setItem('disperindag_news', JSON.stringify(resolvedNews));
    
    // 3. Auto-Recovery Banners
    const existingBanners = getStorage('disperindag_banners', null);
    const resolvedBanners = existingBanners ? mergeBannersWithDefaults(existingBanners) : DEFAULT_BANNERS;
    localStorage.setItem('disperindag_banners', JSON.stringify(resolvedBanners));
    
    // Aduan bersifat operasional dan privat: hapus salinan lokal legacy.
    localStorage.removeItem('disperindag_reports');
    
    localStorage.setItem('disperindag_command_center', JSON.stringify(DEFAULT_COMMAND_CENTER_CONFIG));
    localStorage.setItem('disperindag_districts', JSON.stringify(DEFAULT_DISTRICTS_STATUS));
    // Hapus cache legacy agar tidak pernah dipakai kembali sebagai sumber intelijen.
    localStorage.removeItem('disperindag_media_intelligence');
    localStorage.setItem('disperindag_complaint_recap_2025', JSON.stringify(DEFAULT_COMPLAINT_RECAP_2025));
    localStorage.setItem('disperindag_data_version', targetVer);
  } else {
    // Validasi liveness data harga pada runtime
    const storedPrices = getStorage('disperindag_prices', []);
    if (!Array.isArray(storedPrices) || storedPrices.length < (DEFAULT_COMMODITY_PRICES || []).length) {
      const recovered = mergePricesWithDefaults(storedPrices);
      localStorage.setItem('disperindag_prices', JSON.stringify(recovered));
    }
    // Validasi & Auto-Deduplikasi Berita pada runtime
    const storedNews = getStorage('disperindag_news', []);
    if (Array.isArray(storedNews) && storedNews.length > 0) {
      const clean = deduplicateNewsList(storedNews);
      if (clean.length !== storedNews.length) {
        localStorage.setItem('disperindag_news', JSON.stringify(clean));
      }
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
window.DEFAULT_COMPLAINT_RECAP_2025 = DEFAULT_COMPLAINT_RECAP_2025;

// ------------------------------------------------------------------------------
// INISIALISASI AUTO-MIGRASI DATA STORE (LOCALSTORAGE HYBRID)
// ------------------------------------------------------------------------------
initDataStoreMigration();
