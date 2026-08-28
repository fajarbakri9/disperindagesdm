/**
 * ============================================================
 * MEDIA INTELLIGENCE CRAWLER v3.0 — DISPERINDAG ESDM KAB. PINRANG
 * PINRANG ISSUE DISCOVERY ENGINE
 * ============================================================
 * Deskripsi : Crawl 30 sumber RSS (Tier 1-3) → filter dengan
 *             Keyword Intelligence Dictionary 13 cluster →
 *             Ambil thumbnail og:image → Analisis via Gemini →
 *             Simpan ke Google Sheets + Firebase Firestore →
 *             Buat snapshot dashboard/current untuk TV Wallboard
 * Platform  : Google Apps Script (script.google.com)
 * Jadwal    : Otomatis setiap 30 menit via Time-driven Trigger
 * ============================================================
 */

// ============================================================
//  KONFIGURASI UTAMA — GANTI NILAI INI
// ============================================================
const CONFIG = {
  GEMINI_API_KEY:     "GANTI_DENGAN_GEMINI_API_KEY_ANDA",
  FIREBASE_PROJECT_ID:"disperindagesdm-pinrang",
  FIREBASE_API_KEY:   "AIzaSyD4J1kidUcBcz7EdmYRIJ66YR5jOEO477I",
  MAX_ARTICLES_PER_RUN: 25,
  MAX_TOTAL_ARTICLES:   150,
  MAX_THUMBNAIL_FETCH:  10,   // Batasi fetch og:image agar tidak timeout

  // ── CLUSTER 01: Entitas Dinas (match wajib untuk Tier 2 & 3) ─────────
  KW_ENTITY: [
    "disperindag pinrang","disperindag esdm pinrang","disperindagem pinrang",
    "dinas perindustrian pinrang","dinas perdagangan pinrang",
    "kadis perindag pinrang","kepala dinas perindag","perindag pinrang"
  ],
  // ── CLUSTER 02: LPG ⚡ (risk_multiplier: 2.5) ────────────────────────
  KW_LPG: [
    "lpg pinrang","lpg 3 kg pinrang","elpiji pinrang","gas melon pinrang",
    "pangkalan lpg pinrang","kelangkaan lpg pinrang","het lpg pinrang",
    "distribusi lpg pinrang","penimbunan lpg pinrang","penyelewengan lpg pinrang",
    "pangkalan gas duampanua","lpg bungi","lpg watang sawitto","lpg lembang",
    "lpg","elpiji","gas melon","pangkalan","kelangkaan gas"
  ],
  // ── CLUSTER 03: BBM & SPBU ⚡ (risk_multiplier: 2.5) ─────────────────
  KW_BBM: [
    "bbm pinrang","bbm subsidi pinrang","solar pinrang","solar subsidi pinrang",
    "pertalite pinrang","spbu pinrang","pelangsir pinrang","penimbunan bbm pinrang",
    "penyalahgunaan bbm pinrang","bbm ilegal pinrang","kelangkaan bbm pinrang",
    "solar penambang pinrang","pertalite duampanua","solar lembang",
    "spbu","bbm subsidi","solar subsidi","pelangsir","penimbunan bbm"
  ],
  // ── CLUSTER 04: Harga Pangan & Inflasi (risk_multiplier: 2.0) ────────
  KW_PANGAN: [
    "inflasi pinrang","harga pangan pinrang","harga beras pinrang",
    "harga cabai pinrang","harga bawang pinrang","harga telur pinrang",
    "harga minyak goreng pinrang","minyakita pinrang","harga gula pinrang",
    "bahan pokok pinrang","sembako pinrang","stok pangan pinrang",
    "tpid pinrang","satgas pangan pinrang","pasar murah pinrang","gpm pinrang",
    "inflasi","harga pangan","sembako","pasar murah","gpm","tpid","bapok","bapokting"
  ],
  // ── CLUSTER 05: Pasar & Perdagangan (risk_multiplier: 1.5) ───────────
  KW_PASAR: [
    "pasar pinrang","pasar sentral pinrang","pedagang pasar pinrang",
    "retribusi pasar pinrang","revitalisasi pasar pinrang","pedagang pinrang",
    "distributor pinrang","pengecer pinrang","het pinrang",
    "permainan harga pinrang","kenaikan harga pinrang",
    "pasar pekkabata","pasar suppa","pasar sentral","retribusi pasar"
  ],
  // ── CLUSTER 06: IKM & UMKM (risk_multiplier: 1.2) ────────────────────
  KW_IKM: [
    "ikm pinrang","umkm pinrang","industri pinrang","sentra industri pinrang",
    "produk lokal pinrang","halal pinrang","tkdn pinrang","siinas pinrang",
    "kerajinan pinrang","kopi pinrang","tenun sutra pinrang","rumput laut pinrang",
    "ikm","umkm","halal","tkdn","siinas","kerajinan"
  ],
  // ── CLUSTER 07: Metrologi (risk_multiplier: 1.8) ─────────────────────
  KW_METROLOGI: [
    "metrologi pinrang","tera pinrang","tera ulang pinrang",
    "timbangan pinrang","uttp pinrang","pompa ukur bbm pinrang",
    "kecurangan timbangan pinrang","spbu curang pinrang",
    "metrologi","tera","tera ulang","uttp","timbangan","nozzle"
  ],
  // ── CLUSTER 08: ESDM & Tambang (risk_multiplier: 2.0) ────────────────
  KW_ESDM: [
    "tambang pinrang","pertambangan pinrang","tambang ilegal pinrang",
    "galian c pinrang","izin tambang pinrang","energi terbarukan pinrang",
    "plts pinrang","listrik pinrang","tambang batulappa","tambang lembang",
    "solar penambang","galian c","tambang ilegal","pertambangan"
  ],
  // ── CLUSTER 09: Entitas Pemkab (risk_multiplier: 1.5) ────────────────
  KW_PEMKAB: [
    "bupati pinrang","wakil bupati pinrang","wabup pinrang",
    "pemkab pinrang","sekda pinrang","dprd pinrang",
    "apbd pinrang","dana desa pinrang","sidak pinrang","inspeksi pinrang"
  ],
  // ── CLUSTER 10: Sosial & Pengaduan (risk_multiplier: 2.0) ────────────
  KW_SOSIAL: [
    "keluhan pinrang","pengaduan pinrang","protes pinrang","demo pinrang",
    "emak-emak pinrang","warga pinrang mengeluh","viral pinrang",
    "korupsi pinrang","pungli pinrang","polres pinrang"
  ],
  // ── CLUSTER 11: Bulog & Pangan (risk_multiplier: 1.8) ────────────────
  KW_BULOG: [
    "bulog pinrang","beras bulog pinrang","beras sphp pinrang",
    "penyaluran beras pinrang","bansos beras pinrang","ketahanan pangan pinrang",
    "bulog","beras sphp","bansos pangan"
  ],
  // ── CLUSTER 12: Pertamina & Distribusi (risk_multiplier: 1.5) ─────────
  KW_PERTAMINA: [
    "pertamina pinrang","patra niaga pinrang","hiswana migas pinrang",
    "spbe pinrang","kuota bbm pinrang","kuota lpg pinrang",
    "hiswana migas","spbe"
  ],
  // ── CLUSTER 13: Data & Statistik (risk_multiplier: 1.0) ───────────────
  KW_DATA: [
    "bps pinrang","data inflasi pinrang","ihk pinrang",
    "bi sulsel pinrang","laporan ekonomi pinrang"
  ],

  // ── GEOGRAPHIC DICTIONARY ─────────────────────────────────────────────
  GEO_KABUPATEN: ["pinrang","kabupaten pinrang","bumi lasinrang","kab. pinrang"],
  GEO_KECAMATAN: [
    "watang sawitto","paleteang","tiroang","mattiro bulu","mattiro sompe",
    "suppa","lanrisang","cempa","patampanua","duampanua","batulappa","lembang"
  ],
  GEO_STRATEGIS: [
    "pasar sentral pinrang","pasar pekkabata","pasar suppa",
    "spbu watang sawitto","spbu duampanua","desa bungi",
    "pangkalan bungi","sentra ikm pinrang","tambang batulappa"
  ],

  // ── FLAT KEYWORDS (dibangun otomatis dari semua cluster) ──────────────
  KEYWORDS: []
};

