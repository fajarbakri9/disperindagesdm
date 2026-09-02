# MASTER IMPLEMENTATION PLAN
## Media Intelligence Disperindag ESDM Kabupaten Pinrang
### Arsitektur Produksi Gratis, Aktual, Terverifikasi, dan Tidak Bergantung pada Data Simulasi

**Status dokumen:** FINAL ARCHITECTURE / IMPLEMENTATION GUIDE  
**Target:** `https://disperindagesdm-pinrang.web.app/media-intelligence`  
**Prinsip utama:** data valid lebih penting daripada banyak fitur; semua angka harus dapat ditelusuri ke sumber; jangan menampilkan status LIVE jika backend tidak benar-benar memperbarui data.  
**Batas biaya:** tetap pada Firebase Spark / GitHub Free / tool gratis. Jangan mengaktifkan Blaze, Cloud Functions, Cloud Run, layanan AI berbayar, atau API sosial media berbayar pada tahap ini.

---

# 0. ATURAN WAJIB UNTUK ANTIGRAVITY / DEVELOPER

Dokumen ini **jangan diringkas menjadi satu pekerjaan besar**. Kerjakan **tahap demi tahap** sesuai urutan. Setelah satu tahap selesai, lakukan pengujian dan verifikasi acceptance criteria sebelum melanjutkan.

## Aturan non-negotiable

1. **Jangan mengubah desain besar halaman Media Intelligence** kecuali bagian yang secara eksplisit disebut dalam tahap terkait.
2. **Jangan refactor halaman lain** seperti Command Center, Beranda, Harga Pasar, PPID, atau modul lain kecuali pada tahap integrasi yang secara eksplisit meminta.
3. **Jangan membuat data contoh baru untuk terlihat “hidup”.**
4. **Jangan memasukkan angka KPI manual ke frontend.**
5. **Jangan menggunakan `localStorage` sebagai sumber data intelligence.**
6. **Jangan menyimpan service-account JSON di repository GitHub.**
7. **Jangan mengaktifkan Cloud Functions/Cloud Run/Blaze.**
8. **Jangan menganggap hasil discovery sebagai berita valid sebelum URL sumber asli diverifikasi.**
9. **Jangan menyalin full body artikel ke Firestore.**
10. **Jangan mengunduh dan meng-host ulang foto milik portal berita tanpa kebutuhan dan hak yang jelas.**
11. **Jangan memasukkan sosial media ke KPI utama sampai integrasinya benar-benar tersedia.**
12. **Jangan melanjutkan ke tahap berikutnya jika acceptance criteria tahap sekarang belum lulus.**
13. Setiap tahap harus dibuat dalam **commit terpisah** agar rollback mudah.
14. Selalu buat backup file yang akan diubah sebelum perubahan besar.
15. Jika ada ketidakjelasan source/API/HTML portal, **fail closed**: tandai `NEEDS_REVIEW`, jangan mengarang metadata.

---

# 1. KEPUTUSAN ARSITEKTUR FINAL

Arsitektur yang dikunci:

```text
SUMBER LANGSUNG
RSS / News Sitemap / Sitemap / Listing Page / Official Page
        │
        ▼
GITHUB ACTIONS — Python Collector
        │
        ├── Discover candidate
        ├── Fetch halaman asli
        ├── Normalize URL
        ├── Extract metadata
        ├── Validate publisher/domain/date
        ├── Relevance classification
        ├── Exact duplicate detection
        ├── Story clustering
        ├── Topic/location enrichment
        └── Optional tone analysis (tahap akhir)
        │
        ▼
FIRESTORE — existing Firebase project
        │
        ├── mi_sources
        ├── mi_source_state
        ├── mi_items
        ├── mi_story_clusters
        ├── mi_issues
        ├── mi_review_tasks
        ├── mi_sync_runs
        ├── mi_daily_metrics
        ├── mi_audit_logs
        └── mi_public/current
        │
        ├──────────────────┐
        ▼                  ▼
MEDIA INTELLIGENCE     COMMAND CENTER
PUBLIC DASHBOARD       ringkasan saja
```

## Prinsip arsitektur

- **Sumber langsung = primary source of truth untuk penemuan berita.**
- **GDELT = secondary discovery only.**
- Firestore menjadi **single source of truth** untuk data intelligence.
- Frontend publik tidak membaca seluruh database. Frontend hanya membaca `mi_public/current`.
- Internal/admin baru boleh membaca collection detail.
- Satu artikel = `media_item`.
- Beberapa artikel yang memberitakan kejadian yang sama = `story_cluster`.
- Beberapa story yang berhubungan dengan persoalan operasional yang sama = `issue`.
- `topic` bukan `issue`.
- `sentiment/tone` bukan sumber kebenaran; hanya atribut analisis.
- Data sosial media dipisahkan dan belum menjadi bagian KPI produksi tahap pertama.

---

# 2. MENGAPA STRUKTUR 3 LEVEL WAJIB

## Level 1 — Media Item

Satu URL artikel yang valid.

## Level 2 — Story Cluster

Jika kejadian sama dimuat Detik, Tribun, ANTARA, dan portal lokal:

```text
4 media_items = 1 story_cluster
```

Dashboard boleh menyebut:

> 4 media mentions membahas 1 kejadian.

## Level 3 — Issue

