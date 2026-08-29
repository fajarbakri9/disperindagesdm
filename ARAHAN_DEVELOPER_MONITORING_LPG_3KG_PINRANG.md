# ARAHAN DEVELOPER
## Integrasi Sistem Monitoring Distribusi LPG 3 Kg Kabupaten Pinrang

**Target platform:** Website Disperindag ESDM Kabupaten Pinrang yang sedang dibangun  
**Production URL sementara:** https://disperindagesdm-pinrang.web.app/  
**Command Center:** https://disperindagesdm-pinrang.web.app/command-center  
**Tanggal spesifikasi:** 29 Agustus 2026  
**Status dokumen:** Baseline implementasi / developer handoff — revisi Spark-only 30 Agustus 2026

> **KEPUTUSAN ARSITEKTUR FINAL:** MVP wajib berjalan pada Firebase Spark tanpa billing account. Gunakan Firebase Hosting, Firebase Authentication email/password, Cloud Firestore, Security Rules, App Check, dan persistence IndexedDB. Jangan gunakan Cloud Functions, Cloud Run, Firebase Storage, Phone/SMS Auth, BigQuery, atau backend Google Cloud. Jika bagian lama dokumen bertentangan dengan keputusan ini, keputusan Spark-only ini yang berlaku.

---

## 0. PERINTAH UTAMA UNTUK DEVELOPER

Bangun **modul Monitoring Distribusi LPG 3 Kg** sebagai bagian terintegrasi dari aplikasi Disperindag ESDM Kabupaten Pinrang yang sudah berjalan. **Jangan membuat aplikasi Firebase/project terpisah** kecuali setelah audit source code ditemukan alasan teknis atau keamanan yang benar-benar mengharuskan pemisahan.

Modul harus memenuhi kebutuhan pengawasan Disperindag ESDM Kabupaten Pinrang, dengan konsep utama:

1. **Disperindag ESDM berperan sebagai pengawas**, bukan operator transaksi Pertamina.
2. **Agen LPG 3 Kg menjadi pelapor utama** stok masuk dan distribusi ke pangkalan.
3. Agen dapat **menambah, mengubah, dan menghapus/nonaktifkan pangkalan miliknya sendiri**.
4. Agen **tidak boleh** mengelola pangkalan milik agen lain.
5. Semua perubahan master pangkalan dan pergerakan stok harus meninggalkan **audit trail**.
6. Pengisian agen harus sangat sederhana, mobile-first, dapat digunakan dari Android spesifikasi rendah dan koneksi internet yang tidak stabil.
7. Data operasional LPG harus otomatis memasok indikator pada **Command Center**; jangan mempertahankan angka LPG yang diinput manual atau hard-coded setelah modul aktif.
8. Gunakan temuan data resmi ESDM per 31 Maret 2026 sebagai **seed/master awal**, lalu biarkan data berkembang melalui verifikasi Disperindag dan pemutakhiran agen.
9. Jangan menghapus histori distribusi walaupun sebuah pangkalan kemudian dihapus, PHU, pindah agen, atau tidak aktif.
10. Saldo tidak boleh menjadi field yang dapat diedit agen. Saldo dihitung dari agregasi `sum(delta)` pada immutable ledger Firestore; Security Rules memvalidasi bentuk dan kepemilikan setiap event.

---

# 1. KONDISI WEBSITE SAAT INI

Audit pada website yang sedang dibangun menunjukkan fondasi yang sudah cukup baik untuk integrasi modul LPG.

## 1.1 Struktur yang sudah tersedia

Website publik saat ini sudah mempunyai:

- halaman utama portal Disperindag ESDM;
- Portal Pegawai;
- autentikasi pegawai;
- aplikasi petugas lapangan pada `/petugas`;
- CMS administrator pada `/admin`;
- RBAC/manajemen pengguna;
- Command Center pada `/command-center`;
- kanal pengaduan;
- monitoring harga pasar;
- kemetrologian;
- area energi dan LPG.

Sumber audit:

- https://disperindagesdm-pinrang.web.app/
- https://disperindagesdm-pinrang.web.app/petugas
- https://disperindagesdm-pinrang.web.app/admin
- https://disperindagesdm-pinrang.web.app/command-center

## 1.2 Kondisi khusus modul LPG saat ini

Command Center sudah menyiapkan bagian:

- `Gas LPG 3 Kg & ESDM`;
- `HET LPG 3 Kg Subsidi`;
- `Pangkalan Terdaftar`;
- `Penyaluran LPG 3 Kg`;
- `Realisasi Kuota Bulanan Daerah`;
- `Total Alokasi`;
- `Status Distribusi LPG 12 Kecamatan`.

Namun saat audit dilakukan, sebagian nilai masih placeholder, manual, atau belum berasal dari ledger distribusi aktual.

Pada CMS `/admin` juga sudah ada form manual untuk:

- Harga HET;
- Realisasi distribusi kuota (%);
- Realisasi tabung tersalurkan;
- Total kuota bulanan daerah;
- status pengawasan per kecamatan.

### Keputusan implementasi

Setelah modul LPG aktif:

- **HET** tetap dapat berasal dari `settings` yang dikelola admin.
- **Pangkalan terdaftar** harus dihitung dari master pangkalan aktif.
- **Stok agen** harus berasal dari ledger stok.
- **Distribusi hari ini/bulan ini** harus berasal dari agregasi immutable ledger yang sudah diakui Firestore.
- **Realisasi kuota** hanya dihitung jika data alokasi resmi sudah tersedia.
- **Status kecamatan** dihitung dari aktivitas distribusi dan alert, bukan diisi manual sebagai sumber utama.
- Form manual lama dapat dipertahankan hanya sebagai `administrative override` dengan alasan, masa berlaku, dan audit log; default-nya tidak digunakan.

---

# 2. TEMUAN KEAMANAN P0 - WAJIB DISELESAIKAN SEBELUM GO-LIVE

## 2.1 Kredensial developer tampil di halaman login publik

Pada audit halaman:

https://disperindagesdm-pinrang.web.app/login

masih terdapat teks mode pengembang yang mengekspos informasi akun default.

### WAJIB

1. Hapus seluruh username/password default dari HTML produksi.
2. Bila kredensial tersebut pernah benar-benar aktif, **rotasi password segera**.
3. Periksa Firebase Authentication dan nonaktifkan akun demo yang tidak diperlukan.
4. Periksa source repository, Git history, environment files, build artifacts, dan Firebase Hosting hasil deploy untuk credential leakage.
5. Jangan pernah menaruh service account private key di frontend.
6. Aktifkan dan enforce Firebase App Check setelah diuji.
7. Pisahkan konfigurasi `development`, `staging`, dan `production`.
8. Pastikan developer mode tidak dapat diaktifkan hanya melalui query parameter/localStorage di production.

> Firebase Web API config bukan secret, tetapi service-account key, private key, admin credential, password default, dan token server adalah rahasia dan tidak boleh berada di client bundle.

Referensi Firebase App Check:
https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider

---

# 3. DATA AWAL LPG PINRANG YANG DIGUNAKAN

## 3.1 Sumber resmi utama

Gunakan:

**Ditjen Migas Kementerian ESDM - Data Sub Penyalur LPG Tabung 3 Kg, Triwulan I Tahun 2026, posisi 31 Maret 2026, Provinsi Sulawesi Selatan.**

Halaman sumber:
https://migas.esdm.go.id/daftar-sub-penyalur-lpg-3-kg

Dokumen Sulawesi Selatan:
https://migas.esdm.go.id/cms/uploads/informasi-publik/Sub%20Penyalur%20LPG%203%20KG/Sub%20Penyalur%202026/Sulawesi%20Selatan.pdf

Kolom sumber mencakup:

- Regional;
- Provinsi;
- Kabupaten/Kota;
- Kecamatan;
- Kelurahan/Desa;
- Nama Sub Penyalur/Pangkalan;
- Alamat Sub Penyalur;
- Nama Penyalur/Agen.

## 3.2 Baseline pangkalan Kabupaten Pinrang