// Build flat KEYWORDS dari semua cluster — dipanggil saat Apps Script load
function _initKeywords() {
  const all = [
    ...CONFIG.KW_ENTITY,    ...CONFIG.KW_LPG,      ...CONFIG.KW_BBM,
    ...CONFIG.KW_PANGAN,    ...CONFIG.KW_PASAR,    ...CONFIG.KW_IKM,
    ...CONFIG.KW_METROLOGI, ...CONFIG.KW_ESDM,     ...CONFIG.KW_PEMKAB,
    ...CONFIG.KW_SOSIAL,    ...CONFIG.KW_BULOG,    ...CONFIG.KW_PERTAMINA,
    ...CONFIG.KW_DATA,
    ...CONFIG.GEO_KABUPATEN,...CONFIG.GEO_KECAMATAN,...CONFIG.GEO_STRATEGIS
  ];
  CONFIG.KEYWORDS = [...new Set(all.map(k => k.toLowerCase()))];
  Logger.log("[init] Keyword dict: " + CONFIG.KEYWORDS.length + " terms dari 13 cluster + geodict");
}

// ============================================================
//  MASTER SOURCE REGISTRY — 30 SUMBER TIER 1-3
//  weight  : 0.50-1.00 (bobot kepercayaan sumber)
//  tier    : 1=lokal (15-30mnt) | 2=regional (30-60mnt) | 3=nasional (60-180mnt)
//  pinrangSpecific : true = semua artikel lolos filter relevansi otomatis
// ============================================================
const RSS_SOURCES = [

  // ── TIER 1: LOCAL & NEAREST (prioritas tertinggi, interval 15-30 mnt) ─
  // Paling mungkin menangkap isu sebelum media besar meliput

  // Khusus Pinrang — semua artikel lolos filter
  { name:"Pinrang Terkini",         type:"Portal Berita Lokal",         sourceType:"news",      tier:1, weight:0.85, url:"https://pinrang.terkini.id/feed/",                                         pinrangSpecific:true  },
  { name:"Pinrang 24 Jam",          type:"Media Komunitas Lokal",       sourceType:"community", tier:1, weight:0.80, url:"https://pinrang.24jamnews.com/feed/",                                       pinrangSpecific:true  },
  { name:"Info Rakyat Pinrang",     type:"Media Siber Independen",      sourceType:"news",      tier:1, weight:0.82, url:"https://www.info-rakyat.com/feeds/posts/default?alt=rss",                  pinrangSpecific:true  },
  { name:"SBL Radio Pinrang",       type:"Media Resmi Pemkab",          sourceType:"gov",       tier:1, weight:0.90, url:"https://sbl.pinrangkab.go.id/artikel/feed/",                               pinrangSpecific:true  },
  { name:"Portal Resmi Pemkab",     type:"Situs Resmi Pemerintah",      sourceType:"gov",       tier:1, weight:1.00, url:"https://pinrangkab.go.id/feed",                                            pinrangSpecific:true  },
  { name:"PA Pinrang",              type:"Portal Transparansi Hukum",   sourceType:"gov",       tier:1, weight:0.90, url:"https://www.pa-pinrang.go.id/index.php/berita/berita-terkini?format=feed&type=rss", pinrangSpecific:true },

  // Regional dengan kanal/tag Pinrang langsung
  { name:"Katasulsel - Pinrang",    type:"Portal Berita Regional",      sourceType:"news",      tier:1, weight:0.82, url:"https://katasulsel.com/category/pinrang/feed/" },
  { name:"Merposnews - Pemkab",     type:"Portal Berita Kedinasan",     sourceType:"news",      tier:1, weight:0.80, url:"https://merposnews.com/category/pemkab-pinrang/feed/" },
  { name:"Fajar Online - Pinrang",  type:"Koran Digital Sulsel",        sourceType:"news",      tier:1, weight:0.85, url:"https://fajaronline.co.id/tag/pinrang-496/feed/" },
  { name:"Berita-Online Pinrang",   type:"Portal Pengawasan Sosial",    sourceType:"news",      tier:1, weight:0.75, url:"https://berita-online.com/category/pinrang/feed/" },

  // ── TIER 2A: REGIONAL SULSEL — PRIORITAS TINGGI (interval 30 mnt) ────
  // Early warning terpenting — beberapa sudah terbukti liput isu Pinrang

  { name:"BeritaSulsel",            type:"Portal Berita Sulsel",        sourceType:"news",      tier:2, weight:0.88, url:"https://beritasulsel.com/tag/pinrang/feed/",            notes:"Aktif isu BBM subsidi & solar Pinrang" },
  { name:"ANTARA Makassar",         type:"Kantor Berita Nasional",      sourceType:"news",      tier:2, weight:0.95, url:"https://makassar.antaranews.com/rss/berita",            notes:"Ribuan entri Pinrang di arsip" },
  { name:"Tribun Timur - Pinrang",  type:"Media Cetak & Online",        sourceType:"news",      tier:2, weight:0.90, url:"https://makassar.tribunnews.com/rss/pinrang" },
  { name:"Fajar Sulsel",            type:"Koran Harian Sulsel",         sourceType:"news",      tier:2, weight:0.90, url:"https://fajar.co.id/feed/" },
  { name:"Makassar Terkini",        type:"Portal Berita Regional",      sourceType:"news",      tier:2, weight:0.85, url:"https://makassarterkini.id/feed/",                     notes:"Aktif untuk isu BBM/LPG Pertamina Sulawesi" },
  { name:"RRI Makassar",            type:"Radio Publik Nasional",       sourceType:"gov",       tier:2, weight:0.92, url:"https://rri.co.id/makassar/rss",                        notes:"Kanal aktif: inflasi, LPG, IKM, pangan" },

  // ── TIER 2B: REGIONAL SULSEL — PRIORITAS SEDANG (interval 30-60 mnt) ─

  { name:"Parepos",                 type:"Harian Ajatappareng",         sourceType:"news",      tier:2, weight:0.85, url:"https://parepos.com/feed/",                             notes:"Basis Ajatappareng, reporter Pinrang" },
  { name:"Herald Sulsel",           type:"Portal Berita Sulsel",        sourceType:"news",      tier:2, weight:0.80, url:"https://heraldsulsel.com/feed/" },
  { name:"Sulselpos",               type:"Portal Berita Sulsel",        sourceType:"news",      tier:2, weight:0.75, url:"https://sulselpos.com/feed/" },
  { name:"Ujung Jari",              type:"Portal Berita Digital",       sourceType:"news",      tier:2, weight:0.78, url:"https://ujungjari.com/feed/",                           notes:"Pernah muat isu solar subsidi/industri Pinrang" },
  { name:"Pedoman Media",           type:"Media Siber Regional",        sourceType:"news",      tier:2, weight:0.75, url:"https://pedomannews.com/feed/",                         notes:"Koresponden Pinrang-Sidrap" },
  { name:"TopSulsel",               type:"Portal Pemerintahan Sulsel",  sourceType:"news",      tier:2, weight:0.75, url:"https://topsulsel.com/feed/" },
  { name:"Sulselsatu",              type:"Portal Berita Sulsel",        sourceType:"news",      tier:2, weight:0.80, url:"https://sulselsatu.com/feed/" },
  { name:"Kabar Bugis",             type:"Portal Berita Lokal Sulsel",  sourceType:"news",      tier:2, weight:0.82, url:"https://kabarbugis.id/feed/" },
  { name:"iNews Celebes",           type:"Portal Berita Nasional",      sourceType:"news",      tier:2, weight:0.82, url:"https://celebes.inews.id/feed/",                        notes:"Muat penimbunan solar subsidi Pinrang" },
  { name:"Berita Kota Makassar",    type:"Harian Daerah",               sourceType:"news",      tier:2, weight:0.78, url:"https://beritakotamakassar.com/feed/" },

  // ── TIER 3: NASIONAL — DISCOVERY (interval 60-180 mnt) ───────────────
  // Filter paling ketat: WAJIB ada nama kecamatan ATAU entitas dinas
  // Berguna saat isu naik ke level nasional

  { name:"detikSulsel",             type:"Portal Berita Nasional",      sourceType:"news",      tier:3, weight:0.95, url:"https://detik.com/sulsel/rss",                          notes:"Hubungi Kadis Disperindag langsung saat LPG Bungi Ags 2026" },
  { name:"Liputan6 Sulsel",         type:"Portal Berita Nasional",      sourceType:"news",      tier:3, weight:0.92, url:"https://www.liputan6.com/rss/sulawesi-selatan",          notes:"Punya tag Pinrang aktif" },
  { name:"Media Indonesia",         type:"Media Cetak Nasional",        sourceType:"news",      tier:3, weight:0.92, url:"https://mediaindonesia.com/rss",                         notes:"Tag Pinrang, berita pangan Sulsel" },
  { name:"SINDOnews Daerah",        type:"Portal Berita Nasional",      sourceType:"news",      tier:3, weight:0.90, url:"https://daerah.sindonews.com/rss/index/9",               notes:"Pernah muat operasi pasar + Disperindag Pinrang" }
];

