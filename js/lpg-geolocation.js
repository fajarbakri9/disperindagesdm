(function () {
  'use strict';
  function errorMessage(error) {
    if (error?.code === 1) return 'Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini, lalu coba kembali.';
    if (error?.code === 3) return 'Lokasi belum berhasil diperoleh karena waktu permintaan habis. Coba kembali di area terbuka.';
    return 'Lokasi belum berhasil diperoleh. Pastikan GPS perangkat aktif dan Anda berada di lokasi yang benar.';
  }
  function capture() {
    if (!navigator.geolocation) return Promise.reject(Object.assign(new Error('Perangkat tidak mendukung layanan lokasi.'),{code:'unsupported'}));
    return new Promise((resolve,reject) => navigator.geolocation.getCurrentPosition(position => {
      const value={latitude:position.coords.latitude,longitude:position.coords.longitude,accuracyM:position.coords.accuracy,capturedAt:new Date()};
      if (!Number.isFinite(value.accuracyM) || value.accuracyM > 50) return reject(Object.assign(new Error(`Akurasi GPS ${Math.round(value.accuracyM || 0)} meter terlalu rendah. Coba kembali di area terbuka.`),{code:'low-accuracy',location:value}));
      resolve(value);
    },error=>reject(Object.assign(new Error(errorMessage(error)),{code:error.code})),{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
  }
  function quality(accuracy) { return accuracy<=25?'Akurasi tinggi':'Akurasi cukup'; }
  window.LpgGeolocation={capture,quality,errorMessage};
})();
