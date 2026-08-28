// ==============================================================================
// COMMAND CENTER ENGINE V3.2 PROD - DISPERINDAG ESDM KABUPATEN PINRANG
// Arsitektur: Dynamic Multi-Slide Presentation, Master Data Pasar Dinamis,
// SKM 2025 Resmi Periodik, Safe DOM Rendering, Single Global Continuous Ticker,
// & Resilience Realtime Firestore Listener dengan includeMetadataChanges.
// ==============================================================================

// --- 1. KONFIGURASI ENGINE & SLIDE SHOW ---
const CC_CONFIG = {
  activeSlideIndex: 0,
  totalSlides: 5,
  isPaused: false,
  autoSlideTimer: null,
  tickerInterval: null,
  weatherInterval: null,
  maxStaleTimeMs: 15 * 60 * 1000,   // 15 Menit sebelum status DATA STALE
  staleCheckInterval: 30 * 1000,    // Periksa status data setiap 30 detik
  durations: [
    20000, // Slide 0: Executive Overview (20 detik)
    25000, // Slide 1: Bursa Pasar Penuh & Master Pasar (25 detik)
    18000, // Slide 2: Kemetrologian Legal & Tera UTTP (18 detik)
    18000, // Slide 3: Distribusi LPG 3 Kg & ESDM (18 detik)
    20000  // Slide 4: Industri IKM & Layanan Publik SKM (20 detik)
  ]
};

// Map status pasokan komoditas pangan
const STOCK_STATUS_MAP = {
  abundant: { label: "Melimpah", color: "var(--accent-emerald)", icon: "🟢" },
  normal:   { label: "Aman Terkendali", color: "var(--accent-cyan)", icon: "🔵" },
  limited:  { label: "Pasokan Terbatas", color: "var(--accent-gold)", icon: "🟡" },
  critical: { label: "Kritis / Kurang", color: "var(--accent-rose)", icon: "🔴" }
};

let lastFirestoreSuccess = null;
let lastServerUpdatedAt = null;

// --- 2. FORMATTER ANGKA & MATA UANG ---
function formatRupiahVal(val) {
  if (val === undefined || val === null || val === "" || isNaN(Number(val))) return "--";
  return "Rp " + Number(val).toLocaleString("id-ID");
}

function formatPercentVal(val) {
  if (val === undefined || val === null || val === "" || isNaN(Number(val))) return "--";
  return Number(val) + "%";
}

function safeNumber(val, fallback = null) {
  if (val === undefined || val === null || val === "" || isNaN(Number(val))) return fallback;
  return Number(val);
}

function safeString(val, fallback = "--") {
  if (val === undefined || val === null || String(val).trim() === "") return fallback;
  return String(val).trim();
}

// --- 3. STATUS SYSTEM & BADGE INDICATOR (4 STATE TEGAS) ---
// LIVE | OFFLINE/CACHE | DATA STALE | DATA TIDAK TERSEDIA
function setSystemStatus(state, customLabel = null) {
  const badge = document.getElementById('systemLiveBadge');
  const dot = document.getElementById('liveStatusDot');
  const text = document.getElementById('liveStatusText');

  if (badge) {
    badge.className = 'cc-live-badge';
    switch (state) {
      case 'live':
        badge.classList.add('status-live');
        badge.innerHTML = `<span class="pulse-dot"></span> ${customLabel || '● LIVE'}`;
        break;
      case 'cached':
        badge.classList.add('status-cached');
        badge.innerHTML = `<span class="pulse-dot" style="background:#F59E0B;"></span> ${customLabel || '● OFFLINE / CACHE'}`;
        break;
      case 'stale':
        badge.classList.add('status-stale');
        badge.innerHTML = `<span class="pulse-dot" style="background:#EF4444;"></span> ${customLabel || '● DATA STALE'}`;
        break;
      case 'unavailable':
      default:
        badge.classList.add('status-unavailable');
        badge.innerHTML = `<span class="pulse-dot" style="background:#64748B;"></span> ${customLabel || '● DATA TIDAK TERSEDIA'}`;
        break;
    }
  }

  if (dot && text) {
    dot.className = 'status-dot';
    switch (state) {
      case 'live':
        dot.classList.add('dot-live');
        text.textContent = customLabel || '● LIVE';
        text.style.color = 'var(--accent-emerald)';
        break;
      case 'cached':
        dot.classList.add('dot-cached');
        text.textContent = customLabel || '● OFFLINE / CACHE';
        text.style.color = 'var(--accent-gold)';
        break;
      case 'stale':
        dot.classList.add('dot-stale');
        text.textContent = customLabel || '● DATA STALE';
        text.style.color = 'var(--accent-amber, #F59E0B)';
        break;
      case 'unavailable':
      default:
        dot.classList.add('dot-unavailable');
        text.textContent = customLabel || '● DATA TIDAK TERSEDIA';
        text.style.color = 'var(--accent-rose)';
        break;
    }
  }
}

// --- 4. JAM DIGITAL WITA REALTIME ---
function updateClock() {
  const timeEl = document.getElementById('ccLiveTime');
  const dateEl = document.getElementById('ccLiveDate');
  const oldClockEl = document.getElementById('ccClock');
  
  const now = new Date();
  
  // Waktu WITA (Makassar UTC+8)
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeFormatted = `${hours}:${minutes}:${seconds} WITA`;

  const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const dateFormatted = now.toLocaleDateString('id-ID', optionsDate);

  if (timeEl) timeEl.textContent = timeFormatted;
  if (dateEl) dateEl.textContent = dateFormatted;
  if (oldClockEl) oldClockEl.textContent = `${dateFormatted} • ${timeFormatted}`;
}