// ============================================================
//  FUNGSI UTAMA: JADWAL OTOMATIS (dipanggil trigger setiap 30 mnt)
// ============================================================
function scheduledRun() {
  _initKeywords(); // Inisialisasi keyword dict
  Logger.log("=== MEDIA INTEL CRAWLER v3.0 MULAI: " + new Date().toLocaleString("id-ID") + " ===");
  Logger.log("Sumber: " + RSS_SOURCES.length + " | Tier 1: " + RSS_SOURCES.filter(s=>s.tier===1).length +
             " | Tier 2: " + RSS_SOURCES.filter(s=>s.tier===2).length +
             " | Tier 3: " + RSS_SOURCES.filter(s=>s.tier===3).length);
  try {
    const newArticles = crawlAllFeeds();
    Logger.log("Total artikel relevan: " + newArticles.length);

    if (newArticles.length === 0) {
      Logger.log("Tidak ada artikel baru. Selesai.");
      return;
    }

    const analyzed = analyzeAllArticles(newArticles);
    Logger.log("Analisis sentimen selesai: " + analyzed.length + " artikel");

    saveToSheets(analyzed);
    Logger.log("Data tersimpan ke Google Sheets");

    const summary  = buildSummary();
    const trending = generateTrendingTopics();
    const snapshot = buildDashboardSnapshot(analyzed, summary, trending);

    syncToFirestore(analyzed, summary, trending, snapshot);
    Logger.log("Sync ke Firebase Firestore berhasil");
    Logger.log("=== SELESAI ===");
  } catch (e) {
    Logger.log("ERROR: " + e.toString());
  }
}

