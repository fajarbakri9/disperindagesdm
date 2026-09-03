# SIPK — WORKFLOW FUTURE & TTE

> Dokumen desain masa depan. **Belum diaktifkan pada deployment placeholder.**

## 1. ALUR

```text
Pemohon
  ↓
Submit
  ↓
Verifikasi Administrasi
  ↓
Penanggung Jawab
  ↓
Kepala Dinas
  ↓
Nomor Dokumen
  ↓
PDF
  ↓
TTE
  ↓
Terbit
```

---

## 2. REVISI

Jika tidak lengkap:

```text
revision_requested
   ↓
pemohon memperbaiki
   ↓
resubmitted
   ↓
review ulang
```

Catatan revisi immutable.

---

## 3. NOMOR

Bedakan:
- application number;
- document number.

Nomor dokumen final tidak dibuat frontend.

Harus:
- transactional/atomic;
- idempotent;
- tidak boleh double number.

---

## 4. APPROVAL

Kadis:
- lihat ringkasan;
- lihat hasil verifikasi;
- preview draft;
- approve/reject/return.

Jangan auto-approve.

---

## 5. TTE

TTE:
- melalui PSrE/BSrE/infrastruktur resmi;
- tidak menyimpan PIN/passphrase;
- private key tidak masuk aplikasi;
- frontend tidak memanggil credential signing secara langsung.

---

## 6. PDF

PDF final:
- kop;
- nomor;
- data izin;
- dasar/ketentuan;
- masa berlaku jika berlaku;
- pejabat;
- TTE digital;
- QR verification.

QR bukan pengganti TTE.

---

## 7. VERIFICATION PAGE

Public verification hanya menampilkan minimum data yang diperlukan:
- jenis dokumen;
- nomor;
- tanggal;
- status;
- penerbit;
- validity.

Mask/hilangkan PII yang tidak perlu.

---

## 8. DOCUMENT HASH

Simpan:
```text
sha256
signedAt
signatureProvider
documentStatus
```

---

## 9. ACCEPTANCE FUTURE

- [ ] Approval berjenjang.
- [ ] Nomor atomic.
- [ ] PDF tidak dibuat browser sebagai final official document.
- [ ] TTE server-side/integration resmi.
- [ ] QR verify minimum disclosure.
