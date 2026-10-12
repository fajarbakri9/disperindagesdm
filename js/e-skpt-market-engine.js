(function (window) {
  "use strict";
  const EPASAR_BASE_URL = "https://e-skpt.web.app";
  const EPASAR_FIREBASE_CONFIG = {
    apiKey: "AIzaSyBZckQ3ExJf7EaAgfe5NuvCbObgxOIuszE",
    authDomain: "e-skpt.firebaseapp.com",
    projectId: "e-skpt",
    storageBucket: "e-skpt.firebasestorage.app",
    messagingSenderId: "668870299153",
    appId: "1:668870299153:web:9aab7118d7a44201a42bb0",
  };
  const MARKET_META = [
    [
      "MKT-001",
      "Pasar Rakyat Bungi",
      "Duampanua",
      "Jl. Poros Pinrang - Polman, Desa Bungi",
      "Pasar Mingguan (Rabu & Sabtu)",
      -3.6685,
      119.5312,
      6,
    ],
    [
      "MKT-002",
      "Pasar Rakyat Cempa",
      "Cempa",
      "Jl. Poros Cempa, Kelurahan Cempa",
      "Pasar Mingguan (Selasa & Jumat)",
      -3.7455,
      119.5788,
      4,
    ],
    [
      "MKT-003",
      "Pasar Rakyat Kampung Jaya",
      "Watang Sawitto",
      "Jl. Anggrek / Kp. Jaya, Kelurahan Jaya",
      "Pasar Harian (Setiap Hari)",
      -3.7954,
      119.6486,
      3,
    ],
    [
      "MKT-004",
      "Pasar Rakyat Kariango",
      "Mattiro Bulu",
      "Jl. Poros Pinrang - Parepare, Dusun Kariango, Desa Pananrang",
      "Pasar Mingguan (Senin & Kamis)",
      -3.8884,
      119.6427,
      7,
    ],
    [
      "MKT-005",
      "Pasar Rakyat Langnga",
      "Mattiro Sompe",
      "Jl. Poros Langnga, Kelurahan Langnga",
      "Pasar Mingguan (Selasa & Sabtu)",
      -3.876,
      119.532,
      3,
    ],
    [
      "MKT-006",
      "Pasar Rakyat Lanrisang (Jampue)",
      "Lanrisang",
      "Jl. Poros Jampue, Desa Lanrisang",
      "Pasar Mingguan (Senin & Kamis)",
      -3.9027,
      119.5556,
      3,
    ],
    [
      "MKT-007",
      "Pasar Rakyat Leppangang",
      "Patampanua",
      "Jl. Poros Pinrang - Enrekang, Desa Leppangang",
      "Pasar Mingguan (Rabu & Minggu)",
      -3.741,
      119.638,
      3,
    ],
    [
      "MKT-008",
      "Pasar Rakyat Marawi",
      "Tiroang",
      "Jl. Poros Tiroang - Marawi, Kelurahan Marawi",
      "Pasar Mingguan (Selasa & Jumat)",
      -3.8138,
      119.7325,
      3,
    ],
    [
      "MKT-009",
      "Pasar Rakyat Pekkabata",
      "Duampanua",
      "Jl. Poros Pekkabata, Kelurahan Pekkabata",
      "Pasar Mingguan (Minggu & Rabu)",
      -3.6821,
      119.5398,
      1,
    ],
    [
      "MKT-010",
      "Pasar Rakyat Sentral Pinrang",
      "Paleteang",
      "Jl. Sukowati / Basuki Rahmat, Paleteang / Sawitto",
      "Pasar Harian (Setiap Hari)",
      -3.7892,
      119.6508,
      9,
    ],
    [
      "MKT-011",
      "Pasar Rakyat Teppo",
      "Patampanua",
      "Jl. Poros Teppo, Kelurahan Teppo",
      "Pasar Mingguan (Rabu & Sabtu)",
      -3.7102,
      119.6683,
      3,
    ],
  ];
  const META_BY_ID = Object.fromEntries(
    MARKET_META.map((row) => [row[0], row]),
  );
  // Tidak ada angka fallback ilustratif. Ringkasan hanya ditampilkan setelah
  // dokumen publik e-SKPT berhasil dibaca dari Firestore.
  let stats = {
    totalTraders: null,
    marketTraders: null,
    nonMarketTraders: null,
    totalIssuedSkpt: null,
    totalBusinesses: null,
  };
  const statsListeners = new Set();
  function validCoordinate(lat, lng) {
    const a = Number(lat),
      b = Number(lng);
    return (
      Number.isFinite(a) &&
      Number.isFinite(b) &&
      a >= -4.18 &&
      a <= -3.25 &&
      b >= 119.25 &&
      b <= 120.05
    );
  }
  function scheduleDays(value) {
    if (/setiap hari/i.test(value)) return ["Setiap hari"];
    const m = String(value).match(/\(([^)]+)\)/);
    return m ? m[1].split(/\s*&\s*/) : [];
  }
  function normalizeMarket(id, source) {
    const m = META_BY_ID[id] || [
      id,
      source?.name || id,
      "",
      "",
      "",
      null,
      null,
      0,
    ];
    const active =
      String(source?.status || "ACTIVE").toUpperCase() === "ACTIVE";
    const traderCount = Number(source?.traderCount ?? source?.jumlahPedagang);
    return {
      id,
      marketId: id,
      slug: id.toLowerCase(),
      nama: String(source?.name || m[1]),
      kecamatan: m[2],
      desaKelurahan: m[3].split(",").slice(-1)[0].trim(),
      alamat: m[3],
      statusOperasional: active ? "aktif" : "tidak-aktif",
      statusLabel: active ? "Aktif" : "Tidak Aktif",
      hariPasar: scheduleDays(m[4]),
      jadwalGoogleMaps: m[4],
      jamOperasional: m[4],
      latitude: m[5],
      longitude: m[6],
      jumlahPedagang: Number.isFinite(traderCount) ? traderCount : null,
      jumlahKios: null,
      fotoUtama: `${EPASAR_BASE_URL}/assets/images/pasar/${id}.jpg`,
      deskripsi: `${m[1]} merupakan pasar rakyat resmi yang tercatat dalam sistem Satu Data Pedagang e-PASAR Kabupaten Pinrang.`,
      sumberData: "e-SKPT / e-PASAR Kabupaten Pinrang",
      dataVersion: source?.schemaVersion || 1,
      statusKoordinat: "Referensi lokasi e-PASAR",
      googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${m[5]},${m[6]}`,
      epasarUrl: `${EPASAR_BASE_URL}/epasar.html`,
      epasarInfoUrl: `${EPASAR_BASE_URL}/data-informasi.html`,
    };
  }
  function fallbackMarkets() {
    return MARKET_META.map((m) =>
      normalizeMarket(m[0], { name: m[1], status: "ACTIVE", schemaVersion: 1 }),
    );
  }
  function notifyStats() {
    statsListeners.forEach((fn) => fn({ ...stats }));
  }
  const MarketEngine = {
    _cloudData: fallbackMarkets(),
    getAll() {
      return this._cloudData.map((x) => ({ ...x }));
    },
    getStats() {
      return { ...stats };
    },
    onStats(callback) {
      if (typeof callback !== "function") return function () {};
      statsListeners.add(callback);
      queueMicrotask(() => callback(this.getStats()));
      return () => statsListeners.delete(callback);
    },
    getById(id) {
      return (
        this.getAll().find((x) => x.id === id || x.marketId === id) || null
      );
    },
    validCoordinate,
    normalizeMarket,
    initRealtimeSync(callback) {
      if (typeof callback === "function")
        queueMicrotask(() => callback(this.getAll()));
      if (!window.firebase || typeof firebase.initializeApp !== "function")
        return null;
      let app;
      try {
        app =
          firebase.apps.find((x) => x.name === "e-skpt-public") ||
          firebase.initializeApp(EPASAR_FIREBASE_CONFIG, "e-skpt-public");
      } catch (error) {
        console.warn(
          "[e-SKPT MarketEngine] Inisialisasi gagal:",
          error.message,
        );
        return null;
      }
      const epasarDb = app.firestore();
      const a = epasarDb.collection("markets").onSnapshot(
        (snap) => {
          const items = [];
          snap.forEach((doc) => {
            if (META_BY_ID[doc.id])
              items.push(normalizeMarket(doc.id, doc.data()));
          });
          this._cloudData = items.sort((x, y) =>
            x.marketId.localeCompare(y.marketId),
          );
          if (typeof callback === "function") callback(this.getAll());
        },
        (error) =>
          console.warn(
            "[e-SKPT MarketEngine] Master pasar tidak dapat dimuat:",
            error.message,
          ),
      );
      const b = epasarDb
        .collection("public_stats")
        .doc("summary")
        .onSnapshot(
          (doc) => {
            if (doc.exists) stats = { ...stats, ...doc.data() };
            notifyStats();
          },
          (error) =>
            console.warn(
              "[e-SKPT MarketEngine] Statistik publik tidak dapat dimuat:",
              error.message,
            ),
        );
      return () => {
        a();
        b();
      };
    },
  };
  window.MarketEngine = MarketEngine;
  window.EPASAR_PUBLIC_URL = EPASAR_BASE_URL;
})(window);