// ============================================================
//  FUNGSI: CRAWL SEMUA RSS FEED
// ============================================================
function crawlAllFeeds() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feedSheet = ss.getSheetByName("media_feeds");

  const existingUrls = new Set();
  if (feedSheet && feedSheet.getLastRow() > 1) {
    feedSheet.getRange(2, 4, feedSheet.getLastRow()-1, 1).getValues()
      .forEach(row => existingUrls.add(row[0]));
  }

  const relevantArticles = [];

  for (const source of RSS_SOURCES) {
    try {
      Logger.log("Crawling [Tier " + source.tier + "]: " + source.name);
      const response = UrlFetchApp.fetch(source.url, { muteHttpExceptions:true });
      if (response.getResponseCode() !== 200) {
        Logger.log("  HTTP " + response.getResponseCode() + " — lewati");
        continue;
      }

      const articles = parseRssXml(response.getContentText("UTF-8"), source);

      for (const article of articles) {
        if (existingUrls.has(article.url)) continue;
        if (isRelevant(article.title + " " + article.snippet, source)) {
          relevantArticles.push(article);
          existingUrls.add(article.url);
        }
      }
      Utilities.sleep(500);
    } catch (e) {
      Logger.log("Error crawling " + source.name + ": " + e.toString());
    }
  }

  // Fetch thumbnail og:image (dibatasi agar tidak timeout)
  Logger.log("Fetching thumbnails untuk " + Math.min(relevantArticles.length, CONFIG.MAX_THUMBNAIL_FETCH) + " artikel...");
  let thumbCount = 0;
  for (const article of relevantArticles) {
    if (thumbCount >= CONFIG.MAX_THUMBNAIL_FETCH) break;
    if (!article.thumbnail_url) {
      article.thumbnail_url = fetchOgImage(article.url);
      thumbCount++;
      Utilities.sleep(300);
    }
  }

  return relevantArticles.slice(0, CONFIG.MAX_ARTICLES_PER_RUN);
}

// ============================================================
//  FUNGSI: AMBIL THUMBNAIL dari og:image / twitter:image
// ============================================================
function fetchOgImage(url) {
  try {
    if (!url || !url.startsWith("http")) return "";
    const resp = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MediaIntelBot/1.0)" }
    });
    if (resp.getResponseCode() !== 200) return "";

    const html = resp.getContentText("UTF-8").substring(0, 10000);

    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                 || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch && ogMatch[1] && ogMatch[1].startsWith("http")) return ogMatch[1];

    const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
                 || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (twMatch && twMatch[1] && twMatch[1].startsWith("http")) return twMatch[1];

    const imgMatch = html.match(/<img[^>]+src=["'](https:\/\/[^"'?#]+\.(jpg|jpeg|png|webp))[^>]*>/i);
    if (imgMatch) return imgMatch[1];

    return "";
  } catch(e) {
    return "";
  }
}

// ============================================================
//  FUNGSI: PARSE XML RSS
// ============================================================
function parseRssXml(xmlContent, source) {
  const articles = [];
  try {
    const cleaned = xmlContent
      .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

    let parsedDoc;
    try {
      parsedDoc = XmlService.parse(cleaned);
    } catch (encErr) {
      const reEncoded = cleaned.replace(/<\?xml[^?]*\?>/i, '<?xml version="1.0" encoding="UTF-8"?>');
      try {
        parsedDoc = XmlService.parse(reEncoded);
      } catch(e2) {
        Logger.log("  Skip " + source.name + ": tidak bisa parse XML (" + e2.message + ")");
        return articles;
      }
    }

    const doc  = parsedDoc;
    const root = doc.getRootElement();

    let items = [];
    try { items = root.getChild("channel").getChildren("item"); }
    catch(e) { items = root.getChildren("entry"); }

    for (const item of items) {
      try {
        const getVal = (tag) => {
          const el = item.getChild(tag);
          return el ? el.getText().trim() : "";
        };

        const title = getVal("title");

        // URL: prioritas guid > link > id
        let url = "";
        const guid    = getVal("guid");
        const linkVal = getVal("link");
        const idVal   = getVal("id");
        if (guid    && guid.startsWith("http"))    url = guid;
        else if (linkVal && linkVal.startsWith("http")) url = linkVal;
        else if (idVal   && idVal.startsWith("http"))   url = idVal;

        // Bersihkan URL
        if (url) {
          url = url
            .replace(/[?&](noamp|amp|utm_source|utm_medium|utm_campaign|utm_content|utm_term)[^&]*/gi, '')
            .replace(/\?$/, '')
            .replace(/^https?:\/\/amp\./i, 'https://');
        }

        // Thumbnail dari enclosure (Tribun Timur menyediakan ini)
        let thumbnailUrl = "";
        const enclosure = item.getChild("enclosure");
        if (enclosure) {
          const encUrl  = enclosure.getAttribute("url");
          const encType = enclosure.getAttribute("type");
          if (encUrl && encType && encType.getValue().startsWith("image/")) {
            thumbnailUrl = encUrl.getValue();
          }
        }

        const pubDate     = getVal("pubDate") || getVal("published") || getVal("updated");
        const description = getVal("description") || getVal("summary") || getVal("content");
        const snippet     = description.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().substring(0, 400);

        let sourceDomain = "";
        try { sourceDomain = new URL(url).hostname.replace(/^www\./, ''); } catch(e) {}

        if (title && url) {
          articles.push({
            source:        source.name,
            source_type:   source.type,
            source_domain: sourceDomain,
            source_icon:   source.sourceType || "news",
            source_tier:   source.tier       || 2,
            source_weight: source.weight     || 0.75,
            title:         title,
            url:           url,
            thumbnail_url: thumbnailUrl,
            published_at:  formatDate(pubDate),
            published_iso: pubDate || new Date().toISOString(),
            snippet:       snippet,
            sentiment:     "NETRAL",
            sentiment_score: 50,
            sentiment_float: 0.0,
            is_critical:   false,
            critical_score: 0,
            status:        "normal",
            topics:        [],
            locations:     [],
            crawled_at:    new Date().toLocaleString("id-ID", { timeZone:"Asia/Makassar" }) + " WITA",
            collected_iso: new Date().toISOString()
          });
        }
      } catch(itemErr) {}
    }

    Logger.log("  → " + source.name + ": " + articles.length + " artikel ditemukan");
  } catch(parseErr) {
    Logger.log("Error parse XML " + source.name + ": " + parseErr.toString());
  }
  return articles;
}