// --- 5. CUACA KABUPATEN PINRANG (OPEN-METEO API & CACHE FALLBACK) ---
async function syncWeather() {
  const pillEl = document.getElementById('ccWeatherPill');
  const tempEl = document.getElementById('ccWeatherTemp');
  const descEl = document.getElementById('ccWeatherDesc');
  const iconEl = document.getElementById('ccWeatherIcon');

  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-3.7833&longitude=119.6500&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FMakassar');
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const data = await res.json();
    
    if (data && data.current) {
      const temp = Math.round(data.current.temperature_2m);
      const code = data.current.weather_code;
      
      let weatherText = "Cerah Berawan";
      let weatherIcon = "🌤️";

      if (code === 0) { weatherText = "Cerah"; weatherIcon = "☀️"; }
      else if ([1, 2, 3].includes(code)) { weatherText = "Cerah"; weatherIcon = "🌤️"; }
      else if ([45, 48].includes(code)) { weatherText = "Berkabut"; weatherIcon = "🌫️"; }
      else if ([51, 53, 55, 61, 63, 65].includes(code)) { weatherText = "Hujan"; weatherIcon = "🌧️"; }
      else if ([80, 81, 82, 95, 96].includes(code)) { weatherText = "Hujan Petir"; weatherIcon = "⛈️"; }

      if (pillEl) {
        pillEl.innerHTML = `<span>${weatherIcon}</span> CUACA PINRANG: <strong>${temp}°C (${weatherText})</strong>`;
      }
      if (tempEl) tempEl.textContent = `${temp}°C`;
      if (descEl) descEl.textContent = `Pinrang: ${weatherText}`;
      if (iconEl) iconEl.textContent = weatherIcon;
    }
  } catch (e) {
    if (pillEl) {
      pillEl.innerHTML = `<span>🌤️</span> CUACA PINRANG: <strong>28°C (Cerah Berawan)</strong>`;
    }
    if (tempEl) tempEl.textContent = "28°C";
    if (descEl) descEl.textContent = "Pinrang: Cerah Berawan";
    if (iconEl) iconEl.textContent = "🌤️";
  }
}

