// ==============================================================================
// LPG AGEN CONTROLLER & INTERACTION MANAGER
// Mobile-First Portal Operasional Agen LPG 3 Kg Pinrang
// ==============================================================================

let currentAgentSession = null;
let currentAgentId = null;
let currentStockInEventId = null;
let currentDistributionEventId = null;
let unsubscribeAgentPangkalan = null;
let unsubscribeAgentLedger = null;
let isSubmittingStockIn = false;
let isSubmittingDistribution = false;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Guard Autentikasi Khusus Agen LPG
  currentAgentSession = requireAuth(['lpg_agen']);
  if (!currentAgentSession) return;

  currentAgentId = currentAgentSession.agentId || 'AG-001';

  // 2. Set Informasi Header
  const nameEl = document.getElementById('lpgAgentHeaderName');
  const codeEl = document.getElementById('lpgAgentHeaderCode');
  if (nameEl) nameEl.textContent = currentAgentSession.agentName || currentAgentSession.name;
  if (codeEl) codeEl.textContent = currentAgentId;

  updateLpgPersistenceNotice();
  if (typeof auth !== 'undefined' && auth) {
    auth.onAuthStateChanged(user => {
      updateLpgPersistenceNotice();
      if (!user) return;
      if (!unsubscribeAgentPangkalan) {
        unsubscribeAgentPangkalan = subscribeAgentPangkalanFirestore(currentAgentId, () => {
          renderAgentPangkalanListUI();
          populateDistributionPangkalanDropdown();
        });
      }
      if (!unsubscribeAgentLedger) {
        unsubscribeAgentLedger = subscribeAgentLedgerFirestore(currentAgentId, () => {
          refreshAgentDashboardUI();
          renderLedgerHistoryUI();
        });
      }
    });
  }

  // 3. Set Default Date Picker ke Sekarang
  setDefaultDateTimeInputs();

  // 4. Render UI Awal
  refreshAgentDashboardUI();
  renderAgentPangkalanListUI();
  populateDistributionPangkalanDropdown();
  renderLedgerHistoryUI();

  window.addEventListener('online', updateLpgPersistenceNotice);
  window.addEventListener('offline', updateLpgPersistenceNotice);
  window.addEventListener('lpg-ledger-write-error', event => {
    CustomModal.alert({
      title: 'Sinkronisasi Ditolak',
      message: `Transaksi ${event.detail?.clientEventId || ''} tidak diterima Firestore (${event.detail?.code || 'unknown'}). Periksa data lalu coba kembali.`,
      icon: '!', type: 'error'
    });
  });
});

function updateLpgPersistenceNotice() {
  const notice = document.getElementById('lpgPersistenceNotice');
  if (!notice) return;
  const connected = typeof auth !== 'undefined' && auth && auth.currentUser;
  if (connected && navigator.onLine) {
    notice.style.cssText += 'border-color:#10B981;background:#ECFDF5;color:#065F46;';
    notice.textContent = 'Firestore online/offline aktif. Transaksi dikirim sebagai immutable ledger dan akan tersinkron otomatis.';
  } else if (connected) {
    notice.style.cssText += 'border-color:#F59E0B;background:#FFFBEB;color:#92400E;';
    notice.textContent = 'Perangkat sedang offline. Transaksi baru berstatus pending dan akan dikirim otomatis saat koneksi kembali.';
  } else {
    notice.textContent = 'Mode penyimpanan lokal. Catatan pada perangkat ini belum merupakan ledger Firestore dan tidak ikut indikator resmi Command Center.';
  }
}

function setDefaultDateTimeInputs() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const localIso = now.toISOString().slice(0, 16);

  const inDate = document.getElementById('inputStockInDate');
  const distDate = document.getElementById('inputDistDate');
  if (inDate) inDate.value = localIso;
  if (distDate) distDate.value = localIso;
}

