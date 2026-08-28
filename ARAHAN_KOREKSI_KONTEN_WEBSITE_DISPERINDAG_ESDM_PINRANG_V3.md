# ARAHAN TEKNIS KOREKSI KONTEN WEBSITE — V3
## Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang

**Fokus:** penyelarasan prototipe website dengan materi pelayanan resmi yang dilampirkan, terutama identitas pelayanan, jam layanan, maklumat, pengaduan, kontak, media sosial, responsivitas, dan konsistensi data.

---

# 1. PRINSIP UMUM

Pertahankan desain utama prototipe. Tidak perlu redesign total.

Tahap berikutnya difokuskan pada:

1. koreksi struktur dan isi konten;
2. penyatuan data kontak;
3. penyempurnaan halaman pelayanan;
4. penyempurnaan sistem pengaduan;
5. konsistensi identitas pelayanan;
6. responsivitas dan kemudahan penggunaan;
7. pemindahan data berulang dari hardcode ke CMS/config.

Website harus menerjemahkan materi poster menjadi **konten web terstruktur**, bukan hanya menampilkan poster sebagai gambar.

---

# 2. IDENTITAS PELAYANAN

Gunakan identitas pelayanan berikut sesuai materi:

## MANTAP

**Melayani Anda dengan Transparan, Adil & Profesional**

Tampilkan pada:

- halaman Profil & Tupoksi;
- halaman Layanan Publik;
- compact service-info block di homepage.

Jangan menggantikan BerAKHLAK dengan MANTAP.

---

# 3. CORE VALUES ASN BERAKHLAK

Tampilkan lengkap:

- Berorientasi Pelayanan
- Akuntabel
- Kompeten
- Harmonis
- Loyal
- Adaptif
- Kolaboratif

Jangan menggabungkan beberapa nilai menjadi satu card.

Tambahkan identitas:

**#BanggaMelayaniBangsa**

secara proporsional pada halaman pelayanan / budaya kerja.

---

# 4. JAM PELAYANAN

Gunakan informasi dari materi layanan:

```text
Senin–Kamis : 08.00–16.00 WITA
Jumat       : 08.00–16.30 WITA
```

Tampilkan pada:

- homepage;
- halaman Layanan Publik;
- halaman Hubungi Kami;
- footer.

Tambahkan catatan:

> Hari libur mengikuti ketentuan Pemerintah Kabupaten Pinrang.

Jangan hardcode pada banyak file.

Gunakan satu sumber data:

```text
service_hours
```

---

# 5. MAKLUMAT PELAYANAN

Buat halaman khusus:

```text
/layanan/maklumat-pelayanan
```

Isi sesuai materi:

1. Berjanji dan sanggup untuk melaksanakan pelayanan sesuai dengan Standar Pelayanan.
2. Memberikan pelayanan sesuai dengan kewajiban dan akan melakukan perbaikan secara terus menerus.
3. Siap menerima sanksi dan/atau memberikan kompensasi apabila pelayanan yang diberikan tidak sesuai standar.

Tampilkan sebagai HTML agar:

- terbaca di mobile;
- dapat diakses screen reader;
- mudah dicari;
- tidak bergantung pada gambar poster.

Jika tersedia dokumen resmi/ditandatangani, tambahkan:

```text
Unduh Maklumat Pelayanan
```

---

# 6. DATA KONTAK UTAMA — GUNAKAN SESUAI MATERI "KENALI DAN HUBUNGI KAMI"

Untuk **kontak umum Dinas**, gunakan data berikut:

## Website

```text
disperindagesdm.pinrangkab.go.id
```

Link:

```text
https://disperindagesdm.pinrangkab.go.id/
```

## Facebook

```text
Disperindag-ESDM Pinrang
```

Developer harus memasang URL halaman Facebook resmi yang digunakan akun tersebut.

Label icon:

```text
Facebook Resmi
Disperindag-ESDM Pinrang
```

## Instagram

```text
perindagempinrang
```

Link:

```text
https://www.instagram.com/perindagempinrang/
```

## WhatsApp

```text
0823 1600 2226
```

Link:

```text
https://wa.me/6282316002226
```

## Alamat Kantor

```text
Jalan Bintang No. 1
Pinrang
```

Tampilkan dalam format:

```text
Jalan Bintang No. 1, Kabupaten Pinrang, Sulawesi Selatan
```

## Maps

Gunakan tombol:

```text
Lihat Lokasi di Google Maps
```

Tautan Maps harus diarahkan ke lokasi kantor yang sesuai dengan alamat di atas.

---

# 7. KONTAK PENGADUAN

Materi "Media Pengaduan" mencantumkan:

## Kotak Saran

```text
Tersedia di Ruang Pelayanan
```

## SP4N-LAPOR!

```text
https://www.lapor.go.id/
```

## Website

Untuk website utama tetap gunakan domain canonical:

```text
https://disperindagesdm.pinrangkab.go.id/
```

## Facebook

```text
Disperindag-ESDM Pinrang
```

## Email Pengaduan

```text
dinasperindagem.pinrang@gmail.com
```

