# 📘 Buku Panduan Penggunaan & Dokumentasi Sistem Terpadu
## Portal Resmi, Layanan Publik, dan Command Center TV Wallboard
### Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang

---

## 🏛️ Kata Pengantar & Ringkasan Eksekutif

Portal Web Terpadu **Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral (Disperindag ESDM) Kabupaten Pinrang** dirancang dan dibangun sebagai wujud implementasi Sistem Pemerintahan Berbasis Elektronik (SPBE), prinsip keterbukaan informasi publik (UU No. 14 Tahun 2008), serta digitalisasi pemantauan stabilitas ekonomi daerah.

Sistem ini menggabungkan 3 (tiga) pilar utama pelayanan:
1. **Portal Informasi & Pelayanan Publik:** Menyajikan data harga pangan harian, standar operasional prosedur (SOP) layanan tera metrologi, pengawasan LPG 3 kg, pembinaan industri kecil menengah (IKM), dan perizinan.
2. **Kanal Transparansi & Pengaduan Terintegrasi:** Memuat repositori regulasi hukum resmi (terhubung langsung ke JDIH BPK RI), PPID Pelaksana, dan kanal SP4N-LAPOR!.
3. **Command Center & TV Wallboard Eksekutif:** Layar pantauan digital (*real-time monitoring*) untuk pimpinan daerah (Bupati, Kadis, Sekdis) yang menyajikan indikator inflasi, kepatuhan tera SPBU, kuota gas subsidi di 12 kecamatan, dan indeks kepuasan masyarakat.

---

## 🔐 Status Sinkronisasi & Otorisasi Backend (Firebase Cloud)

Website ini telah terintegrasi secara penuh dengan ekosistem **Google Cloud Firebase**:
* **Firebase Authentication & RBAC (Role-Based Access Control):** Membatasi hak akses akun sesuai hierarki tugas kedinasan (Super Admin/Kadis, Admin Sekretariat/PPID, Editor Perdagangan/Pasar, Editor ESDM & Industri, serta Petugas UML Metrologi).
* **Cloud Firestore Real-Time Database:** Seluruh pembaruan data harga sembako, kuota gas, laporan aduan, dan metrik TV Command Center tersinkronisasi secara langsung (*real-time listener `onSnapshot`*) ke seluruh perangkat tanpa perlu memuat ulang halaman.
* **Aturan Keamanan Database (`firestore.rules`):** Telah diuji dan dirilis dengan aturan keamanan yang membatasi hak pengubahan hanya untuk staf berwenang yang sah.
* **Proteksi Keamanan Server (*Enterprise Security Headers*):** Melindungi pengunjung dari ancaman *malware*, *Cross-Site Scripting (XSS)*, dan *Clickjacking*.

---

## 📸 Dokumentasi Visual & Panduan Halaman per Halaman

---

