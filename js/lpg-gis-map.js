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
let lpgGisHomeBounds = null;
let lpgGisLayers = {
  agents: null,
  districts: null,
  routes: null,
  verifiedPangkalan: null,
  kecamatanBoundary: null,
  desaBoundary: null
};
const LPG_BOUNDARY_BASE = 'geo/pinrang/2026-06';
const LPG_DISTRICT_COLORS = ['#2563EB','#059669','#7C3AED','#D97706','#0891B2','#DC2626','#4F46E5','#0D9488','#9333EA','#EA580C','#0284C7','#65A30D'];

function escapeLpgMapText(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function ensureLpgMapStyles() {
  if (document.getElementById('lpgMapRuntimeStyles')) return;
  const style = document.createElement('style');
  style.id = 'lpgMapRuntimeStyles';
  style.textContent = `
    .custom-gis-agent-icon,.custom-gis-district-icon,.custom-gis-pkl-icon{background:transparent!important;border:0!important}
    .lpg-agent-pin{position:relative;width:34px;height:42px;filter:drop-shadow(0 5px 5px rgba(15,23,42,.32))}
    .lpg-agent-pin__head{display:grid;place-items:center;width:34px;height:34px;border:3px solid #FACC15;border-radius:50% 50% 50% 8px;background:#0F2C59;color:#FFF;font:900 12px/1 sans-serif;transform:rotate(-45deg)}
    .lpg-agent-pin__head span{transform:rotate(45deg)}
    .lpg-district-pin{display:grid;place-items:center;width:34px;height:34px;border:3px solid #FFF;border-radius:50%;background:#334155;color:#FFF;font:900 11px/1 sans-serif;box-shadow:0 4px 10px rgba(15,23,42,.32)}
    .lpg-pangkalan-pin{width:17px;height:17px;border:3px solid #FFF;border-radius:50%;background:#059669;box-shadow:0 3px 7px rgba(5,150,105,.45)}
    .lpg-map-tooltip{padding:6px 9px!important;border:0!important;border-radius:7px!important;background:#0F172A!important;color:#FFF!important;font:800 11px/1.25 sans-serif!important;box-shadow:0 4px 12px rgba(15,23,42,.28)!important}
    .lpg-map-tooltip:before{display:none!important}
    .lpg-region-label{padding:4px 7px!important;border:1px solid rgba(255,255,255,.9)!important;border-radius:6px!important;background:rgba(15,44,89,.88)!important;color:#FFF!important;font:900 10px/1.15 sans-serif!important;text-align:center!important;box-shadow:0 3px 9px rgba(15,23,42,.2)!important}
    .lpg-region-label:before{display:none!important}
    .lpg-region-label span{display:block;margin-top:2px;color:#FDE047;font-size:9px}
    .leaflet-popup-content-wrapper{border-radius:11px!important;box-shadow:0 12px 30px rgba(15,23,42,.2)!important}
  `;
  document.head.appendChild(style);
}

window.initLpgGisMap = function(containerId = 'adminLpgGisMapContainer') {
  const container = document.getElementById(containerId);
  if (!container || typeof L === 'undefined') return;
  ensureLpgMapStyles();

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
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Batas: BIG Juni 2026'
  }).addTo(lpgGisMapInstance);

  // Inisialisasi Layer Groups
  lpgGisLayers.agents = L.layerGroup().addTo(lpgGisMapInstance);
  lpgGisLayers.districts = L.layerGroup().addTo(lpgGisMapInstance);
  lpgGisLayers.routes = L.layerGroup().addTo(lpgGisMapInstance);
  lpgGisLayers.verifiedPangkalan = L.layerGroup().addTo(lpgGisMapInstance);

  populateLpgGisFilters();
  renderLpgGisMarkers();
  loadLpgAdministrativeBoundaries();
  setTimeout(() => { lpgGisMapInstance?.invalidateSize({ pan: false }); homeLpgGisMap(); }, 100);
};