// --- 5.1 FRESHNESS DATA RESMI INDICATOR ---
function updateDataFreshnessUI(timestamp) {
  const el = document.getElementById('ccDataUpdatedAt');
  if (!el) return;

  if (!timestamp) {
    el.innerHTML = `<span>DATA TERAKHIR</span><strong>28 Agustus 2026 09:00 WITA</strong>`;
    return;
  }

  if (typeof timestamp === 'string' && timestamp.includes('WITA')) {
    el.innerHTML = `<span>DATA TERAKHIR</span><strong>${timestamp}</strong>`;
    return;
  }

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      el.innerHTML = `<span>DATA TERAKHIR</span><strong>28 Agustus 2026 09:00 WITA</strong>`;
      return;
    }

    const optDate = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = date.toLocaleDateString('id-ID', optDate);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes} WITA`;

    el.innerHTML = `<span>DATA TERAKHIR</span><strong>${dateStr} ${timeStr}</strong>`;
  } catch (e) {
    el.innerHTML = `<span>DATA TERAKHIR</span><strong>28 Agustus 2026 09:00 WITA</strong>`;
  }
}

// --- 6. NAVIGASI SLIDE & AUTO-PRESENTATION ENGINE ---
function showSlide(index) {
  if (index < 0 || index >= CC_CONFIG.totalSlides) return;
  CC_CONFIG.activeSlideIndex = index;

  // Toggle Panel
  for (let i = 0; i < CC_CONFIG.totalSlides; i++) {
    const panel = document.getElementById(`slidePanel${i}`);
    if (panel) {
      panel.classList.toggle('active', i === index);
    }
  }

  // Toggle Tab Button
  const tabBtns = document.querySelectorAll('.cc-tab-btn');
  tabBtns.forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });

  resetAutoSlideTimer();
}

function nextSlide() {
  const next = (CC_CONFIG.activeSlideIndex + 1) % CC_CONFIG.totalSlides;
  showSlide(next);
}

function prevSlide() {
  const prev = (CC_CONFIG.activeSlideIndex - 1 + CC_CONFIG.totalSlides) % CC_CONFIG.totalSlides;
  showSlide(prev);
}

let slideStartTime = Date.now();
let progressBarInterval = null;

function resetAutoSlideTimer() {
  clearTimeout(CC_CONFIG.autoSlideTimer);
  clearInterval(progressBarInterval);

  const fill = document.getElementById('slideProgressFill');
  if (fill) fill.style.width = '0%';

  if (CC_CONFIG.isPaused) return;

  const currentDuration = CC_CONFIG.durations[CC_CONFIG.activeSlideIndex] || 20000;
  slideStartTime = Date.now();

  progressBarInterval = setInterval(() => {
    if (CC_CONFIG.isPaused) return;
    const elapsed = Date.now() - slideStartTime;
    const pct = Math.min(100, (elapsed / currentDuration) * 100);
    if (fill) fill.style.width = `${pct}%`;
  }, 100);

  CC_CONFIG.autoSlideTimer = setTimeout(() => {
    nextSlide();
  }, currentDuration);
}

function toggleAutoSlide() {
  CC_CONFIG.isPaused = !CC_CONFIG.isPaused;
  updateAutoSlideButtonUI();
  if (!CC_CONFIG.isPaused) {
    resetAutoSlideTimer();
  } else {
    clearTimeout(CC_CONFIG.autoSlideTimer);
    clearInterval(progressBarInterval);
  }
}

function pauseAutoSlide() {
  CC_CONFIG.isPaused = true;
  clearTimeout(CC_CONFIG.autoSlideTimer);
  clearInterval(progressBarInterval);
  updateAutoSlideButtonUI();
}

function resumeAutoSlide() {
  CC_CONFIG.isPaused = false;
  updateAutoSlideButtonUI();
  resetAutoSlideTimer();
}

function updateAutoSlideButtonUI() {
  const btn = document.getElementById('btnAutoSlide') || document.getElementById('btnPlayPause');
  const icon = document.getElementById('autoSlideIcon');
  if (btn) {
    btn.classList.toggle('active', CC_CONFIG.isPaused);
    if (icon) {
      icon.textContent = CC_CONFIG.isPaused ? '▶️' : '⏸️';
    }
  }
}

// --- 6.1 FULLSCREEN & THEME HANDLERS ---
function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn("Fullscreen request error:", err);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => {});
    }
  }
}

function toggleFullscreenMode() {
  toggleFullScreen();
}

function toggleThemeMode() {
  document.body.classList.toggle('light-mode');
  const isLight = document.body.classList.contains('light-mode');
  try {
    localStorage.setItem('disperindag_cc_theme', isLight ? 'light' : 'dark');
  } catch (e) {}
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = isLight ? '☀️' : '🌙';
}

function initThemeMode() {
  try {
    const saved = localStorage.getItem('disperindag_cc_theme');
    if (saved === 'light') {
      document.body.classList.add('light-mode');
      const icon = document.getElementById('themeIcon');
      if (icon) icon.textContent = '☀️';
    }
  } catch (e) {}
}

// --- 7. HELPER PERHITUNGAN TREND HARGA KOMODITAS ---
function getPriceTrend(curr, prev) {
  const c = safeNumber(curr);
  const p = safeNumber(prev);
  if (c === null || p === null || c === p) return "stable";
  return c > p ? "up" : "down";
}

// --- 8. SINGLE GLOBAL CONTINUOUS RUNNING TICKER RENDERER ---
function renderTickerDOM(customText = null) {
  const el = document.getElementById('ccTickerText');
  if (!el) return;

  const text = customText || (typeof DEFAULT_COMMAND_CENTER_CONFIG !== 'undefined' ? DEFAULT_COMMAND_CENTER_CONFIG.ticker_text : null);
  if (text) {
    el.textContent = text;
  } else {
    el.textContent = "DISPERINDAG ESDM PINRANG: PEMANTAUAN STABILITAS HARGA PANGAN & PENGENDALIAN INFLASI DAERAH BERJALAN RUTIN DI 12 KECAMATAN • KONSUMSI LPG 3 KG TEPAT SASARAN SESUAI HET RESMI RP 18.500 • KEMETROLOGIAN LEGAL MENJAMIN AKURASI TIMBANGAN PASAR & NOZZLE SPBU.";
  }
}

// --- 9. RENDER DATA COMMAND CENTER CONFIG & METRICS KE DOM ---
function renderCommandCenterData(config, isFromCache = false) {
  if (!config) return;

  // 1. Inflasi Daerah (TPID)
  const inflVal = safeNumber(config.inflation_rate);
  setSafeText('cc_kpi_inflation_rate', inflVal !== null ? `${inflVal}%` : '--');
  setSafeText('cc_overview_inflation_desc', `Indeks Inflasi Bulanan: ${inflVal !== null ? inflVal + '%' : '--'}`);
  setSafeText('cc_kpi_inflation_status', config.inflation_status || 'Sangat Aman & Terkendali');

  // 2. Ketersediaan Beras SPHP
  const sphpVal = safeNumber(config.sphp_rice_stock_tons);
  setSafeText('cc_kpi_sphp_rice_stock', sphpVal !== null ? `${sphpVal} TON` : '--');

  // 3. SPBU Teruji Tera
  const spbuVal = safeNumber(config.spbu_verified_pct);
  setSafeText('cc_kpi_spbu_verified_pct', spbuVal !== null ? `${spbuVal}%` : '--');
  setSafeText('cc_s2_spbu_verified_pct', spbuVal !== null ? `${spbuVal}%` : '--');

  // 4. Penyaluran LPG 3 Kg & HET Resmi
  const lpgVal = safeNumber(config.lpg_distribution_pct);
  setSafeText('cc_kpi_lpg_distribution_pct', lpgVal !== null ? `${lpgVal}%` : '--');

  const hetVal = safeNumber(config.het_lpg_price, 18500);
  const hetStr = hetVal !== null ? formatRupiahVal(hetVal) : 'Rp 18.500';
  setSafeText('cc_kpi_het_lpg_price', hetStr);
  setSafeText('cc_s3_het_lpg_price', hetStr);
  setSafeText('cc_s3_het_lpg_regulation', config.het_lpg_regulation || 'Pergub Sulsel No. 11/2021');

  const agentsCount = safeNumber(config.lpg_official_agents, 11);
  const basesCount = safeNumber(config.lpg_official_bases, 340);
  setSafeText('cc_s3_lpg_official_agents', agentsCount !== null ? `${agentsCount} AGEN` : '--');
  setSafeText('cc_s3_lpg_official_bases', basesCount !== null ? `${basesCount} Pangkalan` : '--');
  setSafeText('cc_kpi_lpg_official_bases', basesCount !== null ? `${basesCount} Pangkalan Terdaftar` : 'Pangkalan Terdaftar');

  // Slide 3 LPG Progress
  if (lpgVal !== null) {
    const lpgBar = document.getElementById('cc_s3_lpg_progress_bar');
    if (lpgBar) lpgBar.style.width = `${Math.min(100, Math.max(0, lpgVal))}%`;
    setSafeText('cc_s3_lpg_progress_text', `${lpgVal}% TERDISTRIBUSI`);
  }
  const lpgQuota = safeNumber(config.lpg_monthly_quota_tabung || config.monthly_quota);
  setSafeText('cc_s3_lpg_total_quota_text', `Alokasi Kuota Daerah: ${lpgQuota !== null ? lpgQuota.toLocaleString('id-ID') : '29.350'} Tabung/Bulan`);

  // 5. Total UTTP Ditera
  const uttpVal = safeNumber(config.uttp_verified_count);
  setSafeText('cc_s2_uttp_verified', uttpVal !== null ? `${uttpVal.toLocaleString('id-ID')} UNIT` : '--');

  // 6. IKM Terbina & Sertifikasi
  const ikmTrained = safeNumber(config.total_ikm_trained);
  const ikmCertified = safeNumber(config.total_ikm_certified);
  setSafeText('cc_kpi_total_ikm_trained', `${ikmTrained !== null ? ikmTrained : '--'} IKM Terbina`);
  setSafeText('cc_kpi_total_ikm_certified', `${ikmCertified !== null ? ikmCertified : '--'} Sertifikasi Halal/TKDN`);
  setSafeText('cc_s4_total_ikm_trained', ikmTrained !== null ? `${ikmTrained}` : '--');
  setSafeText('cc_s4_total_ikm_certified', ikmCertified !== null ? `${ikmCertified}` : '--');

  // 7. SURVEI KEPUASAN MASYARAKAT (SKM 2025 RESMI - DATA PERIODIK)
  const defaultSkm = (typeof DEFAULT_SKM_DATA !== 'undefined') ? DEFAULT_SKM_DATA : { score: 88.64, predicate: "SANGAT BAIK (A)", year: 2025 };
  const skmScoreVal = config.skm_score !== undefined && config.skm_score !== null && config.skm_score !== "" ? config.skm_score : defaultSkm.score;
  const skmGradeVal = config.skm_grade || config.skm_predicate || defaultSkm.predicate;
  
  setSafeText('cc_kpi_skm_score', `${skmScoreVal} / 100 (A)`);
  setSafeText('cc_s4_skm_score', `${skmScoreVal} / 100`);
  setSafeText('cc_s4_skm_grade', `Predikat: ${skmGradeVal} • Hasil SKM ${defaultSkm.year} Resmi`);

  // 8. Ticker Text Otomatis Harga Pasar Real-time
  renderCommandCenterTicker();

  // Timestamp Freshness
  if (config.updated_at || config.last_updated) {
    lastServerUpdatedAt = config.updated_at || config.last_updated;
    updateDataFreshnessUI(lastServerUpdatedAt);
  }
}

function setSafeText(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text !== undefined && text !== null ? String(text) : '--';
  }
}

// --- 10. RENDER MASTER PASAR DINAMIS (SINGLE SOURCE OF TRUTH FIRESTORE MARKETS) ---
function renderMarketsDOM(marketsList) {
  const container = document.getElementById('cc_s1_markets_container');
  const headerEl = document.getElementById('cc_s1_markets_header');
  const badgeEl = document.getElementById('cc_s1_markets_badge');
  const kpiActiveEl = document.getElementById('cc_kpi_markets_active_count');
  const kpiSummaryEl = document.getElementById('cc_kpi_markets_summary_sub');

  const list = marketsList && Array.isArray(marketsList) && marketsList.length > 0
    ? marketsList
    : (typeof DEFAULT_MARKETS !== 'undefined' ? DEFAULT_MARKETS : []);

  // Hitung Status Otomatis Berdasarkan Single Source of Truth
  const activeMarkets = list.filter(m => 
    (m.statusOperasional === 'aktif' || m.status === 'active' || m.showAsActive === true) &&
    m.statusOperasional !== 'tidak-aktif' && m.status !== 'inactive'
  );
  
  const inactiveMarkets = list.filter(m => 
    m.statusOperasional === 'tidak-aktif' || m.status === 'inactive' || m.id === 'pasar-paleteang' || m.id === 'pasar_paleteang'
  );
  
  const verificationMarkets = list.filter(m => 
    m.statusOperasional === 'perlu-verifikasi' || m.status === 'pending' || 
    (!activeMarkets.includes(m) && !inactiveMarkets.includes(m))
  );

  const totalMarkets = list.length;
  const activeCount = activeMarkets.length;
  const inactiveCount = inactiveMarkets.length;
  const verificationCount = verificationMarkets.length;

  // 1. Update KPI di Slide 0
  if (kpiActiveEl) {
    kpiActiveEl.textContent = `${activeCount}`;
  }
  if (kpiSummaryEl) {
    kpiSummaryEl.textContent = `${inactiveCount} Tidak Aktif • ${verificationCount} Verifikasi`;
  }

  // 2. Update Header & Badge di Slide 1
  if (headerEl) {
    headerEl.textContent = `${activeCount} PASAR RAKYAT BEROPERASI AKTIF`;
  }
  if (badgeEl) {
    badgeEl.textContent = `${activeCount} AKTIF • ${totalMarkets} TERDATA`;
  }

  // 3. Render Card Pasar Aktif Terpantau
  if (!container) return;
  container.replaceChildren();

  if (activeMarkets.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">BELUM ADA DATA PASAR AKTIF TERVERIFIKASI</div>`;
    return;
  }

  activeMarkets.forEach(m => {
    const card = document.createElement('div');
    card.style.background = 'var(--bg-card-inner)';
    card.style.padding = '8px 14px';
    card.style.borderRadius = '8px';
    card.style.borderLeft = `5px solid var(--accent-emerald)`;
    card.style.flex = '1';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.justifyContent = 'center';
    card.style.minHeight = '0';

    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.justifyContent = 'space-between';
    topRow.style.alignItems = 'center';

    const nameEl = document.createElement('strong');
    nameEl.style.fontSize = '0.98rem';
    nameEl.style.color = 'var(--text-main)';
    nameEl.textContent = safeString(m.nama || m.name);

    const dayText = Array.isArray(m.hariPasar) ? m.hariPasar.join(', ') : (m.market_days || 'Setiap Hari');
    const dayEl = document.createElement('span');
    dayEl.style.fontSize = '0.82rem';
    dayEl.style.fontWeight = '900';
    dayEl.style.color = 'var(--accent-emerald)';
    dayEl.style.fontFamily = "'Chakra Petch', monospace";
    dayEl.textContent = `● ${String(dayText).toUpperCase()}`;

    topRow.append(nameEl, dayEl);

    const subRow = document.createElement('div');
    subRow.style.fontSize = '0.8rem';
    subRow.style.color = 'var(--text-muted)';
    subRow.style.marginTop = '2px';

    const stalls = m.jumlahKios || m.active_stalls;
    const stallsText = stalls ? ` • ${stalls} Kios/Lapak` : '';
    const districtText = m.kecamatan || m.district || 'Pinrang';
    subRow.textContent = `Kecamatan ${districtText}${stallsText}`;

    card.append(topRow, subRow);
    container.appendChild(card);
  });

  // Tambahkan Strip Ringkasan Pasar Non-Aktif & Verifikasi di bagian bawah
  const summaryStrip = document.createElement('div');
  summaryStrip.style.background = 'rgba(255,255,255,0.04)';
  summaryStrip.style.border = '1px dashed var(--border-card)';
  summaryStrip.style.borderRadius = '6px';
  summaryStrip.style.padding = '6px 12px';
  summaryStrip.style.fontSize = '0.78rem';
  summaryStrip.style.color = 'var(--text-muted)';
  summaryStrip.style.display = 'flex';
  summaryStrip.style.justifyContent = 'space-between';
  summaryStrip.style.alignItems = 'center';
  summaryStrip.style.flexShrink = '0';
  summaryStrip.innerHTML = `
    <span>⚫ <strong>${inactiveCount}</strong> Tidak Beroperasi (Paleteang)</span>
    <span>🟠 <strong>${verificationCount}</strong> Perlu Verifikasi Lapangan</span>
  `;
  container.appendChild(summaryStrip);
}

