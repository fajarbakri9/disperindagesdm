# Status Cutover Media Intelligence

Status per 30 Agustus 2026: **NO-GO untuk label final — pipeline production aktif**.

Kode aplikasi telah menutup sumber dummy/localStorage, menyediakan crawler enam kali per hari, antrean review admin, pembaca snapshot publik, rules, backup, cleanup, dan autentikasi workflow berbasis WIF. Cutover belum boleh dilakukan sampai seluruh bukti operasional berikut tersedia:

- WIF, crawler enam kali sehari, dan `mi_public/current` telah aktif serta lolos run production pertama;
- validasi manual minimal 30 berita memenuhi akurasi URL, publisher, judul, dan tanggal 100%;
- skenario kegagalan, mobile, dark mode, dan console browser telah diuji serta dicatat;
- periode stabil yang dipersyaratkan untuk aktivasi NLP/Tone telah terpenuhi.

Jalankan pemeriksaan fail-closed:

```bash
python engine/scripts/check_production_readiness.py
```

Hasil `GO` dari skrip hanya membuktikan pemeriksaan yang dapat diautomasi. Checklist manual tetap wajib sebelum teks `MODE PENGEMBANGAN` diubah menjadi `DATA AKTUAL — NEAR REAL-TIME`.
