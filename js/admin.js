// ==============================================================================
// CMS ADMINISTRATOR CONTROLLER - DISPERINDAG ESDM PINRANG (PRODUCTION READY)
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const currentSession = requireAuth(['admin']);
  if (!currentSession) return;

  displayUserInfo(currentSession);
  initAdminTabs();
  renderDashboardStats();
  renderAdminPrices();
  renderAdminNews();
  renderAdminBanners();
  renderAdminDocs();
  renderAdminIkm();
  renderAdminReports();
  renderAdminUsers();
  renderAdminCommandCenter();
  renderAdminMediaIntelligence();
  renderAdminSettings();
  initBannerUploader();

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
    } catch(e) {}
  }

  // Buka tab Dashboard secara default dan sembunyikan semua panel lainnya
  switchAdminTab('tabDashboard');
});

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

window.switchAdminTab = function(tabId) {
  if (!tabId) return;

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

  // 5. Perbarui judul header
  const titleEl = document.getElementById('adminCurrentTabTitle');
  if (titleEl && activeBtn) {
    titleEl.textContent = activeBtn.textContent.trim();
  }

  // 6. Reset scroll posisi ke atas
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

  if (document.getElementById('statPriceCount')) document.getElementById('statPriceCount').textContent = prices.length;
  if (document.getElementById('statNewsCount')) document.getElementById('statNewsCount').textContent = news.length;
  if (document.getElementById('statDocCount')) document.getElementById('statDocCount').textContent = docs.length;
  if (document.getElementById('statIkmCount')) document.getElementById('statIkmCount').textContent = ikm.length;
}

// 2. TABEL HARGA PASAR & EDIT HARGA
function renderAdminPrices() {
  const tbody = document.getElementById('adminPriceTableBody');
  if (!tbody) return;

  const rawPrices = getStorage('disperindag_prices', typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []);
  const prices = typeof mergePricesWithDefaults === 'function' ? mergePricesWithDefaults(rawPrices) : (Array.isArray(rawPrices) && rawPrices.length > 0 ? rawPrices : (typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []));

  tbody.innerHTML = prices.map(item => `
    <tr>
      <td><strong>${item.commodity_name}</strong><br><small style="color: #64748B;">Satuan: 1 ${item.unit}</small></td>
      <td>${item.market_name}</td>
      <td><strong style="color: #1E40AF; font-size: 1rem;">Rp ${Number(item.price || 0).toLocaleString('id-ID')}</strong></td>
      <td>
        <span class="trend-badge ${item.trend}">
          ${item.trend === 'up' ? `▲ +${item.diff || 0}` : item.trend === 'down' ? `▼ ${item.diff || 0}` : '— Tetap'}
        </span>
      </td>
      <td>${item.observed_date || 'Hari Ini'}<br><small style="color: #94A3B8;">${item.observed_time || '09:00 WITA'}</small></td>
      <td><span class="verified-badge">✓ ${item.verification_status || 'Terverifikasi'}</span></td>
      <td style="text-align: center;">
        <button onclick="editPriceModal('${item.id}')" class="btn-action-item btn-action-edit" style="font-size: 0.78rem;">
          ✏️ Edit Harga
        </button>
      </td>
    </tr>
  `).join('');
}

window.editPriceModal = async function(priceId) {
  const rawPrices = getStorage('disperindag_prices', typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []);
  const prices = typeof mergePricesWithDefaults === 'function' ? mergePricesWithDefaults(rawPrices) : (Array.isArray(rawPrices) && rawPrices.length > 0 ? rawPrices : (typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []));
  const item = prices.find(p => p.id === priceId);
  if (!item) return;

  const newVal = await CustomModal.prompt({
    title: `Perbarui Harga: ${item.commodity_name}`,
    message: `Masukkan harga baru untuk <strong>${item.commodity_name}</strong> di ${item.market_name} (Harga saat ini: Rp ${Number(item.price).toLocaleString('id-ID')} / ${item.unit}):`,
    defaultValue: item.price.toString(),
    inputType: "number",
    confirmText: "Simpan & Sinkronkan"
  });

  if (newVal === null || newVal === undefined || newVal.toString().trim() === '') return;

  const parsed = parseInt(newVal.toString().replace(/[^0-9]/g, ''), 10);
  if (isNaN(parsed) || parsed <= 0) {
    CustomModal.alert({ title: "Input Tidak Valid", message: "Nominal harga harus berupa angka positif.", icon: "⚠️", type: "warning" });
    return;
  }

  const prevPrice = item.price;
  item.previous_price = prevPrice;
  item.price = parsed;
  item.diff = parsed - prevPrice;
  item.trend = item.diff > 0 ? 'up' : (item.diff < 0 ? 'down' : 'stable');
  item.observed_date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  item.observed_time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA';

  setStorage('disperindag_prices', prices);
  renderAdminPrices();
  renderDashboardStats();

  if (typeof db !== 'undefined' && db !== null) {
    try {
      db.collection('prices').doc(item.id).set(item, { merge: true });
    } catch(e) {}
  }

  logAdminActivity('Harga Pangan', `Perbarui harga ${item.commodity_name} menjadi Rp ${parsed.toLocaleString('id-ID')}`);
  CustomModal.toast(`Harga ${item.commodity_name} berhasil diperbarui menjadi Rp ${parsed.toLocaleString('id-ID')}/${item.unit}!`, "success");
};

