/**
 * Disperindag ESDM Pinrang - GIS Interactive Map Engine
 * Peta Sebaran 681 Pangkalan LPG 3 Kg, 8 Agen Resmi, dan Rute Distribusi
 */

const PINRANG_KECAMATAN_COORDS = {
  "Watang Sawitto": { lat: -3.7885, lng: 119.6508, pangkalanCount: 122 },
  "Paleteang": { lat: -3.7712, lng: 119.6645, pangkalanCount: 77 },
  "Patampanua": { lat: -3.6651, lng: 119.6782, pangkalanCount: 77 },
  "Mattiro Bulu": { lat: -3.8421, lng: 119.6387, pangkalanCount: 63 },
  "Suppa": { lat: -3.9723, lng: 119.5934, pangkalanCount: 66 },
  "Duampanua": { lat: -3.5789, lng: 119.5641, pangkalanCount: 87 },
  "Mattiro Sompe": { lat: -3.8214, lng: 119.5423, pangkalanCount: 48 },
  "Lembang": { lat: -3.4412, lng: 119.5312, pangkalanCount: 41 },
  "Lanrisang": { lat: -3.8945, lng: 119.5876, pangkalanCount: 39 },
  "Cempa": { lat: -3.6934, lng: 119.5512, pangkalanCount: 29 },
  "Tiroang": { lat: -3.7654, lng: 119.7214, pangkalanCount: 26 },
  "Batulappa": { lat: -3.5321, lng: 119.7423, pangkalanCount: 6 }
};

const LPG_AGENT_LOCATIONS = {
  "AG-001": { name: "PT. GASIFA MULYA PERSADA", verified: false },
  "AG-002": { name: "PT. HAMISA SUKRAH MULYA", verified: false },
  "AG-003": { name: "PT. H. ABD RAHMAN HASYIM", verified: false },
  "AG-004": { name: "PT. NURCAHAYA ENERGI ABADI", verified: false },
  "AG-005": { name: "PT. WAHYU DWI KENCANA MANDIRI", verified: false },
  "AG-006": { name: "PT. NASMAN HAFID MANDIRI", verified: false },
  "AG-007": { name: "PT. H. AMIRUDDIN RAHMAN", verified: false },
  "AG-008": { name: "PT. KAKA MIGAS UTAMA", verified: false }
};

let lpgGisMapInstance = null;
let lpgGisLayers = {
  agents: null,
  districts: null,
  routes: null,
  verifiedPangkalan: null
};

function escapeLpgMapText(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.initLpgGisMap = function(containerId = 'adminLpgGisMapContainer') {
  const container = document.getElementById(containerId);
  if (!container || typeof L === 'undefined') return;

  if (lpgGisMapInstance) {
    lpgGisMapInstance.remove();
    lpgGisMapInstance = null;
  }

  // Inisialisasi Map terpusat di Kabupaten Pinrang
  lpgGisMapInstance = L.map(containerId, {
    center: [-3.7500, 119.6400],
    zoom: 10,
    zoomControl: true
  });

  // Base Layer OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Disperindag ESDM Pinrang'
  }).addTo(lpgGisMapInstance);

  // Inisialisasi Layer Groups
  lpgGisLayers.agents = L.layerGroup().addTo(lpgGisMapInstance);
  lpgGisLayers.districts = L.layerGroup().addTo(lpgGisMapInstance);
  lpgGisLayers.routes = L.layerGroup().addTo(lpgGisMapInstance);
  lpgGisLayers.verifiedPangkalan = L.layerGroup().addTo(lpgGisMapInstance);

  renderLpgGisMarkers();
};

