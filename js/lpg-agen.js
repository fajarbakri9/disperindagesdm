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
let deferredLpgInstallPrompt = null;

function escapeLpgAgentText(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[character]));
}

function formatLpgAgentTime(value) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '--.--';
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar'
  }).format(date).replace('.', ':');
}

function lpgLocationStatus(item) {
  const status = item?.location?.verificationStatus;
  return ({verified:'GPS Terverifikasi',agent_captured:'GPS Agen — Menunggu Verifikasi',admin_captured:'GPS Petugas — Menunggu Verifikasi',manual_admin:'Titik Diperbarui Administrator',needs_review:'Perlu Verifikasi',indicative:'Titik Indikatif'})[status] || 'Belum tersedia';
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredLpgInstallPrompt = event;
  const button = document.getElementById('btnInstallLpgApp');
  if (button) button.style.display = 'inline-flex';
});

window.addEventListener('appinstalled', () => {
  deferredLpgInstallPrompt = null;
  const button = document.getElementById('btnInstallLpgApp');
  if (button) button.style.display = 'none';
});

document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/lpg-sw.js').catch(error => console.warn('Service worker LPG gagal didaftarkan:', error));
  document.getElementById('btnInstallLpgApp')?.addEventListener('click', async () => {
    if (!deferredLpgInstallPrompt) return;
    deferredLpgInstallPrompt.prompt();
    await deferredLpgInstallPrompt.userChoice;
    deferredLpgInstallPrompt = null;
    const button = document.getElementById('btnInstallLpgApp');
    if (button) button.style.display = 'none';
  });
  // 1. Guard Autentikasi Khusus Agen LPG
  currentAgentSession = await requireFirebaseLpgSession();
  if (!currentAgentSession) {
    updateLpgPersistenceNotice('SERVER_AUTH_REQUIRED');
    window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    return;
  }

  currentAgentId = currentAgentSession.agentId;
  if (!currentAgentId) {
    document.getElementById('lpgAgentHeaderName').textContent = 'Profil agen tidak ditemukan. Hubungi administrator.';
    updateLpgPersistenceNotice('PROFILE_MISSING');
    return;
  }

  // 2. Set Informasi Header
  const nameEl = document.getElementById('lpgAgentHeaderName');
  const codeEl = document.getElementById('lpgAgentHeaderCode');
  if (nameEl) {
    nameEl.textContent = currentAgentSession.agentName || currentAgentSession.name;
    requestAnimationFrame(() => {
      const nameWrap = nameEl.parentElement;
      if (nameWrap && nameEl.scrollWidth > nameWrap.clientWidth) nameEl.classList.add('is-marquee');
    });
  }
  if (codeEl) codeEl.textContent = currentAgentId;
  const displayName = currentAgentSession.agentName || currentAgentSession.name || 'Agen LPG';
  const avatar = document.getElementById('lpgAgentAvatar');
  if (avatar) avatar.textContent = displayName.replace(/^PT\.?\s*/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'AG';
  const hour = Number(new Intl.DateTimeFormat('id-ID', { hour:'2-digit', hour12:false, timeZone:'Asia/Makassar' }).format(new Date()).replace(/\D/g, ''));
  const welcome = document.getElementById('lpgWelcomeText');
  if (welcome) welcome.textContent = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  const todayLabel = document.getElementById('lpgTodayLabel');
  if (todayLabel) todayLabel.textContent = new Intl.DateTimeFormat('id-ID', { weekday:'long', day:'numeric', month:'short', timeZone:'Asia/Makassar' }).format(new Date());

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

function updateLpgPersistenceNotice(forcedState) {
  const notice = document.getElementById('lpgPersistenceNotice');
  if (!notice) return;
  const connected = typeof auth !== 'undefined' && auth && auth.currentUser;
  const feedSyncLabel = document.getElementById('lpgFeedSyncLabel');
  if (forcedState === 'PROFILE_MISSING') {
    notice.textContent = 'Profil agen tidak ditemukan pada akun ini. Hubungi administrator.';
    if (feedSyncLabel) feedSyncLabel.textContent = 'Data tidak tersedia';
  } else if (connected && navigator.onLine) {
    notice.style.cssText += 'border-color:#10B981;background:#ECFDF5;color:#065F46;';
    notice.textContent = 'Terhubung ke server. Transaksi hanya dinyatakan berhasil setelah commit Firestore.';
    if (feedSyncLabel) feedSyncLabel.textContent = 'Tersinkron dengan server';
  } else if (connected) {
    notice.style.cssText += 'border-color:#F59E0B;background:#FFFBEB;color:#92400E;';
    notice.textContent = 'Server tidak tersedia. Transaksi membutuhkan koneksi server dan tidak akan disimpan di perangkat.';
    if (feedSyncLabel) feedSyncLabel.textContent = 'Server tidak tersedia';
  } else {
    notice.textContent = 'Sesi Firestore tidak tersedia. Silakan masuk kembali; tidak ada data lokal pengganti.';
    if (feedSyncLabel) feedSyncLabel.textContent = 'Tidak dapat dimuat';
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
  const hasBalance = balances[currentAgentId] && balances[currentAgentId].filledCylinderBalance !== undefined;
  const currentBal = hasBalance ? Number(balances[currentAgentId].filledCylinderBalance) : null;

  const stockValEl = document.getElementById('lpgCurrentStockVal');
  if (stockValEl) stockValEl.textContent = currentBal === null ? '—' : currentBal.toLocaleString('id-ID');
  const stockHeroEl = document.getElementById('lpgStockHero');
  const stockStatusEl = document.getElementById('lpgStockStatus');
  if (stockHeroEl) stockHeroEl.classList.toggle('is-anomaly', currentBal !== null && currentBal < 0);
  if (stockStatusEl) stockStatusEl.textContent = currentBal === null ? 'Data belum tersedia' : (currentBal < 0 ? 'Perlu rekonsiliasi' : 'Saldo ledger resmi');

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
    const latest5 = [...agentEvents]
      .sort((a, b) => new Date(b.effectiveAt || b.createdAt || 0) - new Date(a.effectiveAt || a.createdAt || 0))
      .slice(0, 5);
    if (latest5.length === 0) {
      recentFeedEl.innerHTML = `<div style="padding:22px 14px;text-align:center;"><div style="font-size:1.35rem;margin-bottom:5px;">&#128203;</div><strong style="display:block;font-size:.78rem;color:#475569;">Belum ada aktivitas</strong><span style="font-size:.68rem;color:#94A3B8;">Transaksi terbaru akan tampil di sini.</span></div>`;
    } else {
      recentFeedEl.innerHTML = latest5.map(e => {
        const isStockIn = e.type === 'STOCK_IN';
        const timeStr = formatLpgAgentTime(e.effectiveAt || e.createdAt);
        const title = isStockIn ? `Stok Masuk DO` : (e.pangkalanSnapshot ? e.pangkalanSnapshot.name : 'Pangkalan');
        const color = isStockIn ? '#059669' : '#1D4ED8';
        const surface = isStockIn ? '#ECFDF5' : '#EFF6FF';
        const sign = isStockIn ? '+' : '-';
        return `
          <div class="activity-feed-item">
            <div class="activity-feed-icon" style="background:${surface};color:${color};">${isStockIn ? '&darr;' : '&rarr;'}</div>
            <div class="activity-feed-body">
              <div style="font-size:.79rem;font-weight:800;color:#0F172A;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeLpgAgentText(title)}</div>
              <div style="font-size:.67rem;color:#64748B;margin-top:2px;">${escapeLpgAgentText(timeStr)} WITA ${e.doNumber ? '&bull; DO: ' + escapeLpgAgentText(e.doNumber) : ''}</div>
            </div>
            <div class="activity-feed-amount" style="color:${color};">${sign}${Number(e.quantity || 0).toLocaleString('id-ID')}</div>
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
      title: "Transaksi Berhasil Dibukukan",
      message: `Penerimaan <strong>${qty.toLocaleString('id-ID')} tabung</strong> telah tersimpan di server.<br><br>Saldo resmi: <strong>${res.currentBalance.toLocaleString('id-ID')} tabung</strong>.`,
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
      title: "Distribusi Berhasil Dibukukan",
      message: `Penyaluran <strong>${qty.toLocaleString('id-ID')} tabung</strong> telah tersimpan di server.<br><br>Sisa saldo resmi: <strong>${res.currentBalance.toLocaleString('id-ID')} tabung</strong>.`,
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
          <span>📦 Alokasi: <strong>${p.monthlyAllocation ?? '—'}</strong> tbg</span>
        </div>
        <div style="font-size:.7rem;color:#64748B;margin-top:6px;">📍 ${escapeLpgAgentText(lpgLocationStatus(p))}${Number.isFinite(Number(p.location?.accuracyM)) ? ` · ±${Math.round(Number(p.location.accuracyM))} m` : ''}</div>
        <div class="pangkalan-actions-row">
          <button type="button" class="btn-p-edit" onclick="captureOutletGps('${p.id}')">📍 Perbarui GPS</button>
          <button type="button" class="btn-p-edit" onclick="openModalEditPangkalan('${p.id}')">✏️ Edit</button>
          <button type="button" class="btn-p-del" onclick="confirmDeletePangkalan('${p.id}')">🗑️ Hapus</button>
        </div>
      </div>
    `;
  }).join('');
}

// 7. TAMBAH / EDIT PANGKALAN HANDLERS
window.captureOutletGps = async function(pangkalanId) {
  const item = getAgentPangkalanList(currentAgentId).find(row => row.id === pangkalanId);
  if (!item || !window.confirm(`Saya sedang berada di lokasi pangkalan “${item.name}” dan ingin mengambil GPS perangkat sekarang.`)) return;
  try {
    const captured = await LpgGeolocation.capture();
    const detail = `Latitude ${captured.latitude.toFixed(6)}\nLongitude ${captured.longitude.toFixed(6)}\nAkurasi ±${Math.round(captured.accuracyM)} m (${LpgGeolocation.quality(captured.accuracyM)})`;
    if (!window.confirm(`${detail}\n\nSimpan lokasi ini ke Firestore?`)) return;
    const result = await updateLpgLocationFirestore('outlet', pangkalanId, currentAgentId, captured, currentAgentSession);
    if (!result.success) throw new Error(result.message);
    CustomModal.alert({title:'Lokasi Berhasil Diperbarui',message:`GPS pangkalan tersimpan di server dengan akurasi ±${Math.round(captured.accuracyM)} meter. Status: GPS Agen — Menunggu Verifikasi.`,icon:'📍',type:'info'});
  } catch (error) {
    CustomModal.alert({title:'Lokasi Belum Berhasil Diperoleh',message:error.message || 'Pastikan GPS aktif lalu coba kembali.',icon:'⚠',type:'warning'});
  }
};

window.openModalAddPangkalan = function() {
  document.getElementById('modalPangkalanTitle').textContent = "Tambah Pangkalan Baru";
  document.getElementById('pangkalanEditId').value = "";
  document.getElementById('pangkalanName').value = "";
  document.getElementById('pangkalanOwner').value = "";
  document.getElementById('pangkalanPhone').value = "";
  document.getElementById('pangkalanKecamatan').value = "";
  document.getElementById('pangkalanDesa').value = "";
  document.getElementById('pangkalanAddress').value = "";
  document.getElementById('pangkalanAllocation').value = "";
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
  document.getElementById('pangkalanAllocation').value = p.monthlyAllocation ?? '';
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
        name, ownerName: owner, phone, kecamatan: kec, desaKelurahan: desa, address, editReason
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
        name, ownerName: owner, phone, kecamatan: kec, desaKelurahan: desa, address
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
    const dateFormatted = new Date(e.effectiveAt || e.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const color = isRejected ? '#DC2626' : (isStockIn ? '#059669' : '#1D4ED8');
    const badgeText = isRejected ? 'Ditolak' : 'Tersimpan di Firestore';
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
