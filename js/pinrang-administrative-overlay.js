(function (root) {
  'use strict';
  const BASE = '/geo/pinrang/2026-06';
  const PALETTE = ['#2563EB','#059669','#D97706','#7C3AED','#DC2626','#0891B2','#DB2777','#65A30D','#EA580C','#4F46E5','#0D9488','#9333EA'];

  function nameOf(feature, village) {
    const p = feature.properties || {};
    return p[village ? 'WADMKD' : 'WADMKC'] || p.NAMOBJ || 'Wilayah';
  }
  function districtOf(feature) {
    const p = feature.properties || {};
    return p.WADMKC || p.KECAMATAN || '-';
  }
  function hash(text) {
    return Array.from(String(text)).reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 7);
  }
  function colorFor(text) { return PALETTE[hash(text) % PALETTE.length]; }

  async function addTo(map, options) {
    options = options || {};
    if (!map || !root.L) return null;
    const responses = await Promise.all([
      fetch(`${BASE}/kecamatan.geojson`), fetch(`${BASE}/desa-kelurahan.geojson`)
    ]);
    if (!responses[0].ok || !responses[1].ok) throw new Error('Dataset batas administrasi tidak tersedia');
    const data = await Promise.all(responses.map(response => response.json()));

    let districtLayer;
    let villageLayer;
    districtLayer = L.geoJSON(data[0], {
      pane: options.districtPane || 'overlayPane',
      style: feature => {
        const color = colorFor(nameOf(feature, false));
        return { color, weight: 2.2, opacity: .95, fillColor: color, fillOpacity: .19 };
      },
      onEachFeature: (feature, layer) => {
        const name = nameOf(feature, false);
        layer.bindTooltip(`<strong>Kecamatan ${name}</strong>`, { sticky: true });
        layer.on({
          mouseover: event => event.target.setStyle({ weight: 3.4, fillOpacity: .31 }),
          mouseout: event => districtLayer.resetStyle(event.target)
        });
      }
    }).addTo(map);

    villageLayer = L.geoJSON(data[1], {
      pane: options.villagePane || 'overlayPane',
      style: feature => {
        const district = districtOf(feature);
        const base = colorFor(district);
        return { color: base, weight: 1, opacity: .8, fillColor: colorFor(`${district}:${nameOf(feature, true)}`), fillOpacity: .12 };
      },
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(`<strong>${nameOf(feature, true)}</strong><br>Kec. ${districtOf(feature)}`, { sticky: true });
        layer.on({
          mouseover: event => event.target.setStyle({ weight: 2, fillOpacity: .25 }),
          mouseout: event => villageLayer.resetStyle(event.target)
        });
      }
    });

    if (options.showVillages === true || map.getZoom() >= (options.villageMinZoom || 12)) villageLayer.addTo(map);
    const syncVillages = () => {
      if (map.getZoom() >= (options.villageMinZoom || 12)) {
        if (!map.hasLayer(villageLayer)) villageLayer.addTo(map);
      } else if (map.hasLayer(villageLayer)) map.removeLayer(villageLayer);
    };
    map.on('zoomend', syncVillages);
    L.control.layers(null, {
      'Kecamatan (overlay warna)': districtLayer,
      'Desa/Kelurahan (overlay warna)': villageLayer
    }, { collapsed: options.collapsed !== false, position: 'topright' }).addTo(map);
    return { districtLayer, villageLayer, bounds: districtLayer.getBounds() };
  }

  root.PinrangAdministrativeOverlay = { addTo, colorFor, palette: PALETTE.slice() };
}(window));
