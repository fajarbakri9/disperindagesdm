# PINRANG ISSUE DISCOVERY ENGINE

> **Sistem Media Intelligence dan Early Warning**  
> Disperindag ESDM Kabupaten Pinrang, Sulawesi Selatan

---

## Apa Ini?

Bukan sekadar news scraper. Ini adalah **multi-source discovery + intelligence engine** yang:

- 🔍 **Menemukan** isu dari 30+ sumber media secara otomatis
- 🧠 **Menganalisis** sentimen, topik, dan lokasi via Gemini AI
- 🗂️ **Mengelompokkan** artikel yang membahas kejadian sama (deduplication)
- 📈 **Mengukur** seberapa kritis suatu isu berdasarkan 7 faktor
- 🚨 **Mendeteksi** eskalasi isu dari lokal → regional → nasional
- 📺 **Menampilkan** hasil di TV Wallboard realtime

---

## Arsitektur

```
GitHub Actions (setiap 30 mnt)
    │
    ▼
Python Collector
├── Discovery Engine    ← RSS + Google News
├── Metadata Extractor  ← JSON-LD, OpenGraph
├── Relevance Engine    ← Skor 0-100
├── Gemini AI           ← Sentimen + Topik + Lokasi
├── Issue Clusterer     ← Deduplication
└── Firestore Writer
    │
    ▼
Firebase Firestore
    │
    ▼
React/Vite Wallboard  ←  TV FULLSCREEN
```

---

## Struktur Project

```
pinrang-intel/
├── collector/           ← Python intelligence engine
│   ├── main.py          ← Entry point
│   ├── discovery.py     ← RSS + search discovery
│   ├── extractor.py     ← Metadata (JSON-LD, OG)
│   ├── relevance.py     ← Relevance & Critical Score
│   ├── intelligence.py  ← Gemini AI analysis
│   ├── clusterer.py     ← Issue deduplication
│   ├── firestore_writer.py
│   ├── config_loader.py
│   └── requirements.txt
│
├── config/              ← Konfigurasi (di-seed ke Firestore)
│   ├── source_registry.json     ← 30 sumber Tier A+/A/B
│   ├── keyword_dictionary.json  ← 13 cluster keyword
│   ├── location_dictionary.json ← 12 kecamatan + lokasi strategis
│   └── scoring_weights.json     ← Formula scoring
│
├── frontend/            ← React/Vite wallboard
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx  ← TV Wallboard utama
│       │   └── Admin.jsx      ← Panel admin
│       ├── mockdata/index.js  ← Data contoh untuk dev
│       └── index.css          ← Design system
│
├── scripts/
│   └── seed_firestore.py ← Upload config ke Firestore (jalankan 1x)
│
├── .github/workflows/
│   └── collector.yml     ← GitHub Actions
│
├── firestore.rules       ← Security rules
├── firestore.indexes.json
└── firebase.json
```

---

## Quick Start (Developer)

### 1. Clone & Install

```bash
git clone <repo>
cd pinrang-intel

# Frontend
cd frontend
npm install
```

### 2. Jalankan wallboard dengan mock data

```bash
cd frontend
npm run dev
```

Buka `http://localhost:5173` — wallboard langsung berjalan dengan **data contoh kasus aktual 2026** (LPG Bungi, Solar Suppa, Harga Pangan).

### 3. Setup Firebase (untuk production)

