# ARAHAN TEKNIS DEVELOPER
## Integrasi Harga Bapok SP2KP Kemendag → Disperindag ESDM Kabupaten Pinrang

**Target website:**  
`https://disperindagesdm-pinrang.web.app/`

---

## 1. Tujuan Utama

Ubah sumber data modul **Harga Bahan Pokok (Bapok)** pada website Disperindag ESDM Kabupaten Pinrang.

Mulai sekarang:

> **Jangan lagi menjadikan input manual petugas melalui CMS sebagai sumber utama harga Bapok.**

Sumber utama harga Bapok harus berasal dari:

> **SP2KP Kementerian Perdagangan RI — Kabupaten Pinrang**

Petugas pasar tetap melakukan input harga pada SP2KP sesuai prosedur resmi yang berlaku.

Website Disperindag Pinrang hanya bertugas:

**mengambil → menyimpan snapshot → mengolah → membandingkan → menampilkan data SP2KP.**

CMS tetap menyediakan kemampuan **intervensi/koreksi**, tetapi hanya sebagai **controlled local override**, bukan untuk mengganti atau menghapus data asli SP2KP.

---

## 2. Prinsip Arsitektur Wajib

Implementasikan alur:

```text
PETUGAS PASAR
      │
      │ INPUT SEKALI
      ▼
SP2KP KEMENDAG
      │
      ▼
API SP2KP
      │
      ▼
SYNC SERVICE DISPERINDAG
      │
      ▼
FIRESTORE
      │
      ├──────────────┐
      ▼              ▼
WEBSITE PUBLIK    COMMAND CENTER
      │
      ▼
CMS MONITORING / OVERRIDE
```

Jangan lagi menggunakan pola:

```text
Petugas → SP2KP

dan

Petugas → CMS Disperindag
```

untuk memasukkan data harga yang sama.

---

## 3. Sumber API Harga SP2KP

Gunakan endpoint yang telah terbukti digunakan oleh frontend publik SP2KP:

```text
POST
https://api-sp2kp.kemendag.go.id/report/api/average-price/generate-perbandingan-harga
```

Request menggunakan:

```text
multipart/form-data
```

Parameter:

```text
tanggal
tanggal_pembanding
kode_provinsi
kode_kab_kota
```

Untuk Kabupaten Pinrang:

```text
kode_provinsi = 73
kode_kab_kota = 7315
```

Contoh request dasar:

```javascript
const formData = new FormData();

formData.append("tanggal", targetDate);
formData.append("tanggal_pembanding", comparisonDate);
formData.append("kode_provinsi", "73");
formData.append("kode_kab_kota", "7315");

const response = await fetch(
  "https://api-sp2kp.kemendag.go.id/report/api/average-price/generate-perbandingan-harga",
  {
    method: "POST",
    body: formData
  }
);

const result = await response.json();
```

### Wajib untuk production

Implementasi production harus memiliki:

```text
timeout
retry terbatas
validasi JSON
validasi status response
logging
duplicate protection
rate-limit protection
fallback data terakhir
```

---

## 4. Jangan Fetch SP2KP Langsung dari Setiap Browser Pengunjung

Walaupun API SP2KP saat ini mengizinkan cross-origin request, website publik jangan melakukan request langsung ke SP2KP setiap kali halaman dibuka.

Jangan:

```text
USER
 ↓
SP2KP
```

Gunakan:

```text
SP2KP
 ↓
SYNC JOB
 ↓
FIRESTORE
 ↓
USER
```

Alasannya:

- menghindari pemborosan request;
- menjaga website tetap berfungsi saat SP2KP sedang bermasalah;
- menghindari ketergantungan langsung pada struktur API eksternal;
- menjaga konsistensi data Website, Command Center, dan CMS;
- memudahkan caching dan audit;
- menghormati rate limit API SP2KP.

---

## 5. Sync Service

Karena proyek menggunakan Firebase dan ingin tetap efisien, prioritaskan:

```text
GitHub Actions
        ↓
scripts/sync-sp2kp.js
        ↓
Firestore
```

atau:

```text
scripts/sync_sp2kp.py
```

Jangan memaksakan Cloud Functions/Scheduler berbayar jika belum diperlukan.

---

## 6. Frekuensi Sinkronisasi

Harga tidak perlu diperiksa setiap menit.

Untuk tahap awal gunakan jadwal misalnya:

```text
09:00 WITA
12:00 WITA
15:00 WITA
17:00 WITA
```

Setelah pola input/closing SP2KP diketahui, sesuaikan jadwal dengan waktu yang paling relevan.

Tambahkan tombol CMS:

> **Sinkronkan Harga SP2KP Sekarang**

Tetapi beri cooldown, misalnya:

```text
minimal interval manual sync = 5 menit
```

untuk mencegah spam request.

---

## 7. Jangan Anggap Tanggal Request = Tanggal Data

Jika sistem meminta data tanggal 30 Agustus tetapi response SP2KP sebenarnya berisi data tanggal 28 Agustus, jangan tampilkan:

> Data 30 Agustus

Gunakan tanggal yang benar-benar terdapat pada response SP2KP.

Contoh:

> **Data SP2KP per 28 Agustus 2026**

---

## 8. Jika Data Hari Ini Belum Tersedia

Sync harus memiliki fallback tanggal mundur.

Contoh:

```text
coba hari ini
 ↓
tidak ada data valid
 ↓
coba H-1
 ↓
tidak ada
 ↓
coba H-2
 ↓
...
```

Batasi misalnya maksimal 7 hari.

Setelah menemukan dataset valid:

```text
latestAvailableDate = tanggal response
```

Jangan menghasilkan harga `0` atau halaman kosong.

---

## 9. Struktur Data Response SP2KP

Response menyediakan field seperti:

```json
{
  "variant_id": 52,
  "variant_nama": "Beras Medium",
  "satuan_display": "kg",
  "tanggal": "2026-08-28",
  "harga": 13300,
  "tanggal_pembanding": "2026-08-27",
  "harga_pembanding": 13300,
  "delta_harga": 0,
  "persen_perubahan": 0,
  "status_perubahan": "Tidak Berubah"
}
```

Jangan mengubah `variant_id` SP2KP.

Simpan sebagai external ID untuk menjaga konsistensi mapping komoditas.

---

## 10. Normalisasi `harga = 0`

Jika SP2KP memberikan:

```text
harga = 0
```

jangan tampilkan:

> Rp0/kg

Interpretasikan sebagai:

```text
DATA TIDAK TERSEDIA
```

Contoh:

```javascript
const hasValidPrice =
  Number.isFinite(price) &&
  price > 0;
```

UI:

> **Data belum tersedia**

bukan:

> **Rp0**

---

## 11. Struktur Firestore Baru

Jangan mencampurkan data SP2KP langsung dengan data input manual lama.

Gunakan struktur terpisah.

Contoh:

```text
market_prices/
```

Dokumen per komoditas/tanggal:

```json
{
  "provinceCode": "73",
  "provinceName": "Sulawesi Selatan",

  "regencyCode": "7315",
  "regencyName": "Kabupaten Pinrang",

  "variantId": 52,
  "commodityName": "Beras Medium",
  "unit": "kg",

  "dataDate": "2026-08-28",

  "sourcePrice": 13300,

  "comparisonDate": "2026-08-27",
  "comparisonPrice": 13300,

  "delta": 0,
  "changePercent": 0,
  "changeStatus": "Tidak Berubah",

  "source": "SP2KP",
  "sourceName": "SP2KP Kementerian Perdagangan RI",

  "sourceRaw": {},

  "syncedAt": "...",
  "syncStatus": "success"
}
```

---

## 12. Simpan Raw Data SP2KP

Untuk audit/debugging, jangan hanya menyimpan angka hasil normalisasi.

Simpan juga:

