// ==============================================================================
// COMMAND CENTER ENGINE V3.2 PROD - DISPERINDAG ESDM KABUPATEN PINRANG
// Arsitektur: Dynamic Multi-Slide Presentation, Master Data Pasar Dinamis,
// SKM 2025 Resmi Periodik, Safe DOM Rendering, Single Global Continuous Ticker,
// & Resilience Realtime Firestore Listener dengan includeMetadataChanges.
// ==============================================================================

// --- 1. KONFIGURASI ENGINE & SLIDE SHOW ---
const CC_CONFIG = {
  activeSlideIndex: 0,
  totalSlides: 6,
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
    20000, // Slide 4: Industri IKM & Layanan Publik SKM (20 detik)
    30000  // Slide 5: Peta Distribusi LPG (30 detik)
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
const sourceStates = new Map();
const SOURCE_FRESHNESS_MINUTES = {
  metrics: 15,
  markets: 24 * 60,
  districts: 6 * 60,
  prices: 24 * 60,
  reports: 30,
  tera: 24 * 60
};

function updateSourceState(source, state, updatedAt = null) {
  sourceStates.set(source, { state, updatedAt: timestampToMillis(updatedAt) });
  const states = Array.from(sourceStates.values());
  const newest = Math.max(0, ...states.map(item => item.updatedAt || 0));
  if (newest > 0) {
    lastServerUpdatedAt = newest;
    updateDataFreshnessUI(newest);
  }
  if (states.some(item => item.state === 'stale')) setSystemStatus('stale');
  else if (states.some(item => item.state === 'cached')) setSystemStatus('cached');
  else if (states.some(item => item.state === 'live')) setSystemStatus('live');
  else setSystemStatus('unavailable');
}

function markServerSnapshot(source, metadata, updatedAt, maxAgeMinutes) {
  lastFirestoreSuccess = Date.now();
  if (metadata?.fromCache) {
    updateSourceState(source, 'cached', updatedAt);
    return;
  }
  const freshness = getFreshnessStatus(updatedAt, maxAgeMinutes);
  updateSourceState(source, freshness === 'fresh' ? 'live' : freshness, updatedAt);
}

function handleFirestoreError(source, error, cacheKey) {
  console.error(`Firestore ${source} Error:`, error?.code || '', error?.message || error);
  const cache = getCachedData(cacheKey);
  updateSourceState(source, cache?.data ? 'cached' : 'unavailable', cache?.server_updated_at);
}

// --- 2. FORMATTER ANGKA & MATA UANG ---
function formatRupiahVal(val) {
  if (val === undefined || val === null || val === "" || isNaN(Number(val))) return "--";
  return "Rp " + Number(val).toLocaleString("id-ID");
}

function formatPercentVal(val) {
  const value = safePercentage(val);
  return value === null ? "--" : `${value}%`;
}

function safeNumber(val, fallback = null) {
  if (val === undefined || val === null || val === "" || isNaN(Number(val))) return fallback;
  return Number(val);
}

function safeString(val, fallback = "--") {
  if (typeof val !== 'string' || val.trim() === "") return fallback;
  return val.trim().slice(0, 250);
}

function safePercentage(val) {
  const value = safeNumber(val);
  return value === null ? null : Math.min(Math.max(value, 0), 100);
}

function timestampToMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'object' && Number.isFinite(value.seconds)) return value.seconds * 1000;
  const millis = typeof value === 'number' ? value : new Date(value).getTime();
  return Number.isFinite(millis) ? millis : null;
}

function getFreshnessStatus(updatedAt, maxAgeMinutes) {
  const millis = timestampToMillis(updatedAt);
  if (!millis) return 'unavailable';
  return Date.now() - millis > maxAgeMinutes * 60 * 1000 ? 'stale' : 'fresh';
}

function renderMediaIntelligenceSummary(snapshot) {
  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  const safeKpi = value => Number.isInteger(value) && value >= 0 ? String(value) : '—';
  const kpis = snapshot && typeof snapshot.kpis === 'object' ? snapshot.kpis : {};
  setText('ccMiMentions24h', safeKpi(kpis.earned_mentions_24h));
  setText('ccMiUniqueStories', safeKpi(kpis.unique_stories_24h));
  setText('ccMiCriticalIssues', safeKpi(kpis.active_critical_issues));

  const lastSyncMillis = timestampToMillis(snapshot?.last_run_at || snapshot?.last_full_success_at);
  setText('ccMiLastSync', lastSyncMillis ? new Date(lastSyncMillis).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Makassar'
  }) + ' WITA' : '—');

  const allowedStatuses = new Set(['FRESH', 'DEGRADED', 'STALE', 'OFFLINE']);
  const status = allowedStatuses.has(snapshot?.system_status) ? snapshot.system_status : 'OFFLINE';
  const statusElement = document.getElementById('ccMiStatus');
  if (statusElement) {
    statusElement.textContent = snapshot ? status : 'MENUNGGU DATA';
    statusElement.className = `cc-mi-status cc-mi-status--${status.toLowerCase()}`;
  }
}