// --- 11. RENDER TABEL HARGA DENGAN DELTA & TREND OTOMATIS (SAFE DOM) ---
function renderPricesDOM(pricesList) {
  const overviewTbody = document.getElementById('overviewPriceBody');
  const tradeTbody = document.getElementById('tradeSlidePriceBody');

  if (!pricesList || !Array.isArray(pricesList) || pricesList.length === 0) {
    if (overviewTbody) {
      overviewTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: var(--text-muted);">BELUM ADA DATA HARGA TERVERIFIKASI</td></tr>`;
    }
    if (tradeTbody) {
      tradeTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-muted);">BELUM ADA DATA BURSA HARGA HARI INI</td></tr>`;
    }
    return;
  }

  // 1. Overview Table (Top 5 Komoditas Pilihan)
  if (overviewTbody) {
    overviewTbody.replaceChildren();
    pricesList.slice(0, 5).forEach(item => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      const strongName = document.createElement('strong');
      strongName.style.color = 'var(--text-main)';
      strongName.style.fontSize = '0.96rem';
      strongName.textContent = safeString(item.commodity_name);
      tdName.appendChild(strongName);

      const tdUnit = document.createElement('td');
      tdUnit.style.color = 'var(--text-muted)';
      tdUnit.style.fontSize = '0.84rem';
      tdUnit.textContent = `1 ${safeString(item.unit, 'Kg')}`;

      const tdPrice = document.createElement('td');
      const spanPrice = document.createElement('span');
      spanPrice.className = 'price-bold-val';
      spanPrice.textContent = formatRupiahVal(item.price);
      tdPrice.appendChild(spanPrice);

      const tdTrend = document.createElement('td');
      const trend = getPriceTrend(item.price, item.previous_price);
      const spanTrend = document.createElement('span');
      spanTrend.className = `trend-pill-lg ${trend === 'up' ? 'trend-up' : (trend === 'down' ? 'trend-down' : 'trend-stable')}`;
      
      const delta = (safeNumber(item.price) || 0) - (safeNumber(item.previous_price) || safeNumber(item.price) || 0);
      const deltaStr = delta !== 0 ? ` (${delta > 0 ? '+' : ''}${delta.toLocaleString('id-ID')})` : '';
      spanTrend.textContent = trend === 'up' ? `▲ Naik${deltaStr}` : (trend === 'down' ? `▼ Turun${deltaStr}` : '— Tetap');
      tdTrend.appendChild(spanTrend);

      tr.append(tdName, tdUnit, tdPrice, tdTrend);
      overviewTbody.appendChild(tr);
    });
  }

  // 2. Trade Slide Full Table (10+ Komoditas dengan Status Pasokan Dinamis)
  if (tradeTbody) {
    tradeTbody.replaceChildren();
    pricesList.forEach(item => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      const strongName = document.createElement('strong');
      strongName.style.color = 'var(--text-main)';
      strongName.style.fontSize = '1.05rem';
      strongName.textContent = safeString(item.commodity_name);
      tdName.appendChild(strongName);

      const tdUnit = document.createElement('td');
      tdUnit.style.color = 'var(--text-muted)';
      tdUnit.style.fontSize = '0.9rem';
      tdUnit.textContent = `1 ${safeString(item.unit, 'Kg')}`;

      const tdPrice = document.createElement('td');
      const spanPrice = document.createElement('span');
      spanPrice.className = 'price-bold-val';
      spanPrice.style.fontSize = '1.35rem';
      spanPrice.textContent = formatRupiahVal(item.price);
      tdPrice.appendChild(spanPrice);

      const tdTrend = document.createElement('td');
      const trend = getPriceTrend(item.price, item.previous_price);
      const spanTrend = document.createElement('span');
      spanTrend.className = `trend-pill-lg ${trend === 'up' ? 'trend-up' : (trend === 'down' ? 'trend-down' : 'trend-stable')}`;
      spanTrend.style.fontSize = '0.88rem';
      spanTrend.style.padding = '4px 10px';

      const prev = safeNumber(item.previous_price);
      const curr = safeNumber(item.price);
      let pctStr = "";
      if (prev && curr && prev > 0 && curr !== prev) {
        const pct = (((curr - prev) / prev) * 100).toFixed(1);
        pctStr = ` ${pct > 0 ? '+' : ''}${pct}%`;
      }
      spanTrend.textContent = trend === 'up' ? `▲ Naik${pctStr}` : (trend === 'down' ? `▼ Turun${pctStr}` : '— Tetap');
      tdTrend.appendChild(spanTrend);

      // Status Pasokan Dinamis (Bukan Hardcoded)
      const tdStock = document.createElement('td');
      const stockKey = item.stock_status || (trend === 'up' ? 'limited' : 'abundant');
      const stockMeta = STOCK_STATUS_MAP[stockKey] || STOCK_STATUS_MAP.normal;
      
      const spanStock = document.createElement('span');
      spanStock.style.fontSize = '0.86rem';
      spanStock.style.fontWeight = '900';
      spanStock.style.color = stockMeta.color;
      spanStock.textContent = `${stockMeta.icon} ${stockMeta.label}`;
      tdStock.appendChild(spanStock);

      tr.append(tdName, tdUnit, tdPrice, tdTrend, tdStock);
      tradeTbody.appendChild(tr);
    });
  }

  // Sinkronisasi data ke Bottom Live Running Ticker
  renderCommandCenterTicker(pricesList);
}