Link:

```text
mailto:dinasperindagem.pinrang@gmail.com
```

## WhatsApp Pengaduan

```text
0823 1600 2226
```

Link:

```text
https://wa.me/6282316002226
```

## Instagram

Untuk konsistensi portal utama gunakan:

```text
@perindagempinrang
```

Link:

```text
https://www.instagram.com/perindagempinrang/
```

## Pengaduan Langsung

```text
Jalan Bintang No. 1, Pinrang
```

---

# 8. CATATAN KONSISTENSI MATERI

Salah satu poster pengaduan menampilkan bentuk domain/akun yang berbeda.

Untuk website production, gunakan **satu identitas canonical** agar tidak membingungkan pengguna.

Canonical yang digunakan dalam website:

```text
Website  : disperindagesdm.pinrangkab.go.id
Instagram: @perindagempinrang
Facebook : Disperindag-ESDM Pinrang
WhatsApp : 0823 1600 2226
Alamat   : Jalan Bintang No. 1, Pinrang
```

Email pengaduan:

```text
dinasperindagem.pinrang@gmail.com
```

---

# 9. IMPLEMENTASI ICON KONTAK

Semua icon harus clickable.

## Website

```html
<a href="https://disperindagesdm.pinrangkab.go.id/"
   target="_blank"
   rel="noopener noreferrer">
  Website Resmi
</a>
```

## Facebook

```html
<a href="URL_FACEBOOK_RESMI"
   target="_blank"
   rel="noopener noreferrer">
  Disperindag-ESDM Pinrang
</a>
```

## Instagram

```html
<a href="https://www.instagram.com/perindagempinrang/"
   target="_blank"
   rel="noopener noreferrer">
  @perindagempinrang
</a>
```

## WhatsApp

```html
<a href="https://wa.me/6282316002226"
   target="_blank"
   rel="noopener noreferrer">
  0823 1600 2226
</a>
```

## Email

```html
<a href="mailto:dinasperindagem.pinrang@gmail.com">
  dinasperindagem.pinrang@gmail.com
</a>
```

## SP4N-LAPOR!

```html
<a href="https://www.lapor.go.id/"
   target="_blank"
   rel="noopener noreferrer">
  SP4N-LAPOR!
</a>
```

---

# 10. SATU SUMBER DATA KONTAK

Jangan copy-paste data kontak ke banyak file.

Gunakan:

```text
contact_channels
```

Field:

```text
id
channel_type
label
display_value
url
purpose
is_active
display_order
```

Contoh:

```text
channel_type : whatsapp
label        : WhatsApp Pengaduan
display_value: 0823 1600 2226
url          : https://wa.me/6282316002226
purpose      : complaint
is_active    : true
```

---

# 11. HALAMAN HUBUNGI KAMI

Buat halaman:

```text
/kontak
```

Susunan:

## Hubungi Kami

### Alamat Kantor
Jalan Bintang No. 1, Kabupaten Pinrang, Sulawesi Selatan

### Jam Pelayanan
Senin–Kamis 08.00–16.00 WITA  
Jumat 08.00–16.30 WITA

### Website
disperindagesdm.pinrangkab.go.id

### WhatsApp
0823 1600 2226

### Email Pengaduan
dinasperindagem.pinrang@gmail.com

### Facebook
Disperindag-ESDM Pinrang

### Instagram
@perindagempinrang

### SP4N-LAPOR!
www.lapor.go.id

### Lokasi
Tombol Google Maps

---

# 12. SECTION KONTAK DI HOMEPAGE

Tidak perlu menampilkan semua detail.

Gunakan compact cards:

```text
[WhatsApp]
0823 1600 2226

[Instagram]
@perindagempinrang

[Facebook]
Disperindag-ESDM Pinrang

[Lokasi]
Jalan Bintang No. 1

[Lihat Semua Kontak →]
```

---

# 13. FOOTER

Footer cukup menampilkan:

```text
Dinas Perindustrian, Perdagangan,
Energi dan Sumber Daya Mineral
Kabupaten Pinrang

Jalan Bintang No. 1, Pinrang
0823 1600 2226
dinasperindagem.pinrang@gmail.com

[Facebook] [Instagram] [WhatsApp]
```

Gunakan icon yang clickable.

---

# 14. PENGADUAN — KOREKSI HEADING

Ganti:

```text
Layanan Pengaduan Konsumen & Energi
```

menjadi:

```text
Layanan Pengaduan, Saran & Masukan
```

Subjudul:

> Sampaikan pengaduan, saran, dan masukan Anda untuk pelayanan yang lebih baik. Setiap laporan akan diterima, diverifikasi, diteruskan kepada unit terkait, dan ditindaklanjuti sesuai kewenangan.

---

# 15. RUANG LINGKUP PENGADUAN

Kategori:

```text
Pelayanan Publik
Informasi & Keterbukaan
Kemetrologian / Tera
Perdagangan / Harga / Bapokting
LPG 3 Kg / ESDM
Industri & IKM
Pasar & Sarana Distribusi
Sikap / Pelayanan Petugas
Saran & Masukan
Lainnya
```

