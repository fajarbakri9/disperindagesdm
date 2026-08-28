// Mobile Staff App Controller - Role-Based Access Control (RBAC) & CustomModal UI
let currentUser = null;
let currentRole = "petugas_pasar";
let activeNavTab = "tabHome";
let compressedMobilePhoto = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Cek Autentikasi & Role Guard
  currentUser = requireAuth(['petugas', 'admin']);
  if (!currentUser) return;

  currentRole = currentUser.role || "petugas_pasar";
  initRoleSwitcher();
  initBottomNav();
  renderAppForRole();
  initMobileCamera();
  updateHeaderUserInfo();
});

function updateHeaderUserInfo() {
  if (!currentUser) return;
  const nameEl = document.getElementById('topUserGreetingName');
  if (nameEl) nameEl.innerText = currentUser.name;
}

// 1. ROLE SWITCHER
function initRoleSwitcher() {
  const select = document.getElementById('roleSelector');
  if (!select) return;

  select.value = currentRole;
  select.addEventListener('change', (e) => {
    currentRole = e.target.value;
    renderAppForRole();
  });
}

// 2. BOTTOM NAVIGATION
function initBottomNav() {
  const btns = document.querySelectorAll('.nav-item-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeNavTab = btn.dataset.tab;

      document.querySelectorAll('.app-tab-pane').forEach(p => p.classList.remove('active'));
      const targetPane = document.getElementById(activeNavTab);
      if (targetPane) targetPane.classList.add('active');

      if (activeNavTab === 'tabProfile') {
        renderProfileTabInfo();
      }
    });
  });
}

// 3. RENDER CONTENT BASED ON CURRENT ROLE
function renderAppForRole() {
  const roleNameEl = document.getElementById('currentRoleName');
  const roleIconEl = document.getElementById('currentRoleIcon');
  const greetingTitle = document.getElementById('appGreetingTitle');
  const greetingDesc = document.getElementById('appGreetingDesc');
  const dynamicModuleContainer = document.getElementById('dynamicRoleModule');

  // Role Metadata
  const roles = {
    petugas_pasar: {
      name: "Petugas Pasar (Perdagangan)",
      icon: "🛒",
      title: "Pencatatan Harga Sembako Harian",
      desc: "Perbarui harga 12 komoditas pangan pasar tradisional hari ini secara langsung.",
      render: renderMarketModule
    },
    pengawas_esdm: {
      name: "Pengawas ESDM (Gas LPG)",
      icon: "⚡",
      title: "Pengawasan Pangkalan LPG 3 Kg",
      desc: "Input hasil sidak kepatuhan HET dan ketersediaan stok tabung melon di pangkalan.",
      render: renderEsdmModule
    },
    penera_uml: {
      name: "Penera Ahli (Metrologi UML)",
      icon: "⚖️",
      title: "Layanan Tera / Tera Ulang UTTP",
      desc: "Input hasil pengujian pompa SPBU dan timbangan pasar menuju Daerah Tertib Ukur.",
      render: renderUmlModule
    },
    humas_berita: {
      name: "Tim Humas & Publikasi",
      icon: "📰",
      title: "Rilis Berita & Kegiatan Lapangan",
      desc: "Publikasikan dokumentasi kegiatan kedinasan langsung dari HP dengan auto-kompresi WebP.",
      render: renderHumasModule
    },
    layanan_aduan: {
      name: "Admin Aduan Konsumen",
      icon: "📢",
      title: "Manajemen Aspirasi & Pengaduan Warga",
      desc: "Tindak lanjuti laporan pangkalan nakal atau timbangan curang dari masyarakat.",
      render: renderAduanModule
    },
    super_admin: {
      name: "Super Admin (Kadis / Sekretaris)",
      icon: "👑",
      title: "Dashboard Pengawasan Eksekutif",
      desc: "Pantau seluruh data pergerakan sembako, sidak energi, tera, dan aduan publik secara terpusat.",
      render: renderSuperAdminModule
    }
  };

  const active = roles[currentRole] || roles.petugas_pasar;
  if (roleNameEl) roleNameEl.innerText = active.name;
  if (roleIconEl) roleIconEl.innerText = active.icon;
  if (greetingTitle) greetingTitle.innerText = active.title;
  if (greetingDesc) greetingDesc.innerText = active.desc;

  if (dynamicModuleContainer && active.render) {
    active.render(dynamicModuleContainer);
  }
}

