# AUDIT & TARGET ARSITEKTUR V2

## 1. RINGKASAN KEPUTUSAN

Arsitektur sebelumnya tetap valid untuk:
- website;
- Firestore master existing;
- ESDM;
- GIS;
- TV Layanan;
- Command Center;
- Media Intelligence;
- CMS.

Penambahan layanan dokumen online **tidak mengganti fondasi tersebut**. Yang berubah adalah penambahan domain transaksional baru.

---

## 2. MENGAPA LAYANAN TRANSAKSIONAL HARUS DIPISAH

Website publik dan layanan transaksi mempunyai karakter risiko berbeda.

### Website/data publik:
- dominan read;
- mayoritas data publik;
- traffic browsing;
- SEO;
- GIS;
- dashboard.

### Layanan dokumen:
- PII;
- login;
- upload;
- approval;
- audit;
- status;
- surat resmi;
- TTE;
- retention;
- role access.

Karena itu, memisahkan Project B memberikan:
- security boundary;
- quota isolation;
- auth isolation;
- deployment isolation;
- lebih mudah meng-upgrade hanya project layanan;
- lebih kecil risiko perubahan SIPK merusak portal utama.

---

## 3. TARGET USER EXPERIENCE

Masyarakat tetap melihat satu ekosistem:

```text
Website Disperindag ESDM Pinrang
        │
        └── Layanan Publik
              └── Layanan Online
                    ├── Permohonan
                    └── Lacak Permohonan
```

Pada tahap sekarang:

```text
Permohonan
   ↓
DALAM TAHAP PENGEMBANGAN
```

Belum ada transaksi.

---

## 4. TARGET BACKEND

```text
Project A
= reference/master/public information

Project B
= transaction/workflow
```

Project A tidak boleh menerima `serviceApplications`.

Project B tidak boleh menjadi master pasar/LPG/BBM.

---

## 5. CROSS-PROJECT READ

Web dapat menggunakan secondary Firebase App untuk mengakses project lain bila memang dibutuhkan.

Namun prinsip implementasi:
- website utama hanya membaca **public projection** Project B;
- UI SIPK berada pada Project B atau app layanan;
- data PII tidak dibaca Project A;
- browser tidak diberi write lintas-project ke master A.

---

## 6. PROJECT A → PROJECT B

Project B cukup menyimpan referensi:

```text
marketId
kioskId
```

Tambahkan immutable snapshot yang diperlukan untuk bukti historis:

```text
subjectSnapshot.marketName
subjectSnapshot.block
subjectSnapshot.kioskNumber
```

Snapshot bukan source of truth; snapshot adalah rekam keadaan saat transaksi dibuat.

---

## 7. PROJECT B → PROJECT A

Tahap awal:
- hanya public aggregate/statistik jika dibutuhkan;
- tidak ada write master otomatis.

Tahap production lanjutan:
- jika SIPK terbit perlu update status kios, lakukan melalui secure backend/event yang terautentikasi;
- gunakan field whitelist;
- log perubahan;
- idempotency key;
- jangan gunakan browser client sebagai integration bus.

---

## 8. PROJECTION

Contoh public projection:

```text
publicServiceCatalog/current
publicServiceStats/current
```

Tidak boleh memuat:
- nama;
- NIK;
- telepon;
- email;
- lampiran;
- catatan verifikator;
- dokumen internal.

---

## 9. STATUS SAAT INI

Landing “Permohonan” adalah **informational placeholder**.

Developer harus memastikan:
- no form controls yang memberi kesan layanan aktif;
- no upload;
- no Firebase write;
- no fake ETA;
- no fake tracking.

---

## 10. TARGET JANGKA PANJANG

```text
Portal Publik
  + Data
  + GIS
  + Informasi
  + Layanan
  + Dokumen elektronik
```

Tetapi setiap domain tetap dipisahkan secara aman.