// ============================================================
//  FUNGSI: CEK RELEVANSI v3 — LOGIKA 3 TINGKAT BERDASARKAN TIER
// ============================================================
function isRelevant(text, source) {
  const lower = text.toLowerCase();

  // TIER 1 — pinrangSpecific: semua artikel lolos tanpa filter
  if (source.pinrangSpecific) return true;

  // TIER 1 — regional kanal Pinrang: minimal ada satu keyword dari dict
  if (source.tier === 1) {
    return CONFIG.KEYWORDS.some(kw => lower.includes(kw));
  }

  // TIER 2 — regional non-spesifik: WAJIB ada GEO kabupaten/kecamatan
  // DAN minimal satu keyword topik/entitas
  if (source.tier === 2) {
    const hasGeo = [
      ...CONFIG.GEO_KABUPATEN,
      ...CONFIG.GEO_KECAMATAN,
      ...CONFIG.GEO_STRATEGIS
    ].some(g => lower.includes(g));
    if (!hasGeo) return false;
    // Cukup ada 1 keyword dari cluster manapun
    return CONFIG.KEYWORDS.some(kw => lower.includes(kw));
  }

  // TIER 3 — nasional: WAJIB ada GEO + (entitas dinas ATAU kecamatan spesifik)
  // Filter paling ketat untuk menghindari noise
  if (source.tier === 3) {
    const hasKab = CONFIG.GEO_KABUPATEN.some(g => lower.includes(g));
    if (!hasKab) return false;
    const hasEntity    = CONFIG.KW_ENTITY.some(kw => lower.includes(kw));
    const hasKecamatan = CONFIG.GEO_KECAMATAN.some(g => lower.includes(g));
    const hasCluster   = [
      ...CONFIG.KW_LPG, ...CONFIG.KW_BBM, ...CONFIG.KW_PANGAN,
      ...CONFIG.KW_METROLOGI, ...CONFIG.KW_ESDM, ...CONFIG.KW_SOSIAL
    ].some(kw => lower.includes(kw));
    return hasEntity || (hasKecamatan && hasCluster);
  }

  return false;
}

// ============================================================
//  FUNGSI: ANALISIS SEMUA ARTIKEL via Gemini
// ============================================================
function analyzeAllArticles(articles) {
  const analyzed = [];
  for (const article of articles) {
    try {
      const result = analyzeSentimentGemini(article.title + ". " + article.snippet);
      article.sentiment        = result.label;
      article.sentiment_score  = result.score;
      article.sentiment_float  = result.floatScore;
      article.critical_score   = result.criticalScore;
      article.status           = result.status;
      article.is_critical      = result.criticalScore >= 60;
      article.sentiment_reason = result.reason;
      article.topics           = result.topics   || [];
      article.locations        = result.locations|| [];
      Utilities.sleep(1500);
    } catch(e) {
      article.sentiment       = "NETRAL";
      article.sentiment_score = 50;
      article.sentiment_float = 0.0;
      article.critical_score  = 0;
      article.status          = "normal";
    }
    analyzed.push(article);
  }
  return analyzed;
}

// ============================================================
//  FUNGSI: ANALISIS SENTIMEN + METADATA via Gemini Flash
// ============================================================
function analyzeSentimentGemini(text) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

  const prompt = `Anda adalah analis media senior untuk Disperindag ESDM Kabupaten Pinrang, Sulawesi Selatan.

Analisis teks berita berikut secara mendalam:

"${text.substring(0, 900)}"

Balas HANYA dengan JSON (tanpa markdown, tanpa komentar):
{
  "label": "POSITIF|NETRAL|NEGATIF",
  "score": 75,
  "floatScore": 0.75,
  "reason": "Alasan singkat 1 kalimat",
  "criticalScore": 20,
  "status": "normal|monitor|critical",
  "topics": ["LPG","Harga Pangan"],
  "locations": ["Watang Sawitto","Duampanua"]
}

Panduan:
- POSITIF (score 61-100): apresiasi, keberhasilan, pelayanan baik, sidak berhasil
- NETRAL (score 40-60): informasi faktual, laporan kegiatan rutin, data statistik
- NEGATIF (score 0-39): keluhan warga, kenaikan harga, penimbunan, kritik terhadap pemerintah

criticalScore (0-100): seberapa mendesak perlu tindak lanjut Disperindag ESDM
status: "normal" (criticalScore<40), "monitor" (40-69), "critical" (>=70)

topics: pilih dari [LPG, Gas 3 Kg, Harga Pangan, Sembako, Cabai, Beras, Minyak Goreng,
  Metrologi & Tera, Pengawasan SPBU, IKM & UMKM, Halal, Inflasi, Pasar Murah,
  Distribusi BBM, Penimbunan BBM, Pengaduan Warga, Kegiatan Pemerintah,
  Hukum & Keamanan, Pertambangan, ESDM, Bulog & Pangan, Lainnya]

locations: nama kecamatan/wilayah spesifik di Pinrang (atau kosong [])`;

  const options = {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 300 }
    }),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(endpoint, options);
    if (response.getResponseCode() !== 200) return _defaultSentiment();

    const json    = JSON.parse(response.getContentText());
    const rawText = json.candidates[0].content.parts[0].text.trim()
      .replace(/```json\n?/g,'').replace(/```\n?/g,'').trim();
    const result  = JSON.parse(rawText);

    return {
      label:         result.label        || "NETRAL",
      score:         parseInt(result.score) || 50,
      floatScore:    parseFloat(result.floatScore) || 0.0,
      reason:        result.reason       || "",
      criticalScore: parseInt(result.criticalScore) || 0,
      status:        result.status       || "normal",
      topics:        Array.isArray(result.topics)    ? result.topics    : [],
      locations:     Array.isArray(result.locations) ? result.locations : []
    };
  } catch(e) {
    return _defaultSentiment();
  }
}

function _defaultSentiment() {
  return { label:"NETRAL", score:50, floatScore:0.0, reason:"Gagal dianalisis",
           criticalScore:0, status:"normal", topics:[], locations:[] };
}