Hasil isolasi blok `KABUPATEN PINRANG` pada data tersebut menghasilkan **681 entri pangkalan/subpenyalur**.

Baseline per kecamatan yang digunakan pada seed awal:

| Kecamatan normalisasi | Jumlah seed |
|---|---:|
| Batulappa | 6 |
| Cempa | 29 |
| Duampanua | 87 |
| Lanrisang | 39 |
| Lembang | 41 |
| Mattiro Bulu | 63 |
| Mattiro Sompe | 48 |
| Paleteang | 77 |
| Patampanua | 77 |
| Suppa | 66 |
| Tiroang | 26 |
| Watang Sawitto | 122 |
| **TOTAL** | **681** |

### Catatan normalisasi

Dokumen sumber mempunyai sejumlah ejaan/typo yang harus disimpan sebagai `sourceOriginal` tetapi dinormalisasi pada field operasional, antara lain:

- `BATU LAPPA` -> `Batulappa`;
- `LANSIRANG` -> `Lanrisang`;
- `MATIRRO SOMPE` -> `Mattiro Sompe`;
- `WATANG SAWITO` -> `Watang Sawitto`.

Jangan menghilangkan teks asli. Simpan versi asli untuk provenance/audit.

## 3.3 Nama agen yang muncul pada data resmi Maret 2026

Seed master agen dari dokumen ESDM menemukan delapan nama penyalur berikut:

1. PT. GASIFA MULYA PERSADA
2. PT. HAMISA SUKRAH MULYA
3. PT. H. ABD RAHMAN HASYIM
4. PT. NURCAHAYA ENERGI ABADI
5. PT. WAHYU DWI KENCANA MANDIRI
6. PT. NASMAN HAFID MANDIRI
7. PT. H. AMIRUDDIN RAHMAN
8. PT. KAKA MIGAS UTAMA

### Data lebih baru yang harus direkonsiliasi

Pemberitaan tanggal 25-26 Agustus 2026 yang mengutip Kepala Disperindag ESDM Pinrang menyebut terdapat **sembilan agen resmi yang beroperasi di Kabupaten Pinrang**.

Sumber:
https://www.detik.com/sulsel/berita/d-8634012/heboh-emak-emak-di-pinrang-labrak-pangkalan-lpg-ogah-jual-tabung-ke-tetangga

https://www.detik.com/sulsel/berita/d-8634354/terkuak-permainan-harga-lpg-3-kg-di-pinrang-usai-pangkalan-dilabrak-emak-emak

### Aturan data

**Jangan mengarang nama agen ke-9.**

Buat fungsi admin untuk menambahkan agen ke-9 setelah data resmi internal Disperindag/Pertamina tersedia, kemudian lakukan rekonsiliasi master pangkalan.

## 3.4 Kasus PHU Agustus 2026

Terdapat pemberitaan mengenai pangkalan atas nama Ismail di Desa Bungi, Duampanua, yang diputus hubungan usaha oleh agen karena pelanggaran distribusi.

Data ESDM Maret 2026 memiliki entri bernama `ISMAIL NURDIN`, Desa Bungi, di bawah PT. H. Abd Rahman Hasyim.

Jangan otomatis menghapus/menonaktifkan seed tersebut hanya berdasarkan kemiripan nama berita.

Buat `review flag`:

```text
POSSIBLE_PHU_AUG_2026
```

kemudian admin Disperindag melakukan verifikasi manual sebelum status diubah menjadi `PHU`/`INACTIVE`.

Sumber berita:
https://www.detik.com/sulsel/berita/d-8634122/kontrak-pangkalan-lpg-di-pinrang-diputus-gegara-ogah-jual-tabung-ke-tetangga

---

# 4. PRINSIP MASTER DATA: SEED BUKAN KEBENARAN ABSOLUT

Data ESDM Maret 2026 adalah **baseline awal**, bukan database final selamanya.

Setiap pangkalan seed wajib mempunyai metadata:

```json
{
  "sourceType": "ESDM_PUBLIC_SEED",
  "sourceDataset": "SUBPENYALUR_LPG_2026_Q1_SULSEL",
  "sourceDate": "2026-03-31",
  "sourceOriginal": {},
  "verificationStatus": "UNVERIFIED",
  "importBatchId": "seed-2026-q1-pinrang"
}
```

Setelah agen/admin memperbarui data, jangan menimpa provenance.

Simpan dua konsep:

- `sourceOriginal`: snapshot asli, immutable;
- field operasional/current: dapat diperbarui sesuai kewenangan.

Dengan demikian typo pada ESDM dapat dikoreksi tanpa kehilangan jejak sumber.

---

# 5. ARSITEKTUR MODUL DALAM WEBSITE SAAT INI

Gunakan satu ekosistem website yang sama.

## 5.1 Rute yang disarankan

```text
/
/login
/admin
/petugas
/command-center

/lpg
/lpg/agen
/lpg/agen/stok-masuk
/lpg/agen/distribusi
/lpg/agen/pangkalan
/lpg/agen/riwayat

/lpg/admin
/lpg/admin/agen
/lpg/admin/pangkalan
/lpg/admin/distribusi
/lpg/admin/stok
/lpg/admin/peta
/lpg/admin/alert
/lpg/admin/audit
/lpg/admin/pengaturan

/command-center/lpg
```

Jika project saat ini menggunakan file HTML statis/vanilla JS, struktur URL boleh menyesuaikan mekanisme rewrite Firebase Hosting. Jangan memaksakan framework baru hanya untuk modul LPG.

## 5.2 Login

**Jangan membuat sistem autentikasi LPG terpisah.**

Perluas Firebase Auth/RBAC yang sudah ada.

Login agen dapat diarahkan melalui:

```text
/login?redirect=/lpg/agen
```

atau menyediakan landing login berbranding LPG yang tetap menggunakan auth provider dan user store yang sama.

---

# 6. ROLE DAN HAK AKSES

Gunakan role eksplisit.

```text
SUPER_ADMIN
DISPERINDAG_ADMIN
LPG_ADMIN
LPG_MONITOR
LPG_INSPECTOR
LPG_AGENT_ADMIN
LPG_AGENT_OPERATOR
```

## 6.1 SUPER_ADMIN

- seluruh akses;
- role management;
- system settings;
- dapat melakukan recovery data.

## 6.2 DISPERINDAG_ADMIN / LPG_ADMIN

- melihat semua agen;
- melihat semua pangkalan;
- tambah/edit/nonaktifkan agen;
- tambah/edit/nonaktifkan pangkalan mana pun;
- memindahkan pangkalan antar agen dengan workflow khusus;
- verifikasi perubahan;
- monitoring stok dan distribusi;
- melihat audit trail;
- kelola HET/alokasi/settings.

## 6.3 LPG_MONITOR

- read-only seluruh data operasional;
- dashboard;
- laporan;
- peta;
- alert.

## 6.4 LPG_INSPECTOR

- read data seluruh agen/pangkalan;
- input hasil pemeriksaan lapangan;
- update hasil verifikasi lokasi;
- tidak dapat mengubah ledger stok.

## 6.5 LPG_AGENT_ADMIN

Hanya untuk `agentId` yang terikat pada user:

- lihat profil agen sendiri;
- lihat stok agen sendiri;
- input stok masuk;
- input distribusi;
- lihat riwayat sendiri;
- **tambah pangkalan sendiri**;
- **edit pangkalan sendiri**;
- **hapus/nonaktifkan pangkalan sendiri**;
- restore pangkalan yang baru dihapus jika masih diizinkan policy;
- kelola operator agen sendiri jika fitur ini diaktifkan.

Tidak boleh:

- melihat stok internal agen lain;
- mengedit pangkalan agen lain;
- memindahkan pangkalan ke agen lain;
- mengubah atau menghapus transaksi ledger yang sudah tersinkron;
- memodifikasi saldo langsung.

## 6.6 LPG_AGENT_OPERATOR

- input stok masuk;
- input distribusi;
- lihat daftar pangkalan sendiri;
- secara default **tidak** dapat menghapus pangkalan.

