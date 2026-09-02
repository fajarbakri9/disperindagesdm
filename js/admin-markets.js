(function (window) {
  'use strict';
  let initialized=false;
  const esc=value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  window.initAdminMarkets=function () {
    if (initialized) { render(); return; }
    initialized=true; render();
    MarketEngine.initRealtimeSync(render);
    const search=document.getElementById('adminMarketSearch');
    if (search) search.addEventListener('input',render);
  };

  function render() {
    const body=document.getElementById('adminMarketsTableBody'); if (!body) return;
    const query=(document.getElementById('adminMarketSearch')?.value || '').toLowerCase().trim();
    const all=MarketEngine.getAll();
    const rows=all.filter(m => !query || [m.nama,m.kecamatan,m.desaKelurahan,m.unitPengelola].some(v => String(v||'').toLowerCase().includes(query)));
    document.getElementById('adminMarketTotal').textContent=all.length;
    document.getElementById('adminMarketMapped').textContent=all.filter(m => MarketEngine.validCoordinate(m.latitude,m.longitude)).length;
    document.getElementById('adminMarketNeedsReview').textContent=all.filter(m => m.statusOperasional === 'perlu-verifikasi' || !MarketEngine.validCoordinate(m.latitude,m.longitude)).length;
    body.innerHTML=rows.map(m => `<tr>
      <td><strong>${esc(m.nama)}</strong><br><small>${esc(m.namaGoogleMaps || m.namaAlternatif || '-')}</small></td>
      <td><strong>${esc(m.kecamatan)}</strong><br><small>${esc(m.desaKelurahan || '-')}</small></td>
      <td>${esc(m.kategoriPengelolaan || '-')}<br><small>${esc(m.unitPengelola || '-')}</small></td>
      <td><span class="badge-cat">${esc(m.statusLabel || m.statusOperasional)}</span><br><small>${esc(m.statusKoordinat || '-')}</small></td>
      <td><code>${m.latitude ?? '-'}</code><br><code>${m.longitude ?? '-'}</code></td>
      <td><button class="btn-action-item btn-action-edit" type="button" onclick="openEditMarketModal('${esc(m.id)}')">✏️ Edit</button></td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:28px;">Data pasar tidak ditemukan.</td></tr>';
  }

  window.openEditMarketModal=function (id) {
    const m=MarketEngine.getById(id); if (!m) return;
    CustomModal.form({title:`Edit Master Pasar: ${m.nama}`,icon:'🏬',width:'760px',fields:[
      {name:'nama',label:'Nama Database',type:'text',required:true,value:m.nama},
      {name:'namaGoogleMaps',label:'Nama di Google Maps',type:'text',value:m.namaGoogleMaps||''},
      {name:'kategoriPengelolaan',label:'Kategori Pengelolaan',type:'select',value:m.kategoriPengelolaan||'Pasar Rakyat Lainnya',options:['Pasar Pemda','Pasar Rakyat Lainnya']},
      {name:'unitPengelola',label:'UPTD / Pengelola',type:'text',value:m.unitPengelola||''},
      {name:'statusOperasional',label:'Status Operasional',type:'select',value:m.statusOperasional,options:[{value:'aktif',label:'Aktif'},{value:'tidak-aktif',label:'Tidak Aktif'},{value:'perlu-verifikasi',label:'Perlu Verifikasi'}]},
      {name:'kecamatan',label:'Kecamatan',type:'text',required:true,value:m.kecamatan},
      {name:'desaKelurahan',label:'Desa / Kelurahan',type:'text',value:m.desaKelurahan||''},
      {name:'alamat',label:'Alamat Google Maps',type:'textarea',rows:2,value:m.alamat||''},
      {name:'latitude',label:'Latitude',type:'number',value:m.latitude??'',step:'any'},
      {name:'longitude',label:'Longitude',type:'number',value:m.longitude??'',step:'any'},
      {name:'plusCode',label:'Plus Code',type:'text',value:m.plusCode||''},
      {name:'jadwalGoogleMaps',label:'Hari / Jam Operasional',type:'text',value:m.jadwalGoogleMaps||m.jamOperasional||''},
      {name:'googleMapsUrl',label:'Link Profil Google Maps',type:'text',value:m.googleMapsUrl||''},
      {name:'fotoUtama',label:'URL / Path Foto Utama',type:'text',value:m.fotoUtama||''},
      {name:'catatanVerifikasi',label:'Catatan Verifikasi',type:'textarea',rows:2,value:m.catatanVerifikasi||''}
    ],onSubmit:async vals => {
      const statusLabels={'aktif':'Aktif','tidak-aktif':'Tidak Aktif','perlu-verifikasi':'Perlu Verifikasi'};
      const latitude=vals.latitude===''?null:Number(vals.latitude), longitude=vals.longitude===''?null:Number(vals.longitude);
      const coordinateChanged=latitude!==Number(m.latitude)||longitude!==Number(m.longitude);
      const generatedMapsUrl=MarketEngine.validCoordinate(latitude,longitude)?`https://www.google.com/maps/search/?api=1&query=${latitude}%2C${longitude}`:'';
      const updated={...m,...vals,latitude,longitude,googleMapsUrl:vals.googleMapsUrl.trim()&&(!coordinateChanged||vals.googleMapsUrl.trim()!==String(m.googleMapsUrl||'').trim())?vals.googleMapsUrl.trim():generatedMapsUrl,statusKoordinat:MarketEngine.validCoordinate(latitude,longitude)?'CMS_Diperbarui':'PERLU_VERIFIKASI',statusLabel:statusLabels[vals.statusOperasional],updatedBy:auth?.currentUser?.uid||'CMS Administrator'};
      try { const result=await MarketEngine.save(updated); render(); CustomModal.toast(result.cloud.success?'Data pasar tersimpan dan tersinkron.':'Data pasar tersimpan lokal; sinkronisasi cloud tertunda.',result.cloud.success?'success':'warning'); }
      catch(error){ CustomModal.alert({title:'Data Tidak Dapat Disimpan',message:esc(error.message),type:'error',icon:'⚠️'}); }
    }});
  };
})(window);
