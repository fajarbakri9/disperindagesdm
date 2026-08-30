# Media Intelligence Pinrang

Collector Media Intelligence Disperindag ESDM Kabupaten Pinrang. Implementasi
saat ini adalah fase awal yang fail-closed dan mengikuti
`MASTER_IMPLEMENTATION_PLAN_MEDIA_INTELLIGENCE_PINRANG (1).md`.

## Status implementasi

- Tiga sumber pilot terverifikasi dari `config/sources.yml`.
- Discovery RSS/sitemap, ekstraksi metadata, normalisasi URL dan waktu WITA.
- Validasi domain/canonical/tanggal serta exact URL/content deduplication.
- Writer hanya menggunakan collection final `mi_*`.
- Setiap eksekusi dicatat di `mi_sync_runs`; kesehatan sumber disimpan di
  `mi_source_state`; artikel terverifikasi disimpan idempoten di `mi_items`.
- Story cluster, issue foundation, dan KPI 24 jam sudah tersedia di collection
  internal. Issue baru tetap `UNVERIFIED` sampai ditinjau manusia.
- Tone/NLP dan public snapshot belum diaktifkan sebelum tahap penerimaannya selesai.
- Halaman produksi tetap menampilkan status offline sampai `mi_public/current`
  diterbitkan oleh tahap snapshot yang teruji.

Tidak ada writer aktif menuju collection legacy seperti `mentions`, `issues`,
`source_health`, `dashboard`, `alerts`, atau `stats_daily`.

## Menjalankan lokal

```powershell
python -m pip install -r engine/collector/requirements.txt
python engine/collector/main.py --dry-run
python -m pytest engine/tests -q
```

Dry-run membaca sumber nyata tetapi tidak membuat koneksi tulis Firestore.

## Uji Firestore Emulator

```powershell
npx firebase-tools emulators:exec --only firestore --project demo-media-intelligence "python -m pytest engine/tests -q"
```

Tes penerimaan writer menjalankan payload yang sama tiga kali. Hasil wajib:
run pertama membuat satu item, sedangkan run kedua dan ketiga mencatat duplikat
tanpa menggandakan `mi_items`.

## Autentikasi produksi

Writer produksi hanya memakai Application Default Credentials yang disediakan
Workload Identity Federation (WIF). Jangan membuat, mengunduh, menyimpan, atau
memasukkan service-account private key JSON ke repository maupun GitHub Secret.

Environment minimum saat runtime:

```text
GOOGLE_CLOUD_PROJECT=disperindagesdm-pinrang
```

Untuk emulator tambahkan:

```text
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
GOOGLE_CLOUD_PROJECT=demo-media-intelligence
```

Collector produksi belum boleh dijadwalkan sebelum WIF, environment GitHub,
dan workflow penerimaan selesai dikonfigurasi.

## Collection final

```text
mi_sources
mi_source_state
mi_items
mi_story_clusters
mi_issues
mi_review_tasks
mi_sync_runs
mi_daily_metrics
mi_audit_logs
mi_public/current
```

Hanya `mi_public/current` yang dapat dibaca tanpa login. Semua collection
internal dilindungi oleh Firestore Security Rules dan tidak dapat ditulis dari
browser.
