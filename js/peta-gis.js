(function () {
  'use strict';

  const CENTER = [-3.79, 119.64];
  const state = { markets: [], agents: [], bases: [], fuel: [], query: '', category: 'all', district: 'all', village: 'all', view: 'map', rows: [] };
  let map;
  let initialBounds;
  let renderFrame;
  const groups = {};
  const loadedScripts = new Map();
  const adminVillages = new Map();
  const villageAliases = new Map(Object.entries({
    'CEMPA|MATUNRUTUNRUE':'Mattunru Tunrue','DUAMPANUA|BUTTUSAWE':'Battusawe','DUAMPANUA|KABALLANGAN':'Kaballangang','DUAMPANUA|PEKKABATALAMPA':'Pekkabata',
    'LANRISANG|AMASSANGANG':'Amassangeng','LANRISANG|LANRISANGJAMPUE':'Lanrisang','LANRISANG|LANSIRANG':'Lanrisang','LEMBANG|BINANGAKARAENGPAJALELE':'Binanga Karaeng','LEMBANG|TADOKKONGTUPPU':'Tadokkong',
    'MATTIROBULU|PANANRANGDUSUNKARIANGO':'Pananrang','MATTIROSOMPE|MATTONGANGTONGANGDUSUNLABOLONG':'Mattongang Tongang','PALETEANG|BENTENGSAWITO':'Benteng Sawitto',
    'PATAMPANUA|SIPATUOMACCIRINNA':'Sipatuo','PATAMPANUA|TEPPOBENTENG':'Teppo','TIROANG|PAKKIE':'Fakkie','WATANGSAWITTO|MACCORALAIE':'Macorawalie','WATANGSAWITTO|MACCORAWALIE':'Macorawalie','WATANGSAWITTO|SAWITO':'Sawitto'
  }));

  const valid = (lat, lng) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Number(lat) >= -4.35 && Number(lat) <= -3.10 && Number(lng) >= 119.05 && Number(lng) <= 120.20;
  const clean = value => String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const searchable = item => Object.values(item).filter(value => typeof value !== 'object').join(' ').toLowerCase();
  const coordinateStatus = item => String(item.coordinateStatus || item.coordinate_status || item.statusKoordinat || '').toUpperCase();
  const fuelCategory = item => window.BbmEngine ? BbmEngine.normalizeCategory(item) : '';
  const fuelMeta = category => (window.BbmEngine && BbmEngine.CATEGORY_META[category]) || { label: category, color: '#0F2C59', symbol: '⛽' };

  const adminKey = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\b(DESA|KELURAHAN|KECAMATAN|DUSUN)\b/g,'').replace(/[^A-Z0-9]/g,'');
  const region = item => {
    const district=String(item.kecamatan || item.district || '').trim(), rawVillage=String(item.desaKelurahan || item.desa || item.kelurahan || item.village || '').trim();
    const key=`${adminKey(district)}|${adminKey(rawVillage)}`;
    return {district,village:villageAliases.get(key) || adminVillages.get(key) || rawVillage};
  };

  async function loadAdministrativeReference() {
    adminVillages.clear();
    try { if(typeof db==='undefined'||!db) throw new Error('Firestore belum tersedia'); const snapshot=await db.collection('administrative_villages').get();
      snapshot.forEach(doc=>{const item=doc.data();if(item.dataVersion!=='2026-09-02-pemkab-statistik-sektoral-2024-v1')return;const district=String(item.district||'').trim(),village=String(item.name||'').trim();if(district&&village)adminVillages.set(`${adminKey(district)}|${adminKey(village)}`,village);});
      if(adminVillages.size!==109) throw new Error(`Master Firestore tidak lengkap (${adminVillages.size}/109)`);
    } catch(error){adminVillages.clear();console.warn('[Peta GIS] Master administratif Firestore tidak tersedia:',error.message);}
  }
  const categoryMeta = {
    market:{ label:'Pasar rakyat', symbol:'🏬' }, agent:{ label:'Agen LPG', symbol:'🚚' }, base:{ label:'Pangkalan LPG 3 kg', symbol:'🔥' },
    spbu_reguler:{ label:'SPBU Reguler', symbol:'⛽' }, spbu_kompak:{ label:'SPBU Compact / APMS', symbol:'🛢️' }, spbun:{ label:'SPBUN', symbol:'⚓' }, pertashop:{ label:'Pertashop', symbol:'🏪' }
  };

  function makeIcon(type, symbol, indicative) {
    return L.divIcon({
      className: 'gis-marker',
      html: `<div class="gis-marker-pin ${type}${indicative ? ' indicative' : ''}"><span>${symbol}</span></div>`,
      iconSize: [36, 36], iconAnchor: [18, 35], popupAnchor: [0, -34]
    });
  }

  function popup(title, region, detail, note, url) {
    return `<div class="gis-popup"><strong>${clean(title)}</strong><br>${clean(region)}<br><small>${clean(detail)}</small>${note ? `<br><small>${clean(note)}</small>` : ''}${url ? `<br><a href="${clean(url)}" target="_blank" rel="noopener">Buka Google Maps ↗</a>` : ''}</div>`;
  }

  function agentPoint(agent, bases) {
    const point=getCanonicalLpgPoint(agent);if(!point)return null;
    return {lat:point.latitude,lng:point.longitude,indicative:point.verificationStatus!=='verified'};
  }

  function addMarker(group, lat, lng, icon, html, title) {
    return L.marker([lat, lng], { pane: 'gisDataPane', icon, title, riseOnHover: true, zIndexOffset: 1000 })
      .bindPopup(html, { maxWidth: 310 }).addTo(group);
  }

  function matches(item, category) {
    const place = region(item);
    return (state.category === 'all' || state.category === category) &&
      (state.district === 'all' || place.district === state.district) &&
      (state.village === 'all' || place.village === state.village) &&
      (!state.query || searchable(item).includes(state.query));
  }

  function collectRows() {
    const rows = [];
    const push = (category, item, lat, lng, name, status, url) => {
      if (!matches(item, category) || !valid(lat, lng)) return;
      const place = region(item), meta = categoryMeta[category] || { label:category, symbol:'•' };
      rows.push({ category, type:meta.label, symbol:meta.symbol, name:String(name || '-'), district:place.district || '-', village:place.village || '-', status:String(status || '-'), lat:Number(lat), lng:Number(lng), url:url || `https://www.google.com/maps?q=${lat},${lng}` });
    };
    state.markets.forEach(x => push('market', x, x.latitude, x.longitude, x.nama, x.statusLabel || x.statusOperasional, x.googleMapsUrl));
    state.agents.forEach(x => { const point=agentPoint(x,state.bases); if(point) push('agent',x,point.lat,point.lng,x.name,point.indicative ? 'Perlu verifikasi' : 'Terverifikasi',x.googleMapsUrl); });
    state.bases.forEach(x => {const point=getCanonicalLpgPoint(x);if(point)push('base',x,point.latitude,point.longitude,x.name,point.verificationStatus||x.status,x.googleMapsUrl);});
    state.fuel.forEach(x => push(fuelCategory(x),x,x.lat,x.lng,x.nama,x.status_operasi,x.google_maps_url));
    return rows.sort((a,b) => a.district.localeCompare(b.district,'id') || a.type.localeCompare(b.type,'id') || a.name.localeCompare(b.name,'id'));
  }

  function renderBarChart(containerId, entries, colors) {
    const node=document.getElementById(containerId); if(!node) return;
    const max=Math.max(1,...entries.map(([,value])=>value));
    node.innerHTML=entries.length ? entries.map(([label,value],index)=>`<div class="gis-bar-row"><span class="gis-bar-label" title="${clean(label)}">${clean(label)}</span><span class="gis-bar-track"><i class="gis-bar-fill" style="width:${(value/max)*100}%;${colors ? `background:${colors[index%colors.length]}` : ''}"></i></span><b class="gis-bar-value">${value}</b></div>`).join('') : '<div class="gis-empty">Tidak ada data sesuai filter.</div>';
  }

  function renderDataViews() {
    state.rows=collectRows();
    const body=state.view==='table' ? document.getElementById('gisTableBody') : null;
    if(body) body.innerHTML=state.rows.length ? state.rows.map(row=>`<tr><td><span class="gis-type-chip">${row.symbol} ${clean(row.type)}</span></td><td><strong>${clean(row.name)}</strong></td><td>${clean(row.district)}</td><td>${clean(row.village)}</td><td>${clean(row.status)}</td><td>${row.lat.toFixed(6)}, ${row.lng.toFixed(6)}</td><td><a href="${clean(row.url)}" target="_blank" rel="noopener">Peta ↗</a></td></tr>`).join('') : '<tr><td colspan="7" class="gis-empty">Tidak ada titik yang sesuai dengan filter aktif.</td></tr>';
    const tableSummary=document.getElementById('gisTableSummary'); if(tableSummary) tableSummary.textContent=`${state.rows.length} titik sesuai filter`;
    const byCategory={}; const byDistrict={};
    state.rows.forEach(row=>{byCategory[row.type]=(byCategory[row.type]||0)+1;byDistrict[row.district]=(byDistrict[row.district]||0)+1;});
    if(state.view==='chart') {
      renderBarChart('gisCategoryChart',Object.entries(byCategory).sort((a,b)=>b[1]-a[1]),['#D97706','#2563EB','#059669','#DC2626','#0284C7','#7C3AED','#16A34A']);
      renderBarChart('gisDistrictChart',Object.entries(byDistrict).sort((a,b)=>b[1]-a[1]));
      renderInfographic(byCategory,byDistrict);
    }
    const chartSummary=document.getElementById('gisChartSummary'); if(chartSummary) chartSummary.textContent=`${state.rows.length} titik · ${Object.keys(byDistrict).length} kecamatan · filter aktif diterapkan`;
  }

  function renderInfographic(byCategory,byDistrict) {
    const categoryEntries=Object.entries(byCategory).sort((a,b)=>b[1]-a[1]);
    const districtEntries=Object.entries(byDistrict).sort((a,b)=>b[1]-a[1]);
    const filtered=state.category!=='all'||state.district!=='all'||state.village!=='all'||Boolean(state.query);
    const officialVillagePairs=new Set(state.rows.filter(row=>adminVillages.has(`${adminKey(row.district)}|${adminKey(row.village)}`)).map(row=>`${adminKey(row.district)}|${adminKey(row.village)}`));
    const villageCount=filtered?officialVillagePairs.size:adminVillages.size;
    const verified=state.rows.filter(row=>/VERIF|VALID|GPS|AKTIF|OPERASI/i.test(row.status) && !/PERLU|BELUM|INDIKATIF|KANDIDAT/i.test(row.status)).length;
    const kpis=document.getElementById('gisKpis');
    const palette=['#d97706','#2563eb','#059669','#dc2626','#0284c7','#7c3aed','#16a34a'];
    let cards=[['#2563eb','📍','Titik ditampilkan',state.rows.length,filtered?'Sesuai filter yang dipilih':'Seluruh data cloud aktif']];
    if(!filtered) cards.push(['#0f9f75','🗺️','Kecamatan',Object.keys(byDistrict).length,'Wilayah yang memiliki titik'],['#d97706','🏘️','Desa/Kelurahan',villageCount,'Nama baku referensi 109 wilayah'],['#7c3aed','✓','Status valid/aktif',verified,state.rows.length?`${Math.round(verified/state.rows.length*100)}% dari data tersaring`:'Belum ada data']);
    else if(state.category==='all') {
      categoryEntries.forEach(([label,value],index)=>{const meta=Object.values(categoryMeta).find(item=>item.label===label)||{symbol:'•'};cards.push([palette[index%palette.length],meta.symbol,label,value,`${Math.round(value/Math.max(1,state.rows.length)*100)}% dari hasil filter`]);});
      cards.push(['#d97706','🏘️','Desa/Kelurahan',villageCount,'Cakupan pada wilayah terpilih'],['#7c3aed','✓','Status valid/aktif',verified,state.rows.length?`${Math.round(verified/state.rows.length*100)}% dari data tersaring`:'Belum ada data']);
    } else {
      const selected=categoryMeta[state.category]||{label:'Kategori terpilih',symbol:'•'};
      cards.push(['#0f9f75',selected.symbol,selected.label,state.rows.length,'Jumlah kategori terpilih'],['#0891b2','🗺️','Kecamatan',Object.keys(byDistrict).length,'Cakupan hasil filter'],['#d97706','🏘️','Desa/Kelurahan',villageCount,'Cakupan hasil filter'],['#7c3aed','✓','Status valid/aktif',verified,state.rows.length?`${Math.round(verified/state.rows.length*100)}% dari data tersaring`:'Belum ada data']);
    }
    if(kpis) kpis.innerHTML=cards.map(item=>`<article class="gis-kpi" style="--accent:${item[0]}"><div class="gis-kpi-top"><span>${clean(item[2])}</span><i class="gis-kpi-icon">${item[1]}</i></div><strong>${Number(item[3]).toLocaleString('id-ID')}</strong><small>${clean(item[4])}</small></article>`).join('');
    const categoryTotal=document.getElementById('gisCategoryTotal'); if(categoryTotal) categoryTotal.textContent=`${state.rows.length.toLocaleString('id-ID')} titik`;
    const districtTotal=document.getElementById('gisDistrictTotal'); if(districtTotal) districtTotal.textContent=`${Object.keys(byDistrict).length} wilayah`;
    const insight=document.getElementById('gisInsight');
    if(insight) insight.innerHTML=state.rows.length ? `<strong>Ringkasan:</strong> Jenis titik terbanyak adalah <strong>${clean(categoryEntries[0][0])}</strong> (${categoryEntries[0][1]} titik). Konsentrasi tertinggi berada di <strong>${clean(districtEntries[0][0])}</strong> (${districtEntries[0][1]} titik). Seluruh angka mengikuti pencarian dan filter wilayah yang sedang aktif.` : 'Tidak ada data yang sesuai dengan filter aktif.';
  }

  function activeFilterText() {
    const label=id=>document.getElementById(id)?.selectedOptions?.[0]?.textContent || '-';
    return `Kategori: ${label('gisCategory')} | Kecamatan: ${label('gisDistrict')} | Desa/Kelurahan: ${label('gisVillage')}${state.query ? ` | Pencarian: ${state.query}` : ''}`;
  }
  function reportName(kind,extension){
    const selected=id=>document.getElementById(id)?.selectedOptions?.[0]?.textContent||'';
    const context=[state.category==='all'?'semua-layanan':selected('gisCategory'),state.district==='all'?'kabupaten-pinrang':`kec-${selected('gisDistrict')}`,state.village==='all'?'':selected('gisVillage'),state.query?`cari-${state.query}`:''].filter(Boolean);
    const slug=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const prefix={data:'data-geospasial',tabel:'tabel-data-geospasial',peta:'peta-gis',infografis:'infografis-gis'}[kind]||kind;
    return `${prefix}-${context.map(slug).join('-')}-${new Date().toISOString().slice(0,10)}.${extension}`;
  }
  let logoDataPromise;
  function loadLogoData() {
    if(logoDataPromise) return logoDataPromise;
    logoDataPromise=new Promise(resolve=>{const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext('2d').drawImage(image,0,0);resolve(canvas.toDataURL('image/png'));};image.onerror=()=>resolve(null);image.src='assets/brand/logo_pinrang_opt.png';});
    return logoDataPromise;
  }
  async function drawPdfHeader(doc,title) {
    doc.setFillColor(15,44,89);doc.rect(0,0,297,27,'F');const logo=await loadLogoData();if(logo)doc.addImage(logo,'PNG',12,3,18,18,undefined,'FAST');
    doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text(title,36,9);doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text('PEMERINTAH KABUPATEN PINRANG | DISPERINDAG ESDM',36,15);doc.setFontSize(7);doc.text(activeFilterText(),36,21,{maxWidth:245});
  }

  function loadScriptOnce(src, ready) {
    if(ready()) return Promise.resolve();
    if(loadedScripts.has(src)) return loadedScripts.get(src);
    const request=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.async=true;script.onload=()=>ready()?resolve():reject(new Error(`Modul tidak siap: ${src}`));script.onerror=()=>reject(new Error(`Gagal memuat: ${src}`));document.head.appendChild(script);});
    loadedScripts.set(src,request); return request;
  }

  async function ensureExportLibraries(mode) {
    if(mode==='excel') return loadScriptOnce('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',()=>Boolean(window.XLSX));
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',()=>Boolean(window.jspdf));
    if(mode==='table') return loadScriptOnce('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js',()=>Boolean(window.jspdf?.jsPDF?.API?.autoTable));
    return loadScriptOnce('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',()=>Boolean(window.html2canvas));
  }

  async function exportExcel() {
    if(!state.rows.length) return alert('Data belum tersedia untuk diekspor.');
    try { await ensureExportLibraries('excel'); } catch(error) { console.error('[GIS export]',error); return alert('Modul Excel belum dapat dimuat. Periksa koneksi lalu coba kembali.'); }
    const data=state.rows.map((row,index)=>({'No.':index+1,'Jenis':row.type,'Nama/Identitas':row.name,'Kecamatan':row.district,'Desa/Kelurahan':row.village,'Status':row.status,'Latitude':row.lat,'Longitude':row.lng,'Tautan Peta':row.url}));
    const sheet=XLSX.utils.json_to_sheet(data,{origin:'A4'}); XLSX.utils.sheet_add_aoa(sheet,[['PEMERINTAH KABUPATEN PINRANG'],['DATA GEOSPASIAL DISPERINDAG ESDM'],[activeFilterText()]],{origin:'A1'});
    sheet['!cols']=[{wch:6},{wch:24},{wch:38},{wch:18},{wch:22},{wch:28},{wch:14},{wch:14},{wch:44}]; sheet['!autofilter']={ref:`A4:I${data.length+4}`}; sheet['!freeze']={xSplit:0,ySplit:4};
    const book=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book,sheet,'Data GIS');
    const summary=XLSX.utils.aoa_to_sheet([['RINGKASAN DATA GIS'],['Filter',activeFilterText()],['Jumlah titik',state.rows.length],['Waktu ekspor',new Date().toLocaleString('id-ID',{timeZone:'Asia/Makassar'})]]); summary['!cols']=[{wch:20},{wch:90}]; XLSX.utils.book_append_sheet(book,summary,'Ringkasan'); XLSX.writeFile(book,reportName('data','xlsx'),{compression:true});
  }

  async function exportTablePdf() {
    if(!state.rows.length) return alert('Data belum tersedia untuk diekspor.');
    try { await ensureExportLibraries('table'); } catch(error) { console.error('[GIS export]',error); return alert('Modul PDF belum dapat dimuat. Periksa koneksi lalu coba kembali.'); }
    const {jsPDF}=window.jspdf, doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
    await drawPdfHeader(doc,'DATA GEOSPASIAL DISPERINDAG ESDM');
    doc.autoTable({startY:32,tableWidth:277,margin:{left:10,right:10,bottom:14},head:[['No','Jenis','Nama/Identitas','Kecamatan','Desa/Kelurahan','Status','Latitude','Longitude']],body:state.rows.map((row,index)=>[index+1,row.type,row.name,row.district,row.village,row.status,row.lat.toFixed(6),row.lng.toFixed(6)]),styles:{font:'helvetica',fontSize:6.8,cellPadding:2,overflow:'linebreak',halign:'left'},headStyles:{fillColor:[15,44,89],textColor:255,fontStyle:'bold'},alternateRowStyles:{fillColor:[245,248,252]},columnStyles:{0:{cellWidth:10,halign:'center'},6:{cellWidth:24},7:{cellWidth:24}},didDrawPage:data=>{if(data.pageNumber>1){doc.setFillColor(15,44,89);doc.rect(0,0,297,9,'F');doc.setTextColor(255);doc.setFontSize(7);doc.text('DATA GEOSPASIAL DISPERINDAG ESDM KABUPATEN PINRANG',148.5,6,{align:'center'});}const page=doc.internal.getCurrentPageInfo().pageNumber;doc.setTextColor(80);doc.setFontSize(7);doc.text(`Sumber: CMS Disperindag ESDM Kabupaten Pinrang | Dicetak ${new Date().toLocaleString('id-ID',{timeZone:'Asia/Makassar'})}`,10,203);doc.text(`Halaman ${page}`,287,203,{align:'right'});}}); doc.save(reportName('tabel','pdf'));
  }

  async function exportVisualPdf(kind,node) {
    try { await ensureExportLibraries('visual'); } catch(error) { console.error('[GIS export]',error); return alert('Modul PDF belum dapat dimuat. Periksa koneksi lalu coba kembali.'); }
    const button=document.getElementById(kind==='peta'?'gisExportMapPdf':'gisExportChartPdf'), old=button.textContent; button.disabled=true; button.textContent='Menyiapkan PDF…';
    try { if(kind==='peta'){map.closePopup();map.invalidateSize();await new Promise(resolve=>setTimeout(resolve,500));} const canvas=await html2canvas(node,{backgroundColor:'#eef3f8',scale:Math.min(1.35,window.devicePixelRatio||1),useCORS:true,allowTaint:false,logging:false,ignoreElements:element=>element.classList?.contains('gis-floating-export')});
      const {jsPDF}=window.jspdf, doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});await drawPdfHeader(doc,kind==='peta'?'PETA GIS DISPERINDAG ESDM':'INFOGRAFIS SEBARAN DATA GIS');
      const ratio=Math.min(277/canvas.width,168/canvas.height),width=canvas.width*ratio,height=canvas.height*ratio;doc.addImage(canvas.toDataURL('image/jpeg',.9),'JPEG',(297-width)/2,30,width,height,undefined,'FAST');doc.setTextColor(70);doc.setFontSize(7);doc.text(`Sumber: CMS Disperindag ESDM Kabupaten Pinrang | Diekspor ${new Date().toLocaleString('id-ID',{timeZone:'Asia/Makassar'})}`,148.5,205,{align:'center'});doc.save(reportName(kind,'pdf'));
    } catch(error){console.error('[GIS export]',error);alert('PDF belum dapat dibuat. Pastikan seluruh elemen selesai dimuat lalu coba kembali.');} finally{button.disabled=false;button.textContent=old;}
  }

  function updateRegionFilters(resetVillage) {
    const districtSelect=document.getElementById('gisDistrict'), villageSelect=document.getElementById('gisVillage'); if(!districtSelect||!villageSelect) return;
    const items=[...state.markets,...state.agents,...state.bases,...state.fuel];
    const districts=[...new Set(items.map(x=>region(x).district).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id'));
    districtSelect.innerHTML='<option value="all">Semua kecamatan</option>'+districts.map(x=>`<option value="${clean(x)}">${clean(x)}</option>`).join(''); districtSelect.value=districts.includes(state.district)?state.district:'all'; state.district=districtSelect.value;
    if(resetVillage){state.village='all';}
    const villages=[...new Set(items.filter(x=>state.district==='all'||region(x).district===state.district).map(x=>region(x).village).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id'));
    villageSelect.innerHTML='<option value="all">Semua desa/kelurahan</option>'+villages.map(x=>`<option value="${clean(x)}">${clean(x)}</option>`).join(''); villageSelect.value=villages.includes(state.village)?state.village:'all'; state.village=villageSelect.value;
  }

  function render() {
    Object.values(groups).forEach(group => group.clearLayers());
    const bounds = [];
    let shown = 0;

    state.markets.filter(item => matches(item, 'market') && valid(item.latitude, item.longitude)).forEach(item => {
      const lat = Number(item.latitude), lng = Number(item.longitude);
      addMarker(groups.market, lat, lng, makeIcon('market', '🏬'), popup(item.nama, `${item.desaKelurahan || '-'}, Kec. ${item.kecamatan || '-'}`, item.statusLabel || item.statusOperasional || 'Pasar rakyat', item.statusKoordinat || '', item.googleMapsUrl || `https://www.google.com/maps?q=${lat},${lng}`), item.nama);
      bounds.push([lat, lng]); shown++;
    });

    state.agents.forEach(agent => {
      if (!matches(agent, 'agent')) return;
      const point = agentPoint(agent, state.bases);
      if (!point) return;
      const note = point.indicative ? 'Koordinat kandidat agen; perlu verifikasi faktual.' : 'Koordinat agen terverifikasi.';
      addMarker(groups.agent, point.lat, point.lng, makeIcon('agent', '🚚', point.indicative), popup(agent.name, agent.address || 'Kabupaten Pinrang', `${agent.linkedPangkalanCount || 0} pangkalan terhubung`, note, agent.googleMapsUrl || `https://www.google.com/maps?q=${point.lat},${point.lng}`), agent.name);
      bounds.push([point.lat, point.lng]); shown++;
    });

    state.bases.filter(item => matches(item, 'base') && getCanonicalLpgPoint(item)).forEach(item => {
      const point=getCanonicalLpgPoint(item),lat=point.latitude,lng=point.longitude;
      const indicative = point.verificationStatus !== 'verified';
      addMarker(groups.base, lat, lng, makeIcon('base', '🔥', indicative), popup(item.name, `${item.desaKelurahan || '-'}, Kec. ${item.kecamatan || '-'}`, `Pangkalan LPG 3 kg · ${item.agentId || '-'}`, indicative ? 'Koordinat administratif/indikatif; verifikasi GPS lapangan tetap diperlukan.' : 'Koordinat terverifikasi.', item.googleMapsUrl || `https://www.google.com/maps?q=${lat},${lng}`), item.name);
      bounds.push([lat, lng]); shown++;
    });

    state.fuel.filter(item => matches(item, fuelCategory(item)) && valid(item.lat, item.lng)).forEach(item => {
      const lat = Number(item.lat), lng = Number(item.lng);
      const category = fuelCategory(item);
      const meta = fuelMeta(category);
      addMarker(groups[category], lat, lng, makeIcon(category, meta.symbol), popup(item.nama, `${item.desa || '-'}, Kec. ${item.kecamatan || '-'}`, `${meta.label} · ${item.kode || '-'}`, item.status_operasi || '', item.google_maps_url), item.nama);
      bounds.push([lat, lng]); shown++;
    });

    const mapped = state.markets.filter(x => valid(x.latitude, x.longitude)).length + state.agents.filter(x => agentPoint(x, state.bases)).length + state.bases.filter(x => getCanonicalLpgPoint(x)).length + state.fuel.filter(x => valid(x.lat, x.lng)).length;
    document.getElementById('gisSummary').textContent = `${shown} titik ditampilkan · ${mapped} titik terpetakan dari ${state.markets.length + state.agents.length + state.bases.length + state.fuel.length} data`;
    const counts = window.BbmEngine ? BbmEngine.getCategoryCounts(state.fuel) : {};
    const totals = { market: state.markets.filter(x => valid(x.latitude, x.longitude)).length, agent: state.agents.filter(x => agentPoint(x, state.bases)).length, base: state.bases.filter(x => getCanonicalLpgPoint(x)).length, ...counts };
    document.querySelectorAll('[data-gis-count]').forEach(node => { node.textContent = totals[node.dataset.gisCount] || 0; });
    renderDataViews();
    if (!initialBounds && bounds.length) initialBounds = L.latLngBounds(bounds);
  }

  function scheduleRender() {
    if(renderFrame) cancelAnimationFrame(renderFrame);
    renderFrame=requestAnimationFrame(()=>{renderFrame=null;render();});
  }

  async function loadData() {
    state.markets = [];
    state.fuel = window.BbmEngine ? BbmEngine.getAll() : [];
    state.agents = [];
    state.bases = [];
    updateRegionFilters(false); scheduleRender();
    
    // ROBUST: Load LPG data dari Firestore terlebih dahulu (dengan JSON fallback)
    if (window.loadCanonicalLpgMasterOnce) {
      const lpgData = await loadCanonicalLpgMasterOnce();
      if (lpgData && lpgData.agents && lpgData.pangkalan) {
        state.agents = lpgData.agents;
        state.bases = lpgData.pangkalan;
        console.info(`[Peta GIS] LPG data loaded from ${lpgData.source}: ${lpgData.agents.length} agen, ${lpgData.pangkalan.length} pangkalan`);
        updateRegionFilters(false); 
        scheduleRender();
      } else if (lpgData && lpgData.error) {
        console.error(`[Peta GIS] LPG data load failed: ${lpgData.error}`);
      }
    }
    
    // Load pasar dari Firestore
    if (typeof db !== 'undefined' && db) window.__gisMarketUnsubscribe=db.collection('markets').onSnapshot(snapshot => { if(snapshot.empty) return; state.markets=snapshot.docs.map(doc=>({id:doc.id,...doc.data()})); updateRegionFilters(false); scheduleRender(); },error=>console.warn('[Peta GIS] Listener pasar Firestore:',error.code||error.message));
    
    // Subscribe ke perubahan LPG data real-time (untuk update berkelanjutan)
    if (window.subscribeCanonicalLpgMaster) window.__gisLpgUnsubscribe = subscribeCanonicalLpgMaster(result => { state.agents = result.agents; state.bases = result.pangkalan; updateRegionFilters(false); scheduleRender(); });
    
    // Load BBM data
    if (window.BbmEngine) BbmEngine.initRealtimeSync(items => { state.fuel = items; updateRegionFilters(false); scheduleRender(); });
  }

  async function init() {
    await loadAdministrativeReference();
    map = L.map('pinrangIntegratedMap', { center: CENTER, zoom: 10, zoomControl: true, maxBounds: [[-4.35, 119.05], [-3.10, 120.20]], maxBoundsViscosity: .75 });
    map.createPane('gisBoundaryPane'); map.getPane('gisBoundaryPane').style.zIndex = 350; map.getPane('gisBoundaryPane').style.pointerEvents = 'none';
    map.createPane('gisVillagePane'); map.getPane('gisVillagePane').style.zIndex = 360; map.getPane('gisVillagePane').style.pointerEvents = 'none';
    map.createPane('gisDataPane'); map.getPane('gisDataPane').style.zIndex = 650;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors · Batas administratif indikatif' }).addTo(map);
    const makeDataGroup=()=>L.markerClusterGroup({chunkedLoading:true,chunkInterval:80,chunkDelay:24,maxClusterRadius:52,disableClusteringAtZoom:15,showCoverageOnHover:false,removeOutsideVisibleBounds:true,animate:false});
    groups.market = makeDataGroup().addTo(map); groups.agent = makeDataGroup().addTo(map); groups.base = makeDataGroup().addTo(map);
    ['spbu_reguler', 'spbu_kompak', 'spbun', 'pertashop'].forEach(key => { groups[key] = makeDataGroup().addTo(map); });
    L.control.layers(null, {
      '🏬 Pasar rakyat (<b data-gis-count="market">0</b>)': groups.market,
      '🚚 Agen LPG (<b data-gis-count="agent">0</b>)': groups.agent,
      '🔥 Pangkalan LPG 3 kg (<b data-gis-count="base">0</b>)': groups.base,
      '⛽ SPBU Reguler (<b data-gis-count="spbu_reguler">0</b>)': groups.spbu_reguler,
      '🛢️ SPBU Compact / APMS (<b data-gis-count="spbu_kompak">0</b>)': groups.spbu_kompak,
      '⚓ SPBUN (<b data-gis-count="spbun">0</b>)': groups.spbun,
      '🏪 Pertashop (<b data-gis-count="pertashop">0</b>)': groups.pertashop
    }, { collapsed: false, position: 'topright' }).addTo(map);
    if (window.PinrangAdministrativeOverlay) {
      try { await PinrangAdministrativeOverlay.addTo(map, { districtPane: 'gisBoundaryPane', villagePane: 'gisVillagePane', collapsed: true, villageMinZoom: 12 }); }
      catch (error) { console.warn('[Peta GIS] Overlay administratif:', error.message); }
    }
    let searchTimer;
    document.getElementById('gisSearchAll').addEventListener('input', event => { clearTimeout(searchTimer); const value=event.target.value; searchTimer=setTimeout(()=>{state.query=value.trim().toLowerCase();render();},280); });
    document.getElementById('gisCategory').addEventListener('change', event => { state.category = event.target.value; render(); });
    document.getElementById('gisDistrict').addEventListener('change', event => { state.district = event.target.value; updateRegionFilters(true); render(); });
    document.getElementById('gisVillage').addEventListener('change', event => { state.village = event.target.value; render(); });
    document.querySelectorAll('[data-gis-view]').forEach(button => button.addEventListener('click', () => {
      state.view = button.dataset.gisView;
      document.querySelectorAll('[data-gis-view]').forEach(node => { const active=node===button; node.classList.toggle('active',active); node.setAttribute('aria-selected',String(active)); });
      document.querySelectorAll('[data-gis-panel]').forEach(node => node.classList.toggle('active',node.dataset.gisPanel===state.view));
      if(state.view==='map') setTimeout(()=>map.invalidateSize(),0);
      else renderDataViews();
    }));
    document.getElementById('gisExportExcel').addEventListener('click',exportExcel);
    document.getElementById('gisExportTablePdf').addEventListener('click',exportTablePdf);
    document.getElementById('gisExportMapPdf').addEventListener('click',()=>exportVisualPdf('peta',document.querySelector('[data-gis-panel="map"]')));
    document.getElementById('gisExportChartPdf').addEventListener('click',()=>exportVisualPdf('infografis',document.getElementById('gisInfographic')));
    document.getElementById('gisHome').addEventListener('click', () => initialBounds ? map.fitBounds(initialBounds, { padding: [24, 24], maxZoom: 12 }) : map.setView(CENTER, 10));
    document.getElementById('gisFullscreen').addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
    document.addEventListener('fullscreenchange', () => setTimeout(() => map.invalidateSize(), 100));
    await loadData();
    setTimeout(() => map.invalidateSize(), 100);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
