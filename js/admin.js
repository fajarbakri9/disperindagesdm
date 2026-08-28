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
  const prices = getStorage('disperindag_prices', DEFAULT_COMMODITY_PRICES);
  const news = getStorage('disperindag_news', DEFAULT_NEWS);
  const docs = getStorage('disperindag_documents', DEFAULT_DOCUMENTS);
  const ikm = getStorage('disperindag_products_ikm', DEFAULT_PRODUCTS_IKM);

  if (document.getElementById('statPriceCount')) document.getElementById('statPriceCount').textContent = prices.length;
  if (document.getElementById('statNewsCount')) document.getElementById('statNewsCount').textContent = news.length;
  if (document.getElementById('statDocCount')) document.getElementById('statDocCount').textContent = docs.length;
  if (document.getElementById('statIkmCount')) document.getElementById('statIkmCount').textContent = ikm.length;
}

// 2. TABEL HARGA PASAR & EDIT HARGA
function renderAdminPrices() {
  const tbody = document.getElementById('adminPriceTableBody');
  if (!tbody) return;

  const prices = getStorage('disperindag_prices', DEFAULT_COMMODITY_PRICES);
  tbody.innerHTML = prices.map(item => `
    <tr>
      <td><strong>${item.commodity_name}</strong><br><small style="color: #64748B;">Satuan: 1 ${item.unit}</small></td>
      <td>${item.market_name}</td>
      <td><strong style="color: #1E40AF; font-size: 1rem;">Rp ${item.price.toLocaleString('id-ID')}</strong></td>
      <td>
        <span class="trend-badge ${item.trend}">
          ${item.trend === 'up' ? `▲ +${item.diff}` : item.trend === 'down' ? `▼ ${item.diff}` : '— Tetap'}
        </span>
      </td>
      <td>${item.observed_date}<br><small style="color: #94A3B8;">${item.observed_time}</small></td>
      <td><span class="verified-badge">✓ ${item.verification_status}</span></td>
      <td>
        <button onclick="editPriceModal('${item.id}')" class="btn-primary" style="padding: 5px 12px; font-size: 0.78rem;">
          ✏️ Edit Harga
        </button>
      </td>
    </tr>
  `).join('');
}

