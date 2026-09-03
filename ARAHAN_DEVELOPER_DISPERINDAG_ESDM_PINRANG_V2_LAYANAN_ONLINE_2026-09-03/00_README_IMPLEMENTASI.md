# PAKET ARAHAN TEKNIS V2
## WEBSITE + DATA + GIS + TV + COMMAND CENTER + LAYANAN DOKUMEN ONLINE
### DISPERINDAG ESDM KABUPATEN PINRANG

**Website utama:** `https://disperindagesdm-pinrang.web.app/`  
**Project existing:** Firebase Project A — portal/data existing  
**Project layanan online:** Firebase Project B — direkomendasikan terpisah  
**Mode implementasi:** **ADDITIVE-ONLY · NO OVERWRITE · NO FALLBACK · DOMAIN OWNERSHIP · BACKWARD-COMPATIBLE**

---

# 1. KEPUTUSAN ARSITEKTUR TERBARU

Mulai versi ini, ekosistem dibagi menjadi dua domain Firebase:

```text
PROJECT A — WEBSITE / DATA EXISTING
│
├── Website publik
├── CMS existing
├── Berita
├── Dokumen publik
├── Harga
├── Pasar master
├── LPG master
├── BBM master
├── IKM
├── GIS multilayer
├── Dashboard ESDM
├── TV Layanan
└── Command Center / projection

PROJECT B — PORTAL LAYANAN ONLINE
│
├── Firebase Hosting
├── Firebase Auth layanan
├── Firestore layanan
├── serviceDefinitions
├── serviceApplications
├── workflow / approval
├── audit trail
├── document metadata
└── layanan transaksional berikutnya
```

**Project B jangan diberi nama khusus SIPK.** Gunakan nama generik, misalnya:

```text
disperindagesdm-pinrang-services
```

agar dapat digunakan untuk SIPK dan layanan online berikutnya.

---

# 2. DOMAIN OWNERSHIP — ATURAN P0

Setiap data hanya mempunyai satu pemilik/master.

## Project A menjadi master:
- pasar;
- kios apabila sudah tersedia sebagai master;
- LPG;
- BBM;
- harga;
- GIS;
- IKM;
- konten publik;
- dokumen/regulasi publik.

## Project B menjadi master:
- definisi layanan;
- permohonan;
- status workflow;
- verifikasi;
- persetujuan;
- audit trail layanan;
- metadata dokumen yang diterbitkan;
- notifikasi layanan;
- statistik layanan.

**DILARANG membuat mirror penuh antarproject.**

Benar:

```text
Project A marketId/kioskId
        ↓ reference
Project B application
```

Salah:

```text
Project A markets
        ↓ copy seluruh data
Project B markets-copy
```

---

# 3. STATUS IMPLEMENTASI LAYANAN ONLINE SAAT INI

Untuk deployment terdekat:

- menu **Layanan Online** boleh sudah ditampilkan;
- halaman **Permohonan** boleh dibuat;
- tetapi **BELUM mengaktifkan form transaksi SIPK**;
- jangan membuat tombol Submit yang menyimpan data;
- jangan membuat login pemohon bila workflow belum siap;
- jangan membuat nomor permohonan dummy;
- jangan membuat pelacakan palsu;
- jangan membuat PDF/TTE dummy.

Halaman Permohonan sementara menggunakan status:

> **Dalam Tahap Pengembangan**

Tujuannya adalah memperkenalkan kanal layanan tanpa membuat masyarakat mengira layanan sudah aktif.

---

# 4. URUTAN IMPLEMENTASI WAJIB

## TAHAP 0 — FREEZE, BASELINE, BACKUP
Sebelum perubahan:
- inventarisasi semua route;
- inventarisasi collection Project A;
- catat jumlah document master;
- catat rules/index;
- catat production version;
- jangan melakukan migration.

**GATE 0:** baseline selesai dan dapat dibandingkan setelah deploy.

---

## TAHAP 1 — NAVIGATION
- satu navigation config;
- desktop/mobile/footer konsisten;
- tambahkan grup **Layanan Online** tanpa menambah top-level baru;
- route lama tetap hidup.

**GATE 1:** tidak ada menu overflow/404.

---

## TAHAP 2 — LANDING LAYANAN ONLINE
Tambahkan landing:
- informasi layanan online;
- daftar layanan;
- kartu SIPK berstatus “Dalam Tahap Pengembangan”;
- CTA tidak menjalankan transaksi.

**GATE 2:** tidak ada write Firestore untuk permohonan.