function isValidMediaIntelligenceSnapshot(snapshot) {
  return Boolean(snapshot && snapshot.schema_version === 1
    && snapshot.kpis && typeof snapshot.kpis === 'object'
    && ['FRESH', 'DEGRADED', 'STALE', 'OFFLINE'].includes(snapshot.system_status));
}

// --- 3. STATUS SYSTEM & BADGE INDICATOR (4 STATE TEGAS) ---
// LIVE | OFFLINE/CACHE | DATA STALE | DATA TIDAK TERSEDIA
function setSystemStatus(state, customLabel = null) {
  const badge = document.getElementById('systemLiveBadge');
  const dot = document.getElementById('liveStatusDot');
  const text = document.getElementById('liveStatusText');

  if (badge) {
    badge.className = 'cc-live-badge';
    badge.replaceChildren();
    const badgeDot = document.createElement('span');
    badgeDot.className = 'pulse-dot';
    const badgeText = document.createElement('span');
    switch (state) {
      case 'live':
        badge.classList.add('status-live');
        badgeText.textContent = customLabel || '● LIVE';
        break;
      case 'cached':
        badge.classList.add('status-cached');
        badgeDot.style.background = '#F59E0B';
        badgeText.textContent = customLabel || '● OFFLINE / CACHE';
        break;
      case 'stale':
        badge.classList.add('status-stale');
        badgeDot.style.background = '#F97316';
        badgeText.textContent = customLabel || '● DATA TERLAMBAT';
        break;
      case 'unavailable':
      default:
        badge.classList.add('status-unavailable');
        badgeDot.style.background = '#EF4444';
        badgeText.textContent = customLabel || '● DATA TIDAK TERSEDIA';
        break;
    }
    badge.append(badgeDot, badgeText);
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
        text.textContent = customLabel || '● DATA TERLAMBAT';
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

      renderWeatherPill(pillEl, weatherIcon, `${temp}°C`, weatherText);
      if (tempEl) tempEl.textContent = `${temp}°C`;
      if (descEl) descEl.textContent = `Pinrang: ${weatherText}`;
      if (iconEl) iconEl.textContent = weatherIcon;
      setCachedData('disperindag_cc_weather', { temp, weatherText, weatherIcon }, data.current.time || new Date().toISOString());
    }
  } catch (e) {
    const cached = getCachedData('disperindag_cc_weather');
    const age = cached ? Date.now() - safeNumber(cached.cached_at, 0) : Infinity;
    if (cached?.data && age <= 30 * 60 * 1000) {
      const weather = cached.data;
      renderWeatherPill(pillEl, weather.weatherIcon || '🌤️', `${safeNumber(weather.temp) ?? '--'}°C`, 'DATA CUACA TERAKHIR');
      if (tempEl) tempEl.textContent = `${safeNumber(weather.temp) ?? '--'}°C`;
      if (descEl) descEl.textContent = 'Data cuaca terakhir';
      if (iconEl) iconEl.textContent = weather.weatherIcon || '🌤️';
    } else {
      renderWeatherPill(pillEl, '⚠️', '--°C', 'CUACA BELUM TERBARUI');
      if (tempEl) tempEl.textContent = '--°C';
      if (descEl) descEl.textContent = 'Cuaca belum terbarui';
      if (iconEl) iconEl.textContent = '⚠️';
    }
  }
}

function renderWeatherPill(container, icon, temperature, description) {
  if (!container) return;
  const iconEl = document.createElement('span');
  iconEl.textContent = icon;
  const label = document.createTextNode(' CUACA PINRANG: ');
  const strong = document.createElement('strong');
  strong.textContent = `${temperature} (${description})`;
  container.replaceChildren(iconEl, label, strong);
}

// --- 5.1 FRESHNESS DATA RESMI INDICATOR ---
function updateDataFreshnessUI(timestamp) {
  const el = document.getElementById('ccDataUpdatedAt');
  if (!el) return;
  const label = document.createElement('span');
  const value = document.createElement('strong');
  const millis = timestampToMillis(timestamp);
  label.textContent = 'DATA TERBARU';
  value.textContent = millis
    ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar', timeZoneName: 'short' }).format(new Date(millis))
    : 'WAKTU DATA TIDAK TERSEDIA';
  el.replaceChildren(label, value);
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

  if (index === 5) {
    setTimeout(() => {
      if (typeof initLpgGisMap === 'function') initLpgGisMap('adminLpgGisMapContainer');
    }, 80);
  }

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
  }, 400);

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

  const text = safeString(customText, '');
  if (text) {
    el.textContent = text;
  } else {
    el.textContent = "COMMAND CENTER DISPERINDAG ESDM KABUPATEN PINRANG • MEMUAT INFORMASI TERBARU...";
  }
}

// --- 9. RENDER DATA COMMAND CENTER CONFIG & METRICS KE DOM ---
let latestLpgDashboardSnapshot = null;

