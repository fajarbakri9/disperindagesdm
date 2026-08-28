# PANDUAN PENGGUNAAN FIREBASE SPARK PLAN (100% GRATIS) & KOMPRESI OTOMATIS

Website dan CMS Disperindag ESDM Pinrang kini telah dilengkapi dengan **Arsitektur Firebase Spark Plan (Gratis dari Google)** dengan **Sistem Kompresi Gambar Otomatis (WebP)** di sisi browser.

---

## 🌟 Mengapa Solusi Ini 100% Gratis & Bebas Kartu Kredit?

1. **Tanpa Cloud Storage Berbayar:**
   * Foto berita resolusi tinggi dari kamera HP/DSLR (5 MB – 10 MB) secara otomatis dikompresi oleh sistem browser menjadi format **WebP super tajam (hanya 30–60 KB)**.
   * File WebP disimpan langsung sebagai *string data* ke dalam **Cloud Firestore**.
   * Anda menghemat **95% – 98% kuota penyimpanan**!
2. **Database Real-Time (Cloud Firestore):**
   * Memberikan kuota gratis **1 GB data** dan **50.000 baca/hari** (lebih dari cukup untuk portal daerah).
   * Update harga sembako di CMS admin langsung berubah secara *live real-time* di HP masyarakat tanpa perlu refresh halaman.
3. **Hosting Super Cepat (Google CDN):**
   * Memberikan kuota gratis **10 GB penyimpanan** dan **10 GB bandwidth bulanan**.

---

## 🚀 3 Menit Menghubungkan ke Akun Google Firebase Anda:

1. **Buka Firebase Console:**
   * Kunjungi [https://console.firebase.google.com](https://console.firebase.google.com) dan login dengan akun Google instansi dinas.
2. **Buat Project Baru:**
   * Klik **Add project** &rarr; Beri nama `disperindag-pinrang` &rarr; Pilih paket default **Spark Plan ($0/Free)**.
3. **Aktifkan Firestore Database:**
   * Di menu sidebar kiri: Pilih **Build** &rarr; **Firestore Database** &rarr; Klik **Create database**.
   * Pilih lokasi database: `asia-southeast2 (Jakarta)` atau `asia-southeast1 (Singapura)`.
   * Pada tab Security Rules, pilih *Start in test mode* (atau mode produksi).
4. **Salin Kredensial ke Website Anda:**
   * Buka *Project Settings (ikon gerigi di kiri atas)* &rarr; *General* &rarr; Scroll ke bawah pada bagian *Your apps* &rarr; Pilih ikon Web (`</>`).
   * Salin kode `firebaseConfig` dan tempelkan ke file:
     👉 **`d:\# DOWNLOAD\web_disperindagesdm_prototype\js\firebase-config.js`**

---

## 📸 Uji Coba Kompresi Gambar Otomatis di CMS:

1. Buka **[admin.html](file:///d:/%23%20DOWNLOAD/web_disperindagesdm_prototype/admin.html)** di browser Anda.
2. Masuk ke tab **"Publikasi Berita Dinas"**.
3. Coba pilih file foto apa saja dari komputer Anda di bagian *"📸 Unggah Foto Dokumentasi Kegiatan"*.
4. Sistem akan langsung menampilkan statistik kompresi instan:
   > *✓ Berhasil Dikompresi Otomatis! Ukuran Asli: 4.8 MB &rarr; Ukuran WebP: 42 KB (Hemat 97.5% kuota!)*
5. Klik **Publikasikan Berita**, dan artikel Anda langsung tersimpan dengan sangat ringan dan cepat!
