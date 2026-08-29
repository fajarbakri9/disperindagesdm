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
  DASHBOARD: 'disperindag_lpg_dashboard_summary',
  VERSION: 'disperindag_lpg_db_version'
};

const LPG_ENGINE_VERSION = "2026_08_30_lpg_local_status_v3";

function isLocallyAppliedLpgEvent(event) {
  return event && ['POSTED', 'LOCAL_ONLY', 'PENDING_SYNC', 'FIRESTORE_SYNCED'].includes(event.status);
}

// 1. INISIALISASI DATABASE LPG
function initLpgDatabase() {
  const currentVer = localStorage.getItem(LPG_STORAGE_KEYS.VERSION);
  if (currentVer !== LPG_ENGINE_VERSION) {
    // Inisialisasi dari Master Seed Ditjen Migas ESDM Q1 2026
    const initialAgents = (typeof LPG_SEED_AGENTS !== 'undefined') ? LPG_SEED_AGENTS : [];
    const initialPangkalan = (typeof LPG_SEED_PANGKALAN !== 'undefined') ? LPG_SEED_PANGKALAN : [];

    // Migrasi versi tidak boleh menimpa perubahan operasional yang sudah ada.
    // Seed hanya dipasang untuk instalasi/browser yang benar-benar masih kosong.
    if (!localStorage.getItem(LPG_STORAGE_KEYS.AGENTS)) {
      localStorage.setItem(LPG_STORAGE_KEYS.AGENTS, JSON.stringify(initialAgents));
    }
    if (!localStorage.getItem(LPG_STORAGE_KEYS.PANGKALAN)) {
      localStorage.setItem(LPG_STORAGE_KEYS.PANGKALAN, JSON.stringify(initialPangkalan));
    }
    
    // Inisialisasi Saldo Awal (Opening Balance) per Agen
    if (!localStorage.getItem(LPG_STORAGE_KEYS.BALANCES)) {
      // Tidak membuat saldo fiktif. Saldo riil harus lahir dari opening balance/
      // ledger yang diproses backend, bukan dari angka contoh di browser.
      localStorage.setItem(LPG_STORAGE_KEYS.BALANCES, JSON.stringify({}));
    }

    if (!localStorage.getItem(LPG_STORAGE_KEYS.EVENTS)) {
      localStorage.setItem(LPG_STORAGE_KEYS.EVENTS, JSON.stringify([]));
    } else {
      // Event lama diposting oleh browser, bukan oleh backend. Tandai secara
      // jujur sebagai lokal agar tidak disalahartikan sebagai ledger server.
      const existingEvents = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []);
      let migrated = false;
      existingEvents.forEach(item => {
        if (item.status === 'POSTED' && !item.processedAt) {
          item.status = 'LOCAL_ONLY';
          item.localAppliedAt = item.postedAt || item.createdAt || new Date().toISOString();
          item.postedAt = null;
          migrated = true;
        }
      });
      if (migrated) setLpgStore(LPG_STORAGE_KEYS.EVENTS, existingEvents);
    }
    if (!localStorage.getItem(LPG_STORAGE_KEYS.AUDIT_LOGS)) {
      localStorage.setItem(LPG_STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
    }

    localStorage.setItem(LPG_STORAGE_KEYS.VERSION, LPG_ENGINE_VERSION);
    refreshLpgDashboardSummary();
  }
}

