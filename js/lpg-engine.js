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

const LPG_ENGINE_VERSION = "2026_08_30_lpg_nondestructive_v2";

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
  return 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
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
      success: existingEvent.status === 'POSTED', 
      message: existingEvent.status === 'POSTED' ? "Transaksi sudah tercatat sebelumnya." : "Transaksi sebelumnya ditolak.",
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
    
    newEvent.status = "POSTED";
    newEvent.postedAt = new Date().toISOString();
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

    // Validasi Anti Saldo Negatif
    if (agentBalance.filledCylinderBalance < qty) {
      newEvent.status = "REJECTED";
      newEvent.rejectionReason = "INSUFFICIENT_STOCK";
      events.unshift(newEvent);
      setLpgStore(LPG_STORAGE_KEYS.EVENTS, events);
      return { 
        success: false, 
        message: `Stok agen tidak mencukupi. Saldo saat ini: ${agentBalance.filledCylinderBalance.toLocaleString('id-ID')} tabung, permintaan: ${qty.toLocaleString('id-ID')} tabung.` 
      };
    }

    // Kurangi Saldo
    agentBalance.filledCylinderBalance -= qty;
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

    newEvent.status = "POSTED";
    newEvent.postedAt = new Date().toISOString();
  }

  // C. Simpan Perubahan Mutlak ke Database Ledger
  balances[eventData.agentId] = agentBalance;
  events.unshift(newEvent);

  setLpgStore(LPG_STORAGE_KEYS.BALANCES, balances);
  setLpgStore(LPG_STORAGE_KEYS.EVENTS, events);

  // D. Sinkronisasi ke Cloud Firestore jika online
  if (typeof db !== 'undefined' && db !== null) {
    try {
      db.collection('lpg_events').doc(newEvent.id).set(newEvent, { merge: true }).catch(() => {});
      db.collection('lpg_balances').doc(eventData.agentId).set(agentBalance, { merge: true }).catch(() => {});
    } catch(e) {}
  }

  // E. Update Summary Dashboard
  refreshLpgDashboardSummary();

  return { 
    success: true, 
    message: newEvent.type === 'STOCK_IN' 
      ? `Stok masuk sebanyak ${qty.toLocaleString('id-ID')} tabung berhasil dibukukan.` 
      : `Distribusi ${qty.toLocaleString('id-ID')} tabung ke ${newEvent.pangkalanSnapshot ? newEvent.pangkalanSnapshot.name : 'Pangkalan'} berhasil dibukukan.`,
    event: newEvent,
    currentBalance: agentBalance.filledCylinderBalance
  };
}

// 4. KELOLA PANGKALAN OLEH AGEN (CRUD + AUDIT DIFF)
function getAgentPangkalanList(agentId) {
  const pangkalanList = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  return pangkalanList.filter(p => p.agentId === agentId);
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
    if (e.status === 'POSTED') {
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
      e.status === 'POSTED' && 
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
    updatedAt: new Date().toISOString()
  };

  setLpgStore(LPG_STORAGE_KEYS.DASHBOARD, summary);

  // Sync ke Cloud Firestore
  if (typeof db !== 'undefined' && db !== null) {
    try {
      db.collection('lpg_dashboard').doc('current').set(summary, { merge: true }).catch(() => {});
    } catch(e) {}
  }

  return summary;
}

// Inisialisasi Otomatis saat skrip dimuat
initLpgDatabase();

if (typeof window !== 'undefined') {
  window.initLpgDatabase = initLpgDatabase;
  window.processLpgEvent = processLpgEvent;
  window.getAgentPangkalanList = getAgentPangkalanList;
  window.addAgentPangkalan = addAgentPangkalan;
  window.editAgentPangkalan = editAgentPangkalan;
  window.softDeleteAgentPangkalan = softDeleteAgentPangkalan;
  window.refreshLpgDashboardSummary = refreshLpgDashboardSummary;
  window.getLpgStore = getLpgStore;
  window.LPG_STORAGE_KEYS = LPG_STORAGE_KEYS;
}
