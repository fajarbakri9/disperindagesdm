// ==============================================================================
// APP CONTROLLER - DISPERINDAG ESDM KABUPATEN PINRANG (PRODUCTION READY)
// ==============================================================================

// Safe Storage Helper Fallback
if (typeof window.getStorage !== 'function') {
  window.getStorage = function(key, defaultVal) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
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

document.addEventListener('DOMContentLoaded', () => {
  initMobileDrawer();
  initGlobalSearch();
  renderHeroCarousel();
  renderRunningTicker();
  renderQuickServices();
  renderPriceDashboard();
  renderFeaturedDocuments();
  renderHomeNews();
  renderHomeProductsIKM();
  initComplaintForm();
  initTabsSystem();
  initFirestoreLiveSync();
});

// REAL-TIME FIRESTORE NEWS, BANNERS & PRICES SYNC
function initFirestoreLiveSync() {
  if (typeof db !== 'undefined' && db !== null) {
    try {
      // 1. Sync Berita Live dari Cloud Firestore
      db.collection('news').onSnapshot(snapshot => {
        if (!snapshot.empty) {
          const cloudNews = [];
          snapshot.forEach(doc => cloudNews.push({ id: doc.id, ...doc.data() }));
          const merged = mergeNewsWithDefaults(cloudNews);
          setStorage('disperindag_news', merged);
          renderHomeNews();
        }
      }, err => console.warn("Firestore News listener:", err));

      // 2. Sync Banners Live dari Cloud Firestore
      db.collection('settings').doc('banners').onSnapshot(doc => {
        if (doc.exists && doc.data() && Array.isArray(doc.data().list)) {
          const bannerData = doc.data();
          if (Array.isArray(bannerData.deleted_ids)) {
            localStorage.setItem('disperindag_deleted_banner_ids', JSON.stringify(bannerData.deleted_ids));
          }
          const cloudBanners = bannerData.list;
          const mergedBanners = mergeBannersWithDefaults(cloudBanners);
          setStorage('disperindag_banners', mergedBanners);
          renderHeroCarousel();
        }
      }, err => console.warn("Firestore Banner listener:", err));
    } catch(e) {}
  }
}

// 1. MOBILE DRAWER NAVIGATION CONTROLLER (WCAG 2.1 AA)
function initMobileDrawer() {
  const toggleBtn = document.getElementById('mobileMenuBtn');
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('mobileDrawerOverlay');
  const closeBtn = document.getElementById('drawerCloseBtn');

  if (!toggleBtn || !drawer || !overlay) return;

  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (closeBtn) closeBtn.focus();
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });

  const drawerLinks = drawer.querySelectorAll('.drawer-link');
  drawerLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });
}

// 2. GLOBAL SEARCH REDIRECTION
function initGlobalSearch() {
  const searchForm = document.getElementById('globalSearchForm');
  const searchInput = document.getElementById('globalSearchInput');

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = searchInput.value.trim();
      if (q) {
        window.location.href = `search.html?q=${encodeURIComponent(q)}`;
      }
    });
  }
}

// 3. RUNNING PRICE TICKER (HIGH-PRECISION MARQUEE ENGINE 60 FPS)
let tickerAnimFrameId = null;
let tickerOffset = 0;
let isTickerPaused = false;