```text
sourceRaw
```

atau snapshot JSON mentah per sinkronisasi.

Contoh:

```text
sp2kp_sync_snapshots/
   2026-08-28
```

Data raw tidak perlu ditampilkan ke publik.

Tujuannya agar jika muncul pertanyaan:

> “Mengapa website menampilkan Rp13.300?”

administrator masih dapat melihat data asli yang diterima dari SP2KP.

---

## 13. Koleksi `latest`

Agar frontend tidak melakukan query historis berat, buat:

```text
market_prices_latest/
```

Satu dokumen per `variantId`.

Contoh:

```text
market_prices_latest/52
```

Website publik dan Command Center membaca koleksi ini.

Data historis tetap disimpan pada:

```text
market_prices_history/
```

---

## 14. Jangan Hapus Data Manual Lama Sekarang

Lakukan migrasi bertahap.

Data lama:

```text
manual_prices
```

tetap disimpan sebagai arsip.

Jangan langsung dihapus.

Frontend baru harus menggunakan:

```text
defaultSource = SP2KP
```

Data manual lama tidak lagi menjadi sumber utama.

---

## 15. CMS Diubah dari “Input Harga” Menjadi “Monitor Harga SP2KP”

Ubah modul admin.

Dari:

> Tambah Harga Bapok

menjadi:

> **Monitor Harga Bapok — SP2KP**

Contoh:

```text
HARGA BAPOK — SP2KP

Status
● TERHUBUNG

Wilayah
Kabupaten Pinrang

Kode
7315

Data terakhir
28 Agustus 2026

Sinkron terakhir
30 Agustus 2026 • 17:03 WITA

Jumlah komoditas
17

Data tersedia
16

Data tidak tersedia
1

[ SINKRONKAN SEKARANG ]
[ LIHAT HISTORI ]
[ LIHAT LOG ]
```

---

# 16. Controlled Local Override

Petugas tetap boleh melakukan koreksi apabila terdapat kebutuhan operasional.

Namun fitur ini **harus disebut dan diperlakukan sebagai LOCAL OVERRIDE**, bukan sebagai edit terhadap data SP2KP.

Prinsip:

```text
SP2KP = sumber utama resmi
Override lokal = pengecualian sementara
```

---

## 17. Jangan Pernah Menimpa `sourcePrice`

Misalnya SP2KP memberikan:

```text
sourcePrice = 13.300
```

Petugas setelah verifikasi perlu menampilkan:

```text
13.500
```

Jangan:

```text
sourcePrice = 13.500
```

Gunakan:

```text
sourcePrice       = 13.300
overridePrice     = 13.500
```

Kemudian:

```text
displayPrice =
overrideActive
? overridePrice
: sourcePrice
```

---

## 18. Struktur Firestore Override

Gunakan koleksi:

```text
price_overrides/
```

Contoh:

```json
{
  "variantId": 52,

  "sourcePrice": 13300,
  "overridePrice": 13500,

  "reason": "Koreksi sementara berdasarkan verifikasi lapangan",

  "evidence": "...",

  "effectiveFrom": "...",
  "expiresAt": "...",

  "status": "active",

  "createdBy": "...",
  "createdAt": "...",

  "approvedBy": "...",
  "approvedAt": "..."
}
```

---

## 19. Alasan Koreksi Wajib

Petugas tidak boleh mengubah angka tanpa penjelasan.

Form:

```text
Harga SP2KP
Rp13.300/kg
(read-only)

Harga Koreksi
[ Rp13.500 ]

Alasan *
[........................]

Sumber/verifikasi *
[........................]

Bukti pendukung
[ Upload opsional ]

Berlaku sampai
[ tanggal/jam ]

[ TERAPKAN KOREKSI ]
```

---

## 20. Pilihan Alasan Terstruktur

Sediakan pilihan:

```text
Data SP2KP belum diperbarui
Kesalahan input SP2KP
Hasil verifikasi lapangan
Data belum closing
Perubahan kondisi pasar
Kesalahan satuan
Lainnya
```