// 4. MODULE 1: PETUGAS PASAR (UPDATE HARGA SEMBAKO INSTAN DENGAN CUSTOM MODAL)
function renderMarketModule(container) {
  const sembakoList = getStorage('disperindag_sembako', DEFAULT_SEMBAKO);

  container.innerHTML = `
    <div class="app-section-title">
      <h3>Daftar Harga Sembako Hari Ini</h3>
      <span>${sembakoList.length} Komoditas</span>
    </div>
    <div style="margin-bottom: 12px;">
      <input type="text" id="mobileSearchSembako" class="mobile-form-input" placeholder="🔍 Cari bahan pokok (Beras, Cabai, Minyak)...">
    </div>
    <div id="mobileSembakoList">
      ${renderSembakoItems(sembakoList)}
    </div>
  `;

  // Search filter
  document.getElementById('mobileSearchSembako').addEventListener('input', (e) => {
    const kw = e.target.value.toLowerCase();
    const filtered = sembakoList.filter(s => s.name.toLowerCase().includes(kw));
    document.getElementById('mobileSembakoList').innerHTML = renderSembakoItems(filtered);
  });
}

function renderSembakoItems(list) {
  return list.map(item => `
    <div class="market-item-card">
      <div class="market-item-info">
        <div class="market-item-emoji">${item.icon || '📦'}</div>
        <div>
          <div class="market-item-name">${item.name}</div>
          <div class="market-item-unit">Per ${item.unit} &bull; <span style="color: ${item.trend === 'up' ? '#DC2626' : (item.trend === 'down' ? '#16A34A' : '#64748B')}; font-weight: 700;">${item.trend === 'up' ? '▲ Naik' : (item.trend === 'down' ? '▼ Turun' : '— Stabil')}</span></div>
        </div>
      </div>
      <div class="market-price-action">
        <span class="market-price-val">Rp ${item.price.toLocaleString('id-ID')}</span>
        <button class="btn-quick-edit" onclick="mobileEditPrice('${item.id}', '${item.name}', ${item.price})">✏️ Ubah Harga</button>
      </div>
    </div>
  `).join('');
}

window.mobileEditPrice = async function(id, name, currentPrice) {
  const newPriceStr = await CustomModal.prompt({
    title: `Ubah Harga Komoditas`,
    message: `Masukkan harga per satuan baru untuk <strong>${name}</strong>:`,
    defaultValue: currentPrice,
    placeholder: "Contoh: 14500",
    inputType: "number",
    icon: "🌾",
    confirmText: "Simpan & Sinkronkan"
  });

  if (newPriceStr === null) return;

  const newPrice = parseInt(newPriceStr.toString().replace(/[^0-9]/g, ''));
  if (isNaN(newPrice) || newPrice <= 0) {
    CustomToast.show({
      title: "Input Tidak Valid",
      message: "Nominal harga harus berupa angka positif.",
      type: "danger"
    });
    return;
  }

  const list = getStorage('disperindag_sembako', DEFAULT_SEMBAKO);
  const item = list.find(s => s.id === id);
  if (item) {
    const prevPrice = item.price;
    if (window.DBService) {
      await window.DBService.updateSembakoPrice(id, newPrice, prevPrice);
    } else {
      item.prevPrice = prevPrice;
      item.price = newPrice;
      if (newPrice > item.prevPrice) item.trend = 'up';
      else if (newPrice < item.prevPrice) item.trend = 'down';
      else item.trend = 'stable';
      setStorage('disperindag_sembako', list);
    }
    renderMarketModule(document.getElementById('dynamicRoleModule'));
    CustomToast.show({
      title: "Harga Berhasil Diperbarui",
      message: `Harga ${name} kini Rp ${newPrice.toLocaleString('id-ID')}. Live sync aktif!`,
      type: "success"
    });
  }
};

