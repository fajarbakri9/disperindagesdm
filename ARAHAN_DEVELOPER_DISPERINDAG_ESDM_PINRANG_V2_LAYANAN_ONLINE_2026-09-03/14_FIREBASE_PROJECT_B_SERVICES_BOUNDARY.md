# FIREBASE PROJECT B — SERVICES BOUNDARY

## 1. NAMA

Rekomendasi:
```text
disperindagesdm-pinrang-services
```

Jangan nama `sipk-pinrang` agar scalable.

---

## 2. SPARK PHASE

Pada tahap awal Spark dapat digunakan untuk:
- Hosting landing/app;
- Auth;
- Firestore workflow;
- tracking metadata;
- audit metadata.

Cloud Storage for Firebase tidak dapat digunakan pada Spark per kebijakan Firebase sejak 3 Februari 2026.

---

## 3. MULTI-PROJECT

Web SDK mendukung lebih dari satu Firebase App.

Tetapi gunakan hanya bila perlu:
- Project A = `mainApp`
- Project B = `servicesApp`

Jangan membuat utility global ambigu.

---

## 4. QUOTA

Quota Firestore free-tier terpisah per project untuk database free-tier.

Jangan menganggap pemisahan project berarti unlimited:
- monitor reads;
- monitor writes;
- avoid broad listeners;
- paginate applications;
- aggregate dashboard.

---

## 5. AUTH

Project B mempunyai Auth sendiri.

Jangan berasumsi session Project A otomatis valid di Project B.

Untuk masyarakat:
- login Project B saat layanan production.

Untuk placeholder saat ini:
- belum perlu login.

---

## 6. STORAGE FUTURE

Pilihan:
1. DMS/storage Pemkab;
2. secure backend eksternal;
3. Blaze hanya untuk Project B.

Project A tidak perlu diubah hanya karena layanan.

---

## 7. ACCEPTANCE

- [ ] Separate config.
- [ ] Separate Firestore.
- [ ] Separate Auth.
- [ ] No transaction PII in A.
- [ ] No master duplication in B.