Jika memilih `Lainnya`, wajib isi keterangan.

---

## 21. Override Bersifat Sementara

Jangan biarkan koreksi aktif selamanya.

Default misalnya:

```text
expiresAt = akhir hari
```

atau:

```text
24 jam
```

Admin dapat memperpanjang jika diperlukan.

Setelah expired:

```text
overrideActive = false
```

dan sistem kembali memakai data SP2KP.

---

## 22. Rekonsiliasi Setelah Sync Baru

Jangan otomatis menghapus override setiap kali SP2KP melakukan sinkronisasi baru.

Contoh:

```text
SP2KP lama 13.300
override 13.500
```

Kemudian SP2KP menjadi:

```text
13.500
```

Sistem harus mendeteksi:

```text
SP2KP == override
```

dan memberi notifikasi CMS:

> **Data SP2KP sudah sesuai dengan koreksi lokal. Override dapat ditutup.**

Lebih aman menggunakan status:

```text
RECONCILIATION_REQUIRED
```

dan admin memilih:

> **Tutup Intervensi**

---

## 23. Jika SP2KP Berubah Menjadi Angka Lain Saat Override Aktif

Misalnya:

```text
Override lokal   13.500
SP2KP terbaru    13.400
```

Jangan diam-diam menghapus override.

CMS harus menampilkan:

> ⚠ **DATA SP2KP BERUBAH SELAMA OVERRIDE AKTIF**

Berikan pilihan:

```text
Pertahankan Override
atau
Gunakan SP2KP Terbaru
```

---

## 24. Sumber Harga Harus Transparan

Setiap record harus memiliki:

```text
priceSource
```

Nilai:

```text
SP2KP
LOCAL_OVERRIDE
```

Jika normal:

> **Sumber: SP2KP Kemendag**

Jika override:

> **Harga disesuaikan Disperindag ESDM Pinrang berdasarkan verifikasi lokal**

Jangan memberi label murni “SP2KP” pada angka yang sudah diubah melalui CMS.

---

## 25. Pertahankan Dua Angka di Backend

Setiap data harga efektif harus mempunyai:

```text
sourcePrice
displayPrice
```

Normal:

```text
sourcePrice  = 13300
displayPrice = 13300
```

Override:

```text
sourcePrice  = 13300
displayPrice = 13500
```

Jangan hanya menyimpan satu field `price`.

---

## 26. Buat Price Resolver Terpusat

Jangan ulangi logika override di:

```text
beranda.js
harga.js
command-center.js
ticker.js
```

Buat satu fungsi/service:

```javascript
resolveEffectivePrice(sourceData, override)
```

Output contoh:

```json
{
  "sourcePrice": 13300,
  "displayPrice": 13500,
  "hasOverride": true,
  "source": "LOCAL_OVERRIDE"
}
```

Semua komponen wajib menggunakan resolver yang sama.

---

## 27. Command Center Harus Membaca Data yang Sama

Jangan ada database harga terpisah untuk Command Center.

Gunakan sumber yang sama:

```text
market_prices_latest
+
price_overrides
+
price_references
```

Sehingga:

```text
Website
Command Center
Ticker
Dashboard
```

selalu konsisten.

---

# 28. HET / HA Dipisah dari Harga Pasar

SP2KP juga memiliki panel:

> **INFORMASI HET/HA**

Siapkan koleksi:

```text
price_references/
```

Namun jangan ikut disinkronkan setiap kali sync harga harian.

Gunakan model:

```text
HARGA BAPOK
→ AUTO SYNC

HET/HA
→ ON-DEMAND SYNC
```

---

## 29. CMS HET/HA

Tambahkan panel:

```text
REFERENSI HARGA PEMERINTAH
HET / HA

Sumber
SP2KP Kemendag

Terakhir diperiksa
...

[ CEK PEMBARUAN HET / HA ]
```

Jika ada perubahan:

```text
⚠ 2 REFERENSI BERUBAH

[ TINJAU PERUBAHAN ]
```

Kemudian setelah admin memastikan:

```text
[ TERAPKAN PEMBARUAN ]
```

---

## 30. Jangan Implementasikan Endpoint HET/HA dengan Tebakan

Endpoint API harga sudah diketahui.

Endpoint HET/HA harus diidentifikasi dari Network/XHR SP2KP sebelum implementasi.

Developer dilarang:

```text
menebak URL endpoint
scraping HTML secara sembarangan
hard-code struktur DOM tanpa verifikasi
```

Siapkan abstraction:

```text
HetHaSyncAdapter
```

Kemudian integrasikan setelah request API HET/HA berhasil diidentifikasi dan diuji.

---

## 31. History HET/HA

Jangan overwrite HET/HA lama.

Simpan:

```text
current
history
```

Minimal:

```json
{
  "referenceType": "HET",
  "value": 13500,

  "effectiveFrom": "...",
  "effectiveUntil": null,

  "regulation": "...",

  "source": "SP2KP",

  "syncedAt": "..."
}
```

---

# 32. Price Analysis Engine

Setelah harga dan HET/HA tersedia, buat service:

```text
priceAnalysisService
```

Untuk HET:

```javascript
if (price <= het) {
   status = "sesuai";
} else {
   status = "di_atas_het";
}
```

Tampilkan juga:

```text
selisih rupiah
selisih persen
```

---

## 33. Untuk HA Berbentuk Rentang

Gunakan:

```text
min
max
```

bukan satu `value`.

Contoh:

```javascript
if (price < min) {
  status = "below_reference";
}
else if (price <= max) {
  status = "within_reference";
}
else {
  status = "above_reference";
}
```

---

# 34. Status Data

Gunakan status:

```text
SYNCED
NO_DATA
STALE
OVERRIDDEN
SYNC_ERROR
```

Jangan hanya memakai:

```text
ONLINE
OFFLINE
```

---

## 35. Stale Data

Jika:

```text
current date = 30 Aug
latest SP2KP = 28 Aug
```

tampilkan:

> **Data SP2KP terakhir: 28 Agustus 2026**

Jika melewati threshold, misalnya lebih dari 2 hari kerja:

```text
STALE
```

Tetapi tetap tampilkan last-known-good value.

---

## 36. Jangan Kosongkan Data Saat API Gagal

Jika SP2KP timeout:

```text
JANGAN
price = 0
```

Gunakan:

```text
lastSuccessfulSnapshot
```

dan tampilkan:

> **Data terakhir berhasil disinkronkan ...**

---

# 37. Audit Log

Setiap tindakan CMS harus masuk:

```text
audit_logs/
```

Minimal:

```json
{
  "action": "PRICE_OVERRIDE_CREATED",
  "variantId": 52,

  "oldDisplayPrice": 13300,
  "newDisplayPrice": 13500,

  "reason": "...",

  "userId": "...",

  "timestamp": "..."
}
```

Jenis tindakan yang perlu dicatat:

```text
SYNC_MANUAL
OVERRIDE_CREATE
OVERRIDE_UPDATE
OVERRIDE_CANCEL
HET_SYNC_CHECK
HET_UPDATE_APPROVED
```

---

## 38. Hak Akses

Jangan semua akun CMS bisa override.

Role minimum:

```text
viewer
operator
verifier
admin
```

Contoh:

```text
viewer
→ lihat

operator
→ request correction

verifier
→ approve correction

admin
→ semua fungsi
```

Jika belum siap dengan approval dua tahap, minimal hanya role tertentu/admin yang boleh melakukan override.

---

## 39. Validasi Nilai Koreksi Abnormal

Jika harga SP2KP:

```text
Rp13.000
```

dan admin memasukkan:

```text
Rp130.000
```

tampilkan peringatan.

Contoh:

```text
perubahan > 20%
→ mandatory confirmation
```

