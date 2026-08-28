/**
 * UTILITY KOMPRESI GAMBAR OTOMATIS BERBASIS CLIENT-SIDE (HTML5 Canvas & WebP)
 * Memungkinkan upload gambar 100% gratis tanpa butuh Cloud Storage berbayar.
 * Gambar 5MB-10MB otomatis di-convert menjadi WebP super ringan (30-60 KB).
 */

class ImageCompressor {
  /**
   * Kompres file gambar ke format WebP Base64
   * @param {File} file - Berkas gambar asli dari input file
   * @param {Object} options - Opsi maxWidth, maxHeight, quality
   * @returns {Promise<{base64: string, originalSize: number, compressedSize: number, savingPercent: string}>}
   */
  static async compress(file, options = {}) {
    const maxWidth = options.maxWidth || 960;
    const maxHeight = options.maxHeight || 640;
    const quality = options.quality !== undefined ? options.quality : 0.78; // Kualitas kompresi WebP 78%

    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('File yang dipilih bukan berkas gambar valid.'));
        return;
      }

      const originalSize = file.size;
      const reader = new FileReader();

      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
          // Hitung dimensi proporsional
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }

          // Buat Canvas untuk me-render gambar
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          // Gambar dengan interpolation halus
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Ekspor ke WebP Data URL (Base64)
          let base64 = canvas.toDataURL('image/webp', quality);
          
          // Fallback jika browser lawas tidak dukung webp
          if (!base64.startsWith('data:image/webp')) {
            base64 = canvas.toDataURL('image/jpeg', quality);
          }

          // Hitung estimasi ukuran Base64 dalam bytes
          const compressedSize = Math.round((base64.length * 3) / 4);
          const saving = (((originalSize - compressedSize) / originalSize) * 100).toFixed(1);

          resolve({
            base64,
            originalSize,
            compressedSize,
            savingPercent: saving > 0 ? `${saving}%` : '0%',
            dimensions: { width, height }
          });
        };

        img.onerror = () => reject(new Error('Gagal memproses berkas gambar.'));
        img.src = readerEvent.target.result;
      };

      reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Format bytes ke ukuran yang mudah dibaca (KB / MB)
   */
  static formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  }
}

// Global Export
window.ImageCompressor = ImageCompressor;