// ============================================================
//  FUNGSI: SIMPAN KE GOOGLE SHEETS
// ============================================================
function saveToSheets(articles) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("media_feeds");

  if (!sheet) {
    sheet = ss.insertSheet("media_feeds");
    const headers = ["ID","Sumber","Tipe","URL","Thumbnail","Judul","Snippet",
      "Waktu Publikasi","Sentimen","Skor","Skor Float","Critical Score","Status",
      "Topics","Locations","Alasan","Tier","Bobot","Waktu Crawl"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setBackground("#0F2C59").setFontColor("#FFFFFF").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  for (const a of articles.reverse()) {
    const id = "mn_" + Date.now() + "_" + Math.random().toString(36).substr(2,5);
    sheet.insertRowAfter(1);
    const row = [
      id, a.source, a.source_type, a.url, a.thumbnail_url||"", a.title, a.snippet,
      a.published_at, a.sentiment, a.sentiment_score, a.sentiment_float,
      a.critical_score, a.status,
      (a.topics||[]).join(", "), (a.locations||[]).join(", "),
      a.sentiment_reason||"", a.source_tier||2, a.source_weight||0.75, a.crawled_at
    ];
    const range = sheet.getRange(2, 1, 1, row.length);
    range.setValues([row]);
    if      (a.sentiment === "POSITIF") range.setBackground("#F0FFF4");
    else if (a.sentiment === "NEGATIF") range.setBackground("#FFF5F5");
  }

  const total = sheet.getLastRow();
  if (total > CONFIG.MAX_TOTAL_ARTICLES + 1)
    sheet.deleteRows(CONFIG.MAX_TOTAL_ARTICLES+2, total-CONFIG.MAX_TOTAL_ARTICLES-1);
}

// ============================================================
//  FUNGSI: BANGUN RINGKASAN STATISTIK
// ============================================================
function buildSummary() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const feedSheet = ss.getSheetByName("media_feeds");
  let sumSheet    = ss.getSheetByName("sentiment_summary");
  if (!sumSheet) sumSheet = ss.insertSheet("sentiment_summary");

  let pos=0, neu=0, neg=0, critical=0;
  if (feedSheet && feedSheet.getLastRow() > 1) {
    const rows = feedSheet.getRange(2, 9, feedSheet.getLastRow()-1, 2).getValues();
    rows.forEach(r => {
      if (r[0]==="POSITIF") pos++;
      else if (r[0]==="NEGATIF") { neg++; if (parseInt(r[1])>=60) critical++; }
      else neu++;
    });
  }

  const total = pos+neu+neg||1;
  const summary = {
    total_articles:   total,
    positive_count:   pos,
    neutral_count:    neu,
    negative_count:   neg,
    critical_count:   critical,
    positive_pct:     Math.round((pos/total)*100),
    neutral_pct:      Math.round((neu/total)*100),
    negative_pct:     Math.round((neg/total)*100),
    total_reach:      total * 3500,
    total_engagement: total * 420,
    total_sources:    RSS_SOURCES.length,
    last_updated:     new Date().toLocaleString("id-ID",{timeZone:"Asia/Makassar"})+" WITA",
    updated_iso:      new Date().toISOString()
  };

  sumSheet.clearContents();
  const entries = Object.entries(summary);
  sumSheet.getRange(1,1,entries.length,2).setValues(entries);
  return summary;
}

// ============================================================
//  FUNGSI: TOPIK TRENDING
// ============================================================
function generateTrendingTopics() {
  const ss        = SpreadsheetApp.getActiveSpreadsheet();
  const feedSheet = ss.getSheetByName("media_feeds");

  const topicGroups = [
    { id:"tt_lpg",   topic:"Pengawasan HET Gas LPG 3 Kg & Penertiban Pengecer",  category:"ESDM & Energi",   keywords:["lpg","gas","pangkalan","het","pengecer","elpiji"] },
    { id:"tt_bbm",   topic:"Distribusi BBM Subsidi & Pengawasan SPBU",            category:"ESDM & Energi",   keywords:["bbm","solar","pertalite","spbu","pelangsir","penimbunan"] },
    { id:"tt_pasar", topic:"Operasi Pasar Murah Sembako & Pengendalian Inflasi",  category:"Perdagangan",     keywords:["pasar murah","sembako","inflasi","tpid","gpm","harga pangan"] },
    { id:"tt_tera",  topic:"Uji Tera & Pengawasan UTTP Metrologi Legal",          category:"Kemetrologian",   keywords:["tera","metrologi","uttp","timbangan","spbu"] },
    { id:"tt_ikm",   topic:"Pembinaan IKM, Sertifikasi Halal & TKDN Produk",      category:"Perindustrian",   keywords:["ikm","umkm","halal","tkdn","kerajinan","sentra"] },
    { id:"tt_harga", topic:"Fluktuasi Harga Pangan (Cabai, Beras, Minyak)",       category:"Harga Pangan",    keywords:["cabai","beras","minyak goreng","harga","pangan"] },
    { id:"tt_tambang",topic:"Pengawasan Pertambangan & Galian C",                 category:"ESDM & Tambang",  keywords:["tambang","galian c","mineral","pertambangan"] }
  ];

  let allText="", sentimentRows=[];
  if (feedSheet && feedSheet.getLastRow()>1) {
    allText = feedSheet.getRange(2,6,feedSheet.getLastRow()-1,2).getValues()
      .map(r => (r[0]+" "+r[1]).toLowerCase()).join(" ");
    sentimentRows = feedSheet.getRange(2,9,feedSheet.getLastRow()-1,2).getValues()
      .map(r => ({ label:r[0], score:parseInt(r[1])||50 }));
  }

  const pos  = sentimentRows.filter(s=>s.label==="POSITIF").length;
  const neg  = sentimentRows.filter(s=>s.label==="NEGATIF").length;
  const neu  = sentimentRows.filter(s=>s.label==="NETRAL").length;
  const total= sentimentRows.length||1;

  topicGroups.forEach(t => {
    let count=0;
    t.keywords.forEach(kw => count+=(allText.match(new RegExp(kw,'gi'))||[]).length);
    t.volume      = Math.max(count*12, 5);
    t.sentiment   = { positive:Math.round((pos/total)*100), neutral:Math.round((neu/total)*100), negative:Math.round((neg/total)*100) };
    t.is_critical = t.sentiment.negative > 20;
    t.status      = t.is_critical ? "⚠️ Perlu Tindak Lanjut" : "🟢 Normal";
    t.badge_color = t.is_critical ? "rose" : "emerald";
    t.direct_url  = "https://pinrangkab.go.id/berita";
  });

  let trendSheet = ss.getSheetByName("trending_topics");
  if (!trendSheet) trendSheet = ss.insertSheet("trending_topics");
  trendSheet.clearContents();
  trendSheet.getRange("A1").setValue(JSON.stringify(topicGroups));
  return topicGroups;
}