Jangan langsung menolak karena pergerakan harga ekstrem tetap mungkin terjadi, tetapi wajib ada konfirmasi tambahan.

---

## 40. Validasi Unit

Pastikan:

```text
kg
lt/liter
```

tidak tertukar.

Jangan melakukan kalkulasi antar satuan berbeda.

---

# 41. Tampilan Modul Publik

Contoh:

```text
HARGA BAHAN POKOK
Kabupaten Pinrang

Data SP2KP
28 Agustus 2026

─────────────────────────

Beras Medium
Rp13.300/kg

HET
Rp13.500/kg

↓ Rp200 dari HET
● SESUAI
```

Untuk perubahan harian:

```text
Rp35.000/kg
▲ 3,6%

Naik dari hari sebelumnya
```

---

## 42. Identitas Sumber

Tambahkan secara jelas:

> **Sumber data harga: Sistem Pemantauan Pasar dan Kebutuhan Pokok (SP2KP), Kementerian Perdagangan RI.**

Jika sedang memakai override:

> **Penyesuaian sementara berdasarkan verifikasi Disperindag ESDM Kabupaten Pinrang.**

---

## 43. Jangan Tampilkan Istilah Teknis API ke Publik

Jangan tampilkan:

```text
variant_id
kode_kab_kota
is_regional
delta_harga
```

Konversi menjadi:

```text
variant_nama → Komoditas
harga → Harga
persen_perubahan → Perubahan
status_perubahan → Tren
```

---

## 44. Jangan Labeli Data Kabupaten sebagai “Pasar Sentral”

Endpoint yang saat ini diketahui memberikan data:

> **Kabupaten Pinrang**

Belum terbukti merupakan record per pasar.

Jadi gunakan:

> **Harga Rata-rata Bapok Kabupaten Pinrang**

Jangan gunakan:

> Harga Pasar Sentral Pinrang

sampai endpoint per pasar ditemukan dan diverifikasi.

---

# 45. Penghapusan Input Manual

Setelah pilot berhasil, hapus/sembunyikan fungsi:

> **Tambah Harga Harian**

dari workflow reguler petugas.

Ganti dengan:

> **Data otomatis dari SP2KP**

Namun jangan delete kode/data lama terlebih dahulu.

Lakukan deprecation bertahap.

---

## 46. Migration Flag

Tambahkan konfigurasi:

```javascript
PRICE_SOURCE_MODE = "SP2KP"
```

Pilihan sementara:

```text
LEGACY_MANUAL
SP2KP
```

Agar rollback mudah selama masa pilot.

Setelah stabil:

```text
SP2KP
```

menjadi mode permanen.

---

# 47. Implementasi Bertahap

## Tahap 1 — Pilot

Buat:

```text
scripts/sync-sp2kp
```

Tarik data Pinrang.

Simpan ke test collection:

```text
sp2kp_pilot/
```

**Jangan ubah frontend production terlebih dahulu.**

Uji beberapa hari.

---

## Tahap 2 — Validasi

Bandingkan:

```text
Website SP2KP
vs
API
vs
Firestore
```

Harus cocok.

Validasi minimal:

```text
tanggal
komoditas
harga
satuan
harga pembanding
status perubahan
```

---

## Tahap 3 — Shadow Mode

Frontend lama tetap tampil.

Di admin buat:

```text
SP2KP TEST DATA
```

Bandingkan dengan sistem manual.

Jangan publish dulu.

---

## Tahap 4 — Switch Source

Setelah valid:

```text
PRICE_SOURCE_MODE = SP2KP
```

Website publik dan Command Center mulai membaca data SP2KP.

---

## Tahap 5 — Aktifkan Override

Setelah source utama stabil, aktifkan:

```text
Controlled Local Override
```

---

## Tahap 6 — HET/HA

Setelah endpoint HET/HA ditemukan:

aktifkan:

```text
CEK PEMBARUAN HET/HA
```

---

# 48. Acceptance Test