// SWITCH TABS
window.switchLpgTab = function(tabName) {
  const tabs = ['dashboard', 'pangkalan', 'riwayat'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const panel = document.getElementById(`panel${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (t === tabName) {
      if (btn) btn.classList.add('active');
      if (panel) panel.classList.add('active');
    } else {
      if (btn) btn.classList.remove('active');
      if (panel) panel.classList.remove('active');
    }
  });

  if (tabName === 'pangkalan') renderAgentPangkalanListUI();
  if (tabName === 'riwayat') renderLedgerHistoryUI();
  if (tabName === 'dashboard') refreshAgentDashboardUI();
};

// 1. DASHBOARD REFRESH
function refreshAgentDashboardUI() {
  if (!currentAgentId) return;

  const balances = getLpgStore(LPG_STORAGE_KEYS.BALANCES, {});
  const currentBal = (balances[currentAgentId] && balances[currentAgentId].filledCylinderBalance !== undefined)
    ? balances[currentAgentId].filledCylinderBalance
    : 0;

  const stockValEl = document.getElementById('lpgCurrentStockVal');
  if (stockValEl) stockValEl.textContent = currentBal.toLocaleString('id-ID');

  // Rekap Hari Ini
  const events = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []);
  const todayStr = getLpgWitaDateKey();
  let todayIn = 0;
  let todayOut = 0;

  const agentEvents = events.filter(e => e.agentId === currentAgentId && isLocallyAppliedLpgEvent(e));
  
  agentEvents.forEach(e => {
    const eDate = getLpgWitaDateKey(e.effectiveAt || e.createdAt);
    if (eDate === todayStr) {
      if (e.type === 'STOCK_IN') todayIn += e.quantity;
      if (e.type === 'DISTRIBUTION') todayOut += e.quantity;
    }
  });

  const todayInEl = document.getElementById('lpgTodayStockIn');
  const todayOutEl = document.getElementById('lpgTodayDistributed');
  if (todayInEl) todayInEl.textContent = `+${todayIn.toLocaleString('id-ID')}`;
  if (todayOutEl) todayOutEl.textContent = `-${todayOut.toLocaleString('id-ID')}`;

  // Aktivitas Terbaru
  const recentFeedEl = document.getElementById('lpgRecentActivityFeed');
  if (recentFeedEl) {
    const latest5 = agentEvents.slice(0, 5);
    if (latest5.length === 0) {
      recentFeedEl.innerHTML = `<div style="font-size: 0.76rem; color: #94A3B8; padding: 10px 0; text-align: center;">Belum ada aktivitas transaksi.</div>`;
    } else {
      recentFeedEl.innerHTML = latest5.map(e => {
        const isStockIn = e.type === 'STOCK_IN';
        const timeStr = (e.effectiveAt || e.createdAt || '').slice(11, 16);
        const title = isStockIn ? `Stok Masuk DO` : (e.pangkalanSnapshot ? e.pangkalanSnapshot.name : 'Pangkalan');
        const color = isStockIn ? '#059669' : '#1D4ED8';
        const sign = isStockIn ? '+' : '-';
        return `
          <div class="activity-feed-item">
            <div>
              <div style="font-size: 0.82rem; font-weight: 800; color: #0F172A;">${title}</div>
              <div style="font-size: 0.7rem; color: #64748B;">⏰ ${timeStr} WITA ${e.doNumber ? '&bull; DO: ' + e.doNumber : ''}</div>
            </div>
            <div style="font-size: 0.95rem; font-weight: 800; color: ${color};">${sign}${e.quantity.toLocaleString('id-ID')}</div>
          </div>
        `;
      }).join('');
    }
  }
}

// 2. MODAL CONTROLS
window.openModalStockIn = function() {
  currentStockInEventId = generateUUID();
  setDefaultDateTimeInputs();
  document.getElementById('inputStockInQty').value = '';
  document.getElementById('inputStockInDo').value = '';
  document.getElementById('modalStockIn').style.display = 'flex';
};

window.openModalDistribution = function() {
  currentDistributionEventId = generateUUID();
  populateDistributionPangkalanDropdown();
  setDefaultDateTimeInputs();
  document.getElementById('inputDistQty').value = '';
  document.getElementById('inputDistVehicle').value = '';
  document.getElementById('modalDistribution').style.display = 'flex';
};

window.closeModal = function(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.style.display = 'none';
};

// 3. SUBMIT STOK MASUK
window.handleStockInSubmit = async function(e) {
  e.preventDefault();
  if (isSubmittingStockIn) return;
  const qty = parseInt(document.getElementById('inputStockInQty').value, 10);
  const doNum = document.getElementById('inputStockInDo').value.trim();
  const dateVal = document.getElementById('inputStockInDate').value;
  const note = document.getElementById('inputStockInNote').value.trim();

  if (isNaN(qty) || qty <= 0) {
    CustomModal.alert({ title: "Jumlah Tidak Valid", message: "Masukkan jumlah tabung lebih dari 0.", icon: "⚠️", type: "warning" });
    return;
  }

  isSubmittingStockIn = true;
  const submitButton = document.getElementById('btnSubmitStockIn');
  if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Mengirim...'; }
  let res;
  try {
    res = await submitLpgLedgerEvent({
    type: 'STOCK_IN',
    agentId: currentAgentId,
    agentName: currentAgentSession.agentName,
    quantity: qty,
    doNumber: doNum,
    effectiveAt: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
    note: note,
    clientEventId: currentStockInEventId || generateUUID()
    }, currentAgentSession);
  } catch (error) {
    res = { success: false, message: `Transaksi gagal diproses (${error.code || 'unknown'}).` };
  } finally {
    isSubmittingStockIn = false;
    if (submitButton) { submitButton.disabled = false; submitButton.textContent = '✓ Bukukan Stok Masuk'; }
  }

  if (res.success) {
    currentStockInEventId = null;
    closeModal('modalStockIn');
    CustomModal.alert({
      title: res.persistence === 'FIRESTORE_QUEUED' ? "Menunggu Sinkronisasi" : "Tersimpan di Perangkat",
      message: res.persistence === 'FIRESTORE_QUEUED'
        ? `Penerimaan <strong>${qty.toLocaleString('id-ID')} tabung</strong> masuk antrean Firestore. Status akan tersinkron otomatis saat koneksi tersedia.`
        : `Penerimaan <strong>${qty.toLocaleString('id-ID')} tabung</strong> tersimpan sebagai catatan lokal.<br><br>Saldo lokal: <strong>${res.currentBalance.toLocaleString('id-ID')} tabung</strong>. Data ini belum menjadi ledger Firestore.`,
      icon: "📦",
      type: "info"
    });
    refreshAgentDashboardUI();
    renderLedgerHistoryUI();
  } else {
    CustomModal.alert({ title: "Gagal Mencatat", message: res.message, icon: "❌", type: "error" });
  }
};

// 4. SUBMIT DISTRIBUSI KE PANGKALAN
window.handleDistributionSubmit = async function(e) {
  e.preventDefault();
  if (isSubmittingDistribution) return;
  const pangkalanId = document.getElementById('selectDistPangkalan').value;
  const qty = parseInt(document.getElementById('inputDistQty').value, 10);
  const vehicle = document.getElementById('inputDistVehicle').value.trim();
  const dateVal = document.getElementById('inputDistDate').value;
  const doNum = document.getElementById('inputDistDo').value.trim();

  if (!pangkalanId) {
    CustomModal.alert({ title: "Pangkalan Belum Dipilih", message: "Silakan pilih pangkalan tujuan penyaluran.", icon: "⚠️", type: "warning" });
    return;
  }

  if (isNaN(qty) || qty <= 0) {
    CustomModal.alert({ title: "Jumlah Tidak Valid", message: "Masukkan jumlah tabung penyaluran lebih dari 0.", icon: "⚠️", type: "warning" });
    return;
  }

  const targetPangkalan = getAgentPangkalanList(currentAgentId).find(item => item.id === pangkalanId);
  isSubmittingDistribution = true;
  const submitButton = document.getElementById('btnSubmitDistribution');
  if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Mengirim...'; }
  let res;
  try {
    res = await submitLpgLedgerEvent({
    type: 'DISTRIBUTION',
    agentId: currentAgentId,
    agentName: currentAgentSession.agentName,
    pangkalanId: pangkalanId,
    pangkalanSnapshot: targetPangkalan ? {
      name: targetPangkalan.name,
      kecamatan: targetPangkalan.kecamatan,
      desaKelurahan: targetPangkalan.desaKelurahan,
      agentId: targetPangkalan.agentId
    } : null,
    quantity: qty,
    vehicleNumber: vehicle,
    doNumber: doNum,
    effectiveAt: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
    clientEventId: currentDistributionEventId || generateUUID()
    }, currentAgentSession);
  } catch (error) {
    res = { success: false, message: `Transaksi gagal diproses (${error.code || 'unknown'}).` };
  } finally {
    isSubmittingDistribution = false;
    if (submitButton) { submitButton.disabled = false; submitButton.textContent = '✓ Salurkan Tabung'; }
  }

  if (res.success) {
    currentDistributionEventId = null;
    closeModal('modalDistribution');
    CustomModal.alert({
      title: res.persistence === 'FIRESTORE_QUEUED' ? "Menunggu Sinkronisasi" : "Tersimpan di Perangkat",
      message: res.persistence === 'FIRESTORE_QUEUED'
        ? `Penyaluran <strong>${qty.toLocaleString('id-ID')} tabung</strong> masuk antrean immutable ledger Firestore.`
        : `Penyaluran <strong>${qty.toLocaleString('id-ID')} tabung</strong> tersimpan sebagai catatan lokal.<br><br>Sisa saldo lokal: <strong>${res.currentBalance.toLocaleString('id-ID')} tabung</strong>.`,
      icon: "🚚",
      type: "info"
    });
    refreshAgentDashboardUI();
    renderLedgerHistoryUI();
  } else {
    CustomModal.alert({ title: "Penyaluran Ditolak", message: res.message, icon: "⚠️", type: "warning" });
  }
};

// 5. DROPDOWN PANGKALAN DISTRIBUSI
function populateDistributionPangkalanDropdown() {
  const select = document.getElementById('selectDistPangkalan');
  if (!select || !currentAgentId) return;

  const pangkalanList = getAgentPangkalanList(currentAgentId).filter(p => !p.isDeleted && p.status === 'ACTIVE');
  
  select.innerHTML = `<option value="">-- Pilih Pangkalan Binaan (${pangkalanList.length} Aktif) --</option>` +
    pangkalanList.map(p => `
      <option value="${p.id}">${p.name} — ${p.desaKelurahan}, ${p.kecamatan}</option>
    `).join('');
}

// 6. RENDER PANGKALAN LIST UI
function renderAgentPangkalanListUI() {
  const container = document.getElementById('agentPangkalanListContainer');
  const countLabel = document.getElementById('pangkalanCountSummary');
  if (!container || !currentAgentId) return;

  const searchInput = document.getElementById('searchPangkalanInput');
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const allAgentPangkalan = getAgentPangkalanList(currentAgentId);
  const activeCount = allAgentPangkalan.filter(p => !p.isDeleted).length;
  const pendingCount = allAgentPangkalan.filter(p => !p.isDeleted && p.verificationStatus === 'PENDING_ADMIN_VERIFICATION').length;

  if (countLabel) {
    countLabel.textContent = `Total: ${activeCount} Aktif (${pendingCount} Menunggu Verifikasi)`;
  }

  const filtered = allAgentPangkalan.filter(p => {
    if (p.isDeleted) return false;
    if (!q) return true;
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.desaKelurahan && p.desaKelurahan.toLowerCase().includes(q)) ||
      (p.kecamatan && p.kecamatan.toLowerCase().includes(q)) ||
      (p.address && p.address.toLowerCase().includes(q))
    );
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:30px 10px; color:#94A3B8; font-size:0.84rem;">Tidak ada pangkalan yang cocok dengan pencarian.</div>`;
    return;
  }

  container.innerHTML = filtered.map(p => {
    const isPending = p.verificationStatus === 'PENDING_ADMIN_VERIFICATION';
    const badgeHtml = isPending
      ? `<span class="pangkalan-badge badge-pending">Belum Verifikasi</span>`
      : `<span class="pangkalan-badge badge-verified">✓ Terverifikasi</span>`;

    return `
      <div class="pangkalan-card-item">
        <div class="pangkalan-title-row">
          <div class="pangkalan-name">${p.name}</div>
          ${badgeHtml}
        </div>
        <div class="pangkalan-loc">📍 ${p.desaKelurahan}, Kec. ${p.kecamatan}</div>
        <div style="font-size:0.75rem; color:#475569; display:flex; justify-content:space-between;">
          <span>👤 ${p.ownerName || 'Pemilik'}</span>
          <span>📦 Alokasi: <strong>${p.monthlyAllocation || 560}</strong> tbg</span>
        </div>
        <div class="pangkalan-actions-row">
          <button type="button" class="btn-p-edit" onclick="openModalEditPangkalan('${p.id}')">✏️ Edit</button>
          <button type="button" class="btn-p-del" onclick="confirmDeletePangkalan('${p.id}')">🗑️ Hapus</button>
        </div>
      </div>
    `;
  }).join('');
}

// 7. TAMBAH / EDIT PANGKALAN HANDLERS
window.openModalAddPangkalan = function() {
  document.getElementById('modalPangkalanTitle').textContent = "Tambah Pangkalan Baru";
  document.getElementById('pangkalanEditId').value = "";
  document.getElementById('pangkalanName').value = "";
  document.getElementById('pangkalanOwner').value = "";
  document.getElementById('pangkalanPhone').value = "";
  document.getElementById('pangkalanKecamatan').value = "";
  document.getElementById('pangkalanDesa').value = "";
  document.getElementById('pangkalanAddress').value = "";
  document.getElementById('pangkalanAllocation').value = "560";
  document.getElementById('editReasonBox').style.display = 'none';
  document.getElementById('modalPangkalanForm').style.display = 'flex';
};

window.openModalEditPangkalan = function(pangkalanId) {
  const pangkalanList = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  const p = pangkalanList.find(item => item.id === pangkalanId);
  if (!p) return;

  document.getElementById('modalPangkalanTitle').textContent = `Edit Pangkalan: ${p.name}`;
  document.getElementById('pangkalanEditId').value = p.id;
  document.getElementById('pangkalanName').value = p.name;
  document.getElementById('pangkalanOwner').value = p.ownerName || '';
  document.getElementById('pangkalanPhone').value = p.phone || '';
  document.getElementById('pangkalanKecamatan').value = p.kecamatan;
  document.getElementById('pangkalanDesa').value = p.desaKelurahan;
  document.getElementById('pangkalanAddress').value = p.address;
  document.getElementById('pangkalanAllocation').value = p.monthlyAllocation || 560;
  document.getElementById('pangkalanEditReason').value = '';
  document.getElementById('editReasonBox').style.display = 'block';
  document.getElementById('modalPangkalanForm').style.display = 'flex';
};

window.handlePangkalanFormSubmit = async function(e) {
  e.preventDefault();
  const editId = document.getElementById('pangkalanEditId').value;
  const name = document.getElementById('pangkalanName').value.trim();
  const owner = document.getElementById('pangkalanOwner').value.trim();
  const phone = document.getElementById('pangkalanPhone').value.trim();
  const kec = document.getElementById('pangkalanKecamatan').value;
  const desa = document.getElementById('pangkalanDesa').value.trim();
  const address = document.getElementById('pangkalanAddress').value.trim();
  const allocation = parseInt(document.getElementById('pangkalanAllocation').value, 10) || 560;
  const editReason = document.getElementById('pangkalanEditReason').value.trim();

  if (editId) {
    // Mode Edit
    if (!editReason) {
      CustomModal.alert({ title: "Alasan Wajib Diisi", message: "Masukkan alasan pembaruan data pangkalan untuk catatan audit.", icon: "⚠️", type: "warning" });
      return;
    }

    let res;
    try {
      res = await editAgentPangkalanFirestore(currentAgentId, editId, {
        name, ownerName: owner, phone, kecamatan: kec, desaKelurahan: desa, address, monthlyAllocation: allocation, editReason
      }, currentAgentSession);
    } catch (error) {
      res = { success: false, message: `Firestore menolak perubahan (${error.code || 'unknown'}).` };
    }

    if (res.success) {
      closeModal('modalPangkalanForm');
      CustomModal.alert({ title: "Pangkalan Diperbarui", message: `Data pangkalan <strong>${name}</strong> berhasil diperbarui.`, icon: "✓", type: "info" });
      renderAgentPangkalanListUI();
      populateDistributionPangkalanDropdown();
    } else {
      CustomModal.alert({ title: "Gagal Mengedit", message: res.message, icon: "❌", type: "error" });
    }
  } else {
    // Mode Tambah Baru
    let res;
    try {
      res = await addAgentPangkalanFirestore(currentAgentId, {
        name, ownerName: owner, phone, kecamatan: kec, desaKelurahan: desa, address, monthlyAllocation: allocation
      }, currentAgentSession);
    } catch (error) {
      res = { success: false, message: `Firestore menolak pendaftaran (${error.code || 'unknown'}).` };
    }

    if (res.success) {
      closeModal('modalPangkalanForm');
      CustomModal.alert({
        title: "Pangkalan Berhasil Didaftarkan",
        message: `Pangkalan <strong>${name}</strong> berhasil didaftarkan sebagai binaan aktif.<br>${res.duplicateWarning ? '<br><small style="color:#D97706;">⚠️ ' + res.duplicateWarning + '</small>' : ''}`,
        icon: "🏪",
        type: "info"
      });
      renderAgentPangkalanListUI();
      populateDistributionPangkalanDropdown();
    } else {
      CustomModal.alert({ title: "Gagal Mendaftarkan", message: res.message, icon: "❌", type: "error" });
    }
  }
};

window.confirmDeletePangkalan = async function(pangkalanId) {
  const pangkalanList = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  const p = pangkalanList.find(item => item.id === pangkalanId);
  if (!p) return;

  const reason = await CustomModal.prompt({
    title: `Hapus / Nonaktifkan Pangkalan?`,
    message: `Pangkalan <strong>"${p.name}"</strong> akan dinonaktifkan dari daftar distribusi aktif. Riwayat distribusi masa lalu tetap tersimpan secara aman.<br><br>Masukkan alasan penghapusan * :`,
    defaultValue: "Pangkalan tutup operasional / pemutusan hubungan usaha",
    inputType: "text",
    icon: "🗑️",
    confirmText: "Hapus Pangkalan"
  });

  if (reason === null || reason === undefined || !reason.trim()) return;

  let res;
  try {
    res = await softDeleteAgentPangkalanFirestore(currentAgentId, pangkalanId, reason.trim(), currentAgentSession);
  } catch (error) {
    res = { success: false, message: `Firestore menolak penonaktifan (${error.code || 'unknown'}).` };
  }
  if (res.success) {
    CustomModal.alert({ title: "Pangkalan Dinonaktifkan", message: res.message, icon: "🗑️", type: "info" });
    renderAgentPangkalanListUI();
    populateDistributionPangkalanDropdown();
  } else {
    CustomModal.alert({ title: "Gagal Menghapus", message: res.message, icon: "❌", type: "error" });
  }
};

// 8. RENDER RIWAYAT LEDGER
function renderLedgerHistoryUI() {
  const container = document.getElementById('fullLedgerHistoryContainer');
  if (!container || !currentAgentId) return;

  const events = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []);
  const agentEvents = events.filter(e => e.agentId === currentAgentId);

  if (agentEvents.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:30px 10px; color:#94A3B8; font-size:0.84rem;">Belum ada riwayat transaksi yang dibukukan.</div>`;
    return;
  }

  container.innerHTML = agentEvents.map(e => {
    const isStockIn = e.type === 'STOCK_IN';
    const isRejected = e.status === 'REJECTED';
    const isLocalOnly = e.status === 'LOCAL_ONLY';
    const isPendingSync = e.status === 'PENDING_SYNC';
    const dateFormatted = new Date(e.effectiveAt || e.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const color = isRejected ? '#DC2626' : (isStockIn ? '#059669' : '#1D4ED8');
    const badgeText = isRejected ? 'Ditolak'
      : (isLocalOnly ? 'Lokal • Belum Sinkron' : (isPendingSync ? 'Pending Sinkron' : 'Tersinkron Firestore'));
    const sign = isStockIn ? '+' : '-';

    return `
      <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:10px; padding:12px 14px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <span style="font-size:0.68rem; font-weight:800; background:${isStockIn ? '#ECFDF5' : '#EFF6FF'}; color:${color}; padding:2px 6px; border-radius:4px;">${badgeText}</span>
            <div style="font-size:0.86rem; font-weight:800; color:#0F172A; margin-top:4px;">${isStockIn ? (e.doNumber || 'Penerimaan DO Pertamina') : (e.pangkalanSnapshot ? e.pangkalanSnapshot.name : 'Pangkalan')}</div>
          </div>
          <div style="font-size:1.1rem; font-weight:900; color:${color};">${sign}${e.quantity.toLocaleString('id-ID')}</div>
        </div>
        <div style="font-size:0.72rem; color:#64748B; margin-top:6px; display:flex; justify-content:space-between;">
          <span>📅 ${dateFormatted} WITA</span>
          <span>${e.vehicleNumber ? '🚚 ' + e.vehicleNumber : (e.clientEventId || '')}</span>
        </div>
        ${isRejected ? `<div style="font-size:0.72rem; color:#DC2626; margin-top:4px; background:#FEF2F2; padding:4px 8px; border-radius:4px;">Alasan Ditolak: ${e.rejectionReason || 'Stok Tidak Cukup'}</div>` : ''}
      </div>
    `;
  }).join('');
}
