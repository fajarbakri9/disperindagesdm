// ==============================================================================
// ADMIN LPG MONITORING CONTROLLER
// Manajemen 681 Pangkalan, 8 Agen Resmi, Ledger & Audit Trail Disperindag Pinrang
// ==============================================================================

let adminLpgCurrentPage = 1;
const ADMIN_LPG_PER_PAGE = 20;
let unsubscribeAdminLpgPangkalan = null;
let unsubscribeAdminLpgAudit = null;
let unsubscribeAdminLpgEvents = null;
let unsubscribeAdminLpgAgents = null;
let unsubscribeAdminLpgAlerts = null;

document.addEventListener('DOMContentLoaded', () => {
  initAdminLpgMonitoring();
});

function initAdminLpgMonitoring() {
  const todayWita = getLpgWitaDateKey();
  const reportDate = document.getElementById('adminLpgReportDate');
  const distributionDate = document.getElementById('adminLpgDistributionReportDate');
  const reportMonth = document.getElementById('adminLpgReportMonth');
  if (reportDate && !reportDate.value) reportDate.value = todayWita;
  if (distributionDate && !distributionDate.value) distributionDate.value = todayWita;
  if (reportMonth && !reportMonth.value) reportMonth.value = todayWita.slice(0, 7);
  refreshAdminLpgStats();
  renderAdminLpgPangkalanTable();
  renderAdminLpgAgentsTable();
  renderAdminLpgLedgerTable();
  renderAdminLpgAuditTable();
  renderAdminLpgAlertTable();

  if (typeof auth !== 'undefined' && auth) {
    auth.onAuthStateChanged(user => {
      const session = getCurrentSession();
      const permissions = Array.isArray(session?.permissions) ? session.permissions : [];
      const canMonitorLpg = session?.role === 'SUPER_ADMIN' || permissions.includes('all') || permissions.includes('lpg');
      if (user && canMonitorLpg && !unsubscribeAdminLpgPangkalan) subscribeAdminLpgFirestore();
    });
  }
}

function subscribeAdminLpgFirestore() {
  if (typeof db === 'undefined' || !db || !auth.currentUser) return;

  unsubscribeAdminLpgPangkalan = db.collection('lpg_pangkalan').onSnapshot(snapshot => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setLpgStore(LPG_STORAGE_KEYS.PANGKALAN, items);
    refreshAdminLpgStats();
    renderAdminLpgPangkalanTable();
    renderAdminLpgAgentsTable();
    publishLpgDashboardSnapshot();
  }, error => console.error('[-] Sinkron master pangkalan admin gagal:', error.code));

  unsubscribeAdminLpgAgents = db.collection('lpg_agents').onSnapshot(snapshot => {
    const agents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setLpgStore(LPG_STORAGE_KEYS.AGENTS, agents);
    refreshAdminLpgStats();
    renderAdminLpgAgentsTable();
    publishLpgDashboardSnapshot();
  }, error => console.error('[-] Sinkron master agen admin gagal:', error.code));

  unsubscribeAdminLpgAudit = db.collection('lpg_audit_logs')
    .orderBy('createdAt', 'desc').limit(100).onSnapshot(snapshot => {
      const logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt && typeof data.createdAt.toDate === 'function'
            ? data.createdAt.toDate().toISOString()
            : data.createdAt
        };
      });
      setLpgStore(LPG_STORAGE_KEYS.AUDIT_LOGS, logs);
      renderAdminLpgAuditTable();
    }, error => console.error('[-] Sinkron audit LPG admin gagal:', error.code));

  unsubscribeAdminLpgEvents = db.collection('lpg_events').onSnapshot(snapshot => {
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id, ...data,
        createdAt: data.createdAt && typeof data.createdAt.toDate === 'function'
          ? data.createdAt.toDate().toISOString() : data.createdAt,
        status: doc.metadata.hasPendingWrites ? 'PENDING_SYNC' : 'FIRESTORE_SYNCED'
      };
    }).sort((a, b) => String(b.effectiveAt || b.createdAt).localeCompare(String(a.effectiveAt || a.createdAt)));
    setLpgStore(LPG_STORAGE_KEYS.EVENTS, events);
    const balances = {};
    events.forEach(event => {
      if (!balances[event.agentId]) balances[event.agentId] = { agentId: event.agentId, filledCylinderBalance: 0 };
      balances[event.agentId].filledCylinderBalance += Number(event.delta || 0);
    });
    Object.values(balances).forEach(balance => {
      balance.hasStockAnomaly = balance.filledCylinderBalance < 0;
      balance.source = 'FIRESTORE_LEDGER_SUM_DELTA';
      balance.updatedAt = new Date().toISOString();
    });
    setLpgStore(LPG_STORAGE_KEYS.BALANCES, balances);
    refreshAdminLpgStats();
    renderAdminLpgAgentsTable();
    renderAdminLpgLedgerTable();
    publishLpgDashboardSnapshot();
  }, error => console.error('[-] Sinkron ledger LPG admin gagal:', error.code));

  unsubscribeAdminLpgAlerts = db.collection('lpg_alerts').onSnapshot(snapshot => {
    const alerts = snapshot.docs.map(doc => {
      const data = doc.data();
      const normalizeTime = value => value && typeof value.toDate === 'function' ? value.toDate().toISOString() : value;
      return { id: doc.id, ...data, createdAt: normalizeTime(data.createdAt), updatedAt: normalizeTime(data.updatedAt), acknowledgedAt: normalizeTime(data.acknowledgedAt), resolvedAt: normalizeTime(data.resolvedAt), dismissedAt: normalizeTime(data.dismissedAt) };
    });
    setLpgStore(LPG_STORAGE_KEYS.ALERTS, alerts);
    renderAdminLpgAlertTable();
  }, error => console.error('[-] Sinkron alert LPG admin gagal:', error.code));
}