Jangan menyatakan fitur selesai sebelum semua ini lolos:

```text
[ ] API Pinrang 7315 berhasil
[ ] Response JSON valid
[ ] Semua komoditas tersimpan
[ ] harga=0 tampil "Data belum tersedia"
[ ] tanggal data benar
[ ] source tercatat SP2KP
[ ] histori tersimpan
[ ] latest ter-update
[ ] sync gagal tidak menghapus harga lama
[ ] public page membaca SP2KP
[ ] Command Center membaca source sama
[ ] override tidak mengubah sourcePrice
[ ] override tercatat audit log
[ ] override dapat dibatalkan
[ ] override expired bekerja
[ ] source badge benar
[ ] HET/HA tetap terpisah
[ ] data lama tidak terhapus saat migrasi
```

---

# 49. Dilarang Dilakukan

```text
❌ Menghapus harga asli SP2KP ketika petugas melakukan koreksi

❌ Menimpa sourcePrice dengan harga CMS

❌ Memanggil SP2KP dari setiap browser pengunjung

❌ Menampilkan Rp0 sebagai harga

❌ Menyebut data kabupaten sebagai harga pasar tertentu

❌ Hard-code angka HET tanpa sumber/regulasi

❌ Menyinkronkan HET setiap beberapa menit

❌ Menghilangkan histori koreksi

❌ Menghapus sistem lama sebelum pilot selesai

❌ Mengubah Command Center dengan sumber harga terpisah

❌ Menyembunyikan fakta bahwa suatu harga sedang menggunakan local override
```

---

# 50. Target Hasil Akhir

Alur operasional akhir:

```text
PETUGAS PASAR
      ↓
INPUT SP2KP
      ↓
SP2KP KEMENDAG
      ↓
SYNC OTOMATIS
      ↓
FIRESTORE DISPERINDAG
      ↓
┌────────────┬──────────────┐
│            │              │
WEBSITE    COMMAND CENTER   CMS
│            │              │
│            │       Monitor / Override
│            │              │
└────────────┴──────────────┘
```

Target:

> **Petugas tidak perlu lagi melakukan input harga Bapok dua kali.**

CMS berubah menjadi:

> **monitoring + sinkronisasi + exception management**

bukan lagi aplikasi input harga harian.

---

# 51. Keputusan Desain Koreksi CMS

Fitur intervensi/koreksi CMS **direkomendasikan**, karena secara operasional dapat terjadi:

- SP2KP terlambat diperbarui;
- data belum closing;
- salah input;
- kesalahan satuan;
- perbedaan hasil verifikasi lapangan;
- kebutuhan menampilkan koreksi sementara.

Tetapi urutan otoritas data harus tetap:

```text
1. SP2KP = sumber utama resmi

2. Local override = pengecualian sementara

3. Data asli SP2KP = selalu dipertahankan

4. Override = wajib alasan + user + waktu + audit trail

5. Setelah SP2KP diperbaiki → sistem kembali ke SP2KP
```

Dengan model tersebut, sistem memperoleh dua keuntungan sekaligus:

1. **otomatisasi penuh tanpa input ganda**, dan
2. **kemampuan administratif untuk menangani kasus khusus tanpa merusak integritas sumber resmi.**

---

# 52. Ringkasan Keputusan Final

```text
SUMBER UTAMA HARGA:
SP2KP Kemendag — Kabupaten Pinrang (7315)

INPUT MANUAL HARIAN:
DIHENTIKAN sebagai workflow utama

CMS:
MONITOR + SYNC + CONTROLLED OVERRIDE

HARGA ASLI SP2KP:
TIDAK BOLEH DITIMPA

OVERRIDE:
SEMENTARA + AUDITABLE + DAPAT DICABUT

HET/HA:
MASTER DATA TERPISAH
SYNC ON-DEMAND

WEBSITE + COMMAND CENTER:
WAJIB MEMBACA SUMBER DATA YANG SAMA
```
