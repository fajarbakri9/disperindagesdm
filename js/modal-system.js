// Custom Modal & Toast System - Theme Native Disperindag Pinrang
const CustomModal = {
  backdropEl: null,

  init() {
    if (this.backdropEl) return;

    // Inject Base Modal CSS if not injected
    if (!document.getElementById('customModalInjectedStyle')) {
      const st = document.createElement('style');
      st.id = 'customModalInjectedStyle';
      st.textContent = `
        .custom-modal-backdrop {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background: rgba(15, 23, 42, 0.75) !important;
          backdrop-filter: blur(4px) !important;
          -webkit-backdrop-filter: blur(4px) !important;
          z-index: 999999 !important;
          display: none !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 16px !important;
          opacity: 0 !important;
          transition: opacity 0.2s ease !important;
        }
        .custom-modal-backdrop.active {
          display: flex !important;
          opacity: 1 !important;
        }
        .custom-modal-card {
          background: #FFFFFF !important;
          border-radius: 16px !important;
          width: 100% !important;
          max-width: 600px !important;
          max-height: 90vh !important;
          overflow-y: auto !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35) !important;
          position: relative !important;
          animation: customModalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        @keyframes customModalPop {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .custom-toast-container {
          position: fixed !important;
          bottom: 24px !important;
          right: 24px !important;
          z-index: 999999 !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 10px !important;
        }
      `;
      document.head.appendChild(st);
    }

    this.backdropEl = document.createElement('div');
    this.backdropEl.className = 'custom-modal-backdrop';
    this.backdropEl.id = 'globalCustomModal';
    document.body.appendChild(this.backdropEl);

    // Init Toast Container
    if (!document.getElementById('globalCustomToastContainer')) {
      const toastContainer = document.createElement('div');
      toastContainer.className = 'custom-toast-container';
      toastContainer.id = 'globalCustomToastContainer';
      document.body.appendChild(toastContainer);
    }
  },

  alert({ title = "Pemberitahuan", message = "", icon = "🏛️", type = "info", buttonText = "Mengerti" }) {
    this.init();
    return new Promise((resolve) => {
      this.backdropEl.innerHTML = `
        <div class="custom-modal-card">
          <div class="custom-modal-header">
            <div class="custom-modal-icon">${icon}</div>
            <div class="custom-modal-title-group">
              <h3>${title}</h3>
              <p>Disperindag ESDM Pinrang</p>
            </div>
          </div>
          <div class="custom-modal-body">
            <p>${message}</p>
          </div>
          <div class="custom-modal-footer">
            <button class="btn-modal-action btn-modal-primary" id="btnModalClose">
              ✓ ${buttonText}
            </button>
          </div>
        </div>
      `;

      this.backdropEl.classList.add('active');

      document.getElementById('btnModalClose').onclick = () => {
        this.backdropEl.classList.remove('active');
        resolve(true);
      };
    });
  },

  confirm({ title = "Konfirmasi Tindakan", message = "", icon = "⚠️", confirmText = "Ya, Lanjutkan", cancelText = "Batal", isDanger = false }) {
    this.init();
    return new Promise((resolve) => {
      this.backdropEl.innerHTML = `
        <div class="custom-modal-card">
          <div class="custom-modal-header">
            <div class="custom-modal-icon">${icon}</div>
            <div class="custom-modal-title-group">
              <h3>${title}</h3>
              <p>Konfirmasi Keamanan</p>
            </div>
          </div>
          <div class="custom-modal-body">
            <p>${message}</p>
          </div>
          <div class="custom-modal-footer">
            <button class="btn-modal-action btn-modal-secondary" id="btnModalCancel">
              ${cancelText}
            </button>
            <button class="btn-modal-action ${isDanger ? 'btn-modal-danger' : 'btn-modal-primary'}" id="btnModalConfirm">
              ✓ ${confirmText}
            </button>
          </div>
        </div>
      `;

      this.backdropEl.classList.add('active');

      document.getElementById('btnModalCancel').onclick = () => {
        this.backdropEl.classList.remove('active');
        resolve(false);
      };

      document.getElementById('btnModalConfirm').onclick = () => {
        this.backdropEl.classList.remove('active');
        resolve(true);
      };
    });
  },

  prompt({ title = "Masukkan Nilai", message = "", defaultValue = "", placeholder = "", icon = "✏️", confirmText = "Simpan", inputType = "text" }) {
    this.init();
    return new Promise((resolve) => {
      this.backdropEl.innerHTML = `
        <div class="custom-modal-card">
          <div class="custom-modal-header">
            <div class="custom-modal-icon">${icon}</div>
            <div class="custom-modal-title-group">
              <h3>${title}</h3>
              <p>Input Data Petugas</p>
            </div>
          </div>
          <div class="custom-modal-body">
            <p>${message}</p>
            <div class="custom-modal-input-group">
              <input type="${inputType}" id="customModalPromptInput" class="custom-modal-input" value="${defaultValue}" placeholder="${placeholder}">
            </div>
          </div>
          <div class="custom-modal-footer">
            <button class="btn-modal-action btn-modal-secondary" id="btnModalPromptCancel">
              Batal
            </button>
            <button class="btn-modal-action btn-modal-primary" id="btnModalPromptConfirm">
              ✓ ${confirmText}
            </button>
          </div>
        </div>
      `;

      this.backdropEl.classList.add('active');
      const inputEl = document.getElementById('customModalPromptInput');
      setTimeout(() => { inputEl.focus(); inputEl.select(); }, 100);

      document.getElementById('btnModalPromptCancel').onclick = () => {
        this.backdropEl.classList.remove('active');
        resolve(null);
      };

      const handleConfirm = () => {
        const val = inputEl.value;
        this.backdropEl.classList.remove('active');
        resolve(val);
      };

      document.getElementById('btnModalPromptConfirm').onclick = handleConfirm;
      inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') handleConfirm();
        if (e.key === 'Escape') {
          this.backdropEl.classList.remove('active');
          resolve(null);
        }
      };
    });
  },

  form({ title = "Formulir Input", icon = "📝", fields = [], onSubmit = null, submitText = "Simpan Data", cancelText = "Batal", width = "580px" }) {
    this.init();
    return new Promise((resolve) => {
      const escapeAttr = (str) => {
        if (str === null || str === undefined) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      };

      const escapeText = (str) => {
        if (str === null || str === undefined) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      };

      const renderField = (f) => {
        const reqAttr = f.required ? 'required' : '';
        const rawVal = f.value !== undefined && f.value !== null ? f.value : '';
        const valAttr = escapeAttr(rawVal);
        const valText = escapeText(rawVal);
        const ph = escapeAttr(f.placeholder || '');

        if (f.type === 'select') {
          const opts = (f.options || []).map(opt => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLbl = typeof opt === 'object' ? opt.label : opt;
            const selected = String(optVal) === String(rawVal) ? 'selected' : '';
            return `<option value="${escapeAttr(optVal)}" ${selected}>${escapeText(optLbl)}</option>`;
          }).join('');
          return `
            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 800; color: #0F2C59; margin-bottom: 4px; display: block;">
                ${escapeText(f.label)} ${f.required ? '<span style="color:#EF4444;">*</span>' : ''}
              </label>
              <select name="${escapeAttr(f.name)}" class="form-select" style="width: 100%; padding: 9px 12px; border: 1.5px solid #CBD5E1; border-radius: 8px; font-family: inherit; font-size: 0.86rem; background: #FFFFFF;" ${reqAttr}>
                ${opts}
              </select>
            </div>
          `;
        }

        if (f.type === 'textarea') {
          return `
            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="font-size: 0.8rem; font-weight: 800; color: #0F2C59; margin-bottom: 4px; display: block;">
                ${escapeText(f.label)} ${f.required ? '<span style="color:#EF4444;">*</span>' : ''}
              </label>
              <textarea name="${escapeAttr(f.name)}" rows="${f.rows || 3}" class="form-textarea" placeholder="${ph}" style="width: 100%; padding: 9px 12px; border: 1.5px solid #CBD5E1; border-radius: 8px; font-family: inherit; font-size: 0.86rem; background: #FFFFFF; resize: vertical;" ${reqAttr}>${valText}</textarea>
            </div>
          `;
        }

        return `
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" style="font-size: 0.8rem; font-weight: 800; color: #0F2C59; margin-bottom: 4px; display: block;">
              ${escapeText(f.label)} ${f.required ? '<span style="color:#EF4444;">*</span>' : ''}
            </label>
            <input type="${escapeAttr(f.type || 'text')}" name="${escapeAttr(f.name)}" value="${valAttr}" placeholder="${ph}" class="form-input" style="width: 100%; padding: 9px 12px; border: 1.5px solid #CBD5E1; border-radius: 8px; font-family: inherit; font-size: 0.86rem; background: #FFFFFF;" ${f.step != null ? `step="${escapeAttr(f.step)}"` : ''} ${f.min != null ? `min="${escapeAttr(f.min)}"` : ''} ${f.max != null ? `max="${escapeAttr(f.max)}"` : ''} ${reqAttr}>
          </div>
        `;
      };

      this.backdropEl.innerHTML = `
        <div class="custom-modal-card" style="max-width: ${width}; border-radius: 14px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(15, 44, 89, 0.35);">
          <div class="custom-modal-header" style="background: linear-gradient(135deg, #0F2C59 0%, #1E3A8A 100%); color: #FFFFFF; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="background: rgba(255,255,255,0.15); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">${icon}</div>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; color: #FFFFFF; margin: 0;">${title}</h3>
                <span style="font-size: 0.72rem; color: #CBD5E1;">Disperindag ESDM Kabupaten Pinrang</span>
              </div>
            </div>
            <button type="button" id="btnModalFormHeaderClose" style="background: transparent; border: none; color: #FFFFFF; font-size: 1.4rem; cursor: pointer; line-height: 1; padding: 0 4px;">&times;</button>
          </div>
          <form id="customModalDynamicForm" style="margin: 0;">
            <div class="custom-modal-body" style="padding: 20px; max-height: 70vh; overflow-y: auto;">
              <div id="customModalFormError" role="alert" aria-live="assertive" hidden style="margin:0 0 14px;padding:10px 12px;border:1px solid #FCA5A5;border-left:4px solid #DC2626;border-radius:8px;background:#FEF2F2;color:#991B1B;font-size:.82rem;font-weight:700;"></div>
              ${fields.map(renderField).join('')}
            </div>
            <div class="custom-modal-footer" style="padding: 14px 20px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn-modal-action btn-modal-secondary" id="btnModalFormCancel" style="padding: 8px 16px; font-size: 0.84rem; cursor: pointer;">
                ${cancelText}
              </button>
              <button type="submit" class="btn-modal-action btn-modal-primary" id="btnModalFormSubmit" style="padding: 8px 20px; font-size: 0.84rem; cursor: pointer; background: #0F2C59; color: #FFFFFF; font-weight: 800;">
                ✓ ${submitText}
              </button>
            </div>
          </form>
        </div>
      `;

      this.backdropEl.classList.add('active');

      const closeFormModal = () => {
        this.backdropEl.classList.remove('active');
        resolve(null);
      };

      document.getElementById('btnModalFormHeaderClose').onclick = closeFormModal;
      document.getElementById('btnModalFormCancel').onclick = closeFormModal;

      const formEl = document.getElementById('customModalDynamicForm');
      formEl.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btnModalFormSubmit');
        const cancelBtn = document.getElementById('btnModalFormCancel');
        const errorBox = document.getElementById('customModalFormError');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : '✓ Simpan';

        if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '⏳ Menyimpan...';
        }
        if (cancelBtn) cancelBtn.disabled = true;

        const formData = new FormData(formEl);
        const values = {};
        for (const [key, value] of formData.entries()) {
          values[key] = value;
        }

        try {
          if (typeof onSubmit === 'function') {
            await onSubmit(values);
          }
          this.backdropEl.classList.remove('active');
          resolve(values);
        } catch (err) {
          console.error('[CustomModal.form] Gagal saat onSubmit:', err);
          if (errorBox) {
            errorBox.textContent = err?.message || 'Data tidak dapat disimpan. Periksa kembali isian formulir.';
            errorBox.hidden = false;
            errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
          }
          if (cancelBtn) cancelBtn.disabled = false;
        }
      };
    });
  },

  toast(message = "", type = "success", title = "Informasi") {
    if (typeof CustomToast !== 'undefined' && CustomToast.show) {
      CustomToast.show({ title, message, type });
    }
  }
};