function renderLpgDashboardSnapshot(data) {
  if (!data) return;
  const agents = safeNumber(data.officialAgents);
  const bases = safeNumber(data.activePangkalan);
  const stock = safeNumber(data.stockAtAgents);
  const distributed = safeNumber(data.distributedToday);
  const negative = safeNumber(data.negativeStockAgents) || 0;
  const inactive = safeNumber(data.inactiveAgentsToday) || 0;
  const pending = safeNumber(data.pendingPangkalanVerification) || 0;
  setSafeText('cc_s3_lpg_official_agents', agents === null ? '--' : `${agents} AGEN`);
  setSafeText('cc_s3_lpg_official_bases', bases === null ? 'PANGKALAN: --' : `${bases} Pangkalan`);
  setSafeText('cc_kpi_lpg_official_bases', bases === null ? 'Pangkalan: --' : `${bases} Pangkalan Terdaftar`);
  setSafeText('cc_s3_lpg_progress_text', stock === null ? 'STOK AGEN: --' : `STOK AGEN: ${stock.toLocaleString('id-ID')} TABUNG`);
  const allocationText = data.allocationStatus === 'UNAVAILABLE'
    ? 'Alokasi bulanan: data belum tersedia'
    : `Alokasi Bulanan: ${(safeNumber(data.monthlyAllocation) || 0).toLocaleString('id-ID')} Tabung`;
  setSafeText('cc_s3_lpg_total_quota_text', `Penyaluran hari ini: ${distributed === null ? '--' : distributed.toLocaleString('id-ID')} Tabung • ${allocationText}`);
  const alertEl = document.getElementById('cc_s3_lpg_alert_status');
  if (alertEl) {
    const hasAlert = negative > 0 || inactive > 0 || pending > 0;
    alertEl.style.background = hasAlert ? 'rgba(245,158,11,.14)' : 'rgba(16,185,129,.12)';
    alertEl.style.color = hasAlert ? 'var(--accent-gold)' : 'var(--accent-emerald)';
    alertEl.textContent = hasAlert
      ? `PERLU PERHATIAN: ${negative} agen saldo negatif • ${inactive} agen belum melapor hari ini • ${pending} pangkalan menunggu verifikasi`
      : 'STATUS TERKENDALI: tidak ada anomali saldo atau verifikasi tertunda';
  }
}

