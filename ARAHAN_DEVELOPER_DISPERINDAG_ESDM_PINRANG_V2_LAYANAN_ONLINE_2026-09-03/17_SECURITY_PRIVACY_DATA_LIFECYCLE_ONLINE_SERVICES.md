# SECURITY, PRIVACY & DATA LIFECYCLE — ONLINE SERVICES

## 1. DATA CLASSIFICATION

### Public
- service name;
- requirements;
- SOP;
- status availability;
- public stats;
- document verification minimum.

### Restricted
- application data;
- workflow;
- reviewer notes;
- attachments.

### Highly sensitive/private
- NIK;
- KTP;
- signature artifacts;
- credential;
- TTE authentication data.

---

## 2. DATA MINIMIZATION

Form future hanya meminta field yang memang diperlukan oleh SOP/regulation.

Jangan meminta:
- data keluarga;
- data tambahan;
- foto/dokumen
jika tidak menjadi persyaratan resmi.

---

## 3. CONSENT / NOTICE

Sebelum submit future:
- tujuan penggunaan;
- siapa pengelola;
- jenis data;
- retention;
- kanal kontak;
- declaration.

---

## 4. ACCESS

Principle of least privilege.

Verifier pasar tidak otomatis dapat melihat seluruh layanan lain.

Kadis hanya melihat data yang diperlukan untuk approval.

---

## 5. LOGGING

Audit log jangan menyimpan:
- password;
- token;
- TTE PIN;
- full raw document.

---

## 6. ATTACHMENT

Future:
- private by default;
- signed/short-lived download URL;
- malware/type/size validation;
- no public bucket.

---

## 7. RETENTION

Tetapkan sebelum go-live:
- application records retention;
- rejected/cancelled records;
- issued documents;
- audit logs;
- attachments.

Jangan hard-delete tanpa policy.

---

## 8. APP CHECK

Evaluasi App Check untuk Project B saat transaction go-live.
Tetap bukan pengganti Auth/Rules.

---

## 9. RATE LIMIT

Untuk production:
- prevent spam submit;
- idempotency;
- duplicate detection;
- reasonable request limits.

---

## 10. PLACEHOLDER PHASE

Saat ini:
- collection aplikasi belum perlu aktif;
- tidak menerima PII;
- privacy risk harus minimal.

---

## 11. ACCEPTANCE

- [ ] Classification jelas.
- [ ] Least privilege.
- [ ] No secrets in logs.
- [ ] No public attachment.
- [ ] Retention ditetapkan sebelum go-live.
