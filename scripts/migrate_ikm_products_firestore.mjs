import fs from 'node:fs';
import vm from 'node:vm';

const project='disperindagesdm-pinrang';
const apiKey='AIzaSyD4J1kidUcBcz7EdmYRIY66YR5jOEO477I';
const source=fs.readFileSync(new URL('../js/data.js',import.meta.url),'utf8');
const start=source.indexOf('const DEFAULT_PRODUCTS_IKM = [');
const end=source.indexOf('\n];',start);
if(start<0||end<0)throw new Error('Master produk IKM tidak ditemukan');
const expression=source.slice(source.indexOf('[',start),end+2);
const products=vm.runInNewContext(`(${expression})`);

function value(v){
  if(v===null||v===undefined)return {nullValue:null};
  if(Array.isArray(v))return {arrayValue:{values:v.map(value)}};
  if(typeof v==='object')return {mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,value(x)]))}};
  if(typeof v==='boolean')return {booleanValue:v};
  if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
  return {stringValue:String(v)};
}

for(const product of products){
  const payload={...product,published:true,dataVersion:'2026-09-02-ikm-firestore-master-v1',source:'CMS Katalog Produk IKM Disperindag ESDM Pinrang'};
  const fields=Object.fromEntries(Object.entries(payload).map(([k,v])=>[k,value(v)]));
  const url=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/ikm_products/${encodeURIComponent(product.id)}?key=${apiKey}`;
  const response=await fetch(url,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({fields})});
  if(!response.ok)throw new Error(`${product.id}: ${response.status} ${await response.text()}`);
  console.log(`uploaded ${product.id}`);
}
console.log(`Master Firestore IKM siap: ${products.length} produk`);
