# Bukti Acceptance Media Intelligence

Tanggal pengujian: 30 Agustus 2026 (WITA)

## Skenario kegagalan

Status: **PASS**

Pengujian otomatis mencakup:

- timeout dan koneksi sumber terputus;
- HTTP 403 dan HTTP 500;
- RSS rusak/kosong;
- tanggal publikasi hilang atau berada di masa depan;
- canonical redirect;
- URL dan konten duplikat;
- markup artikel berubah dengan fallback RSS;
- pembacaan Firestore frontend gagal dan UI masuk kondisi degraded.

Kegagalan discovery dicatat sebagai kegagalan kesehatan sumber, bukan disamarkan sebagai hasil kosong yang sukses. Fallback RSS diberi status `VERIFIED_FEED`, bukan `VERIFIED_DIRECT`.

## Acceptance browser production

Status: **PASS**

Target: `https://disperindagesdm-pinrang.web.app/media-intelligence`

Lingkungan: Chrome headless, viewport mobile 390×844.

Hasil:

- halaman selesai dimuat;
- lebar viewport benar dan tidak ada overflow horizontal;
- snapshot production dirender (8 kartu berita);
- indikator `DATA AKTUAL FRESH` tampil;
- fungsi toggle tema tersedia;
- dark mode aktif dengan warna latar dan teks yang sesuai;
- tidak ada error console, log, atau runtime.

Pengujian dapat diulang dengan Chrome DevTools pada port 9223:

```bash
node engine/scripts/browser_acceptance.mjs "https://disperindagesdm-pinrang.web.app/media-intelligence"
```

## Audit artikel production

Status: **BELUM MEMENUHI CUTOVER**

Dari 8 artikel pada snapshot, audit otomatis ketat menghasilkan **4/8 lulus**:

- 4 artikel cocok langsung untuk URL, judul, publisher, dan tanggal;
- 2 artikel Harian Fajar cocok untuk URL, judul, dan tanggal, tetapi halaman asal tidak menyediakan metadata publisher yang dapat diverifikasi ulang;
- 2 artikel Pinrang Terkini tidak dapat diekstrak ulang dari halaman asal saat audit dan hanya boleh diperlakukan sebagai bukti feed sampai tersedia bukti langsung.

Syarat final tetap 30 artikel dengan empat field cocok 100%. Kekurangan bukti tidak boleh diisi dengan asumsi atau data buatan.

Laporan mesin tersimpan di `engine/reports/production_article_audit.json` dan
readiness sekarang fail-closed jika laporan belum berstatus PASS dengan minimal
30 artikel.