window.renderLpgGisMarkers = function() {
  if (!lpgGisMapInstance) return;

  // Clear existing
  lpgGisLayers.agents.clearLayers();
  lpgGisLayers.districts.clearLayers();
  lpgGisLayers.routes.clearLayers();
  lpgGisLayers.verifiedPangkalan.clearLayers();

  const filterKec = document.getElementById('gisFilterKecamatan') ? document.getElementById('gisFilterKecamatan').value : '';
  const filterAgent = document.getElementById('gisFilterAgen') ? document.getElementById('gisFilterAgen').value : '';

  const pangkalanList = (typeof getLpgStore === 'function')
    ? getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, [])
    : ((typeof LPG_SEED_PANGKALAN !== 'undefined') ? LPG_SEED_PANGKALAN : []);

  // 1. Render Titik 8 Agen Resmi
  Object.keys(LPG_AGENT_LOCATIONS).forEach(agId => {
    if (filterAgent && filterAgent !== agId) return;

    const ag = LPG_AGENT_LOCATIONS[agId];
    // Jangan plot koordinat perkiraan sebagai lokasi resmi agen.
    if (!ag.verified || !Number.isFinite(ag.lat) || !Number.isFinite(ag.lng)) return;
    const agPangkalan = pangkalanList.filter(p => p.agentId === agId && !p.isDeleted);

    const agentIcon = L.divIcon({
      className: 'custom-gis-agent-icon',
      html: `<div style="background:#1E3A8A; color:#FFFFFF; border:2px solid #FACC15; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; box-shadow:0 3px 8px rgba(0,0,0,0.4);">🏢</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const marker = L.marker([ag.lat, ag.lng], { icon: agentIcon })
      .bindPopup(`
        <div style="font-size:0.84rem; line-height:1.5;">
          <strong style="color:#1E3A8A; font-size:0.92rem;">${escapeLpgMapText(ag.name)}</strong><br>
          <span style="font-size:0.75rem; color:#059669; font-weight:800;">KODE: ${agId}</span><br>
          📍 Wilayah: Kec. ${ag.kec}<br>
          🏪 Membina: <strong>${agPangkalan.length} Pangkalan</strong><br>
          <hr style="margin:6px 0; border:0; border-top:1px solid #E2E8F0;">
          <span style="font-size:0.72rem; color:#64748B;">Penyalur Resmi SK Ditjen Migas ESDM</span>
        </div>
      `);

    lpgGisLayers.agents.addLayer(marker);
  });

  // 2. Render Cluster / Titik Pusat 12 Kecamatan
  Object.keys(PINRANG_KECAMATAN_COORDS).forEach(kecName => {
    if (filterKec && filterKec !== kecName) return;

    const kecMeta = PINRANG_KECAMATAN_COORDS[kecName];
    const kecPangkalan = pangkalanList.filter(p => p.kecamatan === kecName && !p.isDeleted);
    const count = kecPangkalan.length;

    const districtIcon = L.divIcon({
      className: 'custom-gis-district-icon',
      html: `<div style="background:#059669; color:#FFFFFF; border:2px solid #FFFFFF; border-radius:20px; padding:4px 10px; font-weight:900; font-size:0.75rem; white-space:nowrap; box-shadow:0 3px 8px rgba(0,0,0,0.3); display:flex; align-items:center; gap:4px;">
        <span>📍 ${kecName}</span>
        <span style="background:#FACC15; color:#0F172A; padding:1px 6px; border-radius:10px; font-size:0.7rem;">${count}</span>
      </div>`,
      iconAnchor: [40, 15]
    });

    const marker = L.marker([kecMeta.lat, kecMeta.lng], { icon: districtIcon })
      .bindPopup(`
        <div style="font-size:0.84rem; line-height:1.5;">
          <strong style="color:#0F172A; font-size:0.95rem;">Kecamatan ${kecName}</strong><br>
          🔥 Total Pangkalan Aktif: <strong>${count} Pangkalan</strong><br>
          <hr style="margin:6px 0; border:0; border-top:1px solid #E2E8F0;">
          <button onclick="filterTableByKec('${kecName}')" style="background:#1D4ED8; color:#FFFFFF; border:none; padding:4px 10px; border-radius:4px; font-size:0.74rem; font-weight:800; cursor:pointer; width:100%;">
            Lihat Daftar Pangkalan (${count}) &rarr;
          </button>
        </div>
      `);

    lpgGisLayers.districts.addLayer(marker);

    // Garis Jalur Distribusi Agen ke Kecamatan (Jika agen dipilih)
    if (filterAgent && LPG_AGENT_LOCATIONS[filterAgent]?.verified) {
      const ag = LPG_AGENT_LOCATIONS[filterAgent];
      const hasDistribution = kecPangkalan.some(p => p.agentId === filterAgent);
      if (hasDistribution) {
        const line = L.polyline([[ag.lat, ag.lng], [kecMeta.lat, kecMeta.lng]], {
          color: '#1D4ED8',
          weight: 2.5,
          opacity: 0.7,
          dashArray: '6, 6'
        });
        lpgGisLayers.routes.addLayer(line);
      }
    }
  });

  // 3. Render Titik GPS Pangkalan yang Telah Terverifikasi Lapangan
  pangkalanList.forEach(p => {
    const latitude = Number(p.latitude);
    const longitude = Number(p.longitude);
    const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude)
      && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    const isGpsVerified = ['VERIFIED', 'VERIFIED_GPS', 'ADMIN_VERIFIED'].includes(p.verificationStatus);
    if (hasValidCoordinates && isGpsVerified && !p.isDeleted) {
      if (filterKec && p.kecamatan !== filterKec) return;
      if (filterAgent && p.agentId !== filterAgent) return;

      const pklIcon = L.divIcon({
        className: 'custom-gis-pkl-icon',
        html: `<div style="background:#D97706; color:#FFFFFF; border:1px solid #FFFFFF; border-radius:50%; width:18px; height:18px; display:flex; align-items:center; justify-content:center; font-size:0.65rem; box-shadow:0 2px 4px rgba(0,0,0,0.3);">🟢</div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      const pMarker = L.marker([latitude, longitude], { icon: pklIcon })
        .bindPopup(`
          <div style="font-size:0.82rem; line-height:1.45;">
            <strong style="color:#0F2C59;">${escapeLpgMapText(p.name)}</strong><br>
            <span style="font-size:0.72rem; color:#059669; font-weight:800;">✓ TERVERIFIKASI GPS</span><br>
            🏢 Agen: ${escapeLpgMapText(p.agentName || p.agentId)}<br>
            📍 Desa: ${escapeLpgMapText(p.desaKelurahan)}, Kec. ${escapeLpgMapText(p.kecamatan)}<br>
            📞 Kontak: ${escapeLpgMapText(p.phone || '-')}<br>
            📍 Titik Koordinat: <code>${latitude.toFixed(5)}, ${longitude.toFixed(5)}</code>
          </div>
        `);

      lpgGisLayers.verifiedPangkalan.addLayer(pMarker);
    }
  });
};

window.filterTableByKec = function(kecName) {
  const tabSelect = document.getElementById('adminLpgFilterKecamatan');
  if (tabSelect) {
    tabSelect.value = kecName;
    if (typeof switchAdminLpgSubView === 'function') {
      switchAdminLpgSubView('pangkalan');
    }
    if (typeof renderAdminLpgPangkalanTable === 'function') {
      renderAdminLpgPangkalanTable();
    }
  }
};