// 5. MODULE 2: PENGAWAS ESDM
function renderEsdmModule(container) {
  container.innerHTML = `
    <div class="mobile-form-card">
      <h4 style="font-size: 1rem; font-weight: 900; color: var(--primary-deep); margin-bottom: 12px;">📝 Formulir Sidak Pangkalan LPG 3 Kg</h4>
      <form id="formSidakLpg">
        <div class="mobile-form-group">
          <label class="mobile-form-label">Nama Pangkalan / Pemilik</label>
          <input type="text" id="sidakNama" required class="mobile-form-input" placeholder="Contoh: Pangkalan Berkah H. Ambo">
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Kecamatan / Lokasi</label>
          <select id="sidakKecamatan" class="mobile-form-select">
            <option>Kec. Watang Sawitto</option>
            <option>Kec. Duampanua</option>
            <option>Kec. Suppa</option>
            <option>Kec. Paleteang</option>
            <option>Kec. Mattiro Bulu</option>
            <option>Kec. Lembang</option>
            <option>Kecamatan Lainnya</option>
          </select>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Harga Jual per Tabung (HET Resmi Rp 20.000)</label>
          <input type="number" id="sidakHarga" required class="mobile-form-input" placeholder="20000">
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Status Kepatuhan Pangkalan</label>
          <select id="sidakStatus" class="mobile-form-select">
            <option value="Patuh Sesuai HET">✓ Patuh Sesuai HET (Rp 20.000)</option>
            <option value="Pelanggaran HET Ringan">⚠️ Di Atas HET (Teguran Lisan)</option>
            <option value="Pelanggaran Berat / Penimbunan">🚨 Pelanggaran Berat (Rekomendasi PHU)</option>
          </select>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Catatan Temuan Lapangan</label>
          <textarea id="sidakCatatan" rows="3" class="mobile-form-textarea" placeholder="Tuliskan kondisi stok, pembukuan logbook KTP, dan kepatuhan plang HET..."></textarea>
        </div>

        <div class="mobile-camera-box" onclick="document.getElementById('mobileCameraInput').click()">
          <div class="mobile-camera-icon">📷</div>
          <div class="mobile-camera-text">Jepret Foto Pangkalan (Auto WebP 40KB)</div>
          <div id="mobilePhotoPreviewStatus" style="font-size: 0.72rem; color: #16A34A; margin-top: 4px;"></div>
        </div>

        <button type="submit" class="btn-mobile-submit">
          <span>💾</span> Simpan Laporan Sidak ESDM
        </button>
      </form>
    </div>
  `;

  document.getElementById('formSidakLpg').addEventListener('submit', (e) => {
    e.preventDefault();
    const nama = document.getElementById('sidakNama').value;
    const kec = document.getElementById('sidakKecamatan').value;
    const status = document.getElementById('sidakStatus').value;

    CustomModal.alert({
      title: "Laporan Sidak Tersimpan",
      message: `Hasil inspeksi pada <strong>${nama}</strong> (${kec}) dengan status <strong>${status}</strong> berhasil didokumentasikan ke sistem Pengawasan Energi.`,
      icon: "⚡",
      type: "info"
    });

    document.getElementById('formSidakLpg').reset();
    document.getElementById('mobilePhotoPreviewStatus').innerText = '';
  });
}

// 6. MODULE 3: PENERA AHLI UML
function renderUmlModule(container) {
  container.innerHTML = `
    <div class="mobile-form-card">
      <h4 style="font-size: 1rem; font-weight: 900; color: var(--primary-deep); margin-bottom: 12px;">⚖️ Input Hasil Uji Tera UTTP (UML)</h4>
      <form id="formTeraUml">
        <div class="mobile-form-group">
          <label class="mobile-form-label">Jenis Alat Ukur / UTTP</label>
          <select id="teraJenis" class="mobile-form-select">
            <option>Pompa Ukur BBM (Nozel SPBU)</option>
            <option>Timbangan Meja Pedagang Pasar</option>
            <option>Timbangan Elektronik / Digital</option>
            <option>Jembatan Timbang Gabah</option>
          </select>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Nama Pemilik / Lokasi Usaha</label>
          <input type="text" id="teraLokasi" required class="mobile-form-input" placeholder="Contoh: SPBU 74.912.01 Jl. Poros Pinrang">
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Hasil Pengujian Batas Kesalahan (BKD)</label>
          <select id="teraHasil" class="mobile-form-select">
            <option value="SAH (Dibubuhi Cap Tera 2026)">✓ SAH (Presisi & Dibubuhi Cap Tera 2026)</option>
            <option value="BATAL (Wajib Kalibrasi Ulang)">❌ BATAL (Takaran Kurang / Wajib Servis)</option>
          </select>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Masa Berlaku Cap Tera</label>
          <input type="text" class="mobile-form-input" value="1 Tahun (s.d. Agustus 2027)" readonly style="background: #F1F5F9;">
        </div>

        <button type="submit" class="btn-mobile-submit">
          <span>⚖️</span> Simpan & Terbitkan SKHP Digital
        </button>
      </form>
    </div>
  `;

  document.getElementById('formTeraUml').addEventListener('submit', (e) => {
    e.preventDefault();
    const jenis = document.getElementById('teraJenis').value;
    const lokasi = document.getElementById('teraLokasi').value;
    const hasil = document.getElementById('teraHasil').value;

    CustomModal.alert({
      title: "Hasil Tera UTTP Tersimpan",
      message: `Peneraan untuk <strong>${jenis}</strong> di <strong>${lokasi}</strong> berhasil disimpan. Hasil: <strong>${hasil}</strong>.`,
      icon: "⚖️",
      type: "info"
    });

    document.getElementById('formTeraUml').reset();
  });
}