// ==============================================================================
// 3. ENTERPRISE NEWSROOM & PUBLIKASI BERITA KEDINASAN (FULL CMS CRUD)
// ==============================================================================
let currentNewsTags = [];
let currentNewsGallery = [];
let currentFeaturedImage = "assets/news/operasi_pasar_murah_sembako_pinrang.jpg";

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
        <td>
          <div style="position: relative; width: 62px; height: 44px; border-radius: 6px; overflow: hidden; border: 1px solid #CBD5E1; background: #030D1B;">
            <img src="${item.img || 'assets/brand/cover_arsip_berita.png'}" style="width: 100%; height: 100%; object-fit: cover;" alt="Thumbnail" onerror="this.src='assets/brand/cover_arsip_berita.png'">
            ${isFeatured ? '<span style="position:absolute; bottom:2px; right:2px; font-size:0.65rem;" title="Berita Sorotan Beranda">🌟</span>' : ''}
          </div>
        </td>
        <td>
          <div style="font-weight: 800; color: var(--primary-deep); line-height: 1.35; margin-bottom: 4px; font-size: 0.92rem;">
            ${item.title}
          </div>
          <div style="font-size: 0.78rem; color: #64748B; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${item.excerpt || item.content?.slice(0, 120) || '—'}
          </div>
        </td>
        <td>
          <div style="margin-bottom: 4px;">
            <span class="badge-cat" style="font-size: 0.74rem;">${item.category || 'Umum'}</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 3px;">
            ${tagsHtml}
          </div>
        </td>
        <td>
          <div style="font-size: 0.8rem; font-weight: 700; color: #1E293B;">${item.date || '—'}</div>
          <div style="font-size: 0.72rem; color: #64748B; margin-top: 2px;">👤 ${item.author || 'Humas'}</div>
        </td>
        <td>
          <span class="news-status-pill ${isDraft ? 'status-draft' : 'status-published'}">
            ${isDraft ? '📝 Draf' : '● Live'}
          </span>
        </td>
        <td style="text-align: center;">
          <div class="btn-action-group" style="justify-content: center; flex-wrap: wrap; gap: 4px;">
            <button onclick="openNewsEditor('${item.id}')" class="btn-action-item btn-action-edit" title="Sunting Berita (WYSIWYG)">
              ✏️ Edit
            </button>
            <a href="berita.html?id=${encodeURIComponent(item.id)}" target="_blank" class="btn-action-item btn-action-view" title="Buka Pratinjau Rilis Berita Real-Time">
              👁️ Lihat
            </a>
            <button onclick="copyNewsPublicLink('${item.slug || item.id}', '${(item.title || '').replace(/'/g, "\\'")}')" class="btn-action-item" style="background:#EFF6FF; color:#1E40AF; border-color:#BFDBFE;" title="Salin Tautan Medsos (WhatsApp/FB)">
              🔗 Link
            </button>
            <button onclick="toggleNewsStatus('${item.id}')" class="btn-action-item btn-action-view" title="${isDraft ? 'Publikasikan Berita Ini' : 'Tarik ke Draf'}">
              ${isDraft ? '🚀 Terbitkan' : '📦 Draf'}
            </button>
            <button onclick="deleteAdminNews('${item.id}')" class="btn-action-item btn-action-delete" title="Hapus Berita">
              🗑️
            </button>
          </div>
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

  const img = currentFeaturedImage || "assets/news/operasi_pasar_murah_sembako_pinrang.jpg";

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
  document.getElementById('newsFeaturedImageResult').value = path;
  document.getElementById('newsFeaturedPreviewImg').src = path;
  updateLiveSocialPreview();
};

window.handleFeaturedImageUpload = function(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    const rawImg = new Image();
    rawImg.src = e.target.result;
    rawImg.onload = function() {
      // Kompresi Canvas ke maks 1200px lebar
      const canvas = document.createElement('canvas');
      const maxW = 1200;
      let w = rawImg.width;
      let h = rawImg.height;
      if (w > maxW) {
        h = Math.round((h * maxW) / w);
        w = maxW;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(rawImg, 0, 0, w, h);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      currentFeaturedImage = compressedDataUrl;
      document.getElementById('newsFeaturedImageResult').value = compressedDataUrl;
      document.getElementById('newsFeaturedPreviewImg').src = compressedDataUrl;
      updateLiveSocialPreview();
    };
  };
  reader.readAsDataURL(file);
};

