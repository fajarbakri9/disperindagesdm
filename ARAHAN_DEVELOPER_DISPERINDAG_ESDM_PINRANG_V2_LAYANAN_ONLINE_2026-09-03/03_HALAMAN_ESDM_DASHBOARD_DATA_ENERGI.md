# HALAMAN ESDM — DASHBOARD & DATA ENERGI

## 1. TUJUAN

Halaman ESDM berfungsi sebagai **landing page + dashboard publik** untuk informasi energi Kabupaten Pinrang.

Route direkomendasikan:
```text
/dashboard-esdm
```

atau mengikuti routing existing jika sudah tersedia.

Label navigasi:
```text
ESDM
```

Judul halaman:
```text
Dashboard ESDM Kabupaten Pinrang
```

Subjudul:
```text
Informasi Energi, LPG 3 Kg dan BBM Kabupaten Pinrang
```

---

## 2. STRUKTUR HALAMAN

```text
1. Hero
2. Ringkasan Data Energi
3. Deskripsi Singkat Kondisi Energi
4. Dashboard / Statistik Utama
5. LPG 3 Kg Summary + CTA
6. BBM Summary + CTA
7. GIS / Persebaran Energi
8. Intervensi / Monitoring
9. Edukasi
10. Sumber Data
11. Dokumen Terkait
```

---

## 3. HERO

Tampilkan:

```text
Energi & Sumber Daya Mineral Kabupaten Pinrang

Dashboard informasi publik mengenai jaringan penyaluran LPG 3 Kg,
BBM, infrastruktur energi, distribusi, serta kegiatan monitoring
dan intervensi Disperindag ESDM Kabupaten Pinrang.
```

Metadata:

```text
Diperbarui: [dynamic timestamp]
Sumber: [dynamic source]
Status: [verified/published]
```

Jangan:
```text
REALTIME
LIVE
```
jika datanya snapshot/periodik.

---

## 4. RINGKASAN DATA ENERGI

Dua kelompok utama:

### LPG 3 KG
- Agen LPG
- Pangkalan
- SPBE jika tersedia dan valid
- HET
- status snapshot

### BBM
- SPBU Reguler
- SPBU Kompak
- SPBU Nelayan
- Pertashop
- kategori lain jika memang ada dalam master valid

Data master:
- READ ONLY;
- query Firestore;
- tidak diedit dari halaman dashboard;
- tidak diketik manual.

---

## 5. DESKRIPSI SINGKAT

Gunakan paragraf non-numerik agar tidak cepat stale.

Contoh:

```text
Jaringan distribusi energi Kabupaten Pinrang mencakup penyaluran
LPG 3 Kg dan BBM melalui jaringan resmi yang tersebar di wilayah
kabupaten. Data pada dashboard bersumber dari basis data Disperindag
ESDM dan sumber resmi terkait serta diperbarui sesuai periode pelaporan.
```

Jika ingin menyebut angka, gunakan dynamic component.

---

## 6. DASHBOARD

Kartu KPI:
- total agen;
- total pangkalan;
- total penyalur BBM;
- total SPBU;
- total Pertashop;
- data kuota LPG;
- realisasi;
- intervensi terbaru.

Jangan menampilkan KPI jika:
- sumber tidak ada;
- verificationStatus belum verified;
- query gagal.

Tampilkan:
```text
Data belum dapat dimuat
[Coba Lagi]
```

---

## 7. LPG 3 KG — SUMMARY CARD

Contoh:

```text
LPG 3 KG

Informasi distribusi LPG 3 Kg bersubsidi, agen resmi, pangkalan,
HET, kuota, realisasi, pengawasan dan intervensi.

Agen: [dynamic]
Pangkalan: [dynamic]
HET: [dynamic/verified]

[Lihat Data LPG 3 Kg]
```

CTA target:
- halaman detail LPG existing;
- jangan buat route baru jika halaman detail sudah ada.

---

## 8. BBM — SUMMARY CARD

```text
BBM

Informasi jaringan penyalur BBM Kabupaten Pinrang meliputi SPBU,
SPBU Kompak, SPBU Nelayan, Pertashop dan data pendukung lainnya.

SPBU Reguler: [dynamic]
SPBU Kompak: [dynamic]
SPBU Nelayan: [dynamic]
Pertashop: [dynamic]

[Lihat Data BBM]
```

Data master tidak editable dari Dashboard ESDM.

---

## 9. HALAMAN DETAIL LPG 3 KG

Target isi:

```text
Hero
Ringkasan
Agen
Pangkalan
HET
Kuota & Realisasi
Intervensi
GIS
Edukasi
Pengaduan
Dokumen
Sumber Data
```

Jangan duplikasi collection.

---

## 10. HALAMAN DETAIL BBM

Target isi:

```text
Hero
Ringkasan
SPBU Reguler
SPBU Kompak
SPBU Nelayan
Pertashop
GIS
Kemetrologian terkait pompa ukur
Informasi Publik
Dokumen
Sumber Data
```

---

## 11. SNAPSHOT LPG

Gunakan collection additive, contoh:

```text
esdmSnapshots/
```

Record:
```json
{
  "category": "lpg",
  "periodLabel": "September 2026",
  "sourceDate": "2026-09-03",
  "quota": null,
  "realization": null,
  "forecast": null,
  "sourceOrganization": "",
  "verificationStatus": "verified",
  "status": "published"
}
```

Jangan mengganti struktur master agen/pangkalan.

---

## 12. INTERVENSI

Collection:
```text
esdmInterventions/
```

Jenis:
```text
extra_dropping
sidak
monitoring
penertiban
koordinasi
penambahan_distribusi
lainnya
```

---

## 13. SOURCE ATTRIBUTION

Setiap blok:
```text
Sumber: ...
Periode: ...
Diperbarui: ...
Status: ...
```

---

## 14. ERROR STATE

### Loading
```text
Memuat data energi...
```

### Empty
```text
Belum ada data terpublikasi untuk periode ini.
```

### Error
```text
Data belum dapat dimuat saat ini.
[Coba Lagi]
```

Jangan fallback ke angka lama.

---

## 15. RESPONSIVE

Desktop:
- KPI 4 kolom;
- LPG/BBM 2 kolom;
- chart + info side-by-side.

Tablet:
- KPI 2 kolom.

Mobile:
- KPI 1 kolom;
- chart full width;
- LPG/BBM stacked;
- no horizontal scroll.

---

## 16. SEO

```text
<title>Dashboard ESDM Kabupaten Pinrang | Disperindag ESDM</title>
```

Description:
```text
Dashboard informasi energi, LPG 3 Kg, BBM, distribusi dan layanan
ESDM Kabupaten Pinrang.
```

OG image:
- khusus ESDM;
- bukan homepage generic.

---

## 17. ACCEPTANCE

- [ ] Hero jelas.
- [ ] Ada ringkasan energi.
- [ ] Ada deskripsi singkat.
- [ ] LPG summary tersedia.
- [ ] BBM summary tersedia.
- [ ] CTA detail berfungsi.
- [ ] Data master read-only.
- [ ] Tidak ada angka hard-coded.
- [ ] Source attribution tampil.
- [ ] GIS terhubung.
- [ ] Responsive.
