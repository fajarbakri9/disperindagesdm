# STRUKTUR MENU & NAVIGASI RESPONSIVE — V2

## 1. TOP LEVEL TETAP 6 ITEM

```text
BERANDA
PROFIL
LAYANAN PUBLIK
DATA & PETA
INFORMASI PUBLIK
BERITA & RILIS
```

Jangan menambah top-level:
```text
SIPK
PERMOHONAN
LAYANAN ONLINE
```

---

## 2. LAYANAN PUBLIK — MEGA MENU

Susun 3 kolom:

```text
PELAYANAN
- Standar Pelayanan & SOP
- Maklumat Pelayanan
- Survei Kepuasan Masyarakat
- Pengaduan Online
- Kontak & Lokasi

LAYANAN SEKTORAL
- Harga Bahan Pokok
- Pasar
- Metrologi Legal
- Industri & IKM
- ESDM

LAYANAN ONLINE
- Permohonan
- Lacak Permohonan
- Informasi Layanan Digital
- TV Layanan Publik
```

### Tahap saat ini
`Permohonan` aktif sebagai halaman informasi:
> Dalam Tahap Pengembangan

`Lacak Permohonan`:
- boleh belum ditampilkan;
- atau ditampilkan disabled dengan label “Segera Hadir”;
- jangan menyediakan field tracking palsu.

Rekomendasi paling bersih untuk sekarang:
```text
LAYANAN ONLINE
- Permohonan
- TV Layanan Publik
```

Tambahkan `Lacak Permohonan` saat backend tracking aktif.

---

## 3. ROUTE

Rekomendasi kompatibel static hosting:

```text
/layanan-online.html
/permohonan.html
```

Jika sistem sudah memakai clean URL:

```text
/layanan-online
/permohonan
```

Jangan mengubah semua route existing hanya untuk konsistensi.

---

## 4. MOBILE

```text
LAYANAN PUBLIK ▼
  Informasi Layanan
  Pengaduan
  Harga
  Pasar
  Metrologi
  Industri & IKM
  ESDM
  Permohonan
  TV Layanan
```

Badge pada Permohonan:
```text
Dalam Pengembangan
```

Badge harus kecil dan tidak mengganggu menu.

---

## 5. SINGLE NAV CONFIG

Tambahkan status opsional:

```javascript
{
  id: 'online-application',
  label: 'Permohonan',
  href: 'permohonan.html',
  badge: 'Dalam Pengembangan',
  disabled: false
}
```

`disabled=false` karena halaman informasi tetap dapat dibuka.

Jangan:
```javascript
href: '#'
```

karena membingungkan accessibility.

---

## 6. ACCEPTANCE

- [ ] Header tetap 1 baris.
- [ ] Layanan Online tidak menjadi top-level.
- [ ] Permohonan menuju halaman informasi.
- [ ] Tidak ada tombol tracking palsu.
- [ ] Mobile rapi.
- [ ] Desktop/mobile/footer dari config yang sama.