---

## TAHAP 3 — ESDM/GIS/TV EXISTING
Lanjutkan paket sebelumnya:
- Dashboard ESDM;
- GIS;
- TV Layanan;
- Command Center hardening;
- no fallback.

**GATE 3:** regresi existing lulus.

---

## TAHAP 4 — CREATE PROJECT B
Baru setelah desain layanan disetujui:
- create Firebase Project B;
- Hosting;
- Auth;
- Firestore;
- rules;
- separate environment config.

Jangan menghubungkan write antarproject dari browser.

---

## TAHAP 5 — SERVICE ENGINE
- serviceDefinitions;
- serviceApplications;
- workflowEvents;
- auditLogs;
- issuedDocumentMetadata;
- role model.

SIPK menjadi layanan pilot.

---

## TAHAP 6 — DOKUMEN, STORAGE, PDF, TTE
Tahap ini **tidak boleh dipaksakan ke Spark jika membutuhkan Cloud Storage/Functions**.

Pilihan:
1. backend/DMS Pemkab;
2. service backend terpisah;
3. upgrade hanya Project B ke Blaze apabila diputuskan.

Project A tetap dapat dipertahankan Spark.

---

## TAHAP 7 — PRODUCTION SIPK
Baru aktifkan:
- form;
- upload;
- tracking;
- approval;
- PDF;
- TTE;
- verification QR.

---

# 5. LARANGAN MUTLAK

Developer dilarang:

- overwrite master valid Project A;
- rename collection/document ID existing;
- seed ulang destructive;
- copy seluruh master ke Project B;
- menyimpan NIK/PII pada collection public;
- expose serviceApplications ke unauthenticated public;
- menulis ke Project A dari browser Project B menggunakan rule longgar;
- menggunakan LocalStorage sebagai sumber data resmi;
- menggunakan dummy/fallback seolah-olah data live;
- mengaktifkan form Permohonan sebelum backend, rules, consent, retention, audit, dan ownership siap;
- menyimpan credential TTE/PIN/passphrase di frontend/Firestore;
- menampilkan tanda tangan hasil scan sebagai pengganti TTE;
- menerbitkan nomor surat final dari frontend;
- menampilkan data pribadi pemohon di TV/website publik/Command Center projection.

---

# 6. ARSITEKTUR FINAL

```text
                       WEBSITE PUBLIK
                         PROJECT A
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
         DATA/GIS        ESDM/TV      LAYANAN ONLINE
          MASTER                          │
              │                           ▼
              │                     PROJECT B
              │                SERVICE WORKFLOW ENGINE
              │                           │
              │          ┌────────────────┼───────────────┐
              │          │                │               │
              │          ▼                ▼               ▼
              │      VERIFIKASI       APPROVAL        AUDIT LOG
              │                           │
              │                           ▼
              │                    DOCUMENT SERVICE
              │                           │
              │                    PDF + TTE + ARCHIVE
              │                           │
              └──────── reference ────────┘
```

---

# 7. FIREBASE CURRENT CONSTRAINT

Per September 2026:
- satu project dapat digunakan sebagai project Firebase terpisah;
- web app dapat dikonfigurasi mengakses beberapa Firebase project;
- Firestore free quota berlaku per project untuk satu database free-tier;
- Cloud Storage for Firebase memerlukan Blaze sejak 3 Februari 2026.

Implikasi:
- Project A tidak perlu dinaikkan ke Blaze hanya karena SIPK;
- Project B dapat dimulai Spark untuk portal/workflow;
- bila storage/server-side Firebase dibutuhkan, keputusan Blaze hanya mengenai Project B.

---

# 8. ACCEPTANCE GLOBAL

- [ ] Project A master tetap utuh.
- [ ] Layanan Online hadir tanpa mengganggu navigasi.
- [ ] Permohonan sementara jelas “Dalam Tahap Pengembangan”.
- [ ] Tidak ada submit/write transaksi aktif.
- [ ] Project A dan B mempunyai ownership jelas.
- [ ] Tidak ada database mirror penuh.
- [ ] PII tidak masuk public projection.
- [ ] Tidak ada fallback/dummy resmi.
- [ ] Route existing tidak 404.
- [ ] Project B belum dihubungkan ke production sebelum security rules lulus.
- [ ] SIPK production baru diaktifkan setelah PDF/TTE/storage/backend siap.

**JANGAN MELANJUTKAN KE SIPK PRODUCTION HANYA KARENA UI FORM SUDAH SELESAI.**