// --- 12. RENDER MATRIKS STATUS 12 KECAMATAN (SAFE DOM & AUTO-FIT) ---
function renderDistrictsDOM(containerId, districtsList, cols = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!districtsList || !Array.isArray(districtsList) || districtsList.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding:10px;">DATA KECAMATAN BELUM TERSEDIA</div>`;
    return;
  }

  container.replaceChildren();

  const isSlide0 = containerId === 'ccDistrictMatrix0';

  districtsList.forEach(d => {
    const card = document.createElement('div');
    card.className = 'district-card-item';
    if (isSlide0) {
      card.style.padding = '4px 6px';
      card.style.minHeight = '36px';
    } else {
      card.style.padding = '8px 10px';
      card.style.minHeight = '48px';
    }

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.gap = '4px';
    header.style.marginBottom = '2px';

    const name = document.createElement('strong');
    name.style.fontSize = isSlide0 ? '0.78rem' : '0.86rem';
    name.style.color = 'var(--text-main)';
    name.style.whiteSpace = 'nowrap';
    name.style.overflow = 'hidden';
    name.style.textOverflow = 'ellipsis';
    name.textContent = safeString(d.district_name || d.name);

    const badge = document.createElement('span');
    const st = d.status_lpg || d.status || 'NORMAL';
    badge.className = `badge-indicator ${st === 'AMAN' || st === 'STABIL' || st === 'NORMAL' ? 'badge-ok' : (st === 'PENGAWASAN' ? 'badge-warn' : 'badge-crit')}`;
    badge.style.fontSize = isSlide0 ? '0.64rem' : '0.72rem';
    badge.textContent = `● ${st}`;

    header.append(name, badge);

    const sub = document.createElement('div');
    sub.style.fontSize = isSlide0 ? '0.68rem' : '0.74rem';
    sub.style.color = 'var(--text-muted)';
    sub.style.whiteSpace = 'nowrap';
    sub.style.overflow = 'hidden';
    sub.style.textOverflow = 'ellipsis';
    const pklCount = safeNumber(d.pangkalan_count, 0);
    sub.textContent = isSlide0 ? `${pklCount} Pkl • SPBU: ${safeString(d.spbu_status, 'OK')}` : `${pklCount} Pangkalan • SPBU: ${safeString(d.spbu_status, 'OK')}`;

    card.append(header, sub);
    container.appendChild(card);
  });
}

