(function (window) {
  'use strict';

  const DATA_VERSION = '2026-08-31-market-single-source-v3';
  const PINRANG_BOUNDS = { south: -4.18, north: -3.25, west: 119.25, east: 120.05 };

  function validCoordinate(lat, lng) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    return Number.isFinite(latitude) && Number.isFinite(longitude) &&
      latitude >= PINRANG_BOUNDS.south && latitude <= PINRANG_BOUNDS.north &&
      longitude >= PINRANG_BOUNDS.west && longitude <= PINRANG_BOUNDS.east;
  }

  function normalizeMarket(id, source) {
    const item = { ...(source || {}), id };
    item.nama = String(item.nama || item.name || '').trim();
    item.kecamatan = String(item.kecamatan || item.district || '').trim();
    item.desaKelurahan = String(item.desaKelurahan || item.village || '').trim();
    item.alamat = String(item.alamat || item.address || '').trim();
    item.slug = String(item.slug || id).trim();
    item.deskripsi = String(item.deskripsi || item.description || '').trim();
    item.fotoUtama = String(item.fotoUtama || item.image || '').trim();

    const rawStatus = String(item.statusOperasional || item.status || 'perlu-verifikasi').toLowerCase();
    item.statusOperasional = rawStatus === 'aktif' || rawStatus === 'active'
      ? 'aktif'
      : rawStatus === 'tidak-aktif' || rawStatus === 'inactive'
        ? 'tidak-aktif'
        : 'perlu-verifikasi';
    item.statusLabel = item.statusLabel || (
      item.statusOperasional === 'aktif' ? 'Aktif' :
      item.statusOperasional === 'tidak-aktif' ? 'Tidak Aktif' : 'Perlu Verifikasi'
    );

    if (!validCoordinate(item.latitude, item.longitude)) {
      item.latitude = null;
      item.longitude = null;
      item.statusKoordinat = 'PERLU_VERIFIKASI';
    }
    return item;
  }

  const MarketEngine = {
    _cloudData: [],
    _cloudReady: false,

    getAll() {
      return this._cloudData.map(item => ({ ...item }));
    },

    setCloudData(items) {
      this._cloudData = Array.isArray(items) ? items.map(item => ({ ...item })) : [];
      this._cloudReady = true;
      try {
        localStorage.removeItem('disperindag_markets_directory');
        localStorage.removeItem('disperindag_markets_directory_version');
      } catch (_) {}
    },

    getById(id) {
      return this.getAll().find(item => item.id === id || item.slug === id) || null;
    },

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
      const saved = { ...item, updatedAt: new Date().toISOString(), updatedBy: item.updatedBy || 'cms' };
      const cloud = await this.syncToCloud(saved);
      if (!cloud.success) throw new Error(cloud.error || 'Firestore tidak tersedia; data pasar tidak disimpan.');
      return { item: saved, cloud };
    },

    async syncToCloud(item) {
      if (typeof db === 'undefined' || !db) return { success: false, error: 'Firestore tidak tersedia.' };
      try {
        const serverTime = window.firebase && firebase.firestore && firebase.firestore.FieldValue
          ? firebase.firestore.FieldValue.serverTimestamp() : item.updatedAt;
        const payload = { ...item, updatedAt: serverTime, updated_at: serverTime };
        await Promise.race([
          db.collection('markets').doc(item.id).set(payload, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout sinkronisasi pasar')), 7000))
        ]);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },

    initRealtimeSync(callback) {
      if (typeof db === 'undefined' || !db) {
        this.setCloudData([]);
        if (callback) callback([]);
        return null;
      }
      return db.collection('markets').onSnapshot(snapshot => {
        const normalized = [];
        snapshot.forEach(doc => {
          const item = normalizeMarket(doc.id, doc.data());
          if (item.nama && item.kecamatan) normalized.push(item);
          else console.warn('[MarketEngine] Dokumen tidak lengkap dan tidak ditayangkan:', doc.id);
        });
        this.setCloudData(normalized);
        if (callback) callback(this.getAll());
      }, error => {
        this.setCloudData([]);
        if (callback) callback([]);
        console.warn('[MarketEngine] Firestore tidak tersedia; tidak ada fallback:', error.code || error.message);
      });
    },

    validCoordinate,
    normalizeMarket,
    PINRANG_BOUNDS,
    DATA_VERSION
  };

  window.MarketEngine = MarketEngine;
})(window);
