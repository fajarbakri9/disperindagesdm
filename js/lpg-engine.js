// ==============================================================================
// LPG 3 KG MONITORING ENGINE & LEDGER TRANSACTION PROCESSOR
// Disperindag ESDM Kabupaten Pinrang - Baseline Q1 2026
// ==============================================================================

const LPG_STORAGE_KEYS = {
  AGENTS: 'disperindag_lpg_agents_db',
  PANGKALAN: 'disperindag_lpg_pangkalan_db',
  EVENTS: 'disperindag_lpg_events_db',
  BALANCES: 'disperindag_lpg_balances_db',
  AUDIT_LOGS: 'disperindag_lpg_audit_logs_db',
  ALERTS: 'disperindag_lpg_alerts_db',
  SETTINGS: 'disperindag_lpg_settings_db',
  DASHBOARD: 'disperindag_lpg_dashboard_summary',
  VERSION: 'disperindag_lpg_db_version'
};

const LPG_ENGINE_VERSION = "2026_09_02_firestore_ssot_no_fallback_v2";
const LPG_REQUIRED_MASTER_VERSION = "2026-08-31-lpg-agent-coordinates-v2";
const lpgRuntimeStore = new Map();
let lpgMasterLoadPromise = null;

function isLocallyAppliedLpgEvent(event) {
  return event && ['POSTED', 'FIRESTORE_SYNCED'].includes(event.status);
}

// 1. INISIALISASI DATABASE LPG
function initLpgDatabase() {
  // Memori ini hanya proyeksi sesi dari snapshot server. Tidak dipersistenkan
  // dan tidak pernah digunakan sebagai pengganti ketika Firestore gagal.
  lpgRuntimeStore.clear();
}

// 2. HELPER DATA ACCESS
function getLpgStore(key, defaultVal = []) {
  return lpgRuntimeStore.has(key) ? lpgRuntimeStore.get(key) : defaultVal;
}

function setLpgStore(key, data) {
  lpgRuntimeStore.set(key, data);
}

async function loadCanonicalLpgMasterOnce() {
  if (lpgMasterLoadPromise) return lpgMasterLoadPromise;
  lpgMasterLoadPromise = (async () => {
    if (typeof db === 'undefined' || !db) throw new Error('Firestore belum tersedia');
    const [agentSnapshot, pangkalanSnapshot] = await Promise.all([
      db.collection('lpg_agents').get({ source: 'server' }),
      db.collection('lpg_pangkalan').get({ source: 'server' })
    ]);
    const agents = agentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const pangkalan = pangkalanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (!pangkalan.length) throw new Error('Koleksi lpg_pangkalan Firestore kosong');
    setLpgStore(LPG_STORAGE_KEYS.AGENTS, agents);
    setLpgStore(LPG_STORAGE_KEYS.PANGKALAN, pangkalan);
    const result = { source: 'FIRESTORE', agents, pangkalan };
    window.dispatchEvent(new CustomEvent('lpg-master-updated', { detail: { source: result.source, agents: agents.length, pangkalan: pangkalan.length } }));
    return result;
  })().catch(error => {
    lpgMasterLoadPromise = null;
    lpgRuntimeStore.delete(LPG_STORAGE_KEYS.AGENTS);
    lpgRuntimeStore.delete(LPG_STORAGE_KEYS.PANGKALAN);
    window.dispatchEvent(new CustomEvent('lpg-master-load-failed', { detail: { source: 'FIRESTORE', error: error.message } }));
    throw error;
  });
  return lpgMasterLoadPromise;
}