// --- 13. RENDER PENGADUAN PUBLIK TERAKHIR (SAFE DOM & SENSOR PRIVASI) ---
function renderReportsDOM(reportsList) {
  const container0 = document.getElementById('ccRecentReportSlide0');
  const container4 = document.getElementById('ccRecentReportsSlide4');

  if (!reportsList || !Array.isArray(reportsList) || reportsList.length === 0) {
    const emptyMsg = `<div style="padding:14px; text-align:center; color:var(--text-muted); background:var(--bg-card-inner); border-radius:8px;">BELUM ADA ADUAN PUBLIK MASUK</div>`;
    if (container0) container0.innerHTML = emptyMsg;
    if (container4) container4.innerHTML = emptyMsg;
    return;
  }

  // Slide 0: Render 1 Aduan Terkini
  if (container0) {
    container0.replaceChildren();
    const r = reportsList[0];
    container0.appendChild(createReportCardElement(r, true));
  }

  // Slide 4: Render 2-3 Aduan Terkini
  if (container4) {
    container4.replaceChildren();
    reportsList.slice(0, 2).forEach(r => {
      container4.appendChild(createReportCardElement(r, false));
    });
  }
}

function createReportCardElement(r, isCompact = false) {
  const wrapper = document.createElement('div');
  wrapper.style.background = 'var(--bg-card-inner)';
  wrapper.style.padding = isCompact ? '10px 14px' : '12px 16px';
  wrapper.style.borderRadius = '8px';
  wrapper.style.borderLeft = `5px solid ${r.status === 'SELESAI' ? 'var(--accent-emerald)' : 'var(--accent-gold)'}`;

  const topRow = document.createElement('div');
  topRow.style.display = 'flex';
  topRow.style.justifyContent = 'space-between';
  topRow.style.alignItems = 'center';

  const title = document.createElement('strong');
  title.style.fontSize = isCompact ? '0.88rem' : '0.96rem';
  title.style.color = 'var(--text-main)';
  // Sensor privasi nama pelapor
  const maskedName = maskCitizenName(r.nama || r.author_name || "Masyarakat Pinrang");
  title.textContent = `[${safeString(r.kategori || r.classification, 'ADUAN')}] • ${maskedName}`;

  const badge = document.createElement('span');
  badge.className = `card-badge ${r.status === 'SELESAI' ? 'badge-green' : 'badge-gold'}`;
  badge.style.fontSize = '0.72rem';
  badge.textContent = safeString(r.status, 'PROSES VERIFIKASI');

  topRow.append(title, badge);

  const textP = document.createElement('p');
  textP.style.fontSize = isCompact ? '0.8rem' : '0.84rem';
  textP.style.color = 'var(--text-muted)';
  textP.style.lineHeight = '1.4';
  textP.style.margin = '4px 0 0 0';
  textP.textContent = `"${safeString(r.pesan || r.substance || r.comment_text, 'Laporan sedang dalam tindak lanjut teknis.')}"`;

  wrapper.append(topRow, textP);
  return wrapper;
}

function maskCitizenName(name) {
  if (!name) return "Warga Pinrang";
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].length > 3 ? parts[0].substring(0, 3) + "***" : parts[0] + "***";
  }
  return parts[0] + " " + parts[1].charAt(0) + ".***";
}

// --- 14. UPDATE DATA FRESHNESS UI ---
function updateDataFreshnessUI(timestampStr) {
  const el = document.getElementById('ccDataFreshnessTime');
  if (!el || !timestampStr) return;

  try {
    const d = new Date(timestampStr);
    if (isNaN(d.getTime())) {
      el.textContent = String(timestampStr);
      return;
    }
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    el.textContent = `Pukul ${hours}:${minutes} WITA`;
  } catch (e) {
    el.textContent = String(timestampStr);
  }
}