async function loadLpgAdministrativeBoundaries() {
  if (!lpgGisMapInstance) return;
  try {
    const [districts, villages] = await Promise.all([
      fetch(`${LPG_BOUNDARY_BASE}/kecamatan.geojson`).then(r => { if (!r.ok) throw new Error('Batas kecamatan tidak tersedia'); return r.json(); }),
      fetch(`${LPG_BOUNDARY_BASE}/desa-kelurahan.geojson`).then(r => { if (!r.ok) throw new Error('Batas desa/kelurahan tidak tersedia'); return r.json(); })
    ]);
    const pangkalan = getLpgMapData().filter(item => !item.isDeleted);
    const districtCounts = pangkalan.reduce((acc, item) => { acc[item.kecamatan] = (acc[item.kecamatan] || 0) + 1; return acc; }, {});
    lpgGisLayers.kecamatanBoundary = L.geoJSON(districts, {
      style: feature => {
        const name = feature.properties.WADMKC || feature.properties.NAMOBJ;
        const index = Math.max(0, Object.keys(PINRANG_KECAMATAN_COORDS).indexOf(name));
        return { color: LPG_DISTRICT_COLORS[index % LPG_DISTRICT_COLORS.length], weight: 2.2, opacity: .95, fillColor: LPG_DISTRICT_COLORS[index % LPG_DISTRICT_COLORS.length], fillOpacity: .13 };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.WADMKC || feature.properties.NAMOBJ;
        layer.bindTooltip(`${escapeLpgMapText(name)}<span>${districtCounts[name] || 0} pangkalan</span>`, { permanent: true, direction: 'center', className: 'lpg-region-label' });
        layer.on({ mouseover: e => e.target.setStyle({ weight: 3.5, fillOpacity: .24 }), mouseout: e => lpgGisLayers.kecamatanBoundary.resetStyle(e.target), click: e => lpgGisMapInstance.fitBounds(e.target.getBounds(), { padding: [35,35] }) });
      }
    }).addTo(lpgGisMapInstance);
    lpgGisLayers.desaBoundary = L.geoJSON(villages, {
      style: { color:'#475569', weight:.8, opacity:.65, dashArray:'3 3', fillColor:'#94A3B8', fillOpacity:.035 },
      onEachFeature: (feature, layer) => {
        const village = feature.properties.WADMKD || feature.properties.NAMOBJ;
        const district = feature.properties.WADMKC || '-';
        layer.bindTooltip(`${escapeLpgMapText(village)} • Kec. ${escapeLpgMapText(district)}`, { sticky:true, className:'lpg-map-tooltip' });
        layer.on({ mouseover:e => e.target.setStyle({ weight:1.7, color:'#F59E0B', fillOpacity:.12 }), mouseout:e => lpgGisLayers.desaBoundary.resetStyle(e.target) });
      }
    });
    lpgGisMapInstance.getPanes().overlayPane.style.zIndex = 400;
    L.control.layers(null, { 'Batas kecamatan': lpgGisLayers.kecamatanBoundary, 'Batas desa/kelurahan': lpgGisLayers.desaBoundary }, { collapsed:true, position:'topright' }).addTo(lpgGisMapInstance);
    const syncVillageLayer = () => {
      if (lpgGisMapInstance.getZoom() >= 12) {
        if (!lpgGisMapInstance.hasLayer(lpgGisLayers.desaBoundary)) lpgGisLayers.desaBoundary.addTo(lpgGisMapInstance);
      } else if (lpgGisMapInstance.hasLayer(lpgGisLayers.desaBoundary)) lpgGisMapInstance.removeLayer(lpgGisLayers.desaBoundary);
    };
    lpgGisMapInstance.on('zoomend', syncVillageLayer);
    syncVillageLayer();
    lpgGisHomeBounds = lpgGisLayers.kecamatanBoundary.getBounds();
    lpgGisLayers.districts.clearLayers();
    homeLpgGisMap();
  } catch (error) {
    console.warn('Overlay batas administrasi BIG tidak dapat dimuat:', error);
  }
}

function getLpgMapData() {
  return (typeof getLpgStore === 'function')
    ? getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, [])
    : ((typeof LPG_SEED_PANGKALAN !== 'undefined') ? LPG_SEED_PANGKALAN : []);
}

