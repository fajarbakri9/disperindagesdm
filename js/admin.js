// ==============================================================================
// CMS ADMINISTRATOR CONTROLLER - DISPERINDAG ESDM PINRANG (PRODUCTION READY)
// ==============================================================================

let adminCloudReports = null;
function getAdminReportsData() {
  return Array.isArray(adminCloudReports) ? adminCloudReports : [];
}

document.addEventListener('DOMContentLoaded', () => {
  const currentSession = requireAuth(['admin']);
  if (!currentSession) return;

  const safeInit = (name, fn) => {
    try {
      if (typeof fn === 'function') fn();
    } catch (err) {
      console.warn(`[Admin CMS] Peringatan inisialisasi modul "${name}":`, err);
    }
  };

  safeInit('displayUserInfo', () => displayUserInfo(currentSession));
  safeInit('initAdminTabs', initAdminTabs);
  safeInit('applyAdminPermissionVisibility', () => applyAdminPermissionVisibility(currentSession));
  safeInit('renderDashboardStats', renderDashboardStats);
  safeInit('initAdminSp2kpPrices', initAdminSp2kpPrices);
  safeInit('renderAdminNews', renderAdminNews);
  safeInit('renderAdminBanners', renderAdminBanners);
  safeInit('renderAdminDocs', renderAdminDocs);
  safeInit('renderAdminIkm', renderAdminIkm);
  safeInit('initAdminMarkets', () => { if (typeof initAdminMarkets === 'function') initAdminMarkets(); });
  safeInit('renderAdminReports', renderAdminReports);
  safeInit('renderAdminUsers', renderAdminUsers);
  safeInit('renderAdminCommandCenter', renderAdminCommandCenter);
  safeInit('renderAdminSettings', renderAdminSettings);
  safeInit('initBannerUploader', initBannerUploader);
  safeInit('initAdminBbm', () => { if (typeof initAdminBbm === 'function') initAdminBbm(); });

  // Real-Time Cloud Firestore Sync di CMS Admin
  if (typeof db !== 'undefined' && db !== null) {
    try {
      db.collection('news').onSnapshot(snapshot => {
        if (!snapshot.empty) {
          const cloudNews = [];
          snapshot.forEach(doc => cloudNews.push({ id: doc.id, ...doc.data() }));
          const merged = mergeNewsWithDefaults(cloudNews);
          setStorage('disperindag_news', merged);
          renderAdminNews();
        }
      }, err => console.warn("Firestore Admin News Sync:", err));

      db.collection('settings').doc('banners').onSnapshot(doc => {
        if (doc.exists && doc.data() && Array.isArray(doc.data().list)) {
          const bannerData = doc.data();
          if (Array.isArray(bannerData.deleted_ids)) {
            localStorage.setItem('disperindag_deleted_banner_ids', JSON.stringify(bannerData.deleted_ids));
          }
          const merged = mergeBannersWithDefaults(bannerData.list);
          setStorage('disperindag_banners', merged);
          renderAdminBanners();
        }
      }, err => console.warn("Firestore Admin Banners Sync:", err));

      db.collection('reports').onSnapshot(snapshot => {
        adminCloudReports = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        adminCloudReports.sort((a, b) => {
          const av = a.createdAt?.toMillis?.() || 0;
          const bv = b.createdAt?.toMillis?.() || 0;
          return bv - av;
        });
        renderAdminReports();
      }, err => {
        adminCloudReports = [];
        console.warn('Firestore Admin Reports Sync:', err.code || err.message);
        renderAdminReports();
      });
    } catch(e) {}
  }

  // Buka tab Dashboard secara default dan aktifkan jam WITA
  safeInit('switchAdminTab', () => switchAdminTab('tabDashboard'));
  safeInit('startAdminLiveClock', startAdminLiveClock);
});

// CLOCK & WITA TIME TICKER CONTROLLER
function startAdminLiveClock() {
  const clockEl = document.getElementById('adminLiveClockDisplay');
  if (!clockEl) return;

  const updateClock = () => {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Makassar'
    }).format(now);
    clockEl.textContent = `${formatted} WITA`;
  };

  updateClock();
  setInterval(updateClock, 1000);
}

// MOBILE SIDEBAR DRAWER CONTROLLER
window.toggleMobileSidebar = function(forceState) {
  const sidebar = document.getElementById('adminSidebar');
  const backdrop = document.getElementById('adminSidebarBackdrop');
  if (!sidebar) return;

  const isOpen = sidebar.classList.contains('mobile-open');
  const shouldOpen = forceState !== undefined ? forceState : !isOpen;

  if (shouldOpen) {
    sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  } else {
    sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
};

function displayUserInfo(session) {
  const nameEl = document.getElementById('adminUserDisplayName');
  const roleEl = document.getElementById('adminUserRoleName');
  if (nameEl) nameEl.textContent = session.name;
  if (roleEl) roleEl.innerHTML = `${session.roleIcon} ${session.roleLabel}`;
}

// TAB SWITCHER CONTROLLER
function initAdminTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      switchAdminTab(btn.dataset.tab);
    });
  });
}

const ADMIN_TAB_PERMISSIONS = {
  tabDashboard: 'dashboard', tabPrices: 'prices', tabNews: 'news',
  tabBanners: 'banners', tabDocs: 'documents', tabIkm: 'ikm', tabMarkets: 'prices',
  tabLpgMonitoring: 'lpg', tabBbm: 'lpg', tabReports: 'reports', tabUsers: 'users',
  tabCommandCenter: 'command_center', tabMediaIntelligence: 'media',
  tabSettings: 'settings'
};

function hasAdminTabPermission(session, tabId) {
  if (!session) return false;
  const role = (session.role || '').toUpperCase();
  if (role === 'SUPER_ADMIN' || role === 'DISPERINDAG_ADMIN' || role === 'LPG_ADMIN' || role === 'ADMINISTRATOR') return true;
  const permissions = Array.isArray(session.permissions) ? session.permissions : [];
  if (permissions.includes('all')) return true;
  const required = ADMIN_TAB_PERMISSIONS[tabId];
  if (!required) return true;
  return permissions.includes(required) || (tabId === 'tabBbm' && (permissions.includes('lpg') || permissions.includes('esdm') || permissions.includes('all')));
}

function applyAdminPermissionVisibility(session) {
  document.querySelectorAll('.admin-tab-btn[data-tab]').forEach(button => {
    const allowed = hasAdminTabPermission(session, button.dataset.tab);
    button.hidden = !allowed;
    button.setAttribute('aria-hidden', String(!allowed));
  });
}

