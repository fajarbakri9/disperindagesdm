(function(global){
  'use strict';
  const MONTHS={januari:1,februari:2,maret:3,april:4,mei:5,juni:6,juli:7,agustus:8,september:9,oktober:10,november:11,desember:12,jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,agu:8,sep:9,okt:10,nov:11,des:12};
  const norm=v=>String(v??'').trim().replace(/\s+/g,' ');
  const slug=v=>norm(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const iso=(y,m,d)=>`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const validDay=(y,m,d)=>{const date=new Date(Date.UTC(y,m-1,d));return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d};
  function period(text){const hit=norm(text).toLowerCase().match(/(?:bulan\s+)?(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|agu|sep|okt|nov|des)\s+(?:tahun\s+)?(20\d{2})/i);return hit?{month:MONTHS[hit[1]],year:Number(hit[2]),label:`${hit[1]} ${hit[2]}`} : null}
  function filenamePeriod(name){return period(String(name).replace(/[_-]/g,' '))}
  function unit(raw){const hit=norm(raw).match(/,\s*1\s*(kg|lt|liter|ltr|gram|gr|ikat|buah|ekor|rak|botol|kaleng|sachet)\s*$/i);return hit?hit[1].toLowerCase().replace(/liter|ltr/,'lt').replace(/^gr$/,'gram'):'kg'}
  function commodity(raw){return norm(raw).replace(/,\s*1\s*(kg|lt|liter|ltr|gram|gr|ikat|buah|ekor|rak|botol|kaleng|sachet)\s*$/i,'').trim()}
  async function hash(buffer){const digest=await crypto.subtle.digest('SHA-256',buffer);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  async function parse(file){
    if(!file||!file.name.match(/\.xlsx?$/i))throw new Error('Pilih file .xls atau .xlsx yang valid.');
    if(file.size>5*1024*1024)throw new Error('Ukuran file melebihi batas 5 MB.');
    if(typeof XLSX==='undefined')throw new Error('Parser Excel tidak tersedia. File tidak diproses dan tidak ada data yang disimpan.');
    const buffer=await file.arrayBuffer(),fileHash=await hash(buffer),book=XLSX.read(buffer,{type:'array',cellDates:true,raw:true});
    if(book.SheetNames.length!==1)throw new Error('Workbook harus berisi tepat satu sheet.');
    const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,defval:null,raw:true});
    const headerIndex=rows.findIndex(r=>r.some(v=>/^sub\s*variant|komoditas|nama barang$/i.test(norm(v))));
    if(headerIndex<0)throw new Error('Kolom komoditas tidak ditemukan berdasarkan kata kunci.');
    const header=rows[headerIndex],nameIndex=header.findIndex(v=>/^sub\s*variant|komoditas|nama barang$/i.test(norm(v))),meta=rows.slice(0,headerIndex).flat().filter(Boolean).join(' '),inside=period(meta),outside=filenamePeriod(file.name);
    if(!inside)throw new Error('Bulan dan tahun laporan tidak ditemukan pada metadata workbook.');
    const detectedDayColumns=header.map((v,i)=>({i,day:Number(v)})).filter(x=>x.i!==nameIndex&&Number.isInteger(x.day)&&x.day>=1&&x.day<=31);
    const invalidDays=detectedDayColumns.filter(x=>!validDay(inside.year,inside.month,x.day)).map(x=>x.day);
    if(invalidDays.length)throw new Error(`Tanggal ${invalidDays.join(', ')} tidak valid untuk periode ${inside.label}. Perbaiki workbook sebelum melanjutkan.`);
    const dayColumns=detectedDayColumns;
    if(!dayColumns.length)throw new Error('Kolom tanggal pemantauan tidak ditemukan.');
    const marketHit=meta.match(/(?:Kab\.?\s*Pinrang[^,]*,\s*)?([^,]+Pasar[^,]*|Pasar\s+[^,]+),?\s*(?:BULAN|bulan)/i);
    const marketName=marketHit?norm(marketHit[1]):'';
    const observations=[],commodities=[];let missing=0;
    rows.slice(headerIndex+1).forEach((row,rowOffset)=>{const raw=norm(row[nameIndex]);if(!raw)return;const item={rawName:raw,name:commodity(raw),unit:unit(raw),key:slug(raw)};commodities.push(item);dayColumns.forEach(col=>{const val=Number(row[col.i]);const valid=Number.isFinite(val)&&val>0;if(!valid)missing++;observations.push({rawCommodityName:raw,commodityName:item.name,rawValue:row[col.i]??null,price:valid?Math.round(val*100)/100:null,unit:item.unit,observationDate:iso(inside.year,inside.month,col.day),dataStatus:valid?'valid':'not_reported',sourceRow:headerIndex+2+rowOffset,sourceColumn:col.i+1})})});
    const unique=[...new Map(commodities.map(x=>[x.key,x])).values()];const mismatch=!outside||outside.month!==inside.month||outside.year!==inside.year;
    return {fileName:file.name,fileSize:file.size,fileHash,sheetName:book.SheetNames[0],marketName,period:inside,filePeriod:outside,periodMismatch:Boolean(mismatch),dayCount:dayColumns.length,commodityCount:unique.length,validCount:observations.length-missing,missingCount:missing,commodities:unique,observations};
  }
  function deterministicId(batchId,row){return `${batchId}_${slug(row.rawCommodityName).slice(0,55)}_${row.observationDate}`}
  async function commit(ctx){
    const {db,firebase,parsed,market,mappings,actor,publish,reviewAcknowledged}=ctx,batchId=`local_${parsed.fileHash.slice(0,24)}`,batchRef=db.collection('marketPriceImportBatches').doc(batchId);
    const prior=await batchRef.get({source:'server'}),priorData=prior.exists?prior.data():null,resumable=priorData&&publish&&['needs_review','failed','staging'].includes(priorData.status);
    if(prior.exists&&!resumable)throw new Error(`File yang sama sudah terdaftar pada batch ${batchId}.`);
    if(resumable&&priorData.marketId!==market.id)throw new Error('Batch review hanya dapat dilanjutkan dengan master pasar yang sama.');
    if(parsed.periodMismatch&&publish&&!reviewAcknowledged)throw new Error('Konflik periode belum disahkan. Konfirmasi penggunaan periode faktual dari metadata workbook.');
    const now=firebase.firestore.FieldValue.serverTimestamp(),status=publish?'staging':'needs_review';
    const opening=db.batch(),eventId=resumable?`${batchId}_resumed_${Date.now()}`:`${batchId}_created`,batchData={batchId,fileName:parsed.fileName,fileHash:parsed.fileHash,fileSize:parsed.fileSize,sheetName:parsed.sheetName,marketId:market.id,marketName:market.name,periodYear:parsed.period.year,periodMonth:parsed.period.month,status,periodMismatch:parsed.periodMismatch,periodReviewAcknowledged:Boolean(reviewAcknowledged),periodSource:'workbook_metadata',commodityCount:parsed.commodityCount,validObservationCount:parsed.validCount,missingObservationCount:parsed.missingCount,updatedAt:now};
    if(resumable)opening.update(batchRef,batchData);else opening.set(batchRef,{...batchData,createdBy:actor.uid,createdByRole:actor.role,createdAt:now});
    opening.set(db.collection('marketPriceAuditLogs').doc(eventId),{eventId,action:resumable?'IMPORT_RESUMED':'IMPORT_CREATED',entityType:'marketPriceImportBatch',entityId:batchId,actorUid:actor.uid,actorRole:actor.role,createdAt:now,details:{fileHash:parsed.fileHash,marketId:market.id,publishRequested:publish,periodReviewAcknowledged:Boolean(reviewAcknowledged),workbookPeriod:`${parsed.period.year}-${String(parsed.period.month).padStart(2,'0')}`,fileNamePeriod:parsed.filePeriod?`${parsed.filePeriod.year}-${String(parsed.filePeriod.month).padStart(2,'0')}`:'not_detected'}});
    await opening.commit();
    if(!publish)return {batchId,status:'needs_review'};
    const valid=parsed.observations.filter(r=>r.dataStatus==='valid'),docs=valid.map(row=>{const map=mappings[row.rawCommodityName];return{id:deterministicId(batchId,row),data:{batchId,status:'staged',dataStatus:'valid',sourceType:'local_market_monitoring',sourceName:'Disperindag ESDM Kabupaten Pinrang',marketId:market.id,marketName:market.name,canonicalCommodityId:map.id,commodityName:map.name,rawCommodityName:row.rawCommodityName,rawValue:row.rawValue,price:row.price,unit:map.unit||row.unit,rawUnit:row.unit,observationDate:row.observationDate,sourceRow:row.sourceRow,sourceColumn:row.sourceColumn,fileHash:parsed.fileHash,createdBy:actor.uid,createdAt:now}}});
    try{
      for(let i=0;i<docs.length;i+=400){const batch=db.batch();docs.slice(i,i+400).forEach(x=>batch.set(db.collection('marketPriceObservations').doc(x.id),x.data));await batch.commit()}
      const publicationRows=docs.map(x=>{const r=x.data;return{canonicalCommodityId:r.canonicalCommodityId,commodityName:r.commodityName,rawCommodityName:r.rawCommodityName,price:r.price,unit:r.unit,rawUnit:r.rawUnit,observationDate:r.observationDate,marketId:r.marketId,marketName:r.marketName,sourceName:r.sourceName}});
      const finalBatch=db.batch();
      finalBatch.set(db.collection('marketPricePublications').doc(batchId),{batchId,status:'published',dataStatus:'valid',marketId:market.id,marketName:market.name,periodYear:parsed.period.year,periodMonth:parsed.period.month,sourceType:'local_market_monitoring',sourceName:'Disperindag ESDM Kabupaten Pinrang',observationCount:publicationRows.length,observations:publicationRows,publishedAt:now});
      finalBatch.update(batchRef,{status:'published',publishedAt:now,updatedAt:now});
      finalBatch.set(db.collection('marketPriceAuditLogs').doc(`${batchId}_published`),{eventId:`${batchId}_published`,action:'IMPORT_PUBLISHED',entityType:'marketPriceImportBatch',entityId:batchId,actorUid:actor.uid,actorRole:actor.role,createdAt:now,details:{observationCount:docs.length}});
      await finalBatch.commit();
      return {batchId,status:'published'};
    }catch(error){try{await batchRef.update({status:'failed',failureMessage:String(error.message||error).slice(0,500),updatedAt:now})}catch(_ignored){}throw new Error(`Impor berhenti aman: ${error.message}. Data parsial tetap tersembunyi.`)}
  }
  global.MarketPriceImporter={parse,commit,slug,period,filenamePeriod};
})(window);
