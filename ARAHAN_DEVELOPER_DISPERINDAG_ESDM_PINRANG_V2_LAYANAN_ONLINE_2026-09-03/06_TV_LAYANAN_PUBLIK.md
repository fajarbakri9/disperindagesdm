# TV LAYANAN PUBLIK

## 1. POSISI

TV Layanan Publik adalah **public display system** untuk area Front Office / layanan publik.

Bukan Command Center.

---

## 2. TUJUAN

Menampilkan:
- informasi layanan;
- harga;
- LPG;
- BBM;
- pasar;
- GIS;
- berita;
- edukasi;
- SKM;
- pengaduan;
- flyer;
- QR.

---

## 3. DATA FLOW

```text
Firestore
   |
public projection
   |
TV Layanan
```

Jangan:
```text
Command Center -> TV Public
```
secara langsung.

---

## 4. ROUTE

Contoh:
```text
/tv-layanan
```

Route publik read-only.

---

## 5. SLIDE

Urutan default:

```text
01 Welcome
02 Jam / Tanggal / Cuaca
03 Pengumuman
04 Harga Bapok
05 LPG 3 Kg
06 BBM
07 Pasar
08 GIS
09 Standar Pelayanan
10 Edukasi
11 SKM
12 Pengaduan
13 Berita
14 Flyer
```

Tidak semua slide wajib aktif.

---

## 6. CMS TV

Tambahkan menu:

```text
TV Layanan
├── Playlist
├── Slide
├── Flyer
├── Jadwal
└── Preview
```

Field:

```text
title
type
enabled
priority
durationSec
startAt
endAt
dataSource
ctaUrl
publicOnly
```

---

## 7. DATA OTOMATIS

Jangan input ulang:
- harga;
- jumlah pasar;
- jumlah agen;
- jumlah pangkalan;
- SPBU;
- Pertashop.

TV membaca dari Firestore.

---

## 8. FLYER

Flyer:
- upload via CMS;
- schedule;
- auto-expire;
- aspect ratio aman;
- object-fit contain/cover sesuai tipe.

---

## 9. MEDIA INTELLIGENCE

Hanya berita:
```text
verified + curatedForPublic = true
```

Jangan otomatis publish semua hasil crawler.

---

## 10. PRIVACY

TV publik tidak boleh menampilkan:
- nama pelapor;
- nomor telepon;
- email;
- ticket detail sensitif;
- data internal agen;
- field admin;
- status investigasi internal.

---

## 11. DESIGN

Target:
- 16:9;
- readable dari jarak 3–5 meter;
- font besar;
- kontras tinggi;
- tidak terlalu banyak teks;
- satu pesan utama per slide;
- transisi sederhana.

---

## 12. AUTO SLIDE

```text
10–20 detik per slide
```

CMS dapat override.

Tambahkan:
- pause;
- fullscreen;
- auto recover;
- safe empty state.

---

## 13. ERROR STATE

Jika data gagal:
```text
Informasi sedang diperbarui
```

Jangan tampilkan angka statis lama.

---

## 14. ACCEPTANCE

- [ ] Route TV terpisah.
- [ ] Tidak ada data sensitif.
- [ ] Tidak ada fallback angka.
- [ ] CMS playlist tersedia.
- [ ] Public-only filter berjalan.
- [ ] Slide responsive 16:9.
- [ ] Fullscreen stabil.