Jika pengguna meminta semua operator juga dapat mengelola pangkalan, jadikan permission terpisah:

```text
canManagePangkalan: true/false
```

---

# 7. KONSEP AGEN DAPAT TAMBAH / EDIT / HAPUS PANGKALAN

Ini adalah perubahan penting dari konsep awal.

## 7.1 Tambah pangkalan

Form mobile:

```text
Nama Pangkalan *
Nama Pemilik/PIC
No. HP
Kecamatan *
Desa/Kelurahan *
Alamat *
Latitude
Longitude
Ambil Lokasi GPS
No. Registrasi/Nomor Pangkalan
Alokasi Bulanan
Catatan

[SIMPAN PANGKALAN]
```

### Otomatis oleh sistem

```text
agentId
createdBy
createdAt
updatedAt
status
sourceType
verificationStatus
```

Pangkalan yang dibuat agen:

```text
sourceType: AGENT_CREATED
verificationStatus: PENDING_ADMIN_VERIFICATION
status: ACTIVE
```

Agar operasional tidak terhambat, status dapat langsung `ACTIVE`, tetapi Command Center/Admin harus menunjukkan badge `Belum Diverifikasi` sampai Disperindag melakukan verifikasi.

## 7.2 Duplicate prevention

Sebelum menyimpan, periksa kandidat duplikat berdasarkan:

- normalized name;
- agentId;
- kecamatan;
- desa/kelurahan;
- nomor registrasi jika ada;
- nomor HP jika ada;
- proximity koordinat jika ada.

Jika ditemukan kemiripan:

```text
Pangkalan yang mirip sudah ditemukan:
- HJ. ABC / Desa Bungi

[BUKA DATA]
[TETAP TAMBAHKAN]
[BATAL]
```

Jangan melakukan auto-merge tanpa persetujuan manusia.

## 7.3 Edit pangkalan

Agen dapat mengubah field current.

Setiap edit harus menghasilkan audit diff:

```json
{
  "action": "PANGKALAN_UPDATE",
  "entityId": "PG-00182",
  "agentId": "AG-003",
  "before": {
    "address": "Bungi Pasar"
  },
  "after": {
    "address": "Jl. Poros Bungi Pasar"
  },
  "changedFields": ["address"],
  "actorUid": "...",
  "createdAt": "serverTimestamp"
}
```

## 7.4 Hapus pangkalan

Walaupun UI menggunakan kata **Hapus**, backend **jangan melakukan hard delete** untuk pangkalan yang sudah menjadi bagian rantai distribusi.

Implementasikan:

```text
status = DELETED
isDeleted = true
deletedAt
deletedBy
deleteReason
```

### UI

Saat tombol hapus ditekan:

```text
Hapus pangkalan ini?

Data pangkalan akan hilang dari daftar aktif dan tidak dapat dipilih untuk distribusi baru. Riwayat distribusi lama tetap tersimpan untuk kebutuhan pengawasan.

Alasan penghapusan *
[________________]

[BATAL] [HAPUS PANGKALAN]
```

### Mengapa soft delete wajib

Karena transaksi lama seperti:

```text
AG001 -> PG0182 -> 120 tabung -> 20 Agustus 2026
```

harus tetap dapat dibaca walaupun PG0182 dihapus tanggal 29 Agustus.

## 7.5 Restore

Sediakan restore untuk admin dan, bila diinginkan, `LPG_AGENT_ADMIN`:

```text
DELETED -> ACTIVE
```

dengan audit log.

## 7.6 Pindah agen

Agen **tidak boleh** mengubah `agentId` pangkalannya sendiri menjadi agen lain.

Transfer dilakukan oleh LPG_ADMIN melalui:

```text
TRANSFER_PANGKALAN
fromAgentId
toAgentId
effectiveDate
reason
supportingDocument
```

Histori sebelum tanggal efektif tetap mengacu ke agen lama.

---

# 8. FORM AGEN - PRIORITAS MOBILE LOW-END

Target penggunaan harian agen harus hanya mempunyai tiga aksi utama:

```text
[ + STOK MASUK ]
[ 🚚 DISTRIBUSI ]
[ 🏪 PANGKALAN ]
```

Dashboard agen:

```text
MONITORING LPG 3 KG
PT XXXXX

STOK TERHITUNG
1.240 TABUNG

Hari ini
Masuk        560
Distribusi   420

[ + STOK MASUK ]
[ DISTRIBUSI KE PANGKALAN ]
[ KELOLA PANGKALAN ]

Aktivitas Terakhir
08:41  PG00182  -120
10:14  STOK     +560
```

Tidak perlu grafik berat pada landing agen.

---

# 9. FORM STOK MASUK

Field:

```text
Tanggal diterima *       default hari ini
Jam diterima *           default sekarang
Jumlah tabung isi *
Sumber stok
Nomor DO
Catatan
```

### Jangan menyediakan input stok akhir

Agen hanya mengirim kejadian:

```text
STOCK_IN +560
```

Saldo dihitung sistem.

---

# 10. FORM DISTRIBUSI KE PANGKALAN

Field minimum:

```text
Pangkalan *
Jumlah tabung *
Tanggal distribusi *
Jam *
Nomor DO/nota
Armada/nomor kendaraan
Catatan
```

Foto bukti tidak termasuk MVP Spark. Jangan menyimpan Base64 di Firestore. Evaluasi penyimpanan eksternal atau Blaze hanya melalui keputusan proyek terpisah.

### Pangkalan harus berasal dari master agen

Query hanya:

```text
agentId == currentUser.agentId
status == ACTIVE
isDeleted == false
```

Jangan gunakan text bebas sebagai nama pangkalan penerima.

### UX pencarian

Karena satu agen dapat mempunyai banyak pangkalan:

```text
Cari nama / desa / alamat...
```

Tampilkan:

```text
HJ. ABC
Bungi - Duampanua
```

---

# 11. MODEL LEDGER STOK

## 11.1 Prinsip

Jangan menjadikan `currentStock` hasil input manual.

Formula:

```text
STOK AGEN = SUM(delta) pada immutable ledger agen

OPENING_BALANCE  delta positif
STOCK_IN         delta positif
DISTRIBUTION     delta negatif
CORRECTION       delta positif/negatif
```

## 11.2 Transaksi tersinkron tidak boleh diedit/hapus

Jika salah input:

```text
DISTRIBUTION -120
CORRECTION    +20
```

bukan mengganti 120 menjadi 100 secara diam-diam.

## 11.3 Opening balance

Saat agen pertama kali go-live, admin/agen dapat membuat:

```text
OPENING_BALANCE
```

Tetapi harus:

- satu kali per periode inisialisasi;
- mempunyai timestamp;
- mempunyai actor;
- dapat diaudit;
- koreksi setelah itu memakai `ADJUSTMENT`.

---

# 12. DESAIN OFFLINE-FIRST YANG AMAN

Cloud Firestore mendukung cache/offline pada web bila persistence diaktifkan, dan akan menyinkronkan perubahan ketika jaringan kembali. Namun perubahan pada dokumen yang sama pada client dapat berperilaku `last write wins`.

Referensi:
https://firebase.google.com/docs/firestore/manage-data/enable-offline

Karena itu:

## Jangan

Client mengubah:

```text
lpg_agents/{agentId}.currentStock
```

secara langsung.

## Gunakan dokumen ledger immutable

Client membuat event baru:

```text
/lpg_events/{eventId}
```

Jika offline, Firestore menyimpan event di local cache dan sync saat jaringan tersedia.

Dokumen dianggap tersinkron setelah server Firestore mengakui write. Tidak ada workflow `PENDING → POSTED` dan tidak ada processor Cloud Functions.

### UX offline

```text
✓ Tersimpan di perangkat
☁ Menunggu sinkronisasi
```

setelah Firestore menerima:

```text
✓ Tersinkron
✓ Transaksi tercatat
```

### Idempotency

Setiap submit membuat UUID di client:

```text
clientEventId
```