function renderCommandCenterData(config, isFromCache = false) {
  if (!config) return;

  // 1. Inflasi Daerah (TPID)
  const inflVal = safeNumber(config.inflation_rate);
  setSafeText('cc_kpi_inflation_rate', inflVal !== null ? `${inflVal}%` : '--');
  setSafeText('cc_overview_inflation_desc', `Indeks Inflasi Bulanan: ${inflVal !== null ? inflVal + '%' : '--'}`);
  setSafeText('cc_kpi_inflation_status', safeString(config.inflation_status, 'DATA BELUM TERSEDIA'));

  // 2. Ketersediaan Beras SPHP
  const sphpVal = safeNumber(config.sphp_rice_stock_tons);
  setSafeText('cc_kpi_sphp_rice_stock', sphpVal !== null ? `${sphpVal} TON` : '--');

  // 3. SPBU Teruji Tera
  const spbuVal = safePercentage(config.spbu_verified_pct);
  setSafeText('cc_kpi_spbu_verified_pct', spbuVal !== null ? `${spbuVal}%` : '--');
  setSafeText('cc_s2_spbu_verified_pct', spbuVal !== null ? `${spbuVal}%` : '--');

  // 4. Penyaluran LPG 3 Kg: hanya data agregat server yang telah dipublikasikan.
  const hetVal = safeNumber(config.het_lpg_price);
  const hetStr = hetVal !== null ? formatRupiahVal(hetVal) : '--';
  setSafeText('cc_kpi_het_lpg_price', hetStr);
  setSafeText('cc_s3_het_lpg_price', hetStr);
  setSafeText('cc_s3_het_lpg_regulation', safeString(config.het_lpg_regulation, 'DASAR HUKUM BELUM TERSEDIA'));

  const agentsCount = safeNumber(config.lpg_official_agents ?? config.official_agents);
  const basesCount = safeNumber(config.lpg_official_bases ?? config.official_bases);
  const stockAtAgents = safeNumber(config.lpg_stock_at_agents ?? config.stock_at_agents);
  const distributedToday = safeNumber(config.lpg_distributed_bottles ?? config.distributed);
  const monthlyQuota = safeNumber(config.lpg_total_quota ?? config.monthly_quota);
  const distributionPct = safePercentage(config.lpg_distribution_pct ?? config.distribution_pct);

  setSafeText('cc_s3_lpg_official_agents', agentsCount === null ? '--' : `${agentsCount} AGEN`);
  setSafeText('cc_s3_lpg_official_bases', basesCount === null ? 'PANGKALAN: --' : `${basesCount} Pangkalan`);
  setSafeText('cc_kpi_lpg_official_bases', basesCount === null ? 'Pangkalan: --' : `${basesCount} Pangkalan Terdaftar`);

  // Progress Distribusi LPG
  const lpgDistPctEl = document.getElementById('cc_kpi_lpg_distribution_pct');
  if (lpgDistPctEl) {
    lpgDistPctEl.textContent = distributionPct === null ? '--' : `${distributionPct}%`;
  }

  const lpgBar = document.getElementById('cc_s3_lpg_progress_bar');
  if (lpgBar) lpgBar.style.width = distributionPct === null ? '0%' : `${distributionPct}%`;
  setSafeText('cc_s3_lpg_progress_text', stockAtAgents === null ? 'STOK AGEN: --' : `STOK AGEN: ${stockAtAgents.toLocaleString('id-ID')} TABUNG`);
  setSafeText('cc_s3_lpg_total_quota_text', `Penyaluran: ${distributedToday === null ? '--' : distributedToday.toLocaleString('id-ID')} Tabung • Alokasi Bulanan: ${monthlyQuota === null ? '--' : monthlyQuota.toLocaleString('id-ID')} Tabung`);
  if (latestLpgDashboardSnapshot) renderLpgDashboardSnapshot(latestLpgDashboardSnapshot);

  // 5. Total UTTP Ditera
  const uttpVal = safeNumber(config.uttp_verified_count ?? config.uttp_verified);
  setSafeText('cc_kpi_uttp_verified', uttpVal !== null ? uttpVal.toLocaleString('id-ID') : '--');
  setSafeText('cc_kpi_uttp_status', safeString(config.uttp_status, 'DATA BELUM TERSEDIA'));
  setSafeText('cc_s2_uttp_verified', uttpVal !== null ? `${uttpVal.toLocaleString('id-ID')} UNIT` : '--');

  // 6. IKM Terbina & Sertifikasi
  const ikmTrained = safeNumber(config.total_ikm_trained);
  const ikmCertified = safeNumber(config.total_ikm_certified);
  setSafeText('cc_kpi_total_ikm_trained', `${ikmTrained !== null ? ikmTrained : '--'} IKM Terbina`);
  setSafeText('cc_kpi_total_ikm_certified', `${ikmCertified !== null ? ikmCertified : '--'} Sertifikasi Halal/TKDN`);
  setSafeText('cc_s4_total_ikm_trained', ikmTrained !== null ? `${ikmTrained}` : '--');
  setSafeText('cc_s4_total_ikm_certified', ikmCertified !== null ? `${ikmCertified}` : '--');

  // 7. SURVEI KEPUASAN MASYARAKAT (SKM 2025 RESMI - DATA PERIODIK)
  const skmScoreVal = safeNumber(config.skm_score);
  const skmGradeVal = safeString(config.skm_grade || config.skm_predicate, '--');
  const skmPeriod = safeString(config.skm_period, '--');
  
  setSafeText('cc_kpi_skm_score', skmScoreVal === null ? '--' : `${skmScoreVal} / 100 (${skmGradeVal})`);
  setSafeText('cc_kpi_skm_period', `PERIODE SKM: ${skmPeriod}`);
  setSafeText('cc_s4_skm_score', skmScoreVal === null ? '--' : `${skmScoreVal} / 100`);
  setSafeText('cc_s4_skm_grade', `Predikat: ${skmGradeVal} • Periode: ${skmPeriod}`);

  // 8. Ticker Text Otomatis Harga Pasar Real-time
  renderCommandCenterTicker([], config.ticker_text);

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

function renderEmptyState(container, message, colSpan = null) {
  if (!container) return;
  container.replaceChildren();
  if (container.tagName === 'TBODY') {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = colSpan || 1;
    cell.textContent = message;
    cell.className = 'cc-empty-state';
    row.appendChild(cell);
    container.appendChild(row);
    return;
  }
  const state = document.createElement('div');
  state.textContent = message;
  state.className = 'cc-empty-state';
  container.appendChild(state);
}

// --- 10. RENDER MASTER PASAR DINAMIS (SINGLE SOURCE OF TRUTH FIRESTORE MARKETS) ---
function renderMarketsDOM(marketsList) {
  const container = document.getElementById('cc_s1_markets_container');
  const headerEl = document.getElementById('cc_s1_markets_header');
  const badgeEl = document.getElementById('cc_s1_markets_badge');
  const kpiActiveEl = document.getElementById('cc_kpi_markets_active_count');
  const kpiSummaryEl = document.getElementById('cc_kpi_markets_summary_sub');

  const list = Array.isArray(marketsList) ? marketsList : [];

  // Hitung Status Otomatis Berdasarkan Single Source of Truth
  const activeMarkets = list.filter(m => 
    (m.statusOperasional === 'aktif' || m.status === 'active' || m.showAsActive === true) &&
    m.statusOperasional !== 'tidak-aktif' && m.status !== 'inactive'
  );
  
  const inactiveMarkets = list.filter(m => 
    m.statusOperasional === 'tidak-aktif' || m.status === 'inactive'
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
    renderEmptyState(container, 'BELUM ADA DATA PASAR AKTIF TERVERIFIKASI');
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
  const inactiveText = document.createElement('span');
  inactiveText.textContent = `⚫ ${inactiveCount} Tidak Beroperasi`;
  const verificationText = document.createElement('span');
  verificationText.textContent = `🟠 ${verificationCount} Perlu Verifikasi Lapangan`;
  summaryStrip.append(inactiveText, verificationText);
  container.appendChild(summaryStrip);
}

// --- 11. RENDER TABEL HARGA DENGAN DELTA & TREND OTOMATIS (SAFE DOM) ---
function renderPricesDOM(pricesList) {
  const overviewTbody = document.getElementById('overviewPriceBody');
  const tradeTbody = document.getElementById('tradeSlidePriceBody');

  if (!pricesList || !Array.isArray(pricesList) || pricesList.length === 0) {
    renderEmptyState(overviewTbody, 'BELUM ADA DATA HARGA TERVERIFIKASI', 4);
    renderEmptyState(tradeTbody, 'BELUM ADA DATA BURSA HARGA HARI INI', 5);
    return;
  }

  const newestUpdate = pricesList.reduce((latest, item) => Math.max(latest, timestampToMillis(item.updated_at || item.observed_at) || 0), 0);
  const source = safeString(pricesList.find(item => item.source || item.source_unit)?.source || pricesList.find(item => item.source_unit)?.source_unit, '--');
  setSafeText('ccPriceSource', `SUMBER: ${source}`);
  setSafeText('ccPriceUpdatedAt', `UPDATE DATA: ${newestUpdate ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar', timeZoneName: 'short' }).format(new Date(newestUpdate)) : '--'}`);

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
      const stockKey = safeString(item.stock_status, 'unavailable').toLowerCase();
      const stockMeta = STOCK_STATUS_MAP[stockKey] || { label: 'Tidak Tersedia', color: 'var(--accent-rose)', icon: '⚪' };
      
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

function renderTeraScheduleDOM(items) {
  const container = document.getElementById('ccTeraScheduleList');
  if (!container) return;
  if (!Array.isArray(items) || items.length === 0) {
    renderEmptyState(container, 'BELUM ADA JADWAL TERA TERVERIFIKASI');
    return;
  }
  container.replaceChildren();
  items.slice(0, 4).forEach(item => {
    const card = document.createElement('div');
    card.className = 'cc-schedule-card';
    const heading = document.createElement('div');
    heading.className = 'cc-schedule-heading';
    const title = document.createElement('strong');
    title.textContent = safeString(item.title);
    const status = document.createElement('span');
    const allowedStatuses = new Set(['scheduled', 'ongoing', 'completed', 'postponed', 'cancelled']);
    const statusKey = allowedStatuses.has(item.status) ? item.status : 'scheduled';
    const labels = { scheduled: 'TERJADWAL', ongoing: 'BERLANGSUNG', completed: 'SELESAI', postponed: 'DITUNDA', cancelled: 'DIBATALKAN' };
    status.className = `card-badge schedule-${statusKey}`;
    status.textContent = labels[statusKey];
    heading.append(title, status);
    const detail = document.createElement('div');
    const start = timestampToMillis(item.start_at);
    detail.textContent = `${safeString(item.location, 'Lokasi belum tersedia')} • ${start ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(start)) : 'Tanggal belum tersedia'}`;
    card.append(heading, detail);
    if (statusKey === 'completed') {
      const result = document.createElement('div');
      result.className = 'cc-schedule-result';
      result.textContent = `${safeNumber(item.result_count) ?? '--'} UTTP diperiksa • ${safeNumber(item.valid_count) ?? '--'} sah • ${safeNumber(item.follow_up_count) ?? '--'} tindak lanjut`;
      card.appendChild(result);
    }
    container.appendChild(card);
  });
}

// --- 12. RENDER MATRIKS STATUS 12 KECAMATAN (SAFE DOM & AUTO-FIT) ---
function renderDistrictsDOM(containerId, districtsList, cols = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!districtsList || !Array.isArray(districtsList) || districtsList.length === 0) {
    renderEmptyState(container, 'DATA KECAMATAN BELUM TERSEDIA');
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
    const st = determineDistrictStatus(d);
    badge.className = `badge-indicator ${st === 'NORMAL' ? 'badge-ok' : (st === 'WASPADA' ? 'badge-warn' : 'badge-crit')}`;
    badge.style.fontSize = isSlide0 ? '0.64rem' : '0.72rem';
    badge.textContent = `● ${st}`;

    header.append(name, badge);

    const sub = document.createElement('div');
    sub.style.fontSize = isSlide0 ? '0.68rem' : '0.74rem';
    sub.style.color = 'var(--text-muted)';
    sub.style.whiteSpace = 'nowrap';
    sub.style.overflow = 'hidden';
    sub.style.textOverflow = 'ellipsis';
    const pklCount = safeNumber(d.pangkalan_count ?? d.pangkalan);
    const activeReports = safeNumber(d.active_reports);
    const coverage = safeNumber(d.stock_coverage_days);
    const details = [
      `${pklCount === null ? '--' : pklCount} Pangkalan`,
      coverage === null ? 'Stok: --' : `Stok: ${coverage.toLocaleString('id-ID')} hari`,
      activeReports === null ? 'Aduan: --' : `${activeReports} Aduan Aktif`
    ];
    sub.textContent = isSlide0 ? details.slice(0, 2).join(' • ') : details.join(' • ');

    card.append(header, sub);
    container.appendChild(card);
  });
}

function determineDistrictStatus(data) {
  const coverage = safeNumber(data?.stock_coverage_days);
  const reports = safeNumber(data?.active_reports);
  if (coverage === null && reports === null) return 'BELUM TERSEDIA';
  if ((coverage !== null && coverage < 2) || (reports !== null && reports >= 3)) return 'KRITIS';
  if ((coverage !== null && coverage < 4) || (reports !== null && reports > 0)) return 'WASPADA';
  return 'NORMAL';
}

// --- 13. RENDER PENGADUAN PUBLIK TERAKHIR (SAFE DOM & SENSOR PRIVASI) ---
function renderReportsDOM(reportsList) {
  const container0 = document.getElementById('ccRecentReportSlide0');
  const container4 = document.getElementById('ccRecentReportsSlide4');

  if (!reportsList || !Array.isArray(reportsList) || reportsList.length === 0) {
    renderEmptyState(container0, 'BELUM ADA ADUAN PUBLIK MASUK');
    renderEmptyState(container4, 'BELUM ADA ADUAN PUBLIK MASUK');
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
  const district = safeString(r.kecamatan || r.district, 'LOKASI DIRAHASIAKAN');
  title.textContent = `[${safeString(r.kategori || r.classification, 'ADUAN')}] • ${district}`;

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
  const reportTime = timestampToMillis(r.created_at || r.reported_at);
  textP.textContent = reportTime
    ? `Masuk: ${new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' }).format(new Date(reportTime))}`
    : 'Waktu laporan belum tersedia';

  wrapper.append(topRow, textP);
  return wrapper;
}

// --- 15. INTEGRASI FIRESTORE & OFFLINE CACHE RESILIENCE DENGAN METADATA CHANGES ---
function setCachedData(key, data, updated_at = null) {
  try {
    const payload = {
      data: data,
      cached_at: Date.now(),
      server_updated_at: updated_at || null
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {}
}

function getCachedData(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && Object.prototype.hasOwnProperty.call(parsed, 'data') ? parsed : null;
  } catch (e) {
    return null;
  }
}

function initFirestoreRealtimeService() {
  const isFirestoreAvailable = typeof db !== 'undefined' && db !== null;

  // 1. FIRST PAINT DARI CACHE LOKAL / DEFAULT DATA
  const cachedCC = getCachedData('disperindag_cc_cache_metrics');
  const cachedMarkets = getCachedData('disperindag_cc_cache_markets');
  const cachedDistricts = getCachedData('disperindag_cc_cache_districts');
  const cachedPrices = getCachedData('disperindag_cc_cache_prices');
  const cachedReports = getCachedData('disperindag_cc_cache_reports');
  const cachedTera = getCachedData('disperindag_cc_cache_tera');

  let hasUsableCache = false;
  if (cachedCC && cachedCC.data) {
    renderCommandCenterData(cachedCC.data, true);
    updateSourceState('metrics', 'cached', cachedCC.server_updated_at);
    hasUsableCache = true;
  } else {
    renderCommandCenterData(typeof DEFAULT_COMMAND_CENTER_CONFIG !== 'undefined' ? DEFAULT_COMMAND_CENTER_CONFIG : {}, true);
  }

  if (cachedMarkets && cachedMarkets.data) {
    renderMarketsDOM(cachedMarkets.data);
    hasUsableCache = true;
  } else {
    renderMarketsDOM([]);
  }

  if (cachedDistricts && cachedDistricts.data) {
    renderDistrictsDOM('ccDistrictMatrix0', cachedDistricts.data, 2);
    renderDistrictsDOM('ccDistrictMatrix3', cachedDistricts.data, 3);
    hasUsableCache = true;
  } else {
    renderDistrictsDOM('ccDistrictMatrix0', [], 2);
    renderDistrictsDOM('ccDistrictMatrix3', [], 3);
  }

  if (cachedPrices && cachedPrices.data) {
    renderPricesDOM(cachedPrices.data);
    hasUsableCache = true;
  } else {
    renderPricesDOM([]);
  }

  if (cachedReports && cachedReports.data) {
    renderReportsDOM(cachedReports.data);
    hasUsableCache = true;
  } else {
    renderReportsDOM([]);
  }

  if (cachedTera && cachedTera.data) {
    renderTeraScheduleDOM(cachedTera.data);
    hasUsableCache = true;
  } else {
    renderTeraScheduleDOM([]);
  }

  // Set first paint status (sementara)
  setSystemStatus(hasUsableCache ? 'cached' : 'unavailable');

  // 2. JIKA FIRESTORE TERSEDIA, PASANG REALTIME LISTENER DENGAN includeMetadataChanges: true
  if (isFirestoreAvailable) {
    try {
      // Listener Metrics
      db.collection('command_center').doc('metrics').onSnapshot(
        { includeMetadataChanges: true },
        (doc) => {
          if (doc.exists) {
            const data = doc.data();
            setCachedData('disperindag_cc_cache_metrics', data, data.updated_at);
            renderCommandCenterData(data, false);
            markServerSnapshot('metrics', doc.metadata, data.updated_at, 15);
          } else {
            renderCommandCenterData(typeof DEFAULT_COMMAND_CENTER_CONFIG !== 'undefined' ? DEFAULT_COMMAND_CENTER_CONFIG : {}, false);
            updateSourceState('metrics', 'unavailable');
          }
        },
        (err) => handleFirestoreError('metrics', err, 'disperindag_cc_cache_metrics')
      );

      // Tahap 13: satu-satunya sumber MI untuk Command Center adalah snapshot publik.
      db.collection('mi_public').doc('current').onSnapshot(
        { includeMetadataChanges: true },
        (doc) => {
          const data = doc.exists ? doc.data() : null;
          renderMediaIntelligenceSummary(isValidMediaIntelligenceSnapshot(data) ? data : null);
        },
        (err) => {
          console.warn('Firestore media intelligence public snapshot error:', err?.code || err);
          renderMediaIntelligenceSummary(null);
        }
      );

      // Snapshot publik berasal dari agregasi immutable ledger oleh admin LPG.
      db.collection('lpg_dashboard').doc('summary').onSnapshot(
        { includeMetadataChanges: true },
        (doc) => {
          if (!doc.exists) return;
          latestLpgDashboardSnapshot = doc.data();
          renderLpgDashboardSnapshot(latestLpgDashboardSnapshot);
        },
        (err) => handleFirestoreError('lpg_dashboard', err, 'disperindag_cc_cache_lpg')
      );

      // Listener Master Pasar Dinamis
      db.collection('markets').onSnapshot(
        { includeMetadataChanges: true },
        (snapshot) => {
          const list = [];
          snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
          if (list.length > 0) {
            setCachedData('disperindag_cc_cache_markets', list, snapshot.docs[0]?.data()?.updated_at || null);
            renderMarketsDOM(list);
            markServerSnapshot('markets', snapshot.metadata, snapshot.docs[0]?.data()?.updated_at, 24 * 60);
          } else {
            renderMarketsDOM([]);
            updateSourceState('markets', 'unavailable');
          }
        },
        (err) => handleFirestoreError('markets', err, 'disperindag_cc_cache_markets')
      );

      // Listener Districts
      db.collection('command_center').doc('districts').onSnapshot(
        { includeMetadataChanges: true },
        (doc) => {
          if (doc.exists && doc.data().items) {
            const items = doc.data().items;
            setCachedData('disperindag_cc_cache_districts', items, doc.data().updated_at);
            renderDistrictsDOM('ccDistrictMatrix0', items, 2);
            renderDistrictsDOM('ccDistrictMatrix3', items, 3);
            markServerSnapshot('districts', doc.metadata, doc.data().updated_at, 6 * 60);
          } else {
            renderDistrictsDOM('ccDistrictMatrix0', [], 2);
            renderDistrictsDOM('ccDistrictMatrix3', [], 3);
            updateSourceState('districts', 'unavailable');
          }
        },
        (err) => handleFirestoreError('districts', err, 'disperindag_cc_cache_districts')
      );

      // Listener jadwal dan hasil tera terverifikasi.
      db.collection('command_center').doc('tera_schedule').onSnapshot(
        { includeMetadataChanges: true },
        (doc) => {
          const data = doc.exists ? doc.data() : null;
          const items = Array.isArray(data?.items) ? data.items : [];
          renderTeraScheduleDOM(items);
          if (!data) {
            updateSourceState('tera', 'unavailable');
            return;
          }
          setCachedData('disperindag_cc_cache_tera', items, data.updated_at);
          markServerSnapshot('tera', doc.metadata, data.updated_at, 24 * 60);
        },
        (err) => handleFirestoreError('tera', err, 'disperindag_cc_cache_tera')
      );

      // Listener Prices (Smart Hybrid Merge: Mencegah Kehilangan Komoditas Default saat Update Parsial)
      db.collection('prices_current').limit(20).onSnapshot(
        { includeMetadataChanges: true },
        (snapshot) => {
          const list = [];
          snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
          
          if (list.length === 0) {
            renderPricesDOM([]);
            updateSourceState('prices', 'unavailable');
            return;
          }
          const newestUpdate = list.reduce((latest, item) => Math.max(latest, timestampToMillis(item.updated_at || item.observed_at) || 0), 0);
          setCachedData('disperindag_cc_cache_prices', list, newestUpdate || null);
          renderPricesDOM(list);
          markServerSnapshot('prices', snapshot.metadata, newestUpdate || null, 24 * 60);
        },
        (err) => handleFirestoreError('prices', err, 'disperindag_cc_cache_prices')
      );

      // Listener Reports
      db.collection('reports_current').orderBy('created_at', 'desc').limit(5).onSnapshot(
        { includeMetadataChanges: true },
        (snapshot) => {
          const list = [];
          snapshot.forEach(d => list.push(d.data()));
          if (list.length > 0) {
            const newestUpdate = list.reduce((latest, item) => Math.max(latest, timestampToMillis(item.updated_at || item.created_at) || 0), 0);
            setCachedData('disperindag_cc_cache_reports', list, newestUpdate || null);
            renderReportsDOM(list);
            markServerSnapshot('reports', snapshot.metadata, newestUpdate || null, 30);
          } else {
            renderReportsDOM([]);
            updateSourceState('reports', 'unavailable');
          }
        },
        (err) => handleFirestoreError('reports', err, 'disperindag_cc_cache_reports')
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
    sourceStates.forEach((entry, source) => {
      const maxAge = (SOURCE_FRESHNESS_MINUTES[source] || 15) * 60 * 1000;
      if (entry.state === 'live' && entry.updatedAt && Date.now() - entry.updatedAt > maxAge) {
        updateSourceState(source, 'stale', entry.updatedAt);
      }
    });
  }, CC_CONFIG.staleCheckInterval);
}

// Multi-Tab Local Storage Listener
window.addEventListener('storage', (e) => {
  if (['disperindag_cc_cache_metrics', 'disperindag_cc_cache_markets', 'disperindag_cc_cache_districts', 'disperindag_cc_cache_prices', 'disperindag_cc_cache_reports'].includes(e.key)) {
    const cached = getCachedData(e.key);
    if (cached && cached.data) {
      if (e.key === 'disperindag_cc_cache_metrics') renderCommandCenterData(cached.data, true);
      if (e.key === 'disperindag_cc_cache_markets') renderMarketsDOM(cached.data);
      if (e.key === 'disperindag_cc_cache_districts') {
        renderDistrictsDOM('ccDistrictMatrix0', cached.data, 2);
        renderDistrictsDOM('ccDistrictMatrix3', cached.data, 3);
      }
      if (e.key === 'disperindag_cc_cache_prices') {
        renderPricesDOM(cached.data);
      }
      if (e.key === 'disperindag_cc_cache_reports') renderReportsDOM(cached.data);
    }
  }
});

// Network Online/Offline Handler
window.addEventListener('online', () => {
  syncWeather();
  // Listener Firestore menentukan status LIVE setelah snapshot server berhasil.
});

window.addEventListener('offline', () => {
  setSystemStatus("cached");
});

// Tab Visibility Handler
let autoSlideWasRunningBeforeHidden = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    autoSlideWasRunningBeforeHidden = !CC_CONFIG.isPaused;
    pauseAutoSlide();
  } else if (autoSlideWasRunningBeforeHidden) {
    resumeAutoSlide();
  }
});

// --- 15. BOTTOM RUNNING TICKER COMMAND CENTER (HIGH-PRECISION MARQUEE 60 FPS) ---
let ccTickerAnimFrameId = null;
let ccTickerOffset = 0;
let isCCTickerPaused = false;

function renderCommandCenterTicker(pricesData = [], customText = null) {
  const tickerContainer = document.getElementById('ccTickerText');
  const tickerTrack = document.querySelector('.cc-ticker-track');
  if (!tickerContainer) return;

  const prices = Array.isArray(pricesData) ? pricesData : [];
  const items = prices.map(item => {
    const current = safeNumber(item.price);
    if (current === null) return null;
    const trend = getPriceTrend(current, item.previous_price);
    const trendLabel = trend === 'up' ? '▲ Naik' : trend === 'down' ? '▼ Turun' : '— Stabil';
    return `🌾 ${safeString(item.commodity_name || item.name, 'Komoditas')}: ${formatRupiahVal(current)}/${safeString(item.unit, 'Kg')} (${trendLabel})`;
  }).filter(Boolean);
  if (safeString(customText, '') !== '') items.push(safeString(customText, ''));
  if (items.length === 0) items.push('COMMAND CENTER DISPERINDAG ESDM KABUPATEN PINRANG • MEMUAT INFORMASI TERBARU...');

  tickerContainer.replaceChildren();
  [...items, ...items].forEach(text => {
    const item = document.createElement('span');
    item.className = 'cc-ticker-item';
    item.textContent = text;
    tickerContainer.appendChild(item);
  });

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
  CC_CONFIG.weatherInterval = setInterval(syncWeather, 15 * 60 * 1000);

  // Inisialisasi Freshness UI Default
  updateDataFreshnessUI(null);

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
