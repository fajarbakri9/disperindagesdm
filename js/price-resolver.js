/**
 * PRICE RESOLVER TERPUSAT - DISPERINDAG ESDM KABUPATEN PINRANG
 * Sesuai Arahan Teknis: Bagian 24-26 (Single Source of Truth & Controlled Local Override)
 * 
 * Prinsip:
 * 1. sourcePrice: Angka resmi SP2KP Kemendag (TIDAK BOLEH DITIMPA)
 * 2. displayPrice: Angka efektif yang ditampilkan ke publik/wallboard
 * 3. Jika ada override lokal aktif dan belum expired, gunakan overridePrice
 * 4. Jika normal, gunakan sourcePrice
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PriceResolver = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const PriceResolver = {
    /** Bentuk record kanonis untuk seluruh konsumen publik/operasional. */
    normalizeSp2kpItem(sourceItem) {
      const item = sourceItem || {};
      const resolved = this.resolveEffectivePrice(item, null);
      const delta = Number(resolved.delta || 0);
      return {
        id: item.variantId || item.id || 0,
        variantId: item.variantId || item.id || 0,
        commodity_name: item.commodityName || item.commodity_name || 'Komoditas',
        commodityName: item.commodityName || item.commodity_name || 'Komoditas',
        unit: item.unit || 'kg',
        price: resolved.sourcePrice,
        sourcePrice: resolved.sourcePrice,
        previous_price: Number(item.comparisonPrice || item.previousPrice || 0),
        comparisonPrice: Number(item.comparisonPrice || item.previousPrice || 0),
        delta,
        diff: delta,
        trend: delta > 0 ? 'up' : (delta < 0 ? 'down' : 'stable'),
        changeStatus: delta > 0 ? 'Naik' : (delta < 0 ? 'Turun' : 'Tetap'),
        changePercent: Number(item.changePercent || 0),
        dataDate: item.dataDate || null,
        comparisonDate: item.comparisonDate || null,
        syncedAt: item.syncedAt || null,
        source: 'SP2KP Kemendag RI',
        priceSource: 'SP2KP'
      };
    },
    /**
     * Memeriksa apakah suatu override lokal masih aktif dan valid
     * @param {Object} overrideObj - Dokumen override dari koleksi price_overrides
     * @returns {boolean}
     */
    isOverrideActive(overrideObj) {
      if (!overrideObj || typeof overrideObj !== 'object') return false;
      if (overrideObj.status !== 'active') return false;

      const price = Number(overrideObj.overridePrice);
      if (!Number.isFinite(price) || price <= 0) return false;

      if (overrideObj.expiresAt) {
        const expTime = new Date(overrideObj.expiresAt).getTime();
        if (Number.isFinite(expTime) && Date.now() > expTime) {
          return false; // Override telah kadaluarsa
        }
      }

      return true;
    },

    /**
     * Mengkalkulasi harga efektif tunggal dari data SP2KP dan Override
     * @param {Object} sourceItem - Item komoditas dari market_prices_latest
     * @param {Object} activeOverride - Item override dari price_overrides (opsional)
     * @returns {Object} Hasil resolusi terstandarisasi
     */
    resolveEffectivePrice(sourceItem, activeOverride) {
      if (!sourceItem) {
        return {
          variantId: 0,
          commodityName: 'Tidak Diketahui',
          unit: 'kg',
          sourcePrice: 0,
          displayPrice: 0,
          effectivePrice: 0,
          displayFormatted: 'Belum Tersedia',
          effectiveFormatted: 'Belum Tersedia',
          sourceFormatted: 'Belum Tersedia',
          hasValidPrice: false,
          isDataAvailable: false,
          hasOverride: false,
          isOverridden: false,
          priceSource: 'UNKNOWN',
          sourceLabel: 'Data Tidak Tersedia',
          reason: null,
          dataDate: null,
          delta: 0,
          diff: 0,
          changePercent: 0,
          changeStatus: 'Tidak Berubah',
          trend: 'stable'
        };
      }

      const rawSource = Number(sourceItem.sourcePrice || sourceItem.price || 0);
      const hasValidSource = Number.isFinite(rawSource) && rawSource > 0;
      // Override hanya boleh mengoreksi harga resmi yang benar-benar tersedia;
      // ia tidak boleh menjadi sumber pengganti ketika SP2KP kosong/gagal.
      const overrideValid = hasValidSource && this.isOverrideActive(activeOverride);

      const diffVal = Number(sourceItem.diff || sourceItem.delta || 0);
      const trendVal = sourceItem.trend || (diffVal > 0 ? 'up' : (diffVal < 0 ? 'down' : 'stable'));

      if (overrideValid) {
        const overrideVal = Number(activeOverride.overridePrice);
        const effectiveFmt = this.formatRupiah(overrideVal);
        return {
          variantId: sourceItem.variantId || activeOverride.variantId || sourceItem.id || 0,
          commodityName: sourceItem.commodityName || activeOverride.commodityName || sourceItem.commodity_name || 'Komoditas',
          unit: sourceItem.unit || activeOverride.unit || 'kg',
          sourcePrice: hasValidSource ? rawSource : 0,
          displayPrice: overrideVal,
          effectivePrice: overrideVal,
          displayFormatted: effectiveFmt,
          effectiveFormatted: effectiveFmt,
          sourceFormatted: this.formatRupiah(rawSource),
          hasValidPrice: true,
          isDataAvailable: true,
          hasOverride: true,
          isOverridden: true,
          priceSource: 'LOCAL_OVERRIDE',
          sourceLabel: 'Penyesuaian verifikasi Disperindag ESDM Pinrang',
          reason: activeOverride.reason || 'Koreksi operasional terverifikasi',
          dataDate: sourceItem.dataDate || activeOverride.effectiveFrom || null,
          delta: diffVal,
          diff: diffVal,
          changePercent: Number(sourceItem.changePercent || 0),
          changeStatus: sourceItem.changeStatus || 'Disesuaikan',
          trend: trendVal
        };
      }

      const effectivePrice = hasValidSource ? rawSource : 0;
      const effectiveFmt = this.formatRupiah(effectivePrice);
      return {
        variantId: sourceItem.variantId || sourceItem.id || 0,
        commodityName: sourceItem.commodityName || sourceItem.commodity_name || 'Komoditas',
        unit: sourceItem.unit || 'kg',
        sourcePrice: effectivePrice,
        displayPrice: effectivePrice,
        effectivePrice: effectivePrice,
        displayFormatted: effectiveFmt,
        effectiveFormatted: effectiveFmt,
        sourceFormatted: effectiveFmt,
        hasValidPrice: hasValidSource,
        isDataAvailable: hasValidSource,
        hasOverride: false,
        isOverridden: false,
        priceSource: 'SP2KP',
        sourceLabel: 'SP2KP Kementerian Perdagangan RI',
        reason: null,
        dataDate: sourceItem.dataDate || null,
        delta: diffVal,
        diff: diffVal,
        changePercent: Number(sourceItem.changePercent || 0),
        changeStatus: sourceItem.changeStatus || 'Tidak Berubah',
        trend: trendVal
      };
    },

    /**
     * Format tampilan harga ke Rupiah
     * @param {number} num
     * @returns {string} Contoh: 'Rp 13.300' atau 'Belum Tersedia'
     */
    formatRupiah(num) {
      if (!Number.isFinite(num) || num <= 0) {
        return 'Belum Tersedia';
      }
      return 'Rp ' + Math.round(num).toLocaleString('id-ID');
    }
  };

  return PriceResolver;
}));