function subscribeCanonicalLpgMaster(callback) {
  if (typeof db === 'undefined' || !db) return null;
  let agents = null;
  let pangkalan = null;
  const publish = () => {
    if (!agents || !pangkalan || !pangkalan.length) return;
    setLpgStore(LPG_STORAGE_KEYS.AGENTS, agents);
    setLpgStore(LPG_STORAGE_KEYS.PANGKALAN, pangkalan);
    const result = { source: 'FIRESTORE_REALTIME', agents, pangkalan };
    window.dispatchEvent(new CustomEvent('lpg-master-updated', { detail: { source: result.source, agents: agents.length, pangkalan: pangkalan.length } }));
    if (typeof callback === 'function') callback(result);
  };
  const unsubscribeAgents = db.collection('lpg_agents').onSnapshot({ includeMetadataChanges:true }, snapshot => {
    if (snapshot.metadata.fromCache || snapshot.empty) return;
    agents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    publish();
  }, error => console.warn('[LPG Master] Listener agen:', error.code || error.message));
  const unsubscribePangkalan = db.collection('lpg_pangkalan').onSnapshot({ includeMetadataChanges:true }, snapshot => {
    if (snapshot.metadata.fromCache || snapshot.empty) return;
    pangkalan = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    publish();
  }, error => console.warn('[LPG Master] Listener pangkalan:', error.code || error.message));
  return () => { unsubscribeAgents(); unsubscribePangkalan(); };
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

function getLpgWitaDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function submitLpgLedgerEvent(eventData, userSession) {
  const firebaseUser = typeof auth !== 'undefined' && auth ? auth.currentUser : null;
  if (!firebaseUser || typeof db === 'undefined' || !db) {
    return { success:false, persistence:'SERVER_REQUIRED', message:'Transaksi membutuhkan koneksi dan sesi server yang aktif.' };
  }

  if (!navigator.onLine) return { success:false, persistence:'SERVER_REQUIRED', message:'Transaksi membutuhkan koneksi server. Tidak ada catatan lokal yang dibuat.' };

  const quantity = Number(eventData.quantity);
  const delta = eventData.type === 'DISTRIBUTION' ? -quantity : quantity;
  const stableKey = `${eventData.agentId}|${eventData.type}|${eventData.doNumber || eventData.clientEventId || generateUUID()}`;
  let hash = 2166136261;
  for (let i=0;i<stableKey.length;i++) { hash ^= stableKey.charCodeAt(i); hash = Math.imul(hash,16777619); }
  const clientEventId = `EVT-${eventData.agentId}-${eventData.type}-${(hash>>>0).toString(16).padStart(8,'0')}`;
  const payload = {
    agentId: eventData.agentId,
    clientEventId,
    type: eventData.type,
    quantity,
    delta,
    pangkalanId: eventData.pangkalanId || null,
    pangkalanSnapshot: eventData.pangkalanSnapshot || null,
    effectiveAt: eventData.effectiveAt || new Date().toISOString(),
    doNumber: eventData.doNumber || null,
    vehicleNumber: eventData.vehicleNumber || null,
    note: eventData.note || null,
    correctionOfEventId: eventData.correctionOfEventId || null,
    createdBy: firebaseUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  const eventRef = db.collection('lpg_events').doc(clientEventId);
  const balanceRef = db.collection('lpg_balances').doc(eventData.agentId);
  const auditRef = db.collection('lpg_audit_logs').doc(`AUDIT-${generateUUID()}`);
  try {
    const committedBalance = await db.runTransaction(async transaction => {
      const [existingEvent,balanceDoc] = await Promise.all([transaction.get(eventRef),transaction.get(balanceRef)]);
      if (existingEvent.exists) throw Object.assign(new Error('Nomor DO/transaksi sudah pernah dibukukan.'),{code:'already-exists'});
      const before = balanceDoc.exists && Number.isFinite(Number(balanceDoc.data().filledCylinderBalance))
        ? Number(balanceDoc.data().filledCylinderBalance) : 0;
      const after = before + delta;
      if (after < 0) throw Object.assign(new Error('Saldo stok tidak mencukupi untuk distribusi ini.'),{code:'failed-precondition'});
      transaction.set(eventRef,payload);
      transaction.set(balanceRef,{
        agentId:eventData.agentId, filledCylinderBalance:after, lastEventId:clientEventId,
        updatedAt:firebase.firestore.FieldValue.serverTimestamp(), updatedBy:firebaseUser.uid
      },{merge:true});
      transaction.set(auditRef,{
        action:'LEDGER_POSTED', entityType:'LEDGER_EVENT', entityId:clientEventId,
        agentId:eventData.agentId, actorUid:firebaseUser.uid, actorRole:userSession?.role || 'lpg_agent',
        before:{filledCylinderBalance:before}, after:{filledCylinderBalance:after,type:eventData.type,quantity},
        reason:'Transaksi LPG dibukukan secara atomik', createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      return after;
    });
    return { success:true,event:{...payload,id:clientEventId,status:'POSTED'},currentBalance:committedBalance,persistence:'FIRESTORE_COMMITTED' };
  } catch (error) {
    console.error('[LPG][FIRESTORE_WRITE_ERROR]',{operation:'submitLedger',agentId:eventData.agentId,code:error.code});
    return { success:false,persistence:'SERVER_REJECTED',message:error.code==='already-exists'?'Nomor DO atau transaksi ini sudah pernah dibukukan.':error.message || 'Data gagal disimpan. Silakan coba kembali.' };
  }
}

function firestoreTimestampToIso(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  return typeof value === 'string' ? value : null;
}

function getCanonicalLpgPoint(item) {
  const point=item?.location?.point;
  const latitude=Number(point?.latitude ?? item?.latitude ?? item?.lat);
  const longitude=Number(point?.longitude ?? item?.longitude ?? item?.lng);
  const verificationStatus=item?.location?.verificationStatus || (item?.gpsVerified === true ? 'verified' : item?.verificationStatus === 'VERIFIED' ? 'verified' : item?.verificationStatus === 'PENDING_ADMIN_VERIFICATION' ? 'needs_review' : item?.verificationStatus);
  return Number.isFinite(latitude)&&Number.isFinite(longitude)&&latitude>=-90&&latitude<=90&&longitude>=-180&&longitude<=180
    ? {latitude,longitude,accuracyM:Number(item?.location?.accuracyM),source:item?.location?.source || 'firestore_master',verificationStatus}
    : null;
}

function subscribeAgentLedgerFirestore(agentId, callback) {
  if (!hasFirebaseLpgSession()) return null;
  const unsubscribeEvents = db.collection('lpg_events').where('agentId', '==', agentId)
    .onSnapshot({ includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache) return;
      const cloudEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: firestoreTimestampToIso(data.createdAt) || data.effectiveAt,
          status: 'POSTED'
        };
      }).sort((a, b) => String(b.effectiveAt || b.createdAt).localeCompare(String(a.effectiveAt || a.createdAt)));

      const allLocal = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []);
      const otherAgentEvents = allLocal.filter(item => item.agentId !== agentId);
      setLpgStore(LPG_STORAGE_KEYS.EVENTS, [...cloudEvents, ...otherAgentEvents]);

      if (typeof callback === 'function') callback(cloudEvents, false);
    }, error => console.error('[-] Listener ledger Firestore gagal:', error.code));
  const unsubscribeBalance = db.collection('lpg_balances').doc(agentId)
    .onSnapshot({ includeMetadataChanges:true }, snapshot => {
      if (snapshot.metadata.fromCache) return;
      const balances = getLpgStore(LPG_STORAGE_KEYS.BALANCES, {});
      if (snapshot.exists) balances[agentId] = {agentId,...snapshot.data(),source:'FIRESTORE_SERVER'};
      else delete balances[agentId];
      setLpgStore(LPG_STORAGE_KEYS.BALANCES,balances);
      if (typeof callback === 'function') callback(getLpgStore(LPG_STORAGE_KEYS.EVENTS,[]),false);
    }, error => console.error('[LPG][FIRESTORE_READ_ERROR]',{operation:'balance',agentId,code:error.code}));
  return () => { unsubscribeEvents(); unsubscribeBalance(); };
}