Jika dalam beberapa hari terdapat beberapa kejadian terkait harga LPG, pelanggaran HET, dan keluhan distribusi, beberapa story dapat tergabung dalam:

```text
ISSUE:
Pengawasan Distribusi LPG 3 Kg Kabupaten Pinrang
```

Dengan pola ini tidak akan terjadi lagi kesalahan:

```text
4 artikel kritis = 4 isu
```

---

# 3. BATASAN LAYANAN GRATIS YANG MENJADI DESAIN SISTEM

Gunakan Firebase Spark yang sudah ada.

## Firestore free quota

Target desain harus jauh di bawah:

- 1 GiB stored data
- 50.000 document reads/day
- 20.000 document writes/day
- 20.000 deletes/day
- 10 GiB outbound/month

Jangan membuat database Firestore kedua untuk Media Intelligence. Gunakan database existing karena free quota hanya berlaku untuk satu database dalam project.

## Firebase Hosting Spark

Tetap gunakan Firebase Hosting existing.

Jangan deploy ulang Hosting setiap kali crawler berjalan. Crawler hanya memperbarui Firestore.

## GitHub Free

Gunakan **private repository**.

Budget:

- 2.000 standard runner minutes/month.

Target operasi:

```text
6 crawl/hari × 30 hari = 180 workflow runs/bulan
```

Target runtime normal per run:

```text
3–7 menit
```

Perkiraan:

```text
180 × 5 menit = ±900 menit/bulan
```

Hard limit internal:

```yaml
timeout-minutes: 15
```

Jika job sering mencapai 15 menit, jangan meningkatkan waktu tanpa evaluasi.

---

# 4. JADWAL CRAWLER FINAL

Gunakan 6 kali sehari:

```text
02:17 WITA
06:17 WITA
10:17 WITA
14:17 WITA
18:17 WITA
22:17 WITA
```

Alasan menit `17`:

- jangan scheduler tepat `00`;
- GitHub Actions dapat mengalami antrean tinggi pada awal jam;
- dashboard ini near-real-time, bukan hard real-time.

Workflow juga wajib mendukung:

```yaml
workflow_dispatch:
```

untuk manual run dari GitHub Actions UI.

## PENTING

Tombol di website **tidak boleh memicu GitHub Actions**.

Tidak boleh menaruh GitHub PAT/token di JavaScript/browser.

Tombol publik hanya:

```text
Muat Ulang Data
```

yang meminta snapshot Firestore terbaru.

---

# 5. DEFINISI STATUS DATA

Jangan lagi hard-code `LIVE RADAR`.

Gunakan status berdasarkan timestamp backend.

```text
< 5 jam     = FRESH
5–8 jam     = DELAYED
8–12 jam    = STALE
> 12 jam    = OFFLINE / VERY STALE
```

UI:

```text
🟢 DATA FRESH
🟡 DATA DELAYED
🟠 DATA STALE
🔴 SYNC FAILED
⚪ CACHED
```

Simpan minimal:

```text
last_run_at
last_data_update_at
last_full_success_at
run_status
sources_total
sources_ok
sources_failed
coverage_percent
sync_run_id
```

Jangan menyamakan jam WITA di layar dengan freshness data.

---

# 6. KLASIFIKASI SUMBER

Setiap sumber harus terdaftar di `mi_sources`.

```text
owned_official
government_official
earned_media
```

`owned_official` tidak boleh dihitung sebagai **earned media mention**.

KPI `Media Mentions` utama harus menggunakan `earned_media`.

---

# 7. SOURCE ONBOARDING

Mulai dari **8–15 sumber** yang benar-benar diuji.

Sebelum `enabled: true`, setiap sumber wajib:

```text
[ ] domain benar
[ ] halaman aktif
[ ] publisher jelas
[ ] robots.txt diperiksa
[ ] RSS/news sitemap/sitemap ditemukan atau parser listing diuji
[ ] URL artikel individual dapat diambil
[ ] published date dapat diekstrak
[ ] canonical URL dapat diverifikasi
[ ] parser test lulus
[ ] tidak redirect ke domain yang tidak disetujui
```

Urutan discovery:

```text
1. First-party RSS
2. First-party News Sitemap
3. First-party Sitemap
4. First-party listing/category/search page
5. Site-specific adapter
6. GDELT discovery
```

GDELT tidak boleh menggantikan verifikasi halaman asli.

---

# 8. SOURCE CONFIGURATION

File:

```text
config/sources.yml
```

Contoh:

```yaml
- id: antara_sulsel
  name: ANTARA Sulsel
  domain: makassar.antaranews.com
  allowed_domains:
    - makassar.antaranews.com
  source_class: earned_media
  priority: high
  enabled: true
  discovery:
    type: rss
    urls:
      - "<RSS YANG SUDAH DIVERIFIKASI>"
  max_candidates_per_run: 30
```

Jangan menulis URL RSS/sitemap berdasarkan tebakan. Verifikasi manual dulu.

---

# 9. HTTP CRAWLER POLICY

User-Agent:

```text
DisperindagPinrangMediaMonitor/1.0 (+https://disperindagesdm-pinrang.web.app/)
```

Per-domain throttle:

```text
1 request / 2 seconds / domain
```

Timeout:

```text
connect: 10–12 detik
read: 15–20 detik
```

Retry maksimum 2 untuk:

```text
429
500
502
503
504
network timeout
```