Gunakan `clientEventId` sebagai document ID agar pengiriman ulang menghasilkan write idempoten pada dokumen yang sama. Rules melarang update, sehingga payload berbeda dengan ID sama akan ditolak.

---

# 13. FIRESTORE DATA MODEL

Gunakan namespace prefix `lpg_` agar tidak bertabrakan dengan collection existing.

```text
/lpg_agents
/lpg_pangkalan
/lpg_events
/lpg_daily_agent_summaries
/lpg_daily_kecamatan_summaries
/lpg_alerts
/lpg_audit_logs
/lpg_inspections
/lpg_settings
/lpg_dashboard
```

---

# 14. SCHEMA `lpg_agents`

Contoh:

```json
{
  "id": "AG-001",
  "name": "PT. GASIFA MULYA PERSADA",
  "normalizedName": "PT GASIFA MULYA PERSADA",
  "status": "ACTIVE",
  "officialCode": null,
  "address": null,
  "phone": null,
  "latitude": null,
  "longitude": null,
  "monthlyAllocation": null,
  "sourceType": "ESDM_PUBLIC_SEED",
  "sourceDate": "2026-03-31",
  "verificationStatus": "PENDING_RECONCILIATION",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### Jangan memakai nama PT sebagai document ID

Gunakan ID stabil:

```text
AG-001
AG-002
...
```

---

# 15. SCHEMA `lpg_pangkalan`

```json
{
  "id": "PG-000001",
  "agentId": "AG-001",

  "name": "LACINTA",
  "normalizedName": "LACINTA",
  "ownerName": null,
  "phone": null,
  "registrationNumber": null,

  "kecamatan": "Batulappa",
  "desaKelurahan": "Desa Batulappa",
  "address": "Batulappa",

  "latitude": null,
  "longitude": null,
  "locationVerification": "UNVERIFIED",

  "monthlyAllocation": null,
  "weeklyAllocation": null,

  "status": "ACTIVE",
  "isDeleted": false,

  "verificationStatus": "UNVERIFIED",

  "sourceType": "ESDM_PUBLIC_SEED",
  "sourceDate": "2026-03-31",
  "sourceOriginal": {
    "kecamatan": "BATU LAPPA",
    "kelurahan": "DESA BATU LAPPA",
    "namaSubPenyalur": "LACINTA",
    "alamatSubPenyalur": "BATULAPPA",
    "namaPenyalur": "PT. GASIFA MULYA PERSADA"
  },

  "createdBy": "SEED_IMPORT",
  "createdAt": "serverTimestamp",
  "updatedBy": null,
  "updatedAt": "serverTimestamp",

  "deletedAt": null,
  "deletedBy": null,
  "deleteReason": null
}
```

---

# 16. SCHEMA `lpg_events`

Semua pergerakan stok gunakan satu ledger event.

## 16.1 STOCK_IN

```json
{
  "id": "EVT-UUID",
  "clientEventId": "UUID",
  "type": "STOCK_IN",
  "agentId": "AG-001",
  "pangkalanId": null,
  "quantity": 560,
  "delta": 560,
  "effectiveAt": "timestamp",
  "doNumber": "...",
  "note": null,
  "createdBy": "uid",
  "createdAt": "serverTimestamp"
}
```

## 16.2 DISTRIBUTION

```json
{
  "id": "EVT-UUID",
  "clientEventId": "UUID",
  "type": "DISTRIBUTION",
  "agentId": "AG-001",
  "pangkalanId": "PG-000182",
  "quantity": 120,
  "delta": -120,
  "effectiveAt": "timestamp",
  "doNumber": "...",
  "vehicleNumber": "...",
  "createdBy": "uid",
  "createdAt": "serverTimestamp"
}
```

## 16.3 Snapshot pangkalan pada transaksi

Client mengambil snapshot dari master pangkalan yang sudah dibaca sesuai hak akses dan menyertakannya ketika membuat transaksi. Security Rules tetap memvalidasi `pangkalanId` dan `agentId`; snapshot hanya untuk tampilan historis.

```json
{
  "pangkalanSnapshot": {
    "name": "...",
    "kecamatan": "...",
    "desaKelurahan": "...",
    "agentId": "AG-001"
  }
}
```

Tujuannya agar laporan historis tidak berubah ketika master pangkalan diedit.

---

# 17. SALDO HASIL AGREGASI

Jangan menggunakan collection `lpg_balances` sebagai sumber kebenaran MVP. Hitung saldo dengan aggregation query Firestore `sum(delta)` yang dibatasi `agentId` dan periode bila diperlukan. Client tidak pernah mengirim atau mengedit `currentStock`.

---

# 18. VALIDASI SPARK-ONLY TANPA SERVER RUNTIME

Tidak ada Cloud Functions atau server runtime pada MVP. Alurnya:

```text
Firebase Auth → Firestore Security Rules → immutable lpg_events → sum(delta)
```

Security Rules wajib memvalidasi UID, role/agentId, tipe transaksi, integer `quantity`, hubungan `delta`, kepemilikan pangkalan, `createdAt == request.time`, serta melarang update/delete ledger.

Saldo negatif tidak ditolak. Transaksi tetap diterima sebagai laporan pengawasan dan UI/Command Center menampilkan anomali stok agar Disperindag dapat menindaklanjuti data yang belum lengkap atau tidak konsisten.

---

# 19. AUDIT TRAIL

Wajib log untuk:

- login tertentu yang sensitif bila infrastructure mendukung;
- tambah agen;
- edit agen;
- nonaktifkan agen;
- tambah pangkalan;
- edit pangkalan;
- delete pangkalan;
- restore pangkalan;
- transfer pangkalan;
- perubahan alokasi;
- perubahan HET;
- opening balance;
- stock adjustment;
- rejection/correction event;
- admin override.

Schema:

```json
{
  "action": "PANGKALAN_DELETE",
  "entityType": "PANGKALAN",
  "entityId": "PG-000182",
  "agentId": "AG-003",
  "actorUid": "uid",
  "actorRole": "LPG_AGENT_ADMIN",
  "before": {},
  "after": {},
  "reason": "...",
  "createdAt": "serverTimestamp",
  "ipHash": null,
  "userAgentSummary": null
}
```

Audit log tidak boleh dapat diedit oleh agen.

---

# 20. SECURITY RULES - LOGIKA WAJIB

Gunakan Firebase Security Rules ditambah validasi server.

**Rules bukan pengganti backend validation.**

Prinsip:

```text
Agen hanya read data dengan agentId miliknya.
Agen hanya create event dengan agentId miliknya.
Agen hanya dapat membuat event immutable miliknya dengan `delta` yang valid.
Agen tidak dapat update balance.
Agen tidak dapat update audit log.
Agen hanya mengelola pangkalan agentId miliknya.
Agen tidak dapat mengganti agentId sebuah pangkalan.
Admin dapat mengakses lintas agen sesuai role.
```

Skeleton konsep:

```javascript
function signedIn() {
  return request.auth != null;
}

function isLpgAdmin() {
  return signedIn() &&
    request.auth.token.role in ['SUPER_ADMIN', 'DISPERINDAG_ADMIN', 'LPG_ADMIN'];
}

function isAgentUser() {
  return signedIn() &&
    request.auth.token.agentId != null;
}