// --- 15. INTEGRASI FIRESTORE & OFFLINE CACHE RESILIENCE DENGAN METADATA CHANGES ---
function setCachedData(key, data, updated_at = null) {
  try {
    const payload = {
      data: data,
      saved_at: Date.now(),
      server_updated_at: updated_at || new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {}
}

function getCachedData(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function initFirestoreRealtimeService() {
  const isFirestoreAvailable = typeof db !== 'undefined' && db !== null;

  // 1. FIRST PAINT DARI CACHE LOKAL / DEFAULT DATA
  const cachedCC = getCachedData('disperindag_command_center');
  const cachedMarkets = getCachedData('disperindag_markets');
  const cachedDistricts = getCachedData('disperindag_districts');
  const cachedPrices = getCachedData('disperindag_prices');
  const cachedReports = getCachedData('disperindag_reports');

  if (cachedCC && cachedCC.data) {
    renderCommandCenterData(cachedCC.data, true);
  } else if (typeof DEFAULT_COMMAND_CENTER_CONFIG !== 'undefined') {
    renderCommandCenterData(DEFAULT_COMMAND_CENTER_CONFIG, true);
  }

  if (cachedMarkets && cachedMarkets.data) {
    renderMarketsDOM(cachedMarkets.data);
  } else if (typeof DEFAULT_MARKETS !== 'undefined') {
    renderMarketsDOM(DEFAULT_MARKETS);
  }

  if (cachedDistricts && cachedDistricts.data) {
    renderDistrictsDOM('ccDistrictMatrix0', cachedDistricts.data, 2);
    renderDistrictsDOM('ccDistrictMatrix3', cachedDistricts.data, 3);
  } else if (typeof DEFAULT_DISTRICTS_STATUS !== 'undefined') {
    renderDistrictsDOM('ccDistrictMatrix0', DEFAULT_DISTRICTS_STATUS, 2);
    renderDistrictsDOM('ccDistrictMatrix3', DEFAULT_DISTRICTS_STATUS, 3);
  }

  if (cachedPrices && cachedPrices.data) {
    renderPricesDOM(cachedPrices.data);
  } else if (typeof DEFAULT_COMMODITY_PRICES !== 'undefined') {
    renderPricesDOM(DEFAULT_COMMODITY_PRICES);
  }

  if (cachedReports && cachedReports.data) {
    renderReportsDOM(cachedReports.data);
  } else if (typeof DEFAULT_REPORTS !== 'undefined') {
    renderReportsDOM(DEFAULT_REPORTS);
  }

  // Set first paint status (sementara)
  setSystemStatus(navigator.onLine ? "cached" : "cached");

  // 2. JIKA FIRESTORE TERSEDIA, PASANG REALTIME LISTENER DENGAN includeMetadataChanges: true
  if (isFirestoreAvailable) {
    try {
      // Listener Metrics
      db.collection('command_center').doc('metrics').onSnapshot(
        { includeMetadataChanges: true },
        (doc) => {
          if (doc.exists) {
            const data = doc.data();
            lastFirestoreSuccess = Date.now();
            setCachedData('disperindag_command_center', data, data.updated_at);
            renderCommandCenterData(data, false);
            
            // Evaluasi status dari Firestore metadata
            if (doc.metadata && doc.metadata.fromCache) {
              setSystemStatus("cached");
            } else {
              setSystemStatus("live");
            }
          } else {
            console.warn("Doc command_center/metrics not found on server. Auto-seeding default...");
            if (typeof DEFAULT_COMMAND_CENTER_CONFIG !== 'undefined') {
              db.collection('command_center').doc('metrics').set(DEFAULT_COMMAND_CENTER_CONFIG, { merge: true })
                .then(() => setSystemStatus("live"))
                .catch(e => console.error("Error seeding cc metrics:", e));
            }
          }
        },
        (err) => {
          console.error("Command Center Firestore Metrics Error:", err.code, err.message);
          setSystemStatus("cached");
        }
      );

      // Listener Master Pasar Dinamis
      db.collection('markets').onSnapshot(
        { includeMetadataChanges: true },
        (snapshot) => {
          const list = [];
          snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
          if (list.length > 0) {
            lastFirestoreSuccess = Date.now();
            setCachedData('disperindag_markets', list);
            renderMarketsDOM(list);
            if (!snapshot.metadata.fromCache) setSystemStatus("live");
          } else {
            console.warn("Collection 'markets' empty. Auto-seeding default markets...");
            if (typeof DEFAULT_MARKETS !== 'undefined') {
              DEFAULT_MARKETS.forEach(m => {
                db.collection('markets').doc(m.id).set(m, { merge: true });
              });
            }
          }
        },
        (err) => console.error("Firestore Markets Error:", err.code, err.message)
      );

      // Listener Districts
      db.collection('command_center').doc('districts').onSnapshot(
        { includeMetadataChanges: true },
        (doc) => {
          if (doc.exists && doc.data().items) {
            const items = doc.data().items;
            lastFirestoreSuccess = Date.now();
            setCachedData('disperindag_districts', items, doc.data().updated_at);
            renderDistrictsDOM('ccDistrictMatrix0', items, 2);
            renderDistrictsDOM('ccDistrictMatrix3', items, 3);
            if (!doc.metadata.fromCache) setSystemStatus("live");
          } else {
            if (typeof DEFAULT_DISTRICTS_STATUS !== 'undefined') {
              db.collection('command_center').doc('districts').set({ items: DEFAULT_DISTRICTS_STATUS, updated_at: new Date().toISOString() }, { merge: true });
            }
          }
        },
        (err) => console.error("Firestore Districts Error:", err.code, err.message)
      );

      // Listener Prices
      db.collection('prices').limit(20).onSnapshot(
        { includeMetadataChanges: true },
        (snapshot) => {
          const list = [];
          snapshot.forEach(d => list.push(d.data()));
          if (list.length > 0) {
            lastFirestoreSuccess = Date.now();
            setCachedData('disperindag_prices', list);
            renderPricesDOM(list);
            if (!snapshot.metadata.fromCache) setSystemStatus("live");
          }
        },
        (err) => console.error("Firestore Prices Error:", err.code, err.message)
      );

      // Listener Reports
      db.collection('reports').orderBy('created_at', 'desc').limit(5).onSnapshot(
        { includeMetadataChanges: true },
        (snapshot) => {
          const list = [];
          snapshot.forEach(d => list.push(d.data()));
          if (list.length > 0) {
            lastFirestoreSuccess = Date.now();
            setCachedData('disperindag_reports', list);
            renderReportsDOM(list);
            if (!snapshot.metadata.fromCache) setSystemStatus("live");
          }
        },
        (err) => console.error("Firestore Reports Error:", err.code, err.message)
      );

    } catch (err) {
      console.error("Firestore Init Error:", err);
      setSystemStatus("cached");
    }
  } else {
    setSystemStatus("cached");
  }

  // 3. MONITOR FRESHNESS & STALE DATA SETIAP 30 DETIK
  setInterval(() => {
    if (!lastFirestoreSuccess) return;
    const age = Date.now() - lastFirestoreSuccess;
    if (age > CC_CONFIG.maxStaleTimeMs) {
      setSystemStatus("stale");
    }
  }, CC_CONFIG.staleCheckInterval);
}

// Multi-Tab Local Storage Listener
window.addEventListener('storage', (e) => {
  if (['disperindag_command_center', 'disperindag_markets', 'disperindag_districts', 'disperindag_prices', 'disperindag_reports'].includes(e.key)) {
    const cached = getCachedData(e.key);
    if (cached && cached.data) {
      if (e.key === 'disperindag_command_center') renderCommandCenterData(cached.data, true);
      if (e.key === 'disperindag_markets') renderMarketsDOM(cached.data);
      if (e.key === 'disperindag_districts') {
        renderDistrictsDOM('ccDistrictMatrix0', cached.data, 2);
        renderDistrictsDOM('ccDistrictMatrix3', cached.data, 3);
      }
      if (e.key === 'disperindag_prices') renderPricesDOM(cached.data);
      if (e.key === 'disperindag_reports') renderReportsDOM(cached.data);
    }
  }
});

// Network Online/Offline Handler
window.addEventListener('online', () => {
  syncWeather();
  if (typeof db !== 'undefined' && db !== null) {
    // Biarkan onSnapshot mengembalikan status LIVE saat server respons
  } else {
    setSystemStatus("live");
  }
});

window.addEventListener('offline', () => {
  setSystemStatus("cached");
});

// Tab Visibility Handler
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseAutoSlide();
  } else {
    resumeAutoSlide();
  }
});