// 3. LEDGER TRANSACTION PROCESSOR & IDEMPOTENCY
function processLpgEvent(eventData, userSession) {
  return { success:false, persistence:'DISABLED', message:'Pencatatan lokal dinonaktifkan. Gunakan transaksi Firestore resmi.' };
  /* Legacy implementation retained temporarily below for migration review only.
  if (!eventData || !eventData.type || !eventData.agentId) {
    return { success: false, message: "Payload event tidak lengkap." };
  }

  const supportedEventTypes = ['STOCK_IN', 'DISTRIBUTION'];
  if (!supportedEventTypes.includes(eventData.type)) {
    return { success: false, message: "Jenis transaksi tidak didukung oleh client. Adjustment dan opening balance harus diproses melalui backend/admin." };
  }

  const events = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []);
  const clientEventId = eventData.clientEventId || generateUUID();

  // A. Cek Idempotency (Mencegah double posting saat double tap / reconnect)
  const existingEvent = events.find(e => e.clientEventId === clientEventId);
  if (existingEvent) {
    return { 
      success: isLocallyAppliedLpgEvent(existingEvent),
      message: isLocallyAppliedLpgEvent(existingEvent) ? "Transaksi sudah tersimpan di perangkat sebelumnya." : "Transaksi sebelumnya ditolak.",
      event: existingEvent 
    };
  }

  const balances = getLpgStore(LPG_STORAGE_KEYS.BALANCES, {});
  const agentBalance = balances[eventData.agentId] || {
    agentId: eventData.agentId,
    filledCylinderBalance: 0,
    updatedAt: new Date().toISOString()
  };

  const qty = parseInt(eventData.quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    return { success: false, message: "Jumlah tabung harus berupa angka bulat positif lebih dari 0." };
  }

  const newEvent = {
    id: `EVT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    clientEventId: clientEventId,
    type: eventData.type, // 'STOCK_IN' | 'DISTRIBUTION' | 'ADJUSTMENT'
    agentId: eventData.agentId,
    agentName: eventData.agentName || "Agen Resmi",
    pangkalanId: eventData.pangkalanId || null,
    pangkalanSnapshot: null,
    quantity: qty,
    effectiveAt: eventData.effectiveAt || new Date().toISOString(),
    doNumber: eventData.doNumber || null,
    vehicleNumber: eventData.vehicleNumber || null,
    proofPath: eventData.proofPath || null,
    note: eventData.note || null,
    status: "PENDING",
    createdBy: userSession ? userSession.username : "system",
    createdByName: userSession ? userSession.name : "System",
    createdAt: new Date().toISOString(),
    postedAt: null,
    rejectionReason: null
  };

  // B. Proses Berdasarkan Jenis Event
  if (eventData.type === 'STOCK_IN') {
    // Tambah Saldo
    agentBalance.filledCylinderBalance += qty;
    agentBalance.lastStockInAt = new Date().toISOString();
    agentBalance.lastPostedEventAt = new Date().toISOString();
    agentBalance.updatedAt = new Date().toISOString();
    
    newEvent.status = "LEGACY_DISABLED";
    newEvent.localAppliedAt = new Date().toISOString();
  } 
  else if (eventData.type === 'DISTRIBUTION') {
    // Validasi Pangkalan
    const pangkalanList = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
    const targetPangkalan = pangkalanList.find(p => p.id === eventData.pangkalanId && p.agentId === eventData.agentId);

    if (!targetPangkalan) {
      newEvent.status = "REJECTED";
      newEvent.rejectionReason = "PANGKALAN_NOT_FOUND_OR_INVALID_AGENT";
      events.unshift(newEvent);
      setLpgStore(LPG_STORAGE_KEYS.EVENTS, events);
      return { success: false, message: "Pangkalan tidak ditemukan atau bukan binaan agen Anda." };
    }

    if (targetPangkalan.isDeleted) {
      newEvent.status = "REJECTED";
      newEvent.rejectionReason = "PANGKALAN_DELETED";
      events.unshift(newEvent);
      setLpgStore(LPG_STORAGE_KEYS.EVENTS, events);
      return { success: false, message: "Pangkalan yang dipilih sudah tidak aktif atau telah dihapus." };
    }

    // Sistem pengawasan tetap menerima laporan yang menghasilkan saldo negatif.
    // Nilai negatif adalah anomali yang harus ditindaklanjuti, bukan disembunyikan.
    agentBalance.filledCylinderBalance -= qty;
    agentBalance.hasStockAnomaly = agentBalance.filledCylinderBalance < 0;
    agentBalance.lastDistributionAt = new Date().toISOString();
    agentBalance.lastPostedEventAt = new Date().toISOString();
    agentBalance.updatedAt = new Date().toISOString();

    // Snapshot Pangkalan agar histori distribusi masa lalu tetap konsisten
    newEvent.pangkalanSnapshot = {
      id: targetPangkalan.id,
      name: targetPangkalan.name,
      kecamatan: targetPangkalan.kecamatan,
      desaKelurahan: targetPangkalan.desaKelurahan,
      address: targetPangkalan.address
    };

    newEvent.status = "LEGACY_DISABLED";
    newEvent.localAppliedAt = new Date().toISOString();
  }

  // C. Simpan Perubahan Mutlak ke Database Ledger
  balances[eventData.agentId] = agentBalance;
  events.unshift(newEvent);

  setLpgStore(LPG_STORAGE_KEYS.BALANCES, balances);
  setLpgStore(LPG_STORAGE_KEYS.EVENTS, events);

  // D. Tidak mengirim saldo/event lokal ke cloud. Jalur cloud resmi harus
  // membuat event PENDING dengan Firebase Auth, lalu diproses Cloud Functions.

  // E. Update Summary Dashboard
  refreshLpgDashboardSummary();

  return { 
    success: true, 
    message: newEvent.type === 'STOCK_IN'
      ? `Stok masuk ${qty.toLocaleString('id-ID')} tabung tersimpan di perangkat.`
      : `Distribusi ${qty.toLocaleString('id-ID')} tabung tersimpan di perangkat dan belum POSTED server.`,
    event: newEvent,
    currentBalance: agentBalance.filledCylinderBalance
  };
  */
}