Gunakan exponential backoff.

Jangan retry agresif untuk:

```text
401
403
404
ROBOTS_BLOCKED
```

Respect robots.txt. Jangan bypass.

---

# 10. NORMALISASI URL

Hapus parameter tracking:

```text
utm_source
utm_medium
utm_campaign
utm_term
utm_content
fbclid
gclid
ref
```

Simpan:

```text
discovered_url
canonical_url
normalized_url
```

Doc ID `mi_items` berbasis:

```text
SHA256(normalized canonical URL)
```

Proses harus idempotent.

---

# 11. VALIDASI ARTIKEL — URUTAN WAJIB

```text
DISCOVERED
↓
URL NORMALIZED
↓
DOMAIN CHECK
↓
ROBOTS CHECK
↓
FETCH ORIGINAL PAGE
↓
HTTP VALID
↓
CANONICAL CHECK
↓
METADATA EXTRACTION
↓
DATE VALIDATION
↓
RELEVANCE
↓
DEDUPLICATION
↓
VERIFIED / NEEDS_REVIEW / REJECTED
```

---

# 12. METADATA EXTRACTION PRIORITY

Gunakan urutan:

```text
1. JSON-LD / schema.org
2. OpenGraph/article meta
3. first-party RSS metadata
4. visible HTML
5. manual review
```

Ambil:

```text
title
canonical_url
published_at
modified_at
author
publisher
image_url
description/excerpt
```

Simpan provenance:

```text
published_at_source:
jsonld
opengraph
rss
html
manual
```

---

# 13. ATURAN VALIDASI TANGGAL

Review/reject jika:

- tanggal lebih besar dari waktu sekarang + tolerance;
- tanggal tidak dapat ditentukan;
- discovery mengatakan 2026 tetapi halaman asli menyatakan 2024;
- URL year/path sangat berbeda dari published date tanpa bukti;
- published date jauh di luar monitoring window.

Normal run hanya fokus:

```text
48 jam terakhir
```

Backfill histori menggunakan workflow terpisah.

---

# 14. VERIFICATION STATUS

```text
VERIFIED_DIRECT
VERIFIED_FEED
MANUAL_VERIFIED
NEEDS_REVIEW
REJECTED
```

KPI resmi hanya menghitung:

```text
VERIFIED_DIRECT
VERIFIED_FEED
MANUAL_VERIFIED
```

---

# 15. RELEVANCE ENGINE

Gunakan scoring deterministik.

Contoh bobot:

```text
Exact "Disperindag ESDM Pinrang"  +100
Exact "Disperindag Pinrang"       +100
Pinrang                             +35
Keyword tupoksi                     +30
Kecamatan Pinrang                   +15
Nama unit/layanan                   +20
Judul relevan                       +20
```

Topic awal:

```text
lpg_3kg
pasar
harga_pangan
metrologi
industri_ikm
esdm
perlindungan_konsumen
pelayanan_publik
```

Threshold:

```text
>= 80     AUTO RELEVANT
60–79     NEEDS_REVIEW
< 60      REJECT
```

Tuning setelah 2–4 minggu.

---

# 16. LOKASI / KECAMATAN

Gunakan taxonomy tetap 12 kecamatan Pinrang.

```json
{
  "district_ids": ["duampanua", "batulappa"]
}
```

Jangan menyimpan variasi nama bebas jika dapat dinormalisasi.

---

# 17. DEDUPLICATION

Urutan:

```text
canonical URL sama
normalized URL sama
content fingerprint sama
same-source normalized title sangat mirip dalam 72 jam
```

Exact duplicate:

```text
duplicate_of = existing_item_id
```

Cross-source similar content bukan duplicate; masukkan story cluster.

---

# 18. STORY CLUSTERING

Gunakan kombinasi:

- normalized title similarity;
- entity overlap;
- topic overlap;
- location overlap;
- publish window.

Starter rule:

```text
title similarity >= 85
AND publish distance <= 72 jam
AND (topic overlap OR entity overlap)
```

Jika ragu, buat cluster terpisah.

Simpan:

```text
cluster_algorithm_version
```

---

# 19. ISSUE MODEL

Field:

```json
{
  "title": "...",
  "topic_id": "lpg_3kg",
  "district_ids": [],
  "status": "OPEN",
  "severity": "HIGH",
  "first_seen_at": "...",
  "last_seen_at": "...",
  "story_count": 0,
  "media_item_count": 0,
  "verified": true
}
```

Status:

```text
DRAFT
OPEN
MONITORING
RESOLVED
ARCHIVED
```

Hanya verified `OPEN/MONITORING` yang dihitung sebagai Active Issues.

---

# 20. SEVERITY

Jangan menyebut semua berita negatif critical.

Factor:

```text
public service impact
regulatory impact
consumer harm
source count
coverage velocity
geographic spread
urgency terms
official confirmation
```

Level:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

`CRITICAL` publik membutuhkan manual confirmation kecuali bukti otoritatif sangat jelas.

---

# 21. SENTIMENT / TONE BUKAN TAHAP AWAL

Tahap awal hapus:

```text
AI Analysis
NLP LIVE
74 / 18 / 8
```

Setelah core stabil, gunakan:

```text
TONE:
POSITIVE
NEUTRAL
CONCERN
CRITICAL

INTENT:
INFORMATION
COMPLAINT
CRITICISM
REQUEST
APPRECIATION
INVESTIGATION
```