// 7. MODULE 4: TIM HUMAS
function renderHumasModule(container) {
  container.innerHTML = `
    <div class="mobile-form-card">
      <h4 style="font-size: 1rem; font-weight: 900; color: var(--primary-deep); margin-bottom: 12px;">📰 Publikasi Berita Cepat dari HP</h4>
      <form id="formHumasBerita">
        <div class="mobile-form-group">
          <label class="mobile-form-label">Judul Berita Kegiatan</label>
          <input type="text" id="humasJudul" required class="mobile-form-input" placeholder="Tuliskan judul berita kedinasan...">
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Kategori Berita</label>
          <select id="humasKategori" class="mobile-form-select">
            <option>Pengawasan ESDM</option>
            <option>Perdagangan Dalam Negeri</option>
            <option>Metrologi Legal</option>
            <option>Pengembangan Industri</option>
          </select>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Ringkasan Berita (Lead)</label>
          <textarea id="humasExcerpt" rows="2" required class="mobile-form-textarea" placeholder="Ringkasan 1-2 kalimat berita..."></textarea>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Naskah Berita Lengkap</label>
          <textarea id="humasContent" rows="4" required class="mobile-form-textarea" placeholder="Isi naskah berita kedinasan lengkap..."></textarea>
        </div>

        <div class="mobile-camera-box" onclick="document.getElementById('mobileCameraInput').click()">
          <div class="mobile-camera-icon">📸</div>
          <div class="mobile-camera-text">Upload Foto Liputan (Auto-Compress WebP)</div>
          <div id="mobilePhotoPreviewStatus" style="font-size: 0.72rem; color: #16A34A; margin-top: 4px;"></div>
        </div>

        <button type="submit" class="btn-mobile-submit">
          <span>🚀</span> Tayangkan Berita ke Website Publik
        </button>
      </form>
    </div>
  `;

  document.getElementById('formHumasBerita').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('humasJudul').value;
    const category = document.getElementById('humasKategori').value;
    const excerpt = document.getElementById('humasExcerpt').value;
    const content = document.getElementById('humasContent').value;
    const img = compressedMobilePhoto || 'assets/banner/1741917868_c77d822a24b99f45347f.png';

    const newArticle = {
      id: "news_" + Date.now(),
      title,
      category,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      author: currentUser ? currentUser.name : "Humas Disperindag Pinrang",
      sourceName: "Rilis Resmi Disperindag ESDM",
      sourceUrl: "https://pinrangkab.go.id",
      img,
      excerpt,
      content
    };

    if (window.DBService) {
      await window.DBService.addNews(newArticle);
    } else {
      const newsList = getStorage('disperindag_news', DEFAULT_NEWS);
      newsList.unshift(newArticle);
      setStorage('disperindag_news', newsList);
    }

    CustomModal.alert({
      title: "Berita Resmi Diterbitkan",
      message: `Artikel <strong>"${title}"</strong> berhasil ditayangkan ke beranda dan halaman berita tunggal!`,
      icon: "📰",
      type: "info"
    });

    document.getElementById('formHumasBerita').reset();
    compressedMobilePhoto = null;
    document.getElementById('mobilePhotoPreviewStatus').innerText = '';
  });
}

// 8. MODULE 5: PETUGAS ADUAN
function renderAduanModule(container) {
  const reports = getStorage('disperindag_reports', DEFAULT_REPORTS);

  container.innerHTML = `
    <div class="app-section-title">
      <h3>Kotak Masuk Aduan Warga</h3>
      <span>${reports.length} Laporan</span>
    </div>
    ${reports.map(r => `
      <div class="mobile-form-card" style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <strong style="font-size: 0.95rem; color: var(--primary-deep);">${r.nama}</strong>
            <div style="font-size: 0.76rem; color: var(--text-muted);">${r.kontak} &bull; ${r.lokasi}</div>
          </div>
          <span style="background: #FFE4E6; color: #BE123C; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 10px;">${r.kategori}</span>
        </div>
        <p style="font-size: 0.84rem; color: #334155; line-height: 1.5; margin-bottom: 12px; background: #F8FAFC; padding: 10px; border-radius: 8px;">
          "${r.pesan}"
        </p>
        <div style="display: flex; gap: 8px;">
          <a href="https://wa.me/${r.kontak.replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(r.nama)},%20kami%20dari%20Disperindag%20ESDM%20Pinrang%20menindaklanjuti%20laporan%20Anda" target="_blank" class="btn-quick-edit" style="background: #DCFCE7; color: #15803D; border-color: #86EFAC; text-decoration: none; padding: 6px 12px;">
            📲 Respon WhatsApp
          </a>
          <button class="btn-quick-edit" onclick="updateAduanMobile('${r.id}')">
            ⚙️ Ubah Status
          </button>
        </div>
      </div>
    `).join('')}
  `;
}

