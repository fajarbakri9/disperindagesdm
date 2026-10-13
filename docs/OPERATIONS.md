# Operasi Media Intelligence Disperindag ESDM Pinrang

Runbook ini berlaku untuk collection final `mi_*`. Writer produksi hanya boleh
memakai Application Default Credentials melalui Workload Identity Federation
(WIF). Service-account private key JSON dilarang.

## Aktivasi WIF

Workflow `crawl.yml`, `cleanup.yml`, `backup.yml`, dan `sync-news-og.yml` akan dilewati sampai repository variable
`MI_WIF_ENABLED=true`. Siapkan `GCP_PROJECT_ID`, `GCP_WIF_PROVIDER`, dan
`GCP_MI_SERVICE_ACCOUNT`. Provider wajib dibatasi ke repository ini dan branch
`main`; service account memakai izin Firestore minimum, bukan Owner. Jalankan
workflow manual sebelum mengandalkan jadwal.

Workflow legacy `.github/workflows/sync-news-og.yml` juga telah dimigrasikan ke
WIF. Secret service-account JSON lama harus tetap dihapus.

## Menambah sumber

1. Tambahkan entry disabled ke `engine/config/sources.yml` beserta discovery URL,
   exact allowed domains, robots status, dan tanggal verifikasi.
2. Jalankan `python engine/scripts/validate_mi_sources.py`.
3. Jalankan audit read-only dan verifikasi 5–10 artikel asli: publisher,
   canonical, judul, dan tanggal. Publisher kosong adalah gagal; jangan mengganti
   metadata yang hilang dengan nama registry agar pemeriksaan terlihat lulus.
4. Jalankan collector `--dry-run`, lalu enable dan pantau tiga run pertama.

Domain GDELT yang belum dikenal tetap di `mi_review_tasks`; jangan melonggarkan
registry hanya agar candidate lolos.

## Menonaktifkan sumber dan memperbaiki parser

Ubah `enabled: false`, pertahankan metadata onboarding dan semua item lama. Untuk
parser rusak, reproduksi dengan URL asli, tambah regression test, jalankan seluruh
tes dan dry-run. Field hilang harus menghasilkan `NEEDS_REVIEW`/`REJECTED`, bukan
judul atau tanggal buatan.

## Menjalankan manual dan meninjau kegagalan

```powershell
python engine/collector/main.py --dry-run --trigger manual
```

Writer produksi hanya dari workflow WIF. Untuk cleanup, jalankan manual dengan
`dry_run=true`, periksa kandidat, lalu `dry_run=false`. Pada workflow gagal,
bedakan auth/source/parser/quota/write; perbaiki penyebab dan re-run. Jangan buat
JSON key, jangan backfill dari scheduled run, dan jangan menghapus data valid lama.

### Diagnosis kegagalan sebelum runner

Jika GitHub Actions selesai gagal hanya dalam 2–3 detik dan metadata job menunjukkan
`runner_id=0`, `runner_name` kosong, serta `steps=[]`, anggap kegagalan terjadi
sebelum workflow memperoleh GitHub-hosted runner. Jangan mengubah crawler, Python,
WIF, Firebase, atau dependency untuk gejala ini. Periksa terlebih dahulu status
Actions/billing/entitlement akun atau repository. Job yang belum pernah memperoleh
runner juga dapat tidak mempunyai blob log sama sekali.

## Retensi

- Item terverifikasi: 730 hari (rentang kebijakan 12–24 bulan).
- Sync run dan review task tertutup: 90 hari.
- Maksimum 400 delete/run; default script adalah dry-run.
- Cluster dan issue tanpa item tersisa ikut dirapikan.

Workflow cleanup memakai `PYTHONPATH=engine:engine/collector` agar proses operasi
mempunyai import path yang sama dengan kebutuhan `collector.mi_firestore_writer`.
Sebelum menyentuh Firestore, workflow menjalankan import smoke-check sehingga
regresi import gagal lebih awal dan lebih mudah didiagnosis.

## Backup dan restore

Backup mingguan memuat `mi_sources`, `mi_items`, `mi_story_clusters`, `mi_issues`,
dan `mi_daily_metrics` sebagai JSON.GZ plus manifest SHA-256. Repository ini
bersifat publik, sehingga artifact GitHub tidak boleh dianggap sebagai penyimpanan
privat untuk backup plaintext.

Sebelum artifact diunggah, workflow `backup.yml` wajib mengenkripsi file backup dan
manifest menggunakan AES-256-CBC + PBKDF2. Plaintext kemudian dihapus dari workspace
runner dan hanya file `*.enc` yang boleh diunggah dengan retensi 30 hari.

Konfigurasikan Actions secret `MI_BACKUP_PASSPHRASE` dengan nilai acak yang kuat,
minimal 20 karakter dan disarankan 32 karakter atau lebih. Jangan pernah menaruh
passphrase di repository, commit, issue, log, atau file konfigurasi publik. Jika
secret belum tersedia atau terlalu pendek, workflow harus gagal tertutup dan tidak
mengunggah backup plaintext.

Contoh dekripsi lokal untuk file backup terenkripsi:

```bash
export MI_BACKUP_PASSPHRASE='isi-secret-di-perangkat-admin'
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 \
  -in mi-RUN-ATTEMPT.json.gz.enc \
  -out mi-RUN-ATTEMPT.json.gz \
  -pass env:MI_BACKUP_PASSPHRASE
```

Hapus environment variable dan file plaintext setelah verifikasi/restore selesai.
Restore tidak otomatis: verifikasi checksum dan `schema_version`, restore ke
Emulator dahulu, lalu gunakan script idempoten yang direview dua orang. Buat
backup baru sebelum write produksi.

Catatan jadwal: GitHub cron menggunakan UTC. `40 18 * * 0` berarti sekitar Senin
02:40 WITA, sedangkan `25 18 1 * *` berarti sekitar tanggal 2 pukul 02:25 WITA.
Jika kebijakan operasional menghendaki hari/tanggal lokal lain, ubah cron dengan
menghitung offset WITA (UTC+8), jangan menganggap field cron memakai WITA.

## Memeriksa quota

Periksa Firebase Console > Firestore > Usage: reads, writes, deletes, storage, dan
bandwidth. Backup dibatasi 10.000 dokumen/collection; naikkan hanya setelah audit.
Command Center tetap membaca satu dokumen `mi_public/current`.

## Gerbang cutover 30 artikel

Jalankan:

```powershell
python engine/scripts/audit_production_articles.py --allow-incomplete
python engine/scripts/check_production_readiness.py
```

Audit menulis `engine/reports/production_article_audit.json`. Cutover hanya lulus
jika sekurangnya 30 artikel memiliki canonical URL, judul, publisher, dan waktu
publikasi yang sama dengan halaman asli serta menggunakan ekstraksi langsung.
`--allow-incomplete` hanya mengizinkan laporan NO-GO disimpan; opsi tersebut tidak
mengubah keputusan audit menjadi PASS.

## Rollback

1. Gunakan `git revert COMMIT`, bukan reset/force-push.
2. Jalankan tes engine dan Security Rules di Emulator.
3. Deploy dari archive/checkout commit bersih; jangan deploy dirty worktree karena
   `firebase.json` memakai root repository sebagai public directory.
4. Hosting dapat dikembalikan ke release sebelumnya lewat Firebase Console.
5. Rollback Rules hanya setelah memastikan data internal tetap tertutup.

Kegagalan crawler/frontend harus menghasilkan degraded/stale, bukan angka nol.
