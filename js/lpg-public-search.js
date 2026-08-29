/**
 * Disperindag ESDM Pinrang - Kanal Publik Cek Pangkalan LPG 3 Kg Resmi
 * Menampilkan dan memfilter 681 pangkalan resmi terdaftar di 12 Kecamatan
 */

document.addEventListener('DOMContentLoaded', () => {
  initPublicLpgSearch();
});

function initPublicLpgSearch() {
  const container = document.getElementById('publicLpgResultsList');
  if (!container) return;

  const searchInput = document.getElementById('publicLpgSearchInput');
  const kecSelect = document.getElementById('publicLpgKecSelect');

  function getActivePangkalan() {
    const raw = (typeof getLpgStore === 'function') 
      ? getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []) 
      : ((typeof LPG_SEED_PANGKALAN !== 'undefined') ? LPG_SEED_PANGKALAN : []);
    return raw.filter(p => !p.isDeleted);
  }

  function renderList() {
    const list = getActivePangkalan();
    const kw = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const kec = kecSelect ? kecSelect.value : '';

    const filtered = list.filter(p => {
      if (kec && p.kecamatan !== kec) return false;
      if (kw) {
        const name = (p.name || '').toLowerCase();
        const desa = (p.desaKelurahan || '').toLowerCase();
        const address = (p.address || '').toLowerCase();
        const owner = (p.ownerName || '').toLowerCase();
        const agent = (p.agentName || '').toLowerCase();
        if (!name.includes(kw) && !desa.includes(kw) && !address.includes(kw) && !owner.includes(kw) && !agent.includes(kw)) {
          return false;
        }
      }
      return true;
    });

    const countEl = document.getElementById('publicLpgResultCount');
    if (countEl) {
      countEl.textContent = `Menampilkan ${Math.min(filtered.length, 12)} dari total ${filtered.length} pangkalan resmi`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding:36px; background:#F8FAFC; border-radius:12px; border:1px dashed #CBD5E1;">
          <div style="font-size:2rem; margin-bottom:8px;">🔍</div>
          <strong style="color:#0F172A; font-size:1rem;">Pangkalan Tidak Ditemukan</strong>
          <p style="color:#64748B; font-size:0.85rem; margin-top:4px;">Pastikan ejaan nama desa atau pangkalan sudah benar. Jika pangkalan tidak terdaftar resmi, waspadai potensi penjualan di atas HET.</p>
          <a href="#pengaduan" class="btn-outline" style="display:inline-flex; margin-top:12px; font-size:0.8rem; padding:8px 16px; border-color:#DC2626; color:#DC2626;">
            📢 Laporkan Pangkalan Tidak Resmi / Ilegal
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.slice(0, 12).map(p => `
      <div class="lpg-public-card" style="background:#FFFFFF; border:1.5px solid #E2E8F0; border-radius:12px; padding:18px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 2px 4px rgba(0,0,0,0.02); transition: transform 0.2s, box-shadow 0.2s;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px;">
            <strong style="color:#0F2C59; font-size:0.95rem; line-height:1.35;">${p.name}</strong>
            <span style="background:#ECFDF5; color:#059669; font-size:0.68rem; font-weight:800; padding:2px 8px; border-radius:12px; white-space:nowrap;">
              ✓ RESMI ESDM
            </span>
          </div>
          <div style="font-size:0.8rem; color:#1D4ED8; font-weight:700; margin-bottom:4px;">
            🏢 Agen: ${p.agentName || 'Agen Resmi'}
          </div>
          <div style="font-size:0.78rem; color:#475569; margin-bottom:6px;">
            📍 <strong>${p.desaKelurahan}</strong>, Kec. ${p.kecamatan}
          </div>
          <div style="font-size:0.76rem; color:#64748B; line-height:1.4; margin-bottom:12px;">
            ${p.address}
          </div>
        </div>
        <div style="padding-top:10px; border-top:1px solid #F1F5F9; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.75rem; color:#059669; font-weight:800;">HET: Rp 18.500</span>
          <a href="#pengaduan" onclick="prefillComplaintLpg('${p.name.replace(/'/g, "\\'")}', '${p.kecamatan}')" style="font-size:0.74rem; color:#DC2626; font-weight:700; text-decoration:none;">
            Laporkan &rarr;
          </a>
        </div>
      </div>
    `).join('');
  }

  if (searchInput) searchInput.addEventListener('input', renderList);
  if (kecSelect) kecSelect.addEventListener('change', renderList);

  renderList();
}

window.prefillComplaintLpg = function(pangkalanName, kecamatan) {
  const formKat = document.getElementById('aduanKategori');
  const formSub = document.getElementById('aduanJudul');
  const formIsi = document.getElementById('aduanIsi');

  if (formKat) formKat.value = 'ESDM & LPG 3 Kg';
  if (formSub) formSub.value = `Pengaduan Pangkalan LPG 3 Kg: ${pangkalanName}`;
  if (formIsi) {
    formIsi.value = `Nama Pangkalan: ${pangkalanName}\nKecamatan: ${kecamatan}\n\nUraian Laporan/Temuan:\n(Contoh: Penjualan tabung melon di atas HET resmi Rp 18.500 / penolakan pembelian dengan KTP / kelangkaan stok)`;
  }
};