window.handleGalleryImagesUpload = function(input) {
  if (!input.files || input.files.length === 0) return;
  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const rawImg = new Image();
      rawImg.src = e.target.result;
      rawImg.onload = function() {
        const canvas = document.createElement('canvas');
        const maxW = 1000;
        let w = rawImg.width;
        let h = rawImg.height;
        if (w > maxW) {
          h = Math.round((h * maxW) / w);
          w = maxW;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(rawImg, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);

        currentNewsGallery.push({
          img: compressed,
          caption: `Dokumentasi kegiatan - ${file.name.replace(/\.[^/.]+$/, '')}`
        });
        renderNewsGalleryGrid();
      };
    };
    reader.readAsDataURL(file);
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
      <img src="${item.img}" alt="Galeri ${idx + 1}">
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
  const img = currentFeaturedImage || 'assets/news/operasi_pasar_murah_sembako_pinrang.jpg';

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
  const editId = document.getElementById('newsEditId')?.value || '';
  const title = document.getElementById('newsTitleInput')?.value?.trim();
  const slug = document.getElementById('newsSlugInput')?.value?.trim();
  const category = document.getElementById('newsCategorySelect')?.value || 'Perindustrian, Energi & SDM';
  const date = document.getElementById('newsDateInput')?.value?.trim() || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const author = document.getElementById('newsAuthorInput')?.value?.trim() || 'Humas Disperindag ESDM Pinrang';
  const excerpt = document.getElementById('newsExcerptInput')?.value?.trim() || '';
  
  // Ambil konten dari visual canvas jika ada, atau dari raw input
  const visualCanvas = document.getElementById('newsVisualCanvas');
  const content = (visualCanvas && visualCanvas.innerHTML.trim() !== '' && visualCanvas.innerHTML !== '<br>') 
    ? visualCanvas.innerHTML.trim() 
    : document.getElementById('newsContentInput')?.value?.trim();

  const caption = document.getElementById('newsFeaturedCaptionInput')?.value?.trim() || 'Dokumentasi resmi liputan kegiatan Disperindag ESDM Pinrang.';
  const isFeatured = document.getElementById('newsIsFeaturedCheckbox')?.checked || false;
  const status = overrideStatus || document.getElementById('newsStatusSelect')?.value || 'published';

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
    gallery: Array.isArray(currentNewsGallery) ? currentNewsGallery : [],
    excerpt: excerpt || (visualCanvas ? visualCanvas.innerText.slice(0, 160) + '...' : content.slice(0, 160) + '...'),
    content: content,
    status: status,
    is_featured: isFeatured,
    updated_at: nowIso,
    published_at: status === 'published' ? (existingArticle?.published_at || nowIso) : null
  };

  if (!editId) {
    articleObj.created_at = nowIso;
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
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          resultInput.value = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('bannerTitle').value.trim();
      const caption = document.getElementById('bannerCaption').value.trim();
      const img = resultInput.value || 'assets/banner/pasar_sentral_pinrang_clean_hd.jpg';

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

  const reports = getStorage('disperindag_reports', DEFAULT_REPORTS);
  tbody.innerHTML = reports.map(r => {
    let statusClass = 'diproses';
    if (r.status.includes('Selesai')) statusClass = 'selesai';
    else if (r.status.includes('Diterima')) statusClass = 'diterima';

    const sourceBadge = r.source_channel || 'Website Portal';

    return `
      <tr>
        <td>
          <strong style="color: #1E40AF; font-size: 0.88rem;">${r.ticket_number || 'DPE-2026-000101'}</strong><br>
          <span style="font-size: 0.72rem; background: #EFF6FF; color: #1D4ED8; padding: 2px 6px; border-radius: 4px; font-weight: 700;">📡 ${sourceBadge}</span>
        </td>
        <td><small style="color: #475569;">${r.submitted_at}</small></td>
        <td><strong>${r.nama}</strong><br><small style="color: #64748B;">${r.kontak}</small></td>
        <td><strong>${r.kategori}</strong><br><small style="color: #64748B;">${r.lokasi}</small></td>
        <td><span style="font-size: 0.8rem; font-weight: 700; color: #0F2C59;">${r.assigned_unit || 'Bidang Teknis'}</span></td>
        <td><span class="verified-badge ${statusClass}">${r.status}</span></td>
        <td style="text-align: center;">
          <div class="btn-action-group" style="justify-content: center;">
            <button onclick="viewReportDetail('${r.id}')" class="btn-action-item btn-action-view" title="Lihat Detail Lengkap">
              🔍 Detail
            </button>
            <button onclick="openEditReportModal('${r.id}')" class="btn-action-item btn-action-followup" title="Tindak Lanjuti & Ubah Status Alur">
              ⚡ Tindak Lanjut
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.viewReportDetail = function(repId) {
  const reports = getStorage('disperindag_reports', DEFAULT_REPORTS);
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
  const reports = getStorage('disperindag_reports', DEFAULT_REPORTS);
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
    onSubmit: (vals) => {
      r.status = vals.status;
      r.assigned_unit = vals.assigned_unit;
      r.resolution = vals.resolution;
      r.updated_at = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + " WITA";

      // Sinkronkan step numerik
      if (vals.status.includes('Diterima')) r.step = 1;
      else if (vals.status.includes('Verifikasi')) r.step = 2;
      else if (vals.status.includes('Penugasan')) r.step = 3;
      else if (vals.status.includes('Ditindaklanjuti') || vals.status.includes('Sidak')) r.step = 4;
      else if (vals.status.includes('Respon')) r.step = 5;
      else if (vals.status.includes('Selesai')) r.step = 6;
      else r.step = 1;

      setStorage('disperindag_reports', reports);

      if (typeof db !== 'undefined' && db) {
        db.collection('reports').doc(r.id).set(r, { merge: true }).catch(e => console.warn(e));
      }

      renderAdminReports();
      logAdminActivity('Pengaduan', `Tindak lanjut tiket ${r.ticket_number} (${r.status})`);
      CustomModal.toast(`Tiket ${r.ticket_number} berhasil diperbarui menjadi '${r.status}'!`, "success");
    }
  });
};

// 8. TABEL PENGGUNA ASN & RBAC
function renderAdminUsers() {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  const users = getAllUsers();
  const session = getCurrentSession();

  tbody.innerHTML = users.map(u => {
    const isCurrent = session && session.username === u.username;
    return `
      <tr>
        <td>
          <strong>${u.name}</strong> ${isCurrent ? '<span style="font-size:0.68rem; background:#DCFCE7; color:#166534; padding:2px 6px; border-radius:4px; font-weight:800;">(Anda)</span>' : ''}<br>
          <small style="color: #64748B;">@${u.username}</small>
        </td>
        <td><code>${u.nip || '-'}</code></td>
        <td><strong>${u.position}</strong><br><small style="color: #64748B;">${u.unit}</small></td>
        <td><span class="badge-cat" style="background: #FEF3C7; color: #B45309;">${u.roleIcon || '👤'} ${u.roleLabel}</span></td>
        <td><span class="verified-badge">${u.canAccessAdmin ? '✓ CMS Admin' : '📱 Hanya Petugas HP'}</span></td>
        <td style="text-align: center;">
          <div class="btn-action-group" style="justify-content: center;">
            <button onclick="openEditUserModal('${u.username}')" class="btn-action-item btn-action-edit" title="Sunting Akun ASN">
              ✏️ Edit
            </button>
            ${!isCurrent ? `
              <button onclick="deleteUserRecord('${u.username}')" class="btn-action-item btn-action-delete" title="Hapus Pengguna">
                🗑️
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.openAddUserModal = function() {
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

window.openEditUserModal = function(targetUsername) {
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

      if (vals.new_password && vals.new_password.trim().length >= 4) {
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

window.deleteUserRecord = function(targetUsername) {
  const session = getCurrentSession();
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

window.saveCommandCenterMetrics = function(e) {
  e.preventDefault();
  const config = getStorage('disperindag_command_center', DEFAULT_COMMAND_CENTER_CONFIG);

  const fields = [
    'inflation_rate', 'inflation_status', 'pasar_sentral_stalls', 'pasar_sentral_status',
    'uttp_verified', 'spbu_verified_pct', 'uttp_status',
    'het_lpg_price', 'lpg_distribution_pct', 'lpg_distributed_bottles', 'lpg_total_quota',
    'total_ikm_trained', 'total_ikm_certified', 'skm_score', 'skm_grade'
  ];

  fields.forEach(f => {
    const el = document.getElementById(`cc_${f}`);
    if (el) {
      config[f] = el.value.trim();
    }
  });

  config.last_updated = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) + ' WITA';

  setStorage('disperindag_command_center', config);

  // Sync to Cloud Firestore if initialized
  if (typeof db !== 'undefined' && db) {
    db.collection('command_center').doc('metrics').set(config, { merge: true })
      .then(() => console.log('Command Center metrics synced to Firestore'))
      .catch(err => console.warn('Firestore sync note:', err));
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
        name: "status",
        label: "Status Pasokan / Keamanan",
        type: "select",
        options: [
          { value: "NORMAL", label: "🟢 NORMAL (Stok & Tera Aman)" },
          { value: "WASPADA", label: "🟡 WASPADA (Pengawasan Ketat)" },
          { value: "KRITIS", label: "🔴 KRITIS (Perlu Intervensi Lapangan)" }
        ],
        value: d.status
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
      d.status = vals.status;
      d.icon = vals.status === 'NORMAL' ? '🟢' : (vals.status === 'WASPADA' ? '🟡' : '🔴');
      d.pangkalan = parseInt(vals.pangkalan, 10) || d.pangkalan;
      d.note = vals.note;

      districts[index] = d;
      setStorage('disperindag_districts', districts);

      if (typeof db !== 'undefined' && db) {
        db.collection('command_center').doc('districts').set({ items: districts }, { merge: true })
          .catch(err => console.warn(err));
      }

      renderDistrictsTable();
      logAdminActivity('Command Center', `Ubah status pengawasan Kec. ${d.name} (${d.status})`);
      CustomModal.toast(`Status Kec. ${d.name} berhasil disinkronkan ke Command Center!`, 'success');
    }
  });
};

// ==============================================================================
// 10. MANAJEMEN MEDIA & SOCIAL INTELLIGENCE HUB (FAKTUAL & VALID)
// ==============================================================================
function renderAdminMediaIntelligence() {
  const data = getStorage('disperindag_media_intelligence', DEFAULT_MEDIA_INTELLIGENCE || {});
  
  // 1. Isi form ringkasan
  if (data.summary) {
    const elMentions = document.getElementById('mi_total_mentions');
    const elSentPos = document.getElementById('mi_sentiment_pos');
    const elReach = document.getElementById('mi_total_reach');
    const elEngage = document.getElementById('mi_total_engagement');

    if (elMentions) elMentions.value = data.summary.total_mentions || 1482;
    if (elSentPos) elSentPos.value = data.summary.positive_percentage || 74;
    if (elReach) elReach.value = data.summary.total_reach || '185.4K';
    if (elEngage) elEngage.value = data.summary.total_engagement || '24.8K';
  }

  // 2. Render Tabel Berita Online
  renderMediaNewsTable();

  // 3. Render Tabel Suara Warga
  renderCitizenCommentsTable();
}

function renderMediaNewsTable() {
  const tbody = document.getElementById('miNewsTableBody');
  if (!tbody) return;

  const data = getStorage('disperindag_media_intelligence', DEFAULT_MEDIA_INTELLIGENCE || {});
  const newsList = data.mainstream_news || [];

  if (newsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94A3B8; padding: 20px;">Belum ada data berita media online.</td></tr>`;
    return;
  }

  tbody.innerHTML = newsList.map((n, idx) => `
    <tr>
      <td>
        <strong>${n.media_name}</strong>
        <div style="font-size: 0.72rem; color: #64748B;">${n.media_type || 'Portal Berita'} &bull; ${n.published_at}</div>
      </td>
      <td>
        <div style="font-weight: 700; color: #0F2C59; line-height: 1.35; font-size: 0.84rem;">${n.title}</div>
        <div style="font-size: 0.74rem; color: #64748B; margin-top: 3px;">${n.snippet ? n.snippet.substring(0, 85) + '...' : ''}</div>
      </td>
      <td>
        <a href="${n.url}" target="_blank" rel="noopener noreferrer" style="font-size: 0.76rem; color: #0284C7; font-weight: 700; word-break: break-all;">
          🔗 ${n.url ? (n.url.length > 35 ? n.url.substring(0, 35) + '...' : n.url) : 'https://pinrangkab.go.id'}
        </a>
      </td>
      <td>
        <span class="news-status-pill ${n.is_critical ? 'status-draft' : 'status-published'}" style="${n.is_critical ? 'background: #FFE4E6; color: #9F1239; border-color: #FECDD3;' : 'background: #DCFCE7; color: #166534; border-color: #86EFAC;'} font-size: 0.72rem; font-weight: 800;">
          ${n.is_critical ? '🔴 Isu Kritis' : '🟢 Positif ' + (n.sentiment_score || 90) + '%'}
        </span>
      </td>
      <td style="text-align: center;">
        <div class="btn-action-group" style="justify-content: center;">
          <button onclick="editMediaNews(${idx})" class="btn-action-item btn-action-edit">✏️ Edit</button>
          <button onclick="deleteMediaNews(${idx})" class="btn-action-item btn-action-delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderCitizenCommentsTable() {
  const tbody = document.getElementById('miCommentsTableBody');
  if (!tbody) return;

  const data = getStorage('disperindag_media_intelligence', DEFAULT_MEDIA_INTELLIGENCE || {});
  const comments = data.citizen_comments || [];

  if (comments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94A3B8; padding: 20px;">Belum ada data aspirasi/suara warga.</td></tr>`;
    return;
  }

  tbody.innerHTML = comments.map((c, idx) => `
    <tr>
      <td>
        <strong>${c.author_name}</strong>
        <div style="font-size: 0.72rem; color: #64748B;">${c.source_icon || '📱'} ${c.source_platform} &bull; ${c.timestamp}</div>
      </td>
      <td style="max-width: 280px;">
        <div style="font-size: 0.8rem; color: #1E293B; line-height: 1.35;">"${c.comment_text}"</div>
      </td>
      <td>
        <span class="news-status-pill" style="${c.sentiment === 'negative' ? 'background: #FFE4E6; color: #9F1239; border: 1px solid #FECDD3;' : (c.sentiment === 'positive' ? 'background: #DCFCE7; color: #166534; border: 1px solid #86EFAC;' : 'background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1;')} font-size: 0.72rem; font-weight: 800;">
          ${c.sentiment_label || (c.sentiment === 'negative' ? '🔴 Keluhan' : '🟢 Positif')}
        </span>
      </td>
      <td style="font-size: 0.78rem;">
        ${c.disposition ? `<div style="font-weight: 800; color: #92400E; margin-bottom: 2px;">⚠️ ${c.disposition.replace(/^⚠️\s*/, '')}</div>` : ''}
        <div style="color: #0369A1;">${c.official_response || 'Belum ada tanggapan.'}</div>
      </td>
      <td style="text-align: center;">
        <div class="btn-action-group" style="justify-content: center;">
          <button onclick="editCitizenComment(${idx})" class="btn-action-item btn-action-edit">✏️ Edit</button>
          <button onclick="deleteCitizenComment(${idx})" class="btn-action-item btn-action-delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.saveMediaIntelligenceSummary = function(event) {
  event.preventDefault();
  const data = getStorage('disperindag_media_intelligence', DEFAULT_MEDIA_INTELLIGENCE || {});
  
  data.summary = data.summary || {};
  data.summary.total_mentions = parseInt(document.getElementById('mi_total_mentions').value, 10) || 1482;
  data.summary.positive_percentage = parseInt(document.getElementById('mi_sentiment_pos').value, 10) || 74;
  data.summary.neutral_percentage = 18;
  data.summary.negative_percentage = 100 - data.summary.positive_percentage - data.summary.neutral_percentage;
  data.summary.total_reach = document.getElementById('mi_total_reach').value || '185.4K';
  data.summary.total_engagement = document.getElementById('mi_total_engagement').value || '24.8K';

  setStorage('disperindag_media_intelligence', data);

  if (typeof db !== 'undefined' && db) {
    db.collection('system_config').doc('media_intelligence').set(data, { merge: true })
      .catch(err => console.warn(err));
  }

  logAdminActivity('Media Intelligence', 'Menyimpan metrik ringkasan intelijen media');
  CustomModal.toast("Ringkasan Metrik Intelijen Media berhasil disimpan dan disinkronkan!", "success");
};

window.openAddMediaNewsModal = function() {
  CustomModal.form({
    title: "Tambah Berita Media Online Terverifikasi",
    icon: "📰",
    fields: [
      { name: "media_name", label: "Nama Media (cth: Fajar Sulsel, Tribun Timur)", type: "text", required: true },
      { name: "title", label: "Judul Lengkap Berita", type: "text", required: true },
      { name: "snippet", label: "Ringkasan Singkat Berita", type: "textarea", required: true },
      { name: "url", label: "Tautan URL Spesifik Berita Asli (Wajib)", type: "text", required: true, placeholder: "https://..." },
      { name: "published_at", label: "Waktu Publikasi (cth: 27 Agustus 2026, 09:30 WITA)", type: "text", value: "27 Agustus 2026, 09:00 WITA" },
      {
        name: "is_critical",
        label: "Kategori Sifat Berita",
        type: "select",
        options: [
          { value: "false", label: "🟢 Berita Normal / Capaian Positif" },
          { value: "true", label: "🔴 Isu Kritis / Keluhan Perlu Evaluasi" }
        ]
      }
    ],
    onSubmit: (vals) => {
      const data = getStorage('disperindag_media_intelligence', DEFAULT_MEDIA_INTELLIGENCE || {});
      data.mainstream_news = data.mainstream_news || [];
      
      const newNews = {
        id: "mn_" + Date.now(),
        media_name: vals.media_name,
        media_type: "Portal Berita",
        title: vals.title,
        snippet: vals.snippet,
        url: vals.url,
        published_at: vals.published_at,
        is_critical: vals.is_critical === "true",
        sentiment: vals.is_critical === "true" ? "negative" : "positive",
        sentiment_score: vals.is_critical === "true" ? 40 : 92,
        views: "1.5K",
        shares: 45,
        img: "assets/news/operasi_pasar_murah_sembako_pinrang.jpg"
      };

      data.mainstream_news.unshift(newNews);
      setStorage('disperindag_media_intelligence', data);

      if (typeof db !== 'undefined' && db) {
        db.collection('system_config').doc('media_intelligence').set(data, { merge: true }).catch(e => console.warn(e));
      }

      renderMediaNewsTable();
      logAdminActivity('Media Intelligence', `Tambah pantauan berita: ${newNews.media_name}`);
      CustomModal.toast("Berita media online berhasil ditambahkan!", "success");
    }
  });
};

window.editMediaNews = function(index) {
  const data = getStorage('disperindag_media_intelligence', DEFAULT_MEDIA_INTELLIGENCE || {});
  const n = (data.mainstream_news || [])[index];
  if (!n) return;

  CustomModal.form({
    title: `Edit Berita: ${n.media_name}`,
    icon: "✏️",
    fields: [
      { name: "media_name", label: "Nama Media", type: "text", value: n.media_name, required: true },
      { name: "title", label: "Judul Berita", type: "text", value: n.title, required: true },
      { name: "snippet", label: "Ringkasan Singkat", type: "textarea", value: n.snippet, required: true },
      { name: "url", label: "Tautan URL Spesifik Berita", type: "text", value: n.url, required: true },
      {
        name: "is_critical",
        label: "Kategori Sifat Berita",
        type: "select",
        value: n.is_critical ? "true" : "false",
        options: [
          { value: "false", label: "🟢 Berita Normal / Capaian Positif" },
          { value: "true", label: "🔴 Isu Kritis / Keluhan Perlu Evaluasi" }
        ]
      }
    ],
    onSubmit: (vals) => {
      n.media_name = vals.media_name;
      n.title = vals.title;
      n.snippet = vals.snippet;
      n.url = vals.url;
      n.is_critical = vals.is_critical === "true";
      n.sentiment = n.is_critical ? "negative" : "positive";

      data.mainstream_news[index] = n;
      setStorage('disperindag_media_intelligence', data);

      if (typeof db !== 'undefined' && db) {
        db.collection('system_config').doc('media_intelligence').set(data, { merge: true }).catch(e => console.warn(e));
      }

      renderMediaNewsTable();
      CustomModal.toast("Berita berhasil diperbarui!", "success");
    }
  });
};

window.deleteMediaNews = function(index) {
  CustomModal.confirm({
    title: "Hapus Berita Media",
    message: "Apakah Anda yakin ingin menghapus pantauan berita ini dari layar intelijen?",
    icon: "🗑️",
    confirmText: "Ya, Hapus",
    isDanger: true,
    onSubmit: () => {
      const data = getStorage('disperindag_media_intelligence', DEFAULT_MEDIA_INTELLIGENCE || {});
      data.mainstream_news.splice(index, 1);
      setStorage('disperindag_media_intelligence', data);

      if (typeof db !== 'undefined' && db) {
        db.collection('system_config').doc('media_intelligence').set(data, { merge: true }).catch(e => console.warn(e));
      }

      renderMediaNewsTable();
      CustomModal.toast("Berita berhasil dihapus.", "info");
    }
  });
};

window.openAddCitizenCommentModal = function() {
  CustomModal.form({
    title: "Tambah Suara / Komentar Warga Riil",
    icon: "💬",
    fields: [
      { name: "author_name", label: "Nama Warga / Akun", type: "text", required: true },
      {
        name: "source_platform",
        label: "Platform Media Sosial",
        type: "select",
        options: [
          { value: "Instagram", label: "📸 Instagram (@perindagempinrang)" },
          { value: "Facebook", label: "👥 Facebook (Grup Suara Warga Pinrang)" },
          { value: "TikTok", label: "🎵 TikTok (@explorepinrang)" },
          { value: "SP4N-LAPOR!", label: "📨 SP4N-LAPOR! / Website Resmi" }
        ]
      },
      { name: "comment_text", label: "Isi Komentar / Keluhan Riil", type: "textarea", required: true },
      {
        name: "sentiment",
        label: "Klasifikasi Sentimen",
        type: "select",
        options: [
          { value: "positive", label: "🟢 Apresiasi Publik / Positif" },
          { value: "neutral", label: "⚪ Pertanyaan / Permohonan Fasilitasi" },
          { value: "negative", label: "🔴 Keluhan / Kritik Butuh Evaluasi" }
        ]
      },
      { name: "disposition", label: "Status Disposisi (cth: Bidang ESDM)", type: "text", placeholder: "Opsional jika butuh tindak lanjut" },
      { name: "official_response", label: "Tanggapan / Tindak Lanjut Dinas", type: "textarea", placeholder: "Rencana aksi atau jawaban resmi dinas..." }
    ],
    onSubmit: (vals) => {
      const data = getStorage('disperindag_media_intelligence', DEFAULT_MEDIA_INTELLIGENCE || {});
      data.citizen_comments = data.citizen_comments || [];

      const initials = vals.author_name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'W';
      const icon = vals.source_platform.includes('Instagram') ? '📸' : (vals.source_platform.includes('Facebook') ? '👥' : (vals.source_platform.includes('TikTok') ? '🎵' : '📨'));
      const directLink = vals.source_platform.includes('Instagram') ? 'https://www.instagram.com/perindagempinrang/' : (vals.source_platform.includes('Facebook') ? 'https://web.facebook.com/groups/suarawargapinrang' : 'https://pinrangkab.go.id/pengaduan');

      const newComment = {
        id: "cc_" + Date.now(),
        author_name: vals.author_name,
        source_platform: vals.source_platform,
        source_icon: icon,
        direct_url: directLink,
        avatar_char: initials,
        comment_text: vals.comment_text,
        timestamp: "Baru saja",
        sentiment: vals.sentiment,
        sentiment_label: vals.sentiment === "negative" ? "🔴 Keluhan / Evaluasi Mendesak" : (vals.sentiment === "positive" ? "🟢 Apresiasi Publik" : "⚪ Pertanyaan / Aspirasi"),
        disposition: vals.disposition ? (vals.disposition.startsWith('⚠️') ? vals.disposition : `⚠️ ${vals.disposition}`) : null,
        official_response: vals.official_response || "Laporan sedang dalam verifikasi tim teknis."
      };

      data.citizen_comments.unshift(newComment);
      setStorage('disperindag_media_intelligence', data);

      if (typeof db !== 'undefined' && db) {
        db.collection('system_config').doc('media_intelligence').set(data, { merge: true }).catch(e => console.warn(e));
      }

      renderCitizenCommentsTable();
      logAdminActivity('Media Intelligence', `Tambah suara warga dari ${newComment.author_name}`);
      CustomModal.toast("Suara warga berhasil ditambahkan dan disinkronkan!", "success");
    }
  });
};

window.editCitizenComment = function(index) {
  const data = getStorage('disperindag_media_intelligence', DEFAULT_MEDIA_INTELLIGENCE || {});
  const c = (data.citizen_comments || [])[index];
  if (!c) return;

  CustomModal.form({
    title: `Edit Tanggapan Warga: ${c.author_name}`,
    icon: "✏️",
    fields: [
      { name: "author_name", label: "Nama Warga", type: "text", value: c.author_name, required: true },
      { name: "comment_text", label: "Isi Komentar Warga", type: "textarea", value: c.comment_text, required: true },
      {
        name: "sentiment",
        label: "Klasifikasi Sentimen",
        type: "select",
        value: c.sentiment || "positive",
        options: [
          { value: "positive", label: "🟢 Apresiasi Publik / Positif" },
          { value: "neutral", label: "⚪ Pertanyaan / Permohonan Fasilitasi" },
          { value: "negative", label: "🔴 Keluhan / Kritik Butuh Evaluasi" }
        ]
      },
      { name: "disposition", label: "Status Disposisi Bidang", type: "text", value: c.disposition || "" },
      { name: "official_response", label: "Tanggapan Resmi Kedinasan", type: "textarea", value: c.official_response || "" }
    ],
    onSubmit: (vals) => {
      c.author_name = vals.author_name;
      c.comment_text = vals.comment_text;
      c.sentiment = vals.sentiment;
      c.sentiment_label = vals.sentiment === "negative" ? "🔴 Keluhan / Evaluasi Mendesak" : (vals.sentiment === "positive" ? "🟢 Apresiasi Publik" : "⚪ Pertanyaan / Aspirasi");
      c.disposition = vals.disposition ? (vals.disposition.startsWith('⚠️') ? vals.disposition : `⚠️ ${vals.disposition}`) : null;
      c.official_response = vals.official_response;

      data.citizen_comments[index] = c;
      setStorage('disperindag_media_intelligence', data);

      if (typeof db !== 'undefined' && db) {
        db.collection('system_config').doc('media_intelligence').set(data, { merge: true }).catch(e => console.warn(e));
      }

      renderCitizenCommentsTable();
      CustomModal.toast("Data suara warga & tanggapan dinas berhasil diperbarui!", "success");
    }
  });
};

window.deleteCitizenComment = function(index) {
  CustomModal.confirm({
    title: "Hapus Komentar Warga",
    message: "Apakah Anda yakin ingin menghapus data aspirasi/komentar ini?",
    icon: "🗑️",
    confirmText: "Ya, Hapus",
    isDanger: true,
    onSubmit: () => {
      const data = getStorage('disperindag_media_intelligence', DEFAULT_MEDIA_INTELLIGENCE || {});
      data.citizen_comments.splice(index, 1);
      setStorage('disperindag_media_intelligence', data);

      if (typeof db !== 'undefined' && db) {
        db.collection('system_config').doc('media_intelligence').set(data, { merge: true }).catch(e => console.warn(e));
      }

      renderCitizenCommentsTable();
      CustomModal.toast("Komentar warga berhasil dihapus.", "info");
    }
  });
};

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
    disperindag_reports: getStorage('disperindag_reports', typeof DEFAULT_REPORTS !== 'undefined' ? DEFAULT_REPORTS : []),
    disperindag_districts: getStorage('disperindag_districts', DEFAULT_DISTRICTS_STATUS),
    disperindag_command_center: getStorage('disperindag_command_center', DEFAULT_COMMAND_CENTER_CONFIG),
    disperindag_media_intelligence: getStorage('disperindag_media_intelligence', DEFAULT_MEDIA_INTELLIGENCE),
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
          if (data.disperindag_media_intelligence) setStorage('disperindag_media_intelligence', data.disperindag_media_intelligence);
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