1. Buat project di [Firebase Console](https://console.firebase.google.com)
2. Aktifkan **Firestore Database**
3. Download **Service Account key** → simpan sebagai `firebase-sa.json` di root project
4. Buat `frontend/.env.local` dari template:
   ```bash
   cp frontend/.env.example frontend/.env.local
   # Edit dengan nilai Firebase project Anda
   ```

### 4. Seed konfigurasi ke Firestore

```bash
cd pinrang-intel
pip install -r collector/requirements.txt
python scripts/seed_firestore.py
```

### 5. Test collector (dry run tanpa tulis Firestore)

```bash
cd collector
python main.py --dry-run
```

### 6. Setup GitHub Actions

Di repository GitHub, tambahkan **Secrets**:

| Secret | Nilai |
|--------|-------|
| `GEMINI_API_KEY` | API key dari Google AI Studio |
| `FIREBASE_PROJECT_ID` | ID project Firebase |
| `FIREBASE_SERVICE_ACCOUNT` | Isi JSON service account (seluruh isi file) |

Setelah secrets ditambahkan, collector akan berjalan otomatis **setiap 30 menit**.

---

## Firestore Collections

| Collection | Isi | Akses |
|---|---|---|
| `/config/sources` | Registry 30+ sumber | Admin write, public read |
| `/config/keywords` | 13 cluster keyword | Admin write, public read |
| `/config/locations` | 12 kecamatan + lokasi | Admin write, public read |
| `/config/system` | Dynamic entities, watchlist | Admin write, public read |
| `/mentions/{id}` | Semua artikel terdeteksi | Public read, SA write |
| `/issues/{id}` | Master issue (deduped) | Public read, SA write |
| `/source_health/{id}` | Kesehatan sumber | Public read, SA write |
| `/dashboard/current` | Snapshot TV wallboard | Public read, SA write |
| `/alerts/{id}` | Alert domain baru, dll | Auth read/write |
| `/stats_daily/{date}` | Statistik harian | Public read, SA write |

---

## Scoring Formula

### Relevance Score (0–100)

| Komponen | Max |
|---|---|
| Geographic match (kabupaten/kecamatan/desa) | 30 |
| Topic match (cluster keyword) | 30 |
| Entity match (disperindag/kadis) | 15 |
| Risk keywords (langka/penimbunan/mahal) | 15 |
| Source relevance (bobot sumber) | 10 |

| Score | Status |
|---|---|
| 0–29 | Abaikan |
| 30–44 | Kandidat |
| 45–59 | Monitor |
| 60–74 | Relevan |
| 75–100 | High Relevance |

### Critical Score (0–100)

| Faktor | Bobot |
|---|---|
| Severity (dari cluster keyword) | 25% |
| Mention velocity (24 jam terakhir) | 20% |
| Source count (jumlah media unik) | 15% |
| Negative sentiment % | 10% |
| Citizen complaints | 10% |
| Geographic spread (kecamatan) | 10% |
| Public engagement | 10% |

| Score | Status | Warna |
|---|---|---|
| 0–39 | NORMAL | 🟢 |
| 40–59 | MONITOR | 🔵 |
| 60–74 | WASPADA | 🟡 |
| 75–89 | TINGGI | 🟠 |
| 90–100 | KRITIS | 🔴 |

---

## Deduplication Rule

```
ARTIKEL A + ARTIKEL B = ISU YANG SAMA jika:
  ✓ Cluster topik sama (misal: keduanya cluster "lpg")
  ✓ Lokasi sama (kecamatan atau desa)
  ✓ Judul mirip > 65% (Jaccard bigram similarity)
  ✓ Dipublish dalam 72 jam dari mention pertama
```

**Contoh kasus LPG Bungi Agustus 2026:**
```
"Heboh Emak-emak di Pinrang Labrak Pangkalan LPG..."  →  issue baru: lpg_bungi_20260821
"Kontrak Pangkalan LPG di Pinrang Diputus..."          →  tambah ke: lpg_bungi_20260821
"Terkuak Permainan Harga LPG 3 Kg di Pinrang..."      →  tambah ke: lpg_bungi_20260821
```
Hasilnya: **1 kartu "5 media meliput"** bukan 5 kartu terpisah.

---

## Source Tier & Bobot

### Tier A+ (Interval 15-20 mnt)
Pinrang Terkini · Harian Fajar · BeritaSulsel · Voice Sulawesi · Ujung Jari · detikSulsel · RRI Makassar · **ANTARA Makassar** · Parepos · iNews Celebes

### Tier A (Interval 30-45 mnt)
CelebesMedia · TopSulsel · Republiknews · Pedoman Media · Sulselpos · Herald Sulsel · **Okita News** · Tribun Timur · Makassar Terkini · Sulselsatu · Kabar Bugis · Pinrang 24 Jam

### Tier B — Nasional (Per jam, discovery query)
ANTARA · Kompas · Liputan6 · SINDOnews · Media Indonesia · Kumparan · iNews.id · Tempo

> ⚠️ `sourceWeight` dan tier **hanya memengaruhi skor tampilan**, bukan kebenaran berita.

---

## Admin Panel

Akses di `/admin`:

- **Source Management**: Lihat status semua sumber, approve/watch/block domain baru
- **Keyword Management**: Tambah/hapus keyword per cluster tanpa ubah kode
- **Watchlist**: Tandai topik prioritas (hanya memengaruhi urutan tampilan)

---

## Menambahkan Nama Pejabat (Dynamic Entity)

Setelah seed, isi nama kadis/bupati aktif di Firestore:
```
/config/system → dynamicEntities:
  kadis:  "Nama Kadis Aktif"
  bupati: "Nama Bupati Aktif"
```

Collector akan otomatis mengenali nama tersebut sebagai entity match.

---

## Estimasi Penggunaan Firebase Spark (Gratis)

| Operasi | Estimasi/Hari | Limit Gratis |
|---|---|---|
| Firestore writes | ~500 | 50.000/hari |
| Firestore reads | ~2.000 | 50.000/hari |
| GitHub Actions | ~96 menit | 2.000 menit/bulan |
| Firebase Hosting | ~10 MB | 10 GB/bulan |

**Total biaya: Rp 0** (pada skala awal)

---

## Catatan Penting

1. **sourceUrl tidak boleh diganti** — selalu cari `<link rel="canonical">` dan simpan URL artikel asli, bukan Google News redirect
2. **thumbnailUrl tidak disimpan ke Storage** — gunakan `og:image` langsung dari portal asal
3. **watchlistMultiplier tidak mengubah fakta** — hanya mengatur urutan tampilan di wallboard
4. **Tier B filter ketat** — media nasional hanya masuk jika menyebut "Pinrang" + entitas dinas ATAU nama kecamatan

---

*Dikembangkan untuk Disperindag ESDM Kabupaten Pinrang — Sistem Media Intelligence dan Early Warning*