const CustomToast = {
  show({ title = "Informasi", message = "", type = "info", duration = 3500 }) {
    CustomModal.init();
    const container = document.getElementById('globalCustomToastContainer');
    if (!container) return;

    const icons = {
      success: "✅",
      danger: "🚨",
      warning: "⚠️",
      info: "ℹ️"
    };

    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 20);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  }
};

// Pasang ke window object
window.CustomModal = CustomModal;
window.CustomToast = CustomToast;

// Modal Khusus: Maklumat Pelayanan Publik (Arahan V3 Poin 5 & 20)
function openMaklumatModal() {
  CustomModal.init();
  const backdrop = CustomModal.backdropEl;
  backdrop.innerHTML = `
    <div class="custom-modal-card" style="max-width: 640px; border-top: 4px solid var(--accent-gold); box-shadow: var(--shadow-xl);">
      <div class="custom-modal-header" style="background: linear-gradient(135deg, #0F2C59 0%, #1E3A8A 100%); color: #FFFFFF; padding: 18px 22px; border-radius: 12px 12px 0 0; display: flex; align-items: center; gap: 14px;">
        <div class="custom-modal-icon" style="background: rgba(255,255,255,0.15); color: #FDE047; font-size: 1.6rem; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">📜</div>
        <div class="custom-modal-title-group" style="text-align: left;">
          <h3 style="color: #FFFFFF; font-size: 1.2rem; font-weight: 800; margin: 0;">MAKLUMAT PELAYANAN</h3>
          <p style="color: #CBD5E1; font-size: 0.78rem; margin: 2px 0 0;">Dinas Perindustrian, Perdagangan, ESDM Kab. Pinrang</p>
        </div>
      </div>
      <div class="custom-modal-body" style="padding: 22px; line-height: 1.65; font-size: 0.88rem; color: #334155; text-align: left;">
        <p style="font-weight: 800; color: var(--primary-deep); margin-bottom: 14px; text-align: center; font-size: 0.92rem; background: #FEF3C7; padding: 12px; border-radius: 8px; border-left: 4px solid #F59E0B;">
          "DENGAN INI, KAMI MENYATAKAN SANGGUP MENYELENGGARAKAN PELAYANAN SESUAI STANDAR PELAYANAN YANG TELAH DITETAPKAN DAN APABILA TIDAK MENEPATI JANJI INI, KAMI SIAP MENERIMA SANKSI SESUAI PERATURAN PERUNDANG-UNDANGAN YANG BERLAKU."
        </p>
        <div style="background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 10px; padding: 14px 18px; margin: 14px 0;">
          <h4 style="font-size: 0.82rem; color: #1E40AF; font-weight: 800; margin-bottom: 8px; text-transform: uppercase;">Komitmen Pelayanan MANTAP:</h4>
          <ol style="padding-left: 18px; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.84rem;">
            <li><strong>Kepatuhan Standar:</strong> Berjanji dan sanggup melaksanakan pelayanan sesuai dengan Standar Pelayanan.</li>
            <li><strong>Penyempurnaan Berkelanjutan:</strong> Memberikan pelayanan sesuai dengan kewajiban dan akan melakukan perbaikan secara terus menerus.</li>
            <li><strong>Akuntabilitas & Kompensasi:</strong> Siap menerima sanksi dan/atau memberikan kompensasi apabila pelayanan yang diberikan tidak sesuai standar.</li>
          </ol>
        </div>
        <div style="font-size: 0.78rem; color: #64748B; display: flex; justify-content: space-between; align-items: center; margin-top: 12px; border-top: 1px solid #E2E8F0; padding-top: 10px;">
          <span>📍 Pinrang, Sulawesi Selatan</span>
          <span>Kepala Dinas: <strong>MUHAMMAD YUSUF NUR, S.STP</strong></span>
        </div>
      </div>
      <div class="custom-modal-footer" style="padding: 14px 22px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; gap: 8px;">
          <a href="maklumat-pelayanan.html" class="btn-primary" style="font-size: 0.8rem; padding: 8px 14px; text-decoration: none;">
            <span>📜</span> Buka Piagam Lengkap &rarr;
          </a>
          <button onclick="openInfographicModal('assets/infografis/Maklumat_Pelayanan.jpg', 'Infografis Maklumat Pelayanan')" class="btn-outline" style="font-size: 0.8rem; padding: 8px 12px; background: #FFFFFF; cursor: pointer;">
            <span>🖼️</span> Lihat Infografis
          </button>
        </div>
        <button class="btn-modal-action btn-modal-primary" id="btnMaklumatClose" style="padding: 8px 20px; font-size: 0.85rem;">
          ✓ Mengerti & Tutup
        </button>
      </div>
    </div>
  `;
  backdrop.classList.add('active');
  document.getElementById('btnMaklumatClose').onclick = () => {
    backdrop.classList.remove('active');
  };
}