Hasil AI menyimpan:

```text
model_name
model_version
confidence
classified_at
review_status
```

---

# 22. DATA YANG TIDAK BOLEH DISIMPAN

Jangan simpan full article body.

Simpan:

```text
title
excerpt <= 600–800 chars
metadata
canonical URL
hash/fingerprint
classification
```

Full text diproses di memory lalu dibuang.

---

# 23. THUMBNAIL

Untuk media eksternal:

- simpan `og:image` URL sebagai metadata;
- jangan otomatis copy gambar ke Firebase Hosting;
- remote thumbnail boleh dicoba;
- fallback ke source icon/logo;
- `loading="lazy"`;
- jangan pakai gambar artikel lain sebagai fallback.

---

# 24. FIRESTORE COLLECTION FINAL

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
mi_public
```

Public:

```text
mi_public/current
```

---

# 25. SCHEMA `mi_items`

```json
{
  "schema_version": 1,
  "source_id": "antara_sulsel",
  "source_class": "earned_media",
  "discovered_url": "",
  "normalized_url": "",
  "canonical_url": "",
  "title": "",
  "excerpt": "",
  "author": null,
  "publisher": "",
  "published_at": null,
  "published_at_source": null,
  "discovered_at": null,
  "fetched_at": null,
  "verified_at": null,
  "verification_status": "VERIFIED_DIRECT",
  "verification_notes": [],
  "topic_ids": [],
  "district_ids": [],
  "relevance_score": 0,
  "story_cluster_id": null,
  "issue_id": null,
  "duplicate_of": null,
  "content_hash": "",
  "title_hash": "",
  "image_url": null,
  "tone": null,
  "tone_confidence": null,
  "created_at": null,
  "updated_at": null
}
```

---

# 26. SCHEMA `mi_sources`

```json
{
  "name": "ANTARA Sulsel",
  "domain": "makassar.antaranews.com",
  "allowed_domains": [],
  "source_class": "earned_media",
  "priority": "high",
  "enabled": true,
  "discovery_type": "rss",
  "discovery_urls": [],
  "robots_checked_at": null,
  "parser_version": 1,
  "created_at": null,
  "updated_at": null
}
```

---

# 27. SCHEMA `mi_source_state`

```json
{
  "source_id": "",
  "last_checked_at": null,
  "last_success_at": null,
  "last_article_at": null,
  "consecutive_failures": 0,
  "last_http_status": null,
  "last_error_code": null,
  "last_error_message": null,
  "etag": null,
  "last_modified": null,
  "health": "OK"
}
```

Health:

```text
OK
DEGRADED
FAILED
ROBOTS_BLOCKED
DISABLED
```

---

# 28. SCHEMA `mi_sync_runs`

```json
{
  "run_id": "",
  "trigger": "schedule",
  "started_at": null,
  "finished_at": null,
  "status": "SUCCESS",
  "sources_total": 0,
  "sources_ok": 0,
  "sources_failed": 0,
  "candidates_found": 0,
  "items_new": 0,
  "items_updated": 0,
  "duplicates": 0,
  "rejected": 0,
  "needs_review": 0,
  "runtime_seconds": 0,
  "engine_version": ""
}
```

---

# 29. PUBLIC SNAPSHOT `mi_public/current`

```json
{
  "schema_version": 1,
  "generated_at": "",
  "sync_run_id": "",
  "system_status": "FRESH",
  "last_run_at": "",
  "last_data_update_at": "",
  "last_full_success_at": "",
  "source_health": {
    "total": 0,
    "ok": 0,
    "degraded": 0,
    "failed": 0
  },
  "kpis": {
    "earned_mentions_24h": 0,
    "unique_stories_24h": 0,
    "active_sources_24h": 0,
    "active_critical_issues": 0
  },
  "top_stories": [],
  "top_issues": [],
  "latest_items": [],
  "trend_7d": []
}
```

Batasi:

```text
latest_items <= 20–30
top_stories <= 10
top_issues <= 10
trend_7d = 7 records
```

---

# 30. KPI FINAL

## Media Mentions 24h

Jumlah `mi_items` unik:

```text
source_class == earned_media
verification valid
published_at dalam 24 jam
```

## Unique Stories 24h

Jumlah story cluster unik.

## Active Sources 24h

Jumlah publisher berbeda dengan artikel valid.

## Active Critical Issues

Verified issue:

```text
status OPEN/MONITORING
severity HIGH/CRITICAL
```

## Hapus sementara

```text
Reach
Engagement
Public Sentiment %
```

---

# 31. TREND

Jika tampil `+14.2%`, harus dihitung:

```text
current 24h vs previous 24h
```

Formula:

```text
(current - previous) / previous × 100
```

Jika previous == 0:

```text
BARU
```

---

# 32. SECURITY MODEL

## Public

Hanya read:

```text
mi_public/current
```

## Admin

Firebase Authentication:

```text
/media-intelligence-admin
```

Akses dengan authenticated admin claim.

## GitHub crawler

Firebase Admin SDK melalui Workload Identity Federation.

---

# 33. GITHUB → GOOGLE AUTHENTICATION

Gunakan **Workload Identity Federation**.

Dedicated service account contoh:

```text
mi-crawler@PROJECT_ID.iam.gserviceaccount.com
```

Jangan beri Owner.

Workflow:

```yaml
permissions:
  contents: read
  id-token: write

