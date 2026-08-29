// ==============================================================================
// ADMIN LPG MONITORING CONTROLLER
// Manajemen 681 Pangkalan, 8 Agen Resmi, Ledger & Audit Trail Disperindag Pinrang
// ==============================================================================

let adminLpgCurrentPage = 1;
const ADMIN_LPG_PER_PAGE = 20;

document.addEventListener('DOMContentLoaded', () => {
  initAdminLpgMonitoring();
});

function initAdminLpgMonitoring() {
  refreshAdminLpgStats();
  renderAdminLpgPangkalanTable();
  renderAdminLpgAgentsTable();
  renderAdminLpgLedgerTable();
  renderAdminLpgAuditTable();
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
}

// 2. SUBVIEW SWITCHER
window.switchAdminLpgSubView = function(viewName) {
  const views = ['pangkalan', 'map', 'agen', 'ledger', 'audit'];
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
window.adminRestorePangkalan = function(pangkalanId) {
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
window.adminVerifyPangkalan = function(pangkalanId) {
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

window.adminResolvePhuFlag = function(pangkalanId) {
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

// 5. TABEL SALDO 8 AGEN RESMI & REKONSILIASI AGEN BARU
function renderAdminLpgAgentsTable() {
  const tbody = document.getElementById('adminLpgAgentsTableBody');
  if (!tbody) return;

  const agents = getLpgStore(LPG_STORAGE_KEYS.AGENTS, []);
  const pangkalan = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  const balances = getLpgStore(LPG_STORAGE_KEYS.BALANCES, {});
  const events = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []);
  const todayStr = new Date().toISOString().slice(0, 10);

  tbody.innerHTML = agents.map(ag => {
    const agPangkalan = pangkalan.filter(p => p.agentId === ag.id && !p.isDeleted);
    const bal = balances[ag.id] ? (balances[ag.id].filledCylinderBalance || 0) : 0;

    let inToday = 0;
    let outToday = 0;

    events.forEach(e => {
      if (e.agentId === ag.id && e.status === 'POSTED') {
        const eDate = (e.effectiveAt || e.createdAt || '').slice(0, 10);
        if (eDate === todayStr) {
          if (e.type === 'STOCK_IN') inToday += e.quantity;
          if (e.type === 'DISTRIBUTION') outToday += e.quantity;
        }
      }
    });

    const isReported = inToday > 0 || outToday > 0;
    const statusReportBadge = isReported 
      ? `<span style="background:#ECFDF5; color:#059669; font-size:0.74rem; font-weight:800; padding:3px 8px; border-radius:4px;">✓ Lapor Hari Ini</span>`
      : `<span style="background:#FEF2F2; color:#DC2626; font-size:0.74rem; font-weight:800; padding:3px 8px; border-radius:4px;">Belum Ada Laporan</span>`;

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
window.openAdminAddAgentModal = async function() {
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
    phone: "0812 4292 1215",
    address: "Kabupaten Pinrang",
    initialCylinderQuota: 40000,
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
    lastPostedEventAt: nowIso,
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
    message: `Agen resmi <strong>${newAgent.name}</strong> dengan Kode <strong>${newId}</strong> berhasil didaftarkan ke dalam sistem pengawasan.`,
    icon: "✓",
    type: "info"
  });

  refreshAdminLpgStats();
  renderAdminLpgAgentsTable();
};

// 6. TABEL BUKU BESAR LEDGER TRANSAKSI
function renderAdminLpgLedgerTable() {
  const tbody = document.getElementById('adminLpgLedgerTableBody');
  if (!tbody) return;

  const events = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []);

  if (events.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#94A3B8;">Buku besar ledger transaksi masih kosong.</td></tr>`;
    return;
  }

  tbody.innerHTML = events.slice(0, 50).map(e => {
    const isStockIn = e.type === 'STOCK_IN';
    const isRejected = e.status === 'REJECTED';
    const dateFormatted = new Date(e.effectiveAt || e.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const color = isRejected ? '#DC2626' : (isStockIn ? '#059669' : '#1D4ED8');
    const badgeType = isStockIn ? 'STOK_MASUK' : 'DISTRIBUSI';
    const targetName = isStockIn ? (e.doNumber ? 'DO: ' + e.doNumber : 'DO Pertamina') : (e.pangkalanSnapshot ? e.pangkalanSnapshot.name : 'Pangkalan');

    return `
      <tr>
        <td style="font-size: 0.78rem; color: #64748B;">${dateFormatted} WITA</td>
        <td>
          <span style="background:${isStockIn ? '#ECFDF5' : '#EFF6FF'}; color:${color}; font-weight:800; font-size:0.72rem; padding:3px 6px; border-radius:4px;">${badgeType}</span>
        </td>
        <td style="font-size: 0.82rem; font-weight:700; color: #334155;">${e.agentName || e.agentId}</td>
        <td style="font-size: 0.82rem; font-weight:800; color: #0F172A;">${targetName}</td>
        <td style="font-weight: 900; font-size: 0.92rem; color: ${color};">${isStockIn ? '+' : '-'}${e.quantity.toLocaleString('id-ID')} Tabung</td>
        <td>
          <span style="font-size:0.72rem; font-weight:800; padding:2px 6px; border-radius:4px; ${isRejected ? 'background:#FEE2E2; color:#DC2626;' : 'background:#ECFDF5; color:#059669;'}">${e.status}</span>
        </td>
        <td style="font-size: 0.76rem; color: #475569;">${e.createdByName || e.createdBy}</td>
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

// 8. EKSPOR DATA KE CSV RESMI DISPERINDAG
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
      p.monthlyAllocation || 560,
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

