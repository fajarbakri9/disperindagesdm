# Status Cutover Media Intelligence

Status per 30 Agustus 2026: **NO-GO untuk label final — pipeline production aktif**.

Pipeline production berjalan dengan komponen Firebase Spark/free: Hosting, Authentication, Firestore, Security Rules, App Check, GitHub Actions, dan Workload Identity Federation. Implementasi tidak memakai Cloud Functions, Cloud Run, Firebase Storage, BigQuery, service-account key, maupun Cloud SDK sebagai dependensi runtime atau deployment.

## Bukti yang sudah selesai

- crawler production berjalan enam kali sehari;
- snapshot publik `mi_public/current` aktif;
- delapan sumber production terakhir berstatus sehat;
- skenario timeout, koneksi gagal, HTTP 403/500, RSS rusak, tanggal hilang, canonical redirect, duplikasi, tanggal masa depan, perubahan markup, dan kegagalan pembacaan frontend telah diuji otomatis;
- acceptance browser Chrome pada viewport 390×844 lulus: tidak overflow, snapshot tampil, status tampil, dark mode aktif, dan tidak ada error console/runtime;
- provenance extraction membedakan `VERIFIED_DIRECT` dan `VERIFIED_FEED`.

## Bukti yang masih wajib

- validasi manual minimal 30 berita dengan akurasi URL, publisher, judul, dan tanggal 100%;
- snapshot saat ini hanya menyediakan 8 artikel: 4 cocok langsung, 2 hanya dapat dibuktikan sebagian dari halaman asal, dan 2 tidak dapat diekstrak ulang dari halaman asal;
- periode stabil yang dipersyaratkan sebelum aktivasi NLP/Tone.

Karena jumlah dan kualitas sampel belum memenuhi syarat, teks production belum boleh dinaikkan menjadi klaim final. Jangan mengubah data yang hanya berasal dari feed menjadi `VERIFIED_DIRECT`.

Jalankan pemeriksaan otomatis:

```bash
python engine/scripts/check_production_readiness.py
python -m pytest engine/tests -q
```

Hasil `GO` dari skrip hanya membuktikan pemeriksaan otomatis. Checklist manual 30 artikel tetap menjadi gerbang cutover.