steps:
  - uses: actions/checkout@v7

  - uses: google-github-actions/auth@v3
    with:
      project_id: PROJECT_ID
      workload_identity_provider: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER
      service_account: mi-crawler@PROJECT_ID.iam.gserviceaccount.com
```

WIF provider wajib dibatasi ke repository dan branch `main`.

---

# 34. FIRESTORE RULES

Merge rules; jangan overwrite rule existing.

Konsep:

```text
mi_public/current:
public read
no public write

mi_* internal:
admin only

crawler:
Admin SDK/IAM
```

Simpan:

```text
firestore.rules
firestore.indexes.json
```

---

# 35. FRONTEND DATA ACCESS

Setelah cutover, hapus:

```text
MEDIA_DATA_MASTER
disperindag_media_intelligence localStorage
CURRENT_DATA_VERSION migration
```

Gunakan hanya `mi_public/current`.

Jika snapshot offline/cache:

```text
tampilkan CACHED/OFFLINE
```

Jangan tampilkan hijau.

Jangan enable persistent IndexedDB caching pada tahap awal.

---

# 36. TICKER

Ticker dari:

```text
mi_public/current.latest_items
```

Aturan:

- verified only;
- source title asli;
- publisher benar;
- canonical URL;
- tidak menggabungkan atribut dari record berbeda.

---

# 37. FILTER FRONTEND

Fase awal:

```text
Semua
Berita Online
Sumber Resmi
Isu Kritis
```

Hide/disable:

```text
Instagram
TikTok
Facebook
Suara Warga
```

Tampilkan:

```text
Integrasi media sosial belum diaktifkan
```

---

# 38. ADMIN REVIEW PAGE

Fitur minimum:

```text
Login
Review Queue
Buka Source Asli
Accept
Reject
Edit Topic
Edit Kecamatan
Merge Story
Create/Attach Issue
Edit Severity
```

Reason codes:

```text
DATE_MISSING
DOMAIN_MISMATCH
TITLE_MISMATCH
LOW_RELEVANCE
DUPLICATE_AMBIGUOUS
PARSER_PARTIAL
CRITICAL_REVIEW
```

Simpan audit:

```text
reviewed_by
reviewed_at
decision
previous_value
new_value
```

---

# 39. ERROR TAXONOMY

```text
NETWORK_ERROR
TIMEOUT
HTTP_401
HTTP_403
HTTP_404
HTTP_429
HTTP_5XX
ROBOTS_BLOCKED
PARSER_ERROR
DATE_MISSING
DATE_INVALID
CANONICAL_MISMATCH
DOMAIN_MISMATCH
LOW_RELEVANCE
DUPLICATE
OUT_OF_WINDOW
UNKNOWN
```

---

# 40. SOURCE HEALTH

Rule contoh:

```text
0 failure                       → OK
1–2 transient failure          → DEGRADED
3 consecutive source failures  → FAILED
```

Jika source gagal, jangan hapus berita lama.

---

# 41. RUN HEALTH

```text
sources_failed <= 10%  → SUCCESS
10–30%                 → PARTIAL
> 30%                  → DEGRADED/FAILED
```

Tetap proses source yang berhasil.

Jangan membuat data menjadi nol karena satu parser rusak.

---

# 42. BACKFILL

Workflow:

```text
backfill.yml
```

Manual only:

```yaml
workflow_dispatch:
```

Input:

```text
days: 7 / 14 / 30
source_id: optional
```

Normal scheduled workflow tidak backfill.

---

# 43. DATA RETENTION

Firestore TTL tidak digunakan karena target Spark/no billing.

Verified items:

```text
12–24 bulan
```

Rejected/discovery garbage:

```text
30–90 hari
```

Cleanup via `cleanup.yml`.

---

# 44. BACKUP GRATIS

Managed Firestore backup/PITR tidak dipakai.

Workflow:

```text
backup.yml
```

Frekuensi:

```text
1× per minggu
```

Backup metadata:

```text
mi_sources
mi_items
mi_story_clusters
mi_issues
mi_daily_metrics
```

Format:

```text
JSON.GZ
```

Simpan di mekanisme private GitHub dengan retensi terbatas.

---

# 45. REPOSITORY STRUCTURE FINAL

```text
media-intelligence-engine/
│
├── .github/
│   └── workflows/
│       ├── crawl.yml
│       ├── backfill.yml
│       ├── cleanup.yml
│       └── backup.yml
│
├── config/
│   ├── sources.yml
│   ├── keywords.yml
│   ├── topics.yml
│   └── districts.yml
│
├── src/
│   ├── main.py
│   ├── config.py
│   ├── discovery/
│   │   ├── rss.py
│   │   ├── sitemap.py
│   │   ├── listing.py
│   │   └── gdelt.py
│   ├── fetcher.py
│   ├── robots.py
│   ├── metadata.py
│   ├── url_normalizer.py
│   ├── validator.py
│   ├── relevance.py
│   ├── dedupe.py
│   ├── story_cluster.py
│   ├── issue_rules.py
│   ├── metrics.py
│   ├── public_snapshot.py
│   ├── source_health.py
│   └── firestore_repo.py
│
├── tests/
│   ├── test_url_normalizer.py
│   ├── test_date_parser.py
│   ├── test_relevance.py
│   ├── test_dedupe.py
│   ├── test_story_cluster.py
│   └── fixtures/
│
├── docs/
│   ├── SOURCE-ONBOARDING.md
│   ├── DATA-DICTIONARY.md
│   └── OPERATIONS.md
│
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