---

# 16. ALUR PENGADUAN

Gunakan satu alur umum:

```text
1. Sampaikan Pengaduan
       ↓
2. Penerimaan & Registrasi
       ↓
3. Verifikasi & Analisis
       ↓
4. Penugasan ke Unit Terkait
       ↓
5. Tindak Lanjut
       ↓
6. Respon & Informasi kepada Pelapor
       ↓
7. Monitoring & Evaluasi
```

Jangan membuat semua laporan otomatis menjadi:

```text
Sidak Lapangan
```

karena tidak semua kategori pengaduan membutuhkan sidak.

---

# 17. NOMOR TIKET PENGADUAN

Setiap laporan online menghasilkan:

```text
DPE-2026-000123
```

Tambahkan CTA:

```text
Kirim Pengaduan
Cek Status Pengaduan
SP4N-LAPOR!
```

---

# 18. MULTI-CHANNEL PENGADUAN

Database harus dapat mencatat laporan dari:

```text
Website
WhatsApp
Email
Facebook
Instagram
SP4N-LAPOR!
Kotak Saran
Tatap Muka
Telepon
```

Gunakan field:

```text
source_channel
```

---

# 19. PRIVASI PELAPOR

Gunakan:

> Identitas dan data pribadi pelapor dikelola secara rahasia untuk keperluan verifikasi dan tindak lanjut pengaduan sesuai ketentuan yang berlaku.

Tambahkan checkbox persetujuan penggunaan data.

---

# 20. HOMEPAGE — BLOK PELAYANAN

Tambahkan compact section:

```text
MANTAP
Melayani Anda dengan Transparan, Adil & Profesional

Jam Pelayanan
Senin–Kamis 08.00–16.00
Jumat 08.00–16.30

[Standar Pelayanan]
[Maklumat Pelayanan]
[Hubungi Kami]
```

Jangan dibuat terlalu tinggi.

---

# 21. RESPONSIVE

Semua informasi poster harus dikonversi menjadi HTML.

Jangan hanya menampilkan poster.

Untuk mobile:

- contact cards 1 kolom;
- alur pengaduan vertikal;
- icon minimal 44×44 px;
- nomor WhatsApp dapat diketuk;
- email dapat diketuk;
- alamat mempunyai tombol Maps;
- tidak ada horizontal overflow.

Breakpoint QA:

```text
320
360
390
430
768
1024
1280
1366
1440
1920
```

---

# 22. CMS YANG HARUS DITAMBAHKAN

Tambahkan modul:

```text
Jam Pelayanan
Maklumat Pelayanan
Kanal Kontak
Media Sosial
Pengaduan
Standar Pelayanan
```

---

# 23. PRIORITAS P0

Sebelum production:

1. Gunakan alamat kantor: **Jalan Bintang No. 1, Pinrang**
2. Gunakan WhatsApp: **0823 1600 2226**
3. Gunakan website canonical: **disperindagesdm.pinrangkab.go.id**
4. Gunakan Instagram: **@perindagempinrang**
5. Gunakan Facebook: **Disperindag-ESDM Pinrang**
6. Gunakan email pengaduan: **dinasperindagem.pinrang@gmail.com**
7. Tambahkan SP4N-LAPOR!
8. Tambahkan jam pelayanan.
9. Tambahkan MANTAP.
10. Lengkapi BerAKHLAK.
11. Tambahkan Maklumat Pelayanan.
12. Perluas scope pengaduan.
13. Tambahkan nomor tiket.
14. Tambahkan cek status.
15. Pastikan semua icon benar-benar menuju link tujuan.
16. Pastikan data kontak tidak hardcode di banyak file.
17. Audit mobile/responsive.

---

# 24. ACCEPTANCE CRITERIA KONTAK

Website dinyatakan benar jika:

```text
Website:
https://disperindagesdm.pinrangkab.go.id/

Instagram:
https://www.instagram.com/perindagempinrang/

WhatsApp:
https://wa.me/6282316002226

Email:
mailto:dinasperindagem.pinrang@gmail.com

SP4N-LAPOR:
https://www.lapor.go.id/

Alamat:
Jalan Bintang No. 1, Kabupaten Pinrang, Sulawesi Selatan

Facebook:
Disperindag-ESDM Pinrang
→ URL halaman Facebook resmi
```

Semua link:

- dapat diklik;
- mempunyai `aria-label`;
- external link menggunakan `rel="noopener noreferrer"`;
- tidak membuka URL kosong;
- tidak menyimpan credential;
- menggunakan data dari CMS/config yang sama.

---

# 25. TARGET AKHIR

Website harus konsisten dengan materi pelayanan Dinas dan terasa seperti satu sistem resmi, bukan kumpulan halaman terpisah.

Target:

> **Masyarakat dapat mengetahui siapa Dinasnya, kapan pelayanan tersedia, bagaimana menghubungi Dinas, bagaimana mengadu, bagaimana memantau laporan, serta mengakses dokumen pelayanan tanpa harus mencari informasi melalui poster atau media sosial.**