function ownsAgent(agentId) {
  return isAgentUser() && request.auth.token.agentId == agentId;
}
```

Untuk role/agent mapping dapat menggunakan custom claims dan/atau dokumen user existing. Jangan mengandalkan nilai role yang dikirim dari form client.

Firebase field access perlu diperhatikan karena Firestore read berada pada level dokumen; data privat yang harus dibatasi sebaiknya dipisahkan ke dokumen/collection terpisah.

Referensi:
https://firebase.google.com/docs/firestore/security/rules-fields

---

# 21. FIREBASE APP CHECK

Aktifkan App Check secara bertahap:

1. register web app;
2. reCAPTCHA Enterprise provider;
3. monitor metrics;
4. enforce Firestore;
5. enforce Storage;
6. enforce Functions bila relevan.

Referensi:
https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider

Jangan langsung enforce tanpa testing staging karena dapat memutus aplikasi lama yang belum mengirim token App Check.

---

# 22. PWA DAN LOW-END SMARTPHONE

Portal agen harus menjadi PWA ringan.

## Performance budget yang disarankan

- jangan load library chart pada route agen;
- jangan load map pada halaman utama agen;
- lazy-load kamera/map;
- initial JS route agen idealnya <= 250 KB gzip;
- CSS seperlunya;
- tidak memuat atau mengunggah foto bukti pada MVP Spark;
- thumbnail kecil;
- pagination/virtual list untuk pangkalan;
- hindari animasi berat/backdrop blur masif;
- touch target minimum 44 px;
- font sistem/local fallback;
- form dapat digunakan satu tangan.

Website `/petugas` saat ini sudah mempunyai filosofi kompresi foto untuk penggunaan lapangan. Pertahankan pola ringan tersebut pada modul LPG.

## PWA

Sediakan:

```text
manifest.webmanifest
service worker
install prompt yang tidak agresif
offline shell
cache static asset
```

Jangan cache data privat secara permanen di perangkat publik tanpa pertimbangan trusted device.

Firestore Web offline persistence secara default tidak aktif dan perlu dikonfigurasi.

Referensi:
https://firebase.google.com/docs/firestore/manage-data/enable-offline

---

# 23. HALAMAN `KELOLA PANGKALAN` UNTUK AGEN

Mobile layout:

```text
PANGKALAN SAYA                         [+ TAMBAH]

Cari nama/desa...
[ Semua ] [ Aktif ] [ Belum Verifikasi ] [ Nonaktif ]

-----------------------------------
HJ. ABC
Bungi - Duampanua
Aktif • Belum Diverifikasi
[EDIT] [HAPUS]
-----------------------------------
TOKO XYZ
Pekkabata - Duampanua
Aktif • Terverifikasi
[EDIT] [HAPUS]
```

Tampilkan jumlah:

```text
Aktif 74 | Belum verifikasi 6 | Nonaktif 2
```

Desktop admin boleh memakai tabel lengkap.

---

# 24. COMMAND CENTER - JANGAN QUERY 681 PANGKALAN SETIAP REFRESH

Command Center adalah wallboard. Jangan memasang listener seluruh histori. Gunakan aggregation query `count()`/`sum()` dengan filter tanggal, agen, atau kecamatan dan refresh maksimal setiap 5 menit plus tombol **Refresh Sekarang**.

Dokumen ringkasan materialized tidak menjadi kewajiban MVP karena tidak ada backend/scheduled Functions. Jika admin membuat snapshot administratif, snapshot harus memiliki waktu, aktor, sumber, dan tidak boleh menggantikan ledger sebagai sumber kebenaran.

## Bentuk hasil agregasi untuk renderer Command Center

```json
{
  "activeAgents": 9,
  "activePangkalan": 680,
  "unverifiedPangkalan": 0,
  "stockAtAgents": 8420,
  "stockInToday": 12320,
  "distributedToday": 11840,
  "distributedThisMonth": 0,
  "allocationThisMonth": null,
  "allocationRealizationPct": null,
  "agentsReportedToday": 8,
  "agentsLate": 1,
  "criticalAlerts": 2,
  "updatedAt": "serverTimestamp"
}
```

**Angka contoh di atas hanya schema/UI sample, bukan angka aktual.**

---

# 25. KPI COMMAND CENTER LPG

Ganti indikator placeholder dengan:

## Baris utama

```text
AGEN AKTIF
PANGKALAN AKTIF
STOK AGEN SAAT INI
STOK MASUK HARI INI
DISTRIBUSI HARI INI
```

## Pelaporan

```text
AGEN SUDAH MELAPOR HARI INI
AGEN BELUM ADA AKTIVITAS
LAST UPDATE
```

## Distribusi

```text
PANGKALAN MENERIMA KIRIMAN HARI INI
PANGKALAN > X HARI TANPA KIRIMAN
KECAMATAN DENGAN DISTRIBUSI AKTIF
```

## Alokasi

Hanya tampilkan jika `allocationThisMonth != null`:

```text
REALISASI ALOKASI
= distributedThisMonth / allocationThisMonth * 100
```

Jika belum ada master alokasi resmi:

```text
ALOKASI: DATA BELUM TERSEDIA
```

**Jangan menampilkan 84.5% atau nilai contoh sebagai data faktual.**

---

# 26. STATUS PELAPORAN AGEN

Pisahkan `stock status` dan `reporting status`.

Contoh:

```text
PT A   16:42   NORMAL
PT B   15:27   NORMAL
PT C   kemarin BELUM ADA AKTIVITAS HARI INI
```

Jangan menganggap tidak ada laporan = stok kosong.

## Reporting health

Contoh konfigurasi:

```text
NORMAL       activity <= 12h
STALE        activity > 12h
LATE         activity > 24h
```

Threshold harus berada di `lpg_settings`, bukan hard-coded.

---

# 27. DEFINISI STATUS STOK

Karena stok agen berbeda kapasitas/alokasi, jangan menetapkan status hanya berdasarkan angka absolut tanpa konfigurasi.

Dapat menggunakan:

```text
stock / avgDailyDistribution
```

atau:

```text
stock / configuredMinimumStock
```

Tahap MVP cukup:

```text
AVAILABLE
LOW
CRITICAL
ZERO
UNKNOWN
```

`UNKNOWN` penting untuk agen yang belum melakukan opening balance.

---

# 28. PETA GIS DISTRIBUSI

Bangun pada `/lpg/admin/peta` dan versi ringkas `/command-center/lpg`.

Layer:

1. batas kecamatan;
2. titik agen;
3. titik pangkalan;
4. garis distribusi Agen -> Pangkalan;
5. optional service area;
6. alert/inspection.

## Filter

```text
Agen
Kecamatan
Desa/Kelurahan
Status pangkalan
Status verifikasi
Tanggal distribusi terakhir
```

## Klik pangkalan

```text
Nama
Agen
Desa/Kecamatan
Status
Verifikasi lokasi
Kiriman terakhir
Jumlah kiriman terakhir
Total bulan berjalan
```

## Koordinat

Seed ESDM tidak menyediakan koordinat presisi untuk seluruh pangkalan.

Jangan mengarang titik lokasi.

Gunakan:

```text
latitude: null
longitude: null
locationVerification: UNVERIFIED
```

Agen/petugas dapat menekan:

```text
[AMBIL LOKASI SAYA]
```

atau admin menempatkan pin pada peta.

---

# 29. JANGKAUAN DISTRIBUSI / SERVICE AREA

Tahap 1:

- jangkauan berdasarkan desa/kelurahan pangkalan;
- garis Agen -> Pangkalan;
- statistik jumlah pangkalan per wilayah.

Tahap 2:

Tambahkan:

```text
serviceAreaType: VILLAGE | RADIUS | POLYGON
serviceVillageIds: []
serviceRadiusMeters
servicePolygonGeoJSON
```

Jangan menganggap radius otomatis sebagai wilayah kontrak resmi. Polygon/jangkauan harus diverifikasi oleh Disperindag/agen berdasarkan dokumen yang tersedia.

---

# 30. ALERT ENGINE

MVP alert:

```text
AGENT_NO_ACTIVITY_24H
PANGKALAN_NO_DELIVERY_X_DAYS
STOCK_ZERO
STOCK_LOW
EVENT_REJECTED
PANGKALAN_CREATED_UNVERIFIED
PANGKALAN_LOCATION_UNVERIFIED
DUPLICATE_PANGKALAN_CANDIDATE
```

Tahap berikut:

```text
DISTRIBUTION_SPIKE
ALLOCATION_OVER_REALIZATION
OUT_OF_SERVICE_AREA
STOCK_VARIANCE
REPEATED_CORRECTION
```

Alert harus dapat:

```text
OPEN
ACKNOWLEDGED
RESOLVED
DISMISSED
```

serta menyimpan siapa dan kapan menyelesaikan.

---

# 31. PENGADUAN DAN SIDAK EXISTING

Website sudah mempunyai kanal pengaduan dan `/petugas` mencantumkan sidak LPG.

Jangan membuat data pengaduan LPG terpisah tanpa relasi.

Tambahkan optional foreign keys:

```text
complaint.pangkalanId
complaint.agentId
inspection.pangkalanId
inspection.agentId
```

Dengan demikian admin dapat membuka pangkalan dan melihat:

```text
Riwayat distribusi
Riwayat pengaduan
Riwayat sidak
Riwayat perubahan master
```

---

# 32. ALOKASI / KUOTA

Jangan memaksakan data kuota jika belum tersedia.

Schema pangkalan dan agen sudah menyiapkan field:

```text
monthlyAllocation
allocationEffectiveMonth
allocationSource
allocationDocument
```

Ketika data resmi tersedia:

```text
allocation_realization = posted_distribution / allocation
```

Jangan memakai seed asumsi untuk kuota.

---

# 33. HET

HET disimpan di:

```text
/lpg_settings/current
```

Contoh:

```json
{
  "hetPangkalan": 18500,
  "currency": "IDR",
  "effectiveDate": "...",
  "legalBasis": "...",
  "updatedBy": "uid",
  "updatedAt": "serverTimestamp"
}
```

Nilai harus diverifikasi oleh Disperindag sebelum production. Jangan menjadikan contoh UI sebagai dasar hukum.

---

# 34. IMPORT SEED DATA 681 PANGKALAN

Buat script admin/server, misalnya:

```text
scripts/import-lpg-pinrang-seed.mjs
```

Jangan melakukan import 681 row dari browser biasa.

Firebase merekomendasikan server client/bulk strategy untuk bulk data dibanding serialized writes dari mobile/web client.

Referensi:
https://firebase.google.com/docs/firestore/manage-data/transactions

## Proses import

```text
1. Parse source
2. Filter Kabupaten/Kota == KABUPATEN PINRANG
3. Normalize kecamatan
4. Normalize desa/kelurahan presentation
5. Normalize agent name untuk matching
6. Map ke agentId seed
7. Generate PG ID
8. Store sourceOriginal
9. Set UNVERIFIED
10. Bulk write
11. Generate import report
12. Verify count == 681
13. Verify kecamatan totals == baseline
14. Verify all seed rows have agentId
15. Report unknown agent names / duplicate candidates
```

## Import harus idempotent

Gunakan stable source key, misalnya hash:

```text
sourceDate + originalAgent + originalName + originalKecamatan + originalKelurahan + originalAddress
```

atau dedicated `sourceRowKey`.

Jalankan dry-run terlebih dahulu.

---

# 35. REKONSILIASI DATA SETELAH IMPORT

Admin page:

```text
REKONSILIASI MASTER LPG

