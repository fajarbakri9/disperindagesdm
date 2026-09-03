# REFERENSI TEKNIS FIREBASE — DIVERIFIKASI 03 SEPTEMBER 2026

Dokumen ini hanya mencatat constraint platform yang mempengaruhi desain.

## 1. MULTIPLE FIREBASE PROJECTS

Firebase mendokumentasikan bahwa aplikasi dapat menggunakan lebih dari satu Firebase project dan Web SDK dapat menginisialisasi app tambahan dengan konfigurasi berbeda.

Referensi resmi:
https://firebase.google.com/docs/projects/multiprojects

---

## 2. FIRESTORE FREE QUOTA

Untuk Cloud Firestore Standard, free quota yang didokumentasikan:
- 1 GiB stored data;
- 50,000 document reads/day;
- 20,000 document writes/day;
- 20,000 deletes/day;
- 10 GiB outbound/month.

Free quota hanya berlaku untuk satu database per project.

Referensi resmi:
https://firebase.google.com/docs/firestore/pricing

---

## 3. CLOUD STORAGE

Firebase mewajibkan Blaze untuk menggunakan Cloud Storage for Firebase. Untuk bucket lama `*.appspot.com`, Spark kehilangan akses mulai 3 Februari 2026.

Implikasi:
- jangan desain upload lampiran SIPK menggunakan Firebase Storage pada Spark;
- pertimbangkan DMS/storage Pemkab;
- atau upgrade Project B saja ke Blaze bila disetujui.

Referensi resmi:
https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024

---

## 4. IMPLEMENTATION RULE

Constraint pricing/plan harus diperiksa kembali sebelum aktivasi production, karena kebijakan cloud dapat berubah.
