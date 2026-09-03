// ==============================================================================
// BBM ENGINE: PUSAT LOGIKA DATA & SINKRONISASI PENYALUR BBM PINRANG
// ==============================================================================

(function(window) {
  'use strict';

  const STORAGE_KEY = 'disperindag_bbm_outlets';
  const VERSION_KEY = 'disperindag_bbm_outlets_version';
  const AUDIT_KEY = 'disperindag_bbm_audit_logs';
  const REQUIRED_DATA_VERSION = '2026-09-02-bbm-palia-plus-code-v3';
  const CATEGORY_META = Object.freeze({
    spbu_reguler: { label:'SPBU Reguler', shortLabel:'SPBU Reguler', color:'#DC2626', symbol:'⛽' },
    spbu_kompak: { label:'SPBU Compact / APMS', shortLabel:'Compact / APMS', color:'#0284C7', symbol:'🛢️' },
    spbun: { label:'SPBUN Nelayan', shortLabel:'SPBUN', color:'#7C3AED', symbol:'⚓' },
    pertashop: { label:'Pertashop', shortLabel:'Pertashop', color:'#16A34A', symbol:'🏪' }
  });

  const BbmEngine = {
    _cloudData: [],
    _cloudReady: false,
    DATA_VERSION: REQUIRED_DATA_VERSION,
    CATEGORY_META,
    normalizeCategory: function(item) {
      const explicit = String(item?.kategori_code || '').toLowerCase();
      if (CATEGORY_META[explicit]) return explicit;
      const text = `${item?.jenis_resmi || ''} ${item?.kategori_badge || ''} ${item?.kode || ''}`.toLowerCase();
      if (/pertashop|\b7p/.test(text)) return 'pertashop';
      if (/spbun|nelayan|\b78/.test(text)) return 'spbun';
      if (/kompak|compact|apms|\b76/.test(text)) return 'spbu_kompak';
      return 'spbu_reguler';
    },
    getCategoryCounts: function(items) {
      const counts = { spbu_reguler:0, spbu_kompak:0, spbun:0, pertashop:0 };
      (Array.isArray(items) ? items : []).forEach(item => { counts[this.normalizeCategory(item)]++; });
      return counts;
    },
    // 1. Data tayang hanya berasal dari snapshot Firestore yang lolos versi.
    // Seed lokal dipakai oleh proses publikasi server, tidak sebagai fallback browser.
    getAll: function() {
      return this._cloudData.map(item => ({ ...item }));
    },

    // 2. Simpan snapshot aktif hanya di memori. Cache BBM lama dihapus agar
    // tidak dapat dipakai kembali ketika Firestore tidak tersedia.
    saveLocal: function(outlets) {
      const valid = Array.isArray(outlets) && outlets.every(item => item.dataVersion === REQUIRED_DATA_VERSION);
      this._cloudData = valid ? outlets.map(item => ({ ...item })) : [];
      this._cloudReady = valid;
      try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(VERSION_KEY); } catch (_) {}
    },

    // 2b. Validasi & Sanitasi Data Penyalur BBM
    validateOutletData: function(data) {
      if (!data.nama || !data.nama.trim()) {
        throw new Error('Nama outlet penyalur BBM wajib diisi.');
      }
      if (!data.kode || !data.kode.trim()) {
        throw new Error('Kode resmi penyalur BBM wajib diisi.');
      }
      const latitude = Number(data.lat), longitude = Number(data.lng);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -4.35 || latitude > -3.10 || longitude < 119.05 || longitude > 120.20) {
        throw new Error('Koordinat penyalur BBM tidak valid atau berada di luar Kabupaten Pinrang.');
      }

      // Foto harus berupa URL/path. Base64 membuat localStorage dan dokumen
      // Firestore membengkak serta dapat membekukan main thread saat serialisasi.
      if (data.foto && typeof data.foto === 'string') {
        if (data.foto.startsWith('data:image')) {
          throw new Error('Foto Base64 tidak didukung pada data Penyalur BBM. Unggah foto ke penyimpanan media lalu masukkan URL-nya.');
        }
        if (data.foto.length > 2048) {
          throw new Error('Tautan foto terlalu panjang. Gunakan URL gambar yang valid (maksimal 2.048 karakter).');
        }
      }
    },

    // 3. Ambil titik berdasarkan ID
    getById: function(id) {
      const all = this.getAll();
      return all.find(item => item.id === id || item.kode === id) || null;
    },

    // 4. Perbarui data titik penyalur BBM (Dipanggil dari CMS)
    updateOutlet: async function(id, patchData) {
      this.validateOutletData(patchData);

      const all = this.getAll();
      const idx = all.findIndex(item => item.id === id || item.kode === id);
      if (idx === -1) {
        throw new Error(`Outlet BBM dengan ID/Kode ${id} tidak ditemukan.`);
      }

      const existing = all[idx];
      const updated = {
        ...existing,
        ...patchData,
        dataVersion: REQUIRED_DATA_VERSION,
        updated_at: new Date().toISOString()
      };

      // Perbarui badge & warna bila kategori berubah
      if (patchData.kategori_code) {
        if (patchData.kategori_code === 'spbu_reguler') {
          updated.jenis_resmi = 'SPBU Reguler';
          updated.kategori_badge = 'SPBU Reguler';
          updated.badge_color = '#DC2626';
        } else if (patchData.kategori_code === 'spbu_kompak') {
          updated.jenis_resmi = 'SPBU Kompak / Seri 76';
          updated.kategori_badge = 'SPBU Kompak / APMS';
          updated.badge_color = '#0284C7';
        } else if (patchData.kategori_code === 'pertashop') {
          updated.jenis_resmi = 'Pertashop';
          updated.kategori_badge = 'Pertashop Resmi';
          updated.badge_color = '#16A34A';
        } else if (patchData.kategori_code === 'spbun') {
          updated.jenis_resmi = 'SPBUN / Nelayan';
          updated.kategori_badge = 'SPBUN Nelayan';
          updated.badge_color = '#7C3AED';
        }
      }

      const syncResult = await this.syncToCloud(updated);
      if (!syncResult.success) throw new Error(syncResult.error || 'Firestore tidak tersedia; perubahan BBM tidak disimpan.');
      all[idx] = updated;
      this.saveLocal(all);
      this.logAudit('EDIT_OUTLET', `Memperbarui data ${updated.nama} (${updated.kode})`);

      return { updated, syncResult };
    },

    // 5. Tambah titik penyalur baru
    addOutlet: async function(outletData) {
      this.validateOutletData(outletData);

      const all = this.getAll();
      const newId = outletData.id || `bbm_${Date.now()}`;
      
      const newOutlet = {
        ...outletData,
        id: newId,
        dataVersion: REQUIRED_DATA_VERSION,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const syncResult = await this.syncToCloud(newOutlet);
      if (!syncResult.success) throw new Error(syncResult.error || 'Firestore tidak tersedia; penyalur BBM tidak ditambahkan.');
      all.unshift(newOutlet);
      this.saveLocal(all);
      this.logAudit('ADD_OUTLET', `Menambahkan outlet baru ${newOutlet.nama} (${newOutlet.kode})`);

      return { newOutlet, syncResult };
    },

    // 6. Hapus outlet (soft delete di Firestore + audit trail server-side)
    deleteOutlet: async function(id) {
      const all = this.getAll();
      const target = all.find(item => item.id === id || item.kode === id);
      if (!target) return false;

      if (typeof db !== 'undefined' && db !== null) {
        try {
          const serverTime = (window.firebase && firebase.firestore && firebase.firestore.FieldValue)
            ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Koneksi Firestore Timeout')), 6000)
          );
          // Tulis audit log ke Firestore SEBELUM delete agar jejak tersimpan.
          const auditRef = db.collection('bbm_audit_logs').doc();
          await Promise.race([
            db.batch()
              .set(auditRef, {
                action: 'DELETE_OUTLET',
                outletId: target.id || id,
                outletKode: target.kode || id,
                outletNama: target.nama || '-',
                actorUid: (window.firebase && firebase.auth && firebase.auth().currentUser)
                  ? firebase.auth().currentUser.uid : null,
                createdAt: serverTime
              })
              .delete(db.collection('bbm_outlets').doc(id))
              .commit(),
            timeoutPromise
          ]);
        } catch (e) {
          console.warn('[BbmEngine] Gagal menghapus dari Firestore:', e);
          return false;
        }
      }

      // Perbarui cache lokal setelah Firestore berhasil.
      const filtered = all.filter(item => item.id !== id && item.kode !== id);
      this.saveLocal(filtered);
      if (this._cloudReady) {
        this._cloudData = filtered;
      }
      this.logAudit('DELETE_OUTLET', `Menghapus outlet ${target.nama} (${target.kode})`);
      return true;
    },

    // 7. Sinkronisasi ke Cloud Firestore dengan Timeout
    syncToCloud: async function(outlet) {
      if (typeof db !== 'undefined' && db !== null) {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Sinkronisasi Firestore Timeout')), 6000)
          );
          await Promise.race([
            db.collection('bbm_outlets').doc(outlet.id).set({ ...outlet, dataVersion: REQUIRED_DATA_VERSION }, { merge: true }),
            timeoutPromise
          ]);
          console.log('[BbmEngine] Sinkronisasi Cloud Firestore Berhasil:', outlet.id);
          return { success: true };
        } catch (e) {
          console.warn('[BbmEngine] Sinkronisasi Cloud Firestore Ditunda/Gagal:', e.message);
          return { success: false, error: e.message };
        }
      }
      return { success: false, offline: true };
    },

    // 8. Hitung Statistik Ringkas
    getStats: function(outlets) {
      const list = Array.isArray(outlets) ? outlets : this.getAll();
      const stats = {
        total: list.length,
        spbu_reguler: 0,
        spbu_kompak: 0,
        pertashop: 0,
        spbun: 0,
        beroperasi: 0,
        pemeliharaan: 0,
        tidak_beroperasi: 0,
        kecamatanMap: {}
      };

      list.forEach(item => {
        const kat = item.kategori_code || 'spbu_reguler';
        if (stats[kat] !== undefined) {
          stats[kat]++;
        } else {
          stats[kat] = 1;
        }

        const st = (item.status_operasi || 'Beroperasi').toLowerCase();
        if (st.includes('operasi') || st === 'aktif') {
          stats.beroperasi++;
        } else if (st.includes('pelihara') || st.includes('maintenance')) {
          stats.pemeliharaan++;
        } else {
          stats.tidak_beroperasi++;
        }

        const kec = item.kecamatan || 'Lainnya';
        stats.kecamatanMap[kec] = (stats.kecamatanMap[kec] || 0) + 1;
      });

      return stats;
    },

    // 9. Filter data penyalur BBM multi-parameter
    filter: function(criteria = {}) {
      let results = this.getAll();

      if (criteria.search) {
        const q = criteria.search.toLowerCase().trim();
        results = results.filter(item => {
          return (
            (item.nama && item.nama.toLowerCase().includes(q)) ||
            (item.kode && item.kode.toLowerCase().includes(q)) ||
            (item.badan_usaha && item.badan_usaha.toLowerCase().includes(q)) ||
            (item.alamat_terkini && item.alamat_terkini.toLowerCase().includes(q)) ||
            (item.alamat_resmi && item.alamat_resmi.toLowerCase().includes(q)) ||
            (item.desa && item.desa.toLowerCase().includes(q)) ||
            (item.kecamatan && item.kecamatan.toLowerCase().includes(q))
          );
        });
      }

      if (criteria.kategori && criteria.kategori !== 'all') {
        results = results.filter(item => item.kategori_code === criteria.kategori);
      }

      if (criteria.kecamatan && criteria.kecamatan !== 'all') {
        const kec = criteria.kecamatan.toLowerCase().trim();
        results = results.filter(item => (item.kecamatan || '').toLowerCase().trim() === kec);
      }

      if (criteria.status && criteria.status !== 'all') {
        results = results.filter(item => item.status_operasi === criteria.status);
      }

      if (criteria.produk && criteria.produk !== 'all') {
        const p = criteria.produk.toLowerCase();
        results = results.filter(item => {
          const prods = Array.isArray(item.produk) ? item.produk : [];
          return prods.some(prod => prod.toLowerCase().includes(p));
        });
      }

      return results;
    },

    // 10. Audit Logging — localStorage untuk tampilan UI lokal,
    // Firestore (bbm_audit_logs) untuk jejak permanen server-side.
    logAudit: function(action, desc) {
      // Simpan ke localStorage untuk riwayat UI lokal.
      try {
        const logs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
        logs.unshift({
          action: action,
          description: desc,
          timestamp: new Date().toISOString()
        });
        if (logs.length > 50) logs.pop();
        localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
      } catch (e) { /* ignore */ }
      // Coba simpan ke Firestore sebagai audit trail permanen.
      if (typeof db !== 'undefined' && db !== null) {
        try {
          const serverTime = (window.firebase && firebase.firestore && firebase.firestore.FieldValue)
            ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString();
          db.collection('bbm_audit_logs').add({
            action: action,
            description: desc,
            actorUid: (window.firebase && firebase.auth && firebase.auth().currentUser)
              ? firebase.auth().currentUser.uid : null,
            createdAt: serverTime
          }).catch(e => console.warn('[BbmEngine] Gagal menulis audit log Firestore:', e.code || e.message));
        } catch (e) { /* ignore jika Firestore tidak tersedia */ }
      }
    },

    // 11. Inisialisasi Sinkronisasi Real-Time Firestore
    initRealtimeSync: function(callback) {
      if (typeof db !== 'undefined' && db !== null) {
        try {
          return db.collection('bbm_outlets').onSnapshot(snapshot => {
            if (!snapshot.empty) {
              const cloudList = [];
              snapshot.forEach(doc => {
                cloudList.push({ id: doc.id, ...doc.data() });
              });
              if (cloudList.some(item => item.dataVersion !== REQUIRED_DATA_VERSION)) {
                console.warn('[BbmEngine] Snapshot cloud lama ditolak agar tidak menimpa master baru.');
                this.saveLocal([]);
                if (typeof callback === 'function') callback([]);
                return;
              }
              
              // Firestore adalah master kanonis. Cache lokal hanya digunakan
              // bila cloud tidak dapat dibaca, bukan dicampur ke hasil cloud.
              const merged = cloudList;
              this.saveLocal(merged);
              
              if (typeof callback === 'function') {
                callback(merged);
              }
            } else {
              this.saveLocal([]);
              if (typeof callback === 'function') callback([]);
            }
          }, err => {
            console.warn('[BbmEngine] Firestore Realtime Sync Error:', err);
            this.saveLocal([]);
            if (typeof callback === 'function') callback([]);
          });
        } catch (e) {
          console.warn('[BbmEngine] Firestore init error:', e);
        }
      } else return false;
      return null;
    },

    // Halaman publik cukup mengambil perubahan cloud satu kali. Koneksi
    // realtime yang terus hidup tidak diperlukan untuk sebuah direktori statis.
    loadPublicCloudOnce: async function(callback) {
      const endpoint = 'https://firestore.googleapis.com/v1/projects/disperindagesdm-pinrang/databases/(default)/documents/bbm_outlets?pageSize=100';
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = setTimeout(() => { if (controller) controller.abort(); }, 7000);
      const decode = value => {
        if (!value || typeof value !== 'object') return null;
        if ('stringValue' in value) return value.stringValue;
        if ('integerValue' in value) return Number(value.integerValue);
        if ('doubleValue' in value) return Number(value.doubleValue);
        if ('booleanValue' in value) return value.booleanValue;
        if ('nullValue' in value) return null;
        if (value.arrayValue) return (value.arrayValue.values || []).map(decode);
        if (value.mapValue) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, entry]) => [key, decode(entry)]));
        return null;
      };
      try {
        const response = await fetch(endpoint, { signal: controller?.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const cloud = (payload.documents || []).map(doc => ({
          id: doc.name.split('/').pop(),
          ...Object.fromEntries(Object.entries(doc.fields || {}).map(([key, value]) => [key, decode(value)]))
        })).map(item => ({
          ...item,
          // Beberapa dokumen lama masih menunjuk placeholder JPG yang tidak
          // pernah tersedia. Gunakan aset SVG resmi agar tidak memicu 404.
          foto: /^assets\/brand\/(spbun|spbu_reguler|spbu_kompak|pertashop)_default\.jpg$/i.test(item.foto || '')
            ? String(item.foto).replace(/\.jpg$/i, '.svg')
            : item.foto
        }));
        if (cloud.length) {
          if (cloud.some(item => item.dataVersion !== REQUIRED_DATA_VERSION)) throw new Error('Versi master BBM cloud belum kanonis');
          this.saveLocal(cloud);
          if (typeof callback === 'function') callback(cloud);
          return cloud;
        }
      } catch (error) {
        console.warn('[BbmEngine] Sinkronisasi publik satu kali dilewati:', error.name === 'AbortError' ? 'timeout' : error.message);
      } finally { clearTimeout(timer); }
      this.saveLocal([]);
      if (typeof callback === 'function') callback([]);
      return [];
    }
  };

  window.BbmEngine = BbmEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BbmEngine;
  }
})(typeof window !== 'undefined' ? window : this);
