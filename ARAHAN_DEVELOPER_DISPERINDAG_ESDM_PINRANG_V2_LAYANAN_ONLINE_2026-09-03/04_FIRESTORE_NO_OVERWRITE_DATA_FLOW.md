# FIRESTORE V2 — DOMAIN OWNERSHIP, NO OVERWRITE & CROSS-PROJECT SAFETY

## 1. PROJECT A

Project A tetap source of truth untuk master existing.

Dilarang menambah:
```text
serviceApplications
serviceApprovals
applicantPrivateData
```
ke Project A hanya demi SIPK.

---

## 2. PROJECT B

Project B source of truth untuk transaksi layanan.

Contoh domain:

```text
serviceDefinitions/
serviceApplications/
workflowEvents/
auditLogs/
issuedDocuments/
publicServiceCatalog/
publicServiceStats/
```

Nama final harus melalui schema review sebelum production.

---

## 3. NO DUPLICATE MASTER

Project B boleh menyimpan:
```text
marketId
kioskId
```

Boleh menyimpan snapshot historis minimal.

Project B tidak boleh menyimpan copy live seluruh collection pasar/kios.

---

## 4. PUBLIC / PRIVATE SPLIT

Gunakan pemisahan eksplisit.

### Private:
```text
serviceApplications
workflowEvents
auditLogs
issuedDocuments
```

### Public:
```text
publicServiceCatalog
publicServiceStats
publicDocumentVerification
```

Jangan mengandalkan hanya field `public=true` pada collection yang berisi PII jika tidak perlu. Pemisahan collection lebih aman.

---

## 5. SECURITY RULES

Public:
- hanya read projection publik;
- no write.

Pemohon:
- read application miliknya;
- create sesuai schema;
- update hanya field/stage yang diizinkan.

Verifier:
- read sesuai assignment;
- write keputusan terkontrol.

Kadis:
- approval role;
- tidak diberi akses universal jika tidak diperlukan.

---

## 6. CROSS-PROJECT

Untuk browser:
- Project A dapat membaca projection publik B;
- Project B dapat membaca data publik/reference A bila rules mengizinkan.

Untuk write lintas-project:
- jangan dari browser;
- gunakan secure backend/admin credentials bila production membutuhkan;
- whitelist fields;
- idempotent;
- audit.

---

## 7. PROJECT CONFIG

Gunakan explicit names:

```javascript
const mainApp = initializeApp(mainConfig);
const servicesApp = initializeApp(servicesConfig, 'services');
```

Pastikan semua service instance diambil dari app yang benar.

Kesalahan umum yang harus dihindari:
```javascript
getFirestore() // tanpa sadar membaca DEFAULT project
```

Gunakan:
```javascript
getFirestore(mainApp)
getFirestore(servicesApp)
```

---

## 8. ENVIRONMENT

Jangan hardcode config production di banyak file.

Gunakan satu module config:
```text
firebase-main-config.js
firebase-services-config.js
```

Firebase web config bukan secret, tetapi security tetap berasal dari rules/Auth.

---

## 9. CURRENT PLACEHOLDER

Pada tahap Permohonan “Dalam Pengembangan”:
- belum perlu Project B production jika belum dibuat;
- jangan menulis aplikasi dummy;
- jangan seed applicant data;
- jangan membuat sample PII di production.

---

## 10. ACCEPTANCE

- [ ] Project A tidak menjadi transaction DB.
- [ ] Project B tidak menjadi duplicate master DB.
- [ ] Private/public data terpisah.
- [ ] Tidak ada browser cross-project privileged write.
- [ ] Semua Firebase instance explicit.
- [ ] No fallback.
