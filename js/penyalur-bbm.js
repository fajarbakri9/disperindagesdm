// ==============================================================================
// CONTROLLER: DIREKTORI PENYALUR BBM KABUPATEN PINRANG (FRONTEND)
// ==============================================================================

let bbmMap = null;
let bbmMarkerLayers = null;
let bbmLayerControl = null;
let currentBbmList = [];

document.addEventListener('DOMContentLoaded', () => {
  initBbmDirectory();
  initBbmEventListeners();
  
  // Firestore menjadi master kanonis; perubahan lokasi dari CMS langsung
  // memperbarui daftar dan marker tanpa memuat ulang halaman.
  if (typeof BbmEngine !== 'undefined') BbmEngine.initRealtimeSync(items => {
    currentBbmList = items;
    renderBbmDirectory();
  });
});

function initBbmDirectory() {
  currentBbmList = BbmEngine.getAll();
  initBbmMap();
  renderBbmDirectory();
}

function initBbmEventListeners() {
  const searchInput = document.getElementById('bbmSearchInput');
  const katFilter = document.getElementById('bbmKategoriFilter');
  const kecFilter = document.getElementById('bbmKecamatanFilter');
  const prodFilter = document.getElementById('bbmProdukFilter');

  if (searchInput) searchInput.addEventListener('input', () => filterBbmList());
  if (katFilter) katFilter.addEventListener('change', () => filterBbmList());
  if (kecFilter) kecFilter.addEventListener('change', () => filterBbmList());
  if (prodFilter) prodFilter.addEventListener('change', () => filterBbmList());
}

function initBbmMap() {
  const mapElem = document.getElementById('bbmGisMap');
  if (!mapElem) return;

  // Center Kab. Pinrang (-3.7915, 119.6480)
  bbmMap = L.map('bbmGisMap', {
    center: [-3.7650, 119.6450],
    zoom: 10,
    scrollWheelZoom: false
  });

  bbmMap.createPane('bbmBoundaryPane');
  bbmMap.getPane('bbmBoundaryPane').style.zIndex = 350;
  bbmMap.getPane('bbmBoundaryPane').style.pointerEvents = 'none';
  bbmMap.createPane('bbmVillagePane');
  bbmMap.getPane('bbmVillagePane').style.zIndex = 360;
  bbmMap.getPane('bbmVillagePane').style.pointerEvents = 'none';
  bbmMap.createPane('bbmDataPane');
  bbmMap.getPane('bbmDataPane').style.zIndex = 650;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Disperindag ESDM Pinrang'
  }).addTo(bbmMap);

  bbmMarkerLayers = {};
  ['spbu_reguler', 'spbu_kompak', 'spbun', 'pertashop'].forEach(key => { bbmMarkerLayers[key] = L.layerGroup().addTo(bbmMap); });
  const meta = BbmEngine.CATEGORY_META;
  bbmLayerControl = L.control.layers(null, {
    [`${meta.spbu_reguler.symbol} ${meta.spbu_reguler.label} (<b data-bbm-map-count="spbu_reguler">0</b>)`]: bbmMarkerLayers.spbu_reguler,
    [`${meta.spbu_kompak.symbol} ${meta.spbu_kompak.label} (<b data-bbm-map-count="spbu_kompak">0</b>)`]: bbmMarkerLayers.spbu_kompak,
    [`${meta.spbun.symbol} ${meta.spbun.label} (<b data-bbm-map-count="spbun">0</b>)`]: bbmMarkerLayers.spbun,
    [`${meta.pertashop.symbol} ${meta.pertashop.label} (<b data-bbm-map-count="pertashop">0</b>)`]: bbmMarkerLayers.pertashop
  }, { collapsed: false, position: 'topright' }).addTo(bbmMap);
  if (window.PinrangAdministrativeOverlay) {
    PinrangAdministrativeOverlay.addTo(bbmMap, { collapsed: false, villageMinZoom: 12, districtPane: 'bbmBoundaryPane', villagePane: 'bbmVillagePane' })
      .catch(error => console.warn('[Peta BBM] Overlay administrasi:', error.message));
  }
}

function renderBbmDirectory() {
  const stats = BbmEngine.getStats(currentBbmList);
  updateStatCards(stats);
  renderBbmCards(currentBbmList);
  renderBbmMapMarkers(currentBbmList);
}