# 46. DEPENDENCY PYTHON

```text
firebase-admin
google-cloud-firestore
httpx
feedparser
beautifulsoup4
lxml
trafilatura
dateparser
python-dateutil
rapidfuzz
PyYAML
```

Jangan menambah library AI berat sebelum core stabil.

---

# 47. GDELT

GDELT hanya secondary discovery:

```text
query
↓
candidate URL
↓
source/domain validation
↓
fetch original article
↓
normal validation
```

Tidak langsung masuk KPI.

---

# 48. MEDIA SOSIAL

Belum diimplementasikan dalam produksi awal.

Frontend:

```text
Media sosial belum termasuk dalam perhitungan KPI.
```

Kelak buat pipeline/collection terpisah.

---

# 49. COMMAND CENTER

Command Center tidak melakukan crawler.

Hanya membaca:

```text
mi_public/current
```

Contoh:

```text
MEDIA INTELLIGENCE

Mentions 24h        17
Unique Stories       6
Critical Issues      2
Last Sync          14:21 WITA
Status             FRESH
```

Tidak hard-coded.

---

# 50. TAHAP IMPLEMENTASI — URUTAN WAJIB

---

## TAHAP 0 — AMANKAN BASELINE DAN HENTIKAN KLAIM LIVE PALSU

### Tujuan

Mengamankan halaman produksi sebelum backend dibangun.

### Kerjakan

1. Backup `media-intelligence.html`.
2. Pertahankan layout.
3. `LIVE RADAR` → `MODE PENGEMBANGAN / DATA DEMO`.
4. `NLP LIVE` → `ANALISIS BELUM AKTIF`.
5. Tambahkan disclaimer bahwa integrasi data aktual sedang dibangun.
6. Hide/remove sementara:
   - Reach
   - Engagement
   - Social Media dummy
   - Suara Warga dummy
   - Disposisi dummy
7. `Sinkron Data` → `Muat Ulang Tampilan`.
8. Jangan ubah URL.

### Acceptance criteria

- tidak ada data simulasi yang terlihat sebagai data aktual;
- layout desktop/mobile stabil;
- halaman lain tidak berubah.

### STOP

Jangan lanjut sebelum aman.

---

## TAHAP 1 — ENGINE REPOSITORY DAN TEST FOUNDATION

### Tujuan

Fondasi tanpa menulis production database.

### Kerjakan

Buat private repo `media-intelligence-engine`.

Implement:

```text
config loader
URL normalizer
date normalizer
relevance skeleton
dedupe helper
structured logger
```

Buat unit tests.

### Acceptance criteria

`pytest` lulus untuk:

- tracking URL removal;
- canonical normalization;
- timezone Asia/Makassar;
- future date reject;
- relevance score;
- exact duplicate.

### Dilarang

- Firestore production write;
- mass crawling;
- NLP.

---

## TAHAP 2 — FIRESTORE SCHEMA, RULES, INDEXES, WIF

### Tujuan

Backend aman.

### Kerjakan

1. Existing Firebase project.
2. Tidak membuat DB kedua.
3. Collection `mi_*`.
4. Merge `firestore.rules`.
5. `firestore.indexes.json`.
6. Dedicated crawler service account.
7. Workload Identity Federation.
8. Restrict WIF ke repo + `main`.
9. Test GitHub Action write/read/delete test doc.

### Acceptance criteria

- no service-account JSON;
- WIF bekerja;
- existing Firebase modules tidak rusak;
- Spark tetap aktif.

### STOP

Jika rules existing terdampak, rollback.

---

## TAHAP 3 — SOURCE REGISTRY DAN 3 SOURCE PILOT

### Tujuan

Tes nyata dalam scope kecil.

### Pilih

```text
1 official/owned
1 regional/national media
1 local media
```

### Implement

```text
RSS/Sitemap discovery
robots check
fetch
metadata extraction
canonical validation
date validation
```

### Acceptance criteria per source

Verifikasi manual minimal 5 artikel:

```text
publisher benar
title benar
published date benar
canonical benar
URL artikel individual
```

Target field utama >=95% benar.

---

## TAHAP 4 — VALIDATION + RELEVANCE + DEDUPE

### Tujuan

Mencegah data salah.

### Implement

```text
normalized URL
domain validation
date provenance
relevance score
exact dedup
content fingerprint
error taxonomy
```

### Test dataset

```text
20 relevant
20 irrelevant
10 duplicate
10 date anomaly
```

Tidak boleh ada artikel lama disamarkan sebagai baru.

---

## TAHAP 5 — FIRESTORE WRITER + SOURCE HEALTH + SYNC RUN

### Tujuan

Audit-able ingestion.

### Setiap run

```text
create mi_sync_runs
process source
update mi_source_state
write/update mi_items
finish mi_sync_runs
```

Run manual tiga kali.

### Acceptance criteria

- run 2 tidak menggandakan;
- run 3 konsisten;
- source health benar;
- duplicate count benar;
- runtime <15 menit.

---