function renderRunningTicker() {
  const tickerContainer = document.getElementById('priceTickerContainer');
  const scrollArea = document.querySelector('.ticker-scroll-area');
  if (!tickerContainer) return;

  const prices = getStorage('disperindag_prices', typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []);
  if (!prices || prices.length === 0) return;

  const items = prices.map(item => `
    <div class="ticker-item" style="display:inline-flex; align-items:center; gap:8px; font-size:0.86rem; margin-right:32px; white-space:nowrap;">
      <span style="color:#CBD5E1; font-weight:700;">${item.commodity_name}:</span>
      <span class="price" style="font-weight:800; color:#FDE047; font-family:'Plus Jakarta Sans',monospace;">Rp ${Number(item.price).toLocaleString('id-ID')}/${item.unit}</span>
      <span class="trend-${item.trend}" style="font-weight:900; ${item.trend === 'up' ? 'color:#F87171;' : item.trend === 'down' ? 'color:#4ADE80;' : 'color:#94A3B8;'}">
        ${item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '—'}
      </span>
    </div>
  `).join('');

  // Gandakan untuk continuous infinite scroll tanpa jeda
  tickerContainer.innerHTML = items + items;

  // Hentikan frame animasi sebelumnya jika ada re-render
  if (tickerAnimFrameId) {
    cancelAnimationFrame(tickerAnimFrameId);
    tickerAnimFrameId = null;
  }
  tickerOffset = 0;

  if (scrollArea && !scrollArea.dataset.tickerListenersAttached) {
    scrollArea.dataset.tickerListenersAttached = 'true';
    scrollArea.addEventListener('mouseenter', () => { isTickerPaused = true; });
    scrollArea.addEventListener('mouseleave', () => { isTickerPaused = false; });
    scrollArea.addEventListener('touchstart', () => { isTickerPaused = true; }, { passive: true });
    scrollArea.addEventListener('touchend', () => { isTickerPaused = false; }, { passive: true });
  }

  // Terapkan styling hardware accelerated
  tickerContainer.style.animation = 'none';
  tickerContainer.style.display = 'inline-flex';
  tickerContainer.style.width = 'max-content';
  tickerContainer.style.whiteSpace = 'nowrap';
  tickerContainer.style.willChange = 'transform';

  function stepTicker() {
    if (!isTickerPaused && tickerContainer) {
      const halfWidth = tickerContainer.scrollWidth / 2;
      if (halfWidth > 0) {
        tickerOffset += 0.85; // Kecepatan scroll mulus dan nyaman dibaca
        if (tickerOffset >= halfWidth) {
          tickerOffset = 0;
        }
        tickerContainer.style.transform = `translate3d(-${tickerOffset}px, 0, 0)`;
      }
    }
    tickerAnimFrameId = requestAnimationFrame(stepTicker);
  }

  tickerAnimFrameId = requestAnimationFrame(stepTicker);
}

// 4. HERO CAROUSEL CONTROLLER
let currentSlide = 0;
let carouselTimer = null;
let totalBannersCount = 0;

