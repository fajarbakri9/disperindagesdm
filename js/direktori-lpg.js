(function(){
  'use strict';
  const state={agents:[],bases:[],view:'cards',page:1,pageSize:25,tablePage:1};
  let map,layers={};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const valid=(lat,lng)=>Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))&&Number(lat)>=-4.35&&Number(lat)<=-3.1&&Number(lng)>=119.05&&Number(lng)<=120.2;
  const gps=item=>item.location?.verificationStatus==='verified';
  const active=item=>!item.isDeleted&&String(item.status||'ACTIVE').toUpperCase()!=='INACTIVE';
  const pointForAgent=agent=>{const point=getCanonicalLpgPoint(agent);if(point)return{lat:point.latitude,lng:point.longitude,indicative:!gps(agent)};return null;};

  function icon(type,symbol){return L.divIcon({className:'lpg-dir-icon',html:`<div class="lpg-dir-pin ${type}"><span>${symbol}</span></div>`,iconSize:[33,33],iconAnchor:[16,32],popupAnchor:[0,-30]});}

  function initMap(){
    map=L.map('lpgDirectoryMap',{center:[-3.76,119.64],zoom:10,maxBounds:[[-4.35,119.05],[-3.1,120.2]],maxBoundsViscosity:.75,scrollWheelZoom:false});
    map.createPane('lpgdBoundary');map.getPane('lpgdBoundary').style.zIndex=350;map.getPane('lpgdBoundary').style.pointerEvents='none';
    map.createPane('lpgdVillage');map.getPane('lpgdVillage').style.zIndex=360;map.getPane('lpgdVillage').style.pointerEvents='none';
    map.createPane('lpgdData');map.getPane('lpgdData').style.zIndex=650;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    layers.agents=L.layerGroup().addTo(map);layers.gps=L.layerGroup().addTo(map);layers.indicative=L.layerGroup().addTo(map);
    L.control.layers(null,{'🚚 Agen LPG (Terverifikasi)':layers.agents,'🔥 Pangkalan (GPS Terverifikasi)':layers.gps,'🔥 Pangkalan (Referensi Wilayah)':layers.indicative},{collapsed:true}).addTo(map);
    if(window.PinrangAdministrativeOverlay)PinrangAdministrativeOverlay.addTo(map,{districtPane:'lpgdBoundary',villagePane:'lpgdVillage',villageMinZoom:12,collapsed:true}).catch(e=>console.warn('[Direktori LPG] Overlay:',e.message));
  }

  function filteredBases(){
    const q=$('lpgdSearch').value.trim().toLocaleLowerCase('id'),district=$('lpgdDistrict').value,quality=$('lpgdQuality').value;
    return state.bases.filter(active).filter(item=>{
      const hay=[item.id,item.name,item.address,item.desaKelurahan,item.kecamatan,item.agentName,item.agentId].join(' ').toLocaleLowerCase('id');
      return(!q||hay.includes(q))&&(!district||item.kecamatan===district)&&(!quality||(quality==='GPS'?gps(item):!gps(item)));
    });
  }
  function filteredAgents(){
    const q=$('lpgdSearch').value.trim().toLocaleLowerCase('id'),district=$('lpgdDistrict').value;
    return state.agents.filter(active).filter(agent=>{
      const children=state.bases.filter(x=>x.agentId===agent.id&&active(x));
      const hay=[agent.id,agent.name,agent.address,...children.map(x=>`${x.kecamatan} ${x.desaKelurahan}`)].join(' ').toLocaleLowerCase('id');
      return(!q||hay.includes(q))&&(!district||children.some(x=>x.kecamatan===district));
    });
  }

  function renderStats(){
    const bases=state.bases.filter(active);
    $('lpgdAgentCount').textContent=state.agents.filter(active).length.toLocaleString('id-ID');
    $('lpgdBaseCount').textContent=bases.length.toLocaleString('id-ID');
    $('lpgdGpsCount').textContent=bases.filter(gps).length.toLocaleString('id-ID');
    $('lpgdFallbackCount').textContent=bases.filter(x=>!gps(x)).length.toLocaleString('id-ID');
  }

  function renderMap(){
    Object.values(layers).forEach(l=>l.clearLayers());const bounds=[];
    filteredAgents().forEach(agent=>{const p=pointForAgent(agent);if(!p)return;const count=state.bases.filter(x=>x.agentId===agent.id&&active(x)).length;const note=p.indicative?'Koordinat kandidat; perlu verifikasi.':'Koordinat terverifikasi.';L.marker([p.lat,p.lng],{pane:'lpgdData',icon:icon('agent','🚚'),zIndexOffset:1100,riseOnHover:true}).bindPopup(`<strong>${esc(agent.name)}</strong><br><small>${esc(agent.id)} · ${count} pangkalan</small><br>${esc(agent.address||'-')}<br><em>${note}</em><br><a href="${esc(agent.googleMapsUrl||`https://www.google.com/maps?q=${p.lat},${p.lng}`)}" target="_blank" rel="noopener">Buka Google Maps ↗</a>`).addTo(layers.agents);bounds.push([p.lat,p.lng]);});
    const groups=new Map();filteredBases().forEach(item=>{const point=getCanonicalLpgPoint(item);if(!point)return;const lat=point.latitude,lng=point.longitude;if(gps(item)){L.marker([lat,lng],{pane:'lpgdData',icon:icon('gps','🔥'),zIndexOffset:1000,riseOnHover:true}).bindPopup(`<strong>${esc(item.name)}</strong><br>${esc(item.desaKelurahan||'-')} · Kec. ${esc(item.kecamatan||'-')}<br><small>${esc(item.agentName||item.agentId||'-')}</small><br><b>GPS terverifikasi</b>`).addTo(layers.gps);bounds.push([lat,lng]);return;}const key=`${lat.toFixed(6)},${lng.toFixed(6)}`;if(!groups.has(key))groups.set(key,{lat,lng,items:[]});groups.get(key).items.push(item);});
    groups.forEach(g=>{const s=g.items[0];L.marker([g.lat,g.lng],{pane:'lpgdData',icon:icon('indicative','🔥'),zIndexOffset:900,riseOnHover:true}).bindPopup(`<strong>${esc(s.desaKelurahan||s.kecamatan||'Referensi wilayah')}</strong><br>${g.items.length} pangkalan pada titik referensi<br><small>Bukan koordinat bangunan; verifikasi GPS diperlukan.</small>`).addTo(layers.indicative);bounds.push([g.lat,g.lng]);});
    $('lpgdMapSummary').textContent=`${filteredBases().length} pangkalan · ${filteredAgents().length} agen · ${groups.size} titik indikatif`;
    if(bounds.length)map.fitBounds(bounds,{padding:[25,25],maxZoom:11});
  }

  function renderAgents(){
    $('lpgdAgentGrid').innerHTML=filteredAgents().map(agent=>{const children=state.bases.filter(x=>x.agentId===agent.id&&active(x));const districts=[...new Set(children.map(x=>x.kecamatan).filter(Boolean))];return`<article class="lpgd-agent-card"><header><div class="lpgd-agent-icon">🚚</div><div><h3>${esc(agent.name)}</h3><code>${esc(agent.id)}</code></div></header><p>${esc(agent.address||'Alamat kantor belum dilengkapi')}</p><footer><span>${districts.length} kecamatan</span><strong>${children.length} pangkalan</strong></footer></article>`;}).join('')||'<p>Data agen tidak ditemukan sesuai filter.</p>';
  }

  // ── TABEL PREMIUM ─────────────────────────────────────────────────────────
  function renderBasesTable(){
    const list=filteredBases();
    const pages=Math.max(1,Math.ceil(list.length/state.pageSize));
    state.tablePage=Math.min(state.tablePage,pages);
    const start=(state.tablePage-1)*state.pageSize;
    const rows=list.slice(start,start+state.pageSize);

    const tbody=$('lpgdBaseRows');
    if(!tbody)return;

    if(rows.length===0){tbody.innerHTML=`<tr><td colspan="6" class="dir-table-empty">🔍 Tidak ada pangkalan sesuai filter yang diterapkan.</td></tr>`;
    }else{
      tbody.innerHTML=rows.map((item,idx)=>{
        const qBadge=gps(item)
          ?'<span class="dir-badge dir-badge-gps">✓ GPS</span>'
          :'<span class="dir-badge dir-badge-indicative">⚠ Indikatif</span>';
        const point=getCanonicalLpgPoint(item);
        const coordStr=point?`${Number(point.latitude).toFixed(5)}, ${Number(point.longitude).toFixed(5)}`:'—';
        const mapsUrl=point?`https://www.google.com/maps?q=${point.latitude},${point.longitude}`:'#';
        return`<tr>
          <td style="font-size:.67rem;color:#94A3B8;font-weight:800">${start+idx+1}</td>
          <td><strong>${esc(item.name)}</strong><small>${esc(item.id)}</small></td>
          <td>${esc(item.agentName||item.agentId||'—')}</td>
          <td><strong style="font-size:.74rem">${esc(item.kecamatan||'—')}</strong><small>${esc(item.desaKelurahan||'—')}</small></td>
          <td style="max-width:160px;font-size:.68rem;color:#475569">${esc(item.address||'—')}</td>
          <td>${qBadge}</td>
          <td><a href="${mapsUrl}" target="_blank" rel="noopener" title="Buka di Google Maps">🗺️ Maps</a></td>
        </tr>`;
      }).join('');
    }

    // pagination info
    const info=$('lpgdTableInfo');
    if(info)info.textContent=`${list.length?start+1:0}–${Math.min(start+state.pageSize,list.length)} dari ${list.length} pangkalan · Hal. ${state.tablePage}/${pages}`;
    const prevBtn=$('lpgdTablePrev'),nextBtn=$('lpgdTableNext');
    if(prevBtn)prevBtn.disabled=state.tablePage<=1;
    if(nextBtn)nextBtn.disabled=state.tablePage>=pages;
  }

  // ── INFOGRAFIS ────────────────────────────────────────────────────────────
  function renderLpgInfograms(){
    const bases=state.bases.filter(active);
    const agents=state.agents.filter(active);
    const gpsCount=bases.filter(gps).length;
    const indCount=bases.filter(x=>!gps(x)).length;

    // KPI
    const kpiEl=$('lpgdKpiGrid');
    if(kpiEl){
      const kpis=[
        {label:'Total Agen Aktif',value:agents.length,icon:'🚚',accent:'#2563EB',bg:'#EFF6FF',sub:'Master penyalur Ditjen Migas'},
        {label:'Total Pangkalan',value:bases.length,icon:'🔥',accent:'#059669',bg:'#ECFDF5',sub:'Subpenyalur LPG 3 kg'},
        {label:'GPS Terverifikasi',value:gpsCount,icon:'📍',accent:'#0891B2',bg:'#E0F9FF',sub:'Titik lapangan aktual'},
        {label:'Perlu Verifikasi GPS',value:indCount,icon:'⚠️',accent:'#D97706',bg:'#FFFBEB',sub:'Titik referensi wilayah'},
        {label:'Kecamatan Terlayani',value:new Set(bases.map(x=>x.kecamatan).filter(Boolean)).size,icon:'🗺️',accent:'#7C3AED',bg:'#F5F3FF',sub:'Dari 12 kecamatan Pinrang'},
      ];
      kpiEl.innerHTML=kpis.map(k=>`
        <div class="dir-kpi-card" style="--kpi-accent:${k.accent};--kpi-bg:${k.bg}">
          <div class="dir-kpi-top">
            <span class="dir-kpi-label">${k.label}</span>
            <span class="dir-kpi-icon">${k.icon}</span>
          </div>
          <b class="dir-kpi-value">${k.value.toLocaleString('id-ID')}</b>
          <small class="dir-kpi-sub">${k.sub}</small>
        </div>`).join('');
    }

    // Bar chart: sebaran per kecamatan
    const byKec=new Map();
    bases.forEach(x=>{if(x.kecamatan)byKec.set(x.kecamatan,(byKec.get(x.kecamatan)||0)+1);});
    const kecList=[...byKec.entries()].sort((a,b)=>b[1]-a[1]);
    const maxKec=kecList.length?kecList[0][1]:1;
    const kecChart=$('lpgdKecChart');
    if(kecChart){
      kecChart.innerHTML=kecList.map(([kec,cnt])=>`
        <div class="dir-bar-row">
          <span class="dir-bar-label" title="${esc(kec)}">${esc(kec)}</span>
          <div class="dir-bar-track"><div class="dir-bar-fill" style="width:${(cnt/maxKec*100).toFixed(1)}%;--bar-color:linear-gradient(90deg,#2563EB,#06B6D4)"></div></div>
          <span class="dir-bar-value">${cnt}</span>
        </div>`).join('')||'<p style="color:#94A3B8;font-size:.7rem">Belum ada data.</p>';
      $('lpgdKecTotal').textContent=`${kecList.length} kecamatan`;
    }

    // Bar chart: top agen berdasarkan jumlah pangkalan
    const byAgent=new Map();
    bases.forEach(x=>{if(x.agentId){const name=x.agentName||x.agentId;byAgent.set(name,(byAgent.get(name)||0)+1);}});
    const agentList=[...byAgent.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10);
    const maxAgent=agentList.length?agentList[0][1]:1;
    const agentChart=$('lpgdAgentChart');
    if(agentChart){
      agentChart.innerHTML=agentList.map(([name,cnt])=>`
        <div class="dir-bar-row">
          <span class="dir-bar-label" title="${esc(name)}">${esc(name)}</span>
          <div class="dir-bar-track"><div class="dir-bar-fill" style="width:${(cnt/maxAgent*100).toFixed(1)}%;--bar-color:linear-gradient(90deg,#059669,#10B981)"></div></div>
          <span class="dir-bar-value">${cnt}</span>
        </div>`).join('')||'<p style="color:#94A3B8;font-size:.7rem">Belum ada data.</p>';
      $('lpgdAgentChartTotal').textContent=`Top ${agentList.length} agen`;
    }

    // GPS donut via proportion bar
    const gpsBar=$('lpgdGpsBar');
    if(gpsBar&&bases.length){
      const pct=Math.round(gpsCount/bases.length*100);
      gpsBar.innerHTML=`
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:.72rem;font-weight:800;color:#0F2C59">Kualitas Koordinat Pangkalan</span>
          <span style="font-size:.72rem;font-weight:900;color:#059669">${pct}% GPS</span>
        </div>
        <div style="height:18px;background:#FEF3C7;border-radius:9px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#059669,#10B981);border-radius:9px;transition:width .5s ease"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:.62rem;font-weight:700">
          <span style="color:#059669">✓ GPS: ${gpsCount}</span>
          <span style="color:#B45309">⚠ Indikatif: ${indCount}</span>
        </div>`;
    }

    // Insight text
    const insight=$('lpgdInsight');
    if(insight){
      const topKec=kecList[0];
      const topAgent=agentList[0];
      insight.innerHTML=`<strong>Ringkasan:</strong> Dari <strong>${bases.length}</strong> pangkalan aktif yang terdaftar, <strong>${gpsCount}</strong> (${Math.round(gpsCount/Math.max(bases.length,1)*100)}%) memiliki koordinat GPS lapangan terverifikasi. Konsentrasi terbesar berada di <strong>Kecamatan ${topKec?topKec[0]:'—'}</strong> dengan ${topKec?topKec[1]:0} pangkalan. Agen dengan cakupan pangkalan terluas adalah <strong>${topAgent?topAgent[0]:'—'}</strong> (${topAgent?topAgent[1]:0} pangkalan). Data bersumber dari master CMS dan Ditjen Migas, diperbarui secara real-time.`;
    }
  }

  // ── LEGACY: tabel pangkalan lama (untuk kompatibilitas) ───────────────────
  function renderBases(){
    const list=filteredBases(),pages=Math.max(1,Math.ceil(list.length/state.pageSize));state.page=Math.min(state.page,pages);const start=(state.page-1)*state.pageSize,rows=list.slice(start,start+state.pageSize);
    const oldBody=$('lpgdBaseRowsLegacy');if(!oldBody)return;
    oldBody.innerHTML=rows.map(item=>`<tr><td><strong>${esc(item.name)}</strong><small>${esc(item.id)}</small></td><td>${esc(item.agentName||item.agentId||'-')}</td><td>${esc(item.desaKelurahan||'-')}<br><small>Kec. ${esc(item.kecamatan||'-')}</small></td><td>${esc(item.address||'-')}</td><td><span class="quality ${gps(item)?'gps':'indicative'}">${gps(item)?'GPS TERVERIFIKASI':'PERLU VERIFIKASI'}</span></td></tr>`).join('')||'<tr><td colspan="5">Data pangkalan tidak ditemukan sesuai filter.</td></tr>';
    $('lpgdResultInfo').textContent=`${list.length?start+1:0}–${Math.min(start+state.pageSize,list.length)} dari ${list.length} · Hal. ${state.page}/${pages}`;
    $('lpgdPrev').disabled=state.page<=1;$('lpgdNext').disabled=state.page>=pages;
  }

  function render(){renderStats();renderAgents();renderBases();renderBasesTable();renderLpgInfograms();renderMap();}

  function populateDistricts(){
    const current=$('lpgdDistrict').value;$('lpgdDistrict').length=1;
    [...new Set(state.bases.map(x=>x.kecamatan).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id')).forEach(name=>$('lpgdDistrict').add(new Option(name,name)));
    $('lpgdDistrict').value=current;
  }

  function events(){
    // Tab system: Cards | Tabel | Infografis
    document.querySelectorAll('[data-lpg-view]').forEach(btn=>btn.addEventListener('click',()=>{
      const v=btn.dataset.lpgView;
      document.querySelectorAll('[data-lpg-view]').forEach(b=>b.classList.toggle('active',b===btn));
      document.querySelectorAll('[data-lpg-panel]').forEach(p=>p.classList.toggle('active',p.dataset.lpgPanel===v));
    }));
    // Legacy tabs (Agen | Pangkalan)
    document.querySelectorAll('.lpgd-tabs button').forEach(button=>button.addEventListener('click',()=>{
      document.querySelectorAll('.lpgd-tabs button').forEach(x=>x.classList.toggle('active',x===button));
      state.view=button.dataset.view;
      $('lpgdAgentGrid').hidden=state.view!=='agents';
      const baseView=$('lpgdBaseView');if(baseView)baseView.hidden=state.view!=='bases';
    }));
    ['lpgdSearch','lpgdDistrict','lpgdQuality'].forEach(id=>$(id).addEventListener(id==='lpgdSearch'?'input':'change',()=>{state.page=1;state.tablePage=1;render();}));
    // Old pagination
    const prev=$('lpgdPrev'),next=$('lpgdNext');
    if(prev)prev.addEventListener('click',()=>{state.page--;renderBases();});
    if(next)next.addEventListener('click',()=>{state.page++;renderBases();});
    // New table pagination
    const tPrev=$('lpgdTablePrev'),tNext=$('lpgdTableNext');
    if(tPrev)tPrev.addEventListener('click',()=>{state.tablePage--;renderBasesTable();});
    if(tNext)tNext.addEventListener('click',()=>{state.tablePage++;renderBasesTable();});
  }

  async function init(){
    initMap();events();
    if(window.initLpgDatabase)initLpgDatabase();
    state.agents=getLpgStore(LPG_STORAGE_KEYS.AGENTS,[]);
    state.bases=getLpgStore(LPG_STORAGE_KEYS.PANGKALAN,[]);
    populateDistricts();render();
    if(window.loadCanonicalLpgMasterOnce){
      const data=await loadCanonicalLpgMasterOnce();
      state.agents=data.agents;state.bases=data.pangkalan;populateDistricts();render();
    }
    if(window.subscribeCanonicalLpgMaster)window.__lpgDirectoryUnsubscribe=subscribeCanonicalLpgMaster(data=>{state.agents=data.agents;state.bases=data.pangkalan;populateDistricts();render();});
  }
  document.addEventListener('DOMContentLoaded',init);
})();
