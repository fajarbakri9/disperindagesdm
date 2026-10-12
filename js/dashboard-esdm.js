(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const set=(id,value)=>{const el=byId(id);if(el)el.textContent=value;};
  function applyDashboardPresentation(){
    if(!document.querySelector('link[data-esdm-dashboard-style]')){
      const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='css/dashboard-esdm.css?v=20261007_lpg_september_v1';stylesheet.dataset.esdmDashboardStyle='true';document.head.appendChild(stylesheet);
    }
    const spbu=byId('kpiSpbu');if(spbu&&spbu.previousElementSibling)spbu.previousElementSibling.textContent='Total SPBU';
    const grid=document.querySelector('.energy-grid');if(grid)grid.classList.add('esdm-sector-grid');
    const mapCard=document.querySelector('.online-main > .notice-card');if(mapCard)mapCard.classList.add('esdm-map-card');
  }
  function countBy(rows,predicate){return rows.filter(predicate).length;}
  function label(value){return String(value||'').trim().toLowerCase();}
  function fuelCategory(row){
    const source=[row.kategori_code,row.jenis_resmi,row.kategori_badge,row.category,row.type,row.jenis,row.kategori,row.outletType,row.nama].map(label).filter(Boolean).join(' ');
    if(/pertashop/.test(source))return'pertashop';
    if(/spbun|nelayan/.test(source))return'nelayan';
    if(/kompak|apms/.test(source))return'kompak';
    if(/spbu|reguler/.test(source))return'reguler';
    return'other';
  }
  function number(value,digits=0){return Number(value).toLocaleString('id-ID',{maximumFractionDigits:digits});}
  function ensureQuotaPanel(){
    if(byId('esdmQuotaPanel'))return byId('esdmQuotaPanel');
    const stateBox=document.querySelector('.online-main .data-state');if(!stateBox)return null;
    const section=document.createElement('section');section.id='esdmQuotaPanel';section.className='esdm-quota';section.setAttribute('aria-labelledby','esdmQuotaTitle');
    section.innerHTML='<div class="esdm-quota-head"><div><span>DATA TERDOKUMENTASI 2026</span><h2 id="esdmQuotaTitle">Kuota dan Realisasi LPG 3 Kg</h2></div><p id="esdmQuotaPeriod">Memuat data…</p></div><div id="esdmQuotaBody" class="esdm-quota-loading" role="status">Menyiapkan data kuota.</div>';
    stateBox.insertAdjacentElement('afterend',section);return section;
  }
  async function loadQuota(){
    if(!ensureQuotaPanel())return;const body=byId('esdmQuotaBody');
    try{
      const response=await fetch('assets/data/lpg-quota-distribution-2026.json',{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json(),quota=data.annualQuota,dist=data.distribution,derived=data.derived;
      const months=Object.entries(dist.correctedMonthlyTotals),max=Math.max(...months.map(([,v])=>v),1),pct=Math.max(0,Math.min(100,Number(derived.quotaRealizationPct)));
      set('esdmQuotaPeriod','Posisi 31 Juli 2026');body.className='esdm-quota-body';
      body.innerHTML=`<div class="esdm-quota-kpis"><article><span>Kuota tahunan</span><strong>${number(quota.value)} <small>MT</small></strong><em>${number(quota.kilograms)} kg</em></article><article><span>Penyaluran</span><strong>${number(dist.correctedGrandTotal)} <small>tabung</small></strong><em>9 agen · 7 bulan</em></article><article><span>Realisasi</span><strong>${number(pct,2)}<small>%</small></strong><em>${number(derived.distributedMT,2)} MT</em></article><article><span>Sisa kuota</span><strong>${number(derived.remainingQuotaMT,2)} <small>MT</small></strong><em>berdasarkan realisasi terdokumentasi</em></article></div><div class="esdm-quota-visual"><div class="esdm-progress-card"><div><span>Serapan kuota tahunan</span><b>${number(pct,2)}%</b></div><div class="esdm-progress"><i style="width:${pct.toFixed(2)}%"></i></div><small>Realisasi Januari–Juli dibandingkan kuota LPG 3 kg Kabupaten Pinrang tahun 2026.</small></div><div class="esdm-mini-chart" aria-label="Grafik penyaluran bulanan">${months.map(([month,value])=>`<div><b>${number(value)}</b><span><i style="height:${Math.max(6,value/max*100).toFixed(1)}%"></i></span><small>${new Intl.DateTimeFormat('id-ID',{month:'short'}).format(new Date(month+'-01T00:00:00+08:00'))}</small></div>`).join('')}</div></div><div class="esdm-quota-foot"><span><b>Lengkap:</b> sembilan agen, Januari–Juli 2026</span><span><b>Sumber:</b> Lampiran Ditjen Migas dan rekap penyaluran 2026</span><a href="direktori-lpg.html#lpgQuotaSection">Lihat rincian agen →</a></div>`;
    }catch(error){console.warn('[Dashboard ESDM] Kuota LPG:',error);if(body){body.className='esdm-quota-loading error';body.textContent='Data kuota dan realisasi belum dapat dimuat. Tidak ada angka perkiraan yang ditampilkan.';}set('esdmQuotaPeriod','Data tidak tersedia');}
  }
  async function loadSeptemberDistribution(){
    const panel=ensureQuotaPanel(),body=byId('esdmQuotaBody');if(!panel||!body)return;
    try{
      const response=await fetch('assets/data/lpg-distribution-2026-09.json',{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const report=await response.json(),totals=report.totals||{},coverage=report.coverage||{},summaries=report.summaries||[];
      const section=document.createElement('section');section.className='esdm-lpg-period';section.setAttribute('aria-label','Realisasi LPG September 2026 dengan cakupan parsial');
      section.innerHTML=`<header><div><span>LAPORAN TERBARU · CAKUPAN PARSIAL</span><h3>Realisasi September 2026</h3><p>${number(coverage.reportedAgentCount)} dari ${number(coverage.officialAgentCount)} agen · bukan total kabupaten</p></div><strong>${number(totals.grandTotal)} <small>tabung</small></strong></header><div class="esdm-lpg-period-grid"><article><span>Normal</span><b>${number(totals.totalNormal)}</b></article><article><span>Fakultatif</span><b>${number(totals.totalFacultative)}</b></article><article><span>Setara volume</span><b>${number(totals.metricTons,2)} MT</b></article></div><div class="esdm-lpg-agent-list">${summaries.map(item=>`<div><span>${item.agentName}<small>${number(item.pangkalanCount)} pangkalan</small></span><b>${number(item.grandTotal)}</b></div>`).join('')}</div><footer>Seluruh ${number(report.recordCount)} baris lolos validasi aritmetika dan pencocokan ID registrasi.</footer>`;
      body.insertAdjacentElement('afterend',section);
    }catch(error){console.warn('[Dashboard ESDM] Distribusi LPG September:',error.message);}
  }
  async function load(){
    const retry=byId('energyRetry'); if(retry)retry.hidden=true;
    set('energyState','Memuat data energi terpublikasi…');
    if(typeof db==='undefined'||!db){set('energyState','Data belum dapat dimuat saat ini.');if(retry)retry.hidden=false;return;}
    try{
      const [agents,bases,fuel]=await Promise.all([
        db.collection('lpg_agents').get({source:'server'}),
        db.collection('lpg_pangkalan').get({source:'server'}),
        db.collection('bbm_outlets').get({source:'server'})
      ]);
      const agentRows=agents.docs.map(d=>d.data());
      const baseRows=bases.docs.map(d=>d.data());
      const fuelRows=fuel.docs.map(d=>d.data());
      set('kpiAgents',agentRows.length.toLocaleString('id-ID'));
      set('kpiBases',baseRows.length.toLocaleString('id-ID'));
      set('kpiFuel',fuelRows.length.toLocaleString('id-ID'));
      const categoryCounts=fuelRows.reduce((counts,row)=>{const category=fuelCategory(row);counts[category]=(counts[category]||0)+1;return counts;},{reguler:0,kompak:0,nelayan:0,pertashop:0,other:0});
      set('kpiSpbu',(categoryCounts.reguler+categoryCounts.kompak+categoryCounts.nelayan).toLocaleString('id-ID'));
      set('bbmRegular',categoryCounts.reguler.toLocaleString('id-ID'));
      set('bbmCompact',categoryCounts.kompak.toLocaleString('id-ID'));
      set('bbmFisher',categoryCounts.nelayan.toLocaleString('id-ID'));
      set('bbmPertashop',categoryCounts.pertashop.toLocaleString('id-ID'));
      set('bbmOther',categoryCounts.other.toLocaleString('id-ID'));
      if(categoryCounts.other>0&&!byId('bbmOther')){
        const list=document.querySelector('.energy-card .feature-list');
        if(list){const item=document.createElement('li');item.append('Kategori lainnya: ');const value=document.createElement('strong');value.id='bbmOther';value.textContent=categoryCounts.other.toLocaleString('id-ID');item.appendChild(value);list.appendChild(item);}
      }
      const now=new Intl.DateTimeFormat('id-ID',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Makassar'}).format(new Date());
      set('energyUpdated',now+' WITA'); set('energyState','Data resmi berhasil dimuat dari Firestore Project A.');
    }catch(error){console.error('[Dashboard ESDM]',error);set('energyState','Data belum dapat dimuat saat ini. Tidak ada angka pengganti yang ditampilkan.');if(retry)retry.hidden=false;}
  }
  document.addEventListener('DOMContentLoaded',async()=>{applyDashboardPresentation();ensureQuotaPanel();const retry=byId('energyRetry');if(retry)retry.addEventListener('click',load);await loadQuota();loadSeptemberDistribution();load();});
})();
