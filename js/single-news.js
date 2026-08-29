// Controller Halaman Single Post Berita Profesional
document.addEventListener('DOMContentLoaded', () => {
  initDateHeader();
  loadSingleArticle();
  loadSidebarWidgets();
});

function initDateHeader() {
  const dateEl = document.getElementById('topbarCurrentDate');
  if (!dateEl) return;
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateEl.innerHTML = `🗓️ ${now.toLocaleDateString('id-ID', options)} • Pinrang, Sulsel (WITA)`;
}

function loadSingleArticle() {
  const urlParams = new URLSearchParams(window.location.search);
  let newsId = urlParams.get('id');

  const newsList = getStorage('disperindag_news', DEFAULT_NEWS);
  
  // Jika ID tidak ada, gunakan berita pertama
  let article = newsList.find(n => n.id === newsId);
  if (!article) {
    article = newsList[0];
  }

  if (!article) return;

  // 1. Update Title & Meta
  document.title = `${article.title} | Disperindag ESDM Pinrang`;
  const metaDesc = document.getElementById('pageMetaDesc');
  if (metaDesc) metaDesc.content = article.excerpt || article.title;

  // 2. Update Breadcrumb & Header
  document.getElementById('breadcrumbCategory').innerText = article.category;
  document.getElementById('articleCategory').innerText = article.category;
  document.getElementById('articleTitle').innerText = article.title;
  document.getElementById('articleDate').innerText = `📅 ${article.date}`;
  document.getElementById('articleAuthor').innerText = `✍️ Rilis: ${article.author}`;

  // 3. Update Featured Image
  const imgEl = document.getElementById('articleImage');
  imgEl.src = article.img;
  imgEl.alt = article.title;
  imgEl.onerror = () => { imgEl.src = 'assets/banner/1741917868_c77d822a24b99f45347f.png'; };

  document.getElementById('articleImageCaption').innerText = `Dokumentasi Resmi: ${article.title} — Disperindag ESDM Kab. Pinrang`;

  // 4. Update Body Content
  document.getElementById('articleBody').innerHTML = article.content;

  // 5. Update Press Citation Box
  const citationText = document.getElementById('citationText');
  if (article.sourceName && article.sourceUrl) {
    citationText.innerHTML = `
      Naskah rilis kegiatan kedinasan ini dikutip dan disusun ulang dari publikasi pers <strong>${article.sourceName}</strong> untuk keperluan transparansi kinerja aparatur sipil negara di lingkungan Pemerintah Kabupaten Pinrang. Tautan resmi: <a href="${article.sourceUrl}" target="_blank" style="color: #2563EB; font-weight: 800; text-decoration: underline;">${article.sourceUrl} &rarr;</a>
    `;
  } else {
    citationText.innerHTML = `
      Rilis berita resmi diterbitkan oleh Tim Hubungan Masyarakat (Humas) Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang, Provinsi Sulawesi Selatan.
    `;
  }
}

function loadSidebarWidgets() {
  const newsList = getStorage('disperindag_news', DEFAULT_NEWS);
  const sembakoList = getStorage('disperindag_sembako', DEFAULT_SEMBAKO);

  // Widget Sembako (Top 4)
  const sembakoEl = document.getElementById('sidebarSembakoList');
  if (sembakoEl) {
    const topSembako = sembakoList.slice(0, 4);
    sembakoEl.innerHTML = topSembako.map(s => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-subtle);">
        <span style="font-size: 0.85rem; font-weight: 700; color: var(--primary-deep);">${s.icon || '📦'} ${s.name}</span>
        <span style="font-size: 0.88rem; font-weight: 900; color: var(--primary);">Rp ${s.price.toLocaleString('id-ID')}</span>
      </div>
    `).join('');
  }

  // Widget Recent News (4 berita selain yang sedang dibuka)
  const recentEl = document.getElementById('sidebarRecentNews');
  if (recentEl) {
    const urlParams = new URLSearchParams(window.location.search);
    const currentId = urlParams.get('id');
    const otherNews = newsList.filter(n => n.id !== currentId).slice(0, 4);

    recentEl.innerHTML = otherNews.map(n => `
      <a href="berita/${n.slug || n.id}" class="recent-news-item">
        <div class="recent-news-thumb">
          <img src="${n.img}" alt="${n.title}" onerror="this.src='assets/banner/1741917868_c77d822a24b99f45347f.png'">
        </div>
        <div class="recent-news-info">
          <h5>${n.title}</h5>
          <span>📅 ${n.date}</span>
        </div>
      </a>
    `).join('');
  }
}