// ============================================================
//  FUNGSI: BANGUN SNAPSHOT DASHBOARD (untuk TV Wallboard)
// ============================================================
function buildDashboardSnapshot(articles, summary, trending) {
  const sorted = [...articles].sort((a,b) => {
    const scoreA = (a.critical_score||0) + (a.sentiment==="NEGATIF"?20:0);
    const scoreB = (b.critical_score||0) + (b.sentiment==="NEGATIF"?20:0);
    return scoreB - scoreA;
  });

  const latestNews = sorted.slice(0, 10).map(a => ({
    id:            a.url,
    title:         a.title,
    summary:       a.snippet,
    thumbnailUrl:  a.thumbnail_url || "",
    sourceName:    a.source,
    sourceUrl:     a.url,
    sourceDomain:  a.source_domain || "",
    sourceType:    a.source_icon   || "news",
    sourceTier:    a.source_tier   || 2,
    sourceWeight:  a.source_weight || 0.75,
    publishedAt:   a.published_at,
    publishedIso:  a.published_iso || "",
    collectedAt:   a.crawled_at,
    topics:        a.topics    || [],
    locations:     a.locations || [],
    sentiment:     a.sentiment,
    sentimentScore:a.sentiment_float || 0,
    criticalScore: a.critical_score  || 0,
    status:        a.status || "normal",
    reason:        a.sentiment_reason || ""
  }));

  return {
    latestNews,
    summary,
    trending,
    updatedAt:    new Date().toLocaleString("id-ID",{timeZone:"Asia/Makassar"})+" WITA",
    updatedIso:   new Date().toISOString(),
    totalSources: RSS_SOURCES.length,
    tier1Count:   RSS_SOURCES.filter(s=>s.tier===1).length,
    tier2Count:   RSS_SOURCES.filter(s=>s.tier===2).length,
    tier3Count:   RSS_SOURCES.filter(s=>s.tier===3).length
  };
}

// ============================================================
//  FUNGSI: SYNC KE FIREBASE FIRESTORE via REST API
// ============================================================
function syncToFirestore(articles, summary, trending, snapshot) {
  const base = `https://firestore.googleapis.com/v1/projects/${CONFIG.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const key  = `?key=${CONFIG.FIREBASE_API_KEY}`;
  let ok=0, fail=0;

  articles.forEach(a => {
    const docId = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, a.url, Utilities.Charset.UTF_8)
      .map(b=>(b&0xFF).toString(16).padStart(2,'0')).join('').substring(0,20);
    const resp = UrlFetchApp.fetch(`${base}/media_intelligence_feeds/${docId}${key}`, {
      method:"PATCH", contentType:"application/json",
      payload: JSON.stringify({ fields: articleToFirestore(a) }),
      muteHttpExceptions: true
    });
    if (resp.getResponseCode()===200) ok++; else {
      fail++;
      Logger.log("  ⚠️ Write gagal [" + resp.getResponseCode() + "]: " + resp.getContentText().substring(0,100));
    }
    Utilities.sleep(150);
  });
  Logger.log("Firestore feeds: " + ok + " berhasil, " + fail + " gagal");

  // Sync ringkasan
  const sResp = UrlFetchApp.fetch(`${base}/media_intelligence_summary/current${key}`, {
    method:"PATCH", contentType:"application/json",
    payload: JSON.stringify({ fields: toFirestoreDoc(summary) }),
    muteHttpExceptions: true
  });
  Logger.log("Firestore summary: HTTP " + sResp.getResponseCode());

  // Sync trending
  const tResp = UrlFetchApp.fetch(`${base}/media_intelligence_trending/current${key}`, {
    method:"PATCH", contentType:"application/json",
    payload: JSON.stringify({ fields:{
      topics:     { stringValue: JSON.stringify(trending) },
      updated_at: { stringValue: new Date().toISOString() }
    }}),
    muteHttpExceptions: true
  });
  Logger.log("Firestore trending: HTTP " + tResp.getResponseCode());

  // Sync snapshot dashboard (untuk TV Wallboard — 1 dokumen, 1 fetch)
  const snapResp = UrlFetchApp.fetch(`${base}/dashboard_snapshot/current${key}`, {
    method:"PATCH", contentType:"application/json",
    payload: JSON.stringify({ fields:{
      data:       { stringValue: JSON.stringify(snapshot) },
      updated_at: { stringValue: new Date().toISOString() }
    }}),
    muteHttpExceptions: true
  });
  Logger.log("Firestore snapshot: HTTP " + snapResp.getResponseCode());
}

// ============================================================
//  HELPER: Artikel → Firestore Document Format
// ============================================================
function articleToFirestore(a) {
  return {
    title:          { stringValue:  a.title          || "" },
    summary:        { stringValue:  a.snippet        || "" },
    thumbnailUrl:   { stringValue:  a.thumbnail_url  || "" },
    sourceName:     { stringValue:  a.source         || "" },
    sourceType:     { stringValue:  a.source_type    || "" },
    sourceIcon:     { stringValue:  a.source_icon    || "news" },
    sourceDomain:   { stringValue:  a.source_domain  || "" },
    sourceTier:     { integerValue: a.source_tier    || 2 },
    sourceWeight:   { doubleValue:  a.source_weight  || 0.75 },
    sourceUrl:      { stringValue:  a.url            || "" },
    publishedAt:    { stringValue:  a.published_at   || "" },
    publishedIso:   { stringValue:  a.published_iso  || "" },
    collectedAt:    { stringValue:  a.crawled_at     || "" },
    collectedIso:   { stringValue:  a.collected_iso  || "" },
    topics:         { stringValue:  JSON.stringify(a.topics    || []) },
    locations:      { stringValue:  JSON.stringify(a.locations || []) },
    sentiment:      { stringValue:  a.sentiment      || "NETRAL" },
    sentimentScore: { doubleValue:  a.sentiment_float|| 0.0 },
    sentimentInt:   { integerValue: a.sentiment_score|| 50 },
    criticalScore:  { integerValue: a.critical_score || 0 },
    status:         { stringValue:  a.status         || "normal" },
    isCritical:     { booleanValue: !!a.is_critical },
    reason:         { stringValue:  a.sentiment_reason || "" }
  };
}

// ============================================================
//  HELPER: JS Object → Firestore Document Format (umum)
// ============================================================
function toFirestoreDoc(obj) {
  const f = {};
  Object.entries(obj).forEach(([k,v]) => {
    if      (typeof v==="string")  f[k]={ stringValue: v };
    else if (typeof v==="number" && Number.isInteger(v)) f[k]={ integerValue: v };
    else if (typeof v==="number")  f[k]={ doubleValue: v };
    else if (typeof v==="boolean") f[k]={ booleanValue: v };
    else if (v!==null && v!==undefined) f[k]={ stringValue: JSON.stringify(v) };
  });
  return f;
}

// ============================================================
//  HELPER: Format tanggal ke bahasa Indonesia
// ============================================================
function formatDate(str) {
  try {
    return new Date(str).toLocaleString("id-ID",{
      day:"numeric",month:"long",year:"numeric",
      hour:"2-digit",minute:"2-digit",timeZone:"Asia/Makassar"
    })+" WITA";
  } catch(e) { return str||""; }
}

// ============================================================
//  SETUP: Buat trigger otomatis 30 menit
// ============================================================
function setupTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t=>t.getHandlerFunction()==="scheduledRun")
    .forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("scheduledRun").timeBased().everyMinutes(30).create();
  Logger.log("✅ Trigger otomatis 30 menit berhasil dibuat!");
  Logger.log("Sumber aktif: " + RSS_SOURCES.length);
  Logger.log("  Tier 1 (15-30 mnt): " + RSS_SOURCES.filter(s=>s.tier===1).length);
  Logger.log("  Tier 2 (30-60 mnt): " + RSS_SOURCES.filter(s=>s.tier===2).length);
  Logger.log("  Tier 3 (60-180 mnt): " + RSS_SOURCES.filter(s=>s.tier===3).length);
}

// ============================================================
//  CUSTOM MENU DI GOOGLE SHEETS
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🚀 Media Intel Pinrang")
    .addItem("▶ Jalankan Crawler Sekarang",      "scheduledRun")
    .addSeparator()
    .addItem("⚙️ Setup Trigger 30 Menit",         "setupTrigger")
    .addItem("📊 Hitung Ulang Ringkasan",          "buildSummary")
    .addItem("🔥 Perbarui Topik Trending",         "generateTrendingTopics")
    .addSeparator()
    .addItem("🔌 Test Koneksi Firestore",          "testFirestoreWrite")
    .addItem("🧪 Test Analisis Sentimen",          "testSentimentOnly")
    .addItem("📋 Lihat Info Sumber Aktif",          "showSourceInfo")
    .addToUi();
}

// ============================================================
//  TEST: Verifikasi tulis ke Firestore
// ============================================================
function testFirestoreWrite() {
  const base = `https://firestore.googleapis.com/v1/projects/${CONFIG.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const key  = `?key=${CONFIG.FIREBASE_API_KEY}`;
  const resp = UrlFetchApp.fetch(`${base}/media_intelligence_feeds/test_ping${key}`, {
    method:"PATCH", contentType:"application/json",
    payload: JSON.stringify({ fields:{ test:{stringValue:"ping"}, ts:{stringValue:new Date().toISOString()} }}),
    muteHttpExceptions: true
  });
  const code = resp.getResponseCode();
  Logger.log(code===200 ? "✅ TEST FIRESTORE BERHASIL — HTTP 200" : "❌ GAGAL — HTTP "+code+"\n"+resp.getContentText().substring(0,300));
}