// 4. KELOLA PANGKALAN OLEH AGEN (CRUD + AUDIT DIFF)
function getAgentPangkalanList(agentId) {
  const pangkalanList = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  return pangkalanList.filter(p => p.agentId === agentId);
}

function hasFirebaseLpgSession() {
  return typeof auth !== 'undefined' && auth && auth.currentUser && typeof db !== 'undefined' && db;
}

function subscribeAgentPangkalanFirestore(agentId, callback) {
  if (!hasFirebaseLpgSession()) return null;
  return db.collection('lpg_pangkalan').where('agentId', '==', agentId).onSnapshot({ includeMetadataChanges:true },snapshot => {
    if (snapshot.metadata.fromCache) return;
    const cloudItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const allLocal = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
    const otherAgents = allLocal.filter(item => item.agentId !== agentId);
    setLpgStore(LPG_STORAGE_KEYS.PANGKALAN, [...cloudItems, ...otherAgents]);
    if (typeof callback === 'function') callback(cloudItems);
  }, error => console.error('[-] Listener pangkalan Firestore gagal:', error.code));
}

async function addAgentPangkalanFirestore(agentId, data, session) {
  if (!hasFirebaseLpgSession() || !navigator.onLine) return { success:false,persistence:'SERVER_REQUIRED',message:'Pengajuan membutuhkan koneksi server.' };
  const user = auth.currentUser;
  const docId = `REQ-${generateUUID()}`;
  const ref = db.collection('lpg_outlet_change_requests').doc(docId);
  const auditRef = db.collection('lpg_audit_logs').doc(`AUDIT-${generateUUID()}`);
  const normalizedName = (data.name || '').trim().toUpperCase();
  const payload = {
    requestId: docId, requestType:'CREATE_OUTLET',
    agentId,
    agentName: session.agentName || null,
    name: (data.name || '').trim(),
    normalizedName,
    ownerName: (data.ownerName || '').trim() || null,
    phone: (data.phone || '').trim() || null,
    registrationNumber: data.registrationNumber || null,
    kecamatan: data.kecamatan,
    desaKelurahan: (data.desaKelurahan || '').trim(),
    address: (data.address || '').trim(),
    status: 'PENDING', verificationStatus: 'PENDING_ADMIN_REVIEW', sourceType: 'AGENT_REQUEST',
    sourceDate: new Date().toISOString().slice(0, 10),
    sourceOriginal: {},
    createdBy: user.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: user.uid,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  const batch = db.batch();
  batch.set(ref, payload);
  batch.set(auditRef, {
    action: 'PANGKALAN_CREATE_REQUEST', entityType: 'CHANGE_REQUEST', entityId: docId,
    agentId, actorUid: user.uid, actorRole: session.role, before: null,
    after: { name: payload.name, status: payload.status },
    reason: 'Pendaftaran pangkalan baru oleh agen',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await batch.commit();
  return { success: true, request: payload, message:'Pengajuan pangkalan tersimpan dan menunggu verifikasi administrator.', persistence: 'FIRESTORE_COMMITTED' };
}

async function editAgentPangkalanFirestore(agentId, pangkalanId, fields, session) {
  if (!hasFirebaseLpgSession() || !navigator.onLine) return { success:false,persistence:'SERVER_REQUIRED',message:'Perubahan membutuhkan koneksi server.' };
  const current = getAgentPangkalanList(agentId).find(item => item.id === pangkalanId);
  if (!current) return { success: false, message: 'Pangkalan tidak ditemukan pada data agen.' };
  const user = auth.currentUser;
  const update = {
    name: fields.name.trim(), normalizedName: fields.name.trim().toUpperCase(),
    ownerName: fields.ownerName || null, phone: fields.phone || null,
    kecamatan: fields.kecamatan, desaKelurahan: fields.desaKelurahan,
    address: fields.address,
    updatedBy: user.uid, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  const batch = db.batch();
  batch.update(db.collection('lpg_pangkalan').doc(pangkalanId), update);
  batch.set(db.collection('lpg_audit_logs').doc(`AUDIT-${generateUUID()}`), {
    action: 'PANGKALAN_UPDATE', entityType: 'PANGKALAN', entityId: pangkalanId,
    agentId, actorUid: user.uid, actorRole: session.role,
    before: { name: current.name, address: current.address },
    after: { name: update.name, address: update.address },
    changedFields: Object.keys(update).filter(key => !['updatedBy', 'updatedAt'].includes(key)),
    reason: fields.editReason, createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await batch.commit();
  return { success: true, message: 'Data pangkalan tersinkron ke Firestore.', persistence: 'FIRESTORE' };
}

async function softDeleteAgentPangkalanFirestore(agentId, pangkalanId, reason, session) {
  if (!hasFirebaseLpgSession() || !navigator.onLine) return { success:false,persistence:'SERVER_REQUIRED',message:'Pengajuan membutuhkan koneksi server.' };
  const current = getAgentPangkalanList(agentId).find(item => item.id === pangkalanId);
  if (!current) return { success: false, message: 'Pangkalan tidak ditemukan pada data agen.' };
  const user = auth.currentUser;
  const requestId=`REQ-${generateUUID()}`;
  const update = {requestId,requestType:'DEACTIVATE_OUTLET',outletId:pangkalanId,agentId,status:'PENDING',reason:reason.trim(),createdBy:user.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()};
  const batch = db.batch();
  batch.set(db.collection('lpg_outlet_change_requests').doc(requestId), update);
  batch.set(db.collection('lpg_audit_logs').doc(`AUDIT-${generateUUID()}`), {
    action: 'PANGKALAN_DEACTIVATE_REQUEST', entityType: 'CHANGE_REQUEST', entityId: requestId,
    agentId, actorUid: user.uid, actorRole: session.role,
    before: { status: current.status, isDeleted: current.isDeleted === true },
    after: { outletId:pangkalanId,status:'PENDING' }, reason: reason.trim(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await batch.commit();
  return { success: true, message: `Permohonan penonaktifan "${current.name}" dikirim untuk verifikasi administrator.`, persistence: 'FIRESTORE_COMMITTED' };
}

async function updateLpgLocationFirestore(entityType, entityId, agentId, captured, session) {
  if (!hasFirebaseLpgSession() || !navigator.onLine) return {success:false,message:'Pembaruan GPS membutuhkan koneksi server.'};
  if (!captured || !Number.isFinite(captured.latitude) || !Number.isFinite(captured.longitude) || !Number.isFinite(captured.accuracyM)) return {success:false,message:'Hasil GPS tidak valid.'};
  if (captured.accuracyM > 50) return {success:false,message:'Akurasi GPS terlalu rendah. Silakan ambil ulang di area terbuka.'};
  const user=auth.currentUser;
  const collectionName=entityType==='agent'?'lpg_agents':'lpg_pangkalan';
  const ref=db.collection(collectionName).doc(entityId);
  const auditRef=db.collection('lpg_audit_logs').doc(`AUDIT-${generateUUID()}`);
  try {
    await db.runTransaction(async transaction=>{
      const snapshot=await transaction.get(ref);
      if(!snapshot.exists) throw Object.assign(new Error('Data tidak ditemukan di server.'),{code:'not-found'});
      const current=snapshot.data();
      if(entityType!=='agent' && current.agentId!==agentId) throw Object.assign(new Error('Pangkalan bukan binaan agen ini.'),{code:'permission-denied'});
      const location={
        point:new firebase.firestore.GeoPoint(captured.latitude,captured.longitude),accuracyM:captured.accuracyM,
        source:'device_gps',capturedAt:firebase.firestore.FieldValue.serverTimestamp(),capturedByUid:user.uid,
        verificationStatus:session?.canAccessAdmin?'admin_captured':'agent_captured'
      };
      transaction.update(ref,{location,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:user.uid,version:Number(current.version||0)+1});
      transaction.set(auditRef,{action:'LOCATION_UPDATE',entityType:entityType==='agent'?'AGENT':'PANGKALAN',entityId,agentId,actorUid:user.uid,actorRole:session?.role||'lpg_agent',before:{location:current.location||null},after:{latitude:captured.latitude,longitude:captured.longitude,accuracyM:captured.accuracyM,verificationStatus:location.verificationStatus},reason:'Lokasi diambil dari GPS perangkat setelah konfirmasi pengguna',createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    });
    return {success:true,persistence:'FIRESTORE_COMMITTED',location:captured,status:session?.canAccessAdmin?'admin_captured':'agent_captured'};
  } catch(error) {
    console.error('[LPG][GPS_WRITE_ERROR]',{entityType,entityId,code:error.code});
    return {success:false,message:error.message||'Lokasi gagal disimpan. Silakan coba kembali.'};
  }
}

function addAgentPangkalan(agentId, pangkalanData, userSession) {
  const pangkalanList = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  const agents = getLpgStore(LPG_STORAGE_KEYS.AGENTS, []);
  const agent = agents.find(a => a.id === agentId);

  // A. Deteksi Kemiripan / Duplikasi
  const normName = (pangkalanData.name || '').trim().toUpperCase();
  const duplicate = pangkalanList.find(p => 
    !p.isDeleted && 
    p.kecamatan.toLowerCase() === (pangkalanData.kecamatan || '').toLowerCase() &&
    (p.normalizedName === normName || (p.phone && p.phone === pangkalanData.phone))
  );

  const newId = `PG-${(pangkalanList.length + 1).toString().padStart(6, '0')}`;
  const nowIso = new Date().toISOString();

  const newPangkalan = {
    id: newId,
    agentId: agentId,
    agentName: agent ? agent.name : "Agen Resmi",
    name: pangkalanData.name.trim(),
    normalizedName: normName,
    ownerName: pangkalanData.ownerName ? pangkalanData.ownerName.trim() : "Pemilik Pangkalan",
    phone: pangkalanData.phone ? pangkalanData.phone.trim() : "-",
    registrationNumber: pangkalanData.registrationNumber || `REG-7315-${Date.now().toString().slice(-5)}`,
    kecamatan: pangkalanData.kecamatan,
    desaKelurahan: pangkalanData.desaKelurahan,
    address: pangkalanData.address.trim(),
    latitude: pangkalanData.latitude ? parseFloat(pangkalanData.latitude) : null,
    longitude: pangkalanData.longitude ? parseFloat(pangkalanData.longitude) : null,
    monthlyAllocation: pangkalanData.monthlyAllocation ? parseInt(pangkalanData.monthlyAllocation, 10) : 560,
    status: "ACTIVE",
    isDeleted: false,
    verificationStatus: "PENDING_ADMIN_VERIFICATION",
    sourceType: "AGENT_CREATED",
    sourceDate: nowIso.slice(0, 10),
    sourceOriginal: {
      kecamatan: pangkalanData.kecamatan.toUpperCase(),
      kelurahan: pangkalanData.desaKelurahan.toUpperCase(),
      namaSubPenyalur: pangkalanData.name.trim(),
      alamatSubPenyalur: pangkalanData.address.trim(),
      namaPenyalur: agent ? agent.name : ""
    },
    createdBy: userSession ? userSession.username : "agent",
    createdAt: nowIso,
    updatedAt: nowIso
  };

  pangkalanList.unshift(newPangkalan);
  setLpgStore(LPG_STORAGE_KEYS.PANGKALAN, pangkalanList);

  // Catat Audit Trail
  recordLpgAuditLog({
    action: "PANGKALAN_CREATE",
    entityType: "PANGKALAN",
    entityId: newPangkalan.id,
    agentId: agentId,
    actorUid: userSession ? userSession.username : "agent",
    actorRole: userSession ? userSession.role : "LPG_AGENT_ADMIN",
    before: null,
    after: newPangkalan,
    reason: "Pendaftaran pangkalan baru oleh agen penyalur"
  });

  refreshLpgDashboardSummary();

  return { 
    success: true, 
    pangkalan: newPangkalan, 
    duplicateWarning: duplicate ? `Pangkalan dengan nama mirip telah terdaftar di desa yang sama: "${duplicate.name}"` : null 
  };
}

function editAgentPangkalan(agentId, pangkalanId, updatedFields, userSession) {
  const pangkalanList = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  const idx = pangkalanList.findIndex(p => p.id === pangkalanId && (userSession.canAccessAdmin || p.agentId === agentId));

  if (idx === -1) {
    return { success: false, message: "Pangkalan tidak ditemukan atau Anda tidak memiliki izin mengedit pangkalan ini." };
  }

  const before = { ...pangkalanList[idx] };
  const allowedKeys = ['name', 'ownerName', 'phone', 'kecamatan', 'desaKelurahan', 'address', 'latitude', 'longitude', 'monthlyAllocation', 'notes'];
  
  allowedKeys.forEach(k => {
    if (updatedFields[k] !== undefined) {
      pangkalanList[idx][k] = updatedFields[k];
      if (k === 'name') pangkalanList[idx].normalizedName = updatedFields[k].trim().toUpperCase();
    }
  });

  pangkalanList[idx].updatedAt = new Date().toISOString();
  pangkalanList[idx].updatedBy = userSession ? userSession.username : "agent";

  setLpgStore(LPG_STORAGE_KEYS.PANGKALAN, pangkalanList);

  // Catat Audit Trail Diff
  recordLpgAuditLog({
    action: "PANGKALAN_UPDATE",
    entityType: "PANGKALAN",
    entityId: pangkalanId,
    agentId: pangkalanList[idx].agentId,
    actorUid: userSession ? userSession.username : "agent",
    actorRole: userSession ? userSession.role : "LPG_AGENT_ADMIN",
    before: before,
    after: pangkalanList[idx],
    changedFields: Object.keys(updatedFields),
    reason: updatedFields.editReason || "Pembaruan data pangkalan oleh agen"
  });

  refreshLpgDashboardSummary();
  return { success: true, message: "Data pangkalan berhasil diperbarui.", pangkalan: pangkalanList[idx] };
}

function softDeleteAgentPangkalan(agentId, pangkalanId, deleteReason, userSession) {
  if (!deleteReason || !deleteReason.trim()) {
    return { success: false, message: "Alasan penghapusan/penonaktifan pangkalan wajib diisi." };
  }

  const pangkalanList = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  const idx = pangkalanList.findIndex(p => p.id === pangkalanId && (userSession.canAccessAdmin || p.agentId === agentId));

  if (idx === -1) {
    return { success: false, message: "Pangkalan tidak ditemukan atau Anda tidak memiliki izin." };
  }

  const before = { ...pangkalanList[idx] };
  const nowIso = new Date().toISOString();

  // Soft Delete (Histori distribusi masa lalu tetap aman)
  pangkalanList[idx].status = "DELETED";
  pangkalanList[idx].isDeleted = true;
  pangkalanList[idx].deletedAt = nowIso;
  pangkalanList[idx].deletedBy = userSession ? userSession.username : "agent";
  pangkalanList[idx].deleteReason = deleteReason.trim();
  pangkalanList[idx].updatedAt = nowIso;

  setLpgStore(LPG_STORAGE_KEYS.PANGKALAN, pangkalanList);

  // Catat Audit Trail
  recordLpgAuditLog({
    action: "PANGKALAN_DELETE",
    entityType: "PANGKALAN",
    entityId: pangkalanId,
    agentId: pangkalanList[idx].agentId,
    actorUid: userSession ? userSession.username : "agent",
    actorRole: userSession ? userSession.role : "LPG_AGENT_ADMIN",
    before: before,
    after: pangkalanList[idx],
    reason: deleteReason.trim()
  });

  refreshLpgDashboardSummary();
  return { success: true, message: `Pangkalan "${before.name}" telah dinonaktifkan. Histori distribusi tetap tersimpan.` };
}

// 5. AUDIT LOGGING SYSTEM
function recordLpgAuditLog(logObj) {
  const logs = getLpgStore(LPG_STORAGE_KEYS.AUDIT_LOGS, []);
  const newLog = {
    id: `AUDIT-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    ...logObj,
    createdAt: new Date().toISOString()
  };
  logs.unshift(newLog);
  setLpgStore(LPG_STORAGE_KEYS.AUDIT_LOGS, logs);

  if (typeof db !== 'undefined' && db !== null) {
    try {
      db.collection('lpg_audit_logs').doc(newLog.id).set(newLog).catch(() => {});
    } catch(e) {}
  }
}

// 6. MATERIALIZED DASHBOARD SUMMARY (Untuk TV Wallboard Command Center & Admin)
function refreshLpgDashboardSummary() {
  const agents = getLpgStore(LPG_STORAGE_KEYS.AGENTS, []);
  const pangkalan = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  const balances = getLpgStore(LPG_STORAGE_KEYS.BALANCES, {});
  const events = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []);

  const activePangkalan = pangkalan.filter(p => !p.isDeleted && p.status === 'ACTIVE');
  const unverifiedPangkalan = activePangkalan.filter(p => p.verificationStatus === 'PENDING_ADMIN_VERIFICATION');

  // Total Stok Beredar di Agen
  let totalStockAtAgents = 0;
  Object.values(balances).forEach(b => {
    totalStockAtAgents += (b.filledCylinderBalance || 0);
  });

  // Rekap Distribusi & Stok Masuk Hari Ini
  const todayStr = getLpgWitaDateKey();
  let stockInToday = 0;
  let distributedToday = 0;
  let distributedThisMonth = 0;
  const currentMonthStr = todayStr.slice(0, 7);

  const reportedAgentIds = new Set();

  events.forEach(e => {
    if (isLocallyAppliedLpgEvent(e)) {
      const eDate = getLpgWitaDateKey(e.effectiveAt || e.createdAt);
      if (eDate === todayStr) {
        if (e.type === 'STOCK_IN') stockInToday += e.quantity;
        if (e.type === 'DISTRIBUTION') distributedToday += e.quantity;
        reportedAgentIds.add(e.agentId);
      }
      if (eDate.startsWith(currentMonthStr)) {
        if (e.type === 'DISTRIBUTION') distributedThisMonth += e.quantity;
      }
    }
  });

  // Status Distribusi per 12 Kecamatan
  const kecamatanStatus = {};
  const allKecamatan = [
    "Batulappa", "Cempa", "Duampanua", "Lanrisang", "Lembang", "Mattiro Bulu", 
    "Mattiro Sompe", "Paleteang", "Patampanua", "Suppa", "Tiroang", "Watang Sawitto"
  ];

  allKecamatan.forEach(kec => {
    const pInKec = activePangkalan.filter(p => p.kecamatan === kec);
    const distInKec = events.filter(e => 
      isLocallyAppliedLpgEvent(e) &&
      e.type === 'DISTRIBUTION' && 
      e.pangkalanSnapshot && 
      e.pangkalanSnapshot.kecamatan === kec &&
      getLpgWitaDateKey(e.effectiveAt || e.createdAt) === todayStr
    );

    kecamatanStatus[kec] = {
      kecamatan: kec,
      totalPangkalan: pInKec.length,
      tabungTersalurHariIni: distInKec.reduce((acc, curr) => acc + curr.quantity, 0),
      status: distInKec.length > 0 ? "LANCAR" : "SIAGA_TERKENDALI"
    };
  });

  const summary = {
    activeAgents: agents.filter(a => a.status === 'ACTIVE').length,
    totalPangkalan: activePangkalan.length,
    unverifiedPangkalan: unverifiedPangkalan.length,
    stockAtAgents: totalStockAtAgents,
    stockInToday: stockInToday,
    distributedToday: distributedToday,
    distributedThisMonth: distributedThisMonth,
    allocationThisMonth: null, // Menampilkan 'Belum Tersedia' sesuai arahan resmi
    allocationRealizationPct: null,
    agentsReportedToday: reportedAgentIds.size,
    agentsLate: Math.max(0, agents.length - reportedAgentIds.size),
    kecamatanStatus: kecamatanStatus,
    updatedAt: new Date().toISOString(),
    sourceMode: 'LOCAL_PREVIEW',
    authoritative: false
  };

  setLpgStore(LPG_STORAGE_KEYS.DASHBOARD, summary);

  return summary;
}

// Store hanya diproyeksikan dari Firestore oleh halaman pemakai.
initLpgDatabase();

if (typeof window !== 'undefined') {
  window.initLpgDatabase = initLpgDatabase;
  window.loadCanonicalLpgMasterOnce = loadCanonicalLpgMasterOnce;
  window.subscribeCanonicalLpgMaster = subscribeCanonicalLpgMaster;
  window.LPG_REQUIRED_MASTER_VERSION = LPG_REQUIRED_MASTER_VERSION;
  window.processLpgEvent = processLpgEvent;
  window.submitLpgLedgerEvent = submitLpgLedgerEvent;
  window.getAgentPangkalanList = getAgentPangkalanList;
  window.subscribeAgentPangkalanFirestore = subscribeAgentPangkalanFirestore;
  window.subscribeAgentLedgerFirestore = subscribeAgentLedgerFirestore;
  window.addAgentPangkalanFirestore = addAgentPangkalanFirestore;
  window.editAgentPangkalanFirestore = editAgentPangkalanFirestore;
  window.softDeleteAgentPangkalanFirestore = softDeleteAgentPangkalanFirestore;
  window.updateLpgLocationFirestore = updateLpgLocationFirestore;
  // addAgentPangkalan, editAgentPangkalan, softDeleteAgentPangkalan (localStorage legacy)
  // tidak diekspor karena seluruh operasi pangkalan kini melalui Firestore.
  window.refreshLpgDashboardSummary = refreshLpgDashboardSummary;
  window.getLpgStore = getLpgStore;
  window.LPG_STORAGE_KEYS = LPG_STORAGE_KEYS;
  window.isLocallyAppliedLpgEvent = isLocallyAppliedLpgEvent;
  window.getCanonicalLpgPoint = getCanonicalLpgPoint;
}