function updateStatCards(stats) {
  const elTotal = document.getElementById('statTotalBbm');
  const elSpbu = document.getElementById('statSpbuReguler');
  const elApms = document.getElementById('statSpbuKompak');
  const elPertashop = document.getElementById('statPertashop');
  const elSpbun = document.getElementById('statSpbun');
  const elCount = document.getElementById('bbmShowingCount');

  if (elTotal) elTotal.innerText = stats.total;
  if (elSpbu) elSpbu.innerText = stats.spbu_reguler;
  if (elApms) elApms.innerText = stats.spbu_kompak;
  if (elPertashop) elPertashop.innerText = stats.pertashop;
  if (elSpbun) elSpbun.innerText = stats.spbun;
  if (elCount) elCount.innerText = currentBbmList.length;
  document.querySelectorAll('[data-bbm-map-count]').forEach(node => { node.textContent = stats[node.dataset.bbmMapCount] || 0; });
}

function filterBbmList() {
  const searchVal = document.getElementById('bbmSearchInput')?.value || '';
  const katVal = document.getElementById('bbmKategoriFilter')?.value || 'all';
  const kecVal = document.getElementById('bbmKecamatanFilter')?.value || 'all';
  const prodVal = document.getElementById('bbmProdukFilter')?.value || 'all';

  currentBbmList = BbmEngine.filter({
    search: searchVal,
    kategori: katVal,
    kecamatan: kecVal,
    produk: prodVal
  });

  renderBbmDirectory();
}

window.resetBbmFilters = function() {
  const searchInput = document.getElementById('bbmSearchInput');
  const katFilter = document.getElementById('bbmKategoriFilter');
  const kecFilter = document.getElementById('bbmKecamatanFilter');
  const prodFilter = document.getElementById('bbmProdukFilter');

  if (searchInput) searchInput.value = '';
  if (katFilter) katFilter.value = 'all';
  if (kecFilter) kecFilter.value = 'all';
  if (prodFilter) prodFilter.value = 'all';

  currentBbmList = BbmEngine.getAll();
  renderBbmDirectory();
};


function getMediaBannerHtml(item) {
  const defaultSvg = item.kategori_code === 'pertashop' ? 'assets/brand/pertashop_default.svg' : (item.kategori_code === 'spbu_kompak' ? 'assets/brand/spbu_kompak_default.svg' : (item.kategori_code === 'spbun' ? 'assets/brand/spbun_default.svg' : 'assets/brand/spbu_reguler_default.svg'));

  if (item.foto && !item.foto.includes('default.') && !item.foto.includes('cover_arsip_berita') && (item.foto.startsWith('http') || item.foto.startsWith('data:image') || item.foto.startsWith('assets/'))) {
    return `<img src="${item.foto}" alt="${item.nama}" class="bbm-custom-thumb" onerror="this.onerror=null; this.src='${defaultSvg}';">`;
  }
  return getDefaultSvgCard(item);
}

function getDefaultSvgCard(item) {
  const isPertashop = (item.kategori || '').includes('PERTASHOP') || (item.jenis_resmi || '').includes('PERTASHOP') || (item.kode || '').startsWith('7P');
  const isApms = (item.kategori || '').includes('APMS') || (item.jenis_resmi || '').includes('APMS') || (item.kode || '').startsWith('76');
  const isSpbun = (item.kategori || '').includes('SPBUN') || (item.jenis_resmi || '').includes('SPBUN') || (item.kode || '').startsWith('78');

  let bgGrad = 'linear-gradient(135deg, #7F1D1D 0%, #B91C1C 100%)';
  let badgeColor = '#EF4444';
  let subtitle = 'KAPASITAS LAYANAN BESAR';
  let typeTitle = 'SPBU REGULER';
  let iconEmoji = '⛽';

  if (isPertashop) {
    bgGrad = 'linear-gradient(135deg, #14532D 0%, #16A34A 100%)';
    badgeColor = '#22C55E';
    subtitle = 'DISTRIBUSI ENERGI DESA';
    typeTitle = 'PERTASHOP RESMI';
    iconEmoji = '🟢';
  } else if (isApms) {
    bgGrad = 'linear-gradient(135deg, #0C4A6E 0%, #0284C7 100%)';
    badgeColor = '#38BDF8';
    subtitle = 'PESISIR & PERTANIAN';
    typeTitle = 'SPBU KOMPAK / APMS';
    iconEmoji = '🔵';
  } else if (isSpbun) {
    bgGrad = 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)';
    badgeColor = '#A78BFA';
    subtitle = 'SOLAR SUBSIDI NELAYAN';
    typeTitle = 'SPBUN NELAYAN';
    iconEmoji = '🟣';
  }

  return `
    <div style="width: 100%; height: 100%; background: ${bgGrad}; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: relative; overflow: hidden;">
      <div style="position: absolute; right: -20px; top: -20px; width: 140px; height: 140px; border-radius: 50%; background: rgba(255,255,255,0.08); pointer-events: none;"></div>
      <div style="position: absolute; left: 20px; bottom: -30px; width: 100px; height: 100px; border-radius: 50%; background: rgba(0,0,0,0.12); pointer-events: none;"></div>
      
      <div style="position: relative; z-index: 2;">
        <div style="font-size: 0.68rem; font-weight: 900; color: #FDE047; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 2px;">
          ${subtitle}
        </div>
        <div style="font-size: 1.15rem; font-weight: 900; color: #FFFFFF; letter-spacing: 0.02em; line-height: 1.2;">
          ${typeTitle}
        </div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.76rem; color: #E2E8F0; margin-top: 4px; font-weight: 700;">
          📍 KEC. ${item.kecamatan.toUpperCase()}
        </div>
      </div>

      <div style="position: relative; z-index: 2; width: 56px; height: 56px; background: rgba(255,255,255,0.18); backdrop-filter: blur(8px); border-radius: 14px; border: 1.5px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; box-shadow: 0 4px 14px rgba(0,0,0,0.2);">
        ${iconEmoji}
      </div>
    </div>
  `;
}