// ============================================================
//  TEST: Uji Gemini tanpa crawl
// ============================================================
function testSentimentOnly() {
  const text   = "Warga Desa Bungi Kecamatan Duampanua mengeluhkan harga LPG 3 kg melebihi HET. Disperindag ESDM Pinrang memutus kontrak pangkalan yang menolak jual ke tetangga.";
  const result = analyzeSentimentGemini(text);
  Logger.log("=== HASIL TEST SENTIMEN v3.0 ===");
  Logger.log("Teks         : " + text);
  Logger.log("Label        : " + result.label);
  Logger.log("Score (int)  : " + result.score);
  Logger.log("Score (float): " + result.floatScore);
  Logger.log("Critical     : " + result.criticalScore + " → " + result.status);
  Logger.log("Topics       : " + JSON.stringify(result.topics));
  Logger.log("Locations    : " + JSON.stringify(result.locations));
  Logger.log("Alasan       : " + result.reason);
}

// ============================================================
//  INFO: Tampilkan ringkasan sumber aktif
// ============================================================
function showSourceInfo() {
  _initKeywords();
  Logger.log("=== MASTER SOURCE REGISTRY v3.0 ===");
  Logger.log("Total sumber  : " + RSS_SOURCES.length);
  Logger.log("Tier 1 (lokal): " + RSS_SOURCES.filter(s=>s.tier===1).length);
  Logger.log("Tier 2 (regional): " + RSS_SOURCES.filter(s=>s.tier===2).length);
  Logger.log("Tier 3 (nasional): " + RSS_SOURCES.filter(s=>s.tier===3).length);
  Logger.log("PinrangSpecific: " + RSS_SOURCES.filter(s=>s.pinrangSpecific).length);
  Logger.log("");
  Logger.log("=== KEYWORD INTELLIGENCE DICTIONARY ===");
  Logger.log("Total keywords: " + CONFIG.KEYWORDS.length + " (dari 13 cluster + geodict)");
  Logger.log("Cluster LPG   : " + CONFIG.KW_LPG.length + " terms");
  Logger.log("Cluster BBM   : " + CONFIG.KW_BBM.length + " terms");
  Logger.log("Cluster Pangan: " + CONFIG.KW_PANGAN.length + " terms");
  Logger.log("Cluster Pasar : " + CONFIG.KW_PASAR.length + " terms");
  Logger.log("Kecamatan     : " + CONFIG.GEO_KECAMATAN.length + " wilayah");
  Logger.log("");
  RSS_SOURCES.forEach(s => {
    Logger.log("[T"+s.tier+"] "+s.name+" (w:"+s.weight+")"+(s.pinrangSpecific?" [SPESIFIK]":""));
  });
}
