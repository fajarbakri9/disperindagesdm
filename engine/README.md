# Media Intelligence Pinrang

Collector Media Intelligence Disperindag ESDM Kabupaten Pinrang. Implementasi
saat ini adalah fase awal yang fail-closed dan mengikuti
`MASTER_IMPLEMENTATION_PLAN_MEDIA_INTELLIGENCE_PINRANG (1).md`.

## Status implementasi

- Empat belas sumber aktif dari `config/sources.yml`, termasuk Info Rakyat,
  Mata Lasinrang, Supala Media, Pijar News, Sahabat News, dan Berita-Online.
  Status onboarding tidak menjadi
  bukti cutover; audit production ketat tetap mensyaratkan 30 artikel yang cocok
  untuk canonical URL, judul, publisher, tanggal, dan ekstraksi langsung.
- Discovery RSS/sitemap, ekstraksi metadata, normalisasi URL dan waktu WITA.
- GDELT DOC API dipakai hanya sebagai secondary discovery dengan delapan query
  terkontrol. Hasilnya selalu diarahkan ke halaman penerbit asli.
- Validasi domain/canonical/tanggal serta exact URL/content deduplication.
- Kandidat GDELT dari domain registry melewati validator dan deduplikasi yang
  sama dengan sumber langsung. Domain asing hanya membuat task onboarding
  idempoten di `mi_review_tasks` dan tidak pernah masuk `mi_items` atau KPI.
- Writer hanya menggunakan collection final `mi_*`.
- Setiap eksekusi dicatat di `mi_sync_runs`; kesehatan sumber disimpan di
  `mi_source_state`; artikel terverifikasi disimpan idempoten di `mi_items`.
- Story cluster, issue foundation, dan KPI 24 jam sudah tersedia di collection
  internal. Issue baru tetap `UNVERIFIED` sampai ditinjau manusia.
- Snapshot publik tunggal dibuat di `mi_public/current` dari data terverifikasi,
  dengan daftar terbatas dan tanpa error internal, catatan review, identitas admin,
  atau PII.
- Tone/NLP belum diaktifkan sebelum tahap penerimaannya selesai.
- Dependensi dan API Gemini tidak dipasang atau dikonfigurasi pada fase Spark-only.
- Tahap 12 Tone/NLP tetap ditunda sampai core stabil minimal dua minggu dan
  tersedia validasi manual minimal 100 artikel beserta accuracy, macro F1,
  confusion cases, dan confidence threshold.
- Command Center Tahap 13 membaca tepat satu dokumen `mi_public/current` dan
  menampilkan mentions 24 jam, unique stories, critical issues, last sync,
  serta status dari snapshot yang sama.
- Tahap 14 menyediakan cleanup bulanan yang bounded/dry-run-first, backup metadata
  mingguan JSON.GZ dengan checksum dan artifact privat 30 hari, serta runbook
  `docs/OPERATIONS.md`. Kedua scheduler tetap gated sampai WIF diaktifkan.
- Halaman produksi tetap menampilkan status offline sampai `mi_public/current`
  diterbitkan oleh tahap snapshot yang teruji.

Tidak ada writer aktif menuju collection legacy seperti `mentions`, `issues`,
`source_health`, `dashboard`, `alerts`, atau `stats_daily`.

## Menjalankan lokal

```powershell
python -m pip install -r engine/collector/requirements.txt
python engine/collector/main.py --dry-run
python -m pytest engine/tests -q
python engine/scripts/audit_production_articles.py --allow-incomplete
```

Dry-run membaca sumber nyata tetapi tidak membuat koneksi tulis Firestore.
Gangguan atau timeout GDELT dicatat sebagai kondisi `DEGRADED` dan tidak
menggagalkan pengumpulan delapan sumber langsung.

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
internal dilindungi oleh Firestore Security Rules. Browser hanya dapat melakukan
aksi review sempit oleh role berwenang dan wajib membuat audit log atomik.