// 2. HELPER DATA ACCESS
function getLpgStore(key, defaultVal = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setLpgStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

async function submitLpgLedgerEvent(eventData, userSession) {
  const firebaseUser = typeof auth !== 'undefined' && auth ? auth.currentUser : null;
  if (!firebaseUser || typeof db === 'undefined' || !db) {
    return { ...processLpgEvent(eventData, userSession), persistence: 'LOCAL_ONLY' };
  }

  const quantity = Number(eventData.quantity);
  const delta = eventData.type === 'DISTRIBUTION' ? -quantity : quantity;
  const clientEventId = eventData.clientEventId || generateUUID();
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

  // Document ID = clientEventId. Rules melarang update sehingga submit ulang
  // tidak dapat membuat transaksi kedua atau diam-diam mengganti payload.
  db.collection('lpg_events').doc(clientEventId).set(payload).catch(error => {
    console.error('[-] Sinkronisasi ledger LPG ditolak Firestore:', error.code);
  });
  return { success: true, event: payload, persistence: 'FIRESTORE_QUEUED' };
}

function firestoreTimestampToIso(value) {
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  return typeof value === 'string' ? value : null;
}

function subscribeAgentLedgerFirestore(agentId, callback) {
  if (!hasFirebaseLpgSession()) return null;
  return db.collection('lpg_events').where('agentId', '==', agentId)
    .onSnapshot({ includeMetadataChanges: true }, snapshot => {
      const cloudEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: firestoreTimestampToIso(data.createdAt) || data.effectiveAt,
          status: doc.metadata.hasPendingWrites ? 'PENDING_SYNC' : 'FIRESTORE_SYNCED'
        };
      }).sort((a, b) => String(b.effectiveAt || b.createdAt).localeCompare(String(a.effectiveAt || a.createdAt)));

      const allLocal = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []);
      const otherAgentEvents = allLocal.filter(item => item.agentId !== agentId);
      setLpgStore(LPG_STORAGE_KEYS.EVENTS, [...cloudEvents, ...otherAgentEvents]);

      const balance = cloudEvents.reduce((sum, event) => sum + Number(event.delta || 0), 0);
      const balances = getLpgStore(LPG_STORAGE_KEYS.BALANCES, {});
      balances[agentId] = {
        agentId,
        filledCylinderBalance: balance,
        hasStockAnomaly: balance < 0,
        updatedAt: new Date().toISOString(),
        source: 'FIRESTORE_LEDGER_SUM_DELTA'
      };
      setLpgStore(LPG_STORAGE_KEYS.BALANCES, balances);
      refreshLpgDashboardSummary();
      if (typeof callback === 'function') callback(cloudEvents, snapshot.metadata.hasPendingWrites);
    }, error => console.error('[-] Listener ledger Firestore gagal:', error.code));
}

// 3. LEDGER TRANSACTION PROCESSOR & IDEMPOTENCY
function processLpgEvent(eventData, userSession) {
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
    
    newEvent.status = "LOCAL_ONLY";
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

    newEvent.status = "LOCAL_ONLY";
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
  return db.collection('lpg_pangkalan').where('agentId', '==', agentId).onSnapshot(snapshot => {
    const cloudItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const allLocal = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
    const otherAgents = allLocal.filter(item => item.agentId !== agentId);
    setLpgStore(LPG_STORAGE_KEYS.PANGKALAN, [...cloudItems, ...otherAgents]);
    if (typeof callback === 'function') callback(cloudItems);
  }, error => console.error('[-] Listener pangkalan Firestore gagal:', error.code));
}