// Modal Khusus: Pelacakan / Cek Status Tiket Pengaduan (Arahan V3 Poin 17)
function openCheckTicketModal(prefillTicket = "") {
  // Status laporan tidak pernah dibaca dari seed/localStorage. Sampai tersedia
  // snapshot status publik tanpa PII, konfirmasi dilakukan melalui kanal resmi.
  CustomModal.alert({
    title: 'Konfirmasi Status Pengaduan',
    message: `Pelacakan daring belum diaktifkan karena data pengaduan bersifat terbatas. Hubungi WhatsApp resmi <a href="https://wa.me/6282316002226?text=${encodeURIComponent(`Mohon informasi status laporan ${prefillTicket || ''}`)}" target="_blank" rel="noopener noreferrer"><strong>0823 1600 2226</strong></a> dan sertakan nomor tiket Anda.`,
    icon: '🔒',
    type: 'info'
  });
  return;

  CustomModal.init();
  const backdrop = CustomModal.backdropEl;
  
  backdrop.innerHTML = `
    <div class="custom-modal-card" style="max-width: 620px; border-top: 4px solid #3B82F6; box-shadow: var(--shadow-xl);">
      <div class="custom-modal-header" style="background: linear-gradient(135deg, #0F2C59 0%, #1E40AF 100%); color: #FFFFFF; padding: 18px 22px; border-radius: 12px 12px 0 0; display: flex; align-items: center; gap: 14px;">
        <div class="custom-modal-icon" style="background: rgba(255,255,255,0.15); color: #93C5FD; font-size: 1.5rem; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">🔍</div>
        <div class="custom-modal-title-group" style="text-align: left;">
          <h3 style="color: #FFFFFF; font-size: 1.15rem; font-weight: 800; margin: 0;">Cek Status Pengaduan Publik</h3>
          <p style="color: #CBD5E1; font-size: 0.78rem; margin: 2px 0 0;">Lacak progres tindak lanjut laporan Anda berdasarkan Nomor Tiket</p>
        </div>
      </div>
      <div class="custom-modal-body" style="padding: 22px; text-align: left;">
        <form id="checkTicketForm" onsubmit="event.preventDefault(); handleTicketSearch();" style="display: flex; gap: 10px; margin-bottom: 18px;">
          <input type="text" id="inputSearchTicket" class="form-input" required placeholder="Contoh: DPE-2026-000101" value="${prefillTicket}" style="flex: 1; padding: 11px 14px; font-size: 0.9rem; font-weight: 700; text-transform: uppercase; border: 1.5px solid #CBD5E1; border-radius: 8px;">
          <button type="submit" class="btn-primary" style="padding: 10px 18px; font-size: 0.88rem; font-weight: 800; border-radius: 8px;">
            <span>🔎</span> Cari Tiket
          </button>
        </form>

        <div id="ticketResultContainer" style="min-height: 120px;">
          <div style="text-align: center; color: #64748B; padding: 24px; background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 10px; font-size: 0.86rem;">
            Masukkan <strong>Nomor Tiket Pengaduan</strong> Anda pada kolom di atas untuk melihat status verifikasi dan tindak lanjut penanganan dinas.
          </div>
        </div>
      </div>
      <div class="custom-modal-footer" style="padding: 12px 22px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.76rem; color: #64748B;">Hotline WA: <strong>0823 1600 2226</strong></span>
        <button class="btn-modal-action btn-modal-primary" id="btnTicketClose" style="padding: 8px 20px; font-size: 0.84rem;">
          Tutup
        </button>
      </div>
    </div>
  `;

  backdrop.classList.add('active');
  document.getElementById('btnTicketClose').onclick = () => {
    backdrop.classList.remove('active');
  };

  window.handleTicketSearch = () => {
    const ticketInput = document.getElementById('inputSearchTicket').value.trim().toUpperCase();
    const resultBox = document.getElementById('ticketResultContainer');
    if (!ticketInput || !resultBox) return;

    const reports = typeof getStorage === 'function' ? getStorage('disperindag_reports', window.DEFAULT_REPORTS || []) : (window.DEFAULT_REPORTS || []);
    const found = reports.find(r => (r.ticket_number && r.ticket_number.toUpperCase() === ticketInput) || (r.id && r.id.toUpperCase() === ticketInput));

    if (!found) {
      resultBox.innerHTML = `
        <div style="background: #FEF2F2; border: 1.5px solid #FECACA; color: #991B1B; padding: 18px; border-radius: 10px; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 6px;">⚠️</div>
          <div style="font-weight: 800; font-size: 0.95rem;">Nomor Tiket Tidak Ditemukan</div>
          <p style="font-size: 0.82rem; color: #7F1D1D; margin: 6px 0 10px;">
            Nomor tiket <strong>${ticketInput}</strong> tidak terdaftar dalam basis data sistem pengaduan resmi. Pastikan format nomor tiket sudah benar (Contoh: DPE-2026-000101).
          </p>
          <div style="font-size: 0.78rem; color: #64748B;">
            Butuh bantuan? Hubungi WhatsApp Pengaduan: <a href="https://wa.me/6282316002226" target="_blank" rel="noopener noreferrer" style="font-weight:800; color:#1E40AF;">0823 1600 2226</a>
          </div>
        </div>
      `;
      return;
    }

    const step = found.timeline_step || (found.status && found.status.includes('Selesai') ? 6 : found.status && found.status.includes('Tindak') ? 5 : 2);
    
    resultBox.innerHTML = `
      <div style="background: #FFFFFF; border: 1.5px solid #BFDBFE; border-radius: 12px; padding: 18px; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #E2E8F0; padding-bottom: 12px; margin-bottom: 14px;">
          <div>
            <span style="font-size: 0.72rem; background: #DBEAFE; color: #1D4ED8; font-weight: 800; padding: 3px 8px; border-radius: 4px;">NO. TIKET RESMI</span>
            <h4 style="font-size: 1.2rem; font-weight: 900; color: #0F2C59; margin: 4px 0 0;">${found.ticket_number || found.id}</h4>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.78rem; font-weight: 800; padding: 4px 12px; border-radius: 20px; background: ${step >= 6 ? '#DCFCE7' : '#FEF3C7'}; color: ${step >= 6 ? '#15803D' : '#B45309'}; border: 1px solid ${step >= 6 ? '#86EFAC' : '#FDE68A'};">
              ● ${found.status || 'Sedang Diproses'}
            </span>
            <div style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">📅 ${found.submitted_at || '-'}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.82rem; margin-bottom: 14px; background: #F8FAFC; padding: 10px 14px; border-radius: 8px;">
          <div><strong style="color:#475569;">Pelapor:</strong> <span style="color:#0F172A; font-weight:700;">${found.nama || '-'}</span></div>
          <div><strong style="color:#475569;">Ruang Lingkup:</strong> <span style="color:#0F172A; font-weight:700;">${found.kategori || '-'}</span></div>
          <div style="grid-column: span 2;"><strong style="color:#475569;">Lokasi:</strong> <span style="color:#0F172A;">${found.lokasi || '-'}</span></div>
          <div style="grid-column: span 2;"><strong style="color:#475569;">Unit Penanggung Jawab:</strong> <span style="color:#1E40AF; font-weight:700;">${found.assigned_unit || 'Bidang Teknis Terkait'}</span></div>
        </div>

        <div style="margin-bottom: 14px;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #475569; margin-bottom: 4px; text-transform: uppercase;">Uraian Laporan:</div>
          <p style="font-size: 0.84rem; color: #1E293B; background: #F1F5F9; padding: 10px 12px; border-radius: 6px; margin: 0; line-height: 1.5;">
            "${found.pesan || '-'}"
          </p>
        </div>

        <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 8px; padding: 12px 14px;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #166534; margin-bottom: 4px; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
            <span>🛡️</span> Respon & Tindak Lanjut Dinas:
          </div>
          <p style="font-size: 0.84rem; color: #14532D; margin: 0; line-height: 1.5;">
            ${found.resolution || 'Laporan Anda telah berhasil diregistrasi dan sedang dalam tahap verifikasi oleh koordinator bidang terkait.'}
          </p>
        </div>
      </div>
    `;
  };

  if (prefillTicket) {
    window.handleTicketSearch();
  }
}