Seed ESDM             681
Terverifikasi agen    xxx
Diubah agen           xx
Ditambah baru         xx
Dihapus/nonaktif      xx
Belum diverifikasi    xx
```

Per agen:

```text
PT XXXXX
Seed: 74
Aktif saat ini: 76
Tambah: 4
Hapus: 2
Belum verifikasi: 3
```

Ini akan menjawab perubahan data setelah Maret 2026 tanpa merusak baseline.

---

# 36. DASHBOARD PER AGEN UNTUK DISPERINDAG

Detail:

```text
PT XXXXX

Stok sekarang
Stok masuk hari ini
Distribusi hari ini
Distribusi bulan ini
Pangkalan aktif
Pangkalan belum terverifikasi
Aktivitas terakhir

[LIHAT PANGKALAN]
[LIHAT TRANSAKSI]
[LIHAT PETA]
[LIHAT AUDIT]
```

Grafik boleh ada pada dashboard admin, tetapi jangan wajib pada portal agen.

---

# 37. LAPORAN

Minimal export:

## Harian

```text
Tanggal
Agen
Stok awal
Stok masuk
Distribusi
Adjustment
Stok akhir
```

## Distribusi per pangkalan

```text
Tanggal
Agen
Pangkalan
Kecamatan
Desa
Jumlah
DO
Operator
Status
```

## Bulanan

```text
Agen
Total stok masuk
Total distribusi
Jumlah pangkalan terlayani
Allocation
Realisasi %
```

## Master

```text
Agen
Pangkalan
Alamat
Kecamatan
Desa
Status
Source
Verification
Last delivery
```

CSV/XLSX lebih penting untuk operasional daripada langsung PDF. PDF dapat ditambahkan untuk laporan resmi.

---

# 38. INTEGRASI COMMAND CENTER EXISTING

Tab `4. Gas LPG 3 Kg & ESDM` harus diubah menjadi data driven.

## Sebelum

```text
HET: placeholder/manual
Pangkalan: placeholder
Realisasi: -- / angka contoh
Status kecamatan: terkendali
```

## Sesudah

```text
HET -> lpg_settings
Pangkalan -> count ACTIVE
Agen -> count ACTIVE
Stok -> aggregation query `sum(delta)` pada `lpg_events`
Masuk hari ini -> summary
Distribusi hari ini -> summary
Realisasi -> allocation data bila ada
Status kecamatan -> lpg_kecamatan_summaries
Update terakhir -> summary updatedAt
```

Command Center harus menampilkan label `DATA TERAKHIR` berdasarkan timestamp data LPG aktual untuk modul LPG, bukan hanya timestamp statis halaman.

---

# 39. UI COMMAND CENTER YANG DISARANKAN

```text
┌─────────────────────────────────────────────────────┐
│ PENGAWASAN DISTRIBUSI LPG 3 KG - KABUPATEN PINRANG │
├─────────────────────────────────────────────────────┤
│ AGEN AKTIF | PANGKALAN | STOK AGEN | DISTRIBUSI    │
├─────────────────────────────────────────────────────┤
│ PETA 12 KECAMATAN        │ STATUS PELAPORAN AGEN   │
│                          │                          │
│                          │ PT A  NORMAL             │
│                          │ PT B  TERLAMBAT          │
├──────────────────────────┴──────────────────────────┤
│ ALERT: Pangkalan belum distribusi / stok kritis    │
└─────────────────────────────────────────────────────┘
```

Gunakan desain visual yang konsisten dengan Command Center existing.

---

# 40. DATA PRIVACY DAN PUBLIK VS INTERNAL

Jangan tampilkan seluruh data internal ke halaman publik.

## Public

Boleh dipertimbangkan:

- jumlah pangkalan resmi;
- peta lokasi pangkalan aktif yang memang boleh dipublikasikan;
- HET;
- kanal pengaduan;
- informasi umum distribusi.

## Internal only

- stok detail tiap agen;
- DO;
- nomor HP PIC;
- audit log;
- operator;
- bukti dokumen;
- internal alert;
- koreksi stok;
- data penegakan/pemeriksaan yang belum final.

Pisahkan collection/dokumen private jika field perlu mempunyai hak baca berbeda.

---

# 41. FOTO / STORAGE

Jika upload bukti:

Path:

```text
lpg/{agentId}/{year}/{month}/events/{eventId}/proof.webp
lpg/{agentId}/pangkalan/{pangkalanId}/photo.webp
```

Rules:

- agen hanya upload di folder agentId sendiri;
- maksimal ukuran;
- whitelist MIME;
- kompres sebelum upload;
- metadata event tetap Firestore;
- Storage URL jangan menjadi sumber authorization.

---

# 42. INDEX FIRESTORE YANG DIPERLUKAN

Siapkan composite indexes untuk query seperti:

```text
lpg_pangkalan: agentId + status + normalizedName
lpg_pangkalan: agentId + isDeleted + kecamatan
lpg_events: agentId + status + effectiveAt desc
lpg_events: agentId + type + effectiveAt desc
lpg_events: pangkalanId + status + effectiveAt desc
lpg_alerts: status + severity + createdAt desc
lpg_audit_logs: agentId + createdAt desc
```

Jangan membuat query tanpa batas pada seluruh event.

---

# 43. COST CONTROL FIREBASE

Agar biaya tetap rendah:

1. Command Center membaca summary documents, bukan scan transaksi.
2. Pagination riwayat.
3. Limit real-time listener hanya data yang benar-benar perlu live.
4. Jangan listen ke semua 681 pangkalan pada portal agen.
5. Map data dimuat sesuai viewport/filter jika nanti membesar.
6. Simpan aggregate harian.
7. Foto dikompresi.
8. Matikan listener ketika tab tidak aktif jika tidak dibutuhkan.

---

# 44. ERROR HANDLING

Jangan hanya menampilkan `Something went wrong`.

Contoh:

```text
Stok tidak mencukupi.
Stok sistem: 80 tabung
Distribusi diminta: 120 tabung
```

```text
Pangkalan sudah tidak aktif dan tidak dapat menerima distribusi baru.
```

```text
Data tersimpan di perangkat dan akan dikirim saat internet kembali.
```

```text
Transaksi tertolak server. Tidak ada perubahan pada stok.
```

---

# 45. VALIDATION

## Quantity

- integer;
- > 0;
- reasonable upper bound configurable;
- server validates kembali.

## Date

Jangan membiarkan tanggal distribusi terlalu jauh ke masa depan.

Backdate dapat diizinkan dengan aturan:

```text
LPG_AGENT_OPERATOR: <= 1 hari
LPG_AGENT_ADMIN: <= X hari
LPG_ADMIN: override dengan alasan
```

Policy final ditentukan Disperindag.

---

# 46. TIMEZONE

Gunakan:

```text
Asia/Makassar
WITA (UTC+8)
```

Simpan timestamp Firestore/UTC, format tampilan menjadi WITA.

Jangan menyimpan tanggal lokal hanya dalam string untuk kalkulasi.

---

# 47. NOMOR ID

Gunakan UUID atau Firestore ID internal.

Display code boleh:

```text
AG-001
PG-000001
```

Jangan bergantung pada display code sebagai security boundary.

---

# 48. STATUS PANGKALAN

Gunakan enum:

```text
ACTIVE
INACTIVE
SUSPENDED
PHU
DELETED
```

Verification:

```text
UNVERIFIED
PENDING_ADMIN_VERIFICATION
VERIFIED
REJECTED
```

Jangan mencampur status operasional dan status verifikasi.

---

# 49. RIWAYAT PERUBAHAN PANGKALAN

Pada halaman detail:

```text
RIWAYAT DATA