## TAHAP 6 — STORY CLUSTER + ISSUE FOUNDATION + METRICS

### Tujuan

Intelligence layer.

### Implement

```text
mi_story_clusters
mi_issues
daily/current metrics
```

KPI:

```text
earned_mentions_24h
unique_stories_24h
active_sources_24h
active_critical_issues
```

### Acceptance criteria

4 portal memberitakan kejadian sama:

```text
4 mentions
1 story
```

bukan 4 issues.

---

## TAHAP 7 — PUBLIC SNAPSHOT

### Tujuan

Frontend murah dan sederhana.

### Implement

Generate:

```text
mi_public/current
```

Verified only.

Dilarang memasukkan:

```text
PII
review notes
admin identity
internal disposition
raw internal errors
```

### Acceptance criteria

Satu doc dapat render dashboard utama dan jauh di bawah 1 MiB.

---

## TAHAP 8 — CUTOVER FRONTEND

### Tujuan

Menghapus dummy tanpa mengganti desain besar.

### Kerjakan

1. Firebase SDK.
2. Render `mi_public/current`.
3. Hapus:
   - `MEDIA_DATA_MASTER`
   - localStorage intelligence
   - fake sync
   - hard-coded KPI
   - hard-coded ticker
4. KPI:
   - Media Mentions
   - Unique Stories
   - Active Sources
   - Critical Issues
5. Header freshness nyata.
6. Show:
   - Last Data Update
   - Last Full Sync
   - Source Coverage
7. `Muat Ulang Data`.
8. Dynamic ticker.
9. Social tabs hidden.
10. Citizen Voice dummy removed.

### Acceptance criteria

- source code tidak memuat KPI manual;
- reload tidak membaca localStorage lama;
- offline tidak mengklaim FRESH;
- semua feed menuju source original;
- metadata cocok source.

---

## TAHAP 9 — ADMIN REVIEW

### Tujuan

Human validation.

### Buat

```text
media-intelligence-admin.html
```

Firebase Auth.

Fitur:

```text
ACCEPT
REJECT
EDIT
MERGE STORY
ATTACH ISSUE
SET SEVERITY
```

Audit log wajib.

### Acceptance criteria

- unauthorized ditolak;
- public tidak dapat membaca queue;
- admin action tercatat;
- approved item masuk public snapshot berikutnya.

---

## TAHAP 10 — SCALE SOURCE 3 → 8–15

Tambah satu per satu.

Setiap source wajib onboarding dan 5–10 article verification test.

Jangan menambahkan banyak source sekaligus tanpa test individual.

---

## TAHAP 11 — GDELT SECONDARY DISCOVERY

Query:

```text
Disperindag Pinrang
Disperindag ESDM Pinrang
Pinrang + LPG
Pinrang + pasar
Pinrang + harga pangan
Pinrang + metrologi
Pinrang + IKM
Pinrang + ESDM
```

Semua candidate tetap melewati original verification.

### Acceptance criteria

- no GDELT item masuk KPI tanpa validasi;
- unknown domain review;
- direct duplicate tidak dihitung dua kali.

---

## TAHAP 12 — OPTIONAL TONE/NLP

### Prasyarat

Core minimal 2 minggu stabil.

### Kerjakan

Pilih model Indonesia dan validasi manual minimal 100 artikel.

Dokumentasikan:

```text
accuracy
macro F1
confusion cases
confidence threshold
```

UI gunakan:

```text
AI-Assisted Tone
```

bukan `NLP LIVE`.

---

## TAHAP 13 — COMMAND CENTER INTEGRATION

Command Center hanya membaca `mi_public/current`.

Ringkas:

```text
Media Mentions 24h
Unique Stories
Critical Issues
Last Sync
Status
```

### Acceptance criteria

Nilai identik dengan Media Intelligence pada snapshot sama.

---

## TAHAP 14 — CLEANUP, BACKUP, OPERATIONS

Implement:

```text
cleanup.yml
backup.yml
docs/OPERATIONS.md
```

Dokumentasikan:

```text
cara add source
cara disable source
cara run manual
cara review failed workflow
cara repair parser
cara check quota
cara rollback
```

---

## TAHAP 15 — PRODUCTION CUTOVER

Checklist:

```text
[ ] tidak ada dummy KPI
[ ] tidak ada fake article
[ ] tidak ada fake social post
[ ] tidak ada fake citizen comment
[ ] tidak ada fake disposition
[ ] no localStorage intelligence source
[ ] GitHub scheduler aktif
[ ] WIF aktif
[ ] source registry verified
[ ] Firestore rules aman
[ ] public snapshot aktif
[ ] admin review aktif
[ ] status freshness nyata
[ ] source health nyata
[ ] ticker dynamic
[ ] Command Center sinkron
[ ] mobile diuji
[ ] dark mode diuji
[ ] no console error
```

Baru ubah:

```text
MODE PENGEMBANGAN
```

menjadi:

```text
MEDIA INTELLIGENCE
DATA AKTUAL — NEAR REAL-TIME
```

---

# 51. ACCEPTANCE TEST BERITA — WAJIB MANUAL

Minimal 30 berita.

| Field | Dashboard | Source Original | Match |
|---|---|---|---|
| Publisher | | | |
| Title | | | |
| Published date | | | |
| URL | | | |
| Topic | | | |
| Kecamatan | | | |
| Story cluster | | | |

