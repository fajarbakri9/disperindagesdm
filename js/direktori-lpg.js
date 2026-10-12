(function(){
  'use strict';
  const state={agents:[],bases:[],quotaData:null,septemberReport:null,octoberReport:null,distributionByPangkalanId:new Map(),view:'cards',page:1,pageSize:25,tablePage:1};
  let map,layers={};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const valid=(lat,lng)=>Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))&&Number(lat)>=-4.35&&Number(lat)<=-3.1&&Number(lng)>=119.05&&Number(lng)<=120.2;
  // Satu pembacaan kanonis untuk skema lama dan baru. Koordinat dari dokumen
  // tetap dihitung "tersedia", tetapi bukan GPS lapangan tanpa verifikasi eksplisit.
  const verificationStatus=item=>String(item?.location?.verificationStatus||item?.locationVerification?.status||item?.verificationStatus||'').trim().toLowerCase();
  const gps=item=>{const fieldStatus=String(item?.location?.verificationStatus||item?.locationVerification?.status||'').trim().toLowerCase();return item?.gpsVerified===true||['verified','terverifikasi_faktual'].includes(fieldStatus);};
  const pointFor=item=>{const point=typeof getCanonicalLpgPoint==='function'?getCanonicalLpgPoint(item):null;const lat=point?.latitude??item?.latitude??item?.lat,lng=point?.longitude??item?.longitude??item?.lng;return valid(lat,lng)?{lat:Number(lat),lng:Number(lng)}:null;};
  const documentCoordinate=item=>String(item?.pointType||'').toUpperCase()==='DOCUMENT_COORDINATE'||verificationStatus(item)==='document-sourced';
  const duplicateDocumentCoordinate=item=>verificationStatus(item)==='duplicate-coordinate-review'||Number(item?.coordinateDuplicateCount)>1;
  const locationQuality=item=>gps(item)?'GPS':!pointFor(item)?'UNMAPPED':duplicateDocumentCoordinate(item)?'DUPLICATE':documentCoordinate(item)?'DOCUMENT':'ADMIN';
  const locationBadge=item=>({GPS:['gps','✓ GPS lapangan'],DOCUMENT:['document','▣ Koordinat dokumen'],DUPLICATE:['duplicate','⚠ Koordinat ganda'],ADMIN:['indicative','△ Referensi administratif'],UNMAPPED:['unmapped','— Belum dipetakan']}[locationQuality(item)]);
  const active=item=>!item.isDeleted&&String(item.status||'ACTIVE').toUpperCase()!=='INACTIVE';
  const pointForAgent=agent=>{const point=getCanonicalLpgPoint(agent);if(point)return{lat:point.latitude,lng:point.longitude,indicative:!gps(agent)};return null;};
  const distributionFor=item=>state.distributionByPangkalanId.get(item.id)||null;
  const periodLabel=period=>new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(`${period}-01T00:00:00+08:00`));
  const distributionHtml=item=>{const d=distributionFor(item);if(!d)return'';const allocation=Number.isFinite(Number(d.allocation))?`Alokasi ${Number(d.allocation).toLocaleString('id-ID')} tabung · `:'';return`<hr><b>Penyaluran ${esc(periodLabel(d.period))}</b><br>${Number(d.grandTotal).toLocaleString('id-ID')} tabung <small>(${Number(d.totalNormal).toLocaleString('id-ID')} normal + ${Number(d.totalFacultative).toLocaleString('id-ID')} fakultatif)</small><br><small>${allocation}sumber laporan agen</small>`;};

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
      return(!q||hay.includes(q))&&(!district||item.kecamatan===district)&&(!quality||locationQuality(item)===quality);
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
    const coordinateCount=bases.filter(pointFor).length;
    const verifiedCount=bases.filter(gps).length;
    const duplicateCount=bases.filter(item=>pointFor(item)&&duplicateDocumentCoordinate(item)).length;
    const documentCount=bases.filter(item=>pointFor(item)&&!gps(item)&&documentCoordinate(item)&&!duplicateDocumentCoordinate(item)).length;
    const referenceCount=Math.max(0,coordinateCount-documentCount-duplicateCount-verifiedCount);
    const missingCount=bases.length-coordinateCount;
    $('lpgdAgentCount').textContent=state.agents.filter(active).length.toLocaleString('id-ID');
    $('lpgdBaseCount').textContent=bases.length.toLocaleString('id-ID');
    $('lpgdCoordinateCount').textContent=coordinateCount.toLocaleString('id-ID');
    $('lpgdGpsVerifiedCount').textContent=verifiedCount.toLocaleString('id-ID');
    $('lpgdCoordinateDetail').textContent=[documentCount?`${documentCount.toLocaleString('id-ID')} dokumen belum dinilai`:'',duplicateCount?`${duplicateCount.toLocaleString('id-ID')} koordinat ganda`:'',referenceCount?`${referenceCount.toLocaleString('id-ID')} referensi administratif`:'',missingCount?`${missingCount.toLocaleString('id-ID')} belum dipetakan`:''].filter(Boolean).join(' · ')||'Seluruh koordinat tersedia telah terverifikasi';
    $('lpgdGpsPendingDetail').textContent=`${(bases.length-verifiedCount).toLocaleString('id-ID')} menunggu verifikasi lapangan`;
  }

  function formatNumber(value,maximumFractionDigits=0){return Number(value).toLocaleString('id-ID',{maximumFractionDigits});}

  function renderQuota(){
    const host=$('lpgQuotaContent'),period=$('lpgQuotaPeriod');if(!host)return;
    const data=state.quotaData;
    if(!data){host.className='lpgd-quota-loading';host.textContent='Ringkasan kuota belum tersedia.';if(period)period.textContent='Data tidak tersedia';return;}
    const quota=data.annualQuota||{},distribution=data.distribution||{},derived=data.derived||{};
    const months=Object.entries(distribution.correctedMonthlyTotals||{});
    const agents=[...(distribution.agents||[])].sort((a,b)=>b.total-a.total);
    const maxMonth=Math.max(...months.map(([,value])=>Number(value)),1);
    const pct=Math.max(0,Math.min(100,Number(derived.quotaRealizationPct)||0));
    if(period)period.textContent='Periode data: Januari–Juli 2026';
    host.className='lpgd-quota-content';
    host.innerHTML=`
      <div class="lpgd-quota-kpis">
        <article><span>Kuota tahunan</span><strong>${formatNumber(quota.value)} <small>MT</small></strong><em>Lampiran Ditjen Migas 2026</em></article>
        <article><span>Telah disalurkan</span><strong>${formatNumber(distribution.correctedGrandTotal)} <small>tabung</small></strong><em>9 agen · Januari–Juli</em></article>
        <article><span>Realisasi kuota</span><strong>${formatNumber(pct,2)}<small>%</small></strong><em>${formatNumber(derived.distributedMT,2)} MT tersalurkan</em></article>
        <article><span>Sisa kuota</span><strong>${formatNumber(derived.remainingQuotaMT,2)} <small>MT</small></strong><em>Per 31 Juli 2026</em></article>
      </div>
      <div class="lpgd-quota-progress" aria-label="Realisasi kuota ${formatNumber(pct,2)} persen">
        <div><strong>Realisasi terhadap kuota tahunan</strong><span>${formatNumber(pct,2)}%</span></div>
        <div class="lpgd-quota-track"><i style="width:${pct.toFixed(2)}%"></i></div>
        <small>Kuota ${formatNumber(quota.value)} MT · Realisasi ${formatNumber(derived.distributedMT,2)} MT · Sisa ${formatNumber(derived.remainingQuotaMT,2)} MT</small>
      </div>
      <div class="lpgd-quota-grid">
        <div class="lpgd-quota-panel"><header><div><span>TREN BULANAN</span><h3>Penyaluran Januari–Juli</h3></div><small>Satuan tabung</small></header><div class="lpgd-month-chart">${months.map(([month,value])=>`<div><b>${formatNumber(value)}</b><span class="lpgd-month-bar"><i style="height:${Math.max(5,value/maxMonth*100).toFixed(1)}%"></i></span><small>${new Intl.DateTimeFormat('id-ID',{month:'short'}).format(new Date(month+'-01T00:00:00+08:00'))}</small></div>`).join('')}</div></div>
        <div class="lpgd-quota-panel"><header><div><span>KONTRIBUSI AGEN</span><h3>Realisasi kumulatif</h3></div><small>9 agen</small></header><div class="lpgd-agent-ranking">${agents.map((agent,index)=>`<div><span><b>${index+1}</b>${esc(agent.agentName)}</span><strong>${formatNumber(agent.total)}</strong></div>`).join('')}</div></div>
      </div>
      ${renderSeptemberReport()}
      ${renderOctoberReport()}
      <aside class="lpgd-data-note"><strong>Status data kabupaten:</strong> lengkap untuk sembilan agen sampai 31 Juli 2026. Total Juni dan Juli dihitung ulang dari rincian agen karena total cetak belum memasukkan PT Kiano Energi Utama. Data Agustus yang hanya tersedia untuk tiga agen tidak digabungkan; data September dan Oktober juga memiliki cakupan agen parsial sehingga ketiganya tidak dimasukkan ke realisasi kabupaten.<br><strong>Sumber:</strong> Lampiran 2 Nomor B-113/MG.05/DJM/2026 tanggal 6 Januari 2026, rekap penyaluran 2026, dan laporan sistem Pertamina dari agen.</aside>`;
  }

  function renderSeptemberReport(){
    const report=state.septemberReport;if(!report)return'';
    const totals=report.totals||{},coverage=report.coverage||{},quality=report.dataQuality||{};
    const summaries=report.summaries||[];
    return `<section class="lpgd-period-report" aria-labelledby="lpgdSeptemberTitle">
      <header><div><span>LAPORAN AGEN · CAKUPAN PARSIAL</span><h3 id="lpgdSeptemberTitle">Realisasi September 2026</h3><p>${formatNumber(coverage.reportedAgentCount)} dari ${formatNumber(coverage.officialAgentCount)} agen telah tersedia; angka ini bukan total Kabupaten Pinrang.</p></div><strong>${formatNumber(totals.grandTotal)} <small>tabung</small></strong></header>
      <div class="lpgd-period-kpis"><article><span>Normal</span><b>${formatNumber(totals.totalNormal)}</b><small>tabung</small></article><article><span>Fakultatif</span><b>${formatNumber(totals.totalFacultative)}</b><small>tabung</small></article><article><span>Setara volume</span><b>${formatNumber(totals.metricTons,2)}</b><small>MT</small></article><article><span>ID tervalidasi</span><b>${formatNumber(quality.registrationMatchedRecordCount)}</b><small>dari ${formatNumber(report.recordCount)} baris</small></article></div>
      <div class="lpgd-period-agents">${summaries.map(item=>`<article><div><strong>${esc(item.agentName)}</strong><small>${formatNumber(item.pangkalanCount)} pangkalan · Sold To ${esc(item.soldTo)}</small></div><b>${formatNumber(item.grandTotal)}<small> tabung</small></b><span>${formatNumber(item.totalNormal)} normal + ${formatNumber(item.totalFacultative)} fakultatif</span></article>`).join('')}</div>
      <footer><span>✓ Seluruh ${formatNumber(report.recordCount)} baris lolos validasi aritmetika dan pencocokan ID registrasi.</span><span>Koordinat tersedia ${formatNumber(quality.coordinateAvailableCount)}, tetapi GPS lapangan terverifikasi ${formatNumber(quality.gpsFieldVerifiedCount)}.</span></footer>
    </section>`;
  }

  function renderOctoberReport(){
    const report=state.octoberReport;if(!report)return'';
    const totals=report.totals||{},coverage=report.coverage||{},quality=report.dataQuality||{};
    const summaries=report.summaries||[];
    return `<section class="lpgd-period-report" aria-labelledby="lpgdOctoberTitle">
      <header><div><span>LAPORAN AGEN · CAKUPAN PARSIAL</span><h3 id="lpgdOctoberTitle">Realisasi 1–10 Oktober 2026</h3><p>${formatNumber(coverage.reportedAgentCount)} dari ${formatNumber(coverage.officialAgentCount)} agen telah tersedia; periode Agen 3444 hanya sampai 8 Oktober dan angka ini bukan total Kabupaten Pinrang.</p></div><strong>${formatNumber(totals.grandTotal)} <small>tabung</small></strong></header>
      <div class="lpgd-period-kpis"><article><span>Normal</span><b>${formatNumber(totals.totalNormal)}</b><small>tabung</small></article><article><span>Fakultatif</span><b>${formatNumber(totals.totalFacultative)}</b><small>tabung</small></article><article><span>Setara volume</span><b>${formatNumber(totals.metricTons,2)}</b><small>MT</small></article><article><span>ID terhubung</span><b>${formatNumber(quality.masterMatchedRecordCount)}</b><small>dari ${formatNumber(report.recordCount)} baris</small></article></div>
      <div class="lpgd-period-agents">${summaries.map(item=>`<article><div><strong>${esc(item.agentName)}</strong><small>${formatNumber(item.pangkalanCount)} pangkalan · Sold To ${esc(item.soldTo)}</small></div><b>${formatNumber(item.grandTotal)}<small> tabung</small></b><span>${formatNumber(item.totalNormal??item.grandTotal)} normal + ${formatNumber(item.totalFacultative??0)} fakultatif</span></article>`).join('')}</div>
      <footer><span>✓ ${formatNumber(quality.arithmeticValidatedRecordCount)} baris lolos validasi aritmetika; ${formatNumber(quality.unmatchedIdentityCount)} identitas belum terhubung.</span><span>Cakupan dokumen: 1–8 Oktober untuk Agen 3444; 1–10 Oktober untuk dua agen lainnya.</span></footer>
    </section>`;
  }

  function renderMap(){
    Object.values(layers).forEach(l=>l.clearLayers());const bounds=[];
    filteredAgents().forEach(agent=>{const p=pointForAgent(agent);if(!p)return;const count=state.bases.filter(x=>x.agentId===agent.id&&active(x)).length;const note=p.indicative?'Koordinat kandidat; perlu verifikasi.':'Koordinat terverifikasi.';L.marker([p.lat,p.lng],{pane:'lpgdData',icon:icon('agent','🚚'),zIndexOffset:1100,riseOnHover:true}).bindPopup(`<strong>${esc(agent.name)}</strong><br><small>${esc(agent.id)} · ${count} pangkalan</small><br>${esc(agent.address||'-')}<br><em>${note}</em><br><a href="${esc(agent.googleMapsUrl||`https://www.google.com/maps?q=${p.lat},${p.lng}`)}" target="_blank" rel="noopener">Buka Google Maps ↗</a>`).addTo(layers.agents);bounds.push([p.lat,p.lng]);});
    const groups=new Map();filteredBases().forEach(item=>{const point=getCanonicalLpgPoint(item);if(!point)return;const lat=point.latitude,lng=point.longitude;if(gps(item)){L.marker([lat,lng],{pane:'lpgdData',icon:icon('gps','🔥'),zIndexOffset:1000,riseOnHover:true}).bindPopup(`<strong>${esc(item.name)}</strong><br>${esc(item.desaKelurahan||'-')} · Kec. ${esc(item.kecamatan||'-')}<br><small>${esc(item.agentName||item.agentId||'-')}</small><br><b>GPS terverifikasi</b>${distributionHtml(item)}`).addTo(layers.gps);bounds.push([lat,lng]);return;}const key=`${lat.toFixed(6)},${lng.toFixed(6)}`;if(!groups.has(key))groups.set(key,{lat,lng,items:[]});groups.get(key).items.push(item);});
    groups.forEach(g=>{const s=g.items[0],isDocument=g.items.some(x=>x.verificationStatus==='document-sourced'),isConflict=isDocument&&g.items.length>1;const names=g.items.slice(0,8).map(x=>`${esc(x.name)} <small>(${esc(x.agentName||x.agentId||'-')})</small>`).join('<br>');L.marker([g.lat,g.lng],{pane:'lpgdData',icon:icon('indicative','🔥'),zIndexOffset:900,riseOnHover:true}).bindPopup(`<strong>${esc(s.desaKelurahan||s.kecamatan||'Referensi wilayah')}</strong><br><b style="color:${isConflict?'#B91C1C':'#B45309'}">${isConflict?'PERLU EVALUASI: KOORDINAT SAMA':isDocument?'KOORDINAT DOKUMEN AGEN':'TITIK REFERENSI'}</b><br>${g.items.length} pangkalan pada titik ini<hr>${names}<br><small>${isDocument?'Ditampilkan sesuai dokumen; belum GPS lapangan terverifikasi.':'Bukan koordinat bangunan; verifikasi GPS diperlukan.'}</small>`).addTo(layers.indicative);bounds.push([g.lat,g.lng]);});
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

    if(rows.length===0){tbody.innerHTML=`<tr><td colspan="8" class="dir-table-empty">🔍 Tidak ada pangkalan sesuai filter yang diterapkan.</td></tr>`;
    }else{
      tbody.innerHTML=rows.map((item,idx)=>{
        const [qualityClass,qualityLabel]=locationBadge(item);
        const qBadge=`<span class="dir-badge dir-badge-${qualityClass}">${qualityLabel}</span>`;
        const point=getCanonicalLpgPoint(item);
        const coordStr=point?`${Number(point.latitude).toFixed(5)}, ${Number(point.longitude).toFixed(5)}`:'—';
        const mapsUrl=point?`https://www.google.com/maps?q=${point.latitude},${point.longitude}`:'#';
        const dist=distributionFor(item);
        return`<tr>
          <td style="font-size:.67rem;color:#94A3B8;font-weight:800">${start+idx+1}</td>
          <td><strong>${esc(item.name)}</strong><small>${esc(item.id)}</small></td>
          <td>${esc(item.agentName||item.agentId||'—')}</td>
          <td><strong style="font-size:.74rem">${esc(item.kecamatan||'—')}</strong><small>${esc(item.desaKelurahan||'—')}</small></td>
          <td style="max-width:160px;font-size:.68rem;color:#475569">${esc(item.address||'—')}</td>
          <td>${dist?`<strong>${Number(dist.grandTotal).toLocaleString('id-ID')} tabung</strong><small>${esc(periodLabel(dist.period))}${Number.isFinite(Number(dist.allocation))?` · Alokasi ${Number(dist.allocation).toLocaleString('id-ID')}`:''} · Fakultatif ${Number(dist.totalFacultative).toLocaleString('id-ID')}</small>`:'<small>Belum ada laporan</small>'}</td>
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
    const documentCount=bases.filter(x=>locationQuality(x)==='DOCUMENT').length;
    const duplicateCount=bases.filter(x=>locationQuality(x)==='DUPLICATE').length;
    const adminCount=bases.filter(x=>locationQuality(x)==='ADMIN').length;
    const unmappedCount=bases.filter(x=>locationQuality(x)==='UNMAPPED').length;

    // KPI
    const kpiEl=$('lpgdKpiGrid');
    if(kpiEl){
      const kpis=[
        {label:'Total Agen Aktif',value:agents.length,icon:'🚚',accent:'#2563EB',bg:'#EFF6FF',sub:'Master penyalur Ditjen Migas'},
        {label:'Total Pangkalan',value:bases.length,icon:'🔥',accent:'#059669',bg:'#ECFDF5',sub:'Subpenyalur LPG 3 kg'},
        {label:'GPS Terverifikasi',value:gpsCount,icon:'📍',accent:'#0891B2',bg:'#E0F9FF',sub:'Titik lapangan aktual'},
        {label:'Koordinat Ganda',value:duplicateCount,icon:'⚠',accent:'#DC2626',bg:'#FEF2F2',sub:'Memerlukan verifikasi ulang'},
        {label:'Referensi Administratif',value:adminCount,icon:'△',accent:'#D97706',bg:'#FFFBEB',sub:`${unmappedCount} belum dipetakan`},
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
          <span style="color:#DC2626">⚠ Ganda: ${duplicateCount}</span>
          <span style="color:#B45309">△ Administratif: ${adminCount}</span>
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
    oldBody.innerHTML=rows.map(item=>{const [qualityClass,qualityLabel]=locationBadge(item);return`<tr><td><strong>${esc(item.name)}</strong><small>${esc(item.id)}</small></td><td>${esc(item.agentName||item.agentId||'-')}</td><td>${esc(item.desaKelurahan||'-')}<br><small>Kec. ${esc(item.kecamatan||'-')}</small></td><td>${esc(item.address||'-')}</td><td><span class="quality ${qualityClass}">${qualityLabel}</span></td></tr>`;}).join('')||'<tr><td colspan="5">Data pangkalan tidak ditemukan sesuai filter.</td></tr>';
    $('lpgdResultInfo').textContent=`${list.length?start+1:0}–${Math.min(start+state.pageSize,list.length)} dari ${list.length} · Hal. ${state.page}/${pages}`;
    $('lpgdPrev').disabled=state.page<=1;$('lpgdNext').disabled=state.page>=pages;
  }

  function render(){renderStats();renderQuota();renderAgents();renderBases();renderBasesTable();renderLpgInfograms();renderMap();}

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
    try{const response=await fetch('assets/data/lpg-quota-distribution-2026.json',{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);state.quotaData=await response.json();}catch(error){console.warn('[Direktori LPG] Kuota dan rekap:',error.message);}
    try{
      const responses=await Promise.all(['2026-08','2026-09','2026-10'].map(period=>fetch(`assets/data/lpg-distribution-${period}.json`,{cache:'no-store'})));
      const reports=await Promise.all(responses.map(response=>response.ok?response.json():null));
      state.septemberReport=reports[1];
      state.octoberReport=reports[2];
      reports.filter(Boolean).forEach(report=>(report.records||[]).filter(x=>x.pangkalanId).forEach(row=>state.distributionByPangkalanId.set(row.pangkalanId,row)));
    }catch(error){console.warn('[Direktori LPG] Laporan penyaluran:',error.message);}
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