29 Agu 2026 14:02
Alamat diubah
Bungi -> Jl. Poros Bungi
oleh Operator Agen

29 Agu 2026 15:11
Koordinat ditambahkan
oleh Petugas Disperindag
```

Ini sangat penting karena agen memiliki hak edit.

---

# 50. DATA DISTRIBUSI TIDAK BOLEH BERUBAH KARENA EDIT MASTER

Contoh:

Tanggal 1 Agustus:

```text
Pangkalan A / Desa Bungi
```

Tanggal 20 Agustus nama berubah:

```text
Pangkalan Hj. A / Desa Bungi
```

Laporan transaksi 1 Agustus tetap dapat menunjukkan snapshot historis nama saat transaksi, sementara link detail membuka master terbaru.

---

# 51. ADMIN REVIEW QUEUE

Karena agen dapat memelihara pangkalan, buat queue:

```text
PERUBAHAN PANGKALAN

3 Baru
7 Diedit
2 Dihapus
5 Lokasi baru
```

Admin dapat:

```text
[VERIFIKASI]
[TANDAI PERLU PERBAIKAN]
[LIHAT AUDIT]
```

Tidak semua perubahan harus menunggu approval sebelum operasional, kecuali Disperindag memilih mode strict approval.

Sediakan setting:

```text
pangkalanChangesRequireApproval: false
```

Jika `false`, perubahan berlaku langsung tetapi ditandai pending verification.

---

# 52. REKONSILIASI PERIODIK DENGAN ESDM/PERTAMINA

Data lokal akan berubah karena agen dapat menambah/hapus pangkalan.

Maka saat ESDM menerbitkan dataset baru:

```text
IMPORT NEW REFERENCE
        ↓
COMPARE
        ↓
MATCHED
NEW IN ESDM
MISSING IN ESDM
LOCAL ONLY
AGENT CHANGED
NAME/ADDRESS CHANGED
```

Jangan overwrite database lokal otomatis.

Buat halaman diff/reconciliation.

---

# 53. LOGIKA PENGHAPUSAN DAN DATA RESMI

Jika agen menghapus seed ESDM:

```text
sourceOriginal tetap ada
status DELETED
```

Admin bisa melihat:

```text
Sumber ESDM: terdaftar 31/03/2026
Status lokal: dihapus agen 29/08/2026
Alasan: hubungan usaha berakhir
```

Ini justru menjadi data pengawasan yang bernilai.

---

# 54. MIGRASI COMMAND CENTER MANUAL -> OTOMATIS

Lakukan bertahap.

## Stage A

Modul LPG berjalan, Command Center lama masih manual.

## Stage B

Bandingkan angka otomatis dengan laporan existing.

## Stage C

Aktifkan `lpg_dashboard/current` sebagai sumber utama.

## Stage D

Matikan input manual metrik distribusi umum atau ubah menjadi override terkontrol.

Jangan langsung mengganti production KPI sebelum data agen berjalan stabil.

---

# 55. IMPLEMENTATION PHASE

## PHASE 0 - Security & repository audit

- backup project;
- branch baru;
- hapus credential developer publik;
- rotate credential;
- review Firebase Rules;
- review Auth/RBAC;
- review secrets;
- staging environment.

## PHASE 1 - Master data

- create collections;
- seed 8 agen ESDM;
- import 681 pangkalan;
- normalize kecamatan;
- reconciliation page;
- tambah agen ke-9 setelah verifikasi internal.

## PHASE 2 - Agent portal

- login/RBAC;
- dashboard sederhana;
- stock in;
- distribution;
- pangkalan CRUD/soft delete;
- history;
- offline queue.

## PHASE 3 - Backend ledger

- event processor;
- balance;
- idempotency;
- correction;
- summaries;
- alerts;
- audit.

## PHASE 4 - Admin monitoring

- agent dashboard;
- pangkalan manager;
- review queue;
- transaction explorer;
- reports.

## PHASE 5 - Command Center

- integrate live summary;
- replace placeholders;
- status reporting;
- alert ticker.

## PHASE 6 - GIS

- coordinate verification;
- agent/pangkalan map;
- route lines;
- service coverage.

## PHASE 7 - Allocation & advanced analytics

- monthly allocation;
- realization;
- anomalies;
- trend;
- coverage gaps.

---

# 56. ACCEPTANCE TEST - WAJIB

## Security

- [ ] halaman production tidak menampilkan username/password default;
- [ ] agent A tidak dapat read/write private data agent B;
- [ ] agent tidak dapat mengedit field saldo karena saldo bukan dokumen input;
- [ ] agent tidak dapat update/delete immutable ledger;
- [ ] App Check tested;
- [ ] tidak ada Firebase Storage/Cloud Functions pada MVP Spark.

## Seed

- [ ] total import Pinrang = 681;
- [ ] total 12 kecamatan = 681;
- [ ] semua row mempunyai sourceOriginal;
- [ ] semua row mempunyai agent mapping;
- [ ] tidak ada agent ke-9 fiktif;
- [ ] reconciliation report tersimpan.

## Pangkalan

- [ ] agent bisa tambah pangkalan;
- [ ] agent bisa edit pangkalan;
- [ ] agent bisa hapus pangkalan dari daftar aktif;
- [ ] penghapusan tidak menghapus histori;
- [ ] agent tidak bisa mengganti agentId;
- [ ] edit menghasilkan audit diff;
- [ ] deleted pangkalan tidak muncul pada pilihan distribusi;
- [ ] admin dapat restore.

## Ledger

- [ ] stock in menambah saldo;
- [ ] distribution mengurangi saldo;
- [ ] saldo negatif ditandai sebagai anomali, bukan ditolak/disembunyikan;
- [ ] `clientEventId` sebagai document ID mencegah duplicate submit;
- [ ] event tersinkron tidak dapat diedit agent;
- [ ] correction memakai event baru.

## Offline

- [ ] form dapat disimpan saat offline;
- [ ] UI menunjukkan pending sync;
- [ ] reconnect melakukan sync;
- [ ] Firestore Security Rules memvalidasi write setelah sync;
- [ ] tidak terjadi double submit.

## Command Center

- [ ] jumlah pangkalan berasal dari data live;
- [ ] stok berasal dari `sum(delta)` immutable ledger;
- [ ] distribusi berasal dari agregasi event `DISTRIBUTION`;
- [ ] timestamp update aktual;
- [ ] tidak ada angka contoh/hard-coded dianggap fakta;
- [ ] allocation menampilkan unavailable bila data belum ada.

---

# 57. TEST CASE PENTING

## Case 1 - Pangkalan dihapus setelah pernah menerima distribusi

```text
PG001 menerima 120
Agent delete PG001
```

Expected:

```text
PG001 tidak dapat dipilih lagi
transaksi 120 tetap ada
laporan historis tetap benar
```

## Case 2 - Dua operator mengirim distribusi bersamaan

Saldo 150.

Operator A kirim 100.
Operator B kirim 100.

Expected:

```text
kedua laporan tersimpan sebagai ledger immutable
saldo hasil agregasi menjadi -50
Command Center menampilkan ANOMALI STOK / DATA TIDAK KONSISTEN
```

## Case 3 - Offline double tap

Operator tap Simpan dua kali.

Expected:

```text
clientEventId/idempotency mencegah posting ganda
```

## Case 4 - Pangkalan baru saat offline

Expected:

```text
tersimpan pending
sync saat online
muncul di master setelah server menerima
```

## Case 5 - Edit pangkalan seed

Expected:

```text
sourceOriginal tidak berubah
current field berubah
audit log dibuat
```

---

# 58. UX COPY YANG DISARANKAN

Gunakan bahasa sederhana.

### Jangan

```text
Insert stock transaction
Submit distribution entity
Deactivate subdistributor resource
```

### Gunakan

```text
Stok Masuk
Distribusi ke Pangkalan
Tambah Pangkalan
Edit Pangkalan
Hapus Pangkalan
Menunggu Sinkronisasi
Data Berhasil Tersimpan
```

---

# 59. DESIGN SYSTEM

Pertahankan identitas website sekarang:

- Pemkab Pinrang;
- Disperindag ESDM;
- visual clean government dashboard;
- responsif;
- kontras baik;
- ukuran teks nyaman;
- dark mode Command Center tidak harus diterapkan ke form agen jika mengurangi keterbacaan.

Portal agen harus memprioritaskan fungsi di atas dekorasi.

---

# 60. DEFINITION OF DONE MVP

MVP dianggap selesai ketika skenario ini berjalan end-to-end:

```text
Admin mengimpor master pangkalan awal
            ↓