Target:

```text
100% source URL valid
100% publisher domain benar
100% tanggal tidak dibuat-buat
100% title berasal dari source
```

---

# 52. FAILURE SCENARIO TEST

Wajib simulasi:

```text
network timeout
HTTP 403
HTTP 500
RSS kosong
date missing
canonical redirect
duplicate URL
duplicate title
future date
portal markup berubah
Firestore write gagal
frontend Firestore gagal
```

Expected:

- sistem tidak crash total;
- source health mencatat;
- dashboard degraded/stale;
- data valid lama tidak dihapus;
- tidak muncul angka nol palsu.

---

# 53. PERFORMANCE GUARDRAIL

```text
enabled sources <= 15
candidate/source/run <= 30–50
article fetch concurrency <= 5–6
runtime target <= 7 min
hard timeout <= 15 min
```

Scale hanya jika data menunjukkan perlu.

---

# 54. FIRESTORE BUDGET INTERNAL

Target konservatif:

```text
100 candidate/day
50 verified writes/day
100–500 internal reads/day
6 public snapshot writes/day
```

Public frontend hanya membaca/listen satu doc `mi_public/current`.

Jangan query ribuan `mi_items` pada page load.

---

# 55. UI FINAL

Header:

```text
MEDIA INTELLIGENCE HUB
Berita Online & Isu Strategis Disperindag ESDM Pinrang

🟢 DATA FRESH
Last update 14:21 WITA
19/20 source healthy
```

KPI:

```text
MEDIA MENTIONS 24H
UNIQUE STORIES
ACTIVE SOURCES
CRITICAL ISSUES
```

Main:

```text
Top Stories / Radar Isu
Latest Verified Coverage
Issue Monitor
Source Health Summary
```

Social:

```text
MEDIA SOSIAL
Belum terintegrasi dalam KPI
```

---

# 56. HAL YANG SENGAJA TIDAK DILAKUKAN

```text
NO Cloud Functions
NO Cloud Run
NO Blaze
NO paid media monitoring API
NO paid social API
NO Google Custom Search API dependency
NO fake reach estimate
NO fake engagement estimate
NO generated social comments
NO hard-coded sentiment
NO browser GitHub token
NO second Firestore database
NO full article archive
```

---

# 57. REFERENSI TEKNIS

- Firebase pricing / Spark:
  `https://firebase.google.com/pricing`
- Firestore quotas:
  `https://firebase.google.com/docs/firestore/quotas`
- Firebase Hosting:
  `https://firebase.google.com/docs/hosting`
- GitHub Actions billing:
  `https://docs.github.com/en/billing/concepts/product-billing/github-actions`
- GitHub scheduled workflows:
  `https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows`
- Google Workload Identity Federation:
  `https://cloud.google.com/iam/docs/workload-identity-federation`
- GitHub Google Auth:
  `https://github.com/google-github-actions/auth`

Gunakan dokumentasi resmi terbaru, bukan tutorial lama.

---

# 58. PERINTAH MASTER UNTUK ANTIGRAVITY

> Kerjakan hanya tahap yang saya berikan dari dokumen MASTER IMPLEMENTATION PLAN Media Intelligence Disperindag ESDM Pinrang. Jangan meringkas scope, jangan meloncat ke tahap berikutnya, jangan melakukan refactor di luar scope, dan jangan mengganti arsitektur. Pertahankan UI existing selama tidak disebut perlu berubah. Semua data intelligence harus berasal dari Firestore/engine nyata, bukan hard-coded atau localStorage. Jika tahap memiliki acceptance criteria, selesaikan dan laporkan hasil pengujiannya sebelum melanjutkan. Jika ada masalah atau ketidakpastian metadata/sumber, fail closed ke NEEDS_REVIEW; jangan membuat nilai asumsi. Jangan mengaktifkan layanan berbayar atau mengubah Firebase dari Spark ke Blaze.

---

# 59. FORMAT LAPORAN SETIAP TAHAP

```text
TAHAP:
STATUS: PASS / FAIL / PARTIAL

FILES CREATED:
-

FILES MODIFIED:
-

FIRESTORE CHANGES:
-

TESTS RUN:
-

TEST RESULT:
-

ACCEPTANCE CRITERIA:
[ ] ...
[ ] ...

KNOWN ISSUES:
-

NEXT STEP:
Jangan dikerjakan sampai diperintahkan.
```

Jika tidak ada laporan ini, tahap dianggap belum selesai.

---

# 60. KEPUTUSAN FINAL

Arsitektur ini memenuhi:

```text
AKTUAL
VALID
AUDITABLE
IDEMPOTENT
LOW-COST
SPARK-COMPATIBLE
NO PAID BACKEND
NO FAKE KPI
NO SOCIAL API DEPENDENCY
LOW FIRESTORE READ
EASY ROLLBACK
EASY SOURCE MAINTENANCE
```

Urutan implementasi tidak boleh dibalik.

Prioritas:

```text
1. Validitas fakta
2. Traceability sumber
3. Reliability crawler
4. Data model
5. Firestore & security
6. Intelligence clustering
7. Dashboard
8. AI/tone
9. Social media
```

Dengan urutan tersebut, Media Intelligence dibangun sebagai sistem yang setiap angka dan setiap berita dapat dipertanggungjawabkan sampai ke URL sumber aslinya.