async function addAgentPangkalanFirestore(agentId, data, session) {
  if (!hasFirebaseLpgSession()) return { ...addAgentPangkalan(agentId, data, session), persistence: 'LOCAL_ONLY' };
  const user = auth.currentUser;
  const docId = `PG-${generateUUID()}`;
  const ref = db.collection('lpg_pangkalan').doc(docId);
  const auditRef = db.collection('lpg_audit_logs').doc(`AUDIT-${generateUUID()}`);
  const normalizedName = (data.name || '').trim().toUpperCase();
  const payload = {
    id: docId,
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
    latitude: Number.isFinite(Number(data.latitude)) ? Number(data.latitude) : null,
    longitude: Number.isFinite(Number(data.longitude)) ? Number(data.longitude) : null,
    monthlyAllocation: Number.isSafeInteger(Number(data.monthlyAllocation)) ? Number(data.monthlyAllocation) : null,
    status: 'ACTIVE',
    isDeleted: false,
    verificationStatus: 'PENDING_ADMIN_VERIFICATION',
    sourceType: 'AGENT_CREATED',
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
    action: 'PANGKALAN_CREATE', entityType: 'PANGKALAN', entityId: docId,
    agentId, actorUid: user.uid, actorRole: session.role, before: null,
    after: { name: payload.name, status: payload.status },
    reason: 'Pendaftaran pangkalan baru oleh agen',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await batch.commit();
  return { success: true, pangkalan: payload, persistence: 'FIRESTORE' };
}

async function editAgentPangkalanFirestore(agentId, pangkalanId, fields, session) {
  if (!hasFirebaseLpgSession()) return { ...editAgentPangkalan(agentId, pangkalanId, fields, session), persistence: 'LOCAL_ONLY' };
  const current = getAgentPangkalanList(agentId).find(item => item.id === pangkalanId);
  if (!current) return { success: false, message: 'Pangkalan tidak ditemukan pada data agen.' };
  const user = auth.currentUser;
  const update = {
    name: fields.name.trim(), normalizedName: fields.name.trim().toUpperCase(),
    ownerName: fields.ownerName || null, phone: fields.phone || null,
    kecamatan: fields.kecamatan, desaKelurahan: fields.desaKelurahan,
    address: fields.address, monthlyAllocation: Number(fields.monthlyAllocation) || null,
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
  if (!hasFirebaseLpgSession()) return { ...softDeleteAgentPangkalan(agentId, pangkalanId, reason, session), persistence: 'LOCAL_ONLY' };
  const current = getAgentPangkalanList(agentId).find(item => item.id === pangkalanId);
  if (!current) return { success: false, message: 'Pangkalan tidak ditemukan pada data agen.' };
  const user = auth.currentUser;
  const update = {
    status: 'DELETED', isDeleted: true, deleteReason: reason.trim(),
    deletedBy: user.uid, deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: user.uid, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  const batch = db.batch();
  batch.update(db.collection('lpg_pangkalan').doc(pangkalanId), update);
  batch.set(db.collection('lpg_audit_logs').doc(`AUDIT-${generateUUID()}`), {
    action: 'PANGKALAN_DELETE', entityType: 'PANGKALAN', entityId: pangkalanId,
    agentId, actorUid: user.uid, actorRole: session.role,
    before: { status: current.status, isDeleted: current.isDeleted === true },
    after: { status: 'DELETED', isDeleted: true }, reason: reason.trim(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await batch.commit();
  return { success: true, message: `Pangkalan "${current.name}" dinonaktifkan dan histori tetap tersimpan.`, persistence: 'FIRESTORE' };
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
  const todayStr = new Date().toISOString().slice(0, 10);
  let stockInToday = 0;
  let distributedToday = 0;
  let distributedThisMonth = 0;
  const currentMonthStr = todayStr.slice(0, 7);

  const reportedAgentIds = new Set();

  events.forEach(e => {
    if (isLocallyAppliedLpgEvent(e)) {
      const eDate = (e.effectiveAt || e.createdAt || '').slice(0, 10);
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
      (e.effectiveAt || '').slice(0, 10) === todayStr
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

// Inisialisasi Otomatis saat skrip dimuat
initLpgDatabase();

if (typeof window !== 'undefined') {
  window.initLpgDatabase = initLpgDatabase;
  window.processLpgEvent = processLpgEvent;
  window.submitLpgLedgerEvent = submitLpgLedgerEvent;
  window.getAgentPangkalanList = getAgentPangkalanList;
  window.subscribeAgentPangkalanFirestore = subscribeAgentPangkalanFirestore;
  window.subscribeAgentLedgerFirestore = subscribeAgentLedgerFirestore;
  window.addAgentPangkalanFirestore = addAgentPangkalanFirestore;
  window.editAgentPangkalanFirestore = editAgentPangkalanFirestore;
  window.softDeleteAgentPangkalanFirestore = softDeleteAgentPangkalanFirestore;
  window.addAgentPangkalan = addAgentPangkalan;
  window.editAgentPangkalan = editAgentPangkalan;
  window.softDeleteAgentPangkalan = softDeleteAgentPangkalan;
  window.refreshLpgDashboardSummary = refreshLpgDashboardSummary;
  window.getLpgStore = getLpgStore;
  window.LPG_STORAGE_KEYS = LPG_STORAGE_KEYS;
  window.isLocallyAppliedLpgEvent = isLocallyAppliedLpgEvent;
}
