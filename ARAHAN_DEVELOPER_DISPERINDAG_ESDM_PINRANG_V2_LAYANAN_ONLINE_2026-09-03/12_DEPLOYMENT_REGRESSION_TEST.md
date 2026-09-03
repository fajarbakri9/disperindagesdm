# DEPLOYMENT & REGRESSION TEST V2

## 1. PRIORITAS

Tambahan online services tidak boleh mengganggu production existing.

---

## 2. FASE A — INFORMATIONAL ONLY

Deploy:
- navigation update;
- Layanan Online landing;
- Permohonan “Dalam Tahap Pengembangan”.

Tidak deploy:
- form;
- login pemohon;
- upload;
- serviceApplications;
- TTE;
- numbering.

### Test:
- [ ] no Firestore write saat membuka halaman.
- [ ] no network call ke project layanan yang belum diperlukan.
- [ ] no console error.
- [ ] no fake status.
- [ ] no 404.
- [ ] mobile rapi.

---

## 3. FASE B — PROJECT B FOUNDATION

Sebelum form aktif:
- rules test;
- Auth test;
- App Check evaluation;
- schema validation;
- role separation;
- data retention design;
- privacy notice;
- audit events.

**GATE:** security review lulus.

---

## 4. FASE C — SIPK PILOT

Aktifkan hanya akun test/internal dulu.

Test:
- duplicate submit;
- double click;
- refresh;
- offline;
- concurrent verifier;
- unauthorized role;
- direct URL access;
- changed market/kiosk reference;
- rejected application;
- resubmission;
- idempotent approval.

---

## 5. FASE D — DOCUMENT/TTE

Test:
- number race condition;
- PDF generation failure;
- TTE failure;
- repeated callback;
- tampered PDF;
- expired certificate;
- duplicate issued event;
- download permission;
- QR verification.

---

## 6. CROSS-PROJECT TEST

- Project A public projection read B;
- B reference A;
- no private collection exposed;
- no privileged client write A;
- wrong Firebase app instance fails visibly in test;
- quota/load isolated.

---

## 7. FINAL GO-LIVE

Baru ubah halaman:
```text
DALAM TAHAP PENGEMBANGAN
```

menjadi:
```text
LAYANAN TERSEDIA
```

setelah:
- backend;
- storage;
- PDF;
- TTE;
- SOP;
- petugas;
- privacy;
- security;
- support;
- legal document template

seluruhnya siap.

---

## 8. ROLLBACK

Jika layanan gagal:
- nonaktifkan serviceDefinition;
- landing tetap tersedia;
- tampilkan “Layanan sementara tidak tersedia”;
- jangan mematikan website utama.