function renderBbmCards(list) {
  const container = document.getElementById('bbmCardsContainer');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; background: #FFFFFF; border-radius: 12px; padding: 40px; text-align: center; border: 1px solid #E2E8F0;">
        <div style="font-size: 2.5rem; margin-bottom: 8px;">⛽</div>
        <h4 style="font-size: 1.1rem; color: #0F172A; margin: 0 0 6px;">Tidak ada Penyalur BBM yang cocok</h4>
        <p style="font-size: 0.84rem; color: #64748B; margin: 0 0 16px;">Silakan sesuaikan kriteria pencarian atau reset filter kecamatan / kategori.</p>
        <button onclick="resetBbmFilters()" class="btn-primary" style="padding: 8px 18px; font-size: 0.84rem;">Reset Filter</button>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const mediaHtml = getMediaBannerHtml(item);
    const productsHtml = (item.produk || []).map(p => {
      let cls = '';
      if (p.toLowerCase().includes('solar')) cls = 'solar';
      else if (p.toLowerCase().includes('pertalite')) cls = 'pertalite';
      else if (p.toLowerCase().includes('pertamax')) cls = 'pertamax';
      else if (p.toLowerCase().includes('dexlite')) cls = 'dexlite';
      return `<span class="bbm-chip ${cls}">${p}</span>`;
    }).join('');

    const mapsUrl = item.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.nama + ' ' + (item.alamat_terkini || 'Pinrang'))}`;
    const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${Number(item.lat)},${Number(item.lng)}`;

    return `
      <div class="bbm-outlet-card" id="card_${item.id}">
        <div class="bbm-card-media">
          ${mediaHtml}
          <span class="bbm-badge-type" style="background: ${item.badge_color || '#0F2C59'};">
            ${item.kategori_badge || item.jenis_resmi}
          </span>
          <span class="bbm-badge-status">
            ● ${item.status_operasi || 'Beroperasi'}
          </span>
        </div>
        <div class="bbm-card-body">
          <span class="bbm-card-code">${item.kode}</span>
          <h4 class="bbm-card-title">${item.nama}</h4>
          <div class="bbm-card-company">🏢 ${item.badan_usaha || 'Penyalur Resmi'}</div>
          <div class="bbm-card-address">
            📍 ${item.alamat_terkini || item.alamat_resmi || 'Kabupaten Pinrang'}
          </div>
          <div class="bbm-products-chips">
            ${productsHtml}
          </div>
          <div style="font-size: 0.76rem; color: #64748B; margin-bottom: 12px;">
            🕒 <strong>Jam Operasi:</strong> ${item.jam_operasi || '06.00 - 22.00 WITA'}
          </div>
          <div class="bbm-card-footer">
            <button onclick="openBbmDetailModal('${item.id}')" class="btn-bbm-detail">
              <span>🔍</span> Detail Lengkap
            </button>
            <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn-bbm-route" title="Buka Rute di Google Maps">
              <span>🗺️</span> Rute
            </a>
            <a href="${streetViewUrl}" target="_blank" rel="noopener noreferrer" class="btn-bbm-route" title="Lihat panorama Street View apabila tersedia">
              <span>👁️</span> Street View
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderBbmMapMarkers(list) {
  if (!bbmMap || !bbmMarkerLayers) return;

  Object.values(bbmMarkerLayers).forEach(layer => layer.clearLayers());

  const bounds = [];

  list.forEach(item => {
    if (!item.lat || !item.lng) return;

    const latLng = [item.lat, item.lng];
    bounds.push(latLng);

    // Kustom Pin Icon
    const category = BbmEngine.normalizeCategory(item);
    const categoryMeta = BbmEngine.CATEGORY_META[category];
    const pinColor = categoryMeta.color;
    const iconHtml = `
      <div style="
        background: ${pinColor};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid #FFFFFF;
        box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 13px; color: #FFFFFF;">${categoryMeta.symbol}</span>
      </div>
    `;

    const customIcon = L.divIcon({
      className: 'custom-bbm-pin',
      html: iconHtml,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -28]
    });

    const popupContent = `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.84rem; min-width: 200px;">
        <span style="font-size: 0.70rem; font-weight: 800; background: #EFF6FF; color: #1E40AF; padding: 2px 6px; border-radius: 4px;">${item.kode}</span>
        <h4 style="margin: 6px 0 3px; font-size: 0.95rem; font-weight: 800; color: #0F172A;">${item.nama}</h4>
        <div style="font-size: 0.75rem; color: #64748B; margin-bottom: 6px;">🏢 ${item.badan_usaha}</div>
        <div style="font-size: 0.76rem; color: #334155; margin-bottom: 8px;">📍 ${item.desa ? item.desa + ', ' : ''}Kec. ${item.kecamatan}</div>
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          <button onclick="openBbmDetailModal('${item.id}')" style="background: #0F2C59; color: #FFF; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Detail</button>
          <a href="${item.google_maps_url || '#'}" target="_blank" style="background: #EFF6FF; color: #1E40AF; border: 1px solid #BFDBFE; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-decoration: none;">Rute</a>
          <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latLng[0]},${latLng[1]}" target="_blank" rel="noopener noreferrer" style="background:#F5F3FF;color:#6D28D9;border:1px solid #DDD6FE;padding:4px 8px;border-radius:4px;font-size:.75rem;font-weight:700;text-decoration:none;">Street View</a>
        </div>
      </div>
    `;

    const marker = L.marker(latLng, { pane: 'bbmDataPane', icon: customIcon, zIndexOffset: 1000, riseOnHover: true }).bindPopup(popupContent);
    bbmMarkerLayers[category].addLayer(marker);
  });

  if (bounds.length > 0) {
    bbmMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }
}

window.openBbmDetailModal = function(id) {
  const item = BbmEngine.getById(id);
  if (!item) return;

  const prods = (item.produk || []).map(p => `<span class="bbm-chip" style="font-size:0.75rem; padding: 3px 10px;">✓ ${p}</span>`).join(' ');
  const mapsUrl = item.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.nama + ' ' + (item.alamat_terkini || 'Pinrang'))}`;
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${Number(item.lat)},${Number(item.lng)}`;
  const defaultSvg = item.kategori_code === 'pertashop' ? 'assets/brand/pertashop_default.svg' : (item.kategori_code === 'spbu_kompak' ? 'assets/brand/spbu_kompak_default.svg' : (item.kategori_code === 'spbun' ? 'assets/brand/spbun_default.svg' : 'assets/brand/spbu_reguler_default.svg'));
  const fotoSrc = item.foto || defaultSvg;

  const detailHtml = `
    <div style="max-height: 75vh; overflow-y: auto; padding-right: 4px;">
      <div onclick="if(typeof openBbmPhotoLightbox==='function') openBbmPhotoLightbox('${fotoSrc}', '${item.nama.replace(/'/g, "\\'")}')" style="position: relative; border-radius: 10px; overflow: hidden; height: 220px; background: #030D1B; margin-bottom: 16px; cursor: pointer;" title="Klik untuk memperbesar foto">
        <img src="${fotoSrc}" style="width: 100%; height: 100%; object-fit: cover;" alt="${item.nama}" onerror="this.onerror=null; this.src='${defaultSvg}';">
        <span style="position: absolute; top: 12px; left: 12px; background: ${item.badge_color || '#0F2C59'}; color: #FFF; font-weight: 800; font-size: 0.76rem; padding: 5px 12px; border-radius: 6px;">
          ${item.kategori_badge || item.jenis_resmi}
        </span>
        <span style="position: absolute; top: 12px; right: 12px; background: #059669; color: #FFF; font-weight: 800; font-size: 0.74rem; padding: 4px 12px; border-radius: 999px;">
          ● ${item.status_operasi || 'Beroperasi'}
        </span>
        <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: #FFF; padding: 3px 8px; border-radius: 4px; font-size: 0.70rem;">🔍 Klik untuk Zoom</div>
      </div>

      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px;">
        <span style="font-family: monospace; font-weight: 800; background: #EFF6FF; color: #1E40AF; padding: 3px 8px; border-radius: 4px; font-size: 0.84rem; border: 1px solid #BFDBFE;">${item.kode}</span>
        <span style="font-size: 0.78rem; color: #059669; font-weight: 800; background: #ECFDF5; padding: 3px 8px; border-radius: 4px; border: 1px solid #A7F3D0;">Sinkronisasi: ${item.status_sinkronisasi || 'Tinggi'}</span>
      </div>

      <h3 style="font-size: 1.3rem; font-weight: 800; color: #0F172A; margin: 0 0 4px;">${item.nama}</h3>
      <div style="font-size: 0.88rem; font-weight: 700; color: #475569; margin-bottom: 16px;">🏢 ${item.badan_usaha}</div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; background: #F8FAFC; padding: 14px; border-radius: 8px; border: 1px solid #E2E8F0;">
        <div>
          <div style="font-size: 0.72rem; font-weight: 800; color: #64748B; text-transform: uppercase;">Kecamatan &amp; Wilayah</div>
          <div style="font-size: 0.86rem; font-weight: 700; color: #0F172A; margin-top: 2px;">Kec. ${item.kecamatan} (${item.desa || '-'})</div>
        </div>
        <div>
          <div style="font-size: 0.72rem; font-weight: 800; color: #64748B; text-transform: uppercase;">Jam Operasional</div>
          <div style="font-size: 0.86rem; font-weight: 700; color: #0F172A; margin-top: 2px;">🕒 ${item.jam_operasi || '24 Jam'}</div>
        </div>
        <div style="grid-column: 1 / -1;">
          <div style="font-size: 0.72rem; font-weight: 800; color: #64748B; text-transform: uppercase;">Alamat Terkini / Google Places</div>
          <div style="font-size: 0.84rem; color: #1E293B; margin-top: 2px;">📍 ${item.alamat_terkini || item.alamat_resmi}</div>
        </div>
        <div style="grid-column: 1 / -1;">
          <div style="font-size: 0.72rem; font-weight: 800; color: #64748B; text-transform: uppercase;">Status Koordinat</div>
          <div style="font-size: 0.82rem; color: #475569; margin-top: 2px;">✓ ${item.coordinate_status || 'Koordinat sumber aktif'} · ${Number(item.lat).toFixed(6)}, ${Number(item.lng).toFixed(6)}</div>
        </div>
        <div style="grid-column: 1 / -1;">
          <div style="font-size: 0.72rem; font-weight: 800; color: #64748B; text-transform: uppercase;">Alamat Resmi Ditjen Migas</div>
          <div style="font-size: 0.82rem; color: #475569; margin-top: 2px; font-family: monospace;">🏛️ ${item.alamat_resmi || '-'}</div>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 0.78rem; font-weight: 800; color: #0F172A; margin-bottom: 6px;">⛽ Produk BBM yang Tersedia:</div>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${prods}
        </div>
      </div>

      ${item.catatan ? `
        <div style="background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; padding: 10px 14px; font-size: 0.78rem; color: #92400E; margin-bottom: 16px;">
          <strong>ℹ️ Catatan Verifikasi ESDM:</strong> ${item.catatan}
        </div>
      ` : ''}

      <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px;">
        <a href="${streetViewUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding: 10px 18px; font-size: 0.84rem; text-decoration: none; background:#6D28D9;">
          <span>👁️</span> Lihat Street View
        </a>
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding: 10px 18px; font-size: 0.84rem; text-decoration: none;">
          <span>🗺️</span> Buka Rute di Google Maps
        </a>
      </div>
    </div>
  `;

  if (typeof CustomModal !== 'undefined') {
    CustomModal.alert({
      title: `Detail Penyalur BBM: ${item.nama}`,
      message: detailHtml,
      icon: "⛽",
      confirmText: "Tutup"
    });
  }
};
