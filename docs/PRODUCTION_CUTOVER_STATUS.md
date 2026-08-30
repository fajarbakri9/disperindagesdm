# Status Cutover Media Intelligence

Status per 30 Agustus 2026: **NO-GO — mode pengembangan dipertahankan**.

Kode aplikasi telah menutup sumber dummy/localStorage, menyediakan crawler enam kali per hari, antrean review admin, pembaca snapshot publik, rules, backup, cleanup, dan autentikasi workflow berbasis WIF. Cutover belum boleh dilakukan sampai seluruh bukti operasional berikut tersedia:

- variable WIF repository telah diisi dan `MI_WIF_ENABLED=true`;
- workflow crawl berhasil berjalan terhadap project production;
- dokumen `mi_public/current` tersedia dan memiliki freshness/source-health aktual;
- validasi manual minimal 30 berita memenuhi akurasi URL, publisher, judul, dan tanggal 100%;
- skenario kegagalan, mobile, dark mode, dan console browser telah diuji serta dicatat;
- periode stabil yang dipersyaratkan untuk aktivasi NLP/Tone telah terpenuhi.

Jalankan pemeriksaan fail-closed:

```bash
python engine/scripts/check_production_readiness.py
```

Hasil `GO` dari skrip hanya membuktikan pemeriksaan yang dapat diautomasi. Checklist manual tetap wajib sebelum teks `MODE PENGEMBANGAN` diubah menjadi `DATA AKTUAL — NEAR REAL-TIME`.