function populateLpgGisFilters() {
  const items = getLpgMapData().filter(item => !item.isDeleted);
  const districtSelect = document.getElementById('gisFilterKecamatan');
  const agentSelect = document.getElementById('gisFilterAgen');
  if (districtSelect && districtSelect.options.length <= 1) {
    [...new Set(items.map(item => item.kecamatan).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'id')).forEach(name => {
      const option = document.createElement('option'); option.value = name; option.textContent = name; districtSelect.appendChild(option);
    });
  }
  if (agentSelect && agentSelect.options.length <= 1) {
    const agents = (typeof getLpgStore === 'function') ? getLpgStore(LPG_STORAGE_KEYS.AGENTS, []) : [];
    agents.filter(agent => agent.status === 'ACTIVE').forEach(agent => {
      const option = document.createElement('option'); option.value = agent.id; option.textContent = `${agent.name} (${agent.id})`; agentSelect.appendChild(option);
    });
  }
}

window.renderLpgGisMarkers = function() {
  if (!lpgGisMapInstance) return;

  // Clear existing
  lpgGisLayers.agents.clearLayers();
  lpgGisLayers.districts.clearLayers();
  lpgGisLayers.routes.clearLayers();
  lpgGisLayers.verifiedPangkalan.clearLayers();

  const filterKec = document.getElementById('gisFilterKecamatan') ? document.getElementById('gisFilterKecamatan').value : '';
  const filterAgent = document.getElementById('gisFilterAgen') ? document.getElementById('gisFilterAgen').value : '';
  const filterStatus = document.getElementById('gisFilterStatus')?.value || '';
  const search = (document.getElementById('gisSearch')?.value || '').trim().toLocaleLowerCase('id');

  const pangkalanList = getLpgMapData();
  const visibleBounds = [];
  let gpsCount = 0;
  let awaitingGpsCount = 0;
  let visibleAgentCount = 0;
  const matchesFilters = p => {
    const isGps = p.gpsVerified === true || p.locationVerification?.status === 'VERIFIED';
    const haystack = [p.id,p.name,p.address,p.desaKelurahan,p.kecamatan,p.agentName,p.agentId].join(' ').toLocaleLowerCase('id');
    return !p.isDeleted && (!filterKec || p.kecamatan === filterKec) && (!filterAgent || p.agentId === filterAgent)
      && (!filterStatus || (filterStatus === 'GPS' ? isGps : !isGps)) && (!search || haystack.includes(search));
  };
  const matchedPangkalan = pangkalanList.filter(matchesFilters);
  awaitingGpsCount = matchedPangkalan.filter(p => !(p.gpsVerified === true || p.locationVerification?.status === 'VERIFIED')).length;

  // 1. Render Titik 8 Agen Resmi
  Object.keys(LPG_AGENT_LOCATIONS).forEach(agId => {
    if (filterAgent && filterAgent !== agId) return;

    const ag = LPG_AGENT_LOCATIONS[agId];
    // Jangan plot koordinat perkiraan sebagai lokasi resmi agen.
    if (!ag.verified || !Number.isFinite(ag.lat) || !Number.isFinite(ag.lng)) return;
    const agPangkalan = pangkalanList.filter(p => p.agentId === agId && !p.isDeleted);

    const agentIcon = L.divIcon({
      className: 'custom-gis-agent-icon',
      html: '<div class="lpg-agent-pin"><div class="lpg-agent-pin__head"><span>A</span></div></div>',
      iconSize: [34, 42],
      iconAnchor: [17, 40],
      popupAnchor: [0, -36]
    });

    const marker = L.marker([ag.lat, ag.lng], { icon: agentIcon })
      .bindTooltip(`${escapeLpgMapText(ag.name)} • ${agId}`, { className: 'lpg-map-tooltip', direction: 'top', offset: [0, -32] })
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
    visibleAgentCount += 1;
    visibleBounds.push([ag.lat, ag.lng]);
  });

  // 2. Render Cluster / Titik Pusat 12 Kecamatan
  Object.keys(PINRANG_KECAMATAN_COORDS).forEach(kecName => {
    if (filterKec && filterKec !== kecName) return;

    const kecMeta = PINRANG_KECAMATAN_COORDS[kecName];
    const kecPangkalan = matchedPangkalan.filter(p => p.kecamatan === kecName);
    if ((search || filterAgent || filterStatus) && !kecPangkalan.length) return;
    const count = kecPangkalan.length;

    const districtIcon = L.divIcon({
      className: 'custom-gis-district-icon',
      html: `<div class="lpg-district-pin">${count}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -14]
    });

    const marker = L.marker([kecMeta.lat, kecMeta.lng], { icon: districtIcon })
      .bindTooltip(`Kecamatan ${escapeLpgMapText(kecName)} • ${count} pangkalan`, { className: 'lpg-map-tooltip', direction: 'top', offset: [0, -14] })
      .bindPopup(`
        <div style="font-size:0.84rem; line-height:1.5;">
          <strong style="color:#0F172A; font-size:0.95rem;">Kecamatan ${kecName}</strong><br>
          Total pangkalan sesuai filter: <strong>${count}</strong><br>
          <span style="font-size:.7rem;color:#64748B;">Marker ini adalah referensi wilayah kecamatan, bukan alamat pangkalan.</span><br>
          <hr style="margin:6px 0; border:0; border-top:1px solid #E2E8F0;">
          <button onclick="filterTableByKec('${kecName}')" style="background:#1D4ED8; color:#FFFFFF; border:none; padding:4px 10px; border-radius:4px; font-size:0.74rem; font-weight:800; cursor:pointer; width:100%;">
            Lihat Daftar Pangkalan (${count}) &rarr;
          </button>
        </div>
      `);

    lpgGisLayers.districts.addLayer(marker);
    visibleBounds.push([kecMeta.lat, kecMeta.lng]);

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

  // 3. Marker individual hanya untuk koordinat dengan bukti verifikasi GPS.
  // Koordinat seed lama tidak ditampilkan karena tidak merepresentasikan alamat usaha.
  matchedPangkalan.forEach(p => {
    const latitude = Number(p.latitude);
    const longitude = Number(p.longitude);
    const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude)
      && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
    const isGpsVerified = p.gpsVerified === true || p.locationVerification?.status === 'VERIFIED';
    if (hasValidCoordinates && isGpsVerified) {
      gpsCount += 1;
      const markerColor = '#059669';

      const pklIcon = L.divIcon({
        className: 'custom-gis-pkl-icon',
        html: '<div class="lpg-pangkalan-pin"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      const pMarker = L.marker([latitude, longitude], { icon: pklIcon })
        .bindTooltip(escapeLpgMapText(p.name), { className: 'lpg-map-tooltip', direction: 'top', offset: [0, -8] })
        .bindPopup(`
          <div style="font-size:0.82rem; line-height:1.45;">
            <strong style="color:#0F2C59;">${escapeLpgMapText(p.name)}</strong><br>
            <span style="font-size:.7rem;color:${markerColor};font-weight:900;">TERVERIFIKASI GPS LAPANGAN</span><br>
            <strong>Alamat:</strong> ${escapeLpgMapText(p.address || `${p.desaKelurahan}, Kec. ${p.kecamatan}`)}<br>
            <strong>Agen:</strong> ${escapeLpgMapText(p.agentName || p.agentId)}<br>
            <strong>Kontak:</strong> ${escapeLpgMapText(p.phone || '-')}<br>
            <strong>Koordinat:</strong> <code>${latitude.toFixed(5)}, ${longitude.toFixed(5)}</code>
          </div>
        `);

      lpgGisLayers.verifiedPangkalan.addLayer(pMarker);
      visibleBounds.push([latitude, longitude]);
    }
  });

  const summary = document.getElementById('gisMapResultSummary');
  if (summary) summary.textContent = `${matchedPangkalan.length} pangkalan • ${visibleAgentCount} agen GPS • ${gpsCount} pangkalan GPS • ${awaitingGpsCount} menunggu validasi`;
  if (!filterKec && !filterAgent && !search && !filterStatus && visibleBounds.length) lpgGisHomeBounds = L.latLngBounds(visibleBounds);
};

window.homeLpgGisMap = function() {
  if (lpgGisMapInstance && lpgGisHomeBounds?.isValid()) lpgGisMapInstance.fitBounds(lpgGisHomeBounds, { padding: [28, 28], maxZoom: 11 });
};

window.toggleLpgGisFullscreen = async function() {
  const container = document.getElementById('adminLpgGisMapContainer');
  if (!container) return;
  if (!document.fullscreenElement) await container.requestFullscreen?.(); else await document.exitFullscreen?.();
  setTimeout(() => lpgGisMapInstance?.invalidateSize({ pan: false }), 100);
};

document.addEventListener('fullscreenchange', () => setTimeout(() => lpgGisMapInstance?.invalidateSize({ pan: false }), 100));

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