Admin membuat/mengaktifkan akun agen
            ↓
Agen login dengan HP
            ↓
Agen melihat pangkalan miliknya
            ↓
Agen dapat tambah/edit/hapus pangkalan
            ↓
Agen input stok masuk
            ↓
Saldo agen dihitung server
            ↓
Agen distribusi ke pangkalan
            ↓
Saldo berkurang
            ↓
Riwayat tercatat
            ↓
Summary ter-update
            ↓
Command Center menerima data aktual
            ↓
Disperindag dapat memonitor per agen/per wilayah
```

---

# 61. PRIORITAS JIKA WAKTU DEVELOPMENT TERBATAS

Urutan tidak boleh dibalik:

```text
P0 Security
P1 Auth/RBAC
P1 Master agen & pangkalan
P1 Pangkalan CRUD + audit
P1 Ledger stok
P1 Distribusi
P1 Summary Command Center
P2 Offline optimization
P2 GIS
P2 Alert
P3 Allocation analytics
P3 Advanced anomaly detection
```

Jangan menghabiskan waktu pada grafik/animasi sebelum integritas ledger, security, dan hak akses selesai.

---

# 62. CATATAN UNTUK DEVELOPER/AI CODING AGENT

Sebelum menulis kode:

1. Audit repository existing dan identifikasi stack aktual.
2. Dokumentasikan collection Firestore existing agar tidak terjadi collision.
3. Audit Firebase Rules existing.
4. Audit cara RBAC existing bekerja.
5. Jangan mengganti arsitektur auth yang sudah stabil tanpa alasan.
6. Buat branch/module LPG secara terisolasi.
7. Gunakan Firebase Emulator Suite untuk rules/function test jika tersedia.
8. Jangan deploy Rules yang lebih longgar untuk mempercepat development.
9. Jangan menyimpan credential demo di source frontend.
10. Jangan mengubah halaman publik/fitur lain yang tidak relevan.
11. Semua schema migration/import harus mempunyai dry-run dan rollback strategy.
12. Backup/export Firestore sebelum migration production.

---

# 63. SUMBER REFERENSI

## Website yang akan diintegrasikan

- https://disperindagesdm-pinrang.web.app/
- https://disperindagesdm-pinrang.web.app/login
- https://disperindagesdm-pinrang.web.app/petugas
- https://disperindagesdm-pinrang.web.app/admin
- https://disperindagesdm-pinrang.web.app/command-center

## Data resmi subpenyalur LPG

- https://migas.esdm.go.id/daftar-sub-penyalur-lpg-3-kg
- https://migas.esdm.go.id/cms/uploads/informasi-publik/Sub%20Penyalur%20LPG%203%20KG/Sub%20Penyalur%202026/Sulawesi%20Selatan.pdf

## Kondisi Pinrang Agustus 2026

- https://www.detik.com/sulsel/berita/d-8634012/heboh-emak-emak-di-pinrang-labrak-pangkalan-lpg-ogah-jual-tabung-ke-tetangga
- https://www.detik.com/sulsel/berita/d-8634122/kontrak-pangkalan-lpg-di-pinrang-diputus-gegara-ogah-jual-tabung-ke-tetangga
- https://www.detik.com/sulsel/berita/d-8634354/terkuak-permainan-harga-lpg-3-kg-di-pinrang-usai-pangkalan-dilabrak-emak-emak

## Firebase

- Offline Firestore: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Transactions/Batched Writes: https://firebase.google.com/docs/firestore/manage-data/transactions
- App Check Web: https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider
- Firestore Security Field Access: https://firebase.google.com/docs/firestore/security/rules-fields

---

# 64. KEPUTUSAN ARSITEKTUR AKHIR

**Satu website, satu identitas sistem, satu auth/RBAC, satu master data LPG, satu ledger append-only, dan satu Command Center.**

Agen diberi kebebasan operasional untuk memutakhirkan pangkalan miliknya, tetapi sistem tetap menjaga:

- provenance data awal ESDM;
- histori;
- audit;
- separation antar agen;
- integritas stok;
- validasi server;
- kemampuan Disperindag untuk melihat perubahan dari waktu ke waktu.

Dengan model ini, aplikasi tidak hanya menjawab **"berapa stok hari ini"**, tetapi juga dapat menjawab secara auditabel:

```text
Stok masuk kapan?
Masuk ke agen mana?
Berapa jumlahnya?
Dikirim kapan?
Ke pangkalan mana?
Berapa tabung?
Siapa yang menginput?
Pangkalan berada di wilayah mana?
Apakah master pangkalan pernah berubah?
Siapa yang mengubah?
Apakah pangkalan sudah dihapus/nonaktif?
Bagaimana histori sebelum pangkalan dihapus?
Kapan agen terakhir melaporkan?
Wilayah mana yang belum menerima distribusi?
```

Itulah fungsi yang seharusnya menjadi inti **Sistem Monitoring Distribusi LPG 3 Kg Disperindag ESDM Kabupaten Pinrang**.