window.openMaklumatModal = openMaklumatModal;
window.openCheckTicketModal = openCheckTicketModal;

// Modal Khusus: Preview Infografis Standar Pelayanan & Dokumen (Ultra Modern Clean Lightbox)
function openInfographicModal(imageSrc, title = "Infografis Standar Pelayanan") {
  CustomModal.init();
  const backdrop = CustomModal.backdropEl;
  backdrop.style.cssText = "position:fixed !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;width:100vw !important;height:100vh !important;background:rgba(10,15,30,0.88) !important;backdrop-filter:blur(8px) !important;-webkit-backdrop-filter:blur(8px) !important;z-index:999999 !important;display:flex !important;align-items:center !important;justify-content:center !important;padding:16px !important;box-sizing:border-box !important;";

  backdrop.innerHTML = `
    <div class="custom-modal-card" style="max-width: 680px; width: 100%; max-height: 94vh; display: flex; flex-direction: column; background: #0F172A; border: 1.5px solid rgba(255,255,255,0.15); border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); overflow: hidden; animation: customModalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);">
      
      <!-- Clean Floating Header -->
      <div style="background: linear-gradient(135deg, #0F2C59 0%, #1E3A8A 100%); padding: 16px 22px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">
            🖼️
          </div>
          <div>
            <h3 style="color: #FFFFFF; font-size: 1.08rem; font-weight: 800; margin: 0; line-height: 1.3;">${title}</h3>
            <p style="color: #CBD5E1; font-size: 0.75rem; margin: 2px 0 0;">Dokumen Visual Resmi • Disperindag ESDM Pinrang</p>
          </div>
        </div>
        <button id="btnCloseInfographic" title="Tutup Modal" style="background: rgba(255,255,255,0.15); border: none; color: #FFFFFF; font-size: 1.2rem; cursor: pointer; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">&times;</button>
      </div>

      <!-- Centered Lightbox Canvas -->
      <div style="padding: 18px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, #1E293B 0%, #0B132B 100%); overflow-y: auto; max-height: 72vh;">
        <a href="${imageSrc}" target="_blank" rel="noopener noreferrer" title="Klik untuk membuka ukuran penuh di tab baru" style="display: block; text-align: center;">
          <img src="${imageSrc}" alt="${title}" style="max-width: 100%; max-height: 68vh; width: auto; height: auto; object-fit: contain; border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,0.5); transition: transform 0.2s;" loading="lazy">
        </a>
      </div>

      <!-- Integrated Sleek Action Bar -->
      <div style="padding: 14px 22px; background: #0A1124; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; gap: 12px;">
        <a href="${imageSrc}" target="_blank" rel="noopener noreferrer" class="btn-outline" style="background: rgba(255,255,255,0.1); color: #FDE047; border-color: rgba(250,204,21,0.5); font-size: 0.82rem; font-weight: 700; padding: 8px 16px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
          <span>🔍</span> Buka Resolusi Penuh (HD) &rarr;
        </a>
        <button class="btn-primary" id="btnCloseInfographicBtn" style="background: #FACC15; color: #0F2C59; border-color: #FACC15; font-weight: 800; padding: 8px 22px; font-size: 0.84rem; border-radius: 8px; cursor: pointer;">
          ✓ Tutup
        </button>
      </div>

    </div>
  `;

  backdrop.classList.add('active');

  const close = () => {
    backdrop.classList.remove('active');
    backdrop.style.display = 'none';
  };

  document.getElementById('btnCloseInfographic').onclick = close;
  document.getElementById('btnCloseInfographicBtn').onclick = close;
}

