// ==============================================================================
// CONTROLLER: CMS ADMIN PENYALUR BBM (SPBU, APMS, SPBUN, PERTASHOP)
// ==============================================================================

(function(window) {
  'use strict';

  let currentAdminBbmList = [];

  function isLegacyBase64Photo(value) {
    return typeof value === 'string' && value.startsWith('data:image');
  }

  function getDefaultBbmPhoto(item) {
    if (item.kategori_code === 'pertashop') return 'assets/brand/pertashop_default.svg';
    if (item.kategori_code === 'spbu_kompak') return 'assets/brand/spbu_kompak_default.svg';
    if (item.kategori_code === 'spbun') return 'assets/brand/spbun_default.svg';
    return 'assets/brand/spbu_reguler_default.svg';
  }

  function getSafeBbmPhoto(item) {
    const fallback = getDefaultBbmPhoto(item);
    return !item.foto || isLegacyBase64Photo(item.foto) ? fallback : item.foto;
  }

  window.initAdminBbm = function() {
    renderAdminBbmTable();
    initAdminBbmEventListeners();
    if (typeof BbmEngine !== 'undefined' && !window.__adminBbmUnsubscribe) {
      window.__adminBbmUnsubscribe = BbmEngine.initRealtimeSync(() => renderAdminBbmTable());
    }
  };

  function initAdminBbmEventListeners() {
    const search = document.getElementById('adminBbmSearch');
    const kat = document.getElementById('adminBbmFilterKategori');
    const kec = document.getElementById('adminBbmFilterKecamatan');

    if (search) search.addEventListener('input', () => filterAdminBbm());
    if (kat) kat.addEventListener('change', () => filterAdminBbm());
    if (kec) kec.addEventListener('change', () => filterAdminBbm());
  }

  window.renderAdminBbmTable = function() {
    const tbody = document.getElementById('adminBbmTableBody');
    if (!tbody) return;

    currentAdminBbmList = typeof BbmEngine !== 'undefined' ? BbmEngine.getAll() : [];
    updateAdminBbmStats(currentAdminBbmList);

    const list = currentAdminBbmList;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: #94A3B8; padding: 28px;">
            Belum ada data penyalur BBM yang sesuai filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(item => {
      const isOperasi = (item.status_operasi || 'Beroperasi').toLowerCase().includes('operasi');
      const productsHtml = (item.produk || []).map(p => `<span style="font-size:0.68rem; background:#F1F5F9; color:#475569; padding:2px 6px; border-radius:4px; border:1px solid #E2E8F0; margin-right:3px; display:inline-block; margin-bottom:2px;">${p}</span>`).join('');
      const mapsUrl = item.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.nama + ' ' + (item.alamat_terkini || 'Pinrang'))}`;
      const defaultSvg = getDefaultBbmPhoto(item);
      const fotoSrc = getSafeBbmPhoto(item);

      return `
        <tr>
          <td style="text-align: center; width: 75px; vertical-align: top; padding-top: 14px;">
            <div onclick="openBbmPhotoLightbox('${fotoSrc}', '${item.nama.replace(/'/g, "\\'")}')" style="position: relative; width: 62px; height: 46px; border-radius: 6px; overflow: hidden; border: 1px solid #CBD5E1; background: #030D1B; margin: 0 auto; cursor: pointer;" title="Klik untuk memperbesar foto">
              <img src="${fotoSrc}" style="width: 100%; height: 100%; object-fit: cover;" alt="Thumbnail" onerror="this.onerror=null; this.src='${defaultSvg}';">
            </div>
          </td>
          <td style="vertical-align: top;">
            <span style="font-family: monospace; font-size: 0.76rem; font-weight: 800; background: #EFF6FF; color: #1E40AF; padding: 2px 6px; border-radius: 4px; border: 1px solid #DBEAFE;">${item.kode}</span>
            <div style="font-weight: 800; color: var(--admin-navy-deep); line-height: 1.35; margin: 4px 0 2px; font-size: 0.92rem;">
              ${item.nama}
            </div>
            <div style="font-size: 0.76rem; color: #64748B; margin-bottom: 6px;">
              🏢 <strong>${item.badan_usaha || 'Penyalur Resmi'}</strong>
            </div>
            <!-- INLINE ACTION BAR BERJEJER -->
            <div class="news-inline-action-bar" style="margin-top: 4px; padding-top: 4px;">
              <button type="button" onclick="openEditBbmModal('${item.id}')" class="btn-action-item btn-action-edit" title="Sunting Detail & Foto Penyalur BBM">
                <span>✏️</span> Edit Detail &amp; Foto
              </button>
              <button type="button" onclick="openBbmPreviewModal('${item.id}')" class="btn-action-item btn-action-view" title="Pratinjau Informasi">
                <span>👁️</span> Pratinjau
              </button>
              <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn-action-item" style="background:#EFF6FF; color:#1E40AF; border: 1px solid #BFDBFE; text-decoration:none;" title="Buka Titik di Google Maps">
                <span>🗺️</span> Rute
              </a>
              <button type="button" onclick="deleteAdminBbmOutlet('${item.id}')" class="btn-action-item btn-action-delete" title="Hapus Data Outlet">
                <span>🗑️</span> Hapus
              </button>
            </div>
          </td>
          <td style="vertical-align: top; padding-top: 14px;">
            <span style="font-size: 0.74rem; font-weight: 800; background: ${item.badge_color || '#0F2C59'}; color: #FFF; padding: 3px 8px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">
              ${item.kategori_badge || item.jenis_resmi}
            </span>
            <div style="font-size: 0.78rem; font-weight: 700; color: #1E293B;">📍 Kec. ${item.kecamatan}</div>
            <div style="font-size: 0.72rem; color: #64748B;">Desa: ${item.desa || '-'}</div>
          </td>
          <td style="vertical-align: top; padding-top: 14px; max-width: 220px;">
            <div style="font-size: 0.78rem; color: #334155; line-height: 1.35; margin-bottom: 6px;">
              ${item.alamat_terkini || item.alamat_resmi}
            </div>
            <div>${productsHtml}</div>
          </td>
          <td style="vertical-align: top; padding-top: 14px; font-size: 0.78rem;">
            <div>🕒 ${item.jam_operasi || '06.00 - 22.00 WITA'}</div>
            <div style="font-size: 0.70rem; color: #64748B; margin-top: 2px;">📞 ${item.kontak_pengelola || '-'}</div>
          </td>
          <td style="vertical-align: top; padding-top: 14px; text-align: center; white-space: nowrap;">
            <span class="verified-badge ${isOperasi ? 'selesai' : 'diterima'}" style="white-space: nowrap;">
              ${isOperasi ? '● Beroperasi' : '⚠️ Pemeliharaan'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  };

  function updateAdminBbmStats(list) {
    const stats = typeof BbmEngine !== 'undefined' ? BbmEngine.getStats(list) : { total: 0, spbu_reguler: 0, spbu_kompak: 0, pertashop: 0, spbun: 0 };
    
    const elTotal = document.getElementById('adminBbmStatTotal');
    const elSpbu = document.getElementById('adminBbmStatSpbu');
    const elApms = document.getElementById('adminBbmStatApms');
    const elPertashop = document.getElementById('adminBbmStatPertashop');
    const elSpbun = document.getElementById('adminBbmStatSpbun');

    if (elTotal) elTotal.innerText = stats.total;
    if (elSpbu) elSpbu.innerText = stats.spbu_reguler;
    if (elApms) elApms.innerText = stats.spbu_kompak;
    if (elPertashop) elPertashop.innerText = stats.pertashop;
    if (elSpbun) elSpbun.innerText = stats.spbun;
  }

  window.filterAdminBbm = function() {
    const searchVal = document.getElementById('adminBbmSearch')?.value || '';
    const katVal = document.getElementById('adminBbmFilterKategori')?.value || 'all';
    const kecVal = document.getElementById('adminBbmFilterKecamatan')?.value || 'all';

    const filtered = BbmEngine.filter({
      search: searchVal,
      kategori: katVal,
      kecamatan: kecVal
    });

    const tbody = document.getElementById('adminBbmTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: #94A3B8; padding: 28px;">
            Tidak ditemukan data penyalur BBM yang cocok dengan kriteria filter.
          </td>
        </tr>
      `;
      return;
    }

    // Render filtered
    tbody.innerHTML = filtered.map(item => {
      const isOperasi = (item.status_operasi || 'Beroperasi').toLowerCase().includes('operasi');
      const productsHtml = (item.produk || []).map(p => `<span style="font-size:0.68rem; background:#F1F5F9; color:#475569; padding:2px 6px; border-radius:4px; border:1px solid #E2E8F0; margin-right:3px; display:inline-block; margin-bottom:2px;">${p}</span>`).join('');
      const mapsUrl = item.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.nama + ' ' + (item.alamat_terkini || 'Pinrang'))}`;
      const defaultSvg = getDefaultBbmPhoto(item);
      const fotoSrc = getSafeBbmPhoto(item);

      return `
        <tr>
          <td style="text-align: center; width: 75px; vertical-align: top; padding-top: 14px;">
            <div onclick="openBbmPhotoLightbox('${fotoSrc}', '${item.nama.replace(/'/g, "\\'")}')" style="position: relative; width: 62px; height: 46px; border-radius: 6px; overflow: hidden; border: 1px solid #CBD5E1; background: #030D1B; margin: 0 auto; cursor: pointer;" title="Klik untuk memperbesar foto">
              <img src="${fotoSrc}" style="width: 100%; height: 100%; object-fit: cover;" alt="Thumbnail" onerror="this.onerror=null; this.src='${defaultSvg}';">
            </div>
          </td>
          <td style="vertical-align: top;">
            <span style="font-family: monospace; font-size: 0.76rem; font-weight: 800; background: #EFF6FF; color: #1E40AF; padding: 2px 6px; border-radius: 4px; border: 1px solid #DBEAFE;">${item.kode}</span>
            <div style="font-weight: 800; color: var(--admin-navy-deep); line-height: 1.35; margin: 4px 0 2px; font-size: 0.92rem;">
              ${item.nama}
            </div>
            <div style="font-size: 0.76rem; color: #64748B; margin-bottom: 6px;">
              🏢 <strong>${item.badan_usaha || 'Penyalur Resmi'}</strong>
            </div>
            <div class="news-inline-action-bar" style="margin-top: 4px; padding-top: 4px;">
              <button type="button" onclick="openEditBbmModal('${item.id}')" class="btn-action-item btn-action-edit" title="Sunting Detail & Foto Penyalur BBM">
                <span>✏️</span> Edit Detail &amp; Foto
              </button>
              <button type="button" onclick="openBbmPreviewModal('${item.id}')" class="btn-action-item btn-action-view" title="Pratinjau Informasi">
                <span>👁️</span> Pratinjau
              </button>
              <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn-action-item" style="background:#EFF6FF; color:#1E40AF; border: 1px solid #BFDBFE; text-decoration:none;" title="Buka Titik di Google Maps">
                <span>🗺️</span> Rute
              </a>
              <button type="button" onclick="deleteAdminBbmOutlet('${item.id}')" class="btn-action-item btn-action-delete" title="Hapus Data Outlet">
                <span>🗑️</span> Hapus
              </button>
            </div>
          </td>
          <td style="vertical-align: top; padding-top: 14px;">
            <span style="font-size: 0.74rem; font-weight: 800; background: ${item.badge_color || '#0F2C59'}; color: #FFF; padding: 3px 8px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">
              ${item.kategori_badge || item.jenis_resmi}
            </span>
            <div style="font-size: 0.78rem; font-weight: 700; color: #1E293B;">📍 Kec. ${item.kecamatan}</div>
            <div style="font-size: 0.72rem; color: #64748B;">Desa: ${item.desa || '-'}</div>
          </td>
          <td style="vertical-align: top; padding-top: 14px; max-width: 220px;">
            <div style="font-size: 0.78rem; color: #334155; line-height: 1.35; margin-bottom: 6px;">
              ${item.alamat_terkini || item.alamat_resmi}
            </div>
            <div>${productsHtml}</div>
          </td>
          <td style="vertical-align: top; padding-top: 14px; font-size: 0.78rem;">
            <div>🕒 ${item.jam_operasi || '06.00 - 22.00 WITA'}</div>
            <div style="font-size: 0.70rem; color: #64748B; margin-top: 2px;">📞 ${item.kontak_pengelola || '-'}</div>
          </td>
          <td style="vertical-align: top; padding-top: 14px; text-align: center; white-space: nowrap;">
            <span class="verified-badge ${isOperasi ? 'selesai' : 'diterima'}" style="white-space: nowrap;">
              ${isOperasi ? '● Beroperasi' : '⚠️ Pemeliharaan'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  };

  window.resetAdminBbmFilter = function() {
    const search = document.getElementById('adminBbmSearch');
    const kat = document.getElementById('adminBbmFilterKategori');
    const kec = document.getElementById('adminBbmFilterKecamatan');

    if (search) search.value = '';
    if (kat) kat.value = 'all';
    if (kec) kec.value = 'all';

    renderAdminBbmTable();
  };

  // MODAL EDIT DETAIL & FOTO PENYALUR BBM
  window.openEditBbmModal = function(id) {
    const item = BbmEngine.getById(id);
    if (!item) return;

    const currentProds = Array.isArray(item.produk) ? item.produk.join(', ') : 'Pertalite, Pertamax, Solar Subsidi';

    CustomModal.form({
      title: `Edit Penyalur BBM: ${item.nama} (${item.kode})`,
      icon: "⛽",
      fields: [
        {
          name: "nama",
          label: "Nama / Sebutan Outlet Penyalur",
          type: "text",
          required: true,
          value: item.nama,
          placeholder: "Contoh: SPBU Maccorawalie"
        },
        {
          name: "kode",
          label: "Kode Resmi Penyalur (Ditjen Migas)",
          type: "text",
          required: true,
          value: item.kode,
          placeholder: "Contoh: 74.912.01 atau 7P91202"
        },
        {
          name: "kategori_code",
          label: "Klasifikasi / Jenis Penyalur",
          type: "select",
          required: true,
          value: item.kategori_code || 'spbu_reguler',
          options: [
            { value: "spbu_reguler", label: "SPBU Reguler (Seri 74)" },
            { value: "spbu_kompak", label: "SPBU Kompak / APMS (Seri 76)" },
            { value: "pertashop", label: "Pertashop Resmi (Seri 7P)" },
            { value: "spbun", label: "SPBUN Nelayan (Seri 78)" }
          ]
        },
        {
          name: "badan_usaha",
          label: "Nama Badan Usaha / Perusahaan Pengelola",
          type: "text",
          required: true,
          value: item.badan_usaha,
          placeholder: "Contoh: PT. BINTANG IFATMAN MANDIRI"
        },
        {
          name: "kecamatan",
          label: "Kecamatan",
          type: "select",
          required: true,
          value: item.kecamatan,
          options: [
            { value: "Watang Sawitto", label: "Watang Sawitto" },
            { value: "Paleteang", label: "Paleteang" },
            { value: "Tiroang", label: "Tiroang" },
            { value: "Suppa", label: "Suppa" },
            { value: "Mattiro Sompe", label: "Mattiro Sompe" },
            { value: "Lanrisang", label: "Lanrisang" },
            { value: "Cempa", label: "Cempa" },
            { value: "Duampanua", label: "Duampanua" },
            { value: "Patampanua", label: "Patampanua" },
            { value: "Lembang", label: "Lembang" },
            { value: "Mattiro Bulu", label: "Mattiro Bulu" },
            { value: "Batulappa", label: "Batulappa" }
          ]
        },
        {
          name: "desa",
          label: "Kelurahan / Desa",
          type: "text",
          value: item.desa || '',
          placeholder: "Contoh: Maccorawalie"
        },
        {
          name: "alamat_terkini",
          label: "Alamat Lengkap / Terkini (Google Places)",
          type: "textarea",
          rows: 2,
          required: true,
          value: item.alamat_terkini || item.alamat_resmi,
          placeholder: "Tuliskan nama jalan, dusun, atau patokan lokasi..."
        },
        {
          name: "alamat_resmi",
          label: "Alamat Resmi SK Ditjen Migas",
          type: "text",
          value: item.alamat_resmi || '',
          placeholder: "Alamat sesuai arsip SK Ditjen Migas"
        },
        {
          name: "produk_str",
          label: "Produk BBM yang Dijual (Pisahkan dengan koma)",
          type: "text",
          required: true,
          value: currentProds,
          placeholder: "Pertalite, Pertamax, Solar Subsidi, Dexlite"
        },
        {
          name: "status_operasi",
          label: "Status Operasional",
          type: "select",
          required: true,
          value: item.status_operasi || 'Beroperasi',
          options: [
            { value: "Beroperasi", label: "● Beroperasi Normal" },
            { value: "Pemeliharaan", label: "⚠️ Pemeliharaan / Tera Ulang" },
            { value: "Tidak Beroperasi", label: "⛔ Tidak Beroperasi" }
          ]
        },
        {
          name: "jam_operasi",
          label: "Jam Operasional",
          type: "text",
          value: item.jam_operasi || '24 Jam',
          placeholder: "Contoh: 24 Jam atau 06.00 - 22.00 WITA"
        },
        {
          name: "kontak_pengelola",
          label: "Kontak Pengelola / Pengawas Lapangan",
          type: "text",
          value: item.kontak_pengelola || '',
          placeholder: "Nomor telepon / WhatsApp pengelola"
        },
        {
          name: "lat",
          label: "Koordinat Latitude (Lintang)",
          type: "text",
          value: String(item.lat || '-3.7915'),
          placeholder: "Contoh: -3.793820"
        },
        {
          name: "lng",
          label: "Koordinat Longitude (Bujur)",
          type: "text",
          value: String(item.lng || '119.646530'),
          placeholder: "Contoh: 119.646530"
        },
        {
          name: "foto",
          label: "Tautan Foto Outlet (URL HTTPS atau Path Asset)",
          type: "text",
          required: true,
          value: isLegacyBase64Photo(item.foto) ? '' : (item.foto || getDefaultBbmPhoto(item)),
          placeholder: "Contoh: assets/brand/spbu_reguler_default.svg atau https://..."
        },
        {
          name: "google_maps_url",
          label: "Tautan Rute Google Maps",
          type: "text",
          value: item.google_maps_url || '',
          placeholder: "https://www.google.com/maps/search/?api=1&query=..."
        },
        {
          name: "catatan",
          label: "Catatan Verifikasi Dinas / Hasil Pengawasan",
          type: "textarea",
          rows: 2,
          value: item.catatan || '',
          placeholder: "Catatan hasil sidak tera metrologi atau ketersediaan kuota BBM..."
        }
      ],
      onSubmit: async (vals) => {
        try {
          const prodsArr = vals.produk_str.split(',').map(p => p.trim()).filter(p => p.length > 0);
          const latitude = Number(vals.lat);
          const longitude = Number(vals.lng);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -4.35 || latitude > -3.10 || longitude < 119.05 || longitude > 120.20) {
            throw new Error('Koordinat wajib berupa angka valid dan berada dalam wilayah Kabupaten Pinrang. Data lama tidak dipakai sebagai pengganti.');
          }

          const patchPayload = {
            nama: vals.nama.trim(),
            kode: vals.kode.trim(),
            kategori_code: vals.kategori_code,
            badan_usaha: vals.badan_usaha.trim(),
            kecamatan: vals.kecamatan,
            desa: vals.desa.trim(),
            alamat_terkini: vals.alamat_terkini.trim(),
            alamat_resmi: vals.alamat_resmi.trim(),
            produk: prodsArr.length > 0 ? prodsArr : ["Pertalite", "Pertamax"],
            status_operasi: vals.status_operasi,
            jam_operasi: vals.jam_operasi.trim(),
            kontak_pengelola: vals.kontak_pengelola.trim(),
            lat: latitude,
            lng: longitude,
            foto: vals.foto.trim() || (isLegacyBase64Photo(item.foto) ? getDefaultBbmPhoto(item) : item.foto),
            google_maps_url: vals.google_maps_url.trim() || `https://www.google.com/maps/search/?api=1&query=${latitude}%2C${longitude}`,
            catatan: vals.catatan.trim(),
            coordinate_status: 'CMS_UPDATED',
            coordinate_updated_by: auth?.currentUser?.uid || 'CMS Administrator',
            coordinate_updated_at: new Date().toISOString()
          };

          const result = await BbmEngine.updateOutlet(item.id, patchPayload);
          renderAdminBbmTable();
          
          if (typeof logAdminActivity === 'function') {
            logAdminActivity('Penyalur BBM', `Memperbarui data titik: ${patchPayload.nama} (${patchPayload.kode})`);
          }

          CustomModal.toast(`Data titik "${patchPayload.nama}" berhasil diperbarui dan disinkronkan.`, "success");
        } catch (err) {
          console.error('Gagal update BBM:', err);
          CustomModal.alert({
            title: "Gagal Menyimpan",
            message: `Terjadi kesalahan: ${err.message}`,
            icon: "⚠️",
            type: "error"
          });
        }
      }
    });
  };

  // MODAL TAMBAH OUTLET BARU
  window.openAddBbmModal = function() {
    CustomModal.form({
      title: "Tambah Titik Penyalur BBM Baru",
      icon: "⛽",
      fields: [
        {
          name: "nama",
          label: "Nama / Sebutan Outlet Penyalur",
          type: "text",
          required: true,
          placeholder: "Contoh: Pertashop 7P.912.16 Lembang"
        },
        {
          name: "kode",
          label: "Kode Resmi Penyalur",
          type: "text",
          required: true,
          placeholder: "Contoh: 7P91216 atau 74.912.99"
        },
        {
          name: "kategori_code",
          label: "Klasifikasi / Jenis Penyalur",
          type: "select",
          required: true,
          options: [
            { value: "pertashop", label: "Pertashop Resmi (Seri 7P)" },
            { value: "spbu_reguler", label: "SPBU Reguler (Seri 74)" },
            { value: "spbu_kompak", label: "SPBU Kompak / APMS (Seri 76)" },
            { value: "spbun", label: "SPBUN Nelayan (Seri 78)" }
          ]
        },
        {
          name: "badan_usaha",
          label: "Nama Badan Usaha / Perusahaan Pengelola",
          type: "text",
          required: true,
          placeholder: "Contoh: CV. MITRA ENERGI PINRANG"
        },
        {
          name: "kecamatan",
          label: "Kecamatan",
          type: "select",
          required: true,
          options: [
            { value: "Watang Sawitto", label: "Watang Sawitto" },
            { value: "Paleteang", label: "Paleteang" },
            { value: "Tiroang", label: "Tiroang" },
            { value: "Suppa", label: "Suppa" },
            { value: "Mattiro Sompe", label: "Mattiro Sompe" },
            { value: "Lanrisang", label: "Lanrisang" },
            { value: "Cempa", label: "Cempa" },
            { value: "Duampanua", label: "Duampanua" },
            { value: "Patampanua", label: "Patampanua" },
            { value: "Lembang", label: "Lembang" },
            { value: "Mattiro Bulu", label: "Mattiro Bulu" },
            { value: "Batulappa", label: "Batulappa" }
          ]
        },
        {
          name: "desa",
          label: "Kelurahan / Desa",
          type: "text",
          placeholder: "Contoh: Desa Bungi"
        },
        {
          name: "alamat_terkini",
          label: "Alamat Lengkap",
          type: "textarea",
          rows: 2,
          required: true,
          placeholder: "Alamat lokasi operasional..."
        },
        {
          name: "produk_str",
          label: "Produk BBM yang Dijual",
          type: "text",
          required: true,
          value: "Pertamax, Dexlite",
          placeholder: "Pertalite, Pertamax, Solar Subsidi"
        },
        {
          name: "status_operasi",
          label: "Status Operasional",
          type: "select",
          required: true,
          options: [
            { value: "Beroperasi", label: "● Beroperasi Normal" },
            { value: "Pemeliharaan", label: "⚠️ Pemeliharaan" }
          ]
        },
        {
          name: "jam_operasi",
          label: "Jam Operasional",
          type: "text",
          value: "06.00 - 21.00 WITA"
        },
        {
          name: "lat",
          label: "Koordinat Latitude (Lintang)",
          type: "number",
          step: "any",
          required: true,
          placeholder: "Contoh: -3.793820"
        },
        {
          name: "lng",
          label: "Koordinat Longitude (Bujur)",
          type: "number",
          step: "any",
          required: true,
          placeholder: "Contoh: 119.646530"
        },
        {
          name: "foto",
          label: "Tautan Foto Outlet (URL HTTPS atau Path Asset)",
          type: "text",
          required: true,
          value: "assets/brand/pertashop_default.svg",
          placeholder: "Contoh: assets/brand/pertashop_default.svg atau URL gambar..."
        }
      ],
      onSubmit: async (vals) => {
        try {
          const prodsArr = vals.produk_str.split(',').map(p => p.trim()).filter(p => p.length > 0);
          const cleanCode = vals.kode.replace(/\./g, '_').trim();
          const latitude = Number(vals.lat), longitude = Number(vals.lng);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -4.35 || latitude > -3.10 || longitude < 119.05 || longitude > 120.20) {
            throw new Error('Koordinat wajib lengkap dan berada dalam wilayah Kabupaten Pinrang.');
          }
          
          let badgeLabel = 'Pertashop Resmi';
          let badgeColor = '#16A34A';
          let jenis = 'Pertashop';

          if (vals.kategori_code === 'spbu_reguler') {
            badgeLabel = 'SPBU Reguler';
            badgeColor = '#DC2626';
            jenis = 'SPBU Reguler';
          } else if (vals.kategori_code === 'spbu_kompak') {
            badgeLabel = 'SPBU Kompak / APMS';
            badgeColor = '#0284C7';
            jenis = 'SPBU Kompak / Seri 76';
          } else if (vals.kategori_code === 'spbun') {
            badgeLabel = 'SPBUN Nelayan';
            badgeColor = '#7C3AED';
            jenis = 'SPBUN / Nelayan';
          }

          const newPayload = {
            id: `bbm_${cleanCode}`,
            kode: vals.kode.trim(),
            nama: vals.nama.trim(),
            jenis_resmi: jenis,
            kategori_code: vals.kategori_code,
            kategori_badge: badgeLabel,
            badge_color: badgeColor,
            badan_usaha: vals.badan_usaha.trim(),
            kecamatan: vals.kecamatan,
            desa: vals.desa.trim(),
            alamat_terkini: vals.alamat_terkini.trim(),
            alamat_resmi: vals.alamat_terkini.trim(),
            kabupaten: "Kabupaten Pinrang",
            produk: prodsArr.length > 0 ? prodsArr : ["Pertamax"],
            status_operasi: vals.status_operasi,
            jam_operasi: vals.jam_operasi.trim(),
            kontak_pengelola: "0823 1600 2226",
            lat: latitude,
            lng: longitude,
            google_maps_url: `https://www.google.com/maps/search/?api=1&query=${latitude}%2C${longitude}`,
            coordinate_status: 'CMS_CREATED',
            coordinate_updated_by: auth?.currentUser?.uid || 'CMS Administrator',
            foto: vals.foto.trim(),
            catatan: "Ditambahkan melalui panel administrator Disperindag ESDM Pinrang."
          };

          const result = await BbmEngine.addOutlet(newPayload);
          renderAdminBbmTable();

          if (typeof logAdminActivity === 'function') {
            logAdminActivity('Penyalur BBM', `Menambahkan penyalur BBM baru: ${newPayload.nama} (${newPayload.kode})`);
          }

          CustomModal.toast(`Penyalur BBM "${newPayload.nama}" berhasil didaftarkan dan disinkronkan.`, "success");
        } catch (err) {
          console.error('Gagal tambah BBM:', err);
          CustomModal.alert({
            title: "Gagal Menambahkan",
            message: `Terjadi kesalahan: ${err.message}`,
            icon: "⚠️",
            type: "error"
          });
        }
      }
    });
  };

  // LIGHTBOX FOTO PENYALUR BBM
  window.openBbmPhotoLightbox = function(fotoUrl, outletName) {
    if (!fotoUrl) return;
    CustomModal.alert({
      title: `Foto Outlet: ${outletName || 'Penyalur BBM'}`,
      icon: "🖼️",
      confirmText: "Tutup",
      message: `
        <div style="text-align: center; padding: 6px 0;">
          <div style="border-radius: 10px; overflow: hidden; max-height: 70vh; background: #030D1B; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
            <img src="${fotoUrl}" alt="${outletName || 'Foto Penyalur'}" style="max-width: 100%; max-height: 65vh; object-fit: contain;" onerror="this.onerror=null; this.src='assets/brand/spbu_reguler_default.svg';">
          </div>
          <div style="margin-top: 10px; font-size: 0.82rem; color: #475569; font-weight: 700;">
            📍 ${outletName || 'Titik Penyalur BBM Resmi'}
          </div>
        </div>
      `
    });
  };

  // PRATINJAU TITIK DETAIL DARI CMS
  window.openBbmPreviewModal = function(id) {
    const item = BbmEngine.getById(id);
    if (!item) return;

    const prods = (item.produk || []).map(p => `<span class="bbm-chip" style="font-size:0.75rem; padding: 3px 10px; background:#EFF6FF; color:#1E40AF; border-radius:4px; font-weight:700; display:inline-block; margin-right:4px;">✓ ${p}</span>`).join(' ');
    const mapsUrl = item.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.nama + ' ' + (item.alamat_terkini || 'Pinrang'))}`;
    const defaultSvg = getDefaultBbmPhoto(item);
    const fotoSrc = getSafeBbmPhoto(item);

    const detailHtml = `
      <div style="max-height: 75vh; overflow-y: auto; padding-right: 4px;">
        <div onclick="openBbmPhotoLightbox('${fotoSrc}', '${item.nama.replace(/'/g, "\\'")}')" style="position: relative; border-radius: 10px; overflow: hidden; height: 200px; background: #030D1B; margin-bottom: 16px; cursor: pointer;" title="Klik untuk memperbesar foto">
          <img src="${fotoSrc}" style="width: 100%; height: 100%; object-fit: cover;" alt="${item.nama}" onerror="this.onerror=null; this.src='${defaultSvg}';">
          <span style="position: absolute; top: 12px; left: 12px; background: ${item.badge_color || '#0F2C59'}; color: #FFF; font-weight: 800; font-size: 0.76rem; padding: 5px 12px; border-radius: 6px;">
            ${item.kategori_badge || item.jenis_resmi}
          </span>
          <span style="position: absolute; top: 12px; right: 12px; background: #059669; color: #FFF; font-weight: 800; font-size: 0.74rem; padding: 4px 12px; border-radius: 999px;">
            ● ${item.status_operasi || 'Beroperasi'}
          </span>
          <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: #FFF; padding: 3px 8px; border-radius: 4px; font-size: 0.70rem;">🔍 Klik untuk Zoom</div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px;">
          <span style="font-family: monospace; font-weight: 800; background: #EFF6FF; color: #1E40AF; padding: 3px 8px; border-radius: 4px; font-size: 0.84rem; border: 1px solid #BFDBFE;">${item.kode}</span>
          <span style="font-size: 0.78rem; color: #059669; font-weight: 800; background: #ECFDF5; padding: 3px 8px; border-radius: 4px; border: 1px solid #A7F3D0;">Sinkronisasi: ${item.status_sinkronisasi || 'Tinggi'}</span>
        </div>

        <h3 style="font-size: 1.25rem; font-weight: 800; color: #0F172A; margin: 0 0 4px;">${item.nama}</h3>
        <div style="font-size: 0.86rem; font-weight: 700; color: #475569; margin-bottom: 14px;">🏢 ${item.badan_usaha || 'Penyalur Resmi'}</div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; background: #F8FAFC; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0;">
          <div>
            <div style="font-size: 0.70rem; font-weight: 800; color: #64748B; text-transform: uppercase;">Kecamatan &amp; Wilayah</div>
            <div style="font-size: 0.84rem; font-weight: 700; color: #0F172A; margin-top: 2px;">Kec. ${item.kecamatan} (${item.desa || '-'})</div>
          </div>
          <div>
            <div style="font-size: 0.70rem; font-weight: 800; color: #64748B; text-transform: uppercase;">Jam Operasional</div>
            <div style="font-size: 0.84rem; font-weight: 700; color: #0F172A; margin-top: 2px;">🕒 ${item.jam_operasi || '24 Jam'}</div>
          </div>
          <div style="grid-column: 1 / -1;">
            <div style="font-size: 0.70rem; font-weight: 800; color: #64748B; text-transform: uppercase;">Alamat Terkini / Google Places</div>
            <div style="font-size: 0.82rem; color: #1E293B; margin-top: 2px;">📍 ${item.alamat_terkini || item.alamat_resmi}</div>
          </div>
          <div style="grid-column: 1 / -1;">
            <div style="font-size: 0.70rem; font-weight: 800; color: #64748B; text-transform: uppercase;">Alamat Resmi Ditjen Migas</div>
            <div style="font-size: 0.80rem; color: #475569; margin-top: 2px; font-family: monospace;">🏛️ ${item.alamat_resmi || '-'}</div>
          </div>
        </div>

        <div style="margin-bottom: 14px;">
          <div style="font-size: 0.76rem; font-weight: 800; color: #0F172A; margin-bottom: 6px;">⛽ Produk BBM yang Tersedia:</div>
          <div>${prods}</div>
        </div>

        ${item.catatan ? `
          <div style="background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; padding: 10px 12px; font-size: 0.78rem; color: #92400E; margin-bottom: 14px;">
            <strong>ℹ️ Catatan Verifikasi ESDM:</strong> ${item.catatan}
          </div>
        ` : ''}

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px;">
          <button type="button" onclick="openEditBbmModal('${item.id}')" class="btn-outline" style="padding: 8px 14px; font-size: 0.82rem;">
            ✏️ Sunting Data
          </button>
          <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="padding: 8px 16px; font-size: 0.82rem; text-decoration: none;">
            <span>🗺️</span> Buka Rute Google Maps
          </a>
        </div>
      </div>
    `;

    CustomModal.alert({
      title: `Pratinjau: ${item.nama} (${item.kode})`,
      message: detailHtml,
      icon: "⛽",
      confirmText: "Tutup"
    });
  };

  // HAPUS OUTLET DARI CMS
  window.deleteAdminBbmOutlet = function(id) {
    const item = BbmEngine.getById(id);
    if (!item) return;

    CustomModal.confirm({
      title: "Hapus Titik Penyalur BBM?",
      message: `Apakah Anda yakin ingin menghapus data <strong>${item.nama} (${item.kode})</strong> dari direktori pengawasan migas daerah?`,
      icon: "🗑️",
      isDanger: true,
      confirmText: "Ya, Hapus Data",
      cancelText: "Batal",
      onSubmit: async () => {
        try {
          await BbmEngine.deleteOutlet(id);
          renderAdminBbmTable();

          if (typeof logAdminActivity === 'function') {
            logAdminActivity('Penyalur BBM', `Menghapus outlet BBM: ${item.nama} (${item.kode})`);
          }

          CustomModal.toast(`Data titik "${item.nama}" berhasil dihapus.`, "info");
        } catch (err) {
          console.error('Gagal hapus BBM:', err);
        }
      }
    });
  };

})(typeof window !== 'undefined' ? window : this);
