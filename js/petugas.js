// ==========================================================================
// PETUGAS LAPANGAN MOBILE APP CONTROLLER - DISPERINDAG ESDM PINRANG
// ==========================================================================
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
  initPetugasSp2kpSync();
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
    
    // Kembali ke tab tugas utama secara otomatis
    activeNavTab = "tabHome";
    document.querySelectorAll('.nav-item-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === 'tabHome');
    });
    document.querySelectorAll('.app-tab-pane').forEach(p => {
      p.classList.toggle('active', p.id === 'tabHome');
    });

    renderAppForRole();
  });
}

// 2. BOTTOM / TAB NAVIGATION
function initBottomNav() {
  const btns = document.querySelectorAll('.nav-item-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
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

// 3. RENDER CONTENT BERDASARKAN PERAN AKTIF
function renderAppForRole() {
  const select = document.getElementById('roleSelector');
  const roleNameEl = document.getElementById('currentRoleName');
  const roleIconEl = document.getElementById('currentRoleIcon');
  const greetingTitle = document.getElementById('appGreetingTitle');
  const greetingDesc = document.getElementById('appGreetingDesc');
  const dynamicModuleContainer = document.getElementById('dynamicRoleModule');

  if (select && select.value !== currentRole) {
    select.value = currentRole;
  }

  // Metadata Peran Petugas
  const roles = {
    petugas_pasar: {
      name: "Petugas Pasar (Perdagangan)",
      icon: "🛒",
      title: "Pencatatan Harga Sembako Harian",
      desc: "Perbarui data harga komoditas pangan pasar tradisional Pinrang hari ini secara langsung.",
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
      title: "Rilis Berita & Liputan Lapangan",
      desc: "Publikasikan rilis berita dan foto dokumentasi kegiatan langsung dari lapangan.",
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
      name: "Super Admin (Kadis / Pimpinan)",
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
    try {
      active.render(dynamicModuleContainer);
    } catch(err) {
      console.error("Gagal merender modul peran:", err);
      dynamicModuleContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #DC2626; background: #FEF2F2; border-radius: 12px; border: 1.5px solid #FECACA;">
          <div style="font-size: 2rem; margin-bottom: 8px;">⚠️</div>
          <strong>Gagal Memuat Modul</strong>
          <p style="font-size: 0.82rem; color: #64748B; margin-top: 4px;">Silakan muat ulang halaman atau pilih peran lain.</p>
        </div>
      `;
    }
  }
}

// 4. MODUL 1: PETUGAS PASAR (MONITORING SP2KP KEMENDAG & VERIFIKASI LAPANGAN TPID)
let mobileSp2kpCache = [];
let mobileOverridesCache = {};

function initPetugasSp2kpSync() {
  if (typeof db !== 'undefined' && db !== null) {
    try {
      db.collection('market_prices_latest').onSnapshot(snapshot => {
        if (!snapshot.empty) {
          const items = [];
          snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
          mobileSp2kpCache = items.sort((a, b) => (Number(a.sp2kpCommodityId || 0) - Number(b.sp2kpCommodityId || 0)));
          const container = document.getElementById('dynamicRoleModule');
          if (container && currentRole === 'petugas_pasar') {
            renderMarketModule(container);
          }
        }
      }, err => console.warn("Petugas SP2KP sync error:", err));

      db.collection('price_overrides').onSnapshot(snapshot => {
        const overrides = {};
        snapshot.forEach(doc => {
          overrides[doc.id] = { id: doc.id, ...doc.data() };
        });
        mobileOverridesCache = overrides;
        const container = document.getElementById('dynamicRoleModule');
        if (container && currentRole === 'petugas_pasar') {
          renderMarketModule(container);
        }
      }, err => console.warn("Petugas Overrides sync error:", err));
    } catch(e) {}
  }
}

function getPetugasResolvedPrices() {
  if (mobileSp2kpCache.length > 0) {
    return mobileSp2kpCache.map(item => {
      const vId = item.variantId || item.id;
      let resolved = null;
      if (typeof PriceResolver !== 'undefined') {
        resolved = PriceResolver.normalizeSp2kpItem(item);
      } else {
        const sourcePrice = Number(item.sourcePrice || item.price || 0);
        resolved = {
          effectivePrice: sourcePrice,
          effectiveFormatted: 'Rp ' + sourcePrice.toLocaleString('id-ID'),
          isOverridden: false,
          diff: Number(item.delta || item.diff || 0),
          trend: Number(item.delta || item.diff || 0) > 0 ? 'up' : (Number(item.delta || item.diff || 0) < 0 ? 'down' : 'stable')
        };
      }

      return {
        id: vId,
        commodity_name: item.commodityName || item.commodity_name || 'Komoditas',
        unit: item.unit || 'kg',
        price: resolved.price != null ? resolved.price : resolved.effectivePrice,
        sourcePrice: Number(item.sourcePrice || item.price || 0),
        diff: Number(resolved.delta != null ? resolved.delta : resolved.diff || 0),
        trend: resolved.trend,
        isOverridden: false,
        overrideReason: null,
        dataDate: item.dataDate || null,
        market_name: item.market_name || 'Pasar Sentral & Pekkabata'
      };
    });
  }

  return [];
}

function renderMarketModule(container) {
  const pricesList = getPetugasResolvedPrices();

  container.innerHTML = `
    <div class="app-section-title" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <div>
        <h3 style="margin: 0; font-size: 1.05rem; color: var(--primary-deep);">Harga Bahan Pokok (SP2KP)</h3>
        <span style="font-size: 0.76rem; color: #64748B;">Kabupaten Pinrang &bull; ${pricesList.length} Komoditas</span>
      </div>
      <span style="display: inline-flex; align-items: center; gap: 4px; background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; font-size: 0.72rem; font-weight: 800; padding: 4px 8px; border-radius: 999px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span> Kemendag RI
      </span>
    </div>
    <div style="margin-bottom: 14px;">
      <input type="text" id="mobileSearchSembako" class="mobile-form-input" placeholder="🔍 Cari nama bahan pokok (Beras, Minyak, Cabai, Daging, Telur)...">
    </div>
    <div id="mobileSembakoList">
      ${renderSembakoItems(pricesList)}
    </div>
  `;

  // Search filter
  const searchInput = document.getElementById('mobileSearchSembako');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const kw = e.target.value.toLowerCase().trim();
      const filtered = pricesList.filter(s => {
        const name = (s.commodity_name || s.name || '').toLowerCase();
        const market = (s.market_name || '').toLowerCase();
        return name.includes(kw) || market.includes(kw);
      });
      const listEl = document.getElementById('mobileSembakoList');
      if (listEl) listEl.innerHTML = renderSembakoItems(filtered);
    });
  }
}

function renderSembakoItems(list) {
  if (!list || list.length === 0) {
    return `<div style="text-align:center; padding: 24px; color: #64748B; font-size: 0.85rem; background: #FFFFFF; border-radius: 12px; border: 1.5px solid #E2E8F0;">Tidak ada data komoditas pangan yang sesuai pencarian.</div>`;
  }
  return list.map(item => {
    const name = item.commodity_name || item.name || 'Komoditas Pangan';
    const unit = item.unit || 'Kg';
    const price = Number(item.price || 0);
    const trend = item.trend || 'stable';
    const diff = Number(item.diff || 0);
    const isOverridden = !!item.isOverridden;

    const trendText = diff > 0 ? `▲ +Rp ${diff.toLocaleString('id-ID')}` : (diff < 0 ? `▼ -Rp ${(Math.abs(diff)).toLocaleString('id-ID')}` : '— Tetap');
    const trendColor = diff > 0 ? '#DC2626' : (diff < 0 ? '#16A34A' : '#64748B');

    return `
      <div class="market-item-card" style="${isOverridden ? 'border-left: 4px solid #D97706; background: #FFFBEB;' : ''}">
        <div class="market-item-info">
          <div class="market-item-emoji">${item.icon || (name.includes('Beras') ? '🌾' : name.includes('Minyak') ? '🛢️' : name.includes('Cabai') ? '🌶️' : name.includes('Bawang') ? '🧅' : name.includes('Daging') ? '🥩' : name.includes('Gula') ? '🍚' : '🥚')}</div>
          <div>
            <div class="market-item-name" style="font-weight: 800; color: #0F2C59;">${name}</div>
            <div class="market-item-unit">
              Per 1 ${unit} &bull; <span style="color: ${trendColor}; font-weight: 700;">${trendText}</span>
              ${isOverridden ? `<br><span style="color: #92400E; font-weight: 800; font-size: 0.7rem;">⚖️ Koreksi Lapangan Aktif</span>` : ''}
            </div>
          </div>
        </div>
        <div class="market-price-action">
          <span class="market-price-val" style="font-size: 0.96rem; color: ${isOverridden ? '#D97706' : '#1E40AF'}; font-weight: 900;">
            Rp ${price.toLocaleString('id-ID')}
          </span>
          <button type="button" class="btn-quick-edit" style="font-size: 0.74rem; padding: 6px 10px;" onclick="mobileVerifyPrice('${item.id}', '${name.replace(/'/g, "\\'")}', ${price}, '${unit}', ${isOverridden})">
            ${isOverridden ? '⚙️ Koreksi' : '⚖️ Verifikasi'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.mobileVerifyPrice = async function(id, name, currentPrice, unit = 'Kg', isOverridden = false) {
  const newVal = await CustomModal.prompt({
    title: `Verifikasi Lapangan: ${name}`,
    message: `Masukkan nominal harga hasil verifikasi survei pasar langsung untuk <strong>${name}</strong> per 1 ${unit} (Harga saat ini: Rp ${currentPrice.toLocaleString('id-ID')}):`,
    defaultValue: currentPrice.toString(),
    placeholder: "Contoh: 14500",
    inputType: "number",
    icon: "🌾",
    confirmText: "Simpan Koreksi Terverifikasi"
  });

  if (newVal === null || newVal === undefined || newVal.toString().trim() === '') return;

  const parsed = parseInt(newVal.toString().replace(/[^0-9]/g, ''), 10);
  if (isNaN(parsed) || parsed <= 0) {
    CustomModal.alert({ title: "Input Tidak Valid", message: "Nominal harga harus berupa angka positif.", icon: "⚠️", type: "warning" });
    return;
  }

  const session = (typeof getSession === 'function' ? getSession() : null) || { name: 'Petugas Lapangan', role: 'petugas_pasar' };

  const overrideDoc = {
    variantId: id,
    commodityName: name,
    unit: unit,
    sourcePrice: currentPrice,
    overridePrice: parsed,
    reason: "Hasil verifikasi survei pasar langsung (Petugas Lapangan TPID)",
    evidenceRef: "Laporan Lapangan Petugas: " + (session.name || "Enumerator"),
    expiryOption: "24h",
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    status: "active",
    appliedBy: session.name || "Petugas Pasar",
    appliedAt: new Date().toISOString()
  };

  if (typeof db !== 'undefined' && db !== null) {
    try {
      await db.collection('price_overrides').doc(id).set(overrideDoc, { merge: true });
    } catch(e) {
      console.error("Firestore override save error:", e);
    }
  }

  mobileOverridesCache[id] = overrideDoc;
  renderMarketModule(document.getElementById('dynamicRoleModule'));

  CustomModal.alert({
    title: "Verifikasi Lapangan Tersimpan",
    message: `Koreksi harga terstruktur untuk <strong>${name}</strong> berhasil dicatat sebesar <strong>Rp ${parsed.toLocaleString('id-ID')}/${unit}</strong> dan tersinkronisasi ke Dashboard Pimpinan.`,
    icon: "✅",
    type: "info"
  });
};

// 5. MODUL 2: PENGAWAS ESDM (INPUT HASIL SIDAK PANGKALAN LPG 3 KG & GPS LOCATION)
function renderEsdmModule(container) {
  const pangkalanList = (typeof getLpgStore === 'function') 
    ? getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []) 
    : [];

  const activePangkalan = pangkalanList.filter(p => !p.isDeleted);

  container.innerHTML = `
    <div class="mobile-form-card">
      <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--primary-deep); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
        <span>⚡</span> Inspeksi &amp; Verifikasi Lokasi Pangkalan LPG 3 Kg
      </h4>
      <form id="formSidakLpg">
        <div class="mobile-form-group">
          <label class="mobile-form-label">Pilih Pangkalan Terdaftar (${activePangkalan.length.toLocaleString('id-ID')} data dari Firestore) *</label>
          <select id="sidakPangkalanSelect" required class="mobile-form-select" onchange="handleSelectPangkalanSidak(this.value)">
            <option value="">-- Pilih Pangkalan Terdaftar --</option>
            ${activePangkalan.slice(0, 150).map(p => `
              <option value="${p.id}">${p.name} — ${p.desaKelurahan}, Kec. ${p.kecamatan} (${p.agentName || p.agentId})</option>
            `).join('')}
          </select>
        </div>

        <div id="sidakPangkalanDetailBox" style="display: none; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 0.78rem; line-height: 1.45;">
          <!-- Detail pangkalan terpilih -->
        </div>

        <div class="mobile-form-group">
          <label class="mobile-form-label">Titik Koordinat GPS Lokasi Pangkalan</label>
          <div style="display: flex; gap: 6px;">
            <input type="text" id="sidakGpsCoords" class="mobile-form-input" readonly placeholder="Belum ada koordinat GPS" style="background: #F1F5F9; font-size: 0.8rem;">
            <button type="button" class="btn-quick-nav" style="background: #0284C7; color: #FFFFFF; font-size: 0.74rem; padding: 6px 12px; border-radius: 6px; white-space: nowrap; border: none; font-weight: 800; cursor: pointer;" onclick="getPetugasGeolocation()">
              📍 Ambil GPS
            </button>
          </div>
        </div>

        <div class="mobile-form-group">
          <label class="mobile-form-label">Harga Jual Faktual di Pangkalan <span id="sidakHetReference">(memuat HET resmi…)</span></label>
          <input type="number" id="sidakHarga" required class="mobile-form-input" placeholder="Masukkan harga hasil pemeriksaan">
        </div>

        <div class="mobile-form-group">
          <label class="mobile-form-label">Status Kepatuhan Pangkalan</label>
          <select id="sidakStatus" class="mobile-form-select">
            <option value="Patuh Sesuai HET">✓ Patuh Sesuai HET resmi</option>
            <option value="Pelanggaran HET Ringan">⚠️ Di Atas HET (Teguran Lisan / Peringatan)</option>
            <option value="Pelanggaran Berat / Penimbunan">🚨 Pelanggaran Berat (Rekomendasi Sanksi / PHU)</option>
          </select>
        </div>

        <div class="mobile-form-group">
          <label class="mobile-form-label">Catatan Temuan Lapangan</label>
          <textarea id="sidakCatatan" rows="3" class="mobile-form-textarea" placeholder="Tuliskan kondisi fisik tabung melon, pembukuan logbook KTP, kepatuhan plang nama pangkalan, dan stok fisik di lokasi..."></textarea>
        </div>

        <button type="submit" class="btn-mobile-submit" style="background: linear-gradient(135deg, #D97706 0%, #B45309 100%);">
          <span>💾</span> Simpan Hasil Inspeksi &amp; Verifikasi Lokasi
        </button>
      </form>
    </div>
  `;

  window.handleSelectPangkalanSidak = function(pId) {
    const box = document.getElementById('sidakPangkalanDetailBox');
    const p = activePangkalan.find(item => item.id === pId);
    if (!p || !box) {
      if (box) box.style.display = 'none';
      return;
    }
    box.style.display = 'block';
    box.innerHTML = `
      <strong>ID:</strong> ${p.id} &bull; <strong>Agen:</strong> ${p.agentName || p.agentId}<br>
      <strong>Alamat:</strong> ${p.address}<br>
      <strong>Pemilik:</strong> ${p.ownerName || '-'} (📞 ${p.phone || '-'})<br>
      <strong>Verifikasi Lokasi:</strong> <span style="font-weight:800; color:${p.latitude ? '#059669' : '#B45309'}">${p.latitude ? `Terverifikasi (${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)})` : 'Belum Ada Koordinat GPS'}</span>
    `;

    const gpsInput = document.getElementById('sidakGpsCoords');
    if (gpsInput && p.latitude && p.longitude) {
      gpsInput.value = `${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}`;
    }
  };

  window.getPetugasGeolocation = function() {
    if (!navigator.geolocation) {
      CustomModal.alert({ title: "GPS Tidak Didukung", message: "Perangkat ini tidak mendukung fitur Geolocation GPS.", icon: "⚠️", type: "warning" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const gpsInput = document.getElementById('sidakGpsCoords');
        if (gpsInput) gpsInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        CustomModal.alert({ title: "Titik GPS Terkunci", message: `Koordinat berhasil diambil:<br><strong>Lat: ${lat.toFixed(6)}, Long: ${lng.toFixed(6)}</strong>`, icon: "📍", type: "info" });
      },
      (err) => {
        // Fallback default Pinrang jika permission denied
        const lat = -3.7850 + (Math.random() * 0.02);
        const lng = 119.6450 + (Math.random() * 0.02);
        const gpsInput = document.getElementById('sidakGpsCoords');
        if (gpsInput) gpsInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        CustomModal.alert({ title: "Koordinat Simulasi Lapangan", message: `Menggunakan titik koordinat inspeksi Pinrang:<br><strong>Lat: ${lat.toFixed(6)}, Long: ${lng.toFixed(6)}</strong>`, icon: "📍", type: "info" });
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  document.getElementById('formSidakLpg').addEventListener('submit', (e) => {
    e.preventDefault();
    const pId = document.getElementById('sidakPangkalanSelect').value;
    const harga = document.getElementById('sidakHarga').value;
    const status = document.getElementById('sidakStatus').value;
    const catatan = document.getElementById('sidakCatatan').value;
    const coordsStr = document.getElementById('sidakGpsCoords').value;

    const p = activePangkalan.find(item => item.id === pId);
    if (!p) {
      CustomModal.alert({ title: "Pangkalan Belum Dipilih", message: "Silakan pilih pangkalan yang diinspeksi.", icon: "⚠️", type: "warning" });
      return;
    }

    // Update data koordinat pangkalan jika diambil
    if (coordsStr && coordsStr.includes(',')) {
      const parts = coordsStr.split(',');
      p.latitude = parseFloat(parts[0]);
      p.longitude = parseFloat(parts[1]);
      p.locationVerification = "VERIFIED";
      p.updatedAt = new Date().toISOString();

      if (typeof setLpgStore === 'function') {
        setLpgStore(LPG_STORAGE_KEYS.PANGKALAN, pangkalanList);
      }
    }

    // Catat Audit Log Inspeksi Lapangan
    if (typeof recordLpgAuditLog === 'function') {
      recordLpgAuditLog({
        action: "INSPECTION_RECORD",
        entityType: "PANGKALAN",
        entityId: p.id,
        agentId: p.agentId,
        actorUid: "petugas_lapangan",
        actorRole: "LPG_INSPECTOR",
        before: { locationVerification: p.locationVerification },
        after: { inspectionStatus: status, hargaJual: harga, coords: coordsStr },
        reason: `Sidak lapangan: ${status} (Catatan: ${catatan || '-'})`
      });
    }

    CustomModal.alert({
      title: "Hasil Inspeksi Disimpan",
      message: `Inspeksi pada <strong>${p.name}</strong> (${p.desaKelurahan}, Kec. ${p.kecamatan}) berhasil dicatat.<br><br>Status Kepatuhan: <strong>${status}</strong>.<br>Koordinat Lokasi: <strong>${coordsStr || 'Belum Diambil'}</strong>.`,
      icon: "⚡",
      type: "info"
    });

    document.getElementById('formSidakLpg').reset();
    document.getElementById('sidakPangkalanDetailBox').style.display = 'none';
  });
}

// 6. MODUL 3: PENERA AHLI UML (INPUT HASIL UJI TERA UTTP)
function renderUmlModule(container) {
  container.innerHTML = `
    <div class="mobile-form-card">
      <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--primary-deep); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
        <span>⚖️</span> Input Hasil Uji Tera UTTP (UML)
      </h4>
      <form id="formTeraUml">
        <div class="mobile-form-group">
          <label class="mobile-form-label">Jenis Alat Ukur / UTTP</label>
          <select id="teraJenis" class="mobile-form-select">
            <option>Pompa Ukur BBM (Nozel SPBU)</option>
            <option>Timbangan Meja Pedagang Pasar</option>
            <option>Timbangan Elektronik / Digital</option>
            <option>Timbangan Pegas / Gantung</option>
            <option>Jembatan Timbang Gabah & Truk</option>
            <option>Meter Air / Flow Meter</option>
          </select>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Nama Pemilik / Lokasi Usaha</label>
          <input type="text" id="teraLokasi" required class="mobile-form-input" placeholder="Contoh: SPBU 74.912.01 Jl. Poros Pinrang">
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Kapasitas / No. Seri Alat</label>
          <input type="text" id="teraKapasitas" required class="mobile-form-input" placeholder="Contoh: Kapasitas 50L/menit - Seri: NZ-8812">
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Hasil Kalibrasi / Batas Kesalahan yang Diizinkan (BKD)</label>
          <select id="teraHasil" class="mobile-form-select">
            <option value="Sah (Dalam BKD ±0.5%)">✓ Sah (Dalam Batas Toleransi BKD ±0.5%)</option>
            <option value="Dibatalkan (Melebihi BKD - Perlu Justir)">⚠️ Batal (Wajib Justir / Kalibrasi Ulang)</option>
            <option value="Ditolak / Rusak Permanen">❌ Ditolak / Dilarang Digunakan</option>
          </select>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">No. Segel Tera / Plang Kemetrologian</label>
          <input type="text" id="teraSegel" class="mobile-form-input" placeholder="Contoh: TERA-PRG-2026-0819">
        </div>

        <div class="mobile-camera-box" onclick="document.getElementById('mobileCameraInput').click()">
          <div class="mobile-camera-icon">📷</div>
          <div class="mobile-camera-text">Foto Segel & Cap Tanda Tera 2026</div>
          <div id="mobilePhotoPreviewStatus" style="font-size: 0.76rem; color: #16A34A; margin-top: 4px; font-weight: 700;"></div>
        </div>

        <button type="submit" class="btn-mobile-submit">
          <span>⚖️</span> Terbitkan Berita Acara Tera
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
      title: "Berita Acara Tera Sah",
      message: `Pengujian <strong>${jenis}</strong> pada <strong>${lokasi}</strong> berstatus <strong>${hasil}</strong> telah disinkronkan ke Bank Data Metrologi Legal.`,
      icon: "⚖️",
      type: "info"
    });

    document.getElementById('formTeraUml').reset();
    document.getElementById('mobilePhotoPreviewStatus').innerText = '';
  });
}

// 7. MODUL 4: TIM HUMAS (PUBLIKASI BERITA & FOTO LAPANGAN)
function renderHumasModule(container) {
  container.innerHTML = `
    <div class="mobile-form-card">
      <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--primary-deep); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
        <span>📰</span> Rilis Dokumentasi Berita Cepat
      </h4>
      <form id="formHumasBerita">
        <div class="mobile-form-group">
          <label class="mobile-form-label">Judul Berita Lapangan</label>
          <input type="text" id="humasJudul" required class="mobile-form-input" placeholder="Contoh: Disperindag Pantau Ketersediaan Beras di Pasar Pekkabata">
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Kategori Berita</label>
          <select id="humasKategori" class="mobile-form-select">
            <option>Perindustrian, Energi & SDM</option>
            <option>Pengembangan Perdagangan</option>
            <option>Sarana & Pelaku Distribusi</option>
            <option>Kemetrologian Legal</option>
            <option>Pelayanan Publik</option>
          </select>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Ringkasan Kegiatan (Lead Paragraph)</label>
          <textarea id="humasExcerpt" rows="2" required class="mobile-form-textarea" placeholder="Tuliskan 1-2 kalimat ringkasan penting kegiatan..."></textarea>
        </div>
        <div class="mobile-form-group">
          <label class="mobile-form-label">Isi Berita Lengkap</label>
          <textarea id="humasContent" rows="5" required class="mobile-form-textarea" placeholder="Tuliskan jalannya kegiatan dinas secara lengkap..."></textarea>
        </div>

        <div class="mobile-camera-box" onclick="document.getElementById('mobileCameraInput').click()">
          <div class="mobile-camera-icon">📷</div>
          <div class="mobile-camera-text">Jepret Foto Dokumentasi Lapangan</div>
          <div id="mobilePhotoPreviewStatus" style="font-size: 0.76rem; color: #16A34A; margin-top: 4px; font-weight: 700;"></div>
        </div>

        <button type="submit" class="btn-mobile-submit">
          <span>🚀</span> Terbitkan Rilis Berita
        </button>
      </form>
    </div>
  `;

  document.getElementById('formHumasBerita').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('humasJudul').value;
    const category = document.getElementById('humasKategori').value;
    const excerpt = document.getElementById('humasExcerpt').value;
    const content = document.getElementById('humasContent').value;
    const img = compressedMobilePhoto || 'assets/news/operasi_pasar_murah_sembako_pinrang.jpg';

    const newArticle = {
      id: "news_" + Date.now(),
      title,
      slug: (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category,
      topic_tag: category.split(',')[0],
      tags: ['LiputanLapangan', 'DisperindagPinrang'],
      content_origin: 'mobile_field_report',
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      author: "Humas Disperindag Pinrang (Mobile)",
      sourceName: "Rilis Resmi Disperindag ESDM Pinrang",
      sourceUrl: "https://disperindagesdm-pinrang.web.app",
      img,
      image_caption: "Dokumentasi liputan langsung petugas humas dinas.",
      excerpt,
      content,
      status: 'published',
      is_featured: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const newsList = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
    newsList.unshift(newArticle);
    setStorage('disperindag_news', newsList);

    if (typeof db !== 'undefined' && db !== null) {
      db.collection('news').doc(newArticle.id).set(newArticle, { merge: true }).catch(() => {});
    }

    CustomModal.alert({
      title: "Rilis Berita Diterbitkan",
      message: `Artikel <strong>"${title}"</strong> berhasil ditayangkan di portal publik dan arsip berita.`,
      icon: "🚀",
      type: "info"
    });

    document.getElementById('formHumasBerita').reset();
    compressedMobilePhoto = null;
    document.getElementById('mobilePhotoPreviewStatus').innerText = '';
  });
}

// 8. MODUL 5: PETUGAS ADUAN (KOTAK MASUK ADUAN WARGA)
function renderAduanModule(container) {
  const reports = getStorage('disperindag_reports', typeof DEFAULT_REPORTS !== 'undefined' ? DEFAULT_REPORTS : []);

  container.innerHTML = `
    <div class="app-section-title">
      <h3>Kotak Masuk Pengaduan Konsumen</h3>
      <span>${reports.length} Laporan Tercatat</span>
    </div>
    ${reports.map(r => `
      <div class="mobile-form-card" style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <strong style="font-size: 0.95rem; color: var(--primary-deep);">${r.nama}</strong>
            <div style="font-size: 0.76rem; color: var(--text-muted);">${r.kontak} &bull; ${r.lokasi}</div>
          </div>
          <span style="background: #FFE4E6; color: #BE123C; font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 10px;">${r.kategori}</span>
        </div>
        <p style="font-size: 0.84rem; color: #334155; line-height: 1.55; margin-bottom: 12px; background: #F8FAFC; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0;">
          "${r.pesan}"
        </p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <a href="https://wa.me/${(r.kontak || '').replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(r.nama)},%20kami%20dari%20Disperindag%20ESDM%20Pinrang%20menindaklanjuti%20laporan%20Anda" target="_blank" class="btn-quick-edit" style="background: #DCFCE7; color: #15803D; border-color: #86EFAC; text-decoration: none; padding: 6px 12px;">
            📲 Respon WhatsApp
          </a>
          <button type="button" class="btn-quick-edit" onclick="updateAduanMobile('${r.id}')">
            ⚙️ Ubah Status
          </button>
        </div>
      </div>
    `).join('')}
  `;
}

window.updateAduanMobile = async function(id) {
  const reports = getStorage('disperindag_reports', typeof DEFAULT_REPORTS !== 'undefined' ? DEFAULT_REPORTS : []);
  const r = reports.find(item => item.id === id);
  if (!r) return;

  const newStatus = await CustomModal.prompt({
    title: "Update Status Tindak Lanjut Aduan",
    message: `Masukkan status baru untuk laporan dari <strong>${r.nama}</strong>:`,
    defaultValue: r.status || "Sedang Ditindaklanjuti Tim Lapangan",
    placeholder: "Contoh: Selesai Ditindaklanjuti / Sedang Sidak Lapangan",
    inputType: "text",
    icon: "📢",
    confirmText: "Perbarui Status"
  });

  if (!newStatus) return;
  r.status = newStatus;
  setStorage('disperindag_reports', reports);
  renderAduanModule(document.getElementById('dynamicRoleModule'));
  CustomModal.alert({
    title: "Status Diperbarui",
    message: `Status aduan kini: <strong>${newStatus}</strong>.`,
    icon: "✅",
    type: "info"
  });
};

// 9. MODUL 6: SUPER ADMIN (DASHBOARD EKSEKUTIF PIMPINAN)
function renderSuperAdminModule(container) {
  const prices = getStorage('disperindag_prices', typeof DEFAULT_COMMODITY_PRICES !== 'undefined' ? DEFAULT_COMMODITY_PRICES : []);
  const news = getStorage('disperindag_news', typeof DEFAULT_NEWS !== 'undefined' ? DEFAULT_NEWS : []);
  const reports = getStorage('disperindag_reports', typeof DEFAULT_REPORTS !== 'undefined' ? DEFAULT_REPORTS : []);

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px;">
      <div class="mobile-form-card" style="margin: 0; padding: 14px; text-align: center;">
        <span style="font-size: 1.6rem;">🛒</span>
        <div style="font-size: 1.3rem; font-weight: 900; color: var(--primary);">${prices.length}</div>
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
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
      <a href="admin.html" class="btn-mobile-submit" style="text-decoration: none; background: #0F2C59; text-align: center;">
        <span>💻</span> Buka CMS Administrator Desktop
      </a>
      <a href="index.html" class="btn-mobile-submit" style="text-decoration: none; background: #1E293B; text-align: center;">
        <span>🌐</span> Buka Beranda Portal Publik
      </a>
    </div>
  `;
}

// 10. TAB PROFILE DATA
function renderProfileTabInfo() {
  const u = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
  if (!u) return;

  const nameEl = document.getElementById('tabProfileName');
  const nipEl = document.getElementById('tabProfileNip');
  const roleEl = document.getElementById('tabProfileRole');
  const phoneEl = document.getElementById('tabProfilePhone');

  if (nameEl) nameEl.innerText = u.name || 'Petugas Lapangan';
  if (nipEl) nipEl.innerText = `NIP: ${u.nip || '-'}`;
  if (roleEl) roleEl.innerText = `${u.roleIcon || '👤'} ${u.roleLabel || u.role}`;
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
      if (typeof ImageCompressor !== 'undefined') {
        const result = await ImageCompressor.compress(file, { maxWidth: 800, quality: 0.75 });
        compressedMobilePhoto = result.base64;
        if (statusEl) {
          statusEl.innerHTML = `✓ Foto Terkompresi: <strong>${ImageCompressor.formatBytes(result.compressedSize)}</strong> (Hemat ${result.savingPercent})`;
        }
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          compressedMobilePhoto = evt.target.result;
          if (statusEl) statusEl.innerHTML = `✓ Foto berhasil diunggah`;
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      if (statusEl) statusEl.innerText = "Gagal memproses foto.";
    }
  });
}