window.editPriceModal = function(priceId) {
  const prices = getStorage('disperindag_prices', DEFAULT_COMMODITY_PRICES);
  const item = prices.find(p => p.id === priceId);
  if (!item) return;

  CustomModal.prompt({
    title: `Perbarui Harga: ${item.commodity_name}`,
    message: `Masukkan harga baru untuk <strong>${item.commodity_name}</strong> di ${item.market_name} (Harga saat ini: Rp ${item.price.toLocaleString('id-ID')} / ${item.unit}):`,
    defaultValue: item.price.toString(),
    inputType: "number",
    onConfirm: (newVal) => {
      const parsed = parseInt(newVal);
      if (isNaN(parsed) || parsed <= 0) {
        CustomModal.alert({ title: "Input Tidak Valid", message: "Nominal harga harus berupa angka positif.", icon: "⚠️", type: "warning" });
        return;
      }

      item.previous_price = item.price;
      item.price = parsed;
      item.diff = item.price - item.previous_price;
      item.trend = item.diff > 0 ? 'up' : item.diff < 0 ? 'down' : 'stable';
      item.observed_date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      item.observed_time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA';

      setStorage('disperindag_prices', prices);
      renderAdminPrices();

      CustomModal.alert({
        title: "Harga Berhasil Diperbarui",
        message: `Harga <strong>${item.commodity_name}</strong> kini tercatat: <strong>Rp ${item.price.toLocaleString('id-ID')}/${item.unit}</strong>.`,
        icon: "✅",
        type: "info"
      });
    }
  });
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

  const allNews = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
  
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
        <td>
          <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
            <button onclick="openNewsEditor('${item.id}')" class="btn-primary" style="padding: 4px 8px; font-size: 0.74rem; background: var(--accent-gold); color: #030D1B; border: none;" title="Sunting Berita">
              ✏️ Edit
            </button>
            <a href="berita.html?id=${item.id}" target="_blank" class="btn-outline" style="padding: 4px 8px; font-size: 0.74rem;" title="Lihat Tampilan Publik">
              👁️
            </a>
            <button onclick="toggleNewsStatus('${item.id}')" class="btn-outline" style="padding: 4px 6px; font-size: 0.74rem;" title="${isDraft ? 'Publikasikan Berita Ini' : 'Tarik ke Draf'}">
              ${isDraft ? '🚀' : '📦'}
            </button>
            <button onclick="deleteAdminNews('${item.id}')" class="btn-danger" style="padding: 4px 7px; font-size: 0.74rem;" title="Hapus Berita">
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

// SLUG AUTO-GENERATOR
function autoGenerateSlug(title) {
  const slugInput = document.getElementById('newsSlugInput');
  if (!slugInput) return;
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  slugInput.value = slug;
}

// OPEN EDITOR (CREATE OR EDIT MODE)
window.openNewsEditor = function(newsId = null) {
  const listView = document.getElementById('newsListView');
  const editorView = document.getElementById('newsEditorView');
  const btnOpen = document.getElementById('btnOpenNewsEditor');
  const btnClose = document.getElementById('btnCloseNewsEditor');
  const formTitle = document.getElementById('newsEditorFormTitle');

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
      if (formTitle) formTitle.innerHTML = `✏️ Sunting Berita: <span style="color:#1E40AF;">${item.title.slice(0, 45)}...</span>`;
      document.getElementById('newsEditId').value = item.id;
      document.getElementById('newsTitleInput').value = item.title || '';
      document.getElementById('newsSlugInput').value = item.slug || autoGenerateSlug(item.title || '');
      document.getElementById('newsCategorySelect').value = item.category || 'Perindustrian, Energi & SDM';
      document.getElementById('newsDateInput').value = item.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      document.getElementById('newsAuthorInput').value = item.author || 'Humas Disperindag ESDM Pinrang';
      document.getElementById('newsExcerptInput').value = item.excerpt || '';
      document.getElementById('newsContentInput').value = item.content || '';
      document.getElementById('newsStatusSelect').value = item.status || 'published';
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
    if (formTitle) formTitle.innerHTML = `✍️ Tulis Berita & Siaran Pers Baru`;
    document.getElementById('newsEditId').value = '';
    document.getElementById('newsTitleInput').value = '';
    document.getElementById('newsSlugInput').value = '';
    document.getElementById('newsCategorySelect').value = 'Perindustrian, Energi & SDM';
    document.getElementById('newsDateInput').value = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('newsAuthorInput').value = 'Humas Disperindag ESDM Pinrang';
    document.getElementById('newsExcerptInput').value = '';
    document.getElementById('newsContentInput').value = '';
    document.getElementById('newsStatusSelect').value = 'published';
    document.getElementById('newsIsFeaturedCheckbox').checked = false;

    currentFeaturedImage = "assets/news/operasi_pasar_murah_sembako_pinrang.jpg";
    document.getElementById('newsFeaturedImageResult').value = currentFeaturedImage;
    document.getElementById('newsFeaturedPreviewImg').src = currentFeaturedImage;
    document.getElementById('newsFeaturedCaptionInput').value = 'Dokumentasi resmi liputan kegiatan Disperindag ESDM Pinrang.';

    currentNewsTags = ['Pasar Murah', 'Bapokting'];
    currentNewsGallery = [];
  }

  renderNewsTagChips();
  renderNewsGalleryGrid();

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.closeNewsEditor = function() {
  const listView = document.getElementById('newsListView');
  const editorView = document.getElementById('newsEditorView');
  const btnOpen = document.getElementById('btnOpenNewsEditor');
  const btnClose = document.getElementById('btnCloseNewsEditor');

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

// RICH TEXT TOOLBAR FORMATTER
window.insertFormat = function(type) {
  const textarea = document.getElementById('newsContentInput');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  let replacement = '';

  switch (type) {
    case 'p':
      replacement = selectedText ? `\n\n${selectedText}\n\n` : '\n\nTulis paragraf penjelasan berita di sini...\n\n';
      break;
    case 'h2':
      replacement = `\n\n## ${selectedText || 'Sub-judul Bahasan Berita'}\n`;
      break;
    case 'h3':
      replacement = `\n\n### ${selectedText || 'Rincian Kegiatan'}\n`;
      break;
    case 'b':
      replacement = `**${selectedText || 'Teks Tebal'}**`;
      break;
    case 'i':
      replacement = `*${selectedText || 'Teks Miring'}*`;
      break;
    case 'quote':
      replacement = `\n\n> "${selectedText || 'Mewujudkan pelayanan prima dan pengawasan terpadu demi perlindungan konsumen masyarakat Bumi Lasinrang.'}" — Kepala Dinas Perindag ESDM Pinrang\n\n`;
      break;
    case 'ul':
      replacement = `\n• ${selectedText || 'Poin pertama hasil pengawasan'}\n• Poin kedua tindak lanjut kedinasan\n• Poin ketiga partisipasi masyarakat\n`;
      break;
    case 'ol':
      replacement = `\n1. ${selectedText || 'Langkah pertama verifikasi lapangan'}\n2. Langkah kedua koordinasi penyalur\n3. Langkah ketiga penetapan sanksi tegas\n`;
      break;
    case 'link':
      replacement = `[${selectedText || 'Portal Resmi Pemkab Pinrang'}](https://pinrangkab.go.id)`;
      break;
    case 'hr':
      replacement = `\n\n---\n\n`;
      break;
    default:
      replacement = selectedText;
  }

  textarea.setRangeText(replacement, start, end, 'end');
  textarea.focus();
};

// SAVE NEWS HANDLER (CREATE / UPDATE)
window.handleSaveNews = function(overrideStatus = null) {
  const editId = document.getElementById('newsEditId')?.value || '';
  const title = document.getElementById('newsTitleInput')?.value?.trim();
  const slug = document.getElementById('newsSlugInput')?.value?.trim();
  const category = document.getElementById('newsCategorySelect')?.value || 'Perindustrian, Energi & SDM';
  const date = document.getElementById('newsDateInput')?.value?.trim() || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const author = document.getElementById('newsAuthorInput')?.value?.trim() || 'Humas Disperindag ESDM Pinrang';
  const excerpt = document.getElementById('newsExcerptInput')?.value?.trim() || '';
  const content = document.getElementById('newsContentInput')?.value?.trim();
  const caption = document.getElementById('newsFeaturedCaptionInput')?.value?.trim() || 'Dokumentasi resmi Disperindag ESDM Pinrang.';
  const isFeatured = document.getElementById('newsIsFeaturedCheckbox')?.checked || false;
  const status = overrideStatus || document.getElementById('newsStatusSelect')?.value || 'published';

  if (!title) {
    CustomModal.alert({ title: "Judul Wajib Diisi", message: "Silakan masukkan judul utama artikel berita.", icon: "⚠️", type: "warning" });
    document.getElementById('newsTitleInput')?.focus();
    return;
  }

  if (!content) {
    CustomModal.alert({ title: "Konten Berita Kosong", message: "Silakan masukkan isi berita lengkap pada editor.", icon: "⚠️", type: "warning" });
    document.getElementById('newsContentInput')?.focus();
    return;
  }

  const allNews = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
  
  const articleObj = {
    id: editId || `news_${Date.now()}`,
    title: title,
    slug: slug || autoGenerateSlug(title),
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
    gallery: currentNewsGallery,
    excerpt: excerpt || content.slice(0, 160) + '...',
    content: content,
    status: status,
    is_featured: isFeatured,
    created_at: editId ? undefined : new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (editId) {
    // Mode Update
    const idx = allNews.findIndex(n => n.id === editId);
    if (idx !== -1) {
      allNews[idx] = { ...allNews[idx], ...articleObj };
    } else {
      allNews.unshift(articleObj);
    }
  } else {
    // Mode Insert Baru di urutan teratas
    allNews.unshift(articleObj);
  }

  // Simpan ke LocalStorage
  setStorage('disperindag_news', allNews);

  // Sinkronisasi ke Cloud Firestore
  if (typeof db !== 'undefined' && db !== null) {
    try {
      db.collection('news').doc(articleObj.id).set(articleObj, { merge: true })
        .then(() => console.log("Firestore News Synced:", articleObj.id))
        .catch(err => console.warn("Firestore News Sync Warning:", err));
    } catch(e) {}
  }

  // Selesai & Tutup Editor
  closeNewsEditor();

  CustomModal.alert({
    title: editId ? "Berita Berhasil Diperbarui" : (status === 'published' ? "Berita Berhasil Diterbitkan" : "Draf Berita Disimpan"),
    message: `Artikel <strong>"${articleObj.title}"</strong> telah berhasil ${editId ? 'diperbarui' : (status === 'published' ? 'diterbitkan secara resmi' : 'disimpan sebagai draf')}.`,
    icon: status === 'published' ? "🚀" : "💾",
    type: "info"
  });
};

// TOGGLE STATUS (PUBLISHED <-> DRAFT)
window.toggleNewsStatus = function(newsId) {
  const allNews = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
  const item = allNews.find(n => n.id === newsId);
  if (!item) return;

  const newStatus = (item.status === 'draft') ? 'published' : 'draft';
  item.status = newStatus;
  item.updated_at = new Date().toISOString();

  setStorage('disperindag_news', allNews);

  if (typeof db !== 'undefined' && db !== null) {
    try {
      db.collection('news').doc(item.id).update({ status: newStatus });
    } catch(e) {}
  }

  renderAdminNews();

  CustomModal.alert({
    title: "Status Berita Diubah",
    message: `Berita <strong>"${item.title}"</strong> kini berstatus <strong>${newStatus === 'published' ? 'DITERBITKAN (LIVE)' : 'DRAF / ARSIP'}</strong>.`,
    icon: newStatus === 'published' ? "✅" : "📝",
    type: "info"
  });
};

// DELETE NEWS HANDLER
window.deleteAdminNews = function(newsId) {
  const allNews = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
  const item = allNews.find(n => n.id === newsId);
  if (!item) return;

  CustomModal.confirm({
    title: "Hapus Publikasi Berita?",
    message: `Apakah Anda yakin ingin menghapus artikel <strong>"${item.title}"</strong>?<br><br><span style="color:#DC2626; font-size:0.8rem;">Tindakan ini akan menghapus berita dari arsip publik website.</span>`,
    icon: "🗑️",
    confirmText: "Ya, Hapus Berita",
    cancelText: "Batal",
    type: "danger",
    onConfirm: () => {
      const updatedNews = allNews.filter(n => n.id !== newsId);
      setStorage('disperindag_news', updatedNews);

      if (typeof db !== 'undefined' && db !== null) {
        try {
          db.collection('news').doc(newsId).delete();
        } catch(e) {}
      }

      renderAdminNews();

      CustomModal.alert({
        title: "Berita Dihapus",
        message: `Artikel telah berhasil dihapus dari sistem.`,
        icon: "✅",
        type: "info"
      });
    }
  });
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
    form.addEventListener('submit', (e) => {
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

window.toggleBannerActive = function(bannerId) {
  const banners = getStorage('disperindag_banners', DEFAULT_BANNERS);
  const b = banners.find(item => item.id === bannerId);
  if (!b) return;

  b.active = !b.active;
  setStorage('disperindag_banners', banners);
  renderAdminBanners();
};

window.editBannerText = function(bannerId) {
  const banners = getStorage('disperindag_banners', DEFAULT_BANNERS);
  const b = banners.find(item => item.id === bannerId);
  if (!b) return;

  CustomModal.prompt({
    title: "Edit Judul Banner",
    message: "Masukkan judul baru untuk banner ini:",
    defaultValue: b.title,
    onConfirm: (newTitle) => {
      if (newTitle) b.title = newTitle;
      setStorage('disperindag_banners', banners);
      renderAdminBanners();
    }
  });
};

window.deleteBanner = function(bannerId) {
  CustomModal.confirm({
    title: "Hapus Banner Carousel?",
    message: "Apakah Anda yakin ingin menghapus banner ini dari beranda?",
    icon: "🗑️",
    type: "danger",
    onConfirm: () => {
      let banners = getStorage('disperindag_banners', DEFAULT_BANNERS);
      banners = banners.filter(item => item.id !== bannerId);
      setStorage('disperindag_banners', banners);
      renderAdminBanners();
    }
  });
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

// 6. TABEL IKM
function renderAdminIkm() {
  const tbody = document.getElementById('adminIkmTableBody');
  if (!tbody) return;

  const ikm = getStorage('disperindag_products_ikm', DEFAULT_PRODUCTS_IKM);
  tbody.innerHTML = ikm.map(p => `
    <tr>
      <td><img src="${p.img}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px;" alt="Thumb"></td>
      <td><strong>${p.name}</strong><br><small style="color: #64748B;">${p.category_label}</small></td>
      <td>${p.artisan}<br><small style="color: #94A3B8;">${p.location}</small></td>
      <td>${p.certifications.map(c => `<span style="font-size: 0.7rem; background: #ECFDF5; color: #059669; padding: 2px 6px; border-radius: 4px; margin-right: 4px;">✓ ${c.cert_type}</span>`).join('')}</td>
      <td><a href="katalog-ikm.html" target="_blank" class="btn-outline" style="padding: 4px 10px; font-size: 0.76rem;">Lihat</a></td>
    </tr>
  `).join('');
}

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
        <td>
          <div style="display: flex; gap: 6px;">
            <button onclick="viewReportDetail('${r.id}')" class="btn-outline" style="padding: 5px 8px; font-size: 0.75rem;" title="Lihat Detail Lengkap">
              Detail
            </button>
            <button onclick="openEditReportModal('${r.id}')" class="btn-primary" style="padding: 5px 8px; font-size: 0.75rem; background: #059669;" title="Tindak Lanjuti & Ubah Status Alur">
              Tindak Lanjut
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
          <strong>Status Alur Saat Ini:</strong> <span class="verified-badge">${r.status}</span> (Langkah ${r.step || 1} dari 7)
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
    title: `Disposisi & Update Tiket: ${r.ticket_number || 'DPE-2026'}`,
    icon: "⚖️",
    fields: [
      {
        name: "status",
        label: "Status Tahapan Alur",
        type: "select",
        value: r.status || "Diterima & Registrasi",
        options: [
          { value: "Diterima & Registrasi", label: "1. Diterima & Registrasi Tiket" },
          { value: "Verifikasi & Analisis", label: "2. Verifikasi & Analisis Substansi" },
          { value: "Penugasan Unit", label: "3. Penugasan Unit Teknis Lapangan" },
          { value: "Tindak Lanjut Lapangan", label: "4. Tindak Lanjut / Sidak Lapangan" },
          { value: "Respon Pelapor", label: "5. Penyusunan Respon ke Pelapor" },
          { value: "Selesai Ditindaklanjuti", label: "6. Selesai Ditindaklanjuti & Publikasi" }
        ]
      },
      {
        name: "assigned_unit",
        label: "Unit Teknis Penangan (Disposisi)",
        type: "select",
        value: r.assigned_unit || "Bidang Perdagangan",
        options: [
          { value: "Bidang Perdagangan & Perlindungan Konsumen", label: "Bidang Perdagangan & Perlindungan Konsumen" },
          { value: "Bidang ESDM & Pengawasan Migas", label: "Bidang ESDM & Pengawasan Migas" },
          { value: "Bidang Kemetrologian (UPTD Metrologi Legal)", label: "Bidang Kemetrologian (UPTD Metrologi Legal)" },
          { value: "Bidang Perindustrian & IKM", label: "Bidang Perindustrian & IKM" },
          { value: "Sekretariat & Tim Pengelola Pengaduan", label: "Sekretariat & Tim Pengelola Pengaduan" }
        ]
      },
      {
        name: "resolution",
        label: "Uraian Hasil Tindak Lanjut / Berita Acara",
        type: "textarea",
        value: r.resolution || "",
        required: true
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
      else if (vals.status.includes('Lapangan')) r.step = 4;
      else if (vals.status.includes('Respon')) r.step = 5;
      else if (vals.status.includes('Selesai')) r.step = 6;

      setStorage('disperindag_reports', reports);

      if (typeof db !== 'undefined' && db) {
        db.collection('reports').doc(r.id).set(r, { merge: true }).catch(e => console.warn(e));
      }

      renderAdminReports();
      CustomModal.toast(`Tiket ${r.ticket_number} berhasil diperbarui menjadi '${r.status}'!`, "success");
    }
  });
};

// 8. TABEL PENGGUNA ASN & RBAC
function renderAdminUsers() {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  const users = getAllUsers();
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.name}</strong><br><small style="color: #64748B;">@${u.username}</small></td>
      <td>${u.nip}</td>
      <td>${u.position}<br><small style="color: #64748B;">${u.unit}</small></td>
      <td><span class="badge-cat" style="background: #FEF3C7; color: #B45309;">${u.roleIcon} ${u.roleLabel}</span></td>
      <td><span class="verified-badge">${u.canAccessAdmin ? '✓ CMS Admin' : '📱 Hanya Petugas HP'}</span></td>
    </tr>
  `).join('');
}

// 9. MANAJEMEN COMMAND CENTER & TV WALLBOARD CONTROLLER
function renderAdminCommandCenter() {
  const config = getStorage('disperindag_command_center', DEFAULT_COMMAND_CENTER_CONFIG);
  
  // Isi nilai form metrik
  const fields = [
    'inflation_rate', 'inflation_status', 'pasar_sentral_stalls', 'pasar_sentral_status',
    'uttp_verified', 'spbu_verified_pct', 'uttp_status',
    'het_lpg_price', 'lpg_distribution_pct', 'lpg_distributed_bottles', 'lpg_total_quota',
    'total_ikm_trained', 'total_ikm_certified', 'skm_score', 'skm_grade',
    'ticker_text'
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
        <td>
          <button onclick="editDistrictStatus(${index})" class="btn-outline" style="padding: 4px 10px; font-size: 0.76rem;">
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
    'total_ikm_trained', 'total_ikm_certified', 'skm_score', 'skm_grade',
    'ticker_text'
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

  CustomModal.alert({
    title: "Sinkronisasi Berhasil! 🎉",
    message: "Seluruh metrik dan teks ticker Command Center berhasil diperbarui. Layar TV Wallboard pimpinan akan langsung menampilkan data terbaru secara seketika.",
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
        <span class="status-pill ${n.is_critical ? 'status-draft' : 'status-published'}" style="${n.is_critical ? 'background: #FFE4E6; color: #9F1239;' : 'background: #DCFCE7; color: #166534;'} font-size: 0.7rem; font-weight: 800;">
          ${n.is_critical ? '🔴 Isu Kritis / Evaluasi' : '🟢 Positif ' + (n.sentiment_score || 90) + '%'}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button onclick="editMediaNews(${idx})" class="btn-outline" style="padding: 4px 8px; font-size: 0.75rem;">✏️ Edit</button>
          <button onclick="deleteMediaNews(${idx})" class="btn-danger" style="padding: 4px 8px; font-size: 0.75rem;">🗑️ Hapus</button>
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
        <span class="status-pill" style="${c.sentiment === 'negative' ? 'background: #FFE4E6; color: #9F1239;' : (c.sentiment === 'positive' ? 'background: #DCFCE7; color: #166534;' : 'background: #F1F5F9; color: #475569;')} font-size: 0.7rem; font-weight: 800;">
          ${c.sentiment_label || (c.sentiment === 'negative' ? '🔴 Keluhan / Evaluasi' : '🟢 Positif')}
        </span>
      </td>
      <td style="font-size: 0.75rem;">
        ${c.disposition ? `<div style="font-weight: 800; color: #92400E; margin-bottom: 2px;">🚨 ${c.disposition}</div>` : ''}
        <div style="color: #0369A1;">${c.official_response || 'Belum ada tanggapan.'}</div>
      </td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button onclick="editCitizenComment(${idx})" class="btn-outline" style="padding: 4px 8px; font-size: 0.75rem;">✏️ Edit</button>
          <button onclick="deleteCitizenComment(${idx})" class="btn-danger" style="padding: 4px 8px; font-size: 0.75rem;">🗑️ Hapus</button>
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
    onConfirm: () => {
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
      { name: "disposition", label: "Status Disposisi (cth: DISPOSISI: Bidang ESDM)", type: "text", placeholder: "Opsional jika butuh tindak lanjut" },
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
    onConfirm: () => {
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

// 11. MANAJEMEN KONFIGURASI SITUS, KONTAK & JAM PELAYANAN (CANONICAL V3)
function renderAdminSettings() {
  const settings = getStorage('disperindag_site_settings', DEFAULT_SITE_SETTINGS || {});
  const hours = getStorage('disperindag_service_hours', DEFAULT_SERVICE_HOURS || {});
  const channels = getStorage('disperindag_contact_channels', DEFAULT_CONTACT_CHANNELS || []);

  // Isi form site settings
  if (document.getElementById('cfg_office_name')) document.getElementById('cfg_office_name').value = settings.office_name || "Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang";
  if (document.getElementById('cfg_service_motto')) document.getElementById('cfg_service_motto').value = settings.service_motto || "Melayani Anda dengan Transparan, Adil & Profesional (MANTAP)";
  if (document.getElementById('cfg_address')) document.getElementById('cfg_address').value = settings.address || "Jalan Bintang No. 1, Kabupaten Pinrang, Sulawesi Selatan";
  if (document.getElementById('cfg_whatsapp')) document.getElementById('cfg_whatsapp').value = settings.whatsapp || "0823 1600 2226";
  if (document.getElementById('cfg_email')) document.getElementById('cfg_email').value = settings.email || "dinasperindagem.pinrang@gmail.com";
  if (document.getElementById('cfg_website_domain')) document.getElementById('cfg_website_domain').value = settings.website_domain || "disperindagesdm-pinrang.web.app";
  if (document.getElementById('cfg_instagram_handle')) document.getElementById('cfg_instagram_handle').value = settings.instagram_handle || "@perindagempinrang";
  if (document.getElementById('cfg_facebook_title')) document.getElementById('cfg_facebook_title').value = settings.facebook_title || "Disperindag-ESDM Pinrang";
  if (document.getElementById('cfg_sp4n_lapor_url')) document.getElementById('cfg_sp4n_lapor_url').value = settings.sp4n_lapor_url || "https://www.lapor.go.id/";

  // Isi jam pelayanan
  if (document.getElementById('cfg_hours_reg')) document.getElementById('cfg_hours_reg').value = hours.regular || "Senin – Kamis: 08.00 – 16.00 WITA";
  if (document.getElementById('cfg_hours_fri')) document.getElementById('cfg_hours_fri').value = hours.friday || "Jumat: 08.00 – 16.30 WITA";

  // Render tabel saluran kontak
  const tbody = document.getElementById('adminChannelsTableBody');
  if (tbody) {
    tbody.innerHTML = channels.map(c => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.3rem;">${c.icon}</span>
            <strong>${c.platform}</strong>
          </div>
        </td>
        <td><span style="font-size: 0.8rem; font-weight: 700; color: #1E40AF;">${c.title}</span></td>
        <td><code>${c.value}</code></td>
        <td>
          <a href="${c.url}" target="_blank" rel="noopener noreferrer" style="font-size: 0.78rem; color: #0284C7; text-decoration: none;">
            Buka Tautan &rarr;
          </a>
        </td>
        <td>
          <span style="background: #ECFDF5; color: #059669; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">
            ✓ Canonical Aktif
          </span>
        </td>
      </tr>
    `).join('');
  }
}

window.saveSiteSettingsConfig = function(e) {
  if (e) e.preventDefault();

  const settings = getStorage('disperindag_site_settings', DEFAULT_SITE_SETTINGS || {});
  const hours = getStorage('disperindag_service_hours', DEFAULT_SERVICE_HOURS || {});

  settings.office_name = document.getElementById('cfg_office_name').value;
  settings.service_motto = document.getElementById('cfg_service_motto').value;
  settings.address = document.getElementById('cfg_address').value;
  settings.whatsapp = document.getElementById('cfg_whatsapp').value;
  settings.email = document.getElementById('cfg_email').value;
  settings.website_domain = document.getElementById('cfg_website_domain').value;
  settings.instagram_handle = document.getElementById('cfg_instagram_handle').value;
  settings.facebook_title = document.getElementById('cfg_facebook_title').value;
  settings.sp4n_lapor_url = document.getElementById('cfg_sp4n_lapor_url').value;

  hours.regular = document.getElementById('cfg_hours_reg').value;
  hours.friday = document.getElementById('cfg_hours_fri').value;

  setStorage('disperindag_site_settings', settings);
  setStorage('disperindag_service_hours', hours);

  if (typeof db !== 'undefined' && db) {
    db.collection('system_config').doc('site_settings').set(settings, { merge: true }).catch(e => console.warn(e));
    db.collection('system_config').doc('service_hours').set(hours, { merge: true }).catch(e => console.warn(e));
  }

  CustomModal.toast("Pengaturan identitas kedinasan & jam pelayanan berhasil disimpan!", "success");
};