// Modal Khusus: Detail Kasus Pengaduan 2025 (Masking Privasi)
function openComplaintDetailModal(caseId) {
  CustomModal.init();
  const backdrop = CustomModal.backdropEl;
  backdrop.style.cssText = "position:fixed !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;width:100vw !important;height:100vh !important;background:rgba(15,23,42,0.85) !important;backdrop-filter:blur(5px) !important;z-index:999999 !important;display:flex !important;align-items:center !important;justify-content:center !important;padding:16px !important;box-sizing:border-box !important;";
  const recap = typeof getStorage === 'function' ? getStorage('disperindag_complaint_recap_2025', window.DEFAULT_COMPLAINT_RECAP_2025) : window.DEFAULT_COMPLAINT_RECAP_2025;
  const c = recap?.cases?.find(item => item.id === caseId) || recap?.cases?.[0];
  if (!c) return;

  backdrop.innerHTML = `
    <div class="custom-modal-card" style="max-width: 600px; width: 95%; border-top: 4px solid #10B981; box-shadow: var(--shadow-xl); background: #FFFFFF; border-radius: 16px; overflow: hidden;">
      <div class="custom-modal-header" style="background: linear-gradient(135deg, #064E3B 0%, #0F766E 100%); color: #FFFFFF; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.5rem;">📋</span>
          <div>
            <h3 style="color: #FFFFFF; font-size: 1.1rem; font-weight: 800; margin: 0;">${c.number}: ${c.substance}</h3>
            <p style="color: #A7F3D0; font-size: 0.75rem; margin: 2px 0 0;">Rekapitulasi Penanganan Pengaduan Tahun 2025</p>
          </div>
        </div>
        <button id="btnCloseCaseModal" style="background: rgba(255,255,255,0.15); border: none; color: #FFFFFF; font-size: 1.1rem; cursor: pointer; width: 30px; height: 30px; border-radius: 6px;">✕</button>
      </div>
      <div class="custom-modal-body" style="padding: 20px; line-height: 1.6; font-size: 0.86rem; color: #334155; text-align: left; max-height: 70vh; overflow-y: auto;">
        <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 0.72rem; color: #166534; font-weight: 800; text-transform: uppercase;">Status Penyelesaian:</div>
            <div style="font-size: 1rem; font-weight: 900; color: #047857;">✅ ${c.status} (100%)</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.72rem; color: #64748B;">Waktu Penyelesaian:</div>
            <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A;">⏱️ ${c.duration}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; background: #F8FAFC; padding: 12px 14px; border-radius: 8px; border: 1px solid #E2E8F0;">
          <div><strong style="color: #475569;">Tanggal Diterima:</strong><br><span style="color: #0F172A; font-weight: 700;">📅 ${c.date}</span></div>
          <div><strong style="color: #475569;">Waktu Laporan:</strong><br><span style="color: #0F172A; font-weight: 700;">🕒 ${c.time}</span></div>
          <div><strong style="color: #475569;">Kanal Pengaduan:</strong><br><span style="color: #1E40AF; font-weight: 700;">📞 ${c.channel}</span></div>
          <div><strong style="color: #475569;">Klasifikasi Bidang:</strong><br><span style="color: #0F172A; font-weight: 700;">🏛️ ${c.classification}</span></div>
        </div>

        <div style="margin-bottom: 12px;">
          <strong style="font-size: 0.82rem; color: #475569; text-transform: uppercase;">Substansi Aduan:</strong>
          <div style="background: #F1F5F9; padding: 10px 12px; border-radius: 6px; margin-top: 4px; font-weight: 600; color: #1E293B;">
            "${c.substance}"
          </div>
        </div>

        <div>
          <strong style="font-size: 0.82rem; color: #166534; text-transform: uppercase;">Tindak Lanjut & Solusi:</strong>
          <div style="background: #ECFDF5; border-left: 4px solid #10B981; padding: 10px 14px; border-radius: 6px; margin-top: 4px; color: #064E3B; font-weight: 600;">
            ${c.follow_up}
          </div>
        </div>

        <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #E2E8F0; font-size: 0.75rem; color: #64748B; display: flex; align-items: center; gap: 6px;">
          <span>🔒</span> <em>Identitas pelapor dilindungi kerahasiaannya sesuai ketentuan peraturan perundang-undangan.</em>
        </div>
      </div>
      <div class="custom-modal-footer" style="padding: 12px 20px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;">
        <button onclick="openInfographicModal('assets/infografis/Rekapitulasi_Pengaduan_2025.jpg', 'Infografis Rekapitulasi Pengaduan 2025')" class="btn-outline" style="font-size: 0.8rem; padding: 8px 12px; background: #FFFFFF; cursor: pointer;">
          <span>🖼️</span> Lihat Infografis Rekap
        </button>
        <button class="btn-modal-action btn-modal-primary" id="btnCloseCaseModalBtn" style="padding: 8px 20px; font-size: 0.84rem; cursor: pointer;">
          ✓ Tutup
        </button>
      </div>
    </div>
  `;
  backdrop.classList.add('active');
  const close = () => {
    backdrop.classList.remove('active');
    backdrop.style.display = 'none';
  };
  document.getElementById('btnCloseCaseModal').onclick = close;
  document.getElementById('btnCloseCaseModalBtn').onclick = close;
}

