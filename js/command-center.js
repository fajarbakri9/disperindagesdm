(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const state = {
    active: "overview",
    map: null,
    mapLayers: {},
    markets: [],
    lpg: [],
    agents: [],
    fuel: [],
    prices: [],
    reports: [],
    stats: {},
    metrics: {},
    lpgSummary: {},
    lpgDistribution: null,
    districts: [],
    mi: {},
    ekraf: {},
    paused: false,
    rotationTimer: null,
    unsubs: [],
    primaryDb: null,
    dataState: {},
  };
  const COLORS = {
    green: "#18a86b",
    blue: "#2c70e8",
    purple: "#8652f3",
    amber: "#e69a00",
    red: "#e44757",
    navy: "#12365f",
  };
  const icons = {
    overview: "layout-grid",
    market: "store",
    metrology: "scale",
    esdm: "zap",
    industry: "factory",
    fuel: "fuel",
    gis: "map",
  };
  const modules = {
    overview: {
      title: "Situasi Perdagangan, Industri dan Energi",
      sub: "Ikhtisar eksekutif Kabupaten Pinrang · fokus pada indikator yang membutuhkan keputusan",
      source: "DATA TERBARU",
      sourceValue: "SINKRONISASI SISTEM",
      tone: COLORS.green,
      kpis: [
        [
          "Pasar Aktif",
          "16 / 17",
          "pasar rakyat terdata",
          "94%",
          "store",
          COLORS.green,
        ],
        [
          "Penyalur BBM",
          "27",
          "titik penyalur resmi",
          "100%",
          "fuel",
          COLORS.blue,
        ],
        [
          "Pangkalan LPG",
          "681",
          "pangkalan terdaftar",
          "12 kecamatan",
          "battery",
          COLORS.purple,
        ],
        [
          "HET LPG 3 KG",
          "Rp 18.000",
          "harga resmi pangkalan",
          "sesuai regulasi",
          "cylinder",
          COLORS.amber,
        ],
      ],
      chart: "Pergerakan Harga Bapokting",
      chartSub: "Tren tiga komoditas utama · SP2KP Kabupaten Pinrang",
      bars: [
        ["Cabai Rawit", 96],
        ["Bawang Merah", 77],
        ["Beras Medium", 62],
        ["Gula Pasir", 49],
        ["Minyak Goreng", 38],
        ["Telur Ayam", 31],
      ],
      statusTitle: "STATUS UTAMA",
      statuses: [
        [
          "Pasar Rakyat",
          "16 dari 17 pasar aktif",
          "Normal",
          "store",
          COLORS.green,
        ],
        [
          "LPG 3 Kg",
          "Distribusi dan stok terpantau",
          "Normal",
          "battery",
          COLORS.green,
        ],
        ["BBM", "27 titik penyalur aktif", "Normal", "fuel", COLORS.green],
        [
          "Metrologi & Tera",
          "Agenda tera berjalan",
          "Update",
          "scale",
          COLORS.blue,
        ],
        [
          "Industri & Pengaduan",
          "3 aduan aktif dalam proses",
          "Perhatian",
          "factory",
          COLORS.amber,
        ],
      ],
      attentionTitle: "PERLU PERHATIAN",
      attention: [
        [
          "Harga Cabai Rawit naik 11,4%",
          "Perubahan signifikan dalam 7 hari terakhir",
          COLORS.red,
        ],
        [
          "3 Pangkalan LPG menunggu verifikasi",
          "Prioritaskan verifikasi lapangan",
          COLORS.amber,
        ],
      ],
      summaryTitle: "RINGKASAN OPERASIONAL",
      summary: [
        ["16", "Pasar aktif", "store", COLORS.green],
        ["27", "Penyalur BBM", "fuel", COLORS.blue],
        ["681", "Pangkalan LPG", "battery", COLORS.purple],
        ["1.245", "IKM terdata", "factory", COLORS.red],
      ],
      extraTitle: "MEDIA INTELLIGENCE",
      extra: "metrics",
    },
    market: {
      title: "Pasar Rakyat & e-SKPT",
      sub: "Data pasar, pedagang, ruang usaha dan status administrasi e-SKPT dalam satu tampilan",
      source: "INTEGRASI",
      sourceValue: "PASAR + e-SKPT",
      tone: COLORS.green,
      kpis: [
        [
          "Pasar Terdata",
          "17",
          "pasar rakyat Kabupaten Pinrang",
          "16 aktif",
          "store",
          COLORS.green,
        ],
        ["Pasar Aktif", "16", "1 pasar nonaktif", "94%", "store", COLORS.blue],
        [
          "e-SKPT",
          "TERHUBUNG",
          "sinkronisasi administrasi pedagang",
          "realtime",
          "qr-code",
          COLORS.purple,
        ],
        [
          "Verifikasi Data",
          "96%",
          "identitas & ruang usaha terverifikasi",
          "+2%",
          "chart-no-axes-column-increasing",
          COLORS.amber,
        ],
      ],
      chart: "SEBARAN PEDAGANG PER PASAR",
      chartSub: "Data operasional e-SKPT",
      bars: [
        ["Pasar Sentral", 100],
        ["Pekkabata", 44],
        ["Teppo", 28],
        ["Langnga", 25],
        ["Suppa", 22],
        ["Bungi", 18],
        ["Tuppu", 16],
        ["Labolong", 15],
      ],
      statusTitle: "STATUS PASAR",
      statuses: [
        [
          "Pasar Sentral Pinrang",
          "Data pedagang & ruang usaha tersinkron",
          "Aktif",
          "store",
          COLORS.green,
        ],
        [
          "Pasar Pekkabata",
          "Verifikasi rutin berjalan",
          "Aktif",
          "store",
          COLORS.green,
        ],
        [
          "Pasar Paleteang",
          "Tidak beroperasi sesuai data master",
          "Nonaktif",
          "store",
          COLORS.red,
        ],
        [
          "e-SKPT",
          "Dokumen digital & QR terhubung",
          "Sinkron",
          "qr-code",
          COLORS.blue,
        ],
      ],
      attentionTitle: "AKSI PRIORITAS",
      attention: [
        [
          "Verifikasi klaim kios/los/lapak",
          "Tinjau klaim yang belum lengkap",
          COLORS.amber,
        ],
        [
          "Pasar Paleteang nonaktif",
          "Pertahankan status master agar tidak tampil aktif",
          COLORS.red,
        ],
      ],
      summaryTitle: "e-SKPT & PEDAGANG",
      summary: [
        ["17", "Pasar terdata", "store", COLORS.green],
        ["4", "Jenis ruang usaha", "qr-code", COLORS.blue],
        ["96%", "Data terverifikasi", "badge-check", COLORS.purple],
        ["LIVE", "Sinkron e-SKPT", "clock", COLORS.amber],
      ],
      extraTitle: "AKTIVITAS TERBARU",
      extra: "activity",
    },
    metrology: {
      title: "Kemetrologian & Tera",
      sub: "Kepatuhan UTTP, tera/tera ulang, jadwal layanan dan tindak lanjut pengawasan",
      source: "DASAR DATA",
      sourceValue: "UNIT METROLOGI LEGAL",
      tone: COLORS.blue,
      kpis: [
        [
          "UTTP Diperiksa",
          "1.284",
          "unit pada periode berjalan",
          "+86",
          "scale",
          COLORS.blue,
        ],
        [
          "UTTP Sah",
          "1.241",
          "memenuhi ketentuan",
          "—",
          "badge-check",
          COLORS.green,
        ],
        [
          "Tindak Lanjut",
          "43",
          "perlu penyesuaian/perbaikan",
          "3,3%",
          "triangle-alert",
          COLORS.navy,
        ],
        [
          "Nozzle SPBU",
          "98,4%",
          "hasil tera terverifikasi",
          "patuh",
          "fuel",
          COLORS.purple,
        ],
      ],
      chart: "REALISASI TERA PER KECAMATAN",
      chartSub: "Jumlah UTTP diperiksa pada periode berjalan",
      bars: [
        ["Watang Sawitto", 100],
        ["Paleteang", 84],
        ["Duampanua", 78],
        ["Suppa", 73],
        ["Mattiro Bulu", 68],
        ["Patampanua", 65],
        ["Tiroang", 61],
        ["Lanrisang", 54],
      ],
      statusTitle: "JADWAL & HASIL",
      statuses: [
        [
          "Pasar Sentral Pinrang",
          "30 Sep · 08.00–15.00 WITA",
          "Terjadwal",
          "scale",
          COLORS.blue,
        ],
        [
          "SPBU Watang Sawitto",
          "Realisasi pemeriksaan selesai",
          "Selesai",
          "scale",
          COLORS.green,
        ],
        [
          "43 UTTP",
          "Membutuhkan tindak lanjut teknis",
          "Perhatian",
          "triangle-alert",
          COLORS.amber,
        ],
        [
          "Dokumen hasil",
          "Rekap digital siap dilaporkan",
          "Siap",
          "badge-check",
          COLORS.green,
        ],
      ],
      attentionTitle: "PERLU TINDAK LANJUT",
      attention: [
        [
          "43 UTTP memerlukan tindak lanjut",
          "Kelompokkan berdasarkan jenis temuan",
          COLORS.amber,
        ],
        [
          "Jadwal Pasar Sentral besok",
          "Pastikan petugas dan perangkat siap",
          COLORS.blue,
        ],
      ],
      summaryTitle: "RINGKASAN METROLOGI",
      summary: [
        ["—", "Tingkat sah", "scale", COLORS.green],
        ["08:00", "Layanan berikutnya", "clock", COLORS.blue],
        ["27", "Penyalur BBM", "fuel", COLORS.purple],
        ["12", "Kecamatan terlayani", "store", COLORS.amber],
      ],
      extraTitle: "STATUS KEPATUHAN",
      extra: "compliance",
    },
    esdm: {
      title: "Energi & Sumber Daya Mineral",
      sub: "Distribusi LPG 3 Kg, agen, HET, kualitas data lokasi dan indikator energi daerah",
      source: "SUMBER",
      sourceValue: "MASTER ESDM + DASHBOARD",
      tone: COLORS.purple,
      kpis: [
        [
          "Pangkalan LPG",
          "681",
          "terdaftar pada master",
          "12 kecamatan",
          "battery",
          COLORS.purple,
        ],
        [
          "Agen Resmi",
          "12",
          "jaringan distribusi aktif",
          "aktif",
          "building-2",
          COLORS.blue,
        ],
        [
          "HET LPG 3 KG",
          "Rp 18.000",
          "harga resmi pangkalan",
          "rujukan",
          "battery",
          COLORS.amber,
        ],
        [
          "Perlu Verifikasi",
          "3",
          "pangkalan menunggu tinjau",
          "prioritas",
          "triangle-alert",
          COLORS.navy,
        ],
      ],
      chart: "SEBARAN PANGKALAN LPG",
      chartSub: "Distribusi pangkalan per kecamatan",
      bars: [
        ["Watang Sawitto", 100],
        ["Duampanua", 84],
        ["Paleteang", 76],
        ["Patampanua", 70],
        ["Tiroang", 63],
        ["Mattiro Bulu", 59],
        ["Suppa", 53],
        ["Lanrisang", 47],
      ],
      statusTitle: "STATUS DISTRIBUSI",
      statuses: [
        [
          "Stok agen",
          "Ketersediaan agregat terakhir",
          "Normal",
          "battery",
          COLORS.green,
        ],
        [
          "12 Kecamatan",
          "Cakupan pangkalan terdistribusi",
          "Terlayani",
          "store",
          COLORS.green,
        ],
        [
          "3 Pangkalan",
          "Menunggu verifikasi lapangan",
          "Perhatian",
          "triangle-alert",
          COLORS.amber,
        ],
        [
          "Kelengkapan koordinat",
          "Mayoritas titik tervalidasi",
          "Baik",
          "map",
          COLORS.blue,
        ],
      ],
      attentionTitle: "PERLU PERHATIAN",
      attention: [
        [
          "3 pangkalan menunggu verifikasi",
          "Tampilkan sebagai tugas prioritas operator",
          COLORS.amber,
        ],
        [
          "Perbarui titik GPS indikatif",
          "Utamakan data lapangan untuk GIS",
          COLORS.blue,
        ],
      ],
      summaryTitle: "RINGKASAN ESDM",
      summary: [
        ["681", "Pangkalan", "battery", COLORS.purple],
        ["12", "Kecamatan", "store", COLORS.green],
        ["94%", "Koordinat tersedia", "map", COLORS.blue],
        ["LIVE", "Pembaruan", "clock", COLORS.amber],
      ],
      extraTitle: "QUALITY CHECK",
      extra: "quality",
    },
    industry: {
      title: "Industri, IKM & Ekonomi Kreatif",
      sub: "Pembinaan pelaku industri, fasilitasi sertifikasi, produk unggulan dan tindak lanjut pengaduan",
      source: "INTEGRASI",
      sourceValue: "SIINAS · IKM · SP4N",
      tone: COLORS.red,
      kpis: [
        [
          "IKM Terbina",
          "1.245",
          "contoh data tampilan",
          "+12",
          "factory",
          COLORS.red,
        ],
        [
          "Sertifikasi",
          "318",
          "halal/TKDN/HAKI difasilitasi",
          "+8",
          "badge-check",
          COLORS.green,
        ],
        [
          "Sentra Industri",
          "12",
          "cakupan sentra daerah",
          "aktif",
          "factory",
          COLORS.blue,
        ],
        [
          "Aduan Aktif",
          "3",
          "sedang dalam proses",
          "perhatian",
          "triangle-alert",
          COLORS.navy,
        ],
      ],
      chart: "SEBARAN IKM PER SUBSEKTOR",
      chartSub: "Agregasi untuk executive dashboard",
      bars: [
        ["Kuliner", 100],
        ["Fesyen/Kriya", 63],
        ["Olahan Pangan", 49],
        ["Tenun/Sutra", 35],
        ["Kopi", 25],
        ["Konveksi", 21],
        ["Kayu & Furnitur", 15],
        ["Lainnya", 12],
      ],
      statusTitle: "STATUS PROGRAM",
      statuses: [
        [
          "Pembinaan IKM",
          "Program berjalan sesuai jadwal",
          "Normal",
          "factory",
          COLORS.green,
        ],
        [
          "Sertifikasi",
          "8 dokumen baru periode ini",
          "Update",
          "badge-check",
          COLORS.blue,
        ],
        [
          "SIINAS",
          "Pendampingan akun pelaku usaha",
          "Aktif",
          "layout-grid",
          COLORS.green,
        ],
        [
          "SP4N-LAPOR!",
          "3 aduan masih berproses",
          "Perhatian",
          "triangle-alert",
          COLORS.amber,
        ],
      ],
      attentionTitle: "PERLU PERHATIAN",
      attention: [
        [
          "3 aduan masih aktif",
          "Pastikan SLA dan PIC tindak lanjut",
          COLORS.amber,
        ],
        [
          "8 fasilitasi sertifikasi baru",
          "Tampilkan progres sampai terbit",
          COLORS.blue,
        ],
      ],
      summaryTitle: "RINGKASAN INDUSTRI",
      summary: [
        ["1.245", "IKM terbina", "factory", COLORS.red],
        ["318", "Sertifikasi", "badge-check", COLORS.green],
        ["12", "Sentra", "factory", COLORS.blue],
        ["3", "Aduan aktif", "triangle-alert", COLORS.navy],
      ],
      extraTitle: "PRODUK UNGGULAN",
      extra: "chips",
    },
    fuel: {
      title: "Penyalur BBM Kabupaten Pinrang",
      sub: "Sebaran SPBU, APMS, SPBUN dan Pertashop serta status operasional penyalur resmi",
      source: "SUMBER",
      sourceValue: "MASTER PENYALUR BBM",
      tone: COLORS.blue,
      kpis: [
        [
          "Total Penyalur",
          "27",
          "titik penyalur resmi",
          "aktif",
          "fuel",
          COLORS.blue,
        ],
        [
          "SPBU & APMS",
          "17",
          "jaringan pelayanan utama",
          "terpantau",
          "fuel",
          COLORS.green,
        ],
        [
          "Pertashop",
          "9",
          "penyalur non-subsidi desa",
          "aktif",
          "store",
          COLORS.purple,
        ],
        [
          "SPBUN Nelayan",
          "1",
          "layanan solar nelayan",
          "aktif",
          "ship",
          COLORS.amber,
        ],
      ],
      chart: "SEBARAN PENYALUR PER KECAMATAN",
      chartSub: "Master titik operasional BBM",
      bars: [
        ["Watang Sawitto", 100],
        ["Duampanua", 72],
        ["Suppa", 62],
        ["Paleteang", 54],
        ["Patampanua", 48],
        ["Mattiro Bulu", 41],
        ["Tiroang", 35],
        ["Lanrisang", 27],
      ],
      statusTitle: "STATUS PENYALUR",
      statuses: [
        [
          "SPBU Reguler",
          "Ketersediaan produk terpantau",
          "Normal",
          "fuel",
          COLORS.green,
        ],
        [
          "APMS / Compact",
          "Wilayah layanan aktif",
          "Normal",
          "fuel",
          COLORS.green,
        ],
        ["Pertashop", "9 titik pelayanan desa", "Aktif", "store", COLORS.blue],
        [
          "Kualitas lokasi",
          "Koordinat dipakai pada GIS",
          "Sinkron",
          "map",
          COLORS.purple,
        ],
      ],
      attentionTitle: "PENGAWASAN",
      attention: [
        [
          "Pantau stok produk subsidi",
          "Prioritaskan wilayah dengan permintaan tinggi",
          COLORS.amber,
        ],
        ["Validasi koordinat penyalur", "Jaga kualitas layer GIS", COLORS.blue],
      ],
      summaryTitle: "RINGKASAN BBM",
      summary: [
        ["27", "Total titik", "fuel", COLORS.blue],
        ["17", "SPBU/APMS", "fuel", COLORS.green],
        ["9", "Pertashop", "store", COLORS.purple],
        ["1", "SPBUN", "ship", COLORS.amber],
      ],
      extraTitle: "PRODUK TERSEDIA",
      extra: "fuelchips",
    },
  };
  const spark =
    '<div class="spark">' +
    [6, 9, 8, 12, 10, 14, 12, 15, 11, 10, 14, 9, 6, 6, 5, 7]
      .map((h) => `<i style="--h:${h}px"></i>`)
      .join("") +
    "</div>";
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>'"]/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[c],
    );
  function icon(name) {
    return `<i data-lucide="${name}"></i>`;
  }
  function heading(m) {
    const s = state.dataState[state.active] || {
      label: "MENUNGGU DATA",
      tone: COLORS.amber,
      time: "—",
    };
    const freshness = s.rawTime
      ? `Diperbarui ${s.time}`
      : "Waktu sumber tidak tersedia";
    return `<header class="page-heading"><div><h1>${m.title}</h1><p>${m.sub}</p></div><div class="page-source"><span class="source-state" style="--tone:${s.tone}">● ${s.label}</span><b>${m.sourceValue}</b><small>${freshness}</small></div></header>`;
  }
  function kpis(m) {
    return `<div class="kpi-grid">${m.kpis.map((k, i) => `<article class="kpi-card" style="--tone:${k[5]}"><span class="kpi-icon">${icon(k[4])}</span><span class="kpi-label">${k[0]}</span><span class="pill">${k[3]}</span><strong class="kpi-value" data-kpi="${state.active}-${i}">${k[1]}</strong><small class="kpi-meta">${k[2]}</small>${spark}</article>`).join("")}</div>`;
  }
  function bars(m) {
    const rows = m.bars || [];
    const max = Math.max(1, ...rows.map((x) => Number(x[1]) || 0));
    const empty = `<div class="data-empty">${icon("database-zap")}<b>Data rinci belum diterbitkan</b><span>Panel tidak menampilkan angka simulasi.</span></div>`;
    let body = "";
    if (!rows.length) body = empty;
    else if (state.active === "overview")
      body = `<div class="price-tiles">${rows
        .slice(0, 6)
        .map(
          (x, i) =>
            `<div><span class="price-rank">0${i + 1}</span><b>${esc(x[0])}</b><strong>${formatMoney(x[1])}</strong><small>${esc(x[2] || "Harga terbaru")}</small></div>`,
        )
        .join("")}</div>`;
    else if (state.active === "market")
      body = `<div class="funnel-chart">${rows
        .slice(0, 6)
        .map(
          (x, i) =>
            `<div style="--w:${Math.max(28, ((Number(x[1]) || 0) / max) * 100)}%;--tone:${m.tone}"><span>${esc(x[0])}</span><b>${formatNumber(x[1])} ${esc(m.barUnit || "pedagang")}</b></div>`,
        )
        .join("")}</div>`;
    else if (state.active === "metrology")
      body = `<div class="compliance-visual"><div class="radial" style="--value:${Number(modules.metrology.kpis[1][3]) || 0};--tone:${m.tone}"><strong>${esc(modules.metrology.kpis[1][3])}</strong><small>UTTP SAH</small></div><div class="bars">${barRows(rows, max, m.tone, " unit")}</div></div>`;
    else if (state.active === "esdm")
      body = `<div class="distribution-flow"><div>${icon("building-2")}<strong>${formatNumber(state.agents.length)}</strong><span>Agen resmi</span></div><i>→</i><div>${icon("battery")}<strong>${formatNumber(state.lpg.length)}</strong><span>Pangkalan</span></div><i>→</i><div>${icon("map-pinned")}<strong>${new Set(state.lpg.map((x) => x.kecamatan).filter(Boolean)).size || "—"}</strong><span>Kecamatan</span></div></div><div class="bars compact-bars">${barRows(rows, max, m.tone, " pangkalan")}</div>`;
    else if (state.active === "industry")
      body = `<div class="treemap">${rows
        .slice(0, 8)
        .map(
          (x, i) =>
            `<div style="--tone:${[COLORS.red, COLORS.amber, COLORS.green, COLORS.blue, COLORS.purple][i % 5]};--size:${Math.max(1, Number(x[1]) || 1)}"><b>${esc(x[0])}</b><strong>${formatNumber(x[1])}</strong></div>`,
        )
        .join("")}</div>`;
    else if (state.active === "fuel") {
      const total = rows.reduce((n, x) => n + (Number(x[1]) || 0), 0);
      body = `<div class="fuel-composition"><div class="donut" style="--a:${((Number(rows[0]?.[1]) || 0) / Math.max(1, total)) * 360}deg;--b:${(((Number(rows[0]?.[1]) || 0) + (Number(rows[1]?.[1]) || 0)) / Math.max(1, total)) * 360}deg"><strong>${total}</strong><small>TITIK</small></div><div class="composition-list">${rows.map((x, i) => `<div style="--tone:${[COLORS.blue, COLORS.green, COLORS.purple, COLORS.amber][i % 4]}"><i></i><span>${esc(x[0])}</span><b>${formatNumber(x[1])}</b></div>`).join("")}</div></div>`;
    } else body = `<div class="bars">${barRows(rows, max, m.tone, "")}</div>`;
    return `<article class="panel visual-panel"><header class="panel-head"><div><h2>${m.chart}</h2><p>${m.chartSub}</p></div><span class="data-basis">${state.dataState[state.active]?.label || "MEMUAT"}</span></header>${body}</article>`;
  }
  function barRows(rows, max, tone, suffix) {
    return rows
      .map(
        (x) =>
          `<div class="bar-row"><span>${esc(x[0])}</span><div class="bar-track"><i style="--w:${Math.max(2, ((Number(x[1]) || 0) / max) * 100)}%;--tone:${tone}"></i></div><strong>${formatNumber(x[1])}${suffix}</strong></div>`,
      )
      .join("");
  }
  function formatNumber(value) {
    return value !== null &&
      value !== undefined &&
      value !== "" &&
      Number.isFinite(Number(value))
      ? Number(value).toLocaleString("id-ID")
      : "—";
  }
  function formatMoney(value) {
    return value !== null &&
      value !== undefined &&
      value !== "" &&
      Number.isFinite(Number(value))
      ? "Rp " + Number(value).toLocaleString("id-ID")
      : "—";
  }
  function statuses(m) {
    return `<article class="panel"><header class="panel-head"><div><h2>${m.statusTitle}</h2><p>Status operasional terkini</p></div><button class="detail-btn">Lihat detail →</button></header><div class="status-list">${m.statuses.map((x) => `<div class="status-row" style="--tone:${x[4]}"><span class="status-icon">${icon(x[3])}</span><span><b>${x[0]}</b><small>${x[1]}</small></span><em class="status-tag">● ${x[2]}</em></div>`).join("")}</div></article>`;
  }
  function attention(m) {
    return `<article class="panel attention"><header class="panel-head"><div><h2>${m.attentionTitle}</h2><p>Prioritas yang perlu ditinjau</p></div><span class="pill" style="--tone:${COLORS.red}">${m.attention.length}</span></header>${m.attention.map((x) => `<div class="attention-row" style="--tone:${x[2]}"><i></i><span><b>${x[0]}</b><small>${x[1]}</small></span><b>›</b></div>`).join("")}</article>`;
  }
  function summary(m) {
    return `<article class="panel"><header class="panel-head"><div><h2>${m.summaryTitle}</h2><p>Ringkas, terbaca dari jarak jauh</p></div></header><div class="summary">${m.summary.map((x) => `<div class="summary-item" style="--tone:${x[3]}"><span>${icon(x[2])}</span><div><strong>${x[0]}</strong><small>${x[1]}</small></div></div>`).join("")}</div></article>`;
  }
  function dataHealth() {
    const sources = [
      [state.markets.length > 0, "e-SKPT"],
      [state.lpg.length > 0, "LPG"],
      [state.fuel.length > 0, "BBM"],
      [Object.keys(state.metrics || {}).length > 0, "Snapshot KPI"],
    ];
    const live = sources.filter((x) => x[0]).length;
    return [
      [
        `${live}/${sources.length}`,
        "Sumber tersedia",
        "database",
        live === sources.length ? COLORS.green : COLORS.amber,
      ],
      [
        formatNumber(
          state.markets.length + state.lpg.length + state.fuel.length,
        ),
        "Record master",
        "layers",
        COLORS.blue,
      ],
      [
        state.dataState.overview?.time || "—",
        "Pembaruan terakhir",
        "clock",
        COLORS.purple,
      ],
    ];
  }
  function extra(m) {
    let body = "";
    if (m.extra === "chips" || m.extra === "fuelchips")
      body = `<div class="chips">${(m.extra === "chips" ? ["Tenun Sutra", "Kopi Robusta", "Olahan Pangan", "Kriya", "Konveksi"] : ["Pertalite", "Biosolar", "Pertamax", "Dexlite"]).map((x) => `<span class="chip">${x}</span>`).join("")}</div>`;
    else if (m.extra === "activity")
      body =
        '<div class="activity"><div style="--tone:#18a86b"><i></i><b>04:12</b><span>Sinkronisasi data pasar selesai</span></div><div style="--tone:#2c70e8"><i></i><b>03:58</b><span>Verifikasi data pedagang diperbarui</span></div><div style="--tone:#e69a00"><i></i><b>03:34</b><span>2 klaim ruang usaha perlu tinjau</span></div></div>';
    else if (m.extra === "quality") {
      const verified = state.lpg.filter((x) => x.gpsVerified === true).length,
        pct = state.lpg.length ? Math.round((verified / state.lpg.length) * 100) : 0;
      body = `<div class="quality">GPS lapangan terverifikasi <b>${formatNumber(verified)} / ${formatNumber(state.lpg.length)}</b><div class="quality-track"><i style="width:${pct}%"></i></div><p>Koordinat dokumen dan titik administratif tidak dihitung sebagai verifikasi lapangan.</p></div>`;
    }
    else if (m.extra === "dataQuality")
      body = `<div class="data-empty">${icon("database-zap")}<b>Menunggu dataset resmi</b><span>Panel terisi otomatis setelah sumber menerbitkan data.</span></div>`;
    else if (m.extra === "compliance") {
      const value = Number(m.complianceValue);
      body = Number.isFinite(value)
        ? `<div class="compliance-card"><strong>${value.toLocaleString("id-ID")}%</strong><div class="radial mini" style="--value:${value};--tone:${COLORS.green}"></div><small>Kepatuhan UTTP pada snapshot resmi</small></div>`
        : `<div class="data-empty">${icon("database-zap")}<b>Indikator belum diterbitkan</b><span>Nilai kepatuhan tidak disimulasikan.</span></div>`;
    } else if (m.extra === "health") {
      body = `<div class="health-grid">${dataHealth()
        .map(
          (x) =>
            `<div style="--tone:${x[3]}"><span>${icon(x[2])}</span><strong>${x[0]}</strong><small>${x[1]}</small></div>`,
        )
        .join("")}</div>`;
    } else
      body =
        '<div class="summary" style="grid-template-columns:repeat(3,1fr);height:60px"><div class="summary-item"><div><strong id="ccMiMentionsVisible">—</strong><small>Mentions</small></div></div><div class="summary-item"><div><strong id="ccMiStoriesVisible">—</strong><small>Berita unik</small></div></div><div class="summary-item"><div><strong id="ccMiIssuesVisible">—</strong><small>Perlu perhatian</small></div></div></div>';
    return `<article class="panel"><header class="panel-head"><div><h2>${m.extraTitle}</h2><p>Informasi pendukung</p></div></header>${body}</article>`;
  }
  function renderStandard(key) {
    const m = modules[key];
    state.active = key;
    $("ccMain").innerHTML =
      `<section class="dashboard-page">${heading(m)}${kpis(m)}<div class="content-grid">${bars(m)}${statuses(m)}</div><div class="bottom-grid">${attention(m)}${summary(m)}${extra(m)}</div></section>`;
    finishRender();
  }
  function renderGis() {
    state.active = "gis";
    const m = {
      title: "Peta GIS Disperindag ESDM",
      sub: "Satu peta untuk pasar e-SKPT, pangkalan LPG, penyalur BBM dan kualitas lokasi lapangan",
      source: "LAYER AKTIF",
      sourceValue: "DATA e-SKPT + ESDM",
    };
    const allPoints = [...state.markets, ...state.lpg, ...state.fuel],
      validPoints = allPoints.filter((x) =>
        getCoords(x).every(Number.isFinite),
      ).length,
      gpsQuality = allPoints.length
        ? Math.round((validPoints / allPoints.length) * 100)
        : 0;
    markData(
      "gis",
      allPoints.length ? "LIVE MULTISUMBER" : "MENUNGGU DATA",
      allPoints.length ? COLORS.green : COLORS.amber,
    );
    const gisKpis = [
      [
        "Pasar e-SKPT",
        formatNumber(state.markets.length),
        "titik master berkoordinat",
        "e-SKPT",
        "store",
        COLORS.green,
      ],
      [
        "Pangkalan LPG",
        formatNumber(state.lpg.length),
        "titik data master",
        `${new Set(state.lpg.map((x) => x.kecamatan).filter(Boolean)).size} kecamatan`,
        "battery",
        COLORS.purple,
      ],
      [
        "Penyalur BBM",
        formatNumber(state.fuel.length),
        "SPBU/APMS/Pertashop",
        "Firestore",
        "fuel",
        COLORS.blue,
      ],
      [
        "Kelengkapan Koordinat",
        allPoints.length ? `${gpsQuality}%` : "—",
        `${formatNumber(validPoints)} dari ${formatNumber(allPoints.length)} titik`,
        "tersedia",
        "map",
        COLORS.amber,
      ],
    ];
    $("ccMain").innerHTML =
      `<section class="dashboard-page gis-page">${heading(m)}<div class="gis-workspace"><aside class="gis-kpi-rail" aria-label="Ringkasan data GIS">${gisKpis.map((k) => `<article class="kpi-card gis-kpi-card" style="--tone:${k[5]}"><span class="kpi-icon">${icon(k[4])}</span><span class="kpi-label">${k[0]}</span><span class="pill">${k[3]}</span><strong class="kpi-value">${k[1]}</strong><small class="kpi-meta">${k[2]}</small>${spark}</article>`).join("")}</aside><article class="panel map-panel"><div class="map-toolbar"><input id="gisSearch" placeholder="Cari semua titik lokasi…"><select id="gisDistrict"><option value="">Semua Kecamatan</option></select></div><div id="ccMap" class="cc-map"></div><span class="map-credit">PETA OPERASIONAL · e-SKPT GIS</span></article><aside class="panel layer-panel"><h2>FILTER & LAYER</h2><p>Kontrol tampilan peta</p><div class="layer-row"><i class="layer-dot" style="--tone:${COLORS.green}"></i><span>Pasar e-SKPT</span><b>${formatNumber(state.markets.length)}</b></div><div class="layer-row"><i class="layer-dot" style="--tone:${COLORS.purple}"></i><span>Pangkalan LPG</span><b>${formatNumber(state.lpg.length)}</b></div><div class="layer-row"><i class="layer-dot" style="--tone:${COLORS.blue}"></i><span>Penyalur BBM</span><b>${formatNumber(state.fuel.length)}</b></div><div class="layer-row"><i class="layer-dot" style="--tone:${COLORS.amber}"></i><span>Batas Kecamatan</span><b>12</b></div><div class="quality">Kualitas GPS <b>${allPoints.length ? gpsQuality + "%" : "—"}</b><div class="quality-track"><i style="width:${gpsQuality}%"></i></div><p>Dihitung dari koordinat valid pada seluruh master aktif. Titik indikatif tetap dibedakan sampai diverifikasi.</p></div></aside></div></section>`;
    const quality = document.querySelector(".layer-panel .quality");
    if (quality)
      quality.innerHTML = `Kelengkapan koordinat <b>${allPoints.length ? gpsQuality + "%" : "—"}</b><div class="quality-track"><i style="width:${gpsQuality}%"></i></div><p>Persentase record yang memiliki koordinat valid; bukan hasil verifikasi lapangan.</p>`;
    finishRender();
    setTimeout(initMap, 20);
  }
  function finishRender() {
    if (window.lucide) lucide.createIcons();
    document
      .querySelectorAll(".cc-tab")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.slide === state.active),
      );
    enableCardDetails();
  }
  function enableCardDetails() {
    document
      .querySelectorAll(
        ".kpi-card,.gis-kpi-card,.bar-row,.status-row,.attention-row,.summary-item,.price-tiles>div,.funnel-chart>div,.treemap>div,.composition-list>div,.layer-row",
      )
      .forEach((card, index) => {
        card.dataset.detail = String(index);
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute(
          "aria-label",
          `Buka detail ${card.querySelector("h2,.kpi-label,b")?.textContent || "indikator"}`,
        );
        card.onclick = (event) => {
          if (event.target.closest("button,input,select,a,label")) return;
          openCardDetail(card);
        };
        card.onkeydown = (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openCardDetail(card);
          }
        };
      });
  }
  function openCardDetail(card) {
    const title =
      card
        .querySelector(
          "h2,.kpi-label,.bar-row>span,.status-row b,.attention-row b,.summary-item small,.price-tiles b,.funnel-chart span,.treemap b,.composition-list span",
        )
        ?.textContent?.trim() || "Detail indikator";
    const value = card
      .querySelector(
        ".kpi-value,.bar-row>strong,.status-tag,.summary-item strong,.price-tiles strong,.funnel-chart b,.treemap strong,.composition-list b",
      )
      ?.textContent?.trim();
    const meta = card
      .querySelector(".kpi-meta,.panel-head p")
      ?.textContent?.trim();
    const lines = [];
    const isPriority = card.classList.contains("attention-row");
    if (isPriority) {
      const priorityTitle = card.querySelector("span b")?.textContent?.trim();
      const priorityAction = card
        .querySelector("span small")
        ?.textContent?.trim();
      if (priorityTitle) lines.push(`Isu: ${priorityTitle}`);
      if (priorityAction) lines.push(`Tindakan: ${priorityAction}`);
    }
    if (state.active === "industry") {
      const subsector = (state.ekraf?.topSubsectors || []).find(
        (x) => x.label === title,
      );
      const districtRows = state.ekraf?.districtCoverage || [];
      if (subsector) {
        lines.push(
          `Jumlah entitas pada kelompok: ${formatNumber(subsector.count)}`,
        );
        lines.push(
          `Proporsi direktori F&B: ${Math.round((subsector.count / Math.max(1, state.ekraf.totalFnbLocations || 0)) * 100)}%`,
        );
      }
      districtRows
        .slice(0, 6)
        .forEach((x) =>
          lines.push(`${x.label}: ${formatNumber(x.count)} entitas terpetakan`),
        );
    } else if (state.active === "market") {
      const districtMarkets = state.markets.filter(
        (x) => String(x.kecamatan || "Belum dipetakan") === title,
      );
      districtMarkets.forEach((x) =>
        lines.push(
          `${x.nama || x.name || x.id} · ${x.statusLabel || x.statusOperasional || "status tersedia"}`,
        ),
      );
    }
    if (!lines.length) {
      const description = card.innerText.replace(/\s+/g, " ").trim();
      if (description) lines.push(description);
    }
    const source =
      state.active === "industry"
        ? `SBL Ekraf · pembaruan ${state.ekraf?.sourceUpdatedAt || "belum tersedia"}`
        : state.dataState[state.active]?.label || "Sumber operasional aktif";
    const definitions = {
      "UTTP Diperiksa":
        "Jumlah alat ukur, takar, timbang dan perlengkapannya yang tercatat diperiksa pada snapshot.",
      "UTTP Sah":
        "Jumlah UTTP yang dinyatakan memenuhi ketentuan pada snapshot resmi.",
      "Pangkalan LPG":
        "Jumlah record pangkalan aktif pada master LPG, bukan jumlah pangkalan yang telah diverifikasi lapangan.",
      "Kelengkapan Koordinat":
        "Persentase record yang memiliki pasangan koordinat valid; bukan bukti verifikasi lapangan.",
      "Pasar Terdata": "Jumlah pasar pada master publik e-SKPT.",
      "ENTITAS EKRAF":
        "Jumlah master record pada snapshot agregat bulanan portal SBL Ekraf.",
    };
    const definition = isPriority
      ? "Butir eskalasi yang disusun otomatis dari kondisi data operasional yang tersedia."
      : definitions[title] ||
        "Indikator ditampilkan sesuai definisi dan cakupan sumber data aktif.";
    const target = isPriority
      ? "Tuntas sesuai SLA sumber; SLA belum diterbitkan bila tidak tercantum"
      : "Belum diterbitkan pada sumber";
    const ownership = isPriority
      ? "PIC mengikuti penanggung jawab pada sumber; tidak diisi dengan asumsi"
      : "Belum tersedia";
    $("ccDetailEyebrow").textContent =
      `${modules[state.active]?.title || "COMMAND CENTER"} · DETAIL`;
    $("ccDetailTitle").textContent = title;
    $("ccDetailBody").innerHTML =
      `${value ? `<p class="detail-lead">${esc(value)}${meta ? `<br><small>${esc(meta)}</small>` : ""}</p>` : ""}<div class="detail-grid"><div><small>Definisi indikator</small><strong>${esc(definition)}</strong></div><div><small>Sumber data</small><strong>${esc(source)}</strong></div><div><small>Target / SLA</small><strong>${esc(target)}</strong></div><div><small>PIC / perbandingan</small><strong>${esc(ownership)}</strong></div>${lines.map((line, i) => `<div><small>Rincian ${String(i + 1).padStart(2, "0")}</small><strong>${esc(line)}</strong></div>`).join("")}</div>`;
    $("ccDetail").hidden = false;
    document.body.classList.add("detail-open");
    if (window.lucide) lucide.createIcons();
  }
  function closeCardDetail() {
    $("ccDetail").hidden = true;
    document.body.classList.remove("detail-open");
  }
  function markerIcon(color) {
    return L.divIcon({
      className: "",
      html: `<div class="gis-marker" style="--marker:${color}"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 18],
    });
  }
  function getCoords(x) {
    const location = x.location || {},
      point =
        x.coordinates ||
        x.coordinate ||
        location.point ||
        location ||
        x.geoPoint ||
        {};
    return [
      Number(x.latitude ?? x.lat ?? point.latitude ?? point.lat),
      Number(x.longitude ?? x.lng ?? point.longitude ?? point.lng),
    ];
  }
  function initMap() {
    if (!window.L || !$("ccMap")) return;
    if (state.map) {
      state.map.remove();
      state.map = null;
    }
    state.map = L.map("ccMap", {
      zoomControl: false,
      preferCanvas: true,
    }).setView([-3.79, 119.65], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(state.map);
    L.control.zoom({ position: "topright" }).addTo(state.map);
    const cluster = () =>
        L.markerClusterGroup
          ? L.markerClusterGroup({
              showCoverageOnHover: false,
              maxClusterRadius: 42,
              disableClusteringAtZoom: 14,
            })
          : L.layerGroup(),
      market = cluster().addTo(state.map),
      lpg = cluster().addTo(state.map),
      fuel = cluster().addTo(state.map),
      boundary = L.layerGroup().addTo(state.map);
    state.markets.forEach((x) =>
      addMarker(market, x, COLORS.green, "Pasar e-SKPT"),
    );
    state.lpg
      .slice(0, 1000)
      .forEach((x) => addMarker(lpg, x, COLORS.purple, "Pangkalan LPG"));
    state.fuel.forEach((x) => addMarker(fuel, x, COLORS.blue, "Penyalur BBM"));
    state.mapLayers = { market, lpg, fuel, boundary };
    L.control
      .layers(
        null,
        {
          "Batas Kecamatan Pinrang": boundary,
          "Pasar e-SKPT": market,
          "Pangkalan LPG": lpg,
          "Penyalur BBM": fuel,
        },
        { collapsed: true, position: "bottomright" },
      )
      .addTo(state.map);
    loadPinrangBoundary(boundary);
    const districts = [
      ...new Set(
        [...state.markets, ...state.lpg, ...state.fuel]
          .map((x) => x.kecamatan || x.district)
          .filter(Boolean),
      ),
    ].sort();
    $("gisDistrict").insertAdjacentHTML(
      "beforeend",
      districts.map((x) => `<option>${esc(x)}</option>`).join(""),
    );
    $("gisSearch").addEventListener("input", filterMarkets);
    $("gisDistrict").addEventListener("change", filterMarkets);
    setTimeout(() => state.map.invalidateSize(), 100);
  }
  async function loadPinrangBoundary(layer) {
    try {
      const response = await fetch("geo/pinrang/2026-06/kecamatan.geojson");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const geo = L.geoJSON(data, {
        style: {
          color: "#12365f",
          weight: 2,
          opacity: 0.85,
          fillColor: "#2c70e8",
          fillOpacity: 0.035,
        },
        onEachFeature: (feature, item) =>
          item.bindTooltip(
            String(
              feature.properties?.WADMKC ||
                feature.properties?.KECAMATAN ||
                feature.properties?.name ||
                "Kecamatan Pinrang",
            ),
            { sticky: true },
          ),
      }).addTo(layer);
      state.map.fitBounds(geo.getBounds(), { padding: [24, 24], maxZoom: 11 });
    } catch (error) {
      console.warn("[Command Center] Batas Pinrang:", error.message);
    }
  }
  function addMarker(layer, x, color, type) {
    const [lat, lng] = getCoords(x);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const name = x.nama || x.name || x.businessName || x.outletName || type;
    L.marker([lat, lng], { icon: markerIcon(color), title: name })
      .bindPopup(
        `<strong>${esc(name)}</strong><br>${esc(x.alamat || x.address || x.desaKelurahan || x.village || "Lokasi Kabupaten Pinrang")}<br><small>Sumber: ${esc(x.sumberData || type)}</small>`,
      )
      .addTo(layer);
  }
  function filterMarkets() {
    const term = $("gisSearch").value.toLowerCase(),
      district = $("gisDistrict").value;
    const filter = (items) =>
      items.filter(
        (x) =>
          (!district || (x.kecamatan || x.district) === district) &&
          (!term || JSON.stringify(x).toLowerCase().includes(term)),
      );
    state.mapLayers.market.clearLayers();
    state.mapLayers.lpg.clearLayers();
    state.mapLayers.fuel.clearLayers();
    filter(state.markets).forEach((x) =>
      addMarker(state.mapLayers.market, x, COLORS.green, "Pasar e-SKPT"),
    );
    filter(state.lpg).forEach((x) =>
      addMarker(state.mapLayers.lpg, x, COLORS.purple, "Pangkalan LPG"),
    );
    filter(state.fuel).forEach((x) =>
      addMarker(state.mapLayers.fuel, x, COLORS.blue, "Penyalur BBM"),
    );
  }
  function renderMediaIntelligenceSummary(snapshot) {
    const kpis =
      snapshot && typeof snapshot.kpis === "object" ? snapshot.kpis : {};
    const safeKpi = (value) =>
      Number.isInteger(value) && value >= 0 ? String(value) : "—";
    const vals = [
      safeKpi(kpis.earned_mentions_24h),
      safeKpi(kpis.unique_stories_24h),
      safeKpi(kpis.active_critical_issues),
    ];
    ["ccMiMentions24h", "ccMiUniqueStories", "ccMiCriticalIssues"].forEach(
      (id, i) => {
        if ($(id)) $(id).textContent = vals[i];
      },
    );
    ["ccMiMentionsVisible", "ccMiStoriesVisible", "ccMiIssuesVisible"].forEach(
      (id, i) => {
        if ($(id)) $(id).textContent = vals[i];
      },
    );
    const lastSync = snapshot?.last_run_at || snapshot?.last_full_success_at;
    if ($("ccMiLastSync"))
      $("ccMiLastSync").textContent = lastSync?.toDate
        ? lastSync.toDate().toLocaleString("id-ID")
        : "—";
    if ($("ccMiStatus"))
      $("ccMiStatus").textContent = snapshot?.system_status || "OFFLINE";
  }
  function setStatus(kind, label) {
    const b = $("systemLiveBadge");
    b.className =
      "cc-live-badge " +
      (kind === "live" ? "status-live" : "status-unavailable");
    b.querySelector("span").textContent = label;
  }
  // Public-only media contract retained: db.collection('mi_public').doc('current').onSnapshot
  function connectData() {
    fetch("assets/data/sbl-ekraf-monthly.json", { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        state.ekraf = data;
        syncEkrafModule();
        refreshActive("industry");
      })
      .catch(() =>
        markData("industry", "DATA EKRAF TIDAK TERSEDIA", COLORS.amber),
      );
    if (window.MarketEngine) {
      state.markets = MarketEngine.getAll();
      MarketEngine.initRealtimeSync((items) => {
        state.markets = items;
        markData("market", "LIVE e-SKPT", COLORS.green);
        syncMarketModule();
        refreshActive("market", "gis");
      });
      MarketEngine.onStats((stats) => {
        state.stats = stats;
        syncMarketModule();
        refreshActive("market", "overview");
      });
    }
    state.primaryDb = typeof db !== "undefined" ? db : window.db;
    if (!state.primaryDb) {
      setStatus("offline", "OFFLINE");
      return;
    }
    setStatus("live", "LIVE");
    listenDoc("command_center", "metrics", (data) => {
      state.metrics = data;
      syncMetricsModules();
      markData("overview", "SNAPSHOT RESMI", COLORS.blue, data.updated_at);
      markData("metrology", "SNAPSHOT RESMI", COLORS.blue, data.updated_at);
      markData("industry", "SNAPSHOT RESMI", COLORS.blue, data.updated_at);
      refreshActive("overview", "metrology", "industry");
    });
    listenDoc("command_center", "districts", (data) => {
      state.districts = Array.isArray(data.items) ? data.items : [];
      syncDistrictModules();
      refreshActive("esdm", "overview");
    });
    listenDoc("lpg_dashboard", "summary", (data) => {
      state.lpgSummary = data;
      syncLpgModule();
      markData("esdm", "LIVE FIRESTORE", COLORS.green, data.updatedAt);
      refreshActive("esdm", "overview");
    });
    state.unsubs.push(
      state.primaryDb
        .collection("mi_public")
        .doc("current")
        .onSnapshot(
          (doc) => {
            if (doc.exists) {
              state.mi = doc.data();
              renderMediaIntelligenceSummary(state.mi);
              markData(
                "overview",
                "LIVE MULTISUMBER",
                COLORS.green,
                state.mi.last_run_at || state.mi.last_full_success_at,
              );
              refreshActive("overview");
            }
          },
          () => {},
        ),
    );
    listenCollection("lpg_pangkalan", (items) => {
      state.lpg = items.filter(
        (x) =>
          x.isDeleted !== true &&
          String(x.status || "ACTIVE").toUpperCase() !== "INACTIVE",
      );
      syncLpgModule();
      refreshActive("esdm", "gis", "overview");
    });
    listenCollection("lpg_agents", (items) => {
      state.agents = items.filter(
        (x) => String(x.status || "ACTIVE").toUpperCase() === "ACTIVE",
      );
      syncLpgModule();
      refreshActive("esdm");
    });
    listenCollection("bbm_outlets", (items) => {
      state.fuel = items;
      syncFuelModule();
      markData("fuel", "LIVE FIRESTORE", COLORS.green, latestTimestamp(items));
      refreshActive("fuel", "gis", "overview");
    });
    listenCollection("market_prices_latest", (items) => {
      state.prices = items.filter(
        (x) => Number(x.sourcePrice ?? x.price ?? x.harga) > 0,
      );
      syncPriceModule();
      refreshActive("overview", "market");
    });
    listenCollection("reports_current", (items) => {
      state.reports = items;
      syncReportModules();
      refreshActive("overview", "industry");
    });
  }
  function listenCollection(name, cb) {
    try {
      state.unsubs.push(
        state.primaryDb.collection(name).onSnapshot(
          { includeMetadataChanges: true },
          (s) => {
            if (s.metadata.fromCache && s.empty) return;
            cb(s.docs.map((d) => ({ id: d.id, ...d.data() })));
          },
          (error) => {
            console.warn("[Command Center]", name, error.code || error.message);
          },
        ),
      );
    } catch (e) {
      console.warn(name, e);
    }
  }
  function listenDoc(collection, id, cb) {
    try {
      state.unsubs.push(
        state.primaryDb
          .collection(collection)
          .doc(id)
          .onSnapshot(
            { includeMetadataChanges: true },
            (doc) => {
              if (doc.exists) cb({ id: doc.id, ...doc.data() });
            },
            (error) =>
              console.warn(
                "[Command Center]",
                collection + "/" + id,
                error.code || error.message,
              ),
          ),
      );
    } catch (e) {
      console.warn(collection + "/" + id, e);
    }
  }
  function markData(module, label, tone, stamp) {
    const value = toDate(stamp);
    const maxAgeDays = module === "industry" ? 35 : 7;
    const stale = value
      ? Date.now() - value.getTime() > maxAgeDays * 86400000
      : false;
    state.dataState[module] = {
      label: stale ? `${label} · KEDALUWARSA` : label,
      tone: stale ? COLORS.red : tone,
      time: value ? formatTime(value) : "waktu sumber tidak tersedia",
      rawTime: value ? value.getTime() : null,
      stale,
    };
    synthesizeExecutivePriorities();
  }
  function toDate(stamp) {
    if (!stamp) return null;
    const value = stamp?.toDate
      ? stamp.toDate()
      : stamp?.seconds
        ? new Date(stamp.seconds * 1000)
        : new Date(stamp);
    return Number.isNaN(value.getTime()) ? null : value;
  }
  function formatTime(stamp) {
    const value = toDate(stamp);
    if (!value) return "—";
    return Number.isNaN(value.getTime())
      ? "—"
      : new Intl.DateTimeFormat("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Makassar",
        })
          .format(value)
          .replace(".", ":") + " WITA";
  }
  function synthesizeExecutivePriorities() {
    const actions = [];
    const rejected = Number(state.stats?.rejectedTotal);
    if (Number.isFinite(rejected) && rejected > 0)
      actions.push([
        `${formatNumber(rejected)} pengajuan e-SKPT ditolak`,
        "Tinjau alasan agregat dan tindak lanjut koreksi",
        COLORS.red,
      ]);
    const overdueReports = state.reports.filter((x) => {
      const deadline = toDate(x.slaDeadline || x.dueAt || x.deadline);
      const closed = ["CLOSED", "RESOLVED", "SELESAI DITINDAKLANJUTI"].includes(
        String(x.status || "").toUpperCase(),
      );
      return deadline && deadline.getTime() < Date.now() && !closed;
    });
    if (overdueReports.length) {
      const pics = [
        ...new Set(
          overdueReports
            .map((x) => x.picName || x.pic || x.assignee)
            .filter(Boolean),
        ),
      ];
      actions.push([
        `${formatNumber(overdueReports.length)} pengaduan melewati SLA`,
        pics.length
          ? `Eskalasi kepada ${pics.slice(0, 2).join(", ")}`
          : "PIC belum diterbitkan; tetapkan penanggung jawab",
        COLORS.red,
      ]);
    }
    const lpgVerificationPublished =
      state.lpg.some((x) => x.verificationStatus != null) ||
      state.lpgSummary.pendingPangkalanVerification != null;
    if (state.lpg.length && !lpgVerificationPublished)
      actions.push([
        "Status verifikasi LPG belum tersedia",
        "Pemilik data perlu menerbitkan verificationStatus",
        COLORS.amber,
      ]);
    const stale = Object.entries(state.dataState)
      .filter(([, value]) => value.stale)
      .map(([key]) => key);
    if (stale.length)
      actions.push([
        `${stale.length} sumber data kedaluwarsa`,
        `Perbarui: ${stale.join(", ")}`,
        COLORS.red,
      ]);
    if (!actions.length)
      actions.push([
        "Tidak ada eskalasi kritis terukur",
        "Tetap pantau pembaruan dan kelengkapan sumber",
        COLORS.green,
      ]);
    modules.overview.attentionTitle = "PRIORITAS PIMPINAN";
    modules.overview.attention = actions.slice(0, 2);
  }
  function latestTimestamp(items) {
    return (
      items
        .map((x) => x.updatedAt || x.updated_at)
        .filter(Boolean)
        .sort((a, b) => Number(b?.seconds || 0) - Number(a?.seconds || 0))[0] ||
      null
    );
  }
  function refreshActive(...keys) {
    if (!keys.includes(state.active)) return;
    clearTimeout(state.renderTimer);
    state.renderTimer = setTimeout(() => show(state.active), 80);
  }
  function syncMarketModule() {
    const s = state.stats || {},
      total =
        Number(s.totalMarkets || state.markets.length) || state.markets.length,
      active = state.markets.filter(
        (x) =>
          String(x.statusOperasional || x.status || "aktif")
            .toLowerCase()
            .includes("aktif") &&
          !String(x.statusOperasional || "").includes("tidak"),
      ).length;
    const breakdown =
      s.marketBreakdown || s.marketCounts || s.topMarkets || null;
    modules.market.kpis[0][1] = formatNumber(total);
    modules.market.kpis[0][2] = "pasar pada master publik e-SKPT";
    modules.market.kpis[0][3] = `${active} aktif`;
    modules.market.kpis[1][1] = formatNumber(active);
    modules.market.kpis[1][2] = "pasar berstatus aktif";
    modules.market.kpis[1][3] = total
      ? `${Math.round((active / total) * 100)}%`
      : "—";
    modules.market.kpis[2][1] = formatNumber(s.totalIssuedSkpt);
    modules.market.kpis[2][2] = "e-SKPT sah diterbitkan";
    modules.market.kpis[3][1] = formatNumber(s.totalTraders);
    modules.market.kpis[3][2] = "pedagang unik terdaftar";
    modules.market.bars = Array.isArray(breakdown)
      ? breakdown.map((x) => [
          String(x.name || x.nama || x.marketName || x.label || "Pasar"),
          Number(x.count ?? x.total ?? x.value),
        ])
      : breakdown && typeof breakdown === "object"
        ? Object.entries(breakdown).map(([name, count]) => [
            name,
            Number(count),
          ])
        : [];
    modules.market.bars = modules.market.bars
      .filter((x) => Number.isFinite(x[1]) && x[1] > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7);
    if (!modules.market.bars.length) {
      const districts = new Map();
      state.markets.forEach((market) => {
        const name = String(market.kecamatan || "Belum dipetakan").trim();
        districts.set(name, (districts.get(name) || 0) + 1);
      });
      modules.market.bars = [...districts.entries()].sort(
        (a, b) => b[1] - a[1],
      );
      modules.market.chart = "SEBARAN MASTER PASAR PER KECAMATAN";
      modules.market.chartSub = "Jumlah pasar aktual pada master publik e-SKPT";
      modules.market.barUnit = "pasar";
    } else {
      modules.market.chart = "SEBARAN PEDAGANG PER PASAR";
      modules.market.chartSub = "Agregat pedagang yang diterbitkan e-SKPT";
      modules.market.barUnit = "pedagang";
    }
    modules.market.summary[0][0] = formatNumber(total);
    modules.market.summary[1][0] = formatNumber(s.totalBusinesses);
    modules.market.summary[2][0] = formatNumber(s.totalIssuedSkpt);
    modules.market.summary[3][0] = formatNumber(s.totalTraders);
    modules.market.statuses = [
      [
        "Master Pasar",
        `${formatNumber(total)} pasar pada sumber e-SKPT`,
        "Sinkron",
        "store",
        COLORS.green,
      ],
      [
        "Pasar Aktif",
        `${formatNumber(active)} berstatus aktif`,
        "Aktif",
        "store",
        COLORS.green,
      ],
      [
        "e-SKPT Terbit",
        `${formatNumber(s.totalIssuedSkpt)} dokumen sah`,
        "Publik",
        "qr-code",
        COLORS.blue,
      ],
      [
        "Pedagang",
        `${formatNumber(s.totalTraders)} identitas terdaftar`,
        "Agregat",
        "users",
        COLORS.purple,
      ],
    ];
    modules.overview.kpis[0][1] = `${formatNumber(active)} / ${formatNumber(total)}`;
    modules.overview.kpis[0][2] = "pasar aktif pada master e-SKPT";
    modules.overview.kpis[0][3] = total
      ? `${Math.round((active / total) * 100)}%`
      : "—";
    modules.overview.summary[0][0] = formatNumber(active);
    modules.overview.statuses[0] = [
      "Pasar Rakyat",
      `${formatNumber(active)} dari ${formatNumber(total)} pasar aktif`,
      "Sinkron",
      "store",
      COLORS.green,
    ];
    ticker();
    markData("market", "LIVE e-SKPT", COLORS.green);
  }
  function syncLpgModule() {
    const total =
        state.lpg.length || Number(state.lpgSummary.activePangkalan) || 0,
      agents =
        state.agents.length || Number(state.lpgSummary.officialAgents) || 0,
      hasVerification =
        state.lpg.some((x) => x.verificationStatus != null) ||
        state.lpgSummary.pendingPangkalanVerification != null,
      pending = hasVerification
        ? state.lpg.filter((x) =>
            String(x.verificationStatus || "").includes("PENDING"),
          ).length ||
          Number(state.lpgSummary.pendingPangkalanVerification) ||
          0
        : null;
    const het = state.metrics.het_lpg_price;
    const districts = new Set(state.lpg.map((x) => x.kecamatan).filter(Boolean))
      .size;
    const validGps = state.lpg.filter((x) =>
        getCoords(x).every(Number.isFinite),
      ).length,
      gpsPct = total ? Math.round((validGps / total) * 100) : null;
    modules.esdm.kpis[0][1] = formatNumber(total);
    modules.esdm.kpis[0][2] = "pangkalan pada master aktif";
    modules.esdm.kpis[0][3] = `${districts || "—"} kecamatan`;
    modules.esdm.kpis[1][1] = formatNumber(agents);
    modules.esdm.kpis[1][2] = "agen pada master aktif";
    modules.esdm.kpis[1][3] = "aktif";
    modules.esdm.kpis[2][1] = formatMoney(het);
    modules.esdm.kpis[2][2] = Number.isFinite(Number(het))
      ? "harga rujukan pada snapshot"
      : "harga belum diterbitkan";
    modules.esdm.kpis[2][3] =
      formatMoney(het) === "—" ? "belum tersedia" : "rujukan";
    modules.esdm.kpis[3][1] = formatNumber(pending);
    modules.esdm.kpis[3][2] = hasVerification
      ? "antrean verifikasi lapangan"
      : "status verifikasi belum diterbitkan";
    modules.esdm.kpis[3][3] = hasVerification
      ? pending
        ? "prioritas"
        : "baik"
      : "belum tersedia";
    modules.esdm.summary[0][0] = formatNumber(total);
    modules.esdm.summary[1][0] = formatNumber(districts);
    modules.esdm.summary[2][0] = gpsPct === null ? "—" : `${gpsPct}%`;
    const distribution = state.lpgDistribution,
      hasDistribution = Boolean(distribution?.totals),
      distributionTotal = hasDistribution
        ? Number(distribution.totals.grandTotal)
        : NaN,
      reportedAgents = Number(distribution?.coverage?.reportedAgentCount),
      officialAgents = Number(distribution?.coverage?.officialAgentCount);
    modules.esdm.summary[3][0] = Number.isFinite(distributionTotal)
      ? formatNumber(distributionTotal)
      : state.lpg.length
        ? "LIVE"
        : "—";
    modules.esdm.summary[3][1] = Number.isFinite(distributionTotal)
      ? "Tabung Sep 2026"
      : "Pembaruan";
    modules.esdm.bars = groupCount(state.lpg, "kecamatan").slice(0, 8);
    modules.esdm.statuses = [
      [
        "Master Pangkalan",
        `${formatNumber(total)} pangkalan aktif`,
        "Sinkron",
        "battery",
        COLORS.green,
      ],
      [
        "Agen Resmi",
        `${formatNumber(agents)} agen aktif`,
        "Terhubung",
        "building-2",
        COLORS.green,
      ],
      [
        "Realisasi September 2026",
        Number.isFinite(distributionTotal)
          ? `${formatNumber(distributionTotal)} tabung dari ${formatNumber(reportedAgents)} agen pelapor`
          : "Laporan penyaluran belum dimuat",
        Number.isFinite(distributionTotal) ? "Parsial" : "N/A",
        "chart-no-axes-column-increasing",
        Number.isFinite(distributionTotal) ? COLORS.amber : COLORS.navy,
      ],
      [
        "Kualitas Koordinat",
        `${formatNumber(validGps)} titik dapat dipetakan`,
        "Terukur",
        "map",
        COLORS.blue,
      ],
    ];
    modules.esdm.attention = [
      [
        Number.isFinite(distributionTotal)
          ? `Cakupan laporan ${formatNumber(reportedAgents)} dari ${formatNumber(officialAgents)} agen`
          : "Laporan penyaluran September belum tersedia",
        Number.isFinite(distributionTotal)
          ? `${formatNumber(distributionTotal)} tabung tidak boleh disebut total Kabupaten Pinrang`
          : "Perlu memuat dataset laporan agen",
        COLORS.amber,
      ],
      [
        "Koordinat GIS diperiksa otomatis",
        "Kualitas dihitung dari titik yang dapat dipetakan",
        COLORS.blue,
      ],
    ];
    modules.overview.kpis[2][1] = formatNumber(total);
    modules.overview.kpis[2][2] = "pangkalan pada master LPG";
    modules.overview.kpis[3][1] = formatMoney(het);
    modules.overview.kpis[3][2] = Number.isFinite(Number(het))
      ? "harga rujukan pada snapshot"
      : "harga belum diterbitkan";
    modules.overview.summary[2][0] = formatNumber(total);
    ticker();
  }
  async function loadStaticLpgDistribution() {
    try {
      const response = await fetch("assets/data/lpg-distribution-2026-09.json", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.lpgDistribution = await response.json();
      syncLpgModule();
      refreshActive("esdm", "overview");
    } catch (error) {
      console.warn("[Command Center] Laporan LPG September:", error.message);
    }
  }
  async function loadStaticLpgMaster() {
    try {
      const [baseResponse, agentResponse] = await Promise.all([
        fetch("assets/data/lpg-pangkalan.json", { cache: "no-store" }),
        fetch("assets/data/lpg-agents.json", { cache: "no-store" }),
      ]);
      if (!baseResponse.ok || !agentResponse.ok)
        throw new Error(`HTTP ${baseResponse.status}/${agentResponse.status}`);
      const [bases, agents] = await Promise.all([
        baseResponse.json(),
        agentResponse.json(),
      ]);
      if (!state.lpg.length)
        state.lpg = bases.filter(
          (x) =>
            x.isDeleted !== true &&
            String(x.status || "ACTIVE").toUpperCase() !== "INACTIVE",
        );
      if (!state.agents.length)
        state.agents = agents.filter(
          (x) =>
            x.isDeleted !== true &&
            String(x.status || "ACTIVE").toUpperCase() === "ACTIVE",
        );
      syncLpgModule();
      markData("esdm", "MASTER JSON", COLORS.blue);
      refreshActive("esdm", "overview", "gis");
    } catch (error) {
      console.warn("[Command Center] Master LPG lokal:", error.message);
    }
  }
  function syncFuelModule() {
    const counts = {};
    state.fuel.forEach((x) => {
      const key = x.kategori_code || "lainnya";
      counts[key] = (counts[key] || 0) + 1;
    });
    const categories = [
      ["SPBU Reguler", counts.spbu_reguler || 0],
      ["APMS / Compact", counts.spbu_kompak || 0],
      ["Pertashop", counts.pertashop || 0],
      ["SPBUN Nelayan", counts.spbun || 0],
    ];
    modules.fuel.kpis[0][1] = formatNumber(state.fuel.length);
    modules.fuel.kpis[0][3] = "Firestore";
    modules.fuel.kpis[0][2] = "titik penyalur pada master";
    modules.fuel.kpis[1][1] = formatNumber(
      (counts.spbu_reguler || 0) + (counts.spbu_kompak || 0),
    );
    modules.fuel.kpis[1][2] = "SPBU reguler dan APMS/Compact";
    modules.fuel.kpis[2][1] = formatNumber(counts.pertashop || 0);
    modules.fuel.kpis[2][2] = "titik Pertashop pada master";
    modules.fuel.kpis[3][1] = formatNumber(counts.spbun || 0);
    modules.fuel.kpis[3][2] = "SPBUN nelayan pada master";
    modules.fuel.bars = categories.filter((x) => x[1] > 0);
    modules.fuel.summary.forEach(
      (x, i) =>
        (x[0] = formatNumber(
          i === 0 ? state.fuel.length : categories[i]?.[1] || 0,
        )),
    );
    modules.fuel.statuses = categories
      .filter((x) => x[1] > 0)
      .map((x, i) => [
        x[0],
        `${formatNumber(x[1])} titik pada master`,
        "Aktif",
        i === 2 ? "store" : "fuel",
        [COLORS.green, COLORS.blue, COLORS.purple, COLORS.amber][i],
      ]);
    modules.overview.kpis[1][1] = formatNumber(state.fuel.length);
    modules.overview.kpis[1][2] = "titik penyalur pada master BBM";
    modules.overview.summary[1][0] = formatNumber(state.fuel.length);
    modules.overview.statuses[2] = [
      "BBM",
      `${formatNumber(state.fuel.length)} titik penyalur pada master`,
      "Sinkron",
      "fuel",
      COLORS.green,
    ];
  }
  function syncPriceModule() {
    modules.overview.bars = state.prices
      .map((x) => [
        x.commodityName || x.name || x.komoditas,
        Number(x.sourcePrice ?? x.price ?? x.harga),
        x.unit || x.satuan,
      ])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    if (state.prices.length)
      markData(
        "overview",
        "LIVE MULTISUMBER",
        COLORS.green,
        latestTimestamp(state.prices),
      );
  }
  function syncMetricsModules() {
    const m = state.metrics || {},
      uttp = Number(m.uttp_verified),
      compliance = Number(m.uttp_compliance_pct),
      spbu = Number(m.spbu_verified_pct),
      ikm = Number(m.total_ikm_trained),
      certified = Number(m.total_ikm_certified);
    modules.metrology.kpis[0][1] = formatNumber(
      m.uttp_inspected ?? m.uttp_verified,
    );
    modules.metrology.kpis[0][2] = "jumlah pemeriksaan pada snapshot";
    modules.metrology.kpis[1][1] = formatNumber(uttp);
    modules.metrology.kpis[1][2] = "UTTP berstatus sah pada snapshot";
    modules.metrology.kpis[1][3] = Number.isFinite(compliance)
      ? `${compliance.toLocaleString("id-ID")}%`
      : "—";
    modules.metrology.kpis[3][1] = Number.isFinite(spbu)
      ? `${spbu.toLocaleString("id-ID")}%`
      : "—";
    modules.metrology.kpis[3][2] = Number.isFinite(spbu)
      ? "kepatuhan nozzle SPBU"
      : "indikator belum diterbitkan";
    modules.metrology.complianceValue = Number.isFinite(compliance)
      ? compliance
      : null;
    const metrologyBreakdown =
      m.uttp_by_district || m.metrology_by_district || m.district_breakdown;
    modules.metrology.bars = Array.isArray(metrologyBreakdown)
      ? metrologyBreakdown
          .map((x) => [
            x.name || x.kecamatan || x.label,
            Number(x.count ?? x.total ?? x.value),
          ])
          .filter((x) => x[0] && Number.isFinite(x[1]))
      : metrologyBreakdown && typeof metrologyBreakdown === "object"
        ? Object.entries(metrologyBreakdown)
            .map(([name, count]) => [name, Number(count)])
            .filter((x) => Number.isFinite(x[1]))
        : [];
    modules.metrology.statuses = [
      [
        "UTTP Terverifikasi",
        `${formatNumber(uttp)} unit pada snapshot resmi`,
        "Terpublikasi",
        "scale",
        COLORS.green,
      ],
      [
        "Kepatuhan Nozzle",
        Number.isFinite(spbu)
          ? `${spbu.toLocaleString("id-ID")}% terverifikasi`
          : "Belum tersedia",
        Number.isFinite(spbu) ? "Terukur" : "N/A",
        "fuel",
        Number.isFinite(spbu) ? COLORS.blue : COLORS.amber,
      ],
    ];
    modules.industry.kpis[0][1] = formatNumber(ikm);
    modules.industry.kpis[1][1] = formatNumber(certified);
    modules.industry.bars = [];
    modules.industry.statuses[0] = [
      "IKM Terbina",
      `${formatNumber(ikm)} tercatat pada snapshot`,
      "Terpublikasi",
      "factory",
      COLORS.green,
    ];
    modules.industry.statuses[1] = [
      "Sertifikasi",
      `${formatNumber(certified)} fasilitasi tercatat`,
      "Terpublikasi",
      "badge-check",
      COLORS.blue,
    ];
    modules.overview.summary[3][0] = formatNumber(ikm);
    if (state.ekraf?.totalMasterRecords) syncEkrafModule();
    ticker();
  }
  function syncDistrictModules() {
    if (!state.districts.length) return;
    const rows = state.districts
      .map((x) => [x.name || x.kecamatan, Number(x.pangkalan) || 0])
      .filter((x) => x[1] > 0)
      .sort((a, b) => b[1] - a[1]);
    if (!state.lpg.length) modules.esdm.bars = rows.slice(0, 8);
  }
  function syncEkrafModule() {
    const e = state.ekraf || {};
    modules.industry.kpis[0][0] = "ENTITAS EKRAF";
    modules.industry.kpis[0][1] = formatNumber(e.totalMasterRecords);
    modules.industry.kpis[0][2] = "agregat portal SBL Ekraf";
    modules.industry.kpis[0][3] = "snapshot bulanan";
    modules.industry.kpis[1][0] = "LOKASI F&B";
    modules.industry.kpis[1][1] = formatNumber(e.totalFnbLocations);
    modules.industry.kpis[1][2] = "direktori kuliner dan F&B";
    modules.industry.kpis[1][3] = "snapshot bulanan";
    modules.industry.kpis[2][0] = "SUBSEKTOR";
    modules.industry.kpis[2][1] = formatNumber(e.totalSubsectors);
    modules.industry.kpis[2][2] = "klasifikasi ekonomi kreatif";
    modules.industry.kpis[2][3] = "21 subsektor";
    modules.industry.kpis[3][0] = "CAKUPAN";
    modules.industry.kpis[3][1] = formatNumber(e.totalDistricts);
    modules.industry.kpis[3][2] = "kecamatan dalam agregat";
    modules.industry.kpis[3][3] = "cakupan wilayah";
    modules.industry.bars = (e.topSubsectors || []).map((x) => [
      x.label,
      x.count,
    ]);
    modules.industry.chart = "KOMPOSISI DIREKTORI EKRAF";
    modules.industry.chartSub = "Snapshot agregat bulanan SBL Ekraf Pinrang";
    modules.industry.summary = [
      [
        formatNumber(e.totalMasterRecords),
        "Master record",
        "factory",
        COLORS.red,
      ],
      [formatNumber(e.totalFnbLocations), "Lokasi F&B", "store", COLORS.green],
      [
        formatNumber(e.totalSubsectors),
        "Subsektor",
        "layout-grid",
        COLORS.blue,
      ],
      [formatNumber(e.totalDistricts), "Kecamatan", "map", COLORS.amber],
    ];
    modules.industry.sourceValue = "SBL EKRAF · SNAPSHOT BULANAN";
    modules.industry.statuses[0] = [
      "Sumber Ekraf",
      `Pembaruan sumber ${e.sourceUpdatedAt || "—"}`,
      "Bulanan",
      "database",
      COLORS.green,
    ];
    const unmapped =
      (e.districtCoverage || []).find((x) =>
        String(x.label).toLowerCase().includes("belum"),
      )?.count || 0;
    modules.industry.attentionTitle = "VALIDASI DATA EKRAF";
    modules.industry.attention = [
      [
        `${formatNumber(e.totalDuplicateCases)} indikasi duplikasi`,
        "Perlu rekonsiliasi master pada pembaruan berikutnya",
        Number(e.totalDuplicateCases) ? COLORS.amber : COLORS.green,
      ],
      [
        `${formatNumber(unmapped)} entitas belum dipetakan`,
        "Lengkapi kecamatan agar analisis wilayah akurat",
        Number(unmapped) ? COLORS.amber : COLORS.green,
      ],
    ];
    modules.industry.extra = "health";
    modules.industry.extraTitle = "KESEHATAN SUMBER";
    markData("industry", "SNAPSHOT SBL EKRAF", COLORS.green, e.syncedAt);
  }
  function syncReportModules() {
    const active = state.reports.filter(
      (x) =>
        ![
          "SELESAI DITINDAKLANJUTI",
          "DITOLAK / TIDAK SESUAI KEWENANGAN",
          "CLOSED",
          "RESOLVED",
        ].includes(String(x.status || "").toUpperCase()),
    ).length;
    modules.overview.statuses[4][1] = `${formatNumber(active)} aduan aktif dalam proses`;
    modules.overview.statuses[4][2] = active ? "Perhatian" : "Normal";
    synthesizeExecutivePriorities();
  }
  function groupCount(items, field) {
    const map = new Map();
    items.forEach((x) => {
      const key = String(x[field] || "Belum terpetakan").trim();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }
  function clock() {
    const now = new Date(),
      dateFmt = new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Makassar",
      }),
      timeFmt = new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Makassar",
      });
    $("ccLiveDate").textContent = dateFmt.format(now);
    $("ccLiveTime").innerHTML =
      timeFmt.format(now).replaceAll(".", ":") + " <small>WITA</small>";
    $("ccFooterTime").textContent = timeFmt
      .format(now)
      .slice(0, 5)
      .replace(".", ":");
  }
  function ticker() {
    const rejected = Number(state.stats?.rejectedTotal);
    const rejectedText = Number.isFinite(rejected)
      ? `${formatNumber(rejected)} pengajuan pedagang ditolak dalam agregat e-SKPT`
      : "Agregat pengajuan pedagang ditolak sedang disinkronkan dari e-SKPT";
    const compliance = Number(state.metrics?.uttp_compliance_pct);
    const lpgVerificationPublished =
      state.lpg.some((x) => x.verificationStatus != null) ||
      state.lpgSummary.pendingPangkalanVerification != null;
    const items = [
      [
        "e-SKPT",
        rejectedText,
        Number.isFinite(rejected) && rejected > 0 ? COLORS.red : COLORS.blue,
      ],
      [
        "LPG",
        lpgVerificationPublished
          ? "Status verifikasi lapangan tersedia untuk evaluasi"
          : "Status verifikasi lapangan belum diterbitkan; perlu dilengkapi pemilik data",
        COLORS.amber,
      ],
      [
        "METROLOGI",
        Number.isFinite(compliance)
          ? `Kepatuhan UTTP ${compliance.toLocaleString("id-ID")}% pada snapshot resmi`
          : "Indikator kepatuhan UTTP belum diterbitkan",
        Number.isFinite(compliance) && compliance < 95
          ? COLORS.red
          : COLORS.green,
      ],
      [
        "DATA",
        `${dataHealth()[0][0]} sumber utama tersedia · ${dataHealth()[1][0]} record master`,
        COLORS.blue,
      ],
    ];
    const tickerGroup = items
      .map(
        (x) =>
          `<span data-label="${x[0]}" style="--tone:${x[2]}">${x[1]}</span>`,
      )
      .join("");
    $("ccTickerText").innerHTML =
      `<div class="ticker-track"><div class="ticker-group">${tickerGroup}</div><div class="ticker-group" aria-hidden="true">${tickerGroup}</div></div>`;
    requestAnimationFrame(() => {
      const track = $("ccTickerText").querySelector(".ticker-track");
      const group = track?.querySelector(".ticker-group");
      if (!track || !group || !group.scrollWidth) return;
      track.getAnimations().forEach((animation) => animation.cancel());
      const movement = track.animate(
        [
          { transform: "translate3d(0,0,0)" },
          { transform: `translate3d(-${group.scrollWidth}px,0,0)` },
        ],
        {
          duration: Math.max(18000, group.scrollWidth * 22),
          iterations: Infinity,
          easing: "linear",
        },
      );
      $("ccTickerText").onmouseenter = () => movement.pause();
      $("ccTickerText").onmouseleave = () => movement.play();
    });
  }
  function openCommand() {
    const box = $("ccCommand");
    box.hidden = false;
    $("ccCommandInput").value = "";
    renderCommand("");
    setTimeout(() => $("ccCommandInput").focus(), 20);
  }
  function renderCommand(term) {
    const q = term.toLowerCase();
    $("ccCommandResults").innerHTML = Object.entries({
      ...modules,
      gis: {
        title: "Peta GIS Disperindag ESDM",
        sub: "Data geospasial e-SKPT dan ESDM",
      },
    })
      .filter(([, m]) => (m.title + " " + m.sub).toLowerCase().includes(q))
      .map(
        ([key, m]) =>
          `<button class="command-result" type="button" data-command="${key}"><b>${m.title}</b><br><small>${m.sub}</small></button>`,
      )
      .join("");
    document.querySelectorAll("[data-command]").forEach(
      (b) =>
        (b.onclick = () => {
          show(b.dataset.command);
          $("ccCommand").hidden = true;
        }),
    );
  }
  function show(key) {
    key === "gis" ? renderGis() : renderStandard(key);
    history.replaceState(null, "", "#" + key);
    scheduleRotation();
  }
  function scheduleRotation() {
    clearTimeout(state.rotationTimer);
    if (state.paused) return;
    state.rotationTimer = setTimeout(
      () => {
        const keys = [
            "overview",
            "market",
            "metrology",
            "esdm",
            "industry",
            "fuel",
            "gis",
          ],
          next = keys[(keys.indexOf(state.active) + 1) % keys.length];
        show(next);
      },
      state.active === "gis" ? 30000 : 20000,
    );
  }
  document
    .querySelectorAll(".cc-tab")
    .forEach((b) => b.addEventListener("click", () => show(b.dataset.slide)));
  $("btnFullscreen").onclick = () =>
    document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
  $("ccSearch").onclick = openCommand;
  $("btnSettings").onclick = () => {
    state.paused = !state.paused;
    $("btnSettings").classList.toggle("is-paused", state.paused);
    $("btnSettings").title = state.paused
      ? "Rotasi dijeda — klik untuk melanjutkan"
      : "Rotasi otomatis aktif — klik untuk menjeda";
    scheduleRotation();
  };
  $("ccCommandInput").oninput = (e) => renderCommand(e.target.value);
  document.querySelector("[data-close-command]").onclick = () =>
    ($("ccCommand").hidden = true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") $("ccCommand").hidden = true;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openCommand();
    }
  });
  function initializeProductionState() {
    ["overview", "market", "metrology", "esdm", "industry", "fuel"].forEach(
      (key) => markData(key, "MENUNGGU DATA", COLORS.amber),
    );
    modules.overview.kpis.forEach((k) => {
      k[1] = "—";
      k[2] = "data belum diterbitkan";
      k[3] = "menunggu";
    });
    modules.overview.summary.forEach((x) => (x[0] = "—"));
    modules.overview.bars = [];
    modules.overview.statuses = [
      [
        "Pasar Rakyat",
        "Menunggu snapshot e-SKPT",
        "Menunggu",
        "store",
        COLORS.green,
      ],
      [
        "LPG 3 Kg",
        "Menunggu master pangkalan",
        "Menunggu",
        "battery",
        COLORS.purple,
      ],
      ["BBM", "Menunggu master penyalur", "Menunggu", "fuel", COLORS.blue],
      [
        "Metrologi & Tera",
        "Menunggu snapshot indikator resmi",
        "Menunggu",
        "scale",
        COLORS.amber,
      ],
      [
        "Industri & Pengaduan",
        "Menunggu snapshot indikator resmi",
        "Menunggu",
        "factory",
        COLORS.red,
      ],
    ];
    modules.overview.attention = [
      [
        "Menunggu indikator anomali",
        "Sistem tidak menampilkan peringatan simulasi",
        COLORS.blue,
      ],
      [
        "Validasi sumber data berjalan",
        "Status berubah setelah snapshot server diterima",
        COLORS.amber,
      ],
    ];
    modules.overview.extra = "health";
    modules.overview.extraTitle = "KESEHATAN DATA";
    modules.market.kpis.forEach((k) => {
      k[1] = "—";
      k[2] = "menunggu e-SKPT";
      k[3] = "menunggu";
    });
    modules.market.summary.forEach((x) => (x[0] = "—"));
    modules.market.bars = [];
    modules.market.attention = [
      [
        "Validasi kelengkapan master",
        "Koordinat dan status pasar dibaca dari e-SKPT",
        COLORS.blue,
      ],
      [
        "Agregat pedagang belum tersedia",
        "Grafik hanya muncul saat sumber menerbitkan rincian",
        COLORS.amber,
      ],
    ];
    modules.market.extra = "dataQuality";
    modules.market.extraTitle = "KUALITAS DATA";
    modules.metrology.kpis.forEach((k) => {
      k[1] = "—";
      k[2] = "data belum diterbitkan";
      k[3] = "menunggu";
    });
    modules.metrology.summary.forEach((x) => (x[0] = "—"));
    modules.metrology.bars = [];
    modules.metrology.statuses = [
      [
        "Snapshot Metrologi",
        "Menunggu publikasi metrik resmi",
        "Menunggu",
        "scale",
        COLORS.blue,
      ],
      [
        "Jadwal Tera",
        "Belum ada jadwal publik pada sumber Command Center",
        "Belum tersedia",
        "calendar",
        COLORS.amber,
      ],
    ];
    modules.metrology.attention = [
      [
        "Tidak ada peringatan simulasi",
        "Tindak lanjut hanya muncul dari snapshot resmi",
        COLORS.blue,
      ],
    ];
    modules.esdm.kpis.forEach((k) => {
      k[1] = "—";
      k[2] = "data belum diterbitkan";
      k[3] = "menunggu";
    });
    modules.esdm.summary.forEach((x) => (x[0] = "—"));
    modules.esdm.bars = [];
    modules.industry.kpis.forEach((k) => {
      k[1] = "—";
      k[2] = "data belum diterbitkan";
      k[3] = "menunggu";
    });
    modules.industry.summary.forEach((x) => (x[0] = "—"));
    modules.industry.bars = [];
    modules.industry.statuses = [
      [
        "Snapshot Industri",
        "Menunggu publikasi indikator IKM",
        "Menunggu",
        "factory",
        COLORS.blue,
      ],
      [
        "SP4N-LAPOR!",
        "Membaca jumlah aduan dari laporan terkini",
        "Terhubung",
        "triangle-alert",
        COLORS.green,
      ],
    ];
    modules.industry.attention = [
      [
        "Tidak ada angka contoh",
        "Subsektor ditampilkan setelah dataset resmi tersedia",
        COLORS.blue,
      ],
    ];
    modules.industry.extra = "dataQuality";
    modules.industry.extraTitle = "KETERSEDIAAN DATA";
    modules.fuel.kpis.forEach((k) => {
      k[1] = "—";
      k[2] = "data belum diterbitkan";
      k[3] = "menunggu";
    });
    modules.fuel.summary.forEach((x) => (x[0] = "—"));
    modules.fuel.bars = [];
  }
  initializeProductionState();
  loadStaticLpgMaster();
  loadStaticLpgDistribution();
  document
    .querySelectorAll("[data-close-detail]")
    .forEach((button) => button.addEventListener("click", closeCardDetail));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("ccDetail").hidden) closeCardDetail();
  });
  ticker();
  clock();
  setInterval(clock, 1000);
  show(
    location.hash.slice(1) in modules || location.hash === "#gis"
      ? location.hash.slice(1)
      : "overview",
  );
  connectData();
})();