window.switchAdminTab = function(tabId) {
  if (!tabId) return;
  const session = getCurrentSession();
  if (!hasAdminTabPermission(session, tabId)) {
    CustomModal.alert({
      title: 'Akses Tidak Diizinkan',
      message: 'Akun Anda tidak memiliki kewenangan untuk membuka modul ini.',
      icon: '!', type: 'warning'
    });
    return;
  }

  // 1. Reset status aktif semua tombol tab
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));

  // 2. Sembunyikan semua panel tab
  document.querySelectorAll('.admin-panel').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });

  // 3. Aktifkan tombol yang sesuai
  const activeBtn = document.querySelector(`.admin-tab-btn[data-tab="${tabId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  // 4. Tampilkan panel yang sesuai secara eksklusif
  const activePanel = document.getElementById(tabId);
  if (activePanel) {
    activePanel.classList.add('active');
    activePanel.style.display = 'block';
  }

  if (tabId === 'tabBbm' && typeof renderAdminBbmTable === 'function') {
    renderAdminBbmTable();
  } else if (tabId === 'tabMarkets' && typeof window.initAdminMarkets === 'function') {
    window.initAdminMarkets();
  } else if (tabId === 'tabLpgMonitoring' && typeof window.initAdminLpgMonitoring === 'function') {
    window.initAdminLpgMonitoring();
  }

  // 5. Perbarui judul header
  const titleEl = document.getElementById('adminCurrentTabTitle');
  if (titleEl && activeBtn) {
    titleEl.textContent = activeBtn.textContent.trim();
  }

  // 6. Tutup mobile drawer jika sedang terbuka di layar kecil
  if (typeof toggleMobileSidebar === 'function') {
    toggleMobileSidebar(false);
  }

  // 7. Reset scroll posisi ke atas
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const mainEl = document.querySelector('.admin-main');
  if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
};

// 1. STATISTIK DASHBOARD
function renderDashboardStats() {
  const rawPrices = getStorage('disperindag_prices', typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []);
  const prices = Array.isArray(rawPrices) ? rawPrices : (typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []);
  
  const rawNews = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
  const news = Array.isArray(rawNews) ? rawNews : [];

  const rawDocs = getStorage('disperindag_documents', typeof DEFAULT_DOCUMENTS !== 'undefined' ? DEFAULT_DOCUMENTS : []);
  const docs = Array.isArray(rawDocs) ? rawDocs : [];

  const rawIkm = getStorage('disperindag_products_ikm', typeof DEFAULT_PRODUCTS_IKM !== 'undefined' ? DEFAULT_PRODUCTS_IKM : []);
  const ikm = Array.isArray(rawIkm) ? rawIkm : [];

  const rawBbm = typeof BbmEngine !== 'undefined' ? BbmEngine.getAll() : [];
  const bbm = Array.isArray(rawBbm) ? rawBbm : [];

  if (document.getElementById('statPriceCount')) document.getElementById('statPriceCount').textContent = prices.length;
  if (document.getElementById('statNewsCount')) document.getElementById('statNewsCount').textContent = news.length;
  if (document.getElementById('statDocCount')) document.getElementById('statDocCount').textContent = docs.length;
  if (document.getElementById('statIkmCount')) document.getElementById('statIkmCount').textContent = ikm.length;
  if (document.getElementById('statBbmCount')) document.getElementById('statBbmCount').textContent = bbm.length;
}

// ==============================================================================
// 2. MODUL HARGA BAHAN POKOK - INTEGRASI SP2KP KEMENDAG & CONTROLLED OVERRIDE
// ==============================================================================
let sp2kpLatestCache = [];
let sp2kpOverridesCache = {};
let sp2kpSearchKeyword = '';
let lastSp2kpManualSyncTime = 0;

function initAdminSp2kpPrices() {
  if (typeof db !== 'undefined' && db !== null) {
    try {
      // 1. Real-time listener data harga SP2KP terbaru
      db.collection('market_prices_latest').onSnapshot(snapshot => {
        if (!snapshot.empty) {
          const items = [];
          snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
          sp2kpLatestCache = items.sort((a, b) => (Number(a.sp2kpCommodityId || 0) - Number(b.sp2kpCommodityId || 0)));
          renderAdminSp2kpTable();
          updateSp2kpStats();
        }
      }, err => {
        console.warn("Firestore market_prices_latest snapshot error:", err);
      });

      // 2. Real-time listener controlled local overrides
      db.collection('price_overrides').onSnapshot(snapshot => {
        const overrides = {};
        snapshot.forEach(doc => {
          overrides[doc.id] = { id: doc.id, ...doc.data() };
        });
        sp2kpOverridesCache = overrides;
        renderAdminSp2kpTable();
        updateSp2kpStats();
      }, err => {
        console.warn("Firestore price_overrides snapshot error:", err);
      });
    } catch(e) {
      console.warn("SP2KP Firestore Init Exception:", e);
    }
  }

  // CMS tidak menggunakan seed/localStorage sebagai pengganti snapshot SP2KP.
  renderAdminSp2kpTable();
  updateSp2kpStats();
}

function updateSp2kpStats() {
  const dateEl = document.getElementById('sp2kpStatDataDate');
  const countEl = document.getElementById('sp2kpStatTotalItems');
  const overrideCountEl = document.getElementById('sp2kpStatOverrideCount');
  const syncEl = document.getElementById('sp2kpStatLastSync');
  const statDashPrice = document.getElementById('statPriceCount');

  let activeOverrideCount = 0;
  let latestDataDate = '-';
  let latestSyncIso = null;

  sp2kpLatestCache.forEach(item => {
    const override = sp2kpOverridesCache[item.variantId || item.id];
    if (typeof PriceResolver !== 'undefined') {
      const resolved = PriceResolver.resolveEffectivePrice(item, override);
      if (resolved.isOverridden) activeOverrideCount++;
    } else if (override && override.status === 'active') {
      activeOverrideCount++;
    }

    if (item.dataDate && item.dataDate !== '-') {
      latestDataDate = item.dataDate;
    }
    if (item.syncedAt) {
      latestSyncIso = item.syncedAt;
    }
  });

  if (dateEl) {
    if (latestDataDate && latestDataDate.includes('-')) {
      const parts = latestDataDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        dateEl.textContent = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      } else {
        dateEl.textContent = latestDataDate;
      }
    } else {
      dateEl.textContent = latestDataDate || '28 Agustus 2026';
    }
  }

  if (countEl) countEl.textContent = `${sp2kpLatestCache.length} Komoditas`;
  if (overrideCountEl) overrideCountEl.textContent = `${activeOverrideCount} Item Aktif`;
  if (statDashPrice) statDashPrice.textContent = sp2kpLatestCache.length;

  if (syncEl) {
    if (latestSyncIso) {
      try {
        const syncDate = new Date(latestSyncIso);
        syncEl.textContent = syncDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA (' + syncDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ')';
      } catch(e) {
        syncEl.textContent = 'Otomatis SP2KP';
      }
    } else {
      syncEl.textContent = 'Otomatis SP2KP Kemendag';
    }
  }
}

function renderAdminSp2kpTable() {
  const tbody = document.getElementById('adminSp2kpTableBody');
  if (!tbody) return;

  if (!sp2kpLatestCache || sp2kpLatestCache.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: #64748B; padding: 32px 16px;">
          <div style="font-size: 1.5rem; margin-bottom: 6px;">📊</div>
          <strong>Belum ada data harga SP2KP termuat.</strong><br>
          <small>Tekan tombol "Sinkronkan Harga SP2KP Sekarang" di atas untuk memuat data.</small>
        </td>
      </tr>
    `;
    return;
  }

  let filtered = sp2kpLatestCache;
  if (sp2kpSearchKeyword) {
    const q = sp2kpSearchKeyword.toLowerCase();
    filtered = sp2kpLatestCache.filter(item => 
      (item.commodityName || item.commodity_name || '').toLowerCase().includes(q) ||
      (item.variantName || '').toLowerCase().includes(q) ||
      (item.variantId || item.id || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: #64748B; padding: 24px;">
          Tidak ada komoditas yang sesuai dengan kata kunci "<strong>${sp2kpSearchKeyword}</strong>".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const vId = item.variantId || item.sp2kpCommodityId || item.id;
    const vIdStr = String(vId);
    const override = sp2kpOverridesCache[vIdStr] || sp2kpOverridesCache[item.id] || sp2kpOverridesCache[item.variantId];
    
    let resolved = null;
    if (typeof PriceResolver !== 'undefined') {
      resolved = PriceResolver.resolveEffectivePrice(item, override);
    } else {
      const sourcePrice = Number(item.sourcePrice || item.price || 0);
      const isOverridden = !!(override && override.status === 'active');
      const effectivePrice = isOverridden ? Number(override.overridePrice || 0) : sourcePrice;
      resolved = {
        effectivePrice,
        effectiveFormatted: effectivePrice > 0 ? 'Rp ' + effectivePrice.toLocaleString('id-ID') : 'Belum Tersedia',
        sourceFormatted: sourcePrice > 0 ? 'Rp ' + sourcePrice.toLocaleString('id-ID') : 'Belum Tersedia',
        isOverridden,
        diff: Number(item.delta || item.diff || 0),
        trend: Number(item.delta || item.diff || 0) > 0 ? 'up' : (Number(item.delta || item.diff || 0) < 0 ? 'down' : 'stable')
      };
    }

    const name = item.commodityName || item.commodity_name || 'Komoditas';
    const unit = item.unit || 'kg';
    const rawSource = Number(item.sourcePrice || item.price || 0);
    const sourceFmt = rawSource > 0 ? ('Rp ' + rawSource.toLocaleString('id-ID')) : '<span style="color: #94A3B8; font-style: italic; font-size: 0.78rem;">Belum Tersedia</span>';
    const effectiveDisplay = resolved.effectiveFormatted || (resolved.effectivePrice > 0 ? ('Rp ' + Number(resolved.effectivePrice).toLocaleString('id-ID')) : '<span style="color: #94A3B8; font-style: italic; font-size: 0.78rem;">Belum Tersedia</span>');
    const diffVal = Number(item.delta || resolved.diff || 0);

    let trendBadge = `<span class="trend-badge stable" style="font-size: 0.74rem;">— Tetap</span>`;
    if (diffVal > 0) {
      trendBadge = `<span class="trend-badge up" style="font-size: 0.74rem;">▲ +${diffVal.toLocaleString('id-ID')}</span>`;
    } else if (diffVal < 0) {
      trendBadge = `<span class="trend-badge down" style="font-size: 0.74rem;">▼ ${diffVal.toLocaleString('id-ID')}</span>`;
    }

    let sourceBadge = `
      <span style="display: inline-flex; align-items: center; gap: 5px; background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 0.72rem; font-weight: 800; padding: 4px 10px; border-radius: 999px; white-space: nowrap;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span> SP2KP Kemendag
      </span>
    `;

    if (resolved.isOverridden) {
      sourceBadge = `
        <span style="display: inline-flex; align-items: center; gap: 5px; background: #FEF3C7; border: 1px solid #FCD34D; color: #92400E; font-size: 0.72rem; font-weight: 800; padding: 4px 10px; border-radius: 999px; white-space: nowrap;" title="${override ? (override.reason || 'Koreksi Administratif') : 'Koreksi Administratif'}">
          <span>⚖️</span> Local Override
        </span>
      `;
    }

    return `
      <tr style="${resolved.isOverridden ? 'background: #FFFBEB;' : ''}">
        <td style="font-weight: 800; color: #64748B; font-size: 0.82rem; white-space: nowrap; width: 65px; min-width: 65px; text-align: center;">
          #${item.sp2kpCommodityId || item.variantId || item.id}
        </td>
        <td>
          <strong style="color: #0F2C59; font-size: 0.90rem; display: block;">${name}</strong>
          ${item.market_name ? `<small style="color: #64748B; font-size: 0.74rem;">📍 ${item.market_name}</small>` : ''}
        </td>
        <td style="color: #475569; font-weight: 700; font-size: 0.84rem; white-space: nowrap; width: 75px; min-width: 75px; text-align: center;">
          /${unit}
        </td>
        <td style="color: #64748B; font-weight: 700; font-size: 0.86rem; white-space: nowrap; text-align: right;">
          ${sourceFmt}
        </td>
        <td style="white-space: nowrap; text-align: right;">
          <strong style="font-size: 0.98rem; color: ${resolved.isOverridden ? '#D97706' : '#1E40AF'}; font-family: 'JetBrains Mono', monospace, sans-serif;">
            ${effectiveDisplay}
          </strong>
          ${resolved.isOverridden ? `<br><small style="color: #B45309; font-size: 0.68rem; font-weight: 800; text-transform: uppercase;">(Koreksi Aktif)</small>` : ''}
        </td>
        <td style="white-space: nowrap; text-align: center;">
          ${trendBadge}
        </td>
        <td style="white-space: nowrap; text-align: center;">
          ${sourceBadge}
        </td>
        <td style="white-space: nowrap; text-align: center;">
          <button type="button" onclick="openSp2kpOverrideModal('${vId}')" class="btn-action-item ${resolved.isOverridden ? 'btn-action-view' : 'btn-action-edit'}" style="font-size: 0.78rem; padding: 6px 12px; font-weight: 800; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
            ${resolved.isOverridden ? '⚙️ Edit Koreksi' : '⚖️ Koreksi Lokal'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterSp2kpTable() {
  const input = document.getElementById('sp2kpSearchInput');
  sp2kpSearchKeyword = input ? input.value.trim() : '';
  renderAdminSp2kpTable();
}

window.triggerManualSp2kpSync = async function() {
  const now = Date.now();
  const cooldownMs = 60 * 1000; // 1 menit cooldown UI
  if (now - lastSp2kpManualSyncTime < cooldownMs) {
    const sisa = Math.ceil((cooldownMs - (now - lastSp2kpManualSyncTime)) / 1000);
    CustomModal.toast(`Mohon tunggu ${sisa} detik sebelum melakukan sinkronisasi ulang.`, "warning");
    return;
  }

  const btn = document.getElementById('btnSyncSp2kp');
  const icon = document.getElementById('syncSp2kpIcon');
  const text = document.getElementById('syncSp2kpText');

  if (icon) icon.textContent = '⏳';
  if (text) text.textContent = 'Menghubungi SP2KP Kemendag...';
  if (btn) btn.disabled = true;

  try {
    // Membaca koleksi terbaru dari Firestore
    if (typeof db !== 'undefined' && db !== null) {
      const snap = await db.collection('market_prices_latest').get();
      if (!snap.empty) {
        const items = [];
        snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        sp2kpLatestCache = items.sort((a, b) => (Number(a.sp2kpCommodityId || 0) - Number(b.sp2kpCommodityId || 0)));
        renderAdminSp2kpTable();
        updateSp2kpStats();
      }
    }
    lastSp2kpManualSyncTime = Date.now();
    logAdminActivity('Harga Bapok SP2KP', 'Penyegaran data harga bahan pokok dari SP2KP Kemendag RI.');
    CustomModal.toast("Data harga SP2KP Kabupaten Pinrang berhasil diperbarui secara real-time!", "success");
  } catch(e) {
    console.error("Manual sync error:", e);
    CustomModal.toast("Gagal melakukan sinkronisasi: " + e.message, "danger");
  } finally {
    if (icon) icon.textContent = '🔄';
    if (text) text.textContent = 'Sinkronkan Harga SP2KP Sekarang';
    if (btn) btn.disabled = false;
  }
};

window.openSp2kpOverrideModal = function(variantId) {
  if (variantId === undefined || variantId === null) return;
  const vIdStr = String(variantId).trim();

  const item = sp2kpLatestCache.find(p => 
    String(p.variantId) === vIdStr || 
    String(p.id) === vIdStr || 
    String(p.sp2kpCommodityId) === vIdStr ||
    String(p.id) === ('sp2kp_' + vIdStr)
  );

  if (!item) {
    console.warn("Item tidak ditemukan untuk variantId:", variantId, sp2kpLatestCache);
    CustomModal.toast("Komoditas tidak ditemukan di cache lokal.", "warning");
    return;
  }

  const modal = document.getElementById('modalSp2kpOverride');
  if (!modal) {
    console.error("Modal #modalSp2kpOverride tidak ditemukan di DOM!");
    return;
  }

  const vIdInput = document.getElementById('overrideVariantId');
  const commInput = document.getElementById('overrideCommodityName');
  const unitInput = document.getElementById('overrideUnit');
  const srcPriceInput = document.getElementById('overrideSourcePrice');

  const lblComm = document.getElementById('overrideLabelCommodity');
  const lblSrcPrice = document.getElementById('overrideLabelSourcePrice');

  const priceInp = document.getElementById('overridePriceInput');
  const reasonSel = document.getElementById('overrideReasonSelect');
  const otherWrap = document.getElementById('overrideOtherReasonWrap');
  const otherInp = document.getElementById('overrideOtherReasonInput');
  const evidenceInp = document.getElementById('overrideEvidenceInput');
  const expirySel = document.getElementById('overrideExpirySelect');
  const btnDel = document.getElementById('btnDeleteOverride');

  const vId = item.variantId || item.sp2kpCommodityId || item.id;
  const name = item.commodityName || item.commodity_name || 'Komoditas';
  const unit = item.unit || 'kg';
  const rawPrice = Number(item.sourcePrice || item.price || 0);

  if (vIdInput) vIdInput.value = vId;
  if (commInput) commInput.value = name;
  if (unitInput) unitInput.value = unit;
  if (srcPriceInput) srcPriceInput.value = rawPrice;

  if (lblComm) lblComm.textContent = `${name} (Satuan: ${unit})`;
  if (lblSrcPrice) lblSrcPrice.textContent = rawPrice > 0 ? `Rp ${rawPrice.toLocaleString('id-ID')} / ${unit}` : `Belum Tersedia / ${unit}`;

  // Periksa apakah override saat ini sudah aktif
  const existing = sp2kpOverridesCache[String(vId)] || sp2kpOverridesCache[item.id] || sp2kpOverridesCache[item.variantId];
  if (existing && existing.status === 'active') {
    if (priceInp) priceInp.value = existing.overridePrice || '';
    if (reasonSel) {
      const knownReasons = [
        'Hasil verifikasi lapangan pasar daerah',
        'Data SP2KP belum closing / belum diperbarui',
        'Kesalahan input enumerator SP2KP',
        'Perubahan kondisi pasokan pasar lokal',
        'Kesalahan konversi satuan'
      ];
      if (knownReasons.includes(existing.reason)) {
        reasonSel.value = existing.reason;
        if (otherWrap) otherWrap.style.display = 'none';
      } else {
        reasonSel.value = 'Lainnya';
        if (otherWrap) otherWrap.style.display = 'block';
        if (otherInp) otherInp.value = existing.reason || '';
      }
    }
    if (evidenceInp) evidenceInp.value = existing.evidenceRef || '';
    if (expirySel) expirySel.value = existing.expiryOption || '24h';
    if (btnDel) btnDel.style.display = 'inline-flex';
  } else {
    if (priceInp) priceInp.value = rawPrice > 0 ? rawPrice : '';
    if (reasonSel) reasonSel.value = 'Hasil verifikasi lapangan pasar daerah';
    if (otherWrap) otherWrap.style.display = 'none';
    if (otherInp) otherInp.value = '';
    if (evidenceInp) evidenceInp.value = 'BA Survei Tim Pengendalian Inflasi Daerah (TPID) Pinrang';
    if (expirySel) expirySel.value = '24h';
    if (btnDel) btnDel.style.display = 'none';
  }

  modal.style.display = 'flex';
};

window.closeSp2kpOverrideModal = function() {
  const modal = document.getElementById('modalSp2kpOverride');
  if (modal) modal.style.display = 'none';
};

window.handleOverrideReasonChange = function(val) {
  const wrap = document.getElementById('overrideOtherReasonWrap');
  if (wrap) {
    wrap.style.display = val === 'Lainnya' ? 'block' : 'none';
  }
};

window.handleSaveSp2kpOverride = async function(event) {
  event.preventDefault();
  const vId = document.getElementById('overrideVariantId').value;
  const name = document.getElementById('overrideCommodityName').value;
  const unit = document.getElementById('overrideUnit').value;
  const sourcePrice = Number(document.getElementById('overrideSourcePrice').value || 0);

  const priceInp = document.getElementById('overridePriceInput');
  const overridePrice = parseInt(priceInp.value, 10);
  if (isNaN(overridePrice) || overridePrice <= 0) {
    CustomModal.toast("Nominal harga koreksi harus berupa angka valid di atas 0.", "warning");
    return;
  }

  const reasonSel = document.getElementById('overrideReasonSelect').value;
  let reason = reasonSel;
  if (reasonSel === 'Lainnya') {
    const other = document.getElementById('overrideOtherReasonInput').value.trim();
    if (!other) {
      CustomModal.toast("Harap isi keterangan alasan koreksi.", "warning");
      return;
    }
    reason = other;
  }

  const evidence = document.getElementById('overrideEvidenceInput').value.trim();
  if (!evidence) {
    CustomModal.toast("Nomor Berita Acara atau Sumber Verifikasi wajib diisi.", "warning");
    return;
  }

  const expiryOption = document.getElementById('overrideExpirySelect').value;
  const now = new Date();
  let expiresAtIso = null;

  if (expiryOption === '24h') {
    expiresAtIso = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
  } else if (expiryOption === '48h') {
    expiresAtIso = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();
  } else if (expiryOption === 'end_of_day') {
    const eod = new Date(now);
    eod.setHours(23, 59, 59, 999);
    expiresAtIso = eod.toISOString();
  } else {
    expiresAtIso = null; // Manual expiry
  }

  const authSession = (typeof getSession === 'function' ? getSession() : null) || { name: 'Administrator', email: 'admin@pinrangkab.go.id' };

  const overrideDoc = {
    variantId: vId,
    commodityName: name,
    unit: unit,
    sourcePrice: sourcePrice,
    overridePrice: overridePrice,
    reason: reason,
    evidenceRef: evidence,
    expiryOption: expiryOption,
    expiresAt: expiresAtIso,
    status: 'active',
    appliedBy: authSession.name || authSession.email,
    appliedAt: now.toISOString()
  };

  const vIdStr = String(vId);

  // Simpan ke Firestore
  if (typeof db !== 'undefined' && db !== null) {
    try {
      await db.collection('price_overrides').doc(vIdStr).set(overrideDoc, { merge: true });
    } catch(err) {
      console.error("Firestore override write error:", err);
    }
  }

  // Update Cache Lokal
  sp2kpOverridesCache[vIdStr] = overrideDoc;
  renderAdminSp2kpTable();
  updateSp2kpStats();
  closeSp2kpOverrideModal();

  logAdminActivity('Koreksi Harga Bapok', `Koreksi lokal diterapkan untuk ${name}: Rp ${overridePrice.toLocaleString('id-ID')}/${unit}. Alasan: ${reason}. Bukti: ${evidence}`);
  CustomModal.toast(`Koreksi lokal untuk komoditas ${name} berhasil disimpan!`, "success");
};

window.handleDeleteSp2kpOverride = async function() {
  const vId = document.getElementById('overrideVariantId').value;
  const name = document.getElementById('overrideCommodityName').value;
  const vIdStr = String(vId);

  const confirmed = await CustomModal.confirm({
    title: "Cabut Koreksi Lokal?",
    message: `Apakah Anda yakin ingin mencabut koreksi harga untuk <strong>${name}</strong>? Harga publik akan otomatis kembali ke data resmi SP2KP Kemendag.`,
    confirmText: "Ya, Cabut Koreksi",
    cancelText: "Batal",
    type: "warning"
  });

  if (!confirmed) return;

  if (typeof db !== 'undefined' && db !== null) {
    try {
      await db.collection('price_overrides').doc(vIdStr).delete();
    } catch(err) {
      console.error("Firestore override delete error:", err);
    }
  }

  delete sp2kpOverridesCache[vIdStr];
  delete sp2kpOverridesCache[vId];
  renderAdminSp2kpTable();
  updateSp2kpStats();
  closeSp2kpOverrideModal();

  logAdminActivity('Pencabutan Koreksi Harga', `Koreksi lokal untuk ${name} telah dicabut. Harga kembali ke SP2KP Kemendag.`);
  CustomModal.toast(`Koreksi lokal untuk ${name} berhasil dicabut.`, "info");
};

// ==============================================================================
// 3. ENTERPRISE NEWSROOM & PUBLIKASI BERITA KEDINASAN (FULL CMS CRUD)
// ==============================================================================
let currentNewsTags = [];
let currentNewsGallery = [];
let currentFeaturedImage = "assets/news/operasi_pasar_murah_sembako_pinrang.jpg";
let currentFeaturedPreviewImage = currentFeaturedImage;
const pendingNewsMediaUploads = new Set();

function renderAdminNews(filterSearch = '', filterCat = '') {
  const tbody = document.getElementById('adminNewsTableBody');
  if (!tbody) return;

  const rawNews = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
  const allNews = typeof mergeNewsWithDefaults === 'function' ? mergeNewsWithDefaults(rawNews) : rawNews;
  
  // Update Statistik
  const totalCount = allNews.length;
  const publishedCount = allNews.filter(n => (n.status || 'published') === 'published').length;
  const draftCount = allNews.filter(n => n.status === 'draft').length;

  if (document.getElementById('newsStatTotal')) document.getElementById('newsStatTotal').textContent = totalCount;
  if (document.getElementById('newsStatPublished')) document.getElementById('newsStatPublished').textContent = publishedCount;
  if (document.getElementById('newsStatDraft')) document.getElementById('newsStatDraft').textContent = draftCount;
  if (document.getElementById('statNewsCount')) document.getElementById('statNewsCount').textContent = totalCount;

  // Filter Data
  const searchVal = (filterSearch || (document.getElementById('newsSearchInput')?.value || '')).toLowerCase().trim();
  const catVal = filterCat || (document.getElementById('newsCategoryFilter')?.value || '');

  const filteredNews = allNews.filter(item => {
    const matchSearch = !searchVal || 
      item.title.toLowerCase().includes(searchVal) || 
      (item.excerpt && item.excerpt.toLowerCase().includes(searchVal)) ||
      (item.topic_tag && item.topic_tag.toLowerCase().includes(searchVal)) ||
      (Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(searchVal)));
    const matchCat = !catVal || item.category === catVal;
    return matchSearch && matchCat;
  });

  if (filteredNews.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:32px; color:#64748B;">
          <div style="font-size: 2rem; margin-bottom: 8px;">📭</div>
          <strong>Tidak ada berita yang sesuai dengan filter atau pencarian.</strong>
          <div style="margin-top: 8px;">
            <button onclick="openNewsEditor()" class="btn-primary" style="font-size: 0.8rem; padding: 6px 14px; display: inline-flex; align-items: center; gap: 4px;">
              <span>➕</span> Tulis Berita Baru Sekarang
            </button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredNews.map(item => {
    const isDraft = item.status === 'draft';
    const isFeatured = !!item.is_featured;
    const tagList = Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : [item.topic_tag || 'Dinas'];
    const tagsHtml = tagList.slice(0, 3).map(t => `<span style="font-size:0.68rem; background:#F1F5F9; color:#475569; padding:2px 6px; border-radius:4px; border:1px solid #E2E8F0;">#${t.replace(/^#/, '')}</span>`).join(' ');

    return `
      <tr>
        <td style="text-align: center; width: 75px; vertical-align: top; padding-top: 14px;">
          <div style="position: relative; width: 62px; height: 46px; border-radius: 6px; overflow: hidden; border: 1px solid #CBD5E1; background: #030D1B; margin: 0 auto;">
            <img src="${item.img || 'assets/brand/cover_arsip_berita.png'}" style="width: 100%; height: 100%; object-fit: cover;" alt="Thumbnail" onerror="this.src='assets/brand/cover_arsip_berita.png'">
            ${isFeatured ? '<span style="position:absolute; bottom:2px; right:2px; font-size:0.65rem;" title="Berita Sorotan Beranda">🌟</span>' : ''}
          </div>
        </td>
        <td style="vertical-align: top;">
          <div style="font-weight: 800; color: var(--admin-navy-deep); line-height: 1.35; margin-bottom: 4px; font-size: 0.94rem;">
            ${item.title}
            ${isFeatured ? '<span style="font-size:0.70rem; margin-left: 6px; background: #FEF3C7; color: #92400E; padding: 2px 6px; border-radius: 4px; border: 1px solid #FCD34D; font-weight: 800; display: inline-flex; align-items: center; gap: 2px;">🌟 Sorotan</span>' : ''}
          </div>
          <div style="font-size: 0.78rem; color: #64748B; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 8px;">
            ${item.excerpt || item.content?.slice(0, 130) || '—'}
          </div>
          <!-- BARIS TOMBOL AKSI BERJEJER DI BAWAH JUDUL BERITA -->
          <div class="news-inline-action-bar">
            <button type="button" onclick="openNewsEditor('${item.id}')" class="btn-action-item btn-action-edit" title="Sunting Berita (WYSIWYG)">
              <span>✏️</span> Edit
            </button>
            <a href="berita.html?id=${encodeURIComponent(item.id)}" target="_blank" class="btn-action-item btn-action-view" title="Buka Pratinjau Rilis Berita Real-Time">
              <span>👁️</span> Pratinjau
            </a>
            <button type="button" onclick="copyNewsPublicLink('${item.slug || item.id}', '${(item.title || '').replace(/'/g, "\\'")}')" class="btn-action-item" style="background:#EFF6FF; color:#1E40AF; border: 1px solid #BFDBFE;" title="Salin Tautan Medsos (WhatsApp/FB)">
              <span>🔗</span> Link
            </button>
            <button type="button" onclick="toggleNewsStatus('${item.id}')" class="btn-action-item" style="${isDraft ? 'background:#ECFDF5; color:#065F46; border: 1px solid #A7F3D0;' : 'background:#FEF3C7; color:#92400E; border: 1px solid #FCD34D;'}" title="${isDraft ? 'Publikasikan Berita Ini' : 'Tarik ke Draf'}">
              <span>${isDraft ? '🚀' : '📦'}</span> ${isDraft ? 'Terbitkan' : 'Draf'}
            </button>
            <button type="button" onclick="deleteAdminNews('${item.id}')" class="btn-action-item btn-action-delete" title="Hapus Berita">
              <span>🗑️</span> Hapus
            </button>
          </div>
        </td>
        <td style="vertical-align: top; padding-top: 14px;">
          <div style="margin-bottom: 6px;">
            <span class="badge-cat" style="font-size: 0.74rem;">${item.category || 'Umum'}</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${tagsHtml}
          </div>
        </td>
        <td style="vertical-align: top; padding-top: 14px;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #1E293B;">${item.date || '—'}</div>
          <div style="font-size: 0.72rem; color: #64748B; margin-top: 3px;">👤 ${item.author || 'Humas'}</div>
        </td>
        <td style="vertical-align: top; padding-top: 14px; text-align: center;">
          <span class="news-status-pill ${isDraft ? 'status-draft' : 'status-published'}">
            ${isDraft ? '📝 Draf' : '● Live'}
          </span>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAdminNews() {
  renderAdminNews();
}

function resetNewsFilter() {
  if (document.getElementById('newsSearchInput')) document.getElementById('newsSearchInput').value = '';
  if (document.getElementById('newsCategoryFilter')) document.getElementById('newsCategoryFilter').value = '';
  renderAdminNews();
}

// TOGGLE PUBLICATION STATUS (PUBLISHED <-> DRAFT)
window.toggleNewsStatus = async function(id) {
  let allNews = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
  allNews = deduplicateNewsList(allNews);
  
  const idx = allNews.findIndex(n => n.id === id);
  if (idx === -1) return;

  const currentStatus = allNews[idx].status || 'published';
  const newStatus = currentStatus === 'published' ? 'draft' : 'published';
  allNews[idx].status = newStatus;
  allNews[idx].updated_at = new Date().toISOString();
  if (newStatus === 'published' && !allNews[idx].published_at) {
    allNews[idx].published_at = allNews[idx].updated_at;
  }

  setStorage('disperindag_news', allNews);
  renderAdminNews();

  // Sinkronisasi ke Firestore
  if (typeof db !== 'undefined' && db !== null) {
    try {
      db.collection('news').doc(id).set(allNews[idx], { merge: true }).catch(() => {});
    } catch(e) {}
  }

  const label = newStatus === 'published' ? 'diterbitkan secara publik (Live)' : 'dialihkan ke status Draf (arsip internal)';
  CustomModal.toast(`Status berita "${allNews[idx].title?.slice(0, 30)}..." berhasil ${label}.`, "success");
};

// DELETE ADMIN NEWS (HAPUS BERITA PERMANEN)
window.deleteAdminNews = async function(id) {
  let allNews = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
  allNews = deduplicateNewsList(allNews);
  
  const targetNews = allNews.find(n => n.id === id);
  if (!targetNews) return;

  const confirmed = await CustomModal.confirm({
    title: "Konfirmasi Hapus Berita",
    message: `Apakah Anda yakin ingin menghapus rilis berita berikut secara permanen?<br><br><strong>"${targetNews.title}"</strong><br><br><span style="color:#DC2626; font-size:0.8rem; font-weight:700;">⚠️ Tindakan ini akan menghapus berita dari portal publik, database cloud, dan banner sorotan.</span>`,
    confirmText: "Ya, Hapus Permanen",
    cancelText: "Batal",
    type: "danger",
    icon: "🗑️"
  });

  if (!confirmed) return;

  // 1. Simpan ke daftar ID Terhapus (Tombstone Tracking)
  let deletedIds = [];
  try {
    const rawDeleted = localStorage.getItem('disperindag_deleted_news_ids');
    if (rawDeleted) deletedIds = JSON.parse(rawDeleted);
  } catch(e) {}
  if (!deletedIds.includes(id)) {
    deletedIds.push(id);
    localStorage.setItem('disperindag_deleted_news_ids', JSON.stringify(deletedIds));
  }
  // 2. Hapus dari LocalStorage Berita
  const updatedList = allNews.filter(n => n.id !== id);
  setStorage('disperindag_news', updatedList);

  // 3. Hapus dari Banner jika artikel ini adalah headline
  let banners = getStorage('disperindag_banners', typeof DEFAULT_BANNERS !== 'undefined' ? DEFAULT_BANNERS : []);
  const bannerIdx = banners.findIndex(b => b.target_news_id === id || b.title === targetNews.title);
  if (bannerIdx !== -1) {
    banners.splice(bannerIdx, 1);
    setStorage('disperindag_banners', banners);
    if (typeof renderAdminBanners === 'function') renderAdminBanners();
    if (typeof db !== 'undefined' && db !== null) {
      try {
        db.collection('settings').doc('banners').set({ list: banners }, { merge: true }).catch(() => {});
      } catch(e) {}
    }
  }

  // 4. Hapus Dokumen dan Sinkronkan Deleted Ids ke Cloud Firestore
  if (typeof db !== 'undefined' && db !== null) {
    try {
      db.collection('news').doc(id).delete()
        .then(() => console.log("Firestore News Deleted:", id))
        .catch(err => console.warn("Firestore Delete Warning:", err));
      
      db.collection('settings').doc('deleted_news').set({ list: deletedIds }, { merge: true }).catch(() => {});
    } catch(e) {}
  }

  // 5. Log Aktivitas & Render Ulang
  logAdminActivity('Berita Kedinasan', `Menghapus rilis berita: ${targetNews.title}`);
  renderAdminNews();
  CustomModal.toast(`Berita "${targetNews.title.slice(0, 35)}..." berhasil dihapus secara permanen.`, "success");
};

// EXPORT NEWS DATA (JSON BACKUP)
window.exportNewsDataJson = function() {
  const allNews = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
  const cleanList = deduplicateNewsList(allNews);
  const jsonStr = JSON.stringify(cleanList, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `disperindag_news_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  CustomModal.toast(`Data ${cleanList.length} artikel berita berhasil diekspor ke file JSON.`, "success");
};

// COPY PUBLIC NEWS LINK
window.copyNewsPublicLink = function(slugOrId, title) {
  const url = `https://disperindagesdm-pinrang.web.app/berita/${slugOrId}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    CustomModal.alert({
      title: "Tautan Berita Disalin",
      message: `Tautan publik untuk artikel <strong>"${title}"</strong> telah disalin ke papan klip:<br><br><code style="background:#F1F5F9; padding:6px 10px; border-radius:6px; font-size:0.85rem; word-break:break-all; display:block; border:1px solid #CBD5E1; color:#0F2C59;">${url}</code><br><small style="color:#059669; font-weight:700;">✓ Siap dibagikan ke WhatsApp, Facebook, dan X dengan Pratinjau Foto Utama & Meta Resmi.</small>`,
      icon: "📋",
      type: "info"
    });
  }
};

// SLUG STRING GENERATOR
function generateSlugString(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

window.autoGenerateSlug = function(title) {
  const slug = generateSlugString(title);
  const slugInput = document.getElementById('newsSlugInput');
  if (slugInput) slugInput.value = slug;
  return slug;
};

// SIDEBAR STATUS BADGE
window.updateSidebarStatusBadge = function(status) {
  const badge = document.getElementById('sidebarStatusBadge');
  if (!badge) return;
  if (status === 'draft') {
    badge.className = 'badge badge-draft';
    badge.textContent = 'Draf';
  } else {
    badge.className = 'badge badge-published';
    badge.textContent = 'Live';
  }
};

// REALTIME SOCIAL SHARE OPEN GRAPH PREVIEW
window.updateLiveSocialPreview = function() {
  const titleInp = document.getElementById('newsTitleInput');
  const excerptInp = document.getElementById('newsExcerptInput');
  
  const title = (titleInp && titleInp.value.trim()) 
    ? titleInp.value.trim() 
    : "Judul Rilis Berita Resmi Kedinasan Disperindag ESDM Pinrang";
    
  const desc = (excerptInp && excerptInp.value.trim()) 
    ? excerptInp.value.trim() 
    : "Ringkasan rilis berita resmi untuk pratinjau media sosial...";

  const img = currentFeaturedPreviewImage || currentFeaturedImage || "assets/news/operasi_pasar_murah_sembako_pinrang.jpg";

  // 1. Update Facebook / X Card Preview
  const fbImg = document.getElementById('ogPreviewImg');
  const fbTitle = document.getElementById('ogPreviewTitle');
  const fbDesc = document.getElementById('ogPreviewDesc');
  if (fbImg) fbImg.src = img;
  if (fbTitle) fbTitle.textContent = title;
  if (fbDesc) fbDesc.textContent = desc;

  // 2. Update WhatsApp Bubble Preview
  const waImg = document.getElementById('ogPreviewImgWA');
  const waTitle = document.getElementById('ogPreviewTitleWA');
  const waDesc = document.getElementById('ogPreviewDescWA');
  if (waImg) waImg.src = img;
  if (waTitle) waTitle.textContent = title;
  if (waDesc) waDesc.textContent = desc;
};

window.switchSocialPreview = function(platform) {
  const cardFB = document.getElementById('socialCardFB');
  const cardWA = document.getElementById('socialCardWA');
  const btnFB = document.getElementById('btnPreviewFB');
  const btnWA = document.getElementById('btnPreviewWA');

  if (platform === 'facebook') {
    if (cardFB) cardFB.style.display = 'block';
    if (cardWA) cardWA.style.display = 'none';
    if (btnFB) btnFB.classList.add('active');
    if (btnWA) btnWA.classList.remove('active');
  } else {
    if (cardFB) cardFB.style.display = 'none';
    if (cardWA) cardWA.style.display = 'block';
    if (btnFB) btnFB.classList.remove('active');
    if (btnWA) btnWA.classList.add('active');
  }
};

// OPEN EDITOR (CREATE OR EDIT MODE)
window.openNewsEditor = function(newsId = null) {
  const headerCard = document.getElementById('newsHeaderCard');
  const listView = document.getElementById('newsListView');
  const editorView = document.getElementById('newsEditorView');
  const btnOpen = document.getElementById('btnOpenNewsEditor');
  const btnClose = document.getElementById('btnCloseNewsEditor');
  const formTitle = document.getElementById('newsEditorFormTitle');

  if (headerCard) headerCard.style.display = 'none';
  if (listView) listView.style.display = 'none';
  if (editorView) editorView.style.display = 'block';
  if (btnOpen) btnOpen.style.display = 'none';
  if (btnClose) btnClose.style.display = 'inline-flex';

  // Reset State
  currentNewsTags = [];
  currentNewsGallery = [];
  currentFeaturedImage = "assets/news/operasi_pasar_murah_sembako_pinrang.jpg";
  currentFeaturedPreviewImage = currentFeaturedImage;

  if (newsId) {
    // Mode EDIT
    const allNews = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
    const item = allNews.find(n => n.id === newsId);
    if (item) {
      if (formTitle) formTitle.innerHTML = `✏️ Sunting Berita: <span style="color:#1E40AF;">${(item.title || '').slice(0, 45)}...</span>`;
      document.getElementById('newsEditId').value = item.id;
      document.getElementById('newsTitleInput').value = item.title || '';
      
      const resolvedSlug = item.slug || generateSlugString(item.title || '');
      document.getElementById('newsSlugInput').value = resolvedSlug;
      
      document.getElementById('newsCategorySelect').value = item.category || 'Perindustrian, Energi & SDM';
      document.getElementById('newsDateInput').value = item.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      document.getElementById('newsAuthorInput').value = item.author || 'Humas Disperindag ESDM Pinrang';
      document.getElementById('newsExcerptInput').value = item.excerpt || '';
      
      const rawContent = item.content || '';
      document.getElementById('newsContentInput').value = rawContent;
      const visualCanvas = document.getElementById('newsVisualCanvas');
      if (visualCanvas) {
        let renderedHtml = rawContent;
        if (!rawContent.includes('<') && !rawContent.includes('>')) {
          renderedHtml = rawContent.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
        }
        visualCanvas.innerHTML = renderedHtml;
      }

      document.getElementById('newsStatusSelect').value = item.status || 'published';
      updateSidebarStatusBadge(item.status || 'published');
      document.getElementById('newsIsFeaturedCheckbox').checked = !!item.is_featured;

      currentFeaturedImage = item.img || "assets/news/operasi_pasar_murah_sembako_pinrang.jpg";
      currentFeaturedPreviewImage = currentFeaturedImage;
      document.getElementById('newsFeaturedImageResult').value = currentFeaturedImage;
      document.getElementById('newsFeaturedPreviewImg').src = currentFeaturedImage;
      document.getElementById('newsFeaturedCaptionInput').value = item.image_caption || 'Dokumentasi resmi liputan kegiatan Disperindag ESDM Pinrang.';

      currentNewsTags = Array.isArray(item.tags) ? [...item.tags] : (item.topic_tag ? [item.topic_tag] : ['Dinas']);
      currentNewsGallery = Array.isArray(item.gallery) ? [...item.gallery] : [];
    }
  } else {
    // Mode CREATE
    if (formTitle) formTitle.innerHTML = `✍️ Studio Berita &amp; Siaran Pers Baru`;
    document.getElementById('newsEditId').value = '';
    document.getElementById('newsTitleInput').value = '';
    document.getElementById('newsSlugInput').value = '';
    document.getElementById('newsCategorySelect').value = 'Perindustrian, Energi & SDM';
    document.getElementById('newsDateInput').value = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('newsAuthorInput').value = 'Humas Disperindag ESDM Pinrang';
    document.getElementById('newsExcerptInput').value = '';
    document.getElementById('newsContentInput').value = '';
    const visualCanvas = document.getElementById('newsVisualCanvas');
    if (visualCanvas) visualCanvas.innerHTML = '';
    document.getElementById('newsStatusSelect').value = 'published';
    updateSidebarStatusBadge('published');
    document.getElementById('newsIsFeaturedCheckbox').checked = false;

    currentFeaturedImage = "assets/news/operasi_pasar_murah_sembako_pinrang.jpg";
    currentFeaturedPreviewImage = currentFeaturedImage;
    document.getElementById('newsFeaturedImageResult').value = currentFeaturedImage;
    document.getElementById('newsFeaturedPreviewImg').src = currentFeaturedImage;
    document.getElementById('newsFeaturedCaptionInput').value = 'Dokumentasi resmi liputan kegiatan Disperindag ESDM Pinrang.';

    currentNewsTags = ['Pasar Murah', 'Bapokting'];
    currentNewsGallery = [];
  }

  // Pasang live listener judul & excerpt untuk realtime social OG card preview
  const titleInp = document.getElementById('newsTitleInput');
  const excerptInp = document.getElementById('newsExcerptInput');
  if (titleInp) titleInp.oninput = function() {
    autoGenerateSlug(this.value);
    updateLiveSocialPreview();
  };
  if (excerptInp) excerptInp.oninput = updateLiveSocialPreview;

  renderNewsTagChips();
  renderNewsGalleryGrid();
  syncVisualToRaw();
  updateLiveSocialPreview();
  switchEditorMode('visual');

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.closeNewsEditor = function() {
  const headerCard = document.getElementById('newsHeaderCard');
  const listView = document.getElementById('newsListView');
  const editorView = document.getElementById('newsEditorView');
  const btnOpen = document.getElementById('btnOpenNewsEditor');
  const btnClose = document.getElementById('btnCloseNewsEditor');

  if (headerCard) headerCard.style.display = 'flex';
  if (listView) listView.style.display = 'block';
  if (editorView) editorView.style.display = 'none';
  if (btnOpen) btnOpen.style.display = 'inline-flex';
  if (btnClose) btnClose.style.display = 'none';

  renderAdminNews();
};

// TAGS CHIP SYSTEM
function renderNewsTagChips() {
  const container = document.getElementById('newsTagChips');
  const hiddenInput = document.getElementById('newsTagHidden');
  if (!container) return;

  container.innerHTML = currentNewsTags.map((tag, idx) => `
    <span class="tag-badge-chip">
      #${tag}
      <span class="tag-remove-btn" onclick="removeNewsTag(${idx})">&times;</span>
    </span>
  `).join('');

  if (hiddenInput) hiddenInput.value = JSON.stringify(currentNewsTags);
}

window.addCurrentTag = function() {
  const input = document.getElementById('newsTagInput');
  if (!input) return;
  const val = input.value.replace(/^[#\s]+/, '').trim();
  if (val && !currentNewsTags.includes(val)) {
    currentNewsTags.push(val);
    renderNewsTagChips();
    input.value = '';
  }
};

window.handleTagInputKeydown = function(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    addCurrentTag();
  }
};

window.removeNewsTag = function(idx) {
  currentNewsTags.splice(idx, 1);
  renderNewsTagChips();
};

window.quickAddTag = function(tagName) {
  if (!currentNewsTags.includes(tagName)) {
    currentNewsTags.push(tagName);
    renderNewsTagChips();
  }
};

// MEDIA & IMAGE HANDLERS
window.selectArsipPhoto = function(path) {
  if (!path) return;
  currentFeaturedImage = path;
  currentFeaturedPreviewImage = path;
  document.getElementById('newsFeaturedImageResult').value = path;
  document.getElementById('newsFeaturedPreviewImg').src = path;
  updateLiveSocialPreview();
};

function validateNewsImageFile(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Gunakan foto JPG, PNG, atau WebP.');
  }
  if (file.size > 8 * 1024 * 1024) throw new Error('Ukuran foto sumber maksimal 8 MB.');
}

function compressNewsImage(file, maxWidth, quality, targetHeight = null) {
  return new Promise((resolve, reject) => {
    validateNewsImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let sourceX = 0, sourceY = 0, sourceWidth = image.naturalWidth, sourceHeight = image.naturalHeight;
      if (targetHeight) {
        const targetRatio = maxWidth / targetHeight;
        const sourceRatio = image.naturalWidth / image.naturalHeight;
        if (sourceRatio > targetRatio) {
          sourceWidth = Math.round(image.naturalHeight * targetRatio);
          sourceX = Math.round((image.naturalWidth - sourceWidth) / 2);
        } else {
          sourceHeight = Math.round(image.naturalWidth / targetRatio);
          sourceY = Math.round((image.naturalHeight - sourceHeight) / 2);
        }
        canvas.width = maxWidth;
        canvas.height = targetHeight;
      } else {
        const scale = Math.min(1, maxWidth / image.naturalWidth);
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      }
      const context = canvas.getContext('2d');
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Kompresi foto gagal.')), 'image/jpeg', quality);
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Berkas foto tidak dapat dibaca.')); };
    image.src = objectUrl;
  });
}

async function uploadNewsImageFile(file, purpose, maxWidth, quality) {
  const targetHeight = purpose === 'utama' ? 630 : null;
  const blob = await compressNewsImage(file, maxWidth, quality, targetHeight);
  const slug = generateSlugString(document.getElementById('newsSlugInput')?.value || document.getElementById('newsTitleInput')?.value || 'berita');
  const safeBase = String(file.name || 'foto').replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'foto';
  const suffix = purpose === 'utama' ? 'og' : `galeri-${Date.now().toString(36)}`;
  const fileName = `${slug || 'berita'}-${suffix}-${safeBase}.jpg`;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return { path:`assets/news/${fileName}`, previewUrl:objectUrl, bytes:blob.size };
}

function trackNewsMediaUpload(promise) {
  pendingNewsMediaUploads.add(promise);
  promise.finally(() => pendingNewsMediaUploads.delete(promise));
  return promise;
}

window.handleFeaturedImageUpload = function(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const preview = document.getElementById('newsFeaturedPreviewImg');
  const temporaryUrl = URL.createObjectURL(file);
  if (preview) preview.src = temporaryUrl;
  const task = uploadNewsImageFile(file, 'utama', 1200, 0.80).then(result => {
    URL.revokeObjectURL(temporaryUrl);
    currentFeaturedImage = result.path;
    currentFeaturedPreviewImage = result.previewUrl;
    document.getElementById('newsFeaturedImageResult').value = result.path;
    if (preview) preview.src = result.previewUrl;
    updateLiveSocialPreview();
    CustomModal.alert({
      title:'Foto Utama Siap Dipublikasikan',
      message:`Berkas JPEG 1200×630 telah diunduh (${Math.ceil(result.bytes / 1024)} KB). Tempatkan berkas tersebut di folder <code>assets/news</code>, lalu deploy portal. Path artikel sudah disiapkan: <code>${result.path}</code>.`,
      icon:'🖼️', type:'info'
    });
  }).catch(error => {
    URL.revokeObjectURL(temporaryUrl);
    if (preview) preview.src = currentFeaturedImage;
    CustomModal.alert({ title:'Foto Belum Terunggah', message:error.message, icon:'⚠️', type:'error' });
    return null;
  });
  trackNewsMediaUpload(task);
};

window.handleGalleryImagesUpload = function(input) {
  if (!input.files || input.files.length === 0) return;
  Array.from(input.files).forEach(file => {
    const task = uploadNewsImageFile(file, 'galeri', 1200, 0.78).then(result => {
      currentNewsGallery.push({ img:result.path, previewUrl:result.previewUrl, caption:`Dokumentasi kegiatan - ${file.name.replace(/\.[^/.]+$/, '')}` });
      renderNewsGalleryGrid();
    }).catch(error => {
      CustomModal.alert({ title:'Foto Galeri Belum Terunggah', message:`${file.name}: ${error.message}`, icon:'⚠️', type:'error' });
      return null;
    });
    trackNewsMediaUpload(task);
  });
};

function renderNewsGalleryGrid() {
  const grid = document.getElementById('newsGalleryGridAdmin');
  if (!grid) return;

  if (currentNewsGallery.length === 0) {
    grid.innerHTML = `<div style="font-size:0.75rem; color:#94A3B8; font-style:italic; grid-column:1/-1;">Belum ada foto galeri kegiatan tambahan.</div>`;
    return;
  }

  grid.innerHTML = currentNewsGallery.map((item, idx) => `
    <div class="news-gallery-thumb-item">
      <img src="${item.previewUrl || item.img}" alt="Galeri ${idx + 1}">
      <button type="button" class="news-gallery-remove" onclick="removeGalleryItem(${idx})" title="Hapus Foto">✕</button>
    </div>
  `).join('');
}

window.removeGalleryItem = function(idx) {
  currentNewsGallery.splice(idx, 1);
  renderNewsGalleryGrid();
};

// ==============================================================================
// WYSIWYG RICH TEXT STUDIO & VISUAL FORMATTING ENGINE
// ==============================================================================
let currentEditorMode = 'visual';

window.switchEditorMode = function(mode) {
  currentEditorMode = mode;
  const btnVisual = document.getElementById('tabModeVisual');
  const btnCode = document.getElementById('tabModeCode');
  const visualCanvas = document.getElementById('newsVisualCanvas');
  const rawInput = document.getElementById('newsContentInput');
  const toolbar = document.getElementById('newsVisualToolbar');

  if (mode === 'visual') {
    if (btnVisual) btnVisual.classList.add('active');
    if (btnCode) btnCode.classList.remove('active');
    if (visualCanvas) visualCanvas.style.display = 'block';
    if (rawInput) rawInput.style.display = 'none';
    if (toolbar) toolbar.style.display = 'flex';
    syncRawToVisual();
  } else {
    if (btnCode) btnCode.classList.add('active');
    if (btnVisual) btnVisual.classList.remove('active');
    if (rawInput) rawInput.style.display = 'block';
    if (visualCanvas) visualCanvas.style.display = 'none';
    if (toolbar) toolbar.style.display = 'none';
    syncVisualToRaw();
  }
};

window.execCmd = function(command, value = null) {
  const canvas = document.getElementById('newsVisualCanvas');
  if (!canvas) return;
  canvas.focus();
  document.execCommand(command, false, value);
  syncVisualToRaw();
};

window.applyBlockFormat = function(tag) {
  const canvas = document.getElementById('newsVisualCanvas');
  if (!canvas) return;
  canvas.focus();
  document.execCommand('formatBlock', false, `<${tag}>`);
  syncVisualToRaw();
};

window.insertOfficialQuote = async function() {
  const canvas = document.getElementById('newsVisualCanvas');
  if (!canvas) return;
  
  const quoteText = await CustomModal.prompt({
    title: "Kutipan Resmi Pimpinan / Pejabat",
    message: "Masukkan pernyataan atau kutipan resmi pejabat dinas:",
    defaultValue: "Pemerintah daerah berkomitmen penuh menjaga stabilitas harga pokok dan melindungi hak konsumen di seluruh wilayah Kabupaten Pinrang.",
    inputType: "textarea",
    icon: "💬",
    confirmText: "Sisipkan Kutipan"
  });

  if (quoteText === null || quoteText === undefined || !quoteText.trim()) return;

  const authorName = await CustomModal.prompt({
    title: "Nama & Jabatan Pejabat",
    message: "Masukkan nama dan jabatan resmi pejabat pembuat pernyataan:",
    defaultValue: "Muhammad Yusuf Nur, S.STP., M.Si. (Kepala Dinas Perindag ESDM Kabupaten Pinrang)",
    inputType: "text",
    icon: "✍️",
    confirmText: "Terapkan Pejabat"
  });

  const quoteHtml = `
    <blockquote class="pejabat-quote">
      "${quoteText.trim()}"
      <span class="quote-author">— ${authorName ? authorName.trim() : 'Kepala Dinas Perindag ESDM Pinrang'}</span>
    </blockquote>
    <p><br></p>
  `;

  canvas.focus();
  document.execCommand('insertHTML', false, quoteHtml);
  syncVisualToRaw();
};

window.insertDinasCallout = async function() {
  const canvas = document.getElementById('newsVisualCanvas');
  if (!canvas) return;

  const text = await CustomModal.prompt({
    title: "Kotak Informasi / Pengumuman Kedinasan",
    message: "Masukkan pesan informasi penting atau instruksi kedinasan:",
    defaultValue: "Masyarakat dihimbau untuk melapor ke nomor WhatsApp 0823 1600 2226 apabila menemukan pelanggaran HET di tingkat pangkalan resmi.",
    inputType: "textarea",
    icon: "ℹ️",
    confirmText: "Sisipkan Informasi"
  });

  if (!text || !text.trim()) return;

  const calloutHtml = `
    <div class="dinas-callout">
      <strong>📌 PENGUMUMAN / CATATAN KEDINASAN:</strong><br>
      ${text.trim()}
    </div>
    <p><br></p>
  `;

  canvas.focus();
  document.execCommand('insertHTML', false, calloutHtml);
  syncVisualToRaw();
};

window.insertEditorLink = async function() {
  const canvas = document.getElementById('newsVisualCanvas');
  if (!canvas) return;

  const url = await CustomModal.prompt({
    title: "Sisipkan Tautan Web",
    message: "Masukkan alamat URL tautan (contoh: https://pinrangkab.go.id):",
    defaultValue: "https://",
    inputType: "text",
    icon: "🔗",
    confirmText: "Sisipkan Tautan"
  });

  if (url && url !== "https://" && url.trim()) {
    execCmd('createLink', url.trim());
  }
};

window.insertInlineImageModal = async function() {
  const canvas = document.getElementById('newsVisualCanvas');
  if (!canvas) return;

  const imgUrl = await CustomModal.prompt({
    title: "Sisipkan Foto Sisipan Berita",
    message: "Pilih atau masukkan path URL foto (contoh: assets/news/operasi_pasar_murah_sembako_pinrang.jpg):",
    defaultValue: "assets/news/operasi_pasar_murah_sembako_pinrang.jpg",
    inputType: "text",
    icon: "🖼️",
    confirmText: "Sisipkan Foto"
  });

  if (!imgUrl || !imgUrl.trim()) return;

  const caption = await CustomModal.prompt({
    title: "Keterangan Foto (Caption)",
    message: "Masukkan keterangan dokumentasi foto:",
    defaultValue: "Dokumentasi kegiatan lapangan Disperindag ESDM Pinrang.",
    inputType: "text",
    icon: "📝",
    confirmText: "Terapkan Caption"
  });

  const figHtml = `
    <figure style="margin: 20px 0; text-align: center;">
      <img src="${imgUrl.trim()}" style="max-width: 100%; border-radius: 8px; border: 1px solid #CBD5E1;" alt="Dokumentasi">
      <figcaption style="font-size: 0.8rem; color: #64748B; margin-top: 6px; font-style: italic;">
        📷 ${caption ? caption.trim() : 'Dokumentasi kegiatan resmi.'}
      </figcaption>
    </figure>
    <p><br></p>
  `;

  canvas.focus();
  document.execCommand('insertHTML', false, figHtml);
  syncVisualToRaw();
};

window.insertDataTableModal = function() {
  const canvas = document.getElementById('newsVisualCanvas');
  if (!canvas) return;

  const tableHtml = `
    <table class="editor-table">
      <thead>
        <tr>
          <th>No</th>
          <th>Nama Komoditas / Sektor</th>
          <th>Harga / Capaian</th>
          <th>Keterangan</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>Beras Medium SPHP</td>
          <td>Rp 12.500 / Kg</td>
          <td>Stok Gudang Bulog Aman</td>
        </tr>
        <tr>
          <td>2</td>
          <td>Minyakita</td>
          <td>Rp 15.700 / Liter</td>
          <td>Sesuai HET Kemendag</td>
        </tr>
      </tbody>
    </table>
    <p><br></p>
  `;

  canvas.focus();
  document.execCommand('insertHTML', false, tableHtml);
  syncVisualToRaw();
};

// SINKRONISASI VISUAL CANVAS KE RAW TEXTAREA & LIVE STATS
window.syncVisualToRaw = function() {
  const visualCanvas = document.getElementById('newsVisualCanvas');
  const rawInput = document.getElementById('newsContentInput');
  if (!visualCanvas || !rawInput) return;

  rawInput.value = visualCanvas.innerHTML;
  updateEditorStats(visualCanvas.innerText || '');
  updateLiveSocialPreview();
};

window.syncRawToVisual = function() {
  const visualCanvas = document.getElementById('newsVisualCanvas');
  const rawInput = document.getElementById('newsContentInput');
  if (!visualCanvas || !rawInput) return;

  let val = rawInput.value || '';
  if (!val.includes('<') && !val.includes('>')) {
    val = val.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  }
  visualCanvas.innerHTML = val;
  updateEditorStats(visualCanvas.innerText || '');
  updateLiveSocialPreview();
};

function updateEditorStats(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const readMin = Math.max(1, Math.ceil(words / 200));

  const wordEl = document.getElementById('editorWordCount');
  const charEl = document.getElementById('editorCharCount');
  const readEl = document.getElementById('editorReadTime');

  if (wordEl) wordEl.innerHTML = `📊 <strong>${words.toLocaleString('id-ID')}</strong> Kata`;
  if (charEl) charEl.innerHTML = `📝 <strong>${chars.toLocaleString('id-ID')}</strong> Karakter`;
  if (readEl) readEl.innerHTML = `⏱️ <strong>~${readMin}</strong> Menit Baca`;
}

// LIVE SOCIAL OG PREVIEW
function updateLiveSocialPreview() {
  const title = document.getElementById('newsTitleInput')?.value?.trim() || 'Judul Rilis Berita Resmi Kedinasan Disperindag ESDM Pinrang';
  const excerpt = document.getElementById('newsExcerptInput')?.value?.trim() || 'Ringkasan rilis berita resmi untuk pratinjau media sosial...';
  const img = currentFeaturedPreviewImage || currentFeaturedImage || 'assets/news/operasi_pasar_murah_sembako_pinrang.jpg';

  const ogTitleFB = document.getElementById('ogPreviewTitle');
  const ogDescFB = document.getElementById('ogPreviewDesc');
  const ogImgFB = document.getElementById('ogPreviewImg');

  const ogTitleWA = document.getElementById('ogPreviewTitleWA');
  const ogDescWA = document.getElementById('ogPreviewDescWA');
  const ogImgWA = document.getElementById('ogPreviewImgWA');

  if (ogTitleFB) ogTitleFB.textContent = title;
  if (ogDescFB) ogDescFB.textContent = excerpt;
  if (ogImgFB) ogImgFB.src = img;

  if (ogTitleWA) ogTitleWA.textContent = title;
  if (ogDescWA) ogDescWA.textContent = excerpt;
  if (ogImgWA) ogImgWA.src = img;
}

window.switchSocialPreview = function(platform) {
  const cardFB = document.getElementById('socialCardFB');
  const cardWA = document.getElementById('socialCardWA');
  const btnFB = document.getElementById('btnPreviewFB');
  const btnWA = document.getElementById('btnPreviewWA');

  if (platform === 'facebook') {
    if (cardFB) cardFB.style.display = 'block';
    if (cardWA) cardWA.style.display = 'none';
    if (btnFB) btnFB.classList.add('active');
    if (btnWA) btnWA.classList.remove('active');
  } else {
    if (cardWA) cardWA.style.display = 'block';
    if (cardFB) cardFB.style.display = 'none';
    if (btnWA) btnWA.classList.add('active');
    if (btnFB) btnFB.classList.remove('active');
  }
};

// SAVE NEWS HANDLER (CREATE / UPDATE) - ROBUST ASYNC TRANSACTION
window.handleSaveNews = async function(overrideStatus = null) {
  if (pendingNewsMediaUploads.size) {
    CustomModal.toast('Menunggu unggahan foto selesai…', 'info');
    await Promise.all(Array.from(pendingNewsMediaUploads));
  }
  const editId = document.getElementById('newsEditId')?.value || '';
  const title = document.getElementById('newsTitleInput')?.value?.trim();
  const slug = document.getElementById('newsSlugInput')?.value?.trim();
  const category = document.getElementById('newsCategorySelect')?.value || 'Perindustrian, Energi & SDM';
  const date = document.getElementById('newsDateInput')?.value?.trim() || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const author = document.getElementById('newsAuthorInput')?.value?.trim() || 'Humas Disperindag ESDM Pinrang';
  const excerpt = document.getElementById('newsExcerptInput')?.value?.trim() || '';
  
  // Ambil konten dari visual canvas jika ada, atau dari raw input
  const visualCanvas = document.getElementById('newsVisualCanvas');
  const rawContent = (visualCanvas && visualCanvas.innerHTML.trim() !== '' && visualCanvas.innerHTML !== '<br>')
    ? visualCanvas.innerHTML.trim()
    : document.getElementById('newsContentInput')?.value?.trim();
  const content = typeof sanitizeNewsHtml === 'function' ? sanitizeNewsHtml(rawContent) : rawContent;

  const caption = document.getElementById('newsFeaturedCaptionInput')?.value?.trim() || 'Dokumentasi resmi liputan kegiatan Disperindag ESDM Pinrang.';
  const isFeatured = document.getElementById('newsIsFeaturedCheckbox')?.checked || false;
  const status = overrideStatus || document.getElementById('newsStatusSelect')?.value || 'published';

  const mediaUrls = [currentFeaturedImage, ...currentNewsGallery.map(item => item && item.img)];
  if (mediaUrls.some(url => typeof url === 'string' && url.startsWith('data:image'))) {
    CustomModal.alert({
      title: 'Foto Lama Perlu Diunggah Ulang',
      message: 'Artikel masih memuat foto dalam bentuk kode Base64. Pilih kembali foto tersebut agar tersimpan sebagai file media dan memperoleh URL publik.',
      icon: '⚠️', type: 'warning'
    });
    return;
  }
  if (status === 'published') {
    const localMedia = mediaUrls.filter(url => typeof url === 'string' && /^\/?assets\/news\//.test(url));
    const missingMedia = [];
    for (const mediaPath of localMedia) {
      try {
        const response = await fetch(`/${mediaPath.replace(/^\//, '')}`, { method:'HEAD', cache:'no-store' });
        if (!response.ok) missingMedia.push(mediaPath);
      } catch (_) {
        missingMedia.push(mediaPath);
      }
    }
    if (missingMedia.length) {
      CustomModal.alert({
        title:'Berkas Foto Belum Ada di Portal',
        message:`Artikel belum dapat diterbitkan karena ${missingMedia.length} berkas foto belum tersedia di Firebase Hosting.<br><br>Simpan sebagai <strong>Draf</strong>, letakkan berkas hasil kompresi pada folder <code>assets/news</code>, deploy portal, lalu terbitkan kembali.`,
        icon:'📁', type:'warning'
      });
      return;
    }
  }

  if (!title) {
    CustomModal.alert({ title: "Judul Wajib Diisi", message: "Silakan masukkan judul utama artikel berita.", icon: "⚠️", type: "warning" });
    document.getElementById('newsTitleInput')?.focus();
    return;
  }

  if (!content) {
    CustomModal.alert({ title: "Konten Berita Kosong", message: "Silakan masukkan isi berita lengkap pada editor visual.", icon: "⚠️", type: "warning" });
    if (visualCanvas) visualCanvas.focus();
    return;
  }

  const allNews = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
  const nowIso = new Date().toISOString();
  const normalizedSlug = autoGenerateSlug(slug || title);
  const existingArticle = editId ? allNews.find(item => item && item.id === editId) : null;
  const keepsExistingSlug = Boolean(editId && existingArticle && String(existingArticle.slug || '').toLowerCase().trim() === normalizedSlug);

  // Slug adalah alamat publik dan wajib unik. Cegah dokumen baru menimpa/menyamarkan berita lama.
  let slugConflict = keepsExistingSlug
    ? null
    : allNews.find(item => item && item.id !== editId && String(item.slug || '').toLowerCase().trim() === normalizedSlug);
  if (!keepsExistingSlug && typeof db !== 'undefined' && db !== null) {
    try {
      const conflictSnapshot = await db.collection('news').where('slug', '==', normalizedSlug).get();
      const cloudConflict = conflictSnapshot.docs.find(doc => doc.id !== editId);
      if (cloudConflict) slugConflict = { id: cloudConflict.id, ...cloudConflict.data() };
    } catch (err) {
      console.warn('Pemeriksaan keunikan slug menggunakan cache lokal:', err);
    }
  }

  if (slugConflict) {
    CustomModal.alert({
      title: "Alamat Berita Sudah Digunakan",
      message: `Slug <strong>${normalizedSlug}</strong> telah digunakan oleh berita <strong>"${slugConflict.title || slugConflict.id}"</strong>.<br><br>Silakan edit berita tersebut atau gunakan slug yang berbeda agar berita tidak hilang setelah refresh.`,
      icon: "⚠️",
      type: "warning"
    });
    document.getElementById('newsSlugInput')?.focus();
    return;
  }
  
  // Payload Bersih TANPA Field undefined (Mencegah Firestore Error)
  const articleObj = {
    id: editId || `news_${Date.now()}`,
    title: title,
    slug: normalizedSlug,
    category: category,
    topic_tag: currentNewsTags[0] || 'Dinas',
    tags: currentNewsTags.length > 0 ? currentNewsTags : ['DisperindagPinrang'],
    content_origin: "internal_release",
    date: date,
    author: author,
    sourceName: "Humas Disperindag ESDM Pinrang",
    sourceUrl: "https://disperindagesdm-pinrang.web.app",
    img: currentFeaturedImage || "assets/news/operasi_pasar_murah_sembako_pinrang.jpg",
    image_caption: caption,
    gallery: Array.isArray(currentNewsGallery)
      ? currentNewsGallery.map(item => ({ img:item.img, caption:item.caption || 'Dokumentasi kegiatan resmi.' }))
      : [],
    excerpt: excerpt || (visualCanvas ? visualCanvas.innerText.slice(0, 160) + '...' : content.slice(0, 160) + '...'),
    content: content,
    status: status,
    is_featured: isFeatured,
    updated_at: nowIso,
    published_at: status === 'published' ? (existingArticle?.published_at || nowIso) : null
  };
  articleObj.dataVersion = '2026-09-01-news-cloud-media-v1';
  articleObj.og_title = articleObj.title;
  articleObj.og_description = articleObj.excerpt;
  articleObj.og_image = articleObj.img;
  articleObj.og_url = `https://disperindagesdm-pinrang.web.app/berita/${articleObj.slug}`;
  articleObj.og_status = status === 'published' ? 'PENDING_STATIC_PUBLISH' : 'DRAFT';

  if (!editId) {
    articleObj.created_at = nowIso;
  }

  const payloadBytes = new Blob([JSON.stringify(articleObj)]).size;
  if (payloadBytes > 800000) {
    CustomModal.alert({
      title: "Ukuran Berita Terlalu Besar",
      message: `Payload berita berukuran ${(payloadBytes / 1024).toFixed(0)} KB. Batas aman CMS adalah 800 KB.<br><br>Kurangi foto galeri atau gunakan URL gambar yang sudah diunggah ke penyimpanan media.`,
      icon: "⚠️",
      type: "warning"
    });
    return;
  }

  // Indikator visual proses simpan
  const submitBtns = document.querySelectorAll('#newsEditorModal button[type="submit"], #newsEditorModal .btn-primary');
  submitBtns.forEach(btn => { if (btn) { btn.disabled = true; btn.innerHTML = '<span>⏳</span> Menyimpan ke Cloud...'; } });

  let cloudSaveSuccess = false;
  let cloudErrorMsg = '';

  // 1. Sinkronisasi Mutlak ke Cloud Firestore (Primary Source of Truth)
  if (typeof db !== 'undefined' && db !== null) {
    try {
      await db.collection('news').doc(articleObj.id).set(articleObj, { merge: true });
      cloudSaveSuccess = true;
      console.log("[+] Berhasil menyimpan berita ke Cloud Firestore:", articleObj.id);
    } catch(err) {
      console.error("[-] Gagal menyimpan ke Cloud Firestore:", err);
      cloudErrorMsg = err.message || err.toString();
    }
  }


  // Firestore adalah sumber utama pada deployment produksi. Jangan tampilkan
  // berita sebagai tersimpan bila penulisan cloud gagal.
  if (typeof db !== 'undefined' && db !== null && !cloudSaveSuccess) {
    submitBtns.forEach(btn => { if (btn) btn.disabled = false; });
    CustomModal.alert({
      title: "Berita Belum Tersimpan",
      message: `Sinkronisasi cloud gagal:<br><small style="color:#DC2626;">${escapeNewsText(cloudErrorMsg || 'Koneksi database tidak tersedia')}</small>`,
      icon: "⚠️",
      type: "error"
    });
    return;
  }

  // 2. Simpan ke Local Storage Cache
  if (editId) {
    const idx = allNews.findIndex(n => n.id === editId);
    if (idx !== -1) {
      allNews[idx] = { ...allNews[idx], ...articleObj };
    } else {
      allNews.unshift(articleObj);
    }
  } else {
    allNews.unshift(articleObj);
  }

  setStorage('disperindag_news', allNews);

  // 3. Sinkronisasi otomatis ke Hero Carousel Banner (Headline Beranda)
  let banners = getStorage('disperindag_banners', typeof DEFAULT_BANNERS !== 'undefined' ? DEFAULT_BANNERS : []);
  const existingBannerIdx = banners.findIndex(b => b.target_news_id === articleObj.id || b.title === articleObj.title);
  if (isFeatured && status === 'published') {
    const headlineBanner = {
      id: existingBannerIdx !== -1 ? banners[existingBannerIdx].id : `bnr_news_${articleObj.id}`,
      target_news_id: articleObj.id,
      img: articleObj.img,
      title: articleObj.title,
      caption: articleObj.excerpt || (articleObj.content ? articleObj.content.slice(0, 140) + '...' : ''),
      link: `berita/${articleObj.slug || articleObj.id}`,
      active: true,
      is_news_headline: true
    };
    if (existingBannerIdx !== -1) {
      banners[existingBannerIdx] = headlineBanner;
    } else {
      banners.unshift(headlineBanner);
    }
  } else if (!isFeatured && existingBannerIdx !== -1 && banners[existingBannerIdx].is_news_headline) {
    banners.splice(existingBannerIdx, 1);
  }
  setStorage('disperindag_banners', banners);
  if (typeof renderAdminBanners === 'function') renderAdminBanners();
  if (typeof renderAdminNewsTable === 'function') renderAdminNewsTable();

  // Reset Tombol
  submitBtns.forEach(btn => { if (btn) { btn.disabled = false; btn.innerHTML = '<span>✓</span> ' + (editId ? 'Perbarui Berita' : 'Terbitkan Berita Sekarang'); } });

  // 4. Selesai & Tutup Editor
  closeNewsEditor();

  if (cloudSaveSuccess) {
    CustomModal.alert({
      title: editId ? "Berita Berhasil Diperbarui" : (status === 'published' ? "Berita Berhasil Diterbitkan" : "Draf Berita Disimpan"),
      message: `Artikel <strong>"${articleObj.title}"</strong> telah berhasil tersimpan di Cloud Database dan Cache Lokal.${isFeatured && status === 'published' ? '<br><br><span style="color:#047857; font-weight:700;">✓ Otomatis ditayangkan di Headline Hero Beranda!</span>' : ''}`,
      icon: status === 'published' ? "🚀" : "💾",
      type: "info"
    });
  } else {
    CustomModal.alert({
      title: "Tersimpan di Cache Lokal",
      message: `Artikel <strong>"${articleObj.title}"</strong> telah tersimpan di browser lokal, namun sinkronisasi cloud mengalami kendala:<br><small style="color:#DC2626;">${cloudErrorMsg || 'Koneksi database offline'}</small>`,
      icon: "💾",
      type: "warning"
    });
  }
};

// MODAL LIVE PREVIEW ARTIKEL BERITA
window.previewCurrentNewsDraft = function() {
  const modal = document.getElementById('modalNewsPreview');
  const container = document.getElementById('newsPreviewContentContainer');
  if (!modal || !container) return;

  const title = document.getElementById('newsTitleInput')?.value?.trim() || 'Judul Rilis Berita';
  const category = document.getElementById('newsCategorySelect')?.value || 'Perindustrian, Energi & SDM';
  const date = document.getElementById('newsDateInput')?.value?.trim() || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const author = document.getElementById('newsAuthorInput')?.value?.trim() || 'Humas Disperindag ESDM Pinrang';
  const img = currentFeaturedImage || 'assets/news/operasi_pasar_murah_sembako_pinrang.jpg';
  const caption = document.getElementById('newsFeaturedCaptionInput')?.value?.trim() || 'Dokumentasi kegiatan resmi.';
  
  const visualCanvas = document.getElementById('newsVisualCanvas');
  const rawContent = (visualCanvas && visualCanvas.innerHTML.trim() !== '') ? visualCanvas.innerHTML : (document.getElementById('newsContentInput')?.value || '');

  let bodyHtml = rawContent;
  if (!rawContent.includes('<') && !rawContent.includes('>')) {
    bodyHtml = rawContent.split('\n\n').map(p => `<p style="margin-bottom:16px;">${p.replace(/\n/g, '<br>')}</p>`).join('');
  }

  container.innerHTML = `
    <div style="max-width: 760px; margin: 0 auto; font-family: 'Plus Jakarta Sans', sans-serif;">
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px;">
        <span style="background: #EFF6FF; color: #1D4ED8; font-weight: 800; font-size: 0.8rem; padding: 4px 10px; border-radius: 6px;">
          ${category}
        </span>
        <span style="background: #FEF3C7; color: #92400E; font-weight: 800; font-size: 0.76rem; padding: 3px 8px; border-radius: 4px;">
          #${currentNewsTags[0] || 'Dinas'}
        </span>
      </div>

      <h1 style="font-size: 1.75rem; font-weight: 900; color: #0F2C59; line-height: 1.35; margin: 10px 0 16px;">
        ${title}
      </h1>

      <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #E2E8F0; font-size: 0.82rem; color: #64748B; margin-bottom: 20px;">
        <div>📅 ${date} &bull; ✍️ Oleh: <strong>${author}</strong></div>
        <span style="background: #ECFDF5; color: #059669; font-weight: 800; padding: 3px 8px; border-radius: 4px; border: 1px solid #A7F3D0; font-size: 0.76rem;">✓ Rilis Resmi Kedinasan</span>
      </div>

      <div style="width: 100%; max-height: 380px; border-radius: 12px; overflow: hidden; margin-bottom: 8px; background: #030D1B;">
        <img src="${img}" style="width: 100%; height: 380px; object-fit: cover;" alt="${title}">
      </div>
      <div style="font-size: 0.78rem; color: #64748B; font-style: italic; margin-bottom: 24px; text-align: center;">
        📷 ${caption}
      </div>

      <div style="font-size: 1rem; line-height: 1.85; color: #334155;">
        ${bodyHtml}
      </div>
    </div>
  `;

  modal.style.display = 'block';
};

window.closeNewsPreviewModal = function() {
  const modal = document.getElementById('modalNewsPreview');
  if (modal) modal.style.display = 'none';
};



// LIVE PREVIEW MODAL
window.previewCurrentNewsDraft = function() {
  const title = document.getElementById('newsTitleInput')?.value?.trim() || 'Judul Contoh Berita Kedinasan';
  const category = document.getElementById('newsCategorySelect')?.value || 'Perindustrian, Energi & SDM';
  const date = document.getElementById('newsDateInput')?.value?.trim() || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const author = document.getElementById('newsAuthorInput')?.value?.trim() || 'Humas Disperindag ESDM Pinrang';
  const content = document.getElementById('newsContentInput')?.value?.trim() || 'Isi artikel belum dituliskan...';
  const caption = document.getElementById('newsFeaturedCaptionInput')?.value?.trim() || 'Dokumentasi resmi Disperindag ESDM Pinrang.';
  const imgSrc = currentFeaturedImage || 'assets/news/operasi_pasar_murah_sembako_pinrang.jpg';

  const tagsHtml = currentNewsTags.map(t => `<span style="background:#EFF6FF; color:#1E40AF; border:1px solid #BFDBFE; padding:3px 10px; border-radius:16px; font-size:0.75rem; font-weight:700;">#${t}</span>`).join(' ');

  // Parse Markdown sederhana untuk preview
  const formattedContent = content
    .replace(/^## (.*$)/gim, '<h2 style="font-size:1.3rem; font-weight:800; color:#0F2C59; margin:24px 0 12px;">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 style="font-size:1.1rem; font-weight:800; color:#0F2C59; margin:20px 0 10px;">$1</h3>')
    .replace(/^\> (.*$)/gim, '<blockquote style="border-left:4px solid #D4AF37; background:#F8FAFC; padding:14px 18px; border-radius:8px; font-style:italic; margin:20px 0; color:#1E293B; line-height:1.6;">$1</blockquote>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\n\n/gim, '</p><p style="margin-bottom:16px; line-height:1.75; color:#334155; font-size:0.96rem;">');

  const galleryHtml = currentNewsGallery.length > 0 ? `
    <div style="margin-top: 32px; padding-top: 20px; border-top: 1.5px dashed #CBD5E1;">
      <h4 style="font-size: 1.05rem; font-weight: 800; color: #0F2C59; margin-bottom: 14px;">📸 Galeri Dokumentasi Kegiatan</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
        ${currentNewsGallery.map(g => `
          <div style="border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
            <img src="${g.img}" style="width: 100%; height: 140px; object-fit: cover;" alt="Galeri">
            <div style="padding: 8px 10px; font-size: 0.72rem; color: #64748B; background: #F8FAFC;">${g.caption}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const modalContainer = document.getElementById('newsPreviewContentContainer');
  const modal = document.getElementById('modalNewsPreview');

  if (modalContainer) {
    modalContainer.innerHTML = `
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <span class="badge-cat">${category}</span>
        <span style="font-size: 0.78rem; color: #64748B; align-self: center;">📅 ${date} • 👤 ${author}</span>
      </div>

      <h1 style="font-size: 1.6rem; font-weight: 900; color: #0F172A; line-height: 1.35; margin-bottom: 20px;">
        ${title}
      </h1>

      <div style="border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.1); border: 1px solid #CBD5E1;">
        <img src="${imgSrc}" style="width: 100%; max-height: 420px; object-fit: cover;" alt="Foto Utama">
        <div style="padding: 8px 14px; font-size: 0.76rem; color: #64748B; background: #F8FAFC; border-top: 1px solid #E2E8F0;">
          📷 ${caption}
        </div>
      </div>

      <div style="font-family: 'Plus Jakarta Sans', sans-serif;">
        <p style="margin-bottom: 16px; line-height: 1.75; color: #334155; font-size: 0.96rem;">
          ${formattedContent}
        </p>
      </div>

      ${galleryHtml}

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2E8F0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <span style="font-size: 0.8rem; font-weight: 700; color: #64748B;">Topik Terkait:</span>
        ${tagsHtml}
      </div>
    `;
  }

  if (modal) modal.style.display = 'block';
};

window.closeNewsPreviewModal = function() {
  const modal = document.getElementById('modalNewsPreview');
  if (modal) modal.style.display = 'none';
};

// 4. BANNER CAROUSEL (CRUD LENGKAP)
function getDeletedBannerIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem('disperindag_deleted_banner_ids') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function syncBannerStateToCloud(banners) {
  if (typeof db === 'undefined' || db === null) return false;
  await db.collection('settings').doc('banners').set({
    list: banners,
    deleted_ids: getDeletedBannerIds(),
    updated_at: new Date().toISOString()
  }, { merge: true });
  return true;
}

function renderAdminBanners() {
  const container = document.getElementById('adminBannersList');
  if (!container) return;

  const banners = getStorage('disperindag_banners', DEFAULT_BANNERS);
  container.innerHTML = banners.map(b => `
    <div style="background: #FFFFFF; border-radius: 12px; border: 1.5px solid #E2E8F0; overflow: hidden; box-shadow: var(--shadow-sm); display: flex; flex-direction: column;">
      <div style="height: 140px; background-image: url('${b.img}'); background-size: cover; background-position: center; position: relative;">
        <span style="position: absolute; top: 10px; right: 10px; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; background: ${b.active ? '#DCFCE7' : '#FEE2E2'}; color: ${b.active ? '#166534' : '#991B1B'};">
          ${b.active ? '● Aktif Tayang' : '○ Dinonaktifkan'}
        </span>
      </div>
      <div style="padding: 14px; display: flex; flex-direction: column; flex: 1;">
        <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--primary-deep); margin-bottom: 6px;">${b.title}</h4>
        <p style="font-size: 0.8rem; color: #64748B; line-height: 1.4; margin-bottom: 12px; flex: 1;">${b.caption}</p>
        <div style="display: flex; gap: 6px; padding-top: 10px; border-top: 1px solid #F1F5F9;">
          <button onclick="toggleBannerActive('${b.id}')" class="btn-outline" style="padding: 5px 10px; font-size: 0.76rem; flex: 1; justify-content: center;">
            ${b.active ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
          <button onclick="editBannerText('${b.id}')" class="btn-primary" style="padding: 5px 10px; font-size: 0.76rem; background: var(--accent-gold); color: #030D1B; border: none;">
            ✏️ Edit
          </button>
          <button onclick="deleteBanner('${b.id}')" class="btn-danger" style="padding: 5px 10px; font-size: 0.76rem;">
            🗑️
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function initBannerUploader() {
  const form = document.getElementById('formAddBanner');
  const fileInput = document.getElementById('bannerFileInput');
  const resultInput = document.getElementById('bannerImageResult');

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const blob = await compressNewsImage(file, 1920, 0.78, 720);
          const safeName = String(file.name || 'banner').replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55) || 'banner';
          const fileName = `banner-${safeName}-${Date.now().toString(36)}.jpg`;
          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = objectUrl; link.download = fileName;
          document.body.appendChild(link); link.click(); link.remove();
          resultInput.value = `assets/banner/${fileName}`;
          CustomModal.alert({ title:'Banner Siap Dipublikasikan', message:`Berkas JPEG 1920×720 telah diunduh (${Math.ceil(blob.size / 1024)} KB). Simpan ke <code>assets/banner</code> dan deploy sebelum banner diaktifkan.`, icon:'🖼️', type:'info' });
        } catch (error) {
          CustomModal.alert({ title:'Banner Belum Disiapkan', message:error.message, icon:'⚠️', type:'error' });
        }
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('bannerTitle').value.trim();
      const caption = document.getElementById('bannerCaption').value.trim();
      const img = resultInput.value || 'assets/banner/pasar_sentral_pinrang_clean_hd.jpg';
      if (String(img).startsWith('data:image')) {
        CustomModal.alert({ title:'Format Banner Tidak Didukung', message:'Banner Base64 tidak boleh disimpan. Pilih ulang foto agar dibuat sebagai berkas JPEG.', icon:'⚠️', type:'warning' });
        return;
      }

      const newBanner = {
        id: "bnr_" + Date.now(),
        img,
        title,
        caption,
        active: true
      };

      const banners = getStorage('disperindag_banners', DEFAULT_BANNERS);
      banners.unshift(newBanner);
      setStorage('disperindag_banners', banners);

      try {
        await syncBannerStateToCloud(banners);
      } catch (err) {
        console.error('Gagal menyinkronkan banner baru:', err);
        CustomModal.toast('Banner tersimpan lokal, tetapi sinkronisasi cloud gagal.', 'warning');
      }

      form.reset();
      resultInput.value = '';
      renderAdminBanners();

      CustomModal.alert({
        title: "Banner Berhasil Diterbitkan",
        message: `Banner baru: <strong>"${title}"</strong> telah aktif di Carousel Beranda.`,
        icon: "🖼️",
        type: "info"
      });
    });
  }
}

window.toggleBannerActive = async function(bannerId) {
  const banners = getStorage('disperindag_banners', DEFAULT_BANNERS);
  const b = banners.find(item => item.id === bannerId);
  if (!b) return;

  b.active = !b.active;
  setStorage('disperindag_banners', banners);
  renderAdminBanners();
  try {
    await syncBannerStateToCloud(banners);
  } catch (err) {
    console.error('Gagal menyinkronkan status banner:', err);
    CustomModal.toast('Status tersimpan lokal, tetapi sinkronisasi cloud gagal.', 'warning');
  }
};

window.editBannerText = async function(bannerId) {
  const banners = getStorage('disperindag_banners', DEFAULT_BANNERS);
  const b = banners.find(item => item.id === bannerId);
  if (!b) return;

  const newTitle = await CustomModal.prompt({
    title: "Edit Judul Banner",
    message: "Masukkan judul baru untuk banner ini:",
    defaultValue: b.title
  });

  if (!newTitle || !newTitle.trim()) return;
  b.title = newTitle.trim();
  setStorage('disperindag_banners', banners);
  renderAdminBanners();
  try {
    await syncBannerStateToCloud(banners);
  } catch (err) {
    console.error('Gagal menyinkronkan perubahan banner:', err);
    CustomModal.toast('Perubahan tersimpan lokal, tetapi sinkronisasi cloud gagal.', 'warning');
  }
};

window.deleteBanner = async function(bannerId) {
  const currentBanners = getStorage('disperindag_banners', DEFAULT_BANNERS);
  const targetBanner = currentBanners.find(item => item.id === bannerId);
  if (!targetBanner) return;

  const confirmed = await CustomModal.confirm({
    title: "Hapus Banner Carousel?",
    message: "Apakah Anda yakin ingin menghapus banner ini dari beranda?",
    icon: "🗑️",
    isDanger: true,
    confirmText: "Ya, Hapus Banner",
    cancelText: "Batal"
  });

  if (!confirmed) return;

  const deletedIds = getDeletedBannerIds();
  if (!deletedIds.includes(bannerId)) deletedIds.push(bannerId);
  localStorage.setItem('disperindag_deleted_banner_ids', JSON.stringify(deletedIds));

  const banners = currentBanners.filter(item => item.id !== bannerId);
  setStorage('disperindag_banners', banners);

  // Banner headline berita juga harus dilepas dari status featured agar
  // carousel beranda tidak merekonstruksinya kembali dari koleksi berita.
  if (targetBanner.target_news_id) {
    const newsList = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
    const relatedNews = newsList.find(item => item.id === targetBanner.target_news_id);
    if (relatedNews) {
      relatedNews.is_featured = false;
      relatedNews.updated_at = new Date().toISOString();
      setStorage('disperindag_news', newsList);
      if (typeof db !== 'undefined' && db !== null) {
        try {
          await db.collection('news').doc(relatedNews.id).set({
            is_featured: false,
            updated_at: relatedNews.updated_at
          }, { merge: true });
        } catch (err) {
          console.error('Gagal melepas status featured berita:', err);
        }
      }
    }
  }

  renderAdminBanners();

  try {
    await syncBannerStateToCloud(banners);
    CustomModal.toast(`Banner "${targetBanner.title}" berhasil dihapus dari carousel.`, 'success');
  } catch (err) {
    console.error('Gagal menyinkronkan penghapusan banner:', err);
    CustomModal.toast('Banner dihapus lokal, tetapi sinkronisasi cloud gagal.', 'warning');
  }
};

// 5. TABEL DOKUMEN & REGULASI
function renderAdminDocs() {
  const tbody = document.getElementById('adminDocsTableBody');
  if (!tbody) return;

  const docs = getStorage('disperindag_documents', DEFAULT_DOCUMENTS);
  tbody.innerHTML = docs.map(d => `
    <tr>
      <td><strong>${d.title}</strong></td>
      <td>${d.number} (${d.year})</td>
      <td><span class="badge-cat">${d.subject}</span></td>
      <td><span class="badge-legal-status ${d.legal_status.toLowerCase()}">${d.legal_status}</span></td>
      <td>
        <button onclick="toggleDocStatus('${d.id}')" class="btn-outline" style="padding: 4px 10px; font-size: 0.76rem;">
          Ubah Status
        </button>
      </td>
    </tr>
  `).join('');
}

window.toggleDocStatus = function(docId) {
  const docs = getStorage('disperindag_documents', DEFAULT_DOCUMENTS);
  const d = docs.find(item => item.id === docId);
  if (!d) return;

  const nextStatus = d.legal_status === 'BERLAKU' ? 'ARSIP' : d.legal_status === 'ARSIP' ? 'DICABUT' : 'BERLAKU';
  d.legal_status = nextStatus;
  setStorage('disperindag_documents', docs);
  renderAdminDocs();
};

// 6. TABEL IKM & CRUD ETALASE
function renderAdminIkm() {
  const tbody = document.getElementById('adminIkmTableBody');
  if (!tbody) return;

  const rawIkm = getStorage('disperindag_products_ikm', typeof DEFAULT_PRODUCTS_IKM !== 'undefined' ? DEFAULT_PRODUCTS_IKM : []);
  const ikm = Array.isArray(rawIkm) ? rawIkm : (typeof DEFAULT_PRODUCTS_IKM !== 'undefined' ? DEFAULT_PRODUCTS_IKM : []);

  tbody.innerHTML = ikm.map(p => `
    <tr>
      <td>
        <img src="${p.img || 'assets/brand/cover_ikm.png'}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; border: 1px solid #E2E8F0;" alt="Thumb" onerror="this.src='assets/brand/cover_ikm.png'">
      </td>
      <td>
        <strong style="color: #0F2C59; font-size: 0.88rem;">${p.name}</strong><br>
        <span class="badge-cat" style="font-size: 0.72rem;">${p.category_label || p.category}</span>
      </td>
      <td>
        <strong>${p.artisan}</strong><br>
        <small style="color: #64748B;">📍 ${p.location}</small>
      </td>
      <td>
        ${(p.certifications || []).map(c => `
          <span style="font-size: 0.7rem; background: #ECFDF5; color: #059669; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-right: 4px; display: inline-block; margin-bottom: 2px; border: 1px solid #A7F3D0;">
            ✓ ${c.cert_type || c}
          </span>
        `).join('')}
      </td>
      <td style="text-align: center;">
        <div class="btn-action-group" style="justify-content: center;">
          <a href="katalog-ikm.html" target="_blank" class="btn-action-item btn-action-view" title="Lihat di Katalog Publik">
            🌐 Lihat
          </a>
          <button onclick="openEditIkmModal('${p.id}')" class="btn-action-item btn-action-edit" title="Ubah Data IKM">
            ✏️ Edit
          </button>
          <button onclick="deleteIkmProduct('${p.id}')" class="btn-action-item btn-action-delete" title="Hapus Produk IKM">
            🗑️ Hapus
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.openAddIkmModal = function() {
  CustomModal.form({
    title: "Tambah Produk IKM Binaan Baru",
    icon: "🏭",
    fields: [
      {
        name: "name",
        label: "Nama Produk IKM",
        type: "text",
        required: true,
        placeholder: "Contoh: Keripik Pisang Tanduk Lasinrang"
      },
      {
        name: "category",
        label: "Kategori Komoditas",
        type: "select",
        required: true,
        options: [
          { value: "tenun", label: "Kain & Tenun Sutra" },
          { value: "anyaman", label: "Kerajinan Serat Alam & Anyaman" },
          { value: "kuliner", label: "Kuliner Pangan / Minuman Olahan" },
          { value: "olahan", label: "Olahan Hasil Perikanan & Tambak" },
          { value: "kerajinan", label: "Kriya Kayu, Bambu & Seni" }
        ]
      },
      {
        name: "artisan",
        label: "Nama Sentra / Pelaku Usaha / Pengrajin",
        type: "text",
        required: true,
        placeholder: "Contoh: Kelompok Tani Mandiri Suppa"
      },
      {
        name: "location",
        label: "Lokasi Sentra / Kecamatan",
        type: "text",
        required: true,
        placeholder: "Contoh: Kec. Suppa, Kab. Pinrang"
      },
      {
        name: "description",
        label: "Deskripsi Produk & Keunggulan Mutu",
        type: "textarea",
        rows: 3,
        required: true,
        placeholder: "Tuliskan deskripsi cita rasa, bahan baku lokal, atau keistimewaan produk..."
      },
      {
        name: "img",
        label: "Tautan Foto Produk (URL atau Path Asset)",
        type: "text",
        required: true,
        placeholder: "Contoh: assets/news/kopi_robusta_pinrang_murni_hd.jpg"
      },
      {
        name: "certs",
        label: "Sertifikasi (Pisahkan dengan koma)",
        type: "text",
        placeholder: "Contoh: Sertifikat Halal, Izin P-IRT, TKDN-IKM"
      },
      {
        name: "admin_contact_wa",
        label: "Nomor WhatsApp Pemesanan",
        type: "text",
        required: true,
        value: "6282316002226",
        placeholder: "Contoh: 6282316002226"
      }
    ],
    onSubmit: (vals) => {
      const rawIkm = getStorage('disperindag_products_ikm', typeof DEFAULT_PRODUCTS_IKM !== 'undefined' ? DEFAULT_PRODUCTS_IKM : []);
      const ikm = Array.isArray(rawIkm) ? rawIkm : [];
      
      const catLabels = {
        tenun: "Kain & Tenun",
        anyaman: "Kerajinan Serat",
        kuliner: "Kuliner Pangan",
        olahan: "Olahan Perikanan",
        kerajinan: "Kriya Seni"
      };

      const certArray = (vals.certs || "Binaan Disperindag").split(',').map(c => ({
        cert_type: c.trim(),
        status: "verified"
      })).filter(c => c.cert_type);

      const newProd = {
        id: "ikm_" + Date.now(),
        name: vals.name,
        category: vals.category,
        category_label: catLabels[vals.category] || vals.category,
        artisan: vals.artisan,
        location: vals.location,
        description: vals.description,
        img: vals.img || "assets/brand/cover_ikm.png",
        certifications: certArray.length > 0 ? certArray : [{ cert_type: "Binaan Dinas", status: "verified" }],
        admin_contact_wa: vals.admin_contact_wa.replace(/\D/g, ''),
        verified_at: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      };

      ikm.unshift(newProd);
      setStorage('disperindag_products_ikm', ikm);
      renderAdminIkm();
      renderDashboardStats();
      logAdminActivity('Produk IKM', `Menambahkan produk IKM baru: ${vals.name}`);
      CustomModal.toast(`Produk IKM "${vals.name}" berhasil ditambahkan ke etalase!`, "success");
    }
  });
};

window.openEditIkmModal = function(ikmId) {
  const rawIkm = getStorage('disperindag_products_ikm', typeof DEFAULT_PRODUCTS_IKM !== 'undefined' ? DEFAULT_PRODUCTS_IKM : []);
  const ikm = Array.isArray(rawIkm) ? rawIkm : [];
  const p = ikm.find(item => item.id === ikmId);
  if (!p) return;

  const currentCerts = (p.certifications || []).map(c => c.cert_type || c).join(', ');

  CustomModal.form({
    title: `Ubah Produk IKM: ${p.name}`,
    icon: "✏️",
    fields: [
      {
        name: "name",
        label: "Nama Produk IKM",
        type: "text",
        required: true,
        value: p.name
      },
      {
        name: "category",
        label: "Kategori Komoditas",
        type: "select",
        required: true,
        value: p.category,
        options: [
          { value: "tenun", label: "Kain & Tenun Sutra" },
          { value: "anyaman", label: "Kerajinan Serat Alam & Anyaman" },
          { value: "kuliner", label: "Kuliner Pangan / Minuman Olahan" },
          { value: "olahan", label: "Olahan Hasil Perikanan & Tambak" },
          { value: "kerajinan", label: "Kriya Kayu, Bambu & Seni" }
        ]
      },
      {
        name: "artisan",
        label: "Nama Sentra / Pelaku Usaha / Pengrajin",
        type: "text",
        required: true,
        value: p.artisan
      },
      {
        name: "location",
        label: "Lokasi Sentra / Kecamatan",
        type: "text",
        required: true,
        value: p.location
      },
      {
        name: "description",
        label: "Deskripsi Produk & Keunggulan Mutu",
        type: "textarea",
        rows: 3,
        required: true,
        value: p.description
      },
      {
        name: "img",
        label: "Tautan Foto Produk (URL atau Path Asset)",
        type: "text",
        required: true,
        value: p.img
      },
      {
        name: "certs",
        label: "Sertifikasi (Pisahkan dengan koma)",
        type: "text",
        value: currentCerts
      },
      {
        name: "admin_contact_wa",
        label: "Nomor WhatsApp Pemesanan",
        type: "text",
        required: true,
        value: p.admin_contact_wa || "6282316002226"
      }
    ],
    onSubmit: (vals) => {
      const catLabels = {
        tenun: "Kain & Tenun",
        anyaman: "Kerajinan Serat",
        kuliner: "Kuliner Pangan",
        olahan: "Olahan Perikanan",
        kerajinan: "Kriya Seni"
      };

      p.name = vals.name;
      p.category = vals.category;
      p.category_label = catLabels[vals.category] || vals.category;
      p.artisan = vals.artisan;
      p.location = vals.location;
      p.description = vals.description;
      p.img = vals.img;
      p.admin_contact_wa = vals.admin_contact_wa.replace(/\D/g, '');

      if (vals.certs) {
        p.certifications = vals.certs.split(',').map(c => ({
          cert_type: c.trim(),
          status: "verified"
        })).filter(c => c.cert_type);
      }

      setStorage('disperindag_products_ikm', ikm);
      renderAdminIkm();
      logAdminActivity('Produk IKM', `Memperbarui data produk IKM: ${p.name}`);
      CustomModal.toast(`Data produk "${p.name}" berhasil diperbarui!`, "success");
    }
  });
};

window.deleteIkmProduct = function(ikmId) {
  const rawIkm = getStorage('disperindag_products_ikm', typeof DEFAULT_PRODUCTS_IKM !== 'undefined' ? DEFAULT_PRODUCTS_IKM : []);
  const ikm = Array.isArray(rawIkm) ? rawIkm : [];
  const p = ikm.find(item => item.id === ikmId);
  if (!p) return;

  CustomModal.confirm({
    title: "Hapus Produk IKM?",
    message: `Apakah Anda yakin ingin menghapus produk <strong>${p.name}</strong> dari etalase IKM daerah?`,
    icon: "🗑️",
    confirmText: "Ya, Hapus Produk",
    isDanger: true,
    onSubmit: () => {
      const updated = ikm.filter(item => item.id !== ikmId);
      setStorage('disperindag_products_ikm', updated);
      renderAdminIkm();
      renderDashboardStats();
      logAdminActivity('Produk IKM', `Menghapus produk IKM: ${p.name}`);
      CustomModal.toast(`Produk "${p.name}" berhasil dihapus dari etalase.`, "info");
    }
  });
};

// 7. TABEL PENGADUAN DENGAN NOMOR TIKET & MULTI-CHANNEL CANONICAL
function renderAdminReports() {
  const tbody = document.getElementById('adminReportsTableBody');
  if (!tbody) return;

  const reports = getAdminReportsData();
  tbody.innerHTML = reports.map(r => {
    const text = (value, fallback = '-') => escapeAdminUserText(value, fallback);
    let statusClass = 'diproses';
    const status = String(r.status || 'Diterima & Registrasi');
    if (status.includes('Selesai')) statusClass = 'selesai';
    else if (status.includes('Diterima')) statusClass = 'diterima';

    const sourceBadge = r.source_channel || 'Website Portal';

    return `
      <tr>
        <td style="white-space: nowrap;">
          <strong style="color: #1E40AF; font-size: 0.88rem; font-family: monospace;">${text(r.ticket_number, 'DPE-2026')}</strong><br>
          <span style="font-size: 0.70rem; background: #EFF6FF; color: #1D4ED8; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-block; margin-top: 2px; border: 1px solid #DBEAFE;">📡 ${sourceBadge}</span>
        </td>
        <td style="white-space: nowrap;"><small style="color: #475569; font-weight: 600;">${text(r.submitted_at)}</small></td>
        <td><strong style="color: #0F172A; font-size: 0.86rem;">${r.nama}</strong><br><small style="color: #64748B;">📱 ${r.kontak}</small></td>
        <td><strong style="color: #1E293B; font-size: 0.86rem;">${r.kategori}</strong><br><small style="color: #64748B;">📍 ${r.lokasi}</small></td>
        <td><span style="font-size: 0.8rem; font-weight: 700; color: #0F2C59;">${r.assigned_unit || 'Bidang Teknis'}</span></td>
        <td style="text-align: center; white-space: nowrap;">
          <span class="verified-badge ${statusClass}" style="white-space: nowrap; display: inline-flex; align-items: center; justify-content: center;">
            ${text(status)}
          </span>
        </td>
        <td style="text-align: center; white-space: nowrap;">
          <div class="btn-action-group" style="justify-content: center; gap: 4px; flex-wrap: nowrap;">
            <button type="button" onclick="viewReportDetail('${r.id}')" class="btn-action-item btn-action-view" style="white-space: nowrap;" title="Lihat Detail Lengkap">
              <span>🔍</span> Detail
            </button>
            <button type="button" onclick="openEditReportModal('${r.id}')" class="btn-action-item btn-action-followup" style="white-space: nowrap;" title="Tindak Lanjuti & Ubah Status Alur">
              <span>⚡</span> Tindak Lanjut
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.viewReportDetail = function(repId) {
  const reports = getAdminReportsData();
  const r = reports.find(item => item.id === repId);
  if (!r) return;

  CustomModal.alert({
    title: `Tiket Aduan: ${r.ticket_number || 'DPE-2026'}`,
    message: `
      <div style="text-align: left; font-size: 0.86rem; line-height: 1.6;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px;">
          <div><strong>Nomor Tiket:</strong> <span style="color: #1E40AF; font-weight: 900;">${r.ticket_number || '-'}</span></div>
          <div><strong>Kanal Masuk:</strong> ${r.source_channel || 'Website'}</div>
          <div><strong>Waktu Lapor:</strong> ${r.submitted_at}</div>
          <div><strong>Pelapor:</strong> ${r.nama} (${r.kontak})</div>
        </div>

        <div style="margin-bottom: 10px;">
          <div><strong>Kategori:</strong> ${r.kategori}</div>
          <div><strong>Lokasi Kejadian:</strong> ${r.lokasi}</div>
        </div>

        <div style="background: #FFFBEB; border-left: 4px solid #D97706; padding: 10px 14px; border-radius: 4px; margin-bottom: 12px;">
          <strong>Uraian Laporan:</strong><br>
          <em>"${r.pesan}"</em>
        </div>

        <div style="margin-bottom: 8px;">
          <strong>Status Alur Saat Ini:</strong> <span class="verified-badge">${r.status}</span>
        </div>
        <div style="margin-bottom: 8px;">
          <strong>Unit Disposisi:</strong> ${r.assigned_unit || 'Bidang Teknis'}
        </div>
        <div>
          <strong>Catatan Resolusi / Tindak Lanjut:</strong><br>
          <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 8px 12px; border-radius: 6px; color: #065F46; font-size: 0.82rem; margin-top: 4px;">
            ${r.resolution || 'Belum ada catatan tindak lanjut lapangan.'}
          </div>
        </div>
      </div>
    `,
    icon: "📨",
    type: "info"
  });
};

window.openEditReportModal = function(repId) {
  const reports = getAdminReportsData();
  const r = reports.find(item => item.id === repId);
  if (!r) return;

  CustomModal.form({
    title: `Tindak Lanjut Tiket: ${r.ticket_number || 'DPE-2026'}`,
    icon: "⚡",
    fields: [
      {
        name: "status",
        label: "Status Tahapan Penanganan",
        type: "select",
        value: r.status || "Diterima & Registrasi",
        options: [
          { value: "Diterima & Registrasi", label: "1. Diterima & Registrasi Tiket" },
          { value: "Verifikasi & Analisis", label: "2. Verifikasi & Analisis Substansi" },
          { value: "Penugasan Unit Lapangan", label: "3. Penugasan Unit Teknis Lapangan" },
          { value: "Sedang Ditindaklanjuti Tim", label: "4. Sedang Sidak / Ditindaklanjuti Lapangan" },
          { value: "Penyusunan Respon Pelapor", label: "5. Penyusunan Jawaban Resmi ke Pelapor" },
          { value: "Selesai Ditindaklanjuti", label: "6. Selesai Ditindaklanjuti (Tuntas)" },
          { value: "Ditolak / Tidak Sesuai Kewenangan", label: "❌ Ditolak / Di Luar Kewenangan Dinas" }
        ]
      },
      {
        name: "assigned_unit",
        label: "Unit Teknis Penangan (Disposisi)",
        type: "select",
        value: r.assigned_unit || "Bidang Pengembangan Perdagangan",
        options: [
          { value: "Bidang Pengembangan Perdagangan & TPID", label: "Bidang Pengembangan Perdagangan & TPID" },
          { value: "Bidang Perindustrian, Energi dan SDM (Pengawas LPG)", label: "Bidang Perindustrian, ESDM & Pengawas LPG" },
          { value: "Bidang Kemetrologian (UPTD Metrologi Legal / Tera)", label: "Bidang Kemetrologian (UPTD Metrologi Legal)" },
          { value: "Bidang Sarana dan Pelaku Distribusi (Pasar Rakyat)", label: "Bidang Sarana dan Pelaku Distribusi" },
          { value: "Sekretariat & Tim Pengelola PPID", label: "Sekretariat & Tim Pengelola PPID" }
        ]
      },
      {
        name: "resolution",
        label: "Catatan Hasil Tindak Lanjut / Berita Acara Lapangan",
        type: "textarea",
        value: r.resolution || "",
        placeholder: "Tuliskan hasil sidak, mediasi, atau tindakan teknis yang telah dilakukan...",
        required: true,
        rows: 4
      }
    ],
    onSubmit: async (vals) => {
      if (typeof db === 'undefined' || !db) throw new Error('Firestore tidak tersedia; perubahan tidak disimpan.');
      const update = {
        status: vals.status,
        assigned_unit: vals.assigned_unit,
        resolution: vals.resolution,
        updated_at: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + " WITA",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // Sinkronkan step numerik
      if (vals.status.includes('Diterima')) update.step = 1;
      else if (vals.status.includes('Verifikasi')) update.step = 2;
      else if (vals.status.includes('Penugasan')) update.step = 3;
      else if (vals.status.includes('Ditindaklanjuti') || vals.status.includes('Sidak')) update.step = 4;
      else if (vals.status.includes('Respon')) update.step = 5;
      else if (vals.status.includes('Selesai')) update.step = 6;
      else update.step = 1;

      await db.collection('reports').doc(r.id).update(update);
      Object.assign(r, update);
      renderAdminReports();
      logAdminActivity('Pengaduan', `Tindak lanjut tiket ${r.ticket_number} (${vals.status})`);
      CustomModal.toast(`Tiket ${r.ticket_number} berhasil diperbarui menjadi '${vals.status}'!`, "success");
    }
  });
};

// 8. TABEL PENGGUNA ASN & RBAC
let firebaseManagedUsers = null;
let firebaseUsersAuthWaitRegistered = false;
let adminUserTypeFilter = 'all';

const FIREBASE_ROLE_META = {
  SUPER_ADMIN: { label: 'Super Administrator', icon: '👑', type: 'employee', permissions: ['all'] },
  SECRETARIAT_ADMIN: { label: 'Sekretaris Dinas', icon: '📋', type: 'employee', permissions: ['dashboard','news','banners','documents','reports','command_center','settings'] },
  TRADE_EDITOR: { label: 'Kabid Perdagangan & TPID', icon: '🛒', type: 'employee', permissions: ['dashboard','prices','news','reports','command_center'] },
  INDUSTRY_ESDM_EDITOR: { label: 'Kabid Perindustrian, ESDM & Pengawas LPG', icon: '⚡', type: 'employee', permissions: ['dashboard','ikm','lpg','news','reports','command_center'] },
  METROLOGY_EDITOR: { label: 'Kabid Kemetrologian', icon: '⚖', type: 'employee', permissions: ['dashboard','news','reports','command_center'] },
  DISTRIBUTION_EDITOR: { label: 'Kabid Sarana Pasar & Distribusi', icon: '🏪', type: 'employee', permissions: ['dashboard','prices','news','reports','command_center'] },
  PUBLIC_RELATIONS_EDITOR: { label: 'Editor Humas & Komunikasi Publik', icon: '📣', type: 'employee', permissions: ['dashboard','news','banners','reports','command_center','media'] },
  LPG_ADMIN: { label: 'Administrator LPG Dinas', icon: '🔥', type: 'employee', permissions: ['dashboard','lpg','reports','command_center'] },
  MARKET_OFFICER: { label: 'Petugas Operasional Pasar', icon: '🏬', type: 'employee', permissions: ['prices','reports'] },
  LPG_AGENT_ADMIN: { label: 'Admin Agen LPG', icon: '⛽', type: 'agent', permissions: ['lpg_agent'] },
  LPG_AGENT_OPERATOR: { label: 'Operator Agen LPG', icon: '🚚', type: 'agent', permissions: ['lpg_agent'] },
  LPG_MONITOR: { label: 'Monitor LPG', icon: '👁', type: 'employee', permissions: ['lpg'] }
};

function getFirebaseRoleMeta(userOrRole) {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  const fallbackType = userOrRole?.agentId ? 'agent' : 'employee';
  return FIREBASE_ROLE_META[role] || { label: role || 'Tanpa Role', icon: '👤', type: fallbackType, permissions: [] };
}

function escapeAdminUserText(value, fallback = '-') {
  const text = value === undefined || value === null || value === '' ? fallback : String(value);
  return text.replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

window.setAdminUserFilter = function(type) {
  adminUserTypeFilter = ['all', 'employee', 'agent'].includes(type) ? type : 'all';
  document.querySelectorAll('.admin-user-filter').forEach(button => {
    button.className = button.dataset.userFilter === adminUserTypeFilter
      ? 'btn-primary admin-user-filter' : 'btn-outline admin-user-filter';
  });
  renderAdminUsers();
};

async function loadFirebaseManagedUsers() {
  const session = getCurrentSession();
  if (!session || session.authProvider !== 'FIREBASE' || typeof db === 'undefined' || !db) return;
  if (typeof auth !== 'undefined' && auth && !auth.currentUser) {
    if (!firebaseUsersAuthWaitRegistered) {
      firebaseUsersAuthWaitRegistered = true;
      const unsubscribe = auth.onAuthStateChanged(user => {
        if (!user) return;
        unsubscribe();
        firebaseUsersAuthWaitRegistered = false;
        loadFirebaseManagedUsers();
      });
    }
    return;
  }
  try {
    const snapshot = await db.collection('users').orderBy('name').get();
    firebaseManagedUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    renderAdminUsers();
  } catch (error) {
    console.error('Gagal memuat pengguna Firebase:', error.code);
    const tbody = document.getElementById('adminUsersTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#B91C1C;padding:24px;">Pengguna Firebase tidak dapat dimuat.</td></tr>';
  }
}

function renderAdminUsersLegacy() {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  const session = getCurrentSession();
  if (session && session.authProvider === 'FIREBASE') {
    if (firebaseManagedUsers === null) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748B;padding:24px;">Memuat pengguna Firebase...</td></tr>';
      loadFirebaseManagedUsers();
      return;
    }
  }
  const users = session && session.authProvider === 'FIREBASE' ? firebaseManagedUsers : getAllUsers();

  tbody.innerHTML = users.map(u => {
    const isCurrent = session && ((u.uid && session.uid === u.uid) || session.username === u.username);
    return `
      <tr>
        <td>
          <strong>${u.name}</strong> ${isCurrent ? '<span style="font-size:0.68rem; background:#DCFCE7; color:#166534; padding:2px 6px; border-radius:4px; font-weight:800;">(Anda)</span>' : ''}<br>
          <small style="color: #64748B;">${u.email || '@' + u.username}</small>
        </td>
        <td><code>${u.nip || '-'}</code></td>
        <td><strong>${u.position}</strong><br><small style="color: #64748B;">${u.unit}</small></td>
        <td><span class="badge-cat" style="background: #FEF3C7; color: #B45309;">${u.roleIcon || '👤'} ${u.roleLabel}</span></td>
        <td><span class="verified-badge">${u.canAccessAdmin ? '✓ CMS Admin' : '📱 Hanya Petugas HP'}</span></td>
        <td style="text-align: center;">
          <div class="btn-action-group" style="justify-content: center;">
            <button onclick="openEditUserModal('${u.uid || u.username}')" class="btn-action-item btn-action-edit" title="Sunting Akun ASN">
              ✏️ Edit
            </button>
            ${!isCurrent ? `
              <button onclick="deleteUserRecord('${u.uid || u.username}')" class="btn-action-item btn-action-delete" title="Hapus Pengguna">
                🗑️
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAdminUsers() {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;
  const session = getCurrentSession();
  if (session?.authProvider === 'FIREBASE' && firebaseManagedUsers === null) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748B;padding:28px;">Memuat akun Firebase...</td></tr>';
    loadFirebaseManagedUsers();
    return;
  }
  const sourceUsers = session?.authProvider === 'FIREBASE' ? firebaseManagedUsers : getAllUsers();
  const users = (sourceUsers || []).map(user => ({ ...user, _meta: getFirebaseRoleMeta(user) }));
  const employees = users.filter(user => user._meta.type === 'employee');
  const agents = users.filter(user => user._meta.type === 'agent');
  const groups = adminUserTypeFilter === 'employee' ? [['Pegawai Dinas', employees]]
    : adminUserTypeFilter === 'agent' ? [['Agen Penyalur LPG 3 Kg', agents]]
    : [['Pegawai Dinas', employees], ['Agen Penyalur LPG 3 Kg', agents]];
  const summary = document.getElementById('adminUsersSummary');
  if (summary) summary.textContent = `${employees.length} pegawai • ${agents.length} akun agen`;

  tbody.innerHTML = groups.map(([label, groupUsers]) => {
    if (!groupUsers.length) return '';
    const isAgentGroup = label.startsWith('Agen');
    const rows = groupUsers.map(user => {
      const meta = user._meta;
      const isCurrent = session && ((user.uid && session.uid === user.uid) || session.username === user.username);
      const accessLabel = meta.type === 'agent' ? 'Portal Agen LPG'
        : (user.role === 'MARKET_OFFICER' ? 'Aplikasi Petugas' : 'CMS Sesuai Fungsi');
      const identityCode = meta.type === 'agent' ? user.agentId : user.nip;
      const primaryPosition = meta.type === 'agent' ? user.agentName : user.position;
      const secondaryPosition = meta.type === 'agent' ? 'Agen LPG 3 Kg' : user.unit;
      return `<tr>
        <td><strong>${escapeAdminUserText(user.name, 'Nama belum dilengkapi')}</strong> ${isCurrent ? '<span style="font-size:.68rem;background:#DCFCE7;color:#166534;padding:2px 6px;border-radius:4px;font-weight:800;">(Anda)</span>' : ''}<br><small style="color:#64748B;">${escapeAdminUserText(user.email || (user.username ? '@' + user.username : null))}</small></td>
        <td><code>${escapeAdminUserText(identityCode)}</code></td>
        <td><strong>${escapeAdminUserText(primaryPosition, meta.type === 'agent' ? 'Nama agen belum diisi' : 'Jabatan belum diisi')}</strong><br><small style="color:#64748B;">${escapeAdminUserText(secondaryPosition, 'Unit belum diisi')}</small></td>
        <td><span class="badge-cat" style="background:${meta.type === 'agent' ? '#DCFCE7' : '#FEF3C7'};color:${meta.type === 'agent' ? '#166534' : '#92400E'};">${meta.icon} ${escapeAdminUserText(meta.label)}</span></td>
        <td><span class="verified-badge">${accessLabel}</span></td>
        <td style="text-align:center;"><div class="btn-action-group" style="justify-content:center;">
          <button onclick="openEditUserModal('${escapeAdminUserText(user.uid || user.username)}')" class="btn-action-item btn-action-edit" title="Sunting profil dan hak akses">✏ Edit</button>
          ${!isCurrent ? `<button onclick="deleteUserRecord('${escapeAdminUserText(user.uid || user.username)}')" class="btn-action-item btn-action-delete" title="Nonaktifkan akun">🗑</button>` : ''}
        </div></td>
      </tr>`;
    }).join('');
    return `<tr><td colspan="6" style="background:${isAgentGroup ? '#065F46' : '#1E3A8A'};color:#fff;font-weight:800;padding:10px 16px;">${label} <span style="opacity:.75;font-weight:600;">(${groupUsers.length})</span></td></tr>${rows}`;
  }).join('') || '<tr><td colspan="6" style="text-align:center;padding:28px;color:#64748B;">Tidak ada akun pada kategori ini.</td></tr>';
}

window.openAddUserModal = function() {
  const session = getCurrentSession();
  if (session && session.authProvider === 'FIREBASE') {
    openAddFirebaseUserModal();
    return;
  }
  CustomModal.form({
    title: "Tambah Pengguna ASN Baru",
    icon: "👤",
    fields: [
      { name: "name", label: "Nama Lengkap ASN Beserta Gelar", type: "text", required: true, placeholder: "Contoh: Ir. H. Ahmad Dahlan, M.Si" },
      { name: "nip", label: "Nomor Induk Pegawai (NIP)", type: "text", required: true, placeholder: "19850101 201001 1 001" },
      { name: "position", label: "Jabatan Struktural / Fungsional", type: "text", required: true, placeholder: "Contoh: Pengawas Energi Ahli Pertama" },
      { name: "unit", label: "Unit Kerja / Bidang", type: "text", required: true, placeholder: "Contoh: Bidang Perindustrian, Energi dan SDM" },
      { name: "username", label: "Nama Pengguna (Username Login)", type: "text", required: true, placeholder: "Contoh: pengawas_esdm_01" },
      { name: "password", label: "Kata Sandi Awal", type: "password", required: true, placeholder: "Minimal 6 karakter" },
      {
        name: "role",
        label: "Penetapan Peran (Role Access)",
        type: "select",
        options: [
          { value: "super_admin", label: "👑 Kepala Dinas (Super Admin)" },
          { value: "sekretariat_admin", label: "📋 Sekretaris Dinas (Admin PPID & Organisasi)" },
          { value: "perdagangan_editor", label: "🛒 Kabid Perdagangan & Tim TPID" },
          { value: "industri_esdm_editor", label: "⚡ Kabid Perindustrian, ESDM & Pengawas LPG" },
          { value: "kemetrologian_editor", label: "⚖️ Kabid Kemetrologian (Metrologi Legal)" },
          { value: "distribusi_editor", label: "🏪 Kabid Sarana Pasar & Distribusi" },
          { value: "pasar_petugas", label: "🏬 Kepala UPTD Pasar / Petugas Sembako" }
        ]
      },
      {
        name: "panel_access",
        label: "Hak Akses Panel",
        type: "select",
        options: [
          { value: "both", label: "🖥️ CMS Admin Panel & 📱 Petugas HP" },
          { value: "petugas_only", label: "📱 Hanya Aplikasi Petugas HP (Mobile Only)" }
        ]
      }
    ],
    onSubmit: (vals) => {
      const users = getAllUsers();
      const cleanUsername = vals.username.toLowerCase().trim();

      if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
        CustomModal.alert({ title: "Username Telah Terdaftar", message: `Username <strong>@${cleanUsername}</strong> sudah digunakan oleh pengguna lain. Gunakan username lain.`, icon: "⚠️", type: "warning" });
        return;
      }

      const roleMap = {
        super_admin: { label: "Kepala Dinas (Super Admin)", icon: "👑" },
        sekretariat_admin: { label: "Sekretaris Dinas (Admin PPID & Organisasi)", icon: "📋" },
        perdagangan_editor: { label: "Kabid Perdagangan & Tim TPID", icon: "🛒" },
        industri_esdm_editor: { label: "Kabid Perindustrian, ESDM & Pengawas LPG", icon: "⚡" },
        kemetrologian_editor: { label: "Kabid Kemetrologian (Metrologi Legal)", icon: "⚖️" },
        distribusi_editor: { label: "Kabid Sarana Pasar & Distribusi", icon: "🏪" },
        pasar_petugas: { label: "Kepala UPTD Pasar / Petugas Sembako", icon: "🏬" }
      };

      const roleInfo = roleMap[vals.role] || { label: "Aparatur Dinas", icon: "👤" };
      const canAccessAdmin = vals.panel_access === "both";

      const newUser = {
        username: cleanUsername,
        password: vals.password,
        name: vals.name,
        nip: vals.nip,
        position: vals.position,
        unit: vals.unit,
        role: vals.role,
        roleLabel: roleInfo.label,
        roleIcon: roleInfo.icon,
        phone: "0823 1600 2226",
        avatar: "assets/brand/logo_pinrang_opt.png",
        bio: `${vals.position} pada ${vals.unit} Disperindag ESDM Pinrang.`,
        canAccessAdmin: canAccessAdmin,
        canAccessPetugas: true,
        canManageUsers: vals.role === 'super_admin' || vals.role === 'sekretariat_admin',
        canPublishDirectly: true,
        permissions: ["all"]
      };

      users.push(newUser);
      saveAllUsers(users);

      if (typeof db !== 'undefined' && db) {
        db.collection('users').doc(cleanUsername).set(newUser, { merge: true }).catch(e => console.warn(e));
      }

      renderAdminUsers();
      logAdminActivity('Pengguna & RBAC', `Mendaftarkan pengguna baru @${cleanUsername} (${newUser.name})`);
      CustomModal.toast(`Pengguna @${cleanUsername} (${newUser.name}) berhasil didaftarkan!`, "success");
    }
  });
};

function openAddFirebaseUserModal() {
  CustomModal.form({
    title: "Tambah Akun Firebase",
    icon: "🔐",
    fields: [
      { name: "email", label: "Email Login", type: "email", required: true, placeholder: "agen01@lpg.pinrang" },
      { name: "password", label: "Password Awal", type: "password", required: true, placeholder: "Minimal 12 karakter" },
      { name: "name", label: "Nama Pengguna / Operator", type: "text", required: true },
      {
        name: "role", label: "Role", type: "select", required: true,
        options: [
          { value: "LPG_AGENT_ADMIN", label: "Admin Agen LPG" },
          { value: "LPG_AGENT_OPERATOR", label: "Operator Agen LPG" },
          { value: "LPG_MONITOR", label: "Monitor LPG (Read Only)" },
          { value: "LPG_ADMIN", label: "Administrator LPG Dinas" },
          { value: "SUPER_ADMIN", label: "Super Administrator" }
        ]
      },
      { name: "agentId", label: "Kode Agen (wajib untuk akun agen)", type: "text", placeholder: "AG-001" },
      { name: "agentName", label: "Nama Agen", type: "text", placeholder: "PT. ..." }
    ],
    onSubmit: async vals => {
      const email = vals.email.trim().toLowerCase();
      const password = vals.password;
      const isAgentRole = ['LPG_AGENT_ADMIN', 'LPG_AGENT_OPERATOR'].includes(vals.role);
      const agentId = (vals.agentId || '').trim().toUpperCase();
      if (password.length < 12) {
        CustomModal.alert({ title: 'Password Terlalu Pendek', message: 'Gunakan minimal 12 karakter.', type: 'warning', icon: '⚠️' });
        return;
      }
      if (isAgentRole && !/^AG-\d{3}$/.test(agentId)) {
        CustomModal.alert({ title: 'Kode Agen Tidak Valid', message: 'Akun agen wajib memakai format AG-001.', type: 'warning', icon: '⚠️' });
        return;
      }

      let secondaryApp = null;
      let secondaryUser = null;
      try {
        const appName = `user-provision-${Date.now()}`;
        secondaryApp = firebase.initializeApp(firebaseConfig, appName);
        const credential = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
        secondaryUser = credential.user;
        const profile = {
          email,
          username: email.split('@')[0],
          name: vals.name.trim(),
          role: vals.role,
          roleLabel: vals.role.replace(/_/g, ' '),
          status: 'ACTIVE',
          agentId: isAgentRole ? agentId : null,
          agentName: isAgentRole ? (vals.agentName || '').trim() : null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: getCurrentSession().uid
        };
        await db.collection('users').doc(secondaryUser.uid).set(profile);
        await secondaryApp.auth().signOut();
        await secondaryApp.delete();
        secondaryApp = null;
        firebaseManagedUsers = null;
        await loadFirebaseManagedUsers();
        CustomModal.toast(`Akun Firebase ${email} berhasil dibuat.`, 'success');
      } catch (error) {
        if (secondaryUser) {
          try { await secondaryUser.delete(); } catch (cleanupError) {}
        }
        if (secondaryApp) {
          try { await secondaryApp.delete(); } catch (cleanupError) {}
        }
        const messages = {
          'auth/email-already-in-use': 'Email sudah digunakan akun Firebase lain.',
          'auth/invalid-email': 'Format email tidak valid.',
          'auth/weak-password': 'Password belum memenuhi persyaratan Firebase.'
        };
        CustomModal.alert({ title: 'Gagal Membuat Akun', message: messages[error.code] || 'Akun Firebase tidak dapat dibuat.', type: 'error', icon: '❌' });
      }
    }
  });
}

window.openEditUserModal = function(targetUsername) {
  const activeSession = getCurrentSession();
  if (activeSession && activeSession.authProvider === 'FIREBASE') {
    openEditFirebaseUserModal(targetUsername);
    return;
  }
  const users = getAllUsers();
  const u = users.find(x => x.username === targetUsername);
  if (!u) return;

  CustomModal.form({
    title: `Sunting Pengguna: @${u.username}`,
    icon: "✏️",
    fields: [
      { name: "name", label: "Nama Lengkap Beserta Gelar", type: "text", value: u.name, required: true },
      { name: "nip", label: "NIP", type: "text", value: u.nip || "", required: true },
      { name: "position", label: "Jabatan", type: "text", value: u.position, required: true },
      { name: "unit", label: "Unit Kerja", type: "text", value: u.unit, required: true },
      {
        name: "role",
        label: "Peran Akses (Role)",
        type: "select",
        value: u.role,
        options: [
          { value: "super_admin", label: "👑 Kepala Dinas (Super Admin)" },
          { value: "sekretariat_admin", label: "📋 Sekretaris Dinas (Admin PPID & Organisasi)" },
          { value: "perdagangan_editor", label: "🛒 Kabid Perdagangan & Tim TPID" },
          { value: "industri_esdm_editor", label: "⚡ Kabid Perindustrian, ESDM & Pengawas LPG" },
          { value: "kemetrologian_editor", label: "⚖️ Kabid Kemetrologian (Metrologi Legal)" },
          { value: "distribusi_editor", label: "🏪 Kabid Sarana Pasar & Distribusi" },
          { value: "pasar_petugas", label: "🏬 Kepala UPTD Pasar / Petugas Sembako" }
        ]
      },
      {
        name: "panel_access",
        label: "Hak Akses Panel",
        type: "select",
        value: u.canAccessAdmin ? "both" : "petugas_only",
        options: [
          { value: "both", label: "🖥️ CMS Admin Panel & 📱 Petugas HP" },
          { value: "petugas_only", label: "📱 Hanya Aplikasi Petugas HP (Mobile Only)" }
        ]
      },
      { name: "new_password", label: "Kata Sandi Baru (Kosongkan jika tidak diubah)", type: "password", placeholder: "Isi jika ingin mereset kata sandi" }
    ],
    onSubmit: (vals) => {
      const roleMap = {
        super_admin: { label: "Kepala Dinas (Super Admin)", icon: "👑" },
        sekretariat_admin: { label: "Sekretaris Dinas (Admin PPID & Organisasi)", icon: "📋" },
        perdagangan_editor: { label: "Kabid Perdagangan & Tim TPID", icon: "🛒" },
        industri_esdm_editor: { label: "Kabid Perindustrian, ESDM & Pengawas LPG", icon: "⚡" },
        kemetrologian_editor: { label: "Kabid Kemetrologian (Metrologi Legal)", icon: "⚖️" },
        distribusi_editor: { label: "Kabid Sarana Pasar & Distribusi", icon: "🏪" },
        pasar_petugas: { label: "Kepala UPTD Pasar / Petugas Sembako", icon: "🏬" }
      };

      const roleInfo = roleMap[vals.role] || { label: "Aparatur Dinas", icon: "👤" };
      u.name = vals.name;
      u.nip = vals.nip;
      u.position = vals.position;
      u.unit = vals.unit;
      u.role = vals.role;
      u.roleLabel = roleInfo.label;
      u.roleIcon = roleInfo.icon;
      u.canAccessAdmin = vals.panel_access === "both";
      u.canManageUsers = vals.role === 'super_admin' || vals.role === 'sekretariat_admin';

      if (vals.new_password && vals.new_password.trim().length > 0 && vals.new_password.trim().length < 12) {
        CustomModal.alert({ title: 'Kata Sandi Terlalu Pendek', message: 'Kata sandi baru harus memiliki sedikitnya 12 karakter.', type: 'warning', icon: '!' });
        return;
      }
      if (vals.new_password && vals.new_password.trim().length >= 12) {
        u.password = vals.new_password.trim();
      }

      saveAllUsers(users);

      if (typeof db !== 'undefined' && db) {
        db.collection('users').doc(u.username).set(u, { merge: true }).catch(e => console.warn(e));
      }

      renderAdminUsers();
      logAdminActivity('Pengguna & RBAC', `Memperbarui akun @${u.username}`);
      CustomModal.toast(`Data pengguna @${u.username} berhasil diperbarui!`, "success");
    }
  });
};

function openEditFirebaseUserModalLegacy(uid) {
  const user = (firebaseManagedUsers || []).find(item => item.uid === uid);
  if (!user) return;
  CustomModal.form({
    title: `Sunting Profil: ${user.email}`,
    icon: '✏️',
    fields: [
      { name: 'name', label: 'Nama Pengguna / Operator', type: 'text', required: true, value: user.name || '' },
      {
        name: 'role', label: 'Role', type: 'select', required: true, value: user.role,
        options: [
          { value: 'LPG_AGENT_ADMIN', label: 'Admin Agen LPG' },
          { value: 'LPG_AGENT_OPERATOR', label: 'Operator Agen LPG' },
          { value: 'LPG_MONITOR', label: 'Monitor LPG (Read Only)' },
          { value: 'LPG_ADMIN', label: 'Administrator LPG Dinas' },
          { value: 'SUPER_ADMIN', label: 'Super Administrator' }
        ]
      },
      { name: 'agentId', label: 'Kode Agen', type: 'text', value: user.agentId || '' },
      { name: 'agentName', label: 'Nama Agen', type: 'text', value: user.agentName || '' },
      {
        name: 'status', label: 'Status Akun', type: 'select', value: user.status || 'ACTIVE',
        options: [{ value: 'ACTIVE', label: 'Aktif' }, { value: 'DISABLED', label: 'Dinonaktifkan' }]
      }
    ],
    onSubmit: async vals => {
      const isAgentRole = ['LPG_AGENT_ADMIN', 'LPG_AGENT_OPERATOR'].includes(vals.role);
      const agentId = (vals.agentId || '').trim().toUpperCase();
      if (isAgentRole && !/^AG-\d{3}$/.test(agentId)) {
        CustomModal.alert({ title: 'Kode Agen Tidak Valid', message: 'Gunakan format AG-001.', type: 'warning', icon: '⚠️' });
        return;
      }
      await db.collection('users').doc(uid).update({
        name: vals.name.trim(),
        role: vals.role,
        roleLabel: vals.role.replace(/_/g, ' '),
        agentId: isAgentRole ? agentId : null,
        agentName: isAgentRole ? (vals.agentName || '').trim() : null,
        status: vals.status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: getCurrentSession().uid
      });
      firebaseManagedUsers = null;
      await loadFirebaseManagedUsers();
      CustomModal.toast(`Profil ${user.email} berhasil diperbarui.`, 'success');
    }
  });
}

function openEditFirebaseUserModal(uid) {
  const user = (firebaseManagedUsers || []).find(item => item.uid === uid);
  if (!user) return;
  const currentMeta = getFirebaseRoleMeta(user);
  const isAgent = currentMeta.type === 'agent';
  const roleOptions = Object.entries(FIREBASE_ROLE_META)
    .filter(([, meta]) => meta.type === currentMeta.type)
    .map(([value, meta]) => ({ value, label: `${meta.icon} ${meta.label}` }));
  const fields = [
    { name: 'name', label: isAgent ? 'Nama Operator Agen' : 'Nama Lengkap Pegawai', type: 'text', required: true, value: user.name || '' },
    { name: 'role', label: 'Peran dan Hak Akses', type: 'select', required: true, value: user.role, options: roleOptions }
  ];
  if (isAgent) {
    fields.push(
      { name: 'agentId', label: 'Kode Agen', type: 'text', required: true, value: user.agentId || '', placeholder: 'AG-001' },
      { name: 'agentName', label: 'Nama Perusahaan Agen', type: 'text', required: true, value: user.agentName || '' }
    );
  } else {
    fields.push(
      { name: 'nip', label: 'NIP (opsional)', type: 'text', value: user.nip || '' },
      { name: 'position', label: 'Jabatan / Fungsi', type: 'text', required: true, value: user.position || '' },
      { name: 'unit', label: 'Unit Kerja', type: 'text', required: true, value: user.unit || '' }
    );
  }
  fields.push({
    name: 'status', label: 'Status Akun', type: 'select', value: user.status || 'ACTIVE',
    options: [{ value: 'ACTIVE', label: 'Aktif' }, { value: 'DISABLED', label: 'Dinonaktifkan' }]
  });

  CustomModal.form({
    title: `${isAgent ? 'Sunting Akun Agen' : 'Sunting Akun Pegawai'}: ${user.email}`,
    icon: isAgent ? '⛽' : '✏', fields,
    onSubmit: async vals => {
      const meta = getFirebaseRoleMeta(vals.role);
      const update = {
        name: vals.name.trim(), role: vals.role, roleLabel: meta.label, roleIcon: meta.icon,
        permissions: meta.permissions, status: vals.status,
        canAccessPetugas: vals.role === 'MARKET_OFFICER' || meta.type === 'agent',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: getCurrentSession().uid
      };
      if (isAgent) {
        const agentId = (vals.agentId || '').trim().toUpperCase();
        if (!/^AG-\d{3}$/.test(agentId)) {
          CustomModal.alert({ title: 'Kode Agen Tidak Valid', message: 'Gunakan format AG-001.', type: 'warning', icon: '!' });
          return;
        }
        update.agentId = agentId;
        update.agentName = (vals.agentName || '').trim();
      } else {
        update.nip = (vals.nip || '').trim() || null;
        update.position = (vals.position || '').trim();
        update.unit = (vals.unit || '').trim();
        update.agentId = null;
        update.agentName = null;
      }
      try {
        await db.collection('users').doc(uid).update(update);
        firebaseManagedUsers = null;
        await loadFirebaseManagedUsers();
        CustomModal.toast(`Profil ${user.email} berhasil diperbarui.`, 'success');
      } catch (error) {
        CustomModal.alert({ title: 'Gagal Menyimpan', message: `Perubahan profil ditolak (${error.code || 'unknown'}).`, type: 'error', icon: '!' });
      }
    }
  });
}

window.deleteUserRecord = function(targetUsername) {
  const session = getCurrentSession();
  if (session && session.authProvider === 'FIREBASE') {
    if (session.uid === targetUsername) {
      CustomModal.alert({ title: 'Tindakan Ditolak', message: 'Akun yang sedang digunakan tidak dapat dinonaktifkan.', icon: '🚫', type: 'warning' });
      return;
    }
    const target = (firebaseManagedUsers || []).find(item => item.uid === targetUsername);
    if (!target) return;
    CustomModal.confirm({
      title: 'Nonaktifkan Profil Akses?',
      message: `Profil akses <strong>${target.email}</strong> akan dinonaktifkan. Akun Auth tidak dihapus agar histori UID tetap utuh.`,
      icon: '🚫', isDanger: true, confirmText: 'Nonaktifkan',
      onSubmit: async () => {
        await db.collection('users').doc(targetUsername).update({
          status: 'DISABLED',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: session.uid
        });
        firebaseManagedUsers = null;
        await loadFirebaseManagedUsers();
        CustomModal.toast(`Profil ${target.email} dinonaktifkan.`, 'info');
      }
    });
    return;
  }
  if (session && session.username === targetUsername) {
    CustomModal.alert({ title: "Tindakan Ditolak", message: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.", icon: "🚫", type: "warning" });
    return;
  }

  CustomModal.confirm({
    title: "Hapus Akun Pengguna?",
    message: `Apakah Anda yakin ingin menghapus akun aparatur <strong>@${targetUsername}</strong>?<br><br><span style="color:#DC2626; font-size:0.8rem;">Pengguna ini tidak akan dapat login lagi ke sistem.</span>`,
    icon: "🗑️",
    confirmText: "Ya, Hapus Pengguna",
    isDanger: true,
    onSubmit: () => {
      let users = getAllUsers();
      users = users.filter(x => x.username !== targetUsername);
      saveAllUsers(users);

      if (typeof db !== 'undefined' && db) {
        db.collection('users').doc(targetUsername).delete().catch(e => console.warn(e));
      }

      renderAdminUsers();
      logAdminActivity('Pengguna & RBAC', `Menghapus akun @${targetUsername}`);
      CustomModal.toast(`Pengguna @${targetUsername} berhasil dihapus dari sistem.`, "info");
    }
  });
};

// 9. MANAJEMEN COMMAND CENTER & TV WALLBOARD CONTROLLER
function renderAdminCommandCenter() {
  const config = getStorage('disperindag_command_center', DEFAULT_COMMAND_CENTER_CONFIG);
  
  // Isi nilai form metrik
  const fields = [
    'inflation_rate', 'inflation_status', 'pasar_sentral_stalls', 'pasar_sentral_status',
    'uttp_verified', 'spbu_verified_pct', 'uttp_status',
    'het_lpg_price', 'lpg_distribution_pct', 'lpg_distributed_bottles', 'lpg_total_quota',
    'total_ikm_trained', 'total_ikm_certified', 'skm_score', 'skm_grade'
  ];

  fields.forEach(f => {
    const el = document.getElementById(`cc_${f}`);
    if (el && config[f] !== undefined) {
      el.value = config[f];
    }
  });

  renderDistrictsTable();
}

function renderDistrictsTable() {
  const tbody = document.getElementById('ccDistrictsTableBody');
  if (!tbody) return;

  const districts = getStorage('disperindag_districts', DEFAULT_DISTRICTS_STATUS);
  tbody.innerHTML = districts.map((d, index) => {
    const badgeColor = d.status === 'NORMAL' ? '#10B981' : (d.status === 'WASPADA' ? '#F59E0B' : '#EF4444');
    const badgeBg = d.status === 'NORMAL' ? '#D1FAE5' : (d.status === 'WASPADA' ? '#FEF3C7' : '#FEE2E2');
    return `
      <tr>
        <td><strong>${d.name}</strong></td>
        <td>
          <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 4px 10px; border-radius: 12px; font-weight: 800; font-size: 0.76rem;">
            ${d.icon || '🟢'} ${d.status}
          </span>
        </td>
        <td><strong>${d.pangkalan || 0}</strong> Pangkalan</td>
        <td><span style="font-size: 0.8rem; color: #475569;">${d.note || '-'}</span></td>
        <td style="text-align: center;">
          <button onclick="editDistrictStatus(${index})" class="btn-action-item btn-action-edit" style="font-size: 0.76rem; padding: 5px 10px;">
            ✏️ Ubah Status
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.saveCommandCenterMetrics = async function(e) {
  e.preventDefault();
  const config = getStorage('disperindag_command_center', DEFAULT_COMMAND_CENTER_CONFIG);

  const fields = [
    'inflation_rate', 'inflation_status', 'pasar_sentral_stalls', 'pasar_sentral_status',
    'uttp_verified', 'spbu_verified_pct', 'uttp_status',
    'het_lpg_price', 'lpg_distribution_pct', 'lpg_distributed_bottles', 'lpg_total_quota',
    'total_ikm_trained', 'total_ikm_certified', 'skm_score', 'skm_grade'
  ];

  const numericFields = new Set([
    'inflation_rate', 'pasar_sentral_stalls', 'uttp_verified', 'spbu_verified_pct',
    'het_lpg_price', 'lpg_distribution_pct', 'lpg_distributed_bottles', 'lpg_total_quota',
    'total_ikm_trained', 'total_ikm_certified', 'skm_score'
  ]);

  fields.forEach(f => {
    const el = document.getElementById(`cc_${f}`);
    if (el) {
      const rawValue = el.value.trim().replace(/[^0-9,.-]/g, '').replace(',', '.');
      config[f] = numericFields.has(f)
        ? (rawValue === '' || !Number.isFinite(Number(rawValue)) ? null : Number(rawValue))
        : (el.value.trim() || null);
    }
  });

  const localUpdatedAt = new Date().toISOString();
  config.updated_at = localUpdatedAt;
  delete config.last_updated;

  setStorage('disperindag_command_center', config);

  // Sync to Cloud Firestore if initialized
  if (typeof db !== 'undefined' && db) {
    try {
      const cloudConfig = {
        ...config,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('command_center').doc('metrics').set(cloudConfig, { merge: true });
      if (Number.isInteger(config.het_lpg_price) && config.het_lpg_price > 0) {
        const existingSettings = await db.collection('lpg_settings').doc('operational').get({source:'server'});
        if (!existingSettings.exists) throw new Error('Pengaturan LPG belum tersedia; buat master pengaturan LPG terlebih dahulu.');
        await db.collection('lpg_settings').doc('operational').set({
          hetPrice:config.het_lpg_price,
          hetRegulation:config.het_lpg_regulation || existingSettings.data().hetRegulation,
          updatedBy:auth.currentUser.uid,
          updatedAt:firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true});
      }
      console.log('Command Center metrics synced to Firestore');
    } catch (err) {
      console.warn('Firestore sync note:', err);
      CustomModal.alert({
        title: 'Sinkronisasi Cloud Gagal',
        message: 'Data tersimpan sebagai cache lokal, tetapi belum menjadi data LIVE karena gagal memperoleh timestamp server.',
        icon: '⚠️',
        type: 'warning'
      });
      return;
    }
  }

  logAdminActivity('Command Center', 'Memperbarui metrik operasional TV Wallboard');
  CustomModal.alert({
    title: "Sinkronisasi Berhasil! 🎉",
    message: "Seluruh metrik operasional Command Center berhasil diperbarui. Layar TV Wallboard pimpinan akan langsung menampilkan data terbaru beserta live running ticker harga pasar terpadu.",
    icon: "📺",
    type: "success"
  });
};

window.editDistrictStatus = function(index) {
  const districts = getStorage('disperindag_districts', DEFAULT_DISTRICTS_STATUS);
  const d = districts[index];
  if (!d) return;

  CustomModal.form({
    title: `Ubah Status: Kec. ${d.name}`,
    icon: "📍",
    fields: [
      {
        name: "stock_coverage_days",
        label: "Cakupan Stok (hari)",
        type: "number",
        value: d.stock_coverage_days ?? ''
      },
      {
        name: "active_reports",
        label: "Jumlah Aduan Aktif",
        type: "number",
        value: d.active_reports ?? 0
      },
      {
        name: "pangkalan",
        label: "Jumlah Pangkalan LPG Aktif",
        type: "number",
        value: d.pangkalan
      },
      {
        name: "note",
        label: "Catatan Kondisi Lapangan",
        type: "text",
        value: d.note
      }
    ],
    onSubmit: (vals) => {
      d.stock_coverage_days = Number.isFinite(Number(vals.stock_coverage_days)) ? Number(vals.stock_coverage_days) : null;
      d.active_reports = Number.isFinite(Number(vals.active_reports)) ? Math.max(0, Number(vals.active_reports)) : 0;
      d.status = d.stock_coverage_days !== null && d.stock_coverage_days < 2 || d.active_reports >= 3
        ? 'KRITIS'
        : (d.stock_coverage_days !== null && d.stock_coverage_days < 4 || d.active_reports > 0 ? 'WASPADA' : 'NORMAL');
      d.icon = d.status === 'NORMAL' ? '🟢' : (d.status === 'WASPADA' ? '🟡' : '🔴');
      d.pangkalan = parseInt(vals.pangkalan, 10) || d.pangkalan;
      d.note = vals.note;

      districts[index] = d;
      setStorage('disperindag_districts', districts);

      if (typeof db !== 'undefined' && db) {
        db.collection('command_center').doc('districts').set({
          items: districts,
          updated_at: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
          .catch(err => console.warn(err));
      }

      renderDistrictsTable();
      logAdminActivity('Command Center', `Ubah status pengawasan Kec. ${d.name} (${d.status})`);
      CustomModal.toast(`Status Kec. ${d.name} berhasil disinkronkan ke Command Center!`, 'success');
    }
  });
};

// ==============================================================================
// Media Intelligence dikelola melalui media-intelligence-admin.html.

// 11. MANAJEMEN KONFIGURASI SITUS, KONTAK & JAM PELAYANAN
function renderAdminSettings() {
  const settings = getStorage('disperindag_site_settings', DEFAULT_SITE_SETTINGS || {});
  const hours = getStorage('disperindag_service_hours', DEFAULT_SERVICE_HOURS || {});

  // Isi form site settings
  if (document.getElementById('set_office_address')) document.getElementById('set_office_address').value = settings.address || "Jalan Bintang No. 1, Kabupaten Pinrang, Sulawesi Selatan";
  if (document.getElementById('set_contact_wa')) document.getElementById('set_contact_wa').value = settings.whatsapp || "0823 1600 2226";
  if (document.getElementById('set_contact_email')) document.getElementById('set_contact_email').value = settings.email || "dinasperindagem.pinrang@gmail.com";
  if (document.getElementById('set_hours_weekday')) document.getElementById('set_hours_weekday').value = hours.regular || "07.30 - 16.00 WITA";
  if (document.getElementById('set_hours_friday')) document.getElementById('set_hours_friday').value = hours.friday || "07.30 - 16.30 WITA";
  if (document.getElementById('set_social_ig')) document.getElementById('set_social_ig').value = settings.instagram_handle || "@perindagempinrang";
  if (document.getElementById('set_social_fb')) document.getElementById('set_social_fb').value = settings.facebook_title || "Disperindag-ESDM Pinrang";
  if (document.getElementById('set_social_yt')) document.getElementById('set_social_yt').value = settings.youtube_channel || "Disperindag ESDM Pinrang Official";

  renderAuditLogs();
}

window.saveSiteSettings = function(e) {
  if (e) e.preventDefault();

  const settings = getStorage('disperindag_site_settings', DEFAULT_SITE_SETTINGS || {});
  const hours = getStorage('disperindag_service_hours', DEFAULT_SERVICE_HOURS || {});

  settings.address = document.getElementById('set_office_address').value.trim();
  settings.whatsapp = document.getElementById('set_contact_wa').value.trim();
  settings.email = document.getElementById('set_contact_email').value.trim();
  settings.instagram_handle = document.getElementById('set_social_ig').value.trim();
  settings.facebook_title = document.getElementById('set_social_fb').value.trim();
  settings.youtube_channel = document.getElementById('set_social_yt').value.trim();

  hours.regular = document.getElementById('set_hours_weekday').value.trim();
  hours.friday = document.getElementById('set_hours_friday').value.trim();

  setStorage('disperindag_site_settings', settings);
  setStorage('disperindag_service_hours', hours);

  if (typeof db !== 'undefined' && db) {
    db.collection('system_config').doc('site_settings').set(settings, { merge: true }).catch(e => console.warn(e));
    db.collection('system_config').doc('service_hours').set(hours, { merge: true }).catch(e => console.warn(e));
  }

  logAdminActivity('Konfigurasi Portal', 'Memperbarui data identitas dinas, kontak hotline, dan jam pelayanan');
  CustomModal.alert({
    title: "Konfigurasi Disimpan! 🎉",
    message: "Pengaturan identitas dinas, kontak hotline resmi, dan jam pelayanan telah berhasil disimpan dan disinkronkan ke seluruh halaman portal publik.",
    icon: "⚙️",
    type: "success"
  });
};

// PUSAT BACKUP & RESTORE DATA JSON
window.exportAllDataJSON = function() {
  const backupData = {
    exported_at: new Date().toISOString(),
    version: "2026.08_prod",
    disperindag_prices: getStorage('disperindag_prices', typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []),
    disperindag_news: getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []),
    disperindag_banners: getStorage('disperindag_banners', typeof DEFAULT_BANNERS !== 'undefined' ? DEFAULT_BANNERS : []),
    disperindag_documents: getStorage('disperindag_documents', typeof DEFAULT_DOCUMENTS !== 'undefined' ? DEFAULT_DOCUMENTS : []),
    disperindag_products_ikm: getStorage('disperindag_products_ikm', typeof DEFAULT_PRODUCTS_IKM !== 'undefined' ? DEFAULT_PRODUCTS_IKM : []),
    disperindag_reports: getAdminReportsData(),
    disperindag_districts: getStorage('disperindag_districts', DEFAULT_DISTRICTS_STATUS),
    disperindag_command_center: getStorage('disperindag_command_center', DEFAULT_COMMAND_CENTER_CONFIG),
    disperindag_site_settings: getStorage('disperindag_site_settings', DEFAULT_SITE_SETTINGS),
    disperindag_service_hours: getStorage('disperindag_service_hours', DEFAULT_SERVICE_HOURS),
    disperindag_users: getAllUsers()
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `backup_disperindagesdm_pinrang_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  logAdminActivity('Pusat Data', 'Mengunduh snapshot berkas backup master data JSON');
  CustomModal.toast("Berkas cadangan JSON berhasil diunduh ke komputer Anda!", "success");
};

window.importDataJSON = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || typeof data !== 'object') throw new Error("Format JSON tidak valid");

      CustomModal.confirm({
        title: "Konfirmasi Pemulihan Data",
        message: `Apakah Anda yakin ingin memulihkan master data dari berkas <strong>${file.name}</strong>?<br><br>Data lokal saat ini akan ditimpa dengan data cadangan ini.`,
        icon: "📤",
        confirmText: "Ya, Pulihkan Sekarang",
        isDanger: true,
        onSubmit: () => {
          if (data.disperindag_prices) setStorage('disperindag_prices', data.disperindag_prices);
          if (data.disperindag_news) setStorage('disperindag_news', data.disperindag_news);
          if (data.disperindag_banners) setStorage('disperindag_banners', data.disperindag_banners);
          if (data.disperindag_documents) setStorage('disperindag_documents', data.disperindag_documents);
          if (data.disperindag_products_ikm) setStorage('disperindag_products_ikm', data.disperindag_products_ikm);
          if (data.disperindag_reports) setStorage('disperindag_reports', data.disperindag_reports);
          if (data.disperindag_districts) setStorage('disperindag_districts', data.disperindag_districts);
          if (data.disperindag_command_center) setStorage('disperindag_command_center', data.disperindag_command_center);
          if (data.disperindag_site_settings) setStorage('disperindag_site_settings', data.disperindag_site_settings);
          if (data.disperindag_service_hours) setStorage('disperindag_service_hours', data.disperindag_service_hours);
          if (data.disperindag_users) saveAllUsers(data.disperindag_users);

          logAdminActivity('Pusat Data', `Memulihkan master data dari berkas ${file.name}`);
          CustomModal.alert({
            title: "Pemulihan Berhasil! 🎉",
            message: "Seluruh basis data telah berhasil dipulihkan dari berkas cadangan JSON. Halaman akan dimuat ulang untuk merefleksikan seluruh perubahan.",
            icon: "✅",
            type: "success",
            buttonText: "Muat Ulang CMS",
            onClose: () => {
              window.location.reload();
            }
          });
        }
      });
    } catch(err) {
      CustomModal.alert({ title: "Gagal Membaca Berkas", message: "Berkas yang dipilih bukan berkas JSON cadangan yang valid.", icon: "⚠️", type: "error" });
    }
  };
  reader.readAsText(file);
};

window.resetMasterDataToDefault = function() {
  CustomModal.confirm({
    title: "Reset ke Data Standar Resmi?",
    message: "Tindakan ini akan mengembalikan seluruh dataset harga komoditas, berita kedinasan, banner, dokumen regulasi, etalase IKM, dan pengaturan ke setelan pabrik resmi Disperindag ESDM Pinrang.<br><br><span style=\"color:#DC2626;\">Lakukan ekspor cadangan terlebih dahulu jika ingin menyimpan perubahan Anda.</span>",
    icon: "🔄",
    confirmText: "Ya, Reset ke Standar",
    isDanger: true,
    onSubmit: () => {
      localStorage.removeItem('disperindag_prices');
      localStorage.removeItem('disperindag_news');
      localStorage.removeItem('disperindag_banners');
      localStorage.removeItem('disperindag_documents');
      localStorage.removeItem('disperindag_products_ikm');
      localStorage.removeItem('disperindag_reports');
      localStorage.removeItem('disperindag_districts');
      localStorage.removeItem('disperindag_command_center');
      localStorage.removeItem('disperindag_media_intelligence');
      localStorage.removeItem('disperindag_site_settings');
      localStorage.removeItem('disperindag_service_hours');
      localStorage.removeItem('disperindag_users_version');
      localStorage.removeItem(AUTH_STORE_KEY);

      logAdminActivity('Pusat Data', 'Reset basis data ke setelan standar resmi dinas');
      CustomModal.alert({
        title: "Reset Berhasil",
        message: "Seluruh data telah dikembalikan ke standar awal kedinasan.",
        icon: "✅",
        type: "success",
        buttonText: "Muat Ulang Halaman",
        onClose: () => {
          window.location.reload();
        }
      });
    }
  });
};

// AUDIT LOG SYSTEM
function logAdminActivity(module, action) {
  const logs = getStorage('disperindag_audit_logs', [
    {
      time: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WITA',
      user: getCurrentSession()?.name || "Muhammad Yusuf Nur, S.STP",
      module: "Sistem",
      action: "Inisialisasi sesi administrator",
      status: "Sukses"
    }
  ]);

  logs.unshift({
    time: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WITA',
    user: getCurrentSession()?.name || "Muhammad Yusuf Nur, S.STP",
    module: module,
    action: action,
    status: "Sukses"
  });

  if (logs.length > 50) logs.pop();
  setStorage('disperindag_audit_logs', logs);
}

function renderAuditLogs() {
  const tbody = document.getElementById('adminAuditLogsTableBody');
  if (!tbody) return;

  const logs = getStorage('disperindag_audit_logs', [
    {
      time: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WITA',
      user: getCurrentSession()?.name || "Muhammad Yusuf Nur, S.STP",
      module: "Autentikasi",
      action: "Login sesi administrator aktif",
      status: "Sukses"
    },
    {
      time: "28 Agustus 2026 09:00 WITA",
      user: "Andi Tenri Sose, S.E.",
      module: "Harga Pasar",
      action: "Pembaruan survei 12 komoditas pangan Pasar Sentral",
      status: "Sukses"
    },
    {
      time: "27 Agustus 2026 14:15 WITA",
      user: "Hj. Ratnah, ST, M.Si",
      module: "Pengaduan",
      action: "Registrasi tiket pengaduan DPE-2026-000101",
      status: "Sukses"
    }
  ]);

  tbody.innerHTML = logs.map(l => `
    <tr>
      <td><small style="color: #475569; font-weight: 600;">${l.time}</small></td>
      <td><strong>${l.user}</strong></td>
      <td><span class="badge-cat" style="font-size: 0.75rem;">${l.module}</span></td>
      <td><span style="font-size: 0.82rem; color: #1E293B;">${l.action}</span></td>
      <td><span class="verified-badge">✓ ${l.status || 'Sukses'}</span></td>
    </tr>
  `).join('');
}

window.clearAuditLogs = function() {
  setStorage('disperindag_audit_logs', []);
  renderAuditLogs();
  CustomModal.toast("Catatan riwayat audit log berhasil dibersihkan.", "info");
};