// --- GLOBAL SEARCH MODAL SYSTEM ---
function openSearchModal() {
  CustomModal.init();
  const backdrop = CustomModal.backdropEl;
  backdrop.style.display = 'flex';

  backdrop.innerHTML = `
    <div class="custom-modal-card" style="max-width: 680px; border-radius: 20px; overflow: hidden; border: 2px solid #CBD5E1; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.45);">
      <div style="background: linear-gradient(135deg, #0F2C59 0%, #1E3A8A 100%); padding: 22px 24px; color: #FFFFFF; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
              🔍
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.15rem; font-weight: 900; color: #FFFFFF;">Pencarian Informasi Portal</h3>
              <p style="margin: 0; font-size: 0.76rem; color: #CBD5E1;">Layanan Publik, Berita, Regulasi, dan Komoditas Pasar</p>
            </div>
          </div>
          <button id="btnCloseSearchModal" style="background: rgba(255,255,255,0.15); border: none; color: #FFFFFF; font-size: 1.1rem; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">&times;</button>
        </div>

        <div style="position: relative; margin-top: 14px;">
          <input type="text" id="globalSearchInput" placeholder="Ketik kata kunci pencarian (contoh: Tera, OSS, Beras, Gas LPG, SOP)..." style="width: 100%; padding: 13px 18px 13px 44px; border-radius: 12px; border: 2px solid #FDE047; font-size: 0.95rem; font-family: inherit; outline: none; background: #FFFFFF; color: #0F172A; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          <span style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); font-size: 1.1rem; color: #64748B;">🔍</span>
        </div>
      </div>

      <div style="padding: 18px 24px; max-height: 55vh; overflow-y: auto;" id="globalSearchResults">
        <div style="text-align: center; padding: 24px 0; color: #64748B; font-size: 0.88rem;">
          💡 Ketik kata kunci minimal 2 karakter untuk memulai pencarian pintar di seluruh portal.
        </div>
      </div>

      <div style="padding: 12px 24px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: #64748B;">
        <span>Tekan <kbd style="background: #E2E8F0; padding: 2px 6px; border-radius: 4px; font-weight: 700;">ESC</kbd> untuk menutup</span>
        <span style="color: #0F2C59; font-weight: 800;">Disperindag ESDM Pinrang</span>
      </div>
    </div>
  `;

  backdrop.classList.add('active');

  const close = () => {
    backdrop.classList.remove('active');
    backdrop.style.display = 'none';
  };

  document.getElementById('btnCloseSearchModal').onclick = close;

  const searchInput = document.getElementById('globalSearchInput');
  const resultsContainer = document.getElementById('globalSearchResults');
  
  setTimeout(() => searchInput.focus(), 50);

  // Search Data Source Index
  const searchIndex = [
    { title: "Verifikasi Perizinan Berusaha Sektor Perindustrian (OSS-RBA)", type: "Layanan Publik", url: "layanan.html#srv_oss_industri", desc: "Standar verifikasi dan persetujuan izin industri melalui sistem OSS.", icon: "🏭" },
    { title: "Fasilitasi Perizinan Berusaha Sektor Perdagangan (OSS-RBA)", type: "Layanan Publik", url: "layanan.html#srv_oss_perdagangan", desc: "Penerbitan Surat Keterangan dan verifikasi usaha perdagangan.", icon: "📈" },
    { title: "Surat Keterangan Distributor Pupuk Bersubsidi", type: "Layanan Publik", url: "layanan.html#srv_pupuk_subsidi", desc: "Rekomendasi resmi penyalur dan distributor pupuk bersubsidi daerah.", icon: "🌱" },
    { title: "Pelayanan Tera dan Tera Ulang UTTP (Alat Ukur & Timbangan)", type: "Layanan Publik", url: "layanan.html#srv_tera", desc: "Pengujian kebenaran ukuran timbangan pasar dan takaran BBM SPBU.", icon: "⚖️" },
    { title: "Fasilitasi Sertifikasi TKDN, IKM, Halal & P-IRT", type: "Layanan Publik", url: "layanan.html#srv_tkdn_halal", desc: "Pendampingan legalitas, sertifikasi halal gratis, dan kurasi mutu produk lokal.", icon: "🏷️" },
    { title: "Informasi Publik & Pemantauan Harga Pasar (PIHPS)", type: "Layanan Publik", url: "layanan.html#srv_pihps", desc: "Data komoditas pangan pokok Pasar Sentral dan pantauan stabilitas harga.", icon: "📊" },
    { title: "Konsultasi & Layanan Informasi Publik (PPID Pelaksana)", type: "Layanan Publik", url: "layanan.html#srv_ppid", desc: "Permohonan informasi publik kedinasan berbasis UU KIP No. 14/2008.", icon: "🏛️" },
    { title: "Pengawasan Tata Kelola Gas LPG 3 Kg Bersubsidi", type: "Layanan Publik", url: "layanan.html#srv_lpg", desc: "Monitoring pangkalan dan evaluasi kepatuhan terhadap HET resmi yang berlaku.", icon: "🔥" },
    { title: "Layanan Aspirasi & Pengaduan Konsumen / Masyarakat", type: "Layanan Publik", url: "layanan.html#srv_pengaduan", desc: "Saluran pengaduan terpadu dan penanganan aduan masyarakat.", icon: "📢" },
    { title: "Pantauan Harga Beras Medium SPHP & Premium Lokal Lasinrang", type: "Harga Pasar", url: "#sembako", desc: "Informasi harga beras per kilogram di Pasar Sentral Pinrang.", icon: "🌾" },
    { title: "Pantauan Harga Minyak Goreng Minyakita & Kemasan Premium", type: "Harga Pasar", url: "#sembako", desc: "Update harga minyak goreng curah dan kemasan pasar daerah.", icon: "🛢️" },
    { title: "Pantauan Harga Cabai Rawit Merah, Bawang Merah & Daging Sapi", type: "Harga Pasar", url: "#sembako", desc: "Perkembangan harga harian bahan pokok dan komoditas bumbu dapur.", icon: "🥩" },
    { title: "Tindak Lanjut Aduan Warga, Pangkalan LPG 3 Kg Nakal Dijatuhi Sanksi PHU", type: "Berita Kedinasan", url: "arsip-berita.html", desc: "Penindakan tegas bersama Pertamina terhadap pelanggaran HET gas melon di Duampanua.", icon: "📰" },
    { title: "Kawal Kepatuhan HET, Disperindag Gelar Rakor Bersama Agen LPG", type: "Berita Kedinasan", url: "arsip-berita.html", desc: "Evaluasi distribusi kuota dan usulan kuota khusus petani di musim tanam.", icon: "📰" },
    { title: "Jamin Transaksi Adil, Bidang Kemetrologian Gelar Sidang Tera Ulang Pasar", type: "Berita Kedinasan", url: "arsip-berita.html", desc: "Pengujian timbangan pedagang dan takaran SPBU di jalur poros Pinrang.", icon: "📰" },
    { title: "Perbup Pinrang No. 35 Tahun 2023 tentang Kedudukan, Tupoksi Disperindag", type: "Regulasi Dokumen", url: "ppid.html?id=doc_01#dokumen-regulasi", desc: "Dasar hukum struktur organisasi dan uraian tugas kedinasan.", icon: "📄" },
    { title: "Katalog Produk Unggulan Tenun Sutra Corak Lasinrang", type: "Produk IKM", url: "katalog-ikm.html", desc: "Koleksi kerajinan tenun sutra tradisional binaan Dekranasda Pinrang.", icon: "🧵" },
    { title: "Katalog Kopi Basseang & Olahan Pangan Lokal", type: "Produk IKM", url: "katalog-ikm.html", desc: "Produk kopi robusta pegunungan dan aneka olahan laut khas Pinrang.", icon: "☕" }
  ];

  searchInput.oninput = (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (q.length < 2) {
      resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 24px 0; color: #64748B; font-size: 0.88rem;">
          💡 Ketik kata kunci minimal 2 karakter untuk mencari layanan, berita, dokumen, atau harga pasar.
        </div>
      `;
      return;
    }

    const filtered = searchIndex.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.desc.toLowerCase().includes(q) || 
      item.type.toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 28px 0; color: #94A3B8;">
          <div style="font-size: 2rem; margin-bottom: 6px;">🔍</div>
          <strong style="color: #334155; font-size: 0.95rem;">Tidak ditemukan hasil untuk "${e.target.value}"</strong>
          <p style="font-size: 0.82rem; margin-top: 4px; color: #64748B;">Coba gunakan kata kunci lain seperti <em>Tera, OSS, Beras, LPG, SOP,</em> atau <em>Perbup</em>.</p>
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = `
      <div style="font-size: 0.76rem; font-weight: 800; color: #1E40AF; text-transform: uppercase; margin-bottom: 10px;">
        Ditemukan ${filtered.length} Hasil Pencarian:
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${filtered.map(item => `
          <a href="${item.url}" onclick="document.getElementById('globalCustomModal').classList.remove('active'); document.getElementById('globalCustomModal').style.display='none';" style="text-decoration: none; display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 12px; transition: all 0.2s ease; box-shadow: var(--shadow-sm);">
            <div style="width: 38px; height: 38px; border-radius: 8px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">
              ${item.icon}
            </div>
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <h4 style="margin: 0; font-size: 0.92rem; font-weight: 800; color: #0F2C59;">${item.title}</h4>
                <span style="font-size: 0.68rem; font-weight: 800; color: #1E40AF; background: #EFF6FF; padding: 2px 8px; border-radius: 12px; flex-shrink: 0; margin-left: 8px;">${item.type}</span>
              </div>
              <p style="margin: 0; font-size: 0.78rem; color: #64748B; line-height: 1.4;">${item.desc}</p>
            </div>
          </a>
        `).join('')}
      </div>
    `;
  };
}

window.openInfographicModal = openInfographicModal;
window.openComplaintDetailModal = openComplaintDetailModal;
window.openSearchModal = openSearchModal;