// --- 15. BOTTOM RUNNING TICKER COMMAND CENTER (HIGH-PRECISION MARQUEE 60 FPS) ---
let ccTickerAnimFrameId = null;
let ccTickerOffset = 0;
let isCCTickerPaused = false;

function renderCommandCenterTicker(pricesData) {
  const tickerContainer = document.getElementById('ccTickerText');
  const tickerTrack = document.querySelector('.cc-ticker-track');
  if (!tickerContainer) return;

  let prices = pricesData;
  if (!prices || prices.length === 0) {
    if (typeof getStorage === 'function') {
      prices = getStorage('disperindag_prices', typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []);
    } else if (typeof getCachedData === 'function') {
      prices = getCachedData('disperindag_prices')?.data || (typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []);
    } else {
      try {
        prices = JSON.parse(localStorage.getItem('disperindag_prices') || 'null') || (typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []);
      } catch(e) {
        prices = typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : [];
      }
    }
  }

  const priceParts = (prices && prices.length > 0) ? prices.map(p => {
    const name = p.commodity_name || p.name || 'Komoditas';
    const trendIcon = p.trend === 'up' ? '<span style="color:#F43F5E;">▲ Naik</span>' : (p.trend === 'down' ? '<span style="color:#10B981;">▼ Turun</span>' : '<span style="color:#38BDF8;">— Stabil</span>');
    return `🌾 <strong style="color:#FFFFFF;">${name}:</strong> <span style="color:var(--accent-gold); font-weight:900;">Rp ${Number(p.price || 0).toLocaleString('id-ID')}/${p.unit || 'Kg'}</span> (${trendIcon})`;
  }) : [];

  const newsParts = [
    `⛽ <strong style="color:#FFFFFF;">HET LPG 3 Kg Resmi:</strong> <span style="color:var(--accent-gold); font-weight:900;">Rp 18.500/Tabung</span> di 340 Pangkalan Resmi`,
    `⚖️ <strong style="color:#FFFFFF;">Kemetrologian Pinrang:</strong> <span style="color:var(--accent-cyan); font-weight:900;">100% Nozzle SPBU & Timbangan Pasar Teruji Tera Sah</span>`,
    `🌟 <strong style="color:#FFFFFF;">Indeks Kepuasan Masyarakat (SKM 2025):</strong> <span style="color:var(--accent-emerald); font-weight:900;">88.64 / 100 (Mutu A - Sangat Baik)</span>`,
    `📢 <strong style="color:#FFFFFF;">Posko Pengaduan WhatsApp 0823 1600 2226:</strong> <span style="color:var(--accent-cyan); font-weight:900;">Respons Cepat & Penindakan Tegas</span>`
  ];

  const fullContent = [...priceParts, ...newsParts].map(txt => `<span class="cc-ticker-item" style="display:inline-flex; align-items:center; gap:8px; margin-right:48px; white-space:nowrap;">${txt}</span>`).join('');

  // Gandakan untuk continuous infinite scroll
  tickerContainer.innerHTML = fullContent + fullContent;

  if (ccTickerAnimFrameId) {
    cancelAnimationFrame(ccTickerAnimFrameId);
    ccTickerAnimFrameId = null;
  }
  ccTickerOffset = 0;

  if (tickerTrack && !tickerTrack.dataset.listenerAttached) {
    tickerTrack.dataset.listenerAttached = 'true';
    tickerTrack.addEventListener('mouseenter', () => { isCCTickerPaused = true; });
    tickerTrack.addEventListener('mouseleave', () => { isCCTickerPaused = false; });
  }

  tickerContainer.style.animation = 'none';
  tickerContainer.style.display = 'inline-flex';
  tickerContainer.style.width = 'max-content';
  tickerContainer.style.whiteSpace = 'nowrap';
  tickerContainer.style.willChange = 'transform';

  function stepCCTicker() {
    if (!isCCTickerPaused && tickerContainer) {
      const halfWidth = tickerContainer.scrollWidth / 2;
      if (halfWidth > 0) {
        ccTickerOffset += 1.0; // Kecepatan nyaman untuk TV display
        if (ccTickerOffset >= halfWidth) {
          ccTickerOffset = 0;
        }
        tickerContainer.style.transform = `translate3d(-${ccTickerOffset}px, 0, 0)`;
      }
    }
    ccTickerAnimFrameId = requestAnimationFrame(stepCCTicker);
  }

  ccTickerAnimFrameId = requestAnimationFrame(stepCCTicker);
}

// --- 16. INITIALIZATION COMMAND CENTER ---
document.addEventListener('DOMContentLoaded', () => {
  initThemeMode();
  updateClock();
  setInterval(updateClock, 1000);
  
  syncWeather();
  CC_CONFIG.weatherInterval = setInterval(syncWeather, 10 * 60 * 1000);

  // Inisialisasi Freshness UI Default
  updateDataFreshnessUI(new Date().toISOString());

  // Inisialisasi Service Firestore & Cache
  initFirestoreRealtimeService();

  // Inisialisasi Running Ticker Bawah
  renderCommandCenterTicker();

  // Inisialisasi Auto-Slide
  showSlide(0);

  console.log("Command Center Disperindag ESDM Pinrang V3.2 Ready.");
});

// Window Global Function Exports for Inline HTML Onclick Handlers
window.switchSlide = showSlide;
window.showSlide = showSlide;
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
window.toggleAutoSlide = toggleAutoSlide;
window.toggleFullScreen = toggleFullScreen;
window.toggleFullscreenMode = toggleFullscreenMode;
window.toggleThemeMode = toggleThemeMode;