let lpgSnapshotWriteTimer = null;
function publishLpgDashboardSnapshot() {
  if (!auth?.currentUser || !db) return;
  clearTimeout(lpgSnapshotWriteTimer);
  lpgSnapshotWriteTimer = setTimeout(async () => {
    const summary = refreshLpgDashboardSummary();
    const alerts = getAdminLpgAlertSummary();
    try {
      await db.collection('lpg_dashboard').doc('summary').set({
        officialAgents: summary.activeAgents,
        activePangkalan: summary.totalPangkalan,
        stockAtAgents: summary.stockAtAgents,
        distributedToday: summary.distributedToday,
        distributedThisMonth: summary.distributedThisMonth,
        negativeStockAgents: alerts.negativeStockAgents.length,
        inactiveAgentsToday: alerts.inactiveAgentsToday.length,
        pendingPangkalanVerification: alerts.pendingVerification.length,
        pendingPhuReview: alerts.pendingPhuReview.length,
        monthlyAllocation: null,
        allocationStatus: 'UNAVAILABLE',
        source: 'IMMUTABLE_LPG_EVENTS_SUM_DELTA',
        updatedBy: auth.currentUser.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('[-] Publikasi snapshot LPG gagal:', error.code);
    }
  }, 500);
}

async function commitAdminPangkalanAction(pangkalan, update, auditData) {
  if (typeof db === 'undefined' || !db || typeof auth === 'undefined' || !auth.currentUser) {
    return { success: false, message: 'Sesi Firebase Admin tidak tersedia. Silakan login ulang.' };
  }
  const user = auth.currentUser;
  const batch = db.batch();
  batch.update(db.collection('lpg_pangkalan').doc(pangkalan.id), {
    ...update,
    updatedBy: user.uid,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(db.collection('lpg_audit_logs').doc(`AUDIT-${generateUUID()}`), {
    action: auditData.action,
    entityType: 'PANGKALAN',
    entityId: pangkalan.id,
    agentId: pangkalan.agentId,
    actorUid: user.uid,
    actorRole: getCurrentSession()?.role || 'DISPERINDAG_ADMIN',
    before: auditData.before,
    after: auditData.after,
    reason: auditData.reason,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await batch.commit();
  return { success: true };
}

// 1. STATISTIK RINGKAS
function refreshAdminLpgStats() {
  const summary = refreshLpgDashboardSummary();
  
  const agentsEl = document.getElementById('adminLpgStatAgents');
  const pangkalanEl = document.getElementById('adminLpgStatPangkalan');
  const stockEl = document.getElementById('adminLpgStatStock');
  const distEl = document.getElementById('adminLpgStatDistributed');

  if (agentsEl) agentsEl.textContent = `${summary.activeAgents} Agen`;
  if (pangkalanEl) pangkalanEl.textContent = `${summary.totalPangkalan} Pangkalan`;
  if (stockEl) stockEl.textContent = `${summary.stockAtAgents.toLocaleString('id-ID')} Tabung`;
  if (distEl) distEl.textContent = `${summary.distributedToday.toLocaleString('id-ID')} Tabung`;
  renderAdminLpgAlerts();
}

function getAdminLpgAlertSummary() {
  const agents = getLpgStore(LPG_STORAGE_KEYS.AGENTS, []).filter(agent => agent.status === 'ACTIVE');
  const pangkalan = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  const balances = getLpgStore(LPG_STORAGE_KEYS.BALANCES, {});
  const events = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []);
  const today = getLpgWitaDateKey();
  const reportingAgents = new Set(events.filter(event =>
    getLpgWitaDateKey(event.effectiveAt || event.createdAt) === today
  ).map(event => event.agentId));
  return {
    negativeStockAgents: agents.filter(agent => Number(balances[agent.id]?.filledCylinderBalance || 0) < 0),
    inactiveAgentsToday: agents.filter(agent => !reportingAgents.has(agent.id)),
    pendingVerification: pangkalan.filter(item => !item.isDeleted && item.verificationStatus === 'PENDING_ADMIN_VERIFICATION'),
    pendingPhuReview: pangkalan.filter(item => !item.isDeleted && item.reviewFlag === 'POSSIBLE_PHU_AUG_2026')
  };
}

function renderAdminLpgAlerts() {
  const container = document.getElementById('adminLpgAlertsPanel');
  if (!container) return;
  const alerts = getAdminLpgAlertSummary();
  const cards = [
    { label: 'Saldo Negatif', count: alerts.negativeStockAgents.length, color: '#B91C1C', bg: '#FEF2F2', detail: 'Perlu rekonsiliasi stok', action: "switchAdminLpgSubView('alerts')" },
    { label: 'Belum Melapor Hari Ini', count: alerts.inactiveAgentsToday.length, color: '#B45309', bg: '#FFFBEB', detail: 'Dari agen aktif', action: "switchAdminLpgSubView('alerts')" },
    { label: 'Menunggu Verifikasi', count: alerts.pendingVerification.length, color: '#1D4ED8', bg: '#EFF6FF', detail: 'Pangkalan baru', action: "document.getElementById('adminLpgFilterStatus').value='PENDING';switchAdminLpgSubView('pangkalan')" },
    { label: 'Review PHU', count: alerts.pendingPhuReview.length, color: '#7C3AED', bg: '#F5F3FF', detail: 'Perlu keputusan admin', action: "document.getElementById('adminLpgFilterStatus').value='PHU_FLAG';switchAdminLpgSubView('pangkalan')" }
  ];
  container.innerHTML = cards.map(card => `
    <button type="button" onclick="${card.action}" style="text-align:left;border:1px solid ${card.color}33;background:${card.bg};border-radius:12px;padding:14px 16px;cursor:pointer;">
      <div style="font-size:.7rem;text-transform:uppercase;font-weight:900;color:${card.color};">${card.label}</div>
      <div style="font-size:1.55rem;font-weight:900;color:${card.color};margin:2px 0;">${card.count}</div>
      <div style="font-size:.72rem;color:#64748B;">${card.detail}</div>
    </button>`).join('');
}

function escapeLpgAlertHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function getAdminLpgAlertCandidates() {
  const summary = getAdminLpgAlertSummary();
  const today = getLpgWitaDateKey();
  const candidates = [];
  summary.negativeStockAgents.forEach(agent => candidates.push({
    id: `STOCK_VARIANCE-${today}-${agent.id}`, type: 'STOCK_VARIANCE', severity: 'CRITICAL',
    entityType: 'AGENT', entityId: agent.id, agentId: agent.id, subject: agent.name || agent.id,
    message: 'Saldo hasil agregasi immutable ledger berada di bawah nol dan perlu rekonsiliasi.'
  }));
  summary.inactiveAgentsToday.forEach(agent => candidates.push({
    id: `AGENT_NO_ACTIVITY-${today}-${agent.id}`, type: 'AGENT_NO_ACTIVITY_24H', severity: 'WARNING',
    entityType: 'AGENT', entityId: agent.id, agentId: agent.id, subject: agent.name || agent.id,
    message: 'Belum ada aktivitas ledger yang tercatat pada hari ini (WITA).'
  }));
  summary.pendingVerification.forEach(item => candidates.push({
    id: `PANGKALAN_UNVERIFIED-${item.id}`, type: 'PANGKALAN_CREATED_UNVERIFIED', severity: 'WARNING',
    entityType: 'PANGKALAN', entityId: item.id, agentId: item.agentId, subject: item.name || item.id,
    message: `${item.desaKelurahan || '-'}, ${item.kecamatan || '-'} menunggu verifikasi Disperindag.`
  }));
  summary.pendingPhuReview.forEach(item => candidates.push({
    id: `DATA_REVIEW-${item.id}`, type: 'DATA_REVIEW_REQUIRED', severity: 'CRITICAL',
    entityType: 'PANGKALAN', entityId: item.id, agentId: item.agentId, subject: item.name || item.id,
    message: 'Kemungkinan terkait kasus PHU Agustus 2026; keputusan wajib melalui verifikasi manual.'
  }));
  return candidates;
}

window.renderAdminLpgAlertTable = function() {
  const tbody = document.getElementById('adminLpgAlertTableBody');
  if (!tbody) return;
  const saved = new Map(getLpgStore(LPG_STORAGE_KEYS.ALERTS, []).map(item => [item.id, item]));
  const candidates = getAdminLpgAlertCandidates().map(item => ({ ...item, ...(saved.get(item.id) || {}) }));
  const historical = getLpgStore(LPG_STORAGE_KEYS.ALERTS, []).filter(item => !candidates.some(candidate => candidate.id === item.id));
  const filter = document.getElementById('adminLpgAlertStatusFilter')?.value || 'ACTIVE';
  const rows = [...candidates, ...historical].filter(item => {
    const status = item.status || 'OPEN';
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') return status === 'OPEN' || status === 'ACKNOWLEDGED';
    return status === filter;
  });
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#64748B;">Tidak ada alert pada filter ini.</td></tr>';
    return;
  }
  const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  rows.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
  tbody.innerHTML = rows.map(item => {
    const status = item.status || 'OPEN';
    const time = item.updatedAt || item.createdAt;
    const timeText = time ? new Date(time).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) + ' WITA' : 'Belum ditindaklanjuti';
    const severityColor = item.severity === 'CRITICAL' ? '#B91C1C' : '#B45309';
    return `<tr>
      <td><strong style="font-size:.76rem;color:${severityColor};">${escapeLpgAlertHtml(item.type)}</strong><br><span style="font-size:.68rem;font-weight:800;color:${severityColor};">${escapeLpgAlertHtml(item.severity)}</span></td>
      <td><strong>${escapeLpgAlertHtml(item.subject || item.entityId)}</strong><br><code>${escapeLpgAlertHtml(item.entityId)}</code></td>
      <td style="font-size:.78rem;color:#475569;max-width:360px;">${escapeLpgAlertHtml(item.message)}</td>
      <td><span style="font-size:.7rem;font-weight:900;">${escapeLpgAlertHtml(status)}</span>${item.note ? `<br><small>${escapeLpgAlertHtml(item.note)}</small>` : ''}</td>
      <td style="font-size:.72rem;color:#64748B;"><code>${escapeLpgAlertHtml(item.updatedBy || '-')}</code><br>${escapeLpgAlertHtml(timeText)}</td>
      <td style="text-align:center;white-space:nowrap;">${status === 'OPEN' ? `<button class="btn-outline" onclick="updateAdminLpgAlert('${item.id}','ACKNOWLEDGED')" style="padding:4px 7px;font-size:.68rem;">Akui</button>` : ''} ${(status === 'OPEN' || status === 'ACKNOWLEDGED') ? `<button class="btn-outline" onclick="updateAdminLpgAlert('${item.id}','RESOLVED')" style="padding:4px 7px;font-size:.68rem;color:#047857;">Selesai</button><button class="btn-outline" onclick="updateAdminLpgAlert('${item.id}','DISMISSED')" style="padding:4px 7px;font-size:.68rem;color:#64748B;">Abaikan</button>` : '-'}</td>
    </tr>`;
  }).join('');
};

window.updateAdminLpgAlert = function(alertId, nextStatus) {
  const candidate = getAdminLpgAlertCandidates().find(item => item.id === alertId) || getLpgStore(LPG_STORAGE_KEYS.ALERTS, []).find(item => item.id === alertId);
  if (!candidate || !auth?.currentUser || !db) return;
  CustomModal.form({
    title: `Tindak Lanjut Alert: ${nextStatus}`, icon: '⚠️', submitText: 'Simpan Tindak Lanjut',
    fields: [{ name: 'note', label: 'Catatan / Dasar Tindakan', type: 'textarea', required: true, rows: 3, placeholder: 'Tuliskan hasil pemeriksaan atau dasar keputusan' }],
    onSubmit: async data => {
      const user = auth.currentUser;
      const alertRef = db.collection('lpg_alerts').doc(alertId);
      const auditRef = db.collection('lpg_audit_logs').doc(`AUDIT-${generateUUID()}`);
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();
      await db.runTransaction(async transaction => {
        const existing = await transaction.get(alertRef);
        const statusFields = nextStatus === 'ACKNOWLEDGED'
          ? { acknowledgedBy: user.uid, acknowledgedAt: timestamp }
          : nextStatus === 'RESOLVED'
            ? { resolvedBy: user.uid, resolvedAt: timestamp }
            : { dismissedBy: user.uid, dismissedAt: timestamp };
        const update = { status: nextStatus, note: data.note.trim(), ...statusFields, updatedBy: user.uid, updatedAt: timestamp };
        if (existing.exists) transaction.update(alertRef, update);
        else transaction.set(alertRef, { id: alertId, type: candidate.type, severity: candidate.severity, entityType: candidate.entityType, entityId: candidate.entityId, agentId: candidate.agentId || null, subject: candidate.subject, message: candidate.message, ...update, createdAt: timestamp });
        transaction.set(auditRef, { action: `ALERT_${nextStatus}`, entityType: 'ALERT', entityId: alertId, agentId: candidate.agentId || 'SYSTEM', actorUid: user.uid, actorRole: getCurrentSession()?.role || 'LPG_ADMIN', before: { status: existing.exists ? existing.data().status : 'OPEN' }, after: { status: nextStatus }, reason: data.note.trim(), createdAt: timestamp });
      });
      CustomModal.alert({ title: 'Tindak Lanjut Tersimpan', message: `Status alert menjadi <strong>${nextStatus}</strong> dan audit trail telah dibuat.`, icon: '✓', type: 'info' });
    }
  });
};

// 2. SUBVIEW SWITCHER
window.switchAdminLpgSubView = function(viewName) {
  const views = ['pangkalan', 'map', 'agen', 'ledger', 'audit', 'alerts', 'reports'];
  views.forEach(v => {
    const el = document.getElementById(`subViewLpg${v.charAt(0).toUpperCase() + v.slice(1)}`);
    const btn = document.getElementById(`btnSub${v.charAt(0).toUpperCase() + v.slice(1)}`);
    if (v === viewName) {
      if (el) el.style.display = 'block';
      if (btn) {
        btn.className = 'btn-primary';
      }
    } else {
      if (el) el.style.display = 'none';
      if (btn) {
        btn.className = 'btn-outline';
      }
    }
  });

  if (viewName === 'pangkalan') renderAdminLpgPangkalanTable();
  if (viewName === 'map') {
    setTimeout(() => {
      if (typeof initLpgGisMap === 'function') {
        initLpgGisMap('adminLpgGisMapContainer');
      }
    }, 50);
  }
  if (viewName === 'agen') renderAdminLpgAgentsTable();
  if (viewName === 'ledger') renderAdminLpgLedgerTable();
  if (viewName === 'audit') renderAdminLpgAuditTable();
  if (viewName === 'alerts') renderAdminLpgAlertTable();
};

// 3. TABEL 681 PANGKALAN (FILTER, SEARCH, PAGINATION)
window.renderAdminLpgPangkalanTable = function() {
  const tbody = document.getElementById('adminLpgPangkalanTableBody');
  const paginEl = document.getElementById('adminLpgPangkalanPagination');
  if (!tbody) return;

  const searchInput = document.getElementById('adminLpgSearchPangkalan');
  const filterKec = document.getElementById('adminLpgFilterKecamatan');
  const filterStat = document.getElementById('adminLpgFilterStatus');

  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const kecVal = filterKec ? filterKec.value : '';
  const statVal = filterStat ? filterStat.value : '';

  const allPangkalan = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);

  // Filtering
  const filtered = allPangkalan.filter(p => {
    // Filter Kecamatan
    if (kecVal && p.kecamatan !== kecVal) return false;

    // Filter Status
    if (statVal === 'ACTIVE' && (p.isDeleted || p.status !== 'ACTIVE')) return false;
    if (statVal === 'PENDING' && (p.isDeleted || p.verificationStatus !== 'PENDING_ADMIN_VERIFICATION')) return false;
    if (statVal === 'PHU_FLAG' && p.reviewFlag !== 'POSSIBLE_PHU_AUG_2026') return false;
    if (statVal === 'DELETED' && !p.isDeleted) return false;

    // Search Query
    if (q) {
      const match = (
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.ownerName && p.ownerName.toLowerCase().includes(q)) ||
        (p.desaKelurahan && p.desaKelurahan.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        (p.agentName && p.agentName.toLowerCase().includes(q))
      );
      if (!match) return false;
    }

    return true;
  });

  // Pagination calculation
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ADMIN_LPG_PER_PAGE) || 1;
  if (adminLpgCurrentPage > totalPages) adminLpgCurrentPage = 1;

  const startIdx = (adminLpgCurrentPage - 1) * ADMIN_LPG_PER_PAGE;
  const pageItems = filtered.slice(startIdx, startIdx + ADMIN_LPG_PER_PAGE);

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#94A3B8;">Tidak ada data pangkalan yang sesuai kriteria pencarian.</td></tr>`;
    if (paginEl) paginEl.innerHTML = `<span>Menampilkan 0 dari total ${totalItems} pangkalan</span>`;
    return;
  }

  tbody.innerHTML = pageItems.map(p => {
    const isDeleted = p.isDeleted || p.status === 'DELETED';
    const isPending = p.verificationStatus === 'PENDING_ADMIN_VERIFICATION';
    const hasPhuFlag = p.reviewFlag === 'POSSIBLE_PHU_AUG_2026';

    let statusBadge = `<span style="background:#ECFDF5; color:#059669; font-weight:800; font-size:0.72rem; padding:3px 8px; border-radius:4px;">✓ Terverifikasi</span>`;
    if (isDeleted) {
      statusBadge = `<span style="background:#FEE2E2; color:#DC2626; font-weight:800; font-size:0.72rem; padding:3px 8px; border-radius:4px;">Nonaktif (Dihapus)</span>`;
    } else if (hasPhuFlag) {
      statusBadge = `<span style="background:#FEF3C7; color:#B45309; font-weight:800; font-size:0.72rem; padding:3px 8px; border-radius:4px;" title="Perlu Verifikasi Kasus Bungi">⚠️ Review PHU Bungi</span>`;
    } else if (isPending) {
      statusBadge = `<span style="background:#FEF3C7; color:#B45309; font-weight:800; font-size:0.72rem; padding:3px 8px; border-radius:4px;">Menunggu Verifikasi</span>`;
    }

    return `
      <tr style="${isDeleted ? 'opacity: 0.6; background: #F8FAFC;' : ''}">
        <td>
          <div style="font-weight: 800; color: #0F172A; font-size: 0.88rem;">${p.name}</div>
          <div style="font-size: 0.72rem; color: #1D4ED8; font-weight: 700;">ID: ${p.id}</div>
        </td>
        <td>
          <div style="font-size: 0.82rem; font-weight: 700; color: #334155;">${p.agentName || 'Agen Resmi'}</div>
          <div style="font-size: 0.7rem; color: #64748B;">${p.agentId}</div>
        </td>
        <td>
          <div style="font-size: 0.82rem; font-weight: 700; color: #0F172A;">${p.kecamatan}</div>
          <div style="font-size: 0.72rem; color: #64748B;">${p.desaKelurahan}</div>
        </td>
        <td>
          <div style="font-size: 0.82rem; color: #334155;">${p.ownerName || '-'}</div>
          <div style="font-size: 0.72rem; color: #64748B;">📞 ${p.phone || '-'}</div>
        </td>
        <td style="font-weight: 800; color: #059669; font-size: 0.84rem;">
          ${(p.monthlyAllocation || 560).toLocaleString('id-ID')} Tabung
        </td>
        <td>
          ${statusBadge}
        </td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 4px; justify-content: center;">
            ${isDeleted ? `
              <button onclick="adminRestorePangkalan('${p.id}')" class="btn-primary" style="padding: 4px 8px; font-size: 0.72rem; background: #0284C7;" title="Pulihkan / Aktifkan Kembali Pangkalan">
                ♻️ Pulihkan
              </button>
            ` : ''}
            ${isPending && !isDeleted ? `
              <button onclick="adminVerifyPangkalan('${p.id}')" class="btn-primary" style="padding: 4px 8px; font-size: 0.72rem; background: #059669;" title="Verifikasi Pangkalan">
                ✓ Verif
              </button>
            ` : ''}
            ${hasPhuFlag && !isDeleted ? `
              <button onclick="adminResolvePhuFlag('${p.id}')" class="btn-primary" style="padding: 4px 8px; font-size: 0.72rem; background: #D97706;" title="Tindak Lanjut Kasus Bungi">
                ⚖️ Kasus
              </button>
            ` : ''}
            <button onclick="adminDetailPangkalan('${p.id}')" class="btn-outline" style="padding: 4px 8px; font-size: 0.72rem;" title="Lihat Detail & Jejak Sumber">
              🔍 Detail
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Render Pagination Controls
  if (paginEl) {
    paginEl.innerHTML = `
      <div>Menampilkan <strong>${startIdx + 1} - ${Math.min(startIdx + ADMIN_LPG_PER_PAGE, totalItems)}</strong> dari <strong>${totalItems}</strong> pangkalan</div>
      <div style="display: flex; gap: 6px;">
        <button class="btn-outline" style="padding: 4px 10px; font-size: 0.74rem;" ${adminLpgCurrentPage <= 1 ? 'disabled' : ''} onclick="adminLpgChangePage(${adminLpgCurrentPage - 1})">◀ Sebelumnya</button>
        <span style="padding: 4px 8px; font-weight: 800;">Hal ${adminLpgCurrentPage} / ${totalPages}</span>
        <button class="btn-outline" style="padding: 4px 10px; font-size: 0.74rem;" ${adminLpgCurrentPage >= totalPages ? 'disabled' : ''} onclick="adminLpgChangePage(${adminLpgCurrentPage + 1})">Berikutnya ▶</button>
      </div>
    `;
  }
};

// 4. AKSI RESTORE PANGKALAN OLEH DISPERINDAG
function adminRestorePangkalanLocalLegacy(pangkalanId) {
  const pangkalanList = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  const idx = pangkalanList.findIndex(p => p.id === pangkalanId);
  if (idx === -1) return;

  CustomModal.confirm({
    title: "Pulihkan Pangkalan?",
    message: `Pangkalan <strong>${pangkalanList[idx].name}</strong> akan diaktifkan kembali ke status <strong>ACTIVE</strong> dan dapat dipilih kembali dalam distribusi agen.<br><br>Apakah Anda yakin ingin memulihkan pangkalan ini?`,
    confirmText: "Pulihkan Pangkalan",
    cancelText: "Batal",
    type: "info",
    onConfirm: () => {
      pangkalanList[idx].status = "ACTIVE";
      pangkalanList[idx].isDeleted = false;
      pangkalanList[idx].deletedAt = null;
      pangkalanList[idx].deleteReason = null;
      pangkalanList[idx].updatedAt = new Date().toISOString();

      setLpgStore(LPG_STORAGE_KEYS.PANGKALAN, pangkalanList);

      recordLpgAuditLog({
        action: "PANGKALAN_RESTORE",
        entityType: "PANGKALAN",
        entityId: pangkalanId,
        agentId: pangkalanList[idx].agentId,
        actorUid: "admin_disperindag",
        actorRole: "DISPERINDAG_ADMIN",
        before: { status: "DELETED", isDeleted: true },
        after: { status: "ACTIVE", isDeleted: false },
        reason: "Pangkalan dipulihkan kembali oleh Admin Disperindag ESDM Pinrang"
      });

      CustomModal.alert({
        title: "Pangkalan Dipulihkan",
        message: `Pangkalan <strong>${pangkalanList[idx].name}</strong> telah berhasil dipulihkan ke status aktif.`,
        icon: "♻️",
        type: "info"
      });

      refreshAdminLpgStats();
      renderAdminLpgPangkalanTable();
    }
  });
};

window.adminLpgChangePage = function(newPage) {
  adminLpgCurrentPage = newPage;
  renderAdminLpgPangkalanTable();
};

// 4. AKSI VERIFIKASI & DETAIL PANGKALAN OLEH DISPERINDAG
function adminVerifyPangkalanLocalLegacy(pangkalanId) {
  const pangkalanList = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  const idx = pangkalanList.findIndex(p => p.id === pangkalanId);
  if (idx === -1) return;

  pangkalanList[idx].verificationStatus = "VERIFIED";
  pangkalanList[idx].updatedAt = new Date().toISOString();
  setLpgStore(LPG_STORAGE_KEYS.PANGKALAN, pangkalanList);

  recordLpgAuditLog({
    action: "PANGKALAN_VERIFY",
    entityType: "PANGKALAN",
    entityId: pangkalanId,
    agentId: pangkalanList[idx].agentId,
    actorUid: "admin_disperindag",
    actorRole: "DISPERINDAG_ADMIN",
    before: { verificationStatus: "PENDING_ADMIN_VERIFICATION" },
    after: { verificationStatus: "VERIFIED" },
    reason: "Pangkalan diverifikasi sah oleh Pengawas Disperindag ESDM Pinrang"
  });

  CustomModal.alert({
    title: "Pangkalan Terverifikasi",
    message: `Pangkalan <strong>${pangkalanList[idx].name}</strong> telah berhasil diverifikasi oleh Disperindag ESDM.`,
    icon: "✓",
    type: "info"
  });

  refreshAdminLpgStats();
  renderAdminLpgPangkalanTable();
};

function adminResolvePhuFlagLocalLegacy(pangkalanId) {
  const pangkalanList = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  const p = pangkalanList.find(item => item.id === pangkalanId);
  if (!p) return;

  CustomModal.confirm({
    title: "Tindak Lanjut Kasus Bungi",
    message: `Pangkalan <strong>${p.name}</strong> di Desa Bungi tercatat dalam laporan kasus PHU Agustus 2026.<br><br>Apakah Anda ingin menetapkan status pangkalan ini menjadi <strong>PHU / Nonaktif Permanen</strong>?`,
    confirmText: "Putus Hubungan Usaha (PHU)",
    cancelText: "Pertahankan Aktif",
    type: "warning",
    onConfirm: () => {
      softDeleteAgentPangkalan(p.agentId, p.id, "Pemutusan Hubungan Usaha (PHU) oleh Agen PT. H. Abd Rahman Hasyim atas rekomendasi Disperindag akibat pelanggaran distribusi", { username: "admin_esdm", role: "DISPERINDAG_ADMIN" });
      p.reviewFlag = null;
      renderAdminLpgPangkalanTable();
      refreshAdminLpgStats();
    }
  });
};

window.adminDetailPangkalan = function(pangkalanId) {
  const pangkalanList = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  const p = pangkalanList.find(item => item.id === pangkalanId);
  if (!p) return;

  const src = p.sourceOriginal || {};

  CustomModal.alert({
    title: `Detail Data Pangkalan: ${p.name}`,
    message: `
      <div style="font-size:0.84rem; line-height:1.6; text-align:left;">
        <strong>ID Pangkalan:</strong> ${p.id}<br>
        <strong>Agen Penyalur:</strong> ${p.agentName} (${p.agentId})<br>
        <strong>Kecamatan / Desa:</strong> ${p.kecamatan} / ${p.desaKelurahan}<br>
        <strong>Alamat Lengkap:</strong> ${p.address}<br>
        <strong>Penanggung Jawab:</strong> ${p.ownerName || '-'} (📞 ${p.phone || '-' })<br>
        <strong>Status:</strong> ${p.status} | <strong>Verifikasi:</strong> ${p.verificationStatus}<br>
        <hr style="margin:10px 0; border:0; border-top:1px solid #E2E8F0;">
        <strong style="color:#1E3A8A;">🏛️ Metadata Provenance Sumber Resmi:</strong><br>
        • Sumber: <code>${p.sourceType || 'ESDM_PUBLIC_SEED'}</code><br>
        • Posisi Data: ${p.sourceDate || '31 Maret 2026'}<br>
        • Teks Asli ESDM: <em>"${src.namaSubPenyalur || p.name}" - ${src.kelurahan || p.desaKelurahan}, ${src.kecamatan || p.kecamatan}</em>
      </div>
    `,
    icon: "🏪",
    type: "info"
  });
};

// Implementasi otoritatif Firestore. Deklarasi ini menggantikan handler lokal
// lama di atas agar refresh/perangkat lain selalu melihat hasil yang sama.
window.adminRestorePangkalan = function(pangkalanId) {
  const pangkalan = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []).find(p => p.id === pangkalanId);
  if (!pangkalan) return;
  CustomModal.confirm({
    title: 'Pulihkan Pangkalan?',
    message: `Pangkalan <strong>${pangkalan.name}</strong> akan diaktifkan kembali dan tersedia dalam distribusi agen.`,
    confirmText: 'Pulihkan Pangkalan', cancelText: 'Batal', type: 'info',
    onConfirm: async () => {
      try {
        const result = await commitAdminPangkalanAction(pangkalan, {
          status: 'ACTIVE', isDeleted: false, deletedAt: null,
          deletedBy: null, deleteReason: null
        }, {
          action: 'PANGKALAN_RESTORE',
          before: { status: pangkalan.status, isDeleted: true },
          after: { status: 'ACTIVE', isDeleted: false },
          reason: 'Pangkalan dipulihkan kembali oleh Admin Disperindag ESDM Pinrang'
        });
        if (!result.success) throw new Error(result.message);
        CustomModal.alert({
          title: 'Pangkalan Dipulihkan',
          message: `Pangkalan <strong>${pangkalan.name}</strong> telah dipulihkan permanen di Firestore.`,
          icon: '✓', type: 'info'
        });
      } catch (error) {
        CustomModal.alert({ title: 'Gagal Memulihkan', message: error.message || 'Write Firestore ditolak.', icon: '!', type: 'error' });
      }
    }
  });
};

window.adminVerifyPangkalan = async function(pangkalanId) {
  const pangkalan = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []).find(p => p.id === pangkalanId);
  if (!pangkalan) return;
  try {
    const result = await commitAdminPangkalanAction(pangkalan, {
      verificationStatus: 'VERIFIED',
      verifiedBy: auth.currentUser.uid,
      verifiedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, {
      action: 'PANGKALAN_VERIFY',
      before: { verificationStatus: pangkalan.verificationStatus },
      after: { verificationStatus: 'VERIFIED' },
      reason: 'Pangkalan diverifikasi sah oleh Pengawas Disperindag ESDM Pinrang'
    });
    if (!result.success) throw new Error(result.message);
    CustomModal.alert({
      title: 'Pangkalan Terverifikasi',
      message: `Pangkalan <strong>${pangkalan.name}</strong> telah diverifikasi permanen di Firestore.`,
      icon: '✓', type: 'info'
    });
  } catch (error) {
    CustomModal.alert({ title: 'Gagal Memverifikasi', message: error.message || 'Write Firestore ditolak.', icon: '!', type: 'error' });
  }
};

// 5. TABEL SALDO 8 AGEN RESMI & REKONSILIASI AGEN BARU
function renderAdminLpgAgentsTable() {
  const tbody = document.getElementById('adminLpgAgentsTableBody');
  if (!tbody) return;

  const agents = getLpgStore(LPG_STORAGE_KEYS.AGENTS, []);
  const pangkalan = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  const balances = getLpgStore(LPG_STORAGE_KEYS.BALANCES, {});
  const events = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []);
  const todayStr = getLpgWitaDateKey();

  tbody.innerHTML = agents.map(ag => {
    const agPangkalan = pangkalan.filter(p => p.agentId === ag.id && !p.isDeleted);
    const bal = balances[ag.id] ? (balances[ag.id].filledCylinderBalance || 0) : 0;

    let inToday = 0;
    let outToday = 0;

    events.forEach(e => {
      if (e.agentId === ag.id && isLocallyAppliedLpgEvent(e)) {
        const eDate = getLpgWitaDateKey(e.effectiveAt || e.createdAt);
        if (eDate === todayStr) {
          if (e.type === 'STOCK_IN') inToday += e.quantity;
          if (e.type === 'DISTRIBUTION') outToday += e.quantity;
        }
      }
    });

    const isReported = inToday > 0 || outToday > 0;
    const statusReportBadge = isReported 
      ? `<span style="background:#ECFDF5; color:#065F46; font-size:0.74rem; font-weight:800; padding:3px 8px; border-radius:4px;">Ledger Firestore Hari Ini</span>`
      : `<span style="background:#F1F5F9; color:#64748B; font-size:0.74rem; font-weight:800; padding:3px 8px; border-radius:4px;">Belum Ada Catatan</span>`;

    return `
      <tr>
        <td>
          <div style="font-weight: 800; color: #0F172A; font-size: 0.88rem;">${ag.name}</div>
          <div style="font-size: 0.72rem; color: #1D4ED8; font-weight: 700;">Kode: ${ag.id}</div>
        </td>
        <td style="font-size: 0.82rem; color: #475569;">${ag.address || 'Kabupaten Pinrang'}</td>
        <td style="font-weight: 800; font-size: 0.86rem; color: #334155;">${agPangkalan.length} Pangkalan</td>
        <td style="font-weight: 900; font-size: 0.95rem; color: #D97706;">${bal.toLocaleString('id-ID')} Tabung</td>
        <td style="font-weight: 800; font-size: 0.86rem; color: #059669;">+${inToday.toLocaleString('id-ID')}</td>
        <td style="font-weight: 800; font-size: 0.86rem; color: #2563EB;">-${outToday.toLocaleString('id-ID')}</td>
        <td>${statusReportBadge}</td>
      </tr>
    `;
  }).join('');
}

// 5.1 REGISTRASI AGEN KE-9 / REKONSILIASI AGEN BARU
async function openAdminAddAgentModalLocalLegacy() {
  const name = await CustomModal.prompt({
    title: "Registrasi Agen Resmi Baru (Rekonsiliasi Agen ke-9)",
    message: "Masukkan <strong>Nama Perusahaan PT Agen Penyalur LPG 3 Kg</strong> resmi yang telah terverifikasi oleh Pertamina dan Disperindag Pinrang:",
    defaultValue: "PT. ",
    inputType: "text",
    icon: "🏢",
    confirmText: "Lanjutkan Registrasi"
  });

  if (!name || !name.trim() || name.trim() === "PT.") return;

  const agents = getLpgStore(LPG_STORAGE_KEYS.AGENTS, []);
  const newId = `AG-${(agents.length + 1).toString().padStart(3, '0')}`;
  const nowIso = new Date().toISOString();

  const newAgent = {
    id: newId,
    name: name.trim(),
    normalizedName: name.trim().toUpperCase(),
    status: "ACTIVE",
    phone: null,
    address: null,
    initialCylinderQuota: null,
    sourceType: "DISPERINDAG_RECONCILED",
    sourceDate: nowIso.slice(0, 10),
    verificationStatus: "VERIFIED",
    createdAt: nowIso
  };

  agents.push(newAgent);
  setLpgStore(LPG_STORAGE_KEYS.AGENTS, agents);

  // Inisialisasi Saldo Awal Agen Baru
  const balances = getLpgStore(LPG_STORAGE_KEYS.BALANCES, {});
  balances[newId] = {
    agentId: newId,
    agentName: newAgent.name,
    filledCylinderBalance: 0,
    updatedAt: nowIso
  };
  setLpgStore(LPG_STORAGE_KEYS.BALANCES, balances);

  recordLpgAuditLog({
    action: "AGENT_CREATE",
    entityType: "AGENT",
    entityId: newId,
    agentId: newId,
    actorUid: "admin_disperindag",
    actorRole: "DISPERINDAG_ADMIN",
    before: null,
    after: newAgent,
    reason: `Registrasi resmi agen penyalur baru ${newAgent.name} oleh Disperindag ESDM Pinrang`
  });

  CustomModal.alert({
    title: "Agen Baru Terdaftar",
    message: `Agen <strong>${newAgent.name}</strong> dengan kode <strong>${newId}</strong> tersimpan pada perangkat ini. Sinkronisasi master server memerlukan Firebase Authentication.`,
    icon: "✓",
    type: "info"
  });

  refreshAdminLpgStats();
  renderAdminLpgAgentsTable();
};

window.adminResolvePhuFlag = function(pangkalanId) {
  const pangkalan = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []).find(item => item.id === pangkalanId);
  if (!pangkalan) return;
  CustomModal.confirm({
    title: 'Tetapkan PHU / Nonaktif?',
    message: `Pangkalan <strong>${pangkalan.name}</strong> akan berstatus PHU dan tidak dapat dipilih untuk distribusi baru. Histori lama tetap dipertahankan.`,
    confirmText: 'Tetapkan PHU', cancelText: 'Batal', type: 'warning',
    onConfirm: async () => {
      try {
        const result = await commitAdminPangkalanAction(pangkalan, {
          status: 'PHU', isDeleted: true, reviewFlag: null,
          deleteReason: 'Pemutusan Hubungan Usaha (PHU) setelah verifikasi Disperindag',
          deletedBy: auth.currentUser.uid,
          deletedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, {
          action: 'PANGKALAN_PHU',
          before: { status: pangkalan.status, reviewFlag: pangkalan.reviewFlag || null },
          after: { status: 'PHU', isDeleted: true, reviewFlag: null },
          reason: 'PHU ditetapkan setelah verifikasi manual Disperindag ESDM Pinrang'
        });
        if (!result.success) throw new Error(result.message);
        CustomModal.alert({ title: 'Status PHU Tersimpan', message: 'Status tersimpan di Firestore dan histori distribusi tetap utuh.', icon: '✓', type: 'info' });
      } catch (error) {
        CustomModal.alert({ title: 'Gagal Menetapkan PHU', message: error.message || 'Write Firestore ditolak.', icon: '!', type: 'error' });
      }
    }
  });
};

window.openAdminAddAgentModal = async function() {
  if (!auth?.currentUser || !db) {
    CustomModal.alert({ title: 'Sesi Firebase Diperlukan', message: 'Silakan login ulang sebagai administrator.', icon: '!', type: 'warning' });
    return;
  }
  const name = await CustomModal.prompt({
    title: 'Registrasi Agen Resmi Baru',
    message: 'Masukkan nama perusahaan sesuai dokumen resmi Pertamina/Disperindag. Data ini akan menjadi master Firestore.',
    defaultValue: 'PT. ', inputType: 'text', icon: '🏢', confirmText: 'Simpan Agen'
  });
  const cleanName = (name || '').trim();
  if (!cleanName || cleanName === 'PT.') return;
  const agents = getLpgStore(LPG_STORAGE_KEYS.AGENTS, []);
  if (agents.some(agent => String(agent.name).trim().toUpperCase() === cleanName.toUpperCase())) {
    CustomModal.alert({ title: 'Agen Sudah Ada', message: 'Nama perusahaan yang sama sudah terdaftar.', icon: '!', type: 'warning' });
    return;
  }
  const usedNumbers = agents.map(agent => Number(String(agent.id).replace('AG-', ''))).filter(Number.isInteger);
  const nextNumber = Math.max(0, ...usedNumbers) + 1;
  const newId = `AG-${String(nextNumber).padStart(3, '0')}`;
  const ref = db.collection('lpg_agents').doc(newId);
  const auditRef = db.collection('lpg_audit_logs').doc(`AUDIT-${generateUUID()}`);
  const payload = {
    id: newId, name: cleanName, normalizedName: cleanName.toUpperCase(),
    status: 'ACTIVE', phone: null, address: null, initialCylinderQuota: null,
    sourceType: 'DISPERINDAG_RECONCILED', sourceDate: new Date().toISOString().slice(0, 10),
    verificationStatus: 'VERIFIED', createdBy: auth.currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  try {
    await db.runTransaction(async transaction => {
      const existing = await transaction.get(ref);
      if (existing.exists) throw new Error(`Kode ${newId} sudah digunakan. Muat ulang halaman.`);
      transaction.set(ref, payload);
      transaction.set(auditRef, {
        action: 'AGENT_CREATE', entityType: 'AGENT', entityId: newId, agentId: newId,
        actorUid: auth.currentUser.uid, actorRole: getCurrentSession()?.role || 'DISPERINDAG_ADMIN',
        before: null, after: { name: cleanName, status: 'ACTIVE' },
        reason: 'Registrasi agen resmi berdasarkan hasil rekonsiliasi Disperindag/Pertamina',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    CustomModal.alert({ title: 'Agen Baru Terdaftar', message: `<strong>${cleanName}</strong> tersimpan sebagai ${newId} di Firestore.`, icon: '✓', type: 'info' });
  } catch (error) {
    CustomModal.alert({ title: 'Gagal Menambah Agen', message: error.message || `Firestore menolak registrasi (${error.code || 'unknown'}).`, icon: '!', type: 'error' });
  }
};

async function commitAdminLedgerEvent(documentId, eventPayload, auditPayload) {
  if (!auth?.currentUser || !db) throw new Error('Sesi Firebase Admin tidak tersedia.');
  const eventRef = db.collection('lpg_events').doc(documentId);
  const auditRef = db.collection('lpg_audit_logs').doc(`AUDIT-${generateUUID()}`);
  const batch = db.batch();
  batch.set(eventRef, {
    ...eventPayload,
    clientEventId: documentId,
    createdBy: auth.currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  batch.set(auditRef, {
    ...auditPayload,
    entityType: 'LPG_EVENT', entityId: documentId,
    actorUid: auth.currentUser.uid,
    actorRole: getCurrentSession()?.role || 'LPG_ADMIN',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await batch.commit();
}

window.openAdminOpeningBalanceModal = function() {
  const agents = getLpgStore(LPG_STORAGE_KEYS.AGENTS, []).filter(agent => agent.status === 'ACTIVE');
  CustomModal.form({
    title: 'Bukukan Saldo Awal Agen', icon: '📦', submitText: 'Bukukan Saldo Awal',
    fields: [
      { name: 'agentId', label: 'Agen Penyalur', type: 'select', required: true, options: agents.map(agent => ({ value: agent.id, label: `${agent.id} — ${agent.name}` })) },
      { name: 'quantity', label: 'Jumlah Tabung Isi', type: 'number', required: true, placeholder: 'Contoh: 560' },
      { name: 'reason', label: 'Dasar / Catatan Saldo Awal', type: 'textarea', required: true, rows: 3, placeholder: 'Nomor berita acara atau hasil rekonsiliasi stok' }
    ],
    onSubmit: async values => {
      const agent = agents.find(item => item.id === values.agentId);
      const quantity = Number(values.quantity);
      if (!agent || !Number.isSafeInteger(quantity) || quantity <= 0) {
        CustomModal.alert({ title: 'Data Tidak Valid', message: 'Pilih agen dan masukkan jumlah bulat lebih dari nol.', icon: '!', type: 'warning' });
        return;
      }
      const eventId = `OPENING-${agent.id}`;
      try {
        await commitAdminLedgerEvent(eventId, {
          agentId: agent.id, type: 'OPENING_BALANCE', quantity, delta: quantity,
          pangkalanId: null, pangkalanSnapshot: null, effectiveAt: new Date().toISOString(),
          doNumber: null, vehicleNumber: null, note: values.reason.trim(), correctionOfEventId: null
        }, {
          action: 'OPENING_BALANCE_CREATE', agentId: agent.id, before: null,
          after: { quantity }, reason: values.reason.trim()
        });
        CustomModal.alert({ title: 'Saldo Awal Dibukukan', message: `${quantity.toLocaleString('id-ID')} tabung untuk <strong>${agent.name}</strong> tercatat sebagai event immutable.`, icon: '✓', type: 'info' });
      } catch (error) {
        const message = error.code === 'permission-denied' || error.code === 'already-exists'
          ? 'Saldo awal agen ini sudah pernah dibukukan atau Anda tidak memiliki izin.'
          : (error.message || 'Firestore menolak saldo awal.');
        CustomModal.alert({ title: 'Gagal Membukukan', message, icon: '!', type: 'error' });
      }
    }
  });
};

window.adminCorrectLpgEvent = async function(eventId) {
  const event = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []).find(item => item.id === eventId);
  if (!event || event.type === 'CORRECTION') return;
  const reason = await CustomModal.prompt({
    title: 'Koreksi / Batalkan Transaksi',
    message: `Event <strong>${eventId}</strong> tidak akan diubah. Sistem akan membuat event koreksi sebesar <strong>${Math.abs(Number(event.delta)).toLocaleString('id-ID')} tabung</strong> dengan arah berlawanan. Masukkan alasan resmi:`,
    defaultValue: '', inputType: 'text', icon: '↩', confirmText: 'Buat Event Koreksi'
  });
  if (!reason?.trim()) return;
  const quantity = Math.abs(Number(event.delta));
  const correctionId = `CORRECTION-${eventId}`;
  try {
    await commitAdminLedgerEvent(correctionId, {
      agentId: event.agentId, type: 'CORRECTION', quantity, delta: 0 - Number(event.delta),
      pangkalanId: null, pangkalanSnapshot: event.pangkalanSnapshot || null,
      effectiveAt: new Date().toISOString(), doNumber: null, vehicleNumber: null,
      note: reason.trim(), correctionOfEventId: eventId
    }, {
      action: 'LEDGER_CORRECTION_CREATE', agentId: event.agentId,
      before: { eventId, delta: Number(event.delta) },
      after: { eventId: correctionId, delta: 0 - Number(event.delta) }, reason: reason.trim()
    });
    CustomModal.alert({ title: 'Koreksi Dibukukan', message: 'Event lama tetap utuh dan saldo dikoreksi melalui event baru.', icon: '✓', type: 'info' });
  } catch (error) {
    CustomModal.alert({ title: 'Gagal Membuat Koreksi', message: error.code === 'permission-denied' ? 'Transaksi ini sudah dikoreksi atau akses ditolak.' : (error.message || 'Firestore menolak koreksi.'), icon: '!', type: 'error' });
  }
};

// 6. TABEL BUKU BESAR LEDGER TRANSAKSI
function renderAdminLpgLedgerTable() {
  const tbody = document.getElementById('adminLpgLedgerTableBody');
  if (!tbody) return;

  const events = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []);

  if (events.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#94A3B8;">Buku besar ledger transaksi masih kosong.</td></tr>`;
    return;
  }

  tbody.innerHTML = events.slice(0, 50).map(e => {
    const isStockIn = e.type === 'STOCK_IN' || e.type === 'OPENING_BALANCE';
    const isCorrection = e.type === 'CORRECTION';
    const isRejected = e.status === 'REJECTED';
    const dateFormatted = new Date(e.effectiveAt || e.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const isPositive = Number(e.delta) > 0;
    const color = isRejected ? '#DC2626' : (isCorrection ? '#7C3AED' : (isPositive ? '#059669' : '#1D4ED8'));
    const badgeType = e.type === 'OPENING_BALANCE' ? 'SALDO_AWAL' : (isCorrection ? 'KOREKSI' : (isStockIn ? 'STOK_MASUK' : 'DISTRIBUSI'));
    const targetName = isCorrection ? `Koreksi: ${e.correctionOfEventId}` : (isStockIn ? (e.doNumber ? 'DO: ' + e.doNumber : 'DO Pertamina') : (e.pangkalanSnapshot ? e.pangkalanSnapshot.name : 'Pangkalan'));

    return `
      <tr>
        <td style="font-size: 0.78rem; color: #64748B;">${dateFormatted} WITA</td>
        <td>
          <span style="background:${isCorrection ? '#F3E8FF' : (isPositive ? '#ECFDF5' : '#EFF6FF')}; color:${color}; font-weight:800; font-size:0.72rem; padding:3px 6px; border-radius:4px;">${badgeType}</span>
        </td>
        <td style="font-size: 0.82rem; font-weight:700; color: #334155;">${e.agentName || e.agentId}</td>
        <td style="font-size: 0.82rem; font-weight:800; color: #0F172A;">${targetName}</td>
        <td style="font-weight: 900; font-size: 0.92rem; color: ${color};">${isPositive ? '+' : '-'}${Number(e.quantity).toLocaleString('id-ID')} Tabung</td>
        <td>
          <span style="font-size:0.72rem; font-weight:800; padding:2px 6px; border-radius:4px; ${isRejected ? 'background:#FEE2E2; color:#DC2626;' : 'background:#ECFDF5; color:#059669;'}">${e.status}</span>
        </td>
        <td style="font-size: 0.76rem; color: #475569;">${e.createdByName || e.createdBy}</td>
        <td style="text-align:center;">${!isCorrection && !isRejected ? `<button type="button" class="btn-outline" onclick="adminCorrectLpgEvent('${e.id}')" style="padding:4px 8px;font-size:.7rem;color:#7C3AED;border-color:#C4B5FD;">↩ Koreksi</button>` : '-'}</td>
      </tr>
    `;
  }).join('');
}

// 7. TABEL AUDIT TRAIL LOG
function renderAdminLpgAuditTable() {
  const tbody = document.getElementById('adminLpgAuditTableBody');
  if (!tbody) return;

  const logs = getLpgStore(LPG_STORAGE_KEYS.AUDIT_LOGS, []);

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#94A3B8;">Belum ada catatan log audit pangkalan.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.slice(0, 50).map(l => {
    const dateFormatted = new Date(l.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `
      <tr>
        <td style="font-size: 0.76rem; color: #64748B;">${dateFormatted} WITA</td>
        <td><strong style="font-size:0.78rem; color:#1D4ED8;">${l.action}</strong></td>
        <td style="font-size: 0.8rem; font-weight:700;">${l.entityId || '-'}</td>
        <td style="font-size: 0.78rem; color:#475569;">${l.agentId || '-'}</td>
        <td style="font-size: 0.78rem;"><code>${l.actorUid} (${l.actorRole || 'USER'})</code></td>
        <td style="font-size: 0.78rem; color:#334155;">${l.reason || '-'}</td>
      </tr>
    `;
  }).join('');
}

// 8. LAPORAN OPERASIONAL BERBASIS IMMUTABLE LEDGER
function lpgCsvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadLpgCsv(filename, headers, rows) {
  const content = '\uFEFF' + [headers, ...rows].map(row => row.map(lpgCsvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getPostedLpgEvents() {
  return getLpgStore(LPG_STORAGE_KEYS.EVENTS, []).filter(event => isLocallyAppliedLpgEvent(event));
}

window.exportLpgDailyReportCSV = function() {
  const date = document.getElementById('adminLpgReportDate')?.value;
  if (!date) return CustomModal.alert({ title: 'Tanggal Wajib Dipilih', message: 'Pilih tanggal laporan harian.', icon: '!', type: 'warning' });
  const events = getPostedLpgEvents();
  const agents = getLpgStore(LPG_STORAGE_KEYS.AGENTS, []).filter(agent => agent.status === 'ACTIVE');
  const rows = agents.map(agent => {
    const agentEvents = events.filter(event => event.agentId === agent.id);
    const opening = agentEvents.filter(event => getLpgWitaDateKey(event.effectiveAt || event.createdAt) < date).reduce((sum, event) => sum + Number(event.delta || 0), 0);
    const daily = agentEvents.filter(event => getLpgWitaDateKey(event.effectiveAt || event.createdAt) === date);
    const stockIn = daily.filter(event => event.type === 'STOCK_IN').reduce((sum, event) => sum + Number(event.quantity || 0), 0);
    const distribution = daily.filter(event => event.type === 'DISTRIBUTION').reduce((sum, event) => sum + Number(event.quantity || 0), 0);
    const adjustment = daily.filter(event => event.type === 'CORRECTION' || event.type === 'OPENING_BALANCE').reduce((sum, event) => sum + Number(event.delta || 0), 0);
    const ending = opening + daily.reduce((sum, event) => sum + Number(event.delta || 0), 0);
    return [date, agent.id, agent.name, opening, stockIn, distribution, adjustment, ending, daily.length ? 'ADA AKTIVITAS' : 'BELUM ADA AKTIVITAS'];
  });
  downloadLpgCsv(`Laporan_Harian_LPG_Pinrang_${date}.csv`, ['Tanggal WITA', 'Kode Agen', 'Nama Agen', 'Stok Awal', 'Stok Masuk', 'Distribusi', 'Adjustment', 'Stok Akhir', 'Status Pelaporan'], rows);
};

window.exportLpgDistributionReportCSV = function() {
  const date = document.getElementById('adminLpgDistributionReportDate')?.value;
  if (!date) return CustomModal.alert({ title: 'Tanggal Wajib Dipilih', message: 'Pilih tanggal laporan distribusi.', icon: '!', type: 'warning' });
  const events = getPostedLpgEvents().filter(event => event.type === 'DISTRIBUTION' && getLpgWitaDateKey(event.effectiveAt || event.createdAt) === date);
  const agentNames = new Map(getLpgStore(LPG_STORAGE_KEYS.AGENTS, []).map(agent => [agent.id, agent.name]));
  const rows = events.map(event => [date, event.effectiveAt || event.createdAt, event.agentId, event.agentName || agentNames.get(event.agentId) || '', event.pangkalanId || '', event.pangkalanSnapshot?.name || '', event.pangkalanSnapshot?.kecamatan || '', event.pangkalanSnapshot?.desaKelurahan || '', event.quantity, event.doNumber || '', event.vehicleNumber || '', event.createdByName || event.createdBy || '', event.status || 'FIRESTORE_SYNCED']);
  downloadLpgCsv(`Distribusi_Pangkalan_LPG_Pinrang_${date}.csv`, ['Tanggal WITA', 'Waktu Efektif', 'Kode Agen', 'Nama Agen', 'Kode Pangkalan', 'Nama Pangkalan', 'Kecamatan', 'Desa/Kelurahan', 'Jumlah Tabung', 'Nomor DO/Nota', 'Armada', 'Operator', 'Status Ledger'], rows);
};

window.exportLpgMonthlyReportCSV = function() {
  const month = document.getElementById('adminLpgReportMonth')?.value;
  if (!month) return CustomModal.alert({ title: 'Bulan Wajib Dipilih', message: 'Pilih bulan laporan.', icon: '!', type: 'warning' });
  const events = getPostedLpgEvents().filter(event => getLpgWitaDateKey(event.effectiveAt || event.createdAt).startsWith(month));
  const agents = getLpgStore(LPG_STORAGE_KEYS.AGENTS, []).filter(agent => agent.status === 'ACTIVE');
  const rows = agents.map(agent => {
    const monthly = events.filter(event => event.agentId === agent.id);
    const stockIn = monthly.filter(event => event.type === 'STOCK_IN').reduce((sum, event) => sum + Number(event.quantity || 0), 0);
    const distributionEvents = monthly.filter(event => event.type === 'DISTRIBUTION');
    const distributed = distributionEvents.reduce((sum, event) => sum + Number(event.quantity || 0), 0);
    const served = new Set(distributionEvents.map(event => event.pangkalanId).filter(Boolean)).size;
    const hasAllocation = agent.monthlyAllocation !== null && agent.monthlyAllocation !== undefined && agent.monthlyAllocation !== '' && Number.isFinite(Number(agent.monthlyAllocation));
    const allocation = hasAllocation ? Number(agent.monthlyAllocation) : null;
    const realization = allocation > 0 ? `${(distributed / allocation * 100).toFixed(2)}%` : '';
    return [month, agent.id, agent.name, stockIn, distributed, served, allocation, realization, allocation === null ? 'DATA ALOKASI BELUM TERSEDIA' : 'TERSEDIA'];
  });
  downloadLpgCsv(`Rekap_Bulanan_LPG_Pinrang_${month}.csv`, ['Bulan WITA', 'Kode Agen', 'Nama Agen', 'Total Stok Masuk', 'Total Distribusi', 'Pangkalan Terlayani', 'Alokasi Resmi', 'Realisasi', 'Status Alokasi'], rows);
};

// 9. EKSPOR DATA KE CSV RESMI DISPERINDAG
window.exportLpgPangkalanCSV = function() {
  const pangkalanList = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  if (pangkalanList.length === 0) {
    CustomModal.alert({ title: "Data Kosong", message: "Tidak ada data pangkalan untuk diekspor.", icon: "⚠️", type: "warning" });
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "ID,Nama Pangkalan,Agen Penyalur,Kode Agen,Kecamatan,Desa/Kelurahan,Alamat,Pemilik,Kontak,Alokasi Bulanan,Status,Status Verifikasi,Sumber Data\n";

  pangkalanList.forEach(p => {
    const row = [
      `"${p.id}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.agentName || '').replace(/"/g, '""')}"`,
      `"${p.agentId || ''}"`,
      `"${p.kecamatan || ''}"`,
      `"${p.desaKelurahan || ''}"`,
      `"${(p.address || '').replace(/"/g, '""')}"`,
      `"${(p.ownerName || '').replace(/"/g, '""')}"`,
      `"${p.phone || ''}"`,
      p.monthlyAllocation ?? '',
      `"${p.status || 'ACTIVE'}"`,
      `"${p.verificationStatus || 'VERIFIED'}"`,
      `"${p.sourceType || 'ESDM_PUBLIC_SEED'}"`
    ];
    csvContent += row.join(",") + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Master_Pangkalan_LPG_3Kg_Pinrang_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.exportLpgLedgerCSV = function() {
  const events = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []);
  if (events.length === 0) {
    CustomModal.alert({ title: "Buku Besar Kosong", message: "Belum ada riwayat transaksi ledger untuk diekspor.", icon: "⚠️", type: "warning" });
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "ID Transaksi,Client Event ID,Jenis Transaksi,Waktu Efektif (WITA),Kode Agen,Nama Agen,Tujuan / Pangkalan,Jumlah Tabung,Nomor DO,Armada,Status Ledger,Pelapor\n";

  events.forEach(e => {
    const targetName = e.type === 'STOCK_IN' 
      ? (e.doNumber ? 'DO: ' + e.doNumber : 'DO Pertamina') 
      : (e.pangkalanSnapshot ? e.pangkalanSnapshot.name : 'Pangkalan');

    const row = [
      `"${e.id}"`,
      `"${e.clientEventId || ''}"`,
      `"${e.type}"`,
      `"${e.effectiveAt || e.createdAt}"`,
      `"${e.agentId}"`,
      `"${(e.agentName || '').replace(/"/g, '""')}"`,
      `"${targetName.replace(/"/g, '""')}"`,
      e.quantity,
      `"${e.doNumber || ''}"`,
      `"${e.vehicleNumber || ''}"`,
      `"${e.status}"`,
      `"${e.createdByName || e.createdBy}"`
    ];
    csvContent += row.join(",") + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Buku_Besar_Ledger_LPG_3Kg_Pinrang_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
