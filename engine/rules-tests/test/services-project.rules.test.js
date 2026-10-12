import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, query, where, serverTimestamp, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
let env;

describe('Project B services boundary', () => {
  before(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-disperindagesdm-pinrang-services',
      firestore: { rules: fs.readFileSync(path.join(root, 'services-project/firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8180 },
    });
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async context => {
      const db=context.firestore();
      await setDoc(doc(db,'serviceDefinitions/sipk'),{schemaVersion:1,code:'SIPK',status:'development',acceptingApplications:false});
      await setDoc(doc(db,'serviceDefinitions/test-active'),{schemaVersion:1,code:'TEST',status:'active',acceptingApplications:true});
      await setDoc(doc(db,'publicServiceCatalog/current'),{schemaVersion:1,services:[{code:'SIPK',status:'development'}]});
      await setDoc(doc(db,'publicDocumentVerification/'+'a'.repeat(64)),{schemaVersion:1,updatedAt:new Date(),verification:{documentType:'SIPK',documentStatus:'issued'}});
      await setDoc(doc(db,'serviceUsers/verifier'),{status:'active',role:'application_verifier'});
      await setDoc(doc(db,'serviceUsers/admin'),{status:'active',role:'services_super_admin'});
      await setDoc(doc(db,'serviceUsers/responsible'),{status:'active',role:'market_responsible_officer'});
      await setDoc(doc(db,'serviceUsers/head'),{status:'active',role:'head_of_department'});
      await setDoc(doc(db,'serviceUsers/operator'),{status:'active',role:'document_operator'});
      await setDoc(doc(db,'serviceApplications/existing'),{schemaVersion:1,serviceDefinitionId:'test-active',serviceCode:'TEST',applicantUid:'applicant-a',currentStatus:'submitted',createdAt:new Date(),updatedAt:new Date()});
      await setDoc(doc(db,'auditLogs/private'),{action:'submitted'});
      await setDoc(doc(db,'documentNumberCounters/SIPK_2026'),{schemaVersion:1,series:'SIPK',year:2026,lastSequence:1});
      await setDoc(doc(db,'documentNumberReservations/reservation-1'),{schemaVersion:1,applicationId:'existing',applicantUid:'applicant-a',series:'SIPK',year:2026,sequence:1});
      await setDoc(doc(db,'rateLimitCounters/counter-1'),{schemaVersion:1,keyRef:'a'.repeat(64),count:1});
    });
  });
  after(async()=>env.cleanup());

  it('Project B allows anonymous reads only for explicit public projections', async()=>{
    const db=env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db,'publicServiceCatalog/current')));
    await assertSucceeds(getDoc(doc(db,'publicDocumentVerification/'+'a'.repeat(64))));
    await assertFails(setDoc(doc(db,'publicDocumentVerification/client-write'),{documentStatus:'issued'}));
    await assertFails(getDoc(doc(db,'serviceDefinitions/sipk')));
    await assertFails(getDoc(doc(db,'serviceApplications/existing')));
    await assertFails(getDoc(doc(db,'auditLogs/private')));
    await assertFails(getDocs(collection(db,'serviceApplications')));
  });

  it('Project B allows applicant list only when constrained to own uid', async()=>{
    const db=env.authenticatedContext('applicant-a').firestore();
    await assertSucceeds(getDocs(query(collection(db,'serviceApplications'),where('applicantUid','==','applicant-a'))));
    await assertFails(getDocs(collection(db,'serviceApplications')));
    await assertFails(getDocs(query(collection(db,'serviceApplications'),where('applicantUid','==','applicant-b'))));
  });

  it('Project B fails closed while SIPK is in development', async()=>{
    const db=env.authenticatedContext('applicant-a').firestore();
    await assertFails(setDoc(doc(db,'serviceApplications/sipk-attempt'),{schemaVersion:1,serviceDefinitionId:'sipk',serviceCode:'SIPK',applicantUid:'applicant-a',currentStatus:'submitted',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
  });

  it('Project B rejects all direct application creates, including otherwise valid owner data', async()=>{
    const db=env.authenticatedContext('applicant-a').firestore();
    await assertFails(setDoc(doc(db,'serviceApplications/valid'),{schemaVersion:1,serviceDefinitionId:'test-active',serviceCode:'TEST',applicantUid:'applicant-a',currentStatus:'submitted',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await assertFails(setDoc(doc(db,'serviceApplications/impersonated'),{schemaVersion:1,serviceDefinitionId:'test-active',serviceCode:'TEST',applicantUid:'someone-else',currentStatus:'submitted',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await assertFails(setDoc(doc(db,'serviceApplications/extra-pii'),{schemaVersion:1,serviceDefinitionId:'test-active',serviceCode:'TEST',applicantUid:'applicant-a',currentStatus:'submitted',nik:'secret',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
  });

  it('Project B separates applicant, verifier, and admin permissions', async()=>{
    const owner=env.authenticatedContext('applicant-a').firestore();
    const stranger=env.authenticatedContext('applicant-b').firestore();
    const verifier=env.authenticatedContext('verifier').firestore();
    const admin=env.authenticatedContext('admin').firestore();
    await assertSucceeds(getDoc(doc(owner,'serviceApplications/existing')));
    await assertFails(getDoc(doc(stranger,'serviceApplications/existing')));
    await assertSucceeds(getDoc(doc(verifier,'serviceApplications/existing')));
    await assertFails(updateDoc(doc(owner,'serviceApplications/existing'),{currentStatus:'verified'}));
    await assertFails(updateDoc(doc(verifier,'serviceApplications/existing'),{currentStatus:'verified',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(verifier,'serviceApplications/existing'),{currentStatus:'under_administrative_review',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(admin,'serviceDefinitions/sipk'),{name:'Surat Izin Pemakaian Kios'}));
    await assertFails(updateDoc(doc(verifier,'serviceDefinitions/sipk'),{status:'active'}));
    await assertFails(deleteDoc(doc(admin,'serviceDefinitions/sipk')));
  });

  it('Project B rejects every privileged workflow mutation from clients', async()=>{
    const verifier=env.authenticatedContext('verifier').firestore();
    const responsible=env.authenticatedContext('responsible').firestore();
    const head=env.authenticatedContext('head').firestore();
    const operator=env.authenticatedContext('operator').firestore();
    const admin=env.authenticatedContext('admin').firestore();
    await assertFails(updateDoc(doc(head,'serviceApplications/existing'),{currentStatus:'head_approved',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(responsible,'serviceApplications/existing'),{currentStatus:'responsible_approved',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(operator,'serviceApplications/existing'),{currentStatus:'document_preparation',updatedAt:serverTimestamp()}));
    await assertFails(updateDoc(doc(admin,'serviceApplications/existing'),{currentStatus:'issued',updatedAt:serverTimestamp()}));
  });

  it('Project B keeps workflow events append-only and audit writes backend-only', async()=>{
    const verifier=env.authenticatedContext('verifier').firestore();
    await assertFails(setDoc(doc(verifier,'workflowEvents/event-1'),{applicationId:'existing',applicantUid:'applicant-a',type:'review_started',actorUid:'verifier',createdAt:serverTimestamp()}));
    await assertFails(setDoc(doc(verifier,'auditLogs/client-write'),{action:'review_started'}));
  });

  it('Project B keeps document number counters and reservations backend-only', async()=>{
    for(const uid of ['applicant-a','operator','admin']){
      const db=env.authenticatedContext(uid).firestore();
      await assertFails(getDoc(doc(db,'documentNumberCounters/SIPK_2026')));
      await assertFails(getDoc(doc(db,'documentNumberReservations/reservation-1')));
      await assertFails(setDoc(doc(db,'documentNumberCounters/SIPK_2026'),{lastSequence:999}));
      await assertFails(setDoc(doc(db,'documentNumberReservations/client-write'),{applicationId:'existing',sequence:999}));
    }
  });

  it('Project B keeps distributed rate limit counters backend-only',async()=>{
    for(const uid of ['applicant-a','admin']){
      const db=env.authenticatedContext(uid).firestore();
      await assertFails(getDoc(doc(db,'rateLimitCounters/counter-1')));
      await assertFails(setDoc(doc(db,'rateLimitCounters/client-write'),{count:0}));
    }
  });
});
