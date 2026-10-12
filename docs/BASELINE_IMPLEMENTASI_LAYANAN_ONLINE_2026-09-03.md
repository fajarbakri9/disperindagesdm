# Baseline Implementasi Layanan Online — 3 September 2026

## Identitas baseline

- Project A: `disperindagesdm-pinrang`
- Hosting: `disperindagesdm-pinrang`
- Commit checkpoint: `e985a923e8ade9a6d7989159e437fbc5904681bb`
- Waktu checkpoint: `2026-09-03 10:46:03 +0800`
- Pesan checkpoint: `checkpoint: portal stabil sebelum restrukturisasi menu 2026-09-03`
- Mode perubahan: additive-only, tanpa migrasi dan tanpa seed ulang.

## Route sebelum implementasi

Route publik utama yang tercatat: `/`, `/profil`, `/layanan`, `/kontak`, `/ppid`, `/arsip-berita`, `/berita`, `/harga-bahan-pokok`, `/pasar`, `/direktori-lpg`, `/penyalur-bbm`, `/katalog-ikm`, `/peta-gis`, dan `/tv-layanan`.

Route internal/operasional yang dicatat: `/admin`, `/login`, `/petugas`, `/profil-petugas`, `/lpg-agen`, `/command-center`, `/media-intelligence`, dan `/media-intelligence-admin`.

Route additive pada fase ini: `/layanan-online`, `/permohonan`, dan `/dashboard-esdm`.

## Inventaris Firestore Project A

Rules Project A memuat domain harga, berita, IKM, dokumen, banner, command center, pasar, wilayah administratif, SKM, konfigurasi sistem, TV, media intelligence, laporan/pengaduan, LPG, pengguna, dan BBM. Nama koleksi lengkap tetap tercatat pada `firestore.rules`; rules dan ID koleksi tidak diubah dalam fase ini.

Koleksi master utama yang relevan untuk implementasi ini: `markets`, `lpg_agents`, `lpg_pangkalan`, `bbm_outlets`, `market_prices_latest`, `news`, `documents`, `ikm_products`, `tvSlides`, dan `mi_public`.

Jumlah dokumen produksi tidak dicatat dengan nilai perkiraan. Pengambilan jumlah membutuhkan pembacaan produksi yang terautentikasi/terotorisasi; perubahan fase ini tidak menjalankan migration, seed, delete, atau write data. Dashboard baru menghitung master secara read-only ketika halaman dibuka.

## Rules, index, dan boundary

- Rules baseline: `firestore.rules` (tidak diubah).
- Index baseline: `firestore.indexes.json` (tidak diubah).
- Project A tetap menjadi source of truth untuk master publik/existing.
- Tidak ada `serviceApplications`, data pemohon, attachment, atau PII yang ditambahkan ke Project A.
- Project B belum dibuat atau dihubungkan pada fase informasional ini.

## Gate dan rollback

Rollback kode menggunakan commit checkpoint di atas. Rollback tidak memerlukan rollback data karena fase ini tidak menulis data produksi. Sebelum deployment, seluruh route, no-write guard, metadata, syntax, build artifact, dan tampilan responsif harus lulus pemeriksaan.
