(function (window) {
  'use strict';
  const STORAGE_KEY = 'disperindag_markets_directory';
  const VERSION_KEY = 'disperindag_markets_directory_version';
  const DATA_VERSION = '2026-08-31-market-single-source-v3';
  const PINRANG_BOUNDS = { south: -4.18, north: -3.25, west: 119.25, east: 120.05 };
  const defaults = () => Array.isArray(window.PINRANG_ALL_MARKETS) ? window.PINRANG_ALL_MARKETS : [];
  const clone = value => JSON.parse(JSON.stringify(value));

  function validCoordinate(lat, lng) {
    const y=Number(lat), x=Number(lng);
    return Number.isFinite(y) && Number.isFinite(x) &&
      y >= PINRANG_BOUNDS.south && y <= PINRANG_BOUNDS.north &&
      x >= PINRANG_BOUNDS.west && x <= PINRANG_BOUNDS.east;
  }

  function hasCmsRevision(item) {
    return Boolean(item && item.updatedBy && item.updatedAt);
  }

  function reconcile(fallback, candidate) {
    if (!candidate) return clone(fallback);
    // Revisi CMS eksplisit (punya updatedBy) selalu menang atas seed.
    if (hasCmsRevision(candidate)) {
      const merged={...fallback,...candidate};
      if (!validCoordinate(merged.latitude,merged.longitude)) {
        merged.latitude=null; merged.longitude=null;
        merged.statusKoordinat='PERLU_VERIFIKASI';
      }
      return merged;
    }
    // Candidate tanpa updatedBy (cache localStorage lama / seed): bandingkan
    // timestamp. Fallback (seed/master) menang jika candidate tidak lebih baru.
    const candTs = candidate.updatedAt || candidate.updated_at || null;
    const fallTs = fallback.updatedAt || fallback.updated_at || null;
    if (candTs && fallTs && candTs > fallTs) {
      return {...fallback,...candidate};
    }
    return clone(fallback);
  }

  const MarketEngine = {
    // In-memory snapshot dari Firestore. Sumber tunggal yang dipakai oleh
    // semua fungsi setelah initRealtimeSync() berhasil. Tidak ada fallback
    // ke localStorage setelah snapshot cloud diterima.
    _cloudData: [],
    _cloudReady: false,

    getAll() {
      // 1. Snapshot Firestore sudah siap — gunakan langsung.
      if (this._cloudReady && this._cloudData.length > 0) {
        return this._cloudData.map(item => ({...item}));
      }
      // 2. Firestore belum siap (first paint saja): coba cache localStorage
      //    dengan versi yang cocok. Setelah initRealtimeSync() berhasil,
      //    _cloudReady = true dan jalur ini tidak akan dieksekusi lagi.
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        const version = localStorage.getItem(VERSION_KEY);
        if (Array.isArray(stored) && stored.length && version === DATA_VERSION) {
          const legacy = new Map(stored.map(item => [item.id, item]));
          return clone(defaults()).map(master => reconcile(master, legacy.get(master.id)));
        }
      } catch (error) { console.warn('[MarketEngine] Cache lokal tidak valid, diabaikan:', error); }
      // 3. Tidak ada cache valid: pakai seed statis.
      return clone(defaults());
    },

    saveLocal(items) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        localStorage.setItem(VERSION_KEY, DATA_VERSION);
      } catch (error) { console.warn('[MarketEngine] Gagal menyimpan cache lokal:', error); }
    },

    getById(id) { return this.getAll().find(item => item.id === id || item.slug === id) || null; },

    validate(item) {
      if (!String(item.nama || '').trim()) throw new Error('Nama pasar wajib diisi.');
      if (!String(item.kecamatan || '').trim()) throw new Error('Kecamatan wajib diisi.');
      if ((item.latitude !== null && item.latitude !== '') || (item.longitude !== null && item.longitude !== '')) {
        if (!validCoordinate(item.latitude, item.longitude)) throw new Error('Latitude/longitude tidak valid atau belum lengkap.');
      }
      if (String(item.fotoUtama || '').startsWith('data:image')) throw new Error('Foto Base64 tidak didukung. Gunakan URL atau path aset.');
    },

    async save(item) {
      this.validate(item);
      // Tulis ke Firestore; snapshot realtime memperbarui _cloudData otomatis.
      const saved={...item, updatedAt:new Date().toISOString(), updatedBy: item.updatedBy || 'cms'};
      const cloud=await this.syncToCloud(saved);
      return {item:saved, cloud};
    },

    async syncToCloud(item) {
      if (typeof db === 'undefined' || !db) return {success:false, offline:true};
      try {
        const serverTime=(window.firebase && firebase.firestore && firebase.firestore.FieldValue)
          ? firebase.firestore.FieldValue.serverTimestamp() : item.updatedAt;
        const payload={...item,updatedAt:serverTime,updated_at:serverTime};
        await Promise.race([
          db.collection('markets').doc(item.id).set(payload, {merge:true}),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout sinkronisasi pasar')), 7000))
        ]);
        return {success:true};
      } catch (error) { return {success:false, error:error.message}; }
    },

    initRealtimeSync(callback) {
      if (typeof db === 'undefined' || !db) return null;
      return db.collection('markets').onSnapshot(snapshot => {
        if (snapshot.empty) return;
        const merged=[];
        snapshot.forEach(doc => {
          const cloud={...doc.data(),id:doc.id};
          const fallback=defaults().find(item => item.id === doc.id) || {};
          merged.push(reconcile(fallback, cloud));
        });
        // Simpan snapshot kanonis ke memori — sumber tunggal sejak saat ini.
        // localStorage diperbarui hanya untuk mempercepat first-paint berikutnya.
        this._cloudData = merged;
        this._cloudReady = true;
        this.saveLocal(merged);
        if (callback) callback(merged);
      }, error => console.warn('[MarketEngine] Realtime sync:', error.code || error.message));
    },

    validCoordinate,
    PINRANG_BOUNDS,
    DATA_VERSION
  };
  window.MarketEngine=MarketEngine;
})(window);