### 1. Halaman Beranda Utama (*Landing Page*)
* 🔗 **Alamat Akses:** [https://disperindagesdm-pinrang.web.app/](https://disperindagesdm-pinrang.web.app/)

![Tangkapan Layar Beranda Utama](/C:/Users/ASUS/.gemini/antigravity-ide/brain/a5e64a57-6c67-48e0-8fa3-08ca876d19be/beranda_page_1787763164646.png)

#### 🌟 Bagian & Fungsi Utama:
1. **Bilah Atas (Topbar & Jam WITA Live):** Menampilkan waktu resmi Indonesia Tengah (*WITA*), prakiraan cuaca live Kabupaten Pinrang, bilah pencarian cerdas, dan gerbang **Portal Pegawai ASN**.
2. **Bilah Ticker Berjalan (*Running Ticker*):** Mengabarkan ringkasan fluktuasi harga komoditas pasar secara dinamis layaknya bursa komoditas.
3. **Hero Banner & Profil Pimpinan Kedinasan:** Menampilkan dokumentasi kegiatan resmi Dinas dan kutipan komitmen pelayanan Kepala Dinas Perindag ESDM Pinrang.
4. **Bursa Harga Kebutuhan Pokok Harian (Bapokting):** Tabel harga 12 komoditas pangan dengan indikator tren naik (merah), turun (hijau), atau stabil (kuning).
5. **Direktori 6 Layanan Unggulan:** Akses cepat ke Tera UTTP, Pengawasan LPG 3 Kg, Sertifikasi Halal/TKDN IKM, Data Pasar, dan Pengaduan.
6. **Etalase Produk IKM Unggulan:** Memperkenalkan kain sutra tenun Lasinrang, kopi robusta Lembang, anyaman serat alam, dan olahan bandeng khas Pinrang.
7. **Warta & Publikasi Kegiatan:** Berita resmi, rilis media, dan siaran pers kegiatan kedinasan.
8. **Formulir Pengaduan Masyarakat (SP4N-LAPOR!):** Formulir penyampaian aspirasi masyarakat yang menghasilkan nomor tiket resmi terlacak.
9. **Footer Terpadu:** Berisi alamat kantor resmi Jalan Bintang No. 1 Pinrang, nomor WhatsApp Hotline, peta lokasi Google Maps, dan tautan resmi.

---

### 2. Halaman Profil & Tugas Pokok Fungsi (Tupoksi)
* 🔗 **Alamat Akses:** [https://disperindagesdm-pinrang.web.app/profil](https://disperindagesdm-pinrang.web.app/profil)

![Tangkapan Layar Profil & Struktur Organisasi](/C:/Users/ASUS/.gemini/antigravity-ide/brain/a5e64a57-6c67-48e0-8fa3-08ca876d19be/profil_page_1787763189025.png)

#### 🌟 Bagian & Fungsi Utama:
1. **Dasar Hukum Kelembagaan:** Mengacu pada **Peraturan Bupati Pinrang Nomor 35 Tahun 2023** tentang Kedudukan, Susunan Organisasi, Tugas dan Fungsi serta Tata Kerja Disperindag ESDM.
2. **Visi, Misi, dan Nilai Dasar ASN (BerAKHLAK):** Panduan etika kerja ASN Dinas Perindag ESDM Pinrang.
3. **Bagan Pohon Struktur Organisasi Lengkap:** Menampilkan hierarki mulai dari Kepala Dinas, Sekretaris Dinas, Subbagian Program & Keuangan, Subbagian Umum & Kepegawaian, hingga 3 Bidang Teknis (Bidang Pengembangan Perdagangan, Bidang Kemetrologian, dan Bidang Perindustrian, Energi dan SDM) beserta Pejabat Fungsional.
4. **Profil Pejabat Struktural:** Nama lengkap, gelar, NIP, pangkat/golongan, dan uraian tupoksi masing-masing unit kerja.

---

### 3. Halaman Standar Layanan Publik & SOP
* 🔗 **Alamat Akses:** [https://disperindagesdm-pinrang.web.app/layanan](https://disperindagesdm-pinrang.web.app/layanan)

![Tangkapan Layar Standar Layanan Publik](/C:/Users/ASUS/.gemini/antigravity-ide/brain/a5e64a57-6c67-48e0-8fa3-08ca876d19be/layanan_page_1787763203856.png)

#### 🌟 Bagian & Fungsi Utama:
1. **Katalog Standar Operasional Prosedur (SOP):** Memberikan transparansi alur permohonan tera timbangan pedagang, tera nozzle SPBU, rekomendasi sertifikasi halal IKM, pendaftaran SIINas, izin sewa kios pasar, hingga rekomendasi pangkalan gas.
2. **Persyaratan Berkas & Waktu Penyelesaian:** Rincian dokumen yang wajib disiapkan pemohon serta estimasi waktu penerbitan sertifikat/rekomendasi.
3. **Simulasi Tarif Retribusi Resmi:** Mengacu pada **Perda Pinrang Nomor 1 Tahun 2024**, memastikan tidak ada pungutan liar (pungli) di lapangan.

---

### 4. Halaman PPID Pelaksana (Keterbukaan Informasi Publik)
* 🔗 **Alamat Akses:** [https://disperindagesdm-pinrang.web.app/ppid](https://disperindagesdm-pinrang.web.app/ppid)

![Tangkapan Layar Portal PPID Pelaksana](/C:/Users/ASUS/.gemini/antigravity-ide/brain/a5e64a57-6c67-48e0-8fa3-08ca876d19be/ppid_page_1787763216151.png)

#### 🌟 Bagian & Fungsi Utama:
1. **Struktur Pejabat Pengelola Informasi dan Dokumentasi (PPID):** Penanggung jawab transparansi informasi kedinasan.
2. **Kategori Informasi Publik (UU KIP No. 14/2008):**
   * *Informasi Berkala:* Renja, Renstra, LKjIP, Laporan Keuangan, Realisasi APBD.
   * *Informasi Setiap Saat:* SOP Layanan, Daftar Regulasi, Data Statistik IKM & Pasar.
   * *Informasi Serta Merta:* Imbauan stabilitas harga menjelang HBKN (Hari Besar Keagamaan Nasional), penertiban LPG.
3. **Formulir Permohonan Informasi Online:** Masyarakat dan akademisi dapat mengajukan permohonan data publik secara resmi dan mendapatkan bukti tanda terima digital.

---

### 5. Halaman Repositori Dokumen & Regulasi Hukum
* 🔗 **Alamat Akses:** [https://disperindagesdm-pinrang.web.app/dokumen](https://disperindagesdm-pinrang.web.app/dokumen)

![Tangkapan Layar Repositori Dokumen](/C:/Users/ASUS/.gemini/antigravity-ide/brain/a5e64a57-6c67-48e0-8fa3-08ca876d19be/dokumen_page_1787763230283.png)

#### 🌟 Bagian & Fungsi Utama:
1. **Daftar Dokumen Hukum Resmi Valid:**
   * **Perbup Pinrang No. 35 Tahun 2023** (Tupoksi Disperindag ESDM) &rarr; Tautan langsung unduh PDF JDIH BPK RI.
   * **Perbup Pinrang No. 4 Tahun 2024** (Renstra Perangkat Daerah 2025–2026) &rarr; Tautan langsung unduh PDF JDIH BPK RI.
   * **RKPD Kabupaten Pinrang Tahun 2026** &rarr; Tautan dokumen perencanaan Bappelitbangda / Scribd.
   * **Perda Pinrang No. 1 Tahun 2024** (Pajak & Retribusi Daerah Pasar & Tera).
   * **Dokumen Teknis:** Renja 2026, LKjIP 2025, dan SOP Tera Metrologi 2026.
2. **Filter & Pencarian Instan:** Memfilter dokumen berdasarkan kategori, status berlaku (*Berlaku/Diubah/Arsip*), atau kata kunci.

---

### 6. Halaman Katalog Produk & Industri IKM Binaan
* 🔗 **Alamat Akses:** [https://disperindagesdm-pinrang.web.app/katalog-ikm](https://disperindagesdm-pinrang.web.app/katalog-ikm)

![Tangkapan Layar Katalog Produk IKM](/C:/Users/ASUS/.gemini/antigravity-ide/brain/a5e64a57-6c67-48e0-8fa3-08ca876d19be/katalog_ikm_page_1787763247861.png)

#### 🌟 Bagian & Fungsi Utama:
1. **Etalase Digital Produk IKM:** Mempromosikan komoditas unggulan lokal dari 12 kecamatan.
2. **Informasi Sertifikasi:** Status NIB (Nomor Induk Berusaha), Sertifikat Halal BPJPH, Sertifikat TKDN-IKM Kemenperin, dan izin P-IRT.
3. **Kontak Langsung Pengrajin/Pelaku Usaha:** Memudahkan pembeli, wisatawan, dan investor memesan produk langsung ke pengrajin via WhatsApp.

---

### 7. Halaman Warta, Berita & Rilis Pers
* 🔗 **Alamat Akses:** [https://disperindagesdm-pinrang.web.app/arsip-berita](https://disperindagesdm-pinrang.web.app/arsip-berita)

![Tangkapan Layar Arsip Berita](/C:/Users/ASUS/.gemini/antigravity-ide/brain/a5e64a57-6c67-48e0-8fa3-08ca876d19be/arsip_berita_page_1787763261748.png)

#### 🌟 Bagian & Fungsi Utama:
1. **Arsip Berita Terkini:** Catatan kegiatan sidak pasar murah, verifikasi tera SPBU, pembinaan penenun sutra, pengawasan LPG 3 kg, dan forum TPID.
2. **Format Siaran Pers Resmi:** Dilengkapi tanggal, kategori bidang, nama penulis/editor rilis, serta dokumentasi foto lapangan beresolusi tinggi.

---

### 8. Layar Command Center & TV Wallboard Eksekutif
* 🔗 **Alamat Akses:** [https://disperindagesdm-pinrang.web.app/command-center](https://disperindagesdm-pinrang.web.app/command-center)

![Tangkapan Layar Command Center](/C:/Users/ASUS/.gemini/antigravity-ide/brain/a5e64a57-6c67-48e0-8fa3-08ca876d19be/command_center_page_1787763277135.png)

#### 🌟 Fitur & Tata Kelola Command Center:
1. **Khusus Layar TV & Monitor Ruang Pimpinan (*Fit-to-Screen 100vh*):** Tidak membutuhkan *scroll* vertikal.
2. **Tipografi Angka Raksasa (*Large Scaled Typography*):** Menggunakan font digital kontras tinggi `Chakra Petch` berukuran `2.8rem - 3.8rem` sehingga terbaca sangat jelas dari jarak 5–7 meter di ruang rapat.
3. **Bilah Ticker Berjalan Ekstra Besar (*Stock Exchange Bar 48px*):** Menampilkan pergerakan harga komoditas dan informasi strategis secara mulus di bagian bawah.
4. **Sistem 5 Slide Tematik Otomatis (*Auto-Slide Carousel 15 Detik*):**
   * *Slide 0 (Ikhtisar Lengkap):* Ringkasan 4 KPI utama, harga ringkas, peta 12 kecamatan, dan aduan publik live.
   * *Slide 1 (Bursa Harga Pangan Pokok):* Tabel 12 komoditas pangan lengkap + status 3 pasar rakyat utama (Pasar Sentral, Pasar Pekkabata, Pasar Marawi).
   * *Slide 2 (Kemetrologian & Tera UTTP):* 2.450+ UTTP terdata, kepatuhan SPBU 100%, serta agenda uji tera keliling penggilingan padi (RMU).
   * *Slide 3 (Pengawasan LPG 3 Kg Subsidi):* HET Rp 20.000, diagram alokasi kuota bulanan (84.5%), serta status kestabilan 340+ pangkalan di 12 kecamatan.
   * *Slide 4 (Industri IKM & SP4N-LAPOR!):* 1.248 IKM binaan, produk unggulan, feed tiket aduan publik, dan Indeks Kepuasan Masyarakat (**89.4 / 100 Mutu A**).
5. **Mode Gelap / Cerah Berbasis Ikon (*🌙 / ☀️*):** Penyesuaian kontras layar TV terhadap pencahayaan ruangan dalam satu klik.
6. **Sinkronisasi Real-Time (*Zero Refresh*):** Perubahan data dari admin langsung terupdate detik itu juga di layar TV monitor pimpinan.

---

### 9. Portal Pegawai ASN & CMS Administrator
* 🔗 **Alamat Akses:** [https://disperindagesdm-pinrang.web.app/login](https://disperindagesdm-pinrang.web.app/login) & [https://disperindagesdm-pinrang.web.app/admin](https://disperindagesdm-pinrang.web.app/admin)

![Tangkapan Layar Portal Login](/C:/Users/ASUS/.gemini/antigravity-ide/brain/a5e64a57-6c67-48e0-8fa3-08ca876d19be/login_page_1787763294835.png)

#### 🌟 Hak Akses & Peran Pengguna (RBAC):
1. **Kepala Dinas (`kadis_pinrang` / Super Admin):** Akses penuh ke seluruh modul statistik, rilis kebijakan, dan audit sistem.
2. **Sekretaris Dinas (`sekretaris_dinas` / Admin PPID):** Pengelolaan dokumen hukum, profil organisasi, permohonan informasi publik, dan manajemen staf.
3. **Editor Perdagangan (`editor_perdagangan`):** Pembaruan harga pangan harian Pasar Sentral dan monitoring pasar daerah.
4. **Editor ESDM & Industri (`editor_esdm_industri`):** Pengawasan alokasi gas LPG 3 kg, pangkalan kecamatan, dan etalase produk IKM.
5. **Petugas Metrologi (`petugas_metrologi`):** Pencatatan riwayat tera UTTP timbangan pasar dan pompa ukur BBM SPBU via antarmuka mobile.

---

## 👥 Panduan Pengoperasian Praktis bagi Pemangku Kepentingan

### A. Untuk Pimpinan Daerah (Bupati / Kadis / Sekdis)
1. **Menayangkan Dasbor di TV Ruang Kerja:**
   * Buka peramban di Smart TV / PC Monitor, ketik alamat: `https://disperindagesdm-pinrang.web.app/command-center`.
   * Klik tombol ikon **`[ ⛶ ]`** (Layar Penuh / Fullscreen).
   * Dasbor akan berjalan mandiri, berotasi tiap 15 detik, dan otomatis memperbarui data secara langsung.
2. **Memantau Aduan Kritis:**
   * Cek panel aduan SP4N-LAPOR! pada Slide 0 atau Slide 4 untuk melihat keluhan masyarakat yang masuk dan status penanganannya oleh tim teknis.

---

### B. Untuk Petugas Enumerator Pasar & Operator Komoditas
1. Buka laman `https://disperindagesdm-pinrang.web.app/login`.
2. Masukkan akun operator perdagangan Anda.
3. Masuk ke tab **`📊 Harga Pasar & Bapokting`**.
4. Klik tombol **`✏️ Update Harga`** pada komoditas yang mengalami perubahan di Pasar Sentral. Masukkan harga baru, lalu klik **Simpan**.
5. Data seketika tampil di Beranda Publik dan Layar Command Center TV pimpinan.

---

### C. Untuk Operator Command Center & TV Wallboard
1. Masuk ke panel CMS Admin (`/admin`), pilih menu **`📺 Command Center & TV`**.
2. Anda dapat memperbarui:
   * Angka persentase inflasi daerah.
   * Realisasi penyaluran kuota LPG 3 kg.
   * Status keamanan pasokan di 12 kecamatan (*Normal, Waspada, atau Kritis*).
   * Pesan berjalan (*Running Ticker Text*).
3. Klik tombol **`💾 Simpan & Sinkronkan`**. Seluruh TV Wallboard di kantor dinas akan langsung menampilkan data baru tanpa perlu dikonfigurasi ulang.

---

### D. Untuk Masyarakat & Pelaku Usaha Pinrang
1. **Melihat Harga Pasar:** Buka halaman depan website untuk membandingkan harga sembako hari ini.
2. **Mengajukan Pelayanan Tera / IKM:** Buka menu **`Layanan Publik`** untuk melihat syarat berkas dan biaya resmi.
3. **Menyampaikan Aduan:** Isi formulir di bagian bawah beranda atau laporkan pangkalan gas bermasalah untuk ditindaklanjuti tim pengawas lapangan dinas.

---

## 💾 Informasi Titik Pemulihan (Checkpoint Master)
* **Status Deploy:** Aktif dan Terverifikasi di Google Firebase Hosting (`disperindagesdm-pinrang.web.app`).
* **Direktori Snapshot Lokal:** `d:\# DOWNLOAD\web_disperindagesdm_prototype\`
* **Arsip ZIP Mandiri:** `d:\# DOWNLOAD\checkpoint_27_disperindagesdm_pinrang.zip`
