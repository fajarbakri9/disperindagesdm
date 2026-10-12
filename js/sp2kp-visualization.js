(function(){
  "use strict";
  const API="https://api-sp2kp.kemendag.go.id/report/api";
  const MAP="https://code.highcharts.com/mapdata/countries/id/id-all.topo.json";
  const rupiah=value=>"Rp "+Math.round(Number(value)||0).toLocaleString("id-ID");
  const iso=value=>{const date=value instanceof Date?value:new Date(value);return Number.isNaN(date.getTime())?"":date.toISOString().slice(0,10)};
  const addDays=(value,days)=>{const date=new Date(`${value}T12:00:00`);date.setDate(date.getDate()+days);return iso(date)};
  const key=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/PROVINSI|DAERAH ISTIMEWA|KEPULAUAN/g,"").replace(/[^A-Z]/g,"");
  const aliases={YOGYAKARTA:"YOGYAKARTA",JAKARTARAYA:"DKIJAKARTA",JAKARTA:"DKIJAKARTA",BANGKABELITUNG:"BANGKABELITUNG"};
  const normalized=value=>aliases[key(value)]||key(value);
  const status=document.getElementById("sp2kpVisualStatus"), commodity=document.getElementById("sp2kpVisualCommodity"), dateInput=document.getElementById("sp2kpVisualDate");
  if(!status||!commodity||!dateInput)return;
  if(typeof Highcharts==="undefined"){status.textContent="Komponen visualisasi belum dapat dimuat. Daftar harga resmi tetap tersedia di bawah.";return}
  let products=[],mapTopology=null,requestToken=0,initialized=false,catalogSource="snapshot Firestore";
  Highcharts.setOptions({lang:{thousandsSep:".",decimalPoint:","},credits:{enabled:false}});
  const empty=(id,message)=>{document.getElementById(id).innerHTML=`<div class="sp2kp-viz-empty">${message}</div>`};
  async function json(url){const response=await fetch(url,{headers:{Accept:"application/json"}});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()}
  async function renderMap(variantId,date,name,token){
    try{
      const [payload,topology]=await Promise.all([json(`${API}/average-price/province-comparison?variant_id=${encodeURIComponent(variantId)}&tanggal=${date}`),mapTopology?Promise.resolve(mapTopology):json(MAP)]); if(token!==requestToken)return; mapTopology=topology;
      const items=payload?.data?.items||[]; if(!items.length){empty("sp2kpProvinceMap","Perbandingan harga antarprovinsi belum tersedia untuk pilihan ini.");return}
      const mapData=Highcharts.geojson(topology); mapData.forEach(point=>{point.sp2kpKey=normalized(point.name)});
      const data=items.map(item=>({sp2kpKey:normalized(item.nama_provinsi),name:item.nama_provinsi,value:Number(item.disparitas_pct)||0,harga:Number(item.harga)||0,hargaSebelumnya:Number(item.harga_sebelumnya)||0}));
      Highcharts.mapChart("sp2kpProvinceMap",{chart:{map:mapData,backgroundColor:"transparent",spacing:[4,4,4,4]},title:{text:null},mapNavigation:{enabled:true,buttonOptions:{verticalAlign:"bottom"}},colorAxis:{dataClasses:[{to:-.01,color:"#168a57",name:"Turun"},{from:-.01,to:.01,color:"#b8de72",name:"Tetap"},{from:.01,to:5,color:"#f6b044",name:"Naik"},{from:5,color:"#dc3545",name:"Naik > 5%"}]},legend:{enabled:false},tooltip:{useHTML:true,pointFormat:"<b>{point.name}</b><br>Harga: <b>Rp {point.harga:,.0f}</b><br>Sebelumnya: Rp {point.hargaSebelumnya:,.0f}<br>Perubahan: <b>{point.value:.2f}%</b>"},series:[{mapData,data,joinBy:["sp2kpKey","sp2kpKey"],name:"Perubahan",borderColor:"#ffffff",borderWidth:.7,nullColor:"#e8edf3",states:{hover:{color:"#2563eb"}}}]});
      document.getElementById("sp2kpMapCommodity").textContent=name;
    }catch(error){console.warn("SP2KP province map:",error);empty("sp2kpProvinceMap","Peta SP2KP sedang tidak dapat dimuat. Daftar harga di bawah tetap menggunakan snapshot resmi yang tersimpan.")}
  }
  async function renderTrend(variantId,date,name,token){
    try{
      const start=addDays(date,-30),payload=await json(`${API}/hnt/history-series?variant_id=${encodeURIComponent(variantId)}&tanggal_start=${start}&tanggal_end=${date}`); if(token!==requestToken)return;
      const items=Array.isArray(payload?.data)?payload.data:[]; if(!items.length){empty("sp2kpTrendChart","Seri HNT 30 hari belum tersedia untuk pilihan ini.");return}
      const data=items.map(item=>[Date.parse(`${item.tanggal_data}T00:00:00+08:00`),Number(item.harga)||0]);
      Highcharts.chart("sp2kpTrendChart",{chart:{type:"spline",backgroundColor:"transparent",spacing:[8,6,4,2]},title:{text:null},xAxis:{type:"datetime",lineColor:"#d9e2ef",tickColor:"#d9e2ef",labels:{style:{fontSize:"10px",color:"#718096"}}},yAxis:{title:{text:null},gridLineColor:"#e8edf4",labels:{formatter(){return "Rp "+Highcharts.numberFormat(this.value,0,",", ".")},style:{fontSize:"10px",color:"#718096"}}},legend:{enabled:false},tooltip:{xDateFormat:"%d %b %Y",pointFormat:`${name}<br><b>Rp {point.y:,.0f}</b>`},series:[{name,data,color:"#2563eb",lineWidth:3,marker:{enabled:true,radius:3,fillColor:"#fff",lineColor:"#2563eb",lineWidth:2}}]});
      document.getElementById("sp2kpTrendLatest").textContent=rupiah(data[data.length-1][1]);
    }catch(error){console.warn("SP2KP HNT trend:",error);empty("sp2kpTrendChart","Grafik HNT SP2KP sedang tidak dapat dimuat. Silakan coba beberapa saat lagi.")}
  }
  function refresh(){const selected=products.find(item=>String(item.variantId)===commodity.value);if(!selected||!dateInput.value)return;const token=++requestToken;status.textContent=`Memuat ${selected.commodityName} untuk tanggal ${dateInput.value} dari SP2KP…`;Promise.allSettled([renderMap(selected.variantId,dateInput.value,selected.commodityName,token),renderTrend(selected.variantId,dateInput.value,selected.commodityName,token)]).then(()=>{if(token===requestToken)status.textContent=`Visualisasi ${selected.commodityName} • data ${dateInput.value} • katalog dari ${catalogSource}.`})}
  function initialize(items,source="snapshot Firestore"){products=items.filter(item=>item.variantId&&item.commodityName&&Number(item.sourcePrice)>0).sort((a,b)=>a.commodityName.localeCompare(b.commodityName,"id"));if(!products.length)return false;catalogSource=source;initialized=true;commodity.innerHTML=products.map(item=>`<option value="${item.variantId}">${item.commodityName}</option>`).join("");const latest=products.map(item=>item.dataDate).filter(Boolean).sort().pop()||iso(new Date());dateInput.value=latest;dateInput.max=iso(new Date());refresh();return true}
  async function initializeFromOfficialApi(reason){
    try{
      let items=[];
      for(let offset=0;offset<7&&!items.some(item=>item.sourcePrice>0);offset++){
        const target=addDays(iso(new Date()),-offset),previous=addDays(target,-1),form=new FormData();
        form.append("tanggal",target);form.append("tanggal_pembanding",previous);form.append("kode_provinsi","73");form.append("kode_kab_kota","7315");
        const response=await fetch(`${API}/average-price/generate-perbandingan-harga`,{method:"POST",body:form,headers:{Accept:"application/json"}});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const payload=await response.json();
        items=(Array.isArray(payload?.data)?payload.data:[]).map(item=>({variantId:Number(item.variant_id),commodityName:String(item.variant_nama||"").trim(),unit:String(item.satuan_display||"kg").toLowerCase(),sourcePrice:Number(item.harga)||0,dataDate:target}));
      }
      if(!initialize(items,"API resmi SP2KP langsung"))throw new Error("harga aktif tujuh hari terakhir belum tersedia");
      console.warn("SP2KP memakai katalog API resmi langsung:",reason);
    }catch(error){
      console.warn("SP2KP direct catalog:",error);
      commodity.innerHTML='<option value="">Data SP2KP belum tersedia</option>';
      empty("sp2kpProvinceMap","Visualisasi belum dapat dimuat dari Firestore maupun API resmi SP2KP.");
      empty("sp2kpTrendChart","Visualisasi belum dapat dimuat dari Firestore maupun API resmi SP2KP.");
      status.textContent="Sumber data SP2KP sementara tidak dapat dijangkau. Silakan coba kembali.";
    }
  }
  commodity.addEventListener("change",refresh);dateInput.addEventListener("change",refresh);
  if(typeof db!=="undefined"&&db){
    db.collection("market_prices_latest").onSnapshot(snapshot=>{
      const items=[];snapshot.forEach(doc=>items.push(doc.data()));if(!initialize(items))initializeFromOfficialApi("snapshot Firestore kosong")
    },error=>{
      console.warn("SP2KP visualization snapshot:",error);
      status.textContent="Snapshot Firestore tidak tersedia; mencoba API resmi SP2KP…";
      initializeFromOfficialApi(error.code||error.message);
    })
  }else{
    status.textContent="Firestore tidak tersedia; mencoba API resmi SP2KP…";
    initializeFromOfficialApi("Firestore tidak tersedia");
  }
})();
