/** One-shot LPG schema migration. Dry-run unless --commit is supplied.
 * Requires GOOGLE_APPLICATION_CREDENTIALS and firebase-admin installed outside
 * the public hosting bundle. This script is never loaded by the website.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue, GeoPoint, Timestamp } from 'firebase-admin/firestore';

const commit=process.argv.includes('--commit');
initializeApp({credential:applicationDefault(),projectId:'disperindagesdm-pinrang'});
const db=getFirestore();
const collections=[['lpg_agents','AGENT'],['lpg_pangkalan','OUTLET']];
const valid=(lat,lng)=>Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180;
const statusOf=data=>{
  if(data.location?.verificationStatus)return data.location.verificationStatus;
  if(data.gpsVerified===true||data.locationVerification?.status==='VERIFIED')return 'verified';
  if(/ADMIN_AREA|FALLBACK|CENTROID|REFERENCE/i.test(`${data.sourceType||''} ${data.coordinateStatus||''}`))return 'indicative';
  return 'needs_review';
};
let failures=[],writes=0,read=0;
for(const [name,type] of collections){
  const snapshot=await db.collection(name).get();read+=snapshot.size;
  for(const doc of snapshot.docs){
    const data=doc.data(),lat=Number(data.latitude),lng=Number(data.longitude);
    const point=data.location?.point || (valid(lat,lng)?new GeoPoint(lat,lng):null);
    if(!point){failures.push(`${name}/${doc.id}: lokasi belum tersedia`);continue;}
    const patch={location:{point,accuracyM:Number.isFinite(Number(data.location?.accuracyM))?Number(data.location.accuracyM):null,source:data.location?.source || (statusOf(data)==='indicative'?'administrative_reference':'legacy_migration'),capturedAt:data.location?.capturedAt || null,capturedByUid:data.location?.capturedByUid || 'migration-20260902',verificationStatus:statusOf(data)},updatedAt:Timestamp.now(),updatedBy:'migration-20260902',version:Number(data.version||0)+1,latitude:FieldValue.delete(),longitude:FieldValue.delete(),lat:FieldValue.delete(),lng:FieldValue.delete(),gpsVerified:FieldValue.delete(),locationVerification:FieldValue.delete()};
    if(commit){await doc.ref.update(patch);}writes++;
  }
}
console.log(JSON.stringify({mode:commit?'COMMIT':'DRY_RUN',documentsRead:read,documentsPrepared:writes,issues:failures.length,issueSamples:failures.slice(0,30)},null,2));
if(failures.length)process.exitCode=2;