window.updateAduanMobile = async function(id) {
  const reports = getStorage('disperindag_reports', DEFAULT_REPORTS);
  const r = reports.find(item => item.id === id);
  if (!r) return;

  const newStatus = await CustomModal.prompt({
    title: "Ubah Status Aduan",
    message: `Perbarui status tindak lanjut aduan dari <strong>${r.nama}</strong>:`,
    defaultValue: r.status || "Sedang Ditindaklanjuti Tim Lapangan",
    placeholder: "Contoh: Selesai Ditindaklanjuti / Sedang Sidak Lapangan",
    icon: "📢"
  });

  if (newStatus) {
    r.status = newStatus;
    setStorage('disperindag_reports', reports);
    renderAduanModule(document.getElementById('dynamicRoleModule'));
    CustomToast.show({
      title: "Status Diperbarui",
      message: `Status aduan menjadi: ${newStatus}`,
      type: "success"
    });
  }
};

// 9. MODULE 6: SUPER ADMIN
function renderSuperAdminModule(container) {
  const sembako = getStorage('disperindag_sembako', DEFAULT_SEMBAKO);
  const news = getStorage('disperindag_news', DEFAULT_NEWS);
  const reports = getStorage('disperindag_reports', DEFAULT_REPORTS);

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
      <div class="mobile-form-card" style="margin: 0; padding: 14px; text-align: center;">
        <span style="font-size: 1.6rem;">🛒</span>
        <div style="font-size: 1.3rem; font-weight: 900; color: var(--primary);">${sembako.length}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">Komoditas Terpantau</div>
      </div>
      <div class="mobile-form-card" style="margin: 0; padding: 14px; text-align: center;">
        <span style="font-size: 1.6rem;">📰</span>
        <div style="font-size: 1.3rem; font-weight: 900; color: var(--primary);">${news.length}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">Rilis Berita Publik</div>
      </div>
      <div class="mobile-form-card" style="margin: 0; padding: 14px; text-align: center;">
        <span style="font-size: 1.6rem;">📢</span>
        <div style="font-size: 1.3rem; font-weight: 900; color: var(--danger);">${reports.length}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">Total Aduan Warga</div>
      </div>
      <div class="mobile-form-card" style="margin: 0; padding: 14px; text-align: center;">
        <span style="font-size: 1.6rem;">🟢</span>
        <div style="font-size: 1.3rem; font-weight: 900; color: var(--accent-emerald);">Online</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">Status Firebase Cloud</div>
      </div>
    </div>

    <div class="app-section-title">
      <h3>Pintasan Kontrol Cepat</h3>
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <a href="admin.html" class="btn-mobile-submit" style="text-decoration: none; background: #0F2C59;">
        <span>💻</span> Buka CMS Versi Desktop Penuh
      </a>
      <a href="profil-petugas.html" class="btn-mobile-submit" style="text-decoration: none; background: #1E293B;">
        <span>👤</span> Edit Profil Pegawai & Password
      </a>
    </div>
  `;
}

// 10. RENDER PROFILE TAB DATA
function renderProfileTabInfo() {
  const u = AuthService.getCurrentUser();
  if (!u) return;

  const nameEl = document.getElementById('tabProfileName');
  const nipEl = document.getElementById('tabProfileNip');
  const roleEl = document.getElementById('tabProfileRole');
  const phoneEl = document.getElementById('tabProfilePhone');

  if (nameEl) nameEl.innerText = u.name;
  if (nipEl) nipEl.innerText = `NIP: ${u.nip || '-'}`;
  if (roleEl) roleEl.innerText = `${u.roleIcon || '👤'} ${u.roleLabel}`;
  if (phoneEl) phoneEl.innerText = `WhatsApp: ${u.phone || '-'}`;
}

// 11. MOBILE CAMERA & AUTO COMPRESSOR EVENT
function initMobileCamera() {
  const camInput = document.getElementById('mobileCameraInput');
  if (!camInput) return;

  camInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('mobilePhotoPreviewStatus');
    if (statusEl) statusEl.innerText = "⏳ Sedang mengompresi foto kamera...";

    try {
      const result = await ImageCompressor.compress(file, { maxWidth: 800, quality: 0.75 });
      compressedMobilePhoto = result.base64;
      if (statusEl) {
        statusEl.innerHTML = `✓ Foto Terkompresi: <strong>${ImageCompressor.formatBytes(result.compressedSize)}</strong> (Hemat ${result.savingPercent})`;
      }
      CustomToast.show({
        title: "Foto Terkompresi",
        message: `Ukuran foto diperkecil menjadi ${ImageCompressor.formatBytes(result.compressedSize)}`,
        type: "success"
      });
    } catch (err) {
      if (statusEl) statusEl.innerText = "Gagal memproses foto.";
    }
  });
}

// 5. MODULE 2: PENGAWAS ESDM (INPUT HASIL SIDAK PANGKALAN LPG 3 KG)
function renderEsdmModule(container) {
  container.innerHTML = `
    <div class="mobile-form-card">
      <h4 style="font-size: 1rem; font-weight: 900; color: var(--primary-deep); margin-bottom: 12px;">📝 Formulir Sidak Pangkalan LPG 3 Kg</h4>
      <form id="formSidakLpg">
        <div class="mobile-form-group">
          <label class="mobile-form-label">Nama Pangkalan / Pemilik</label>
          <input type="text" id="sidakNama" required class="mobile-form-input" placeholder="Contoh: Pangkalan Berkah H. Ambo">
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Kecamatan / Lokasi</label>
          <select id="sidakKecamatan" class="mobile-form-select">
            <option>Kec. Watang Sawitto</option>
            <option>Kec. Duampanua</option>
            <option>Kec. Suppa</option>
            <option>Kec. Paleteang</option>
            <option>Kec. Mattiro Bulu</option>
            <option>Kec. Lembang</option>
            <option>Kecamatan Lainnya</option>
          </select>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Harga Jual per Tabung (HET Resmi Rp 20.000)</label>
          <input type="number" id="sidakHarga" required class="mobile-form-input" placeholder="20000">
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Status Kepatuhan Pangkalan</label>
          <select id="sidakStatus" class="mobile-form-select">
            <option value="Patuh Sesuai HET">✓ Patuh Sesuai HET (Rp 20.000)</option>
            <option value="Pelanggaran HET Ringan">⚠️ Di Atas HET (Teguran Lisan)</option>
            <option value="Pelanggaran Berat / Penimbunan">🚨 Pelanggaran Berat (Rekomendasi PHU)</option>
          </select>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Catatan Temuan Lapangan</label>
          <textarea id="sidakCatatan" rows="3" class="mobile-form-textarea" placeholder="Tuliskan kondisi stok, pembukuan logbook KTP, dan kepatuhan plang HET..."></textarea>
        </div>

        <div class="mobile-camera-box" onclick="document.getElementById('mobileCameraInput').click()">
          <div class="mobile-camera-icon">📷</div>
          <div class="mobile-camera-text">Jepret Foto Pangkalan (Auto WebP 40KB)</div>
          <div id="mobilePhotoPreviewStatus" style="font-size: 0.72rem; color: #16A34A; margin-top: 4px;"></div>
        </div>

        <button type="submit" class="btn-mobile-submit">
          <span>💾</span> Simpan Laporan Sidak ESDM
        </button>
      </form>
    </div>
  `;

  document.getElementById('formSidakLpg').addEventListener('submit', (e) => {
    e.preventDefault();
    const nama = document.getElementById('sidakNama').value;
    const kec = document.getElementById('sidakKecamatan').value;
    const harga = document.getElementById('sidakHarga').value;
    const status = document.getElementById('sidakStatus').value;
    alert(`✓ Laporan Sidak Pangkalan "${nama}" di ${kec} berhasil tersimpan ke sistem Pengawasan ESDM! Status: ${status}`);
    document.getElementById('formSidakLpg').reset();
    document.getElementById('mobilePhotoPreviewStatus').innerText = '';
  });
}

// 6. MODULE 3: PENERA AHLI UML (INPUT UJI TERA SPBU & TIMBANGAN)
function renderUmlModule(container) {
  container.innerHTML = `
    <div class="mobile-form-card">
      <h4 style="font-size: 1rem; font-weight: 900; color: var(--primary-deep); margin-bottom: 12px;">⚖️ Input Hasil Uji Tera UTTP (UML)</h4>
      <form id="formTeraUml">
        <div class="mobile-form-group">
          <label class="mobile-form-label">Jenis Alat Ukur / UTTP</label>
          <select id="teraJenis" class="mobile-form-select">
            <option>Pompa Ukur BBM (Nozel SPBU)</option>
            <option>Timbangan Meja Pedagang Pasar</option>
            <option>Timbangan Elektronik / Digital</option>
            <option>Jembatan Timbang Gabah</option>
          </select>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Nama Pemilik / Lokasi Usaha</label>
          <input type="text" id="teraLokasi" required class="mobile-form-input" placeholder="Contoh: SPBU 74.912.01 Jl. Poros Pinrang">
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Hasil Pengujian Batas Kesalahan (BKD)</label>
          <select id="teraHasil" class="mobile-form-select">
            <option value="SAH (Dibubuhi Cap Tera 2026)">✓ SAH (Presisi & Dibubuhi Cap Tera 2026)</option>
            <option value="BATAL (Wajib Kalibrasi Ulang)">❌ BATAL (Takaran Kurang / Wajib Servis)</option>
          </select>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Masa Berlaku Cap Tera</label>
          <input type="text" class="mobile-form-input" value="1 Tahun (s.d. Agustus 2027)" readonly style="background: #F1F5F9;">
        </div>

        <button type="submit" class="btn-mobile-submit">
          <span>⚖️</span> Simpan & Terbitkan SKHP Digital
        </button>
      </form>
    </div>
  `;

  document.getElementById('formTeraUml').addEventListener('submit', (e) => {
    e.preventDefault();
    const jenis = document.getElementById('teraJenis').value;
    const lokasi = document.getElementById('teraLokasi').value;
    const hasil = document.getElementById('teraHasil').value;
    alert(`✓ Hasil Pengujian Metrologi untuk ${jenis} di "${lokasi}" berhasil disimpan! Status: ${hasil}`);
    document.getElementById('formTeraUml').reset();
  });
}

// 7. MODULE 4: TIM HUMAS (RILIS BERITA DARI HP)
function renderHumasModule(container) {
  container.innerHTML = `
    <div class="mobile-form-card">
      <h4 style="font-size: 1rem; font-weight: 900; color: var(--primary-deep); margin-bottom: 12px;">📰 Publikasi Berita Cepat dari HP</h4>
      <form id="formHumasBerita">
        <div class="mobile-form-group">
          <label class="mobile-form-label">Judul Berita Kegiatan</label>
          <input type="text" id="humasJudul" required class="mobile-form-input" placeholder="Tuliskan judul berita kedinasan...">
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Kategori Berita</label>
          <select id="humasKategori" class="mobile-form-select">
            <option>Pengawasan ESDM</option>
            <option>Perdagangan Dalam Negeri</option>
            <option>Metrologi Legal</option>
            <option>Pengembangan Industri</option>
          </select>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Ringkasan Berita (Lead)</label>
          <textarea id="humasExcerpt" rows="2" required class="mobile-form-textarea" placeholder="Ringkasan 1-2 kalimat berita..."></textarea>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Naskah Berita Lengkap</label>
          <textarea id="humasContent" rows="4" required class="mobile-form-textarea" placeholder="Isi naskah berita kedinasan lengkap..."></textarea>
        </div>

        <div class="mobile-camera-box" onclick="document.getElementById('mobileCameraInput').click()">
          <div class="mobile-camera-icon">📸</div>
          <div class="mobile-camera-text">Upload Foto Liputan (Auto-Compress WebP)</div>
          <div id="mobilePhotoPreviewStatus" style="font-size: 0.72rem; color: #16A34A; margin-top: 4px;"></div>
        </div>

        <button type="submit" class="btn-mobile-submit">
          <span>🚀</span> Tayangkan Berita ke Website Publik
        </button>
      </form>
    </div>
  `;

  document.getElementById('formHumasBerita').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('humasJudul').value;
    const category = document.getElementById('humasKategori').value;
    const excerpt = document.getElementById('humasExcerpt').value;
    const content = document.getElementById('humasContent').value;
    const img = compressedMobilePhoto || 'assets/banner/1741917868_c77d822a24b99f45347f.png';

    const newArticle = {
      id: "news_" + Date.now(),
      title,
      category,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      author: "Humas Disperindag Pinrang (Mobile)",
      sourceName: "Rilis Resmi Disperindag ESDM",
      sourceUrl: "https://pinrangkab.go.id",
      img,
      excerpt,
      content
    };

    if (window.DBService) {
      await window.DBService.addNews(newArticle);
    } else {
      const newsList = getStorage('disperindag_news', DEFAULT_NEWS);
      newsList.unshift(newArticle);
      setStorage('disperindag_news', newsList);
    }

    alert(`✓ Artikel "${title}" berhasil tayang di beranda dan halaman Single Post!`);
    document.getElementById('formHumasBerita').reset();
    compressedMobilePhoto = null;
    document.getElementById('mobilePhotoPreviewStatus').innerText = '';
  });
}

// 8. MODULE 5: PETUGAS ADUAN (INBOX ADUAN WARGA)
function renderAduanModule(container) {
  const reports = getStorage('disperindag_reports', DEFAULT_REPORTS);

  container.innerHTML = `
    <div class="app-section-title">
      <h3>Kotak Masuk Aduan Warga</h3>
      <span>${reports.length} Laporan</span>
    </div>
    ${reports.map(r => `
      <div class="mobile-form-card" style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <strong style="font-size: 0.95rem; color: var(--primary-deep);">${r.nama}</strong>
            <div style="font-size: 0.76rem; color: var(--text-muted);">${r.kontak} &bull; ${r.lokasi}</div>
          </div>
          <span style="background: #FFE4E6; color: #BE123C; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 10px;">${r.kategori}</span>
        </div>
        <p style="font-size: 0.84rem; color: #334155; line-height: 1.5; margin-bottom: 12px; background: #F8FAFC; padding: 10px; border-radius: 8px;">
          "${r.pesan}"
        </p>
        <div style="display: flex; gap: 8px;">
          <a href="https://wa.me/${r.kontak.replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(r.nama)},%20kami%20dari%20Disperindag%20ESDM%20Pinrang%20menindaklanjuti%20laporan%20Anda" target="_blank" class="btn-quick-edit" style="background: #DCFCE7; color: #15803D; border-color: #86EFAC; text-decoration: none; padding: 6px 12px;">
            📲 Respon WhatsApp
          </a>
          <button class="btn-quick-edit" onclick="updateAduanMobile('${r.id}')">
            ⚙️ Ubah Status
          </button>
        </div>
      </div>
    `).join('')}
  `;
}

window.updateAduanMobile = function(id) {
  const reports = getStorage('disperindag_reports', DEFAULT_REPORTS);
  const r = reports.find(item => item.id === id);
  if (!r) return;

  const newStatus = prompt("Update Status Aduan (misal: 'Sedang Diselidiki Tim UML', 'Selesai Ditindaklanjuti'):", r.status);
  if (newStatus) {
    r.status = newStatus;
    setStorage('disperindag_reports', reports);
    renderAduanModule(document.getElementById('dynamicRoleModule'));
  }
};

// 9. MODULE 6: SUPER ADMIN (DASHBOARD EKSEKUTIF KADIS)
function renderSuperAdminModule(container) {
  const sembako = getStorage('disperindag_sembako', DEFAULT_SEMBAKO);
  const news = getStorage('disperindag_news', DEFAULT_NEWS);
  const reports = getStorage('disperindag_reports', DEFAULT_REPORTS);

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
      <div class="mobile-form-card" style="margin: 0; padding: 14px; text-align: center;">
        <span style="font-size: 1.6rem;">🛒</span>
        <div style="font-size: 1.3rem; font-weight: 900; color: var(--primary);">${sembako.length}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">Komoditas Terpantau</div>
      </div>
      <div class="mobile-form-card" style="margin: 0; padding: 14px; text-align: center;">
        <span style="font-size: 1.6rem;">📰</span>
        <div style="font-size: 1.3rem; font-weight: 900; color: var(--primary);">${news.length}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">Rilis Berita Publik</div>
      </div>
      <div class="mobile-form-card" style="margin: 0; padding: 14px; text-align: center;">
        <span style="font-size: 1.6rem;">📢</span>
        <div style="font-size: 1.3rem; font-weight: 900; color: var(--danger);">${reports.length}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">Total Aduan Warga</div>
      </div>
      <div class="mobile-form-card" style="margin: 0; padding: 14px; text-align: center;">
        <span style="font-size: 1.6rem;">🟢</span>
        <div style="font-size: 1.3rem; font-weight: 900; color: var(--accent-emerald);">Online</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">Status Firebase Cloud</div>
      </div>
    </div>

    <div class="app-section-title">
      <h3>Pintasan Kontrol Cepat</h3>
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <a href="admin.html" class="btn-mobile-submit" style="text-decoration: none; background: #0F2C59;">
        <span>💻</span> Buka CMS Versi Desktop Penuh
      </a>
      <a href="index.html" class="btn-mobile-submit" style="text-decoration: none; background: #1E293B;">
        <span>🌐</span> Lihat Halaman Web Publik
      </a>
    </div>
  `;
}

// 10. MOBILE CAMERA & AUTO COMPRESSOR EVENT
function initMobileCamera() {
  const camInput = document.getElementById('mobileCameraInput');
  if (!camInput) return;

  camInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('mobilePhotoPreviewStatus');
    if (statusEl) statusEl.innerText = "⏳ Sedang mengompresi foto kamera...";

    try {
      const result = await ImageCompressor.compress(file, { maxWidth: 800, quality: 0.75 });
      compressedMobilePhoto = result.base64;
      if (statusEl) {
        statusEl.innerHTML = `✓ Foto Terkompresi: <strong>${ImageCompressor.formatBytes(result.compressedSize)}</strong> (Hemat ${result.savingPercent})`;
      }
    } catch (err) {
      if (statusEl) statusEl.innerText = "Gagal memproses foto.";
    }
  });
}