function renderHeroCarousel() {
  const container = document.getElementById('heroCarouselTrack');
  if (!container) return;

  // 1. Ambil banners aktif
  let banners = getStorage('disperindag_banners', DEFAULT_BANNERS).filter(b => b.active);
  
  // 2. Ambil berita featured dari disperindag_news
  const news = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
  const featuredNewsList = news.filter(n => n.is_featured && (n.status || 'published') === 'published');
  
  // Masukkan featured news yang belum ada di banners ke posisi teratas
  featuredNewsList.forEach(fn => {
    const alreadyInBanner = banners.some(b => b.target_news_id === fn.id || b.title === fn.title);
    if (!alreadyInBanner) {
      banners.unshift({
        id: `bnr_fn_${fn.id}`,
        target_news_id: fn.id,
        img: fn.img || 'assets/news/operasi_pasar_murah_sembako_pinrang.jpg',
        title: fn.title,
        caption: fn.excerpt || (fn.content ? fn.content.slice(0, 140) + '...' : 'Dokumentasi liputan kedinasan Disperindag ESDM Pinrang.'),
        link: `berita/${fn.slug || fn.id}`,
        active: true,
        is_news_headline: true
      });
    }
  });

  if (banners.length === 0) return;

  totalBannersCount = banners.length;

  container.innerHTML = banners.map((b, idx) => `
    <div class="carousel-slide ${idx === 0 ? 'active' : ''}">
      <img src="${b.img}" alt="${b.title}" loading="lazy" onerror="this.src='assets/banner/pasar_sentral_pinrang_clean_hd.jpg'">
      <div class="carousel-overlay"></div>
      <div class="carousel-caption">
        <span class="carousel-badge">${b.is_news_headline ? '🔥 Headline Berita Utama &bull; Sorotan Daerah' : 'Bumi Lasinrang &bull; Dokumentasi Kedinasan'}</span>
        <h2>${b.title}</h2>
        <p>${b.caption}</p>
        ${b.link ? `
          <div style="margin-top: 14px;">
            <a href="${b.link}" class="btn-primary" style="padding: 8px 18px; font-size: 0.84rem; text-decoration: none; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;">
              Baca Berita Lengkap &rarr;
            </a>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');

  startCarouselAutoPlay(banners.length);
}

function startCarouselAutoPlay(total) {
  if (carouselTimer) clearInterval(carouselTimer);
  carouselTimer = setInterval(() => {
    goToSlide((currentSlide + 1) % total);
  }, 6000);
}

window.goToSlide = function(idx) {
  const slides = document.querySelectorAll('.carousel-slide');
  if (slides.length === 0) return;

  slides.forEach(s => s.classList.remove('active'));
  currentSlide = idx;
  if (slides[idx]) slides[idx].classList.add('active');
};

window.nextSlide = function() {
  if (totalBannersCount === 0) return;
  goToSlide((currentSlide + 1) % totalBannersCount);
  startCarouselAutoPlay(totalBannersCount);
};

window.prevSlide = function() {
  if (totalBannersCount === 0) return;
  goToSlide((currentSlide - 1 + totalBannersCount) % totalBannersCount);
  startCarouselAutoPlay(totalBannersCount);
};

// 5. QUICK SERVICES CARDS (KELOMPOK LAYANAN PUBLIK KEDINASAN)
function renderQuickServices() {
  const container = document.getElementById('quickServicesGrid');
  if (!container) return;

  const services = typeof getStorage === 'function' ? getStorage('disperindag_services', DEFAULT_SERVICES) : DEFAULT_SERVICES;

  const unitThemes = {
    'srv_oss_industri': { icon: '🏭', topBar: 'linear-gradient(90deg, #0284C7, #0EA5E9)', bgIcon: '#E0F2FE', colorIcon: '#0284C7', badgeBg: '#E0F2FE', badgeColor: '#0369A1', badgeBorder: '#BAE6FD' },
    'srv_oss_perdagangan': { icon: '📈', topBar: 'linear-gradient(90deg, #2563EB, #3B82F6)', bgIcon: '#EFF6FF', colorIcon: '#2563EB', badgeBg: '#EFF6FF', badgeColor: '#1D4ED8', badgeBorder: '#BFDBFE' },
    'srv_pupuk_subsidi': { icon: '🌱', topBar: 'linear-gradient(90deg, #16A34A, #22C55E)', bgIcon: '#F0FDF4', colorIcon: '#16A34A', badgeBg: '#F0FDF4', badgeColor: '#15803D', badgeBorder: '#BBF7D0' },
    'srv_tera': { icon: '⚖️', topBar: 'linear-gradient(90deg, #7C3AED, #9333EA)', bgIcon: '#F5F3FF', colorIcon: '#7C3AED', badgeBg: '#FAF5FF', badgeColor: '#6B21A8', badgeBorder: '#E9D5FF' },
    'srv_ikm': { icon: '🏭', topBar: 'linear-gradient(90deg, #0891B2, #06B6D4)', bgIcon: '#ECFEFF', colorIcon: '#0891B2', badgeBg: '#ECFEFF', badgeColor: '#155E75', badgeBorder: '#A5F3FC' },
    'srv_harga': { icon: '📊', topBar: 'linear-gradient(90deg, #059669, #10B981)', bgIcon: '#ECFDF5', colorIcon: '#059669', badgeBg: '#ECFDF5', badgeColor: '#047857', badgeBorder: '#A7F3D0' },
    'srv_pasar': { icon: '🛒', topBar: 'linear-gradient(90deg, #D97706, #F59E0B)', bgIcon: '#FFFBEB', colorIcon: '#D97706', badgeBg: '#FFFBEB', badgeColor: '#92400E', badgeBorder: '#FDE68A' },
    'srv_lpg': { icon: '⚡', topBar: 'linear-gradient(90deg, #EA580C, #F97316)', bgIcon: '#FFF7ED', colorIcon: '#EA580C', badgeBg: '#FFF7ED', badgeColor: '#9A3412', badgeBorder: '#FED7AA' },
    'srv_ppid': { icon: '📂', topBar: 'linear-gradient(90deg, #1E40AF, #3B82F6)', bgIcon: '#EFF6FF', colorIcon: '#1E40AF', badgeBg: '#EFF6FF', badgeColor: '#1E40AF', badgeBorder: '#BFDBFE' }
  };

  container.innerHTML = services.map(s => {
    const theme = unitThemes[s.id] || { icon: '🏢', topBar: 'linear-gradient(90deg, #1D4ED8, #3B82F6)', bgIcon: '#EFF6FF', colorIcon: '#1D4ED8', badgeBg: '#EFF6FF', badgeColor: '#1E40AF', badgeBorder: '#BFDBFE' };
    const feeText = s.fee.includes('Gratis') || s.fee.includes('Rp 0') || s.fee.includes('Tidak dikenakan') ? 'Gratis (Rp 0)' : 'Sesuai Perda';
    const feeColor = feeText.includes('Gratis') ? '#16A34A' : '#D97706';
    const targetLink = `layanan.html#${s.id}`;

    return `
    <div class="service-card" id="card_${s.id}">
      <div class="service-card-top-bar" style="background: ${theme.topBar};"></div>
      
      <div>
        <div class="service-card-header">
          <div class="service-icon-box" style="background: ${theme.bgIcon}; color: ${theme.colorIcon};">
            ${theme.icon}
          </div>
          <span style="font-size: 0.72rem; font-weight: 800; color: #10B981; background: #ECFDF5; padding: 3px 8px; border-radius: 12px; border: 1px solid #A7F3D0;">
            ✓ SOP Resmi
          </span>
        </div>

        <span class="service-unit-badge" style="background: ${theme.badgeBg}; color: ${theme.badgeColor}; border: 1px solid ${theme.badgeBorder};">
          ${s.group_name || s.responsible_unit}
        </span>

        <h3 class="service-card-title">
          ${s.name}
        </h3>

        <div class="service-meta-pills">
          <div class="service-pill-item">
            <span>🏷️</span> Biaya: <strong style="color: ${feeColor};">${feeText}</strong>
          </div>
          <div class="service-pill-item">
            <span>⏱️</span> Waktu: <strong>${s.duration}</strong>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 12px;">
        <a href="${targetLink}" class="service-cta-btn" style="flex: 1; text-align: center;">
          Detail Standar &rarr;
        </a>
        ${s.infographic ? `
          <button onclick="openInfographicModal('${s.infographic}', '${s.name}')" class="btn-outline" style="padding: 6px 10px; font-size: 0.76rem; background: #FFFFFF; cursor: pointer; border-radius: 6px;" title="Lihat Infografis">
            🖼️
          </button>
        ` : ''}
      </div>
    </div>
    `;
  }).join('');
}

// 6. DASHBOARD HARGA PASAR & KOMODITAS (BAPOKTING) DENGAN SISTEM EXPAND/COLLAPSE RINGKAS
let showAllSembako = false;

function renderPriceDashboard() {
  const container = document.getElementById('sembakoGrid');
  const searchInput = document.getElementById('searchSembako');
  const categorySelect = document.getElementById('categoryFilter');
  if (!container) return;

  const rawPrices = getStorage('disperindag_prices', typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []);
  const prices = typeof mergePricesWithDefaults === 'function' ? mergePricesWithDefaults(rawPrices) : (Array.isArray(rawPrices) && rawPrices.length > 0 ? rawPrices : (typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []));

  function filterAndRender() {
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const cat = categorySelect ? categorySelect.value : 'all';
    const isSearching = q !== '' || cat !== 'all';

    const filtered = prices.filter(item => {
      const matchQ = item.commodity_name.toLowerCase().includes(q) || item.notes.toLowerCase().includes(q);
      const matchCat = cat === 'all' || item.commodity_name.toLowerCase().includes(cat.toLowerCase());
      return matchQ && matchCat;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 36px; background: #FFFFFF; border-radius: 16px; border: 1.5px dashed #CBD5E1;">
          <p style="color: #64748B; font-weight: 600;">Data komoditas yang Anda cari belum ditemukan atau belum disurvei hari ini.</p>
        </div>
      `;
      const oldToggle = document.getElementById('sembakoToggleContainer');
      if (oldToggle) oldToggle.remove();
      return;
    }

    // Jika sedang tidak mencari/filter, tampilkan 4 item secara default atau semua jika showAllSembako true
    const displayItems = isSearching || showAllSembako ? filtered : filtered.slice(0, 4);

    container.innerHTML = displayItems.map(item => `
      <div class="sembako-card">
        <div>
          <div class="sembako-card-top">
            <div class="sembako-icon-wrapper">
              ${item.commodity_name.includes('Beras') ? '🌾' : item.commodity_name.includes('Minyak') ? '🛢️' : item.commodity_name.includes('Cabai') ? '🌶️' : item.commodity_name.includes('Bawang') ? '🧅' : item.commodity_name.includes('Daging') ? '🥩' : item.commodity_name.includes('Gula') ? '🍚' : '🥚'}
            </div>
            <div class="sembako-title-group">
              <h4 class="sembako-title">${item.commodity_name}</h4>
              <span class="sembako-unit-tag">Per 1 ${item.unit}</span>
            </div>
          </div>

          <div class="sembako-price-box">
            <span class="sembako-price-number">Rp ${item.price.toLocaleString('id-ID')}</span>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
              <span class="trend-pill ${item.trend}">
                ${item.trend === 'up' ? '▲ Naik' : item.trend === 'down' ? '▼ Turun' : '— Stabil'}
              </span>
              <span class="sembako-diff-text">
                ${item.diff > 0 ? `+Rp ${item.diff.toLocaleString('id-ID')}` : item.diff < 0 ? `-Rp ${Math.abs(item.diff).toLocaleString('id-ID')}` : 'Harga tetap'}
              </span>
            </div>
          </div>
        </div>

        <div class="sembako-footer">
          <div class="sembako-meta-row">
            <span>📍 ${item.market_name}</span>
            <span class="verified-badge">✓ Terverifikasi</span>
          </div>
          <div style="font-size: 0.7rem; color: #94A3B8; display: flex; justify-content: space-between;">
            <span>🕒 ${item.observed_date} &bull; ${item.observed_time}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Render atau update tombol Toggle di bawah grid jika tidak dalam mode pencarian
    let toggleWrapper = document.getElementById('sembakoToggleContainer');
    if (!toggleWrapper) {
      toggleWrapper = document.createElement('div');
      toggleWrapper.id = 'sembakoToggleContainer';
      toggleWrapper.style.textAlign = 'center';
      toggleWrapper.style.marginTop = '24px';
      container.parentNode.appendChild(toggleWrapper);
    }

    if (!isSearching && filtered.length > 4) {
      toggleWrapper.style.display = 'block';
      toggleWrapper.innerHTML = `
        <button id="btnToggleSembako" class="btn-outline" style="padding: 11px 24px; font-size: 0.88rem; background: #FFFFFF; font-weight: 800; border-radius: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          ${showAllSembako ? '▴ Ciutkan Tampilan (Tampilkan 4 Komoditas)' : `▾ Tampilkan Semua Komoditas Pangan (${filtered.length} Komoditas)`}
        </button>
      `;
      const btn = document.getElementById('btnToggleSembako');
      if (btn) {
        btn.onclick = () => {
          showAllSembako = !showAllSembako;
          filterAndRender();
          if (!showAllSembako) {
            const section = document.getElementById('sembako');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
          }
        };
      }
    } else {
      toggleWrapper.style.display = 'none';
    }
  }

  if (searchInput) searchInput.addEventListener('input', filterAndRender);
  if (categorySelect) categorySelect.addEventListener('change', filterAndRender);
  filterAndRender();
}

// 7. DOKUMEN PENTING HOMEPAGE (3 DOKUMEN BERSTATUS BERLAKU DENGAN FILE PDF ASLI)
function renderFeaturedDocuments() {
  const container = document.getElementById('featuredDocsGrid');
  if (!container) return;

  const docs = getStorage('disperindag_documents', DEFAULT_DOCUMENTS)
    .filter(d => d.is_featured_home)
    .slice(0, 3);

  container.innerHTML = docs.map(d => {
    const isPerbup = d.document_type.toLowerCase().includes('peraturan bupati') || d.document_type.toLowerCase().includes('perbup');
    const isPerda = d.document_type.toLowerCase().includes('peraturan daerah') || d.document_type.toLowerCase().includes('perda');
    const docIcon = isPerbup ? '📜' : (isPerda ? '⚖️' : '📋');

    return `
    <div class="doc-card">
      <div class="doc-card-body">
        <div class="doc-card-top-row">
          <span class="badge-legal-status ${d.legal_status.toLowerCase()}">✓ ${d.legal_status}</span>
          <span class="doc-year-badge">Tahun ${d.year}</span>
        </div>

        <div class="doc-type-tag">
          <span>${docIcon}</span> ${d.document_type}
        </div>

        <h4 class="doc-title" title="${d.title}">
          ${d.title}
        </h4>

        <div class="doc-meta-box">
          <div class="doc-meta-item">
            <span class="doc-meta-label">Nomor:</span>
            <span class="doc-meta-val">${d.number}</span>
          </div>
          <div class="doc-meta-item">
            <span class="doc-meta-label">Unit:</span>
            <span class="doc-meta-val">${d.responsible_unit}</span>
          </div>
        </div>
      </div>

      <div class="doc-card-footer">
        <div class="doc-filesize-info">
          <span>📄</span> ${d.file_size}
        </div>
        <a href="${d.file_url}" target="_blank" rel="noopener noreferrer" class="btn-doc-card-action" title="Buka dan Unduh PDF Resmi: ${d.title}">
          <span>📥</span> Buka Dokumen Resmi &rarr;
        </a>
      </div>
    </div>
    `;
  }).join('');
}

// 8. BERITA TERBARU KEDINASAN HOMEPAGE (3 BERITA UTAMA UNGGULAN DENGAN DESAIN PROFESIONAL TANPA DESKRIPSI)
function renderHomeNews() {
  const container = document.getElementById('homeNewsGrid') || document.getElementById('newsGrid');
  if (!container) return;

  const rawNews = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
  const news = (Array.isArray(rawNews) ? rawNews : [])
    .filter(item => item && (item.status || 'published') === 'published')
    .sort((a, b) => {
      const getTime = typeof getNewsTimestamp === 'function'
        ? getNewsTimestamp
        : item => new Date(item?.published_at || item?.updated_at || item?.created_at || 0).getTime() || 0;
      return getTime(b) - getTime(a);
    })
    .slice(0, 3);
  
  container.innerHTML = news.map(item => {
    const rawTag = Array.isArray(item.tags) && item.tags.length > 0 
      ? item.tags[0].replace(/^#/, '') 
      : (item.topic_tag || 'Kedinasan');

    return `
      <article class="news-card">
        <div class="news-thumb">
          <img src="${item.img}" alt="${item.title}" loading="lazy" onerror="this.src='assets/banner/pasar_sentral_pinrang_clean_hd.jpg'">
          <span class="news-cat-badge">${item.category}</span>
        </div>
        <div class="news-body">
          <div class="news-meta">
            <span class="news-meta-item">📅 ${item.date}</span>
            <span class="news-meta-item">✍️ ${item.author}</span>
          </div>
          <h3 class="news-title">
            <a href="berita/${item.slug || item.id}" title="${item.title}">
              ${item.title}
            </a>
          </h3>
          <div class="news-footer">
            <span class="news-topic-tag">#${rawTag}</span>
            <a href="berita/${item.slug || item.id}" class="news-action-link" title="Baca rilis berita resmi">
              Baca Rilis <span class="action-arrow">&rarr;</span>
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// 9. ETALASE PRODUK IKM BINAAN HOMEPAGE
function renderHomeProductsIKM() {
  const container = document.getElementById('homeProductsGrid');
  if (!container) return;

  const products = getStorage('disperindag_products_ikm', DEFAULT_PRODUCTS_IKM).slice(0, 3);
  container.innerHTML = products.map(p => `
    <div class="news-card">
      <div class="news-thumb">
        <img src="${p.img}" alt="${p.name}" loading="lazy">
        <span class="news-cat-badge">${p.category_label}</span>
      </div>
      <div class="news-body">
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
          ${p.certifications.map(c => `<span style="font-size: 0.72rem; background: #ECFDF5; color: #059669; font-weight: 800; padding: 2px 6px; border-radius: 4px;">✓ ${c.cert_type}</span>`).join('')}
        </div>
        <h4 class="news-title" style="font-size: 1.05rem; font-weight: 800;">${p.name}</h4>
        <p class="news-excerpt" style="font-size: 0.84rem;">${p.description}</p>
        <div style="margin-top: auto; padding-top: 14px;">
          <a href="https://wa.me/${p.admin_contact_wa}?text=Halo%20Admin%20Katalog%20Disperindag%20Pinrang,%20saya%20tertarik%20dengan%20produk%20${encodeURIComponent(p.name)}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="width: 100%; justify-content: center; background: #059669; border: none; font-size: 0.85rem; padding: 9px;">
            <span>📲</span> Hubungi Admin Katalog (WA)
          </a>
        </div>
      </div>
    </div>
  `).join('');
}

// 10. FORMULIR PENGADUAN DENGAN NOMOR TIKET RESMI & MODAL KONFIRMASI
function handlePublicComplaintSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();
  
  const getName = () => document.getElementById('complaintName') || document.getElementById('reportName');
  const getPhone = () => document.getElementById('complaintPhone') || document.getElementById('reportPhone');
  const getCat = () => document.getElementById('complaintCategory') || document.getElementById('reportCategory');
  const getLoc = () => document.getElementById('complaintLocation') || document.getElementById('reportLocation');
  const getTitle = () => document.getElementById('complaintTitle') || { value: '' };
  const getDetail = () => document.getElementById('complaintDetail') || document.getElementById('reportMsg');
  const getConsent = () => document.getElementById('complaintConsent');

  const consentEl = getConsent();
  if (consentEl && !consentEl.checked) {
    CustomModal.alert({
      title: "Persetujuan Diperlukan",
      message: "Mohon centang persetujuan penggunaan data pribadi untuk keperluan verifikasi dan tindak lanjut laporan Anda.",
      icon: "⚠️",
      type: "warning"
    });
    return false;
  }

  const nameEl = getName();
  const phoneEl = getPhone();
  const catEl = getCat();
  const locEl = getLoc();
  const titleEl = getTitle();
  const detailEl = getDetail();

  const nama = nameEl ? nameEl.value.trim() : 'Masyarakat Pelapor';
  const kontak = phoneEl ? phoneEl.value.trim() : '-';
  const kategori = catEl ? catEl.value : 'Pengaduan Umum';
  const lokasi = locEl ? locEl.value.trim() : 'Kabupaten Pinrang';
  const judul = titleEl ? titleEl.value.trim() : '';
  const detailText = detailEl ? detailEl.value.trim() : '';
  const pesan = judul ? (judul + ' - ' + detailText) : detailText;

  if (!nama || !kontak || !pesan) {
    CustomModal.alert({
      title: "Formulir Belum Lengkap",
      message: "Mohon lengkapi Nama, Nomor Kontak WhatsApp/HP, dan Isi Uraian Laporan Anda sebelum mengirimkan aduan.",
      icon: "⚠️",
      type: "warning"
    });
    return false;
  }

  const randomTicketNum = Math.floor(100000 + Math.random() * 900000);
  const ticketNumber = `DPE-2026-${randomTicketNum}`;

  let assignedUnit = "Bidang Pengembangan Perdagangan";
  const catLower = kategori.toLowerCase();
  if (catLower.includes('lpg') || catLower.includes('esdm') || catLower.includes('energi')) {
    assignedUnit = "Bidang Perindustrian, ESDM";
  } else if (catLower.includes('tera') || catLower.includes('metrologi') || catLower.includes('timbangan')) {
    assignedUnit = "Bidang Kemetrologian";
  } else if (catLower.includes('ikm') || catLower.includes('halal') || catLower.includes('industri')) {
    assignedUnit = "Bidang Perindustrian, ESDM";
  }

  const newReport = {
    id: "rep_" + Date.now(),
    ticket_number: ticketNumber,
    submitted_at: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + ' • ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA',
    nama: nama,
    kontak: kontak,
    kategori: kategori,
    lokasi: lokasi,
    judul: judul || kategori,
    pesan: pesan,
    assigned_unit: assignedUnit,
    status: "Diterima & Sedang Diverifikasi",
    resolution: "Laporan masuk dalam antrean verifikasi dan penugasan tim pengawas dinas."
  };

  const reports = getStorage('disperindag_reports', typeof DEFAULT_REPORTS !== 'undefined' ? DEFAULT_REPORTS : []);
  reports.unshift(newReport);
  setStorage('disperindag_reports', reports);

  const formEl = document.getElementById('publicComplaintForm');
  if (formEl) formEl.reset();

  CustomModal.init();
  const backdrop = CustomModal.backdropEl;
  backdrop.innerHTML = `
    <div class="custom-modal-card" style="max-width: 580px; border-top: 4px solid #10B981; box-shadow: var(--shadow-xl); text-align: left;">
      <div class="custom-modal-header" style="background: linear-gradient(135deg, #064E3B 0%, #047857 100%); color: #FFFFFF; padding: 20px 24px; border-radius: 12px 12px 0 0; display: flex; align-items: center; gap: 14px;">
        <div style="background: rgba(255,255,255,0.2); font-size: 1.8rem; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">📨</div>
        <div>
          <h3 style="color: #FFFFFF; font-size: 1.2rem; font-weight: 800; margin: 0;">Laporan Pengaduan Berhasil Terkirim</h3>
          <p style="color: #A7F3D0; font-size: 0.78rem; margin: 3px 0 0;">Nomor Tiket Resmi Pelayanan Disperindag ESDM Pinrang</p>
        </div>
      </div>
      
      <div class="custom-modal-body" style="padding: 24px;">
        <div style="background: #ECFDF5; border: 2px dashed #059669; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 0.76rem; font-weight: 800; color: #047857; letter-spacing: 0.05em; text-transform: uppercase;">Kode Tiket Registrasi Aduan</span>
          <div style="font-size: 1.6rem; font-weight: 900; color: #065F46; letter-spacing: 1px; margin: 6px 0;" id="modalTicketCode">${ticketNumber}</div>
          <p style="font-size: 0.78rem; color: #047857; margin: 0;">Simpan kode tiket ini untuk memantau status tindak lanjut aduan Anda.</p>
        </div>

        <div style="background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; font-size: 0.84rem; line-height: 1.6; margin-bottom: 18px;">
          <div style="display: grid; grid-template-columns: 100px 1fr; gap: 6px; margin-bottom: 6px;">
            <strong style="color: #64748B;">Pelapor:</strong>
            <span style="color: #0F172A; font-weight: 700;">${nama} (${kontak})</span>
          </div>
          <div style="display: grid; grid-template-columns: 100px 1fr; gap: 6px; margin-bottom: 6px;">
            <strong style="color: #64748B;">Kategori:</strong>
            <span style="color: #1E40AF; font-weight: 700;">${kategori}</span>
          </div>
          <div style="display: grid; grid-template-columns: 100px 1fr; gap: 6px; margin-bottom: 6px;">
            <strong style="color: #64748B;">Lokasi:</strong>
            <span style="color: #0F172A;">${lokasi}</span>
          </div>
          <div style="display: grid; grid-template-columns: 100px 1fr; gap: 6px;">
            <strong style="color: #64748B;">Unit Teknis:</strong>
            <span style="color: #059669; font-weight: 700;">${assignedUnit}</span>
          </div>
        </div>

        <div style="font-size: 0.8rem; color: #475569; line-height: 1.5; background: #FFFBEB; border: 1px solid #FDE68A; padding: 10px 14px; border-radius: 8px;">
          ⏱️ <strong>Estimasi Tindak Lanjut:</strong> Petugas pengawas teknis akan melakukan telaah administrasi &amp; verifikasi lapangan dalam waktu maksimal 1x24 jam kerja.
        </div>
      </div>

      <div class="custom-modal-footer" style="padding: 14px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
        <button type="button" class="btn-outline" onclick="navigator.clipboard.writeText('${ticketNumber}'); CustomModal.toast('Nomor tiket berhasil disalin ke clipboard!', 'success');" style="font-size: 0.82rem; padding: 8px 16px; border-radius: 6px; background: #FFFFFF; font-weight: 700; cursor: pointer;">
          📋 Salin Tiket
        </button>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn-primary" onclick="CustomModal.backdropEl.classList.remove('active'); openCheckTicketModal('${ticketNumber}');" style="font-size: 0.82rem; padding: 8px 16px; border-radius: 6px; background: #1D4ED8; font-weight: 700; cursor: pointer;">
            🔍 Lacak Tiket
          </button>
          <button type="button" class="btn-modal-action btn-modal-primary" onclick="CustomModal.backdropEl.classList.remove('active');" style="font-size: 0.82rem; padding: 8px 20px; border-radius: 6px; cursor: pointer;">
            Selesai
          </button>
        </div>
      </div>
    </div>
  `;
  backdrop.classList.add('active');

  return false;
}

function initComplaintForm() {
  const form = document.getElementById('publicComplaintForm');
  if (!form) return;
  form.addEventListener('submit', handlePublicComplaintSubmit);
}

window.handlePublicComplaintSubmit = handlePublicComplaintSubmit;

// 11. TAB SYSTEM UNTUK PORTAL & APLIKASI
function initTabsSystem() {
  const tabBtns = document.querySelectorAll('.app-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      document.querySelectorAll('.app-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.app-tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add('active');
    });
  });
}
