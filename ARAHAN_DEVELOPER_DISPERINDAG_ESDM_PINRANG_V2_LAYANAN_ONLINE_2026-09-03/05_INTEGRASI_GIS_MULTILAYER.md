# INTEGRASI GIS MULTILAYER EXISTING

## 1. PRINSIP

Pinrang sudah memiliki GIS multilayer.

**JANGAN membuat GIS baru.**

Gunakan GIS existing sebagai visual representation layer.

---

## 2. TARGET LAYER

### Perdagangan
- pasar;
- sarana perdagangan;
- lokasi strategis lain jika valid.

### LPG
- agen;
- pangkalan;
- wilayah distribusi jika tersedia.

### BBM
- SPBU;
- SPBU Kompak;
- SPBU Nelayan;
- Pertashop.

### Industri
- IKM;
- sentra;
- komoditas unggulan.

### Pelayanan
- kantor;
- UPTD;
- titik layanan.

---

## 3. DATA FLOW

Benar:

```text
Master Firestore
      |
      v
GIS layer resolver
      |
      v
Map
```

Salah:

```text
Master Firestore
+
GIS database duplicate
```

---

## 4. POPUP

Contoh LPG:

```text
Nama Pangkalan
Agen
Alamat
Kecamatan
Kelurahan/Desa
Status Verifikasi
Tanggal Verifikasi
[Lihat Detail]
```

BBM:

```text
Nama Penyalur
Kategori
Alamat
Kecamatan
Status
[Lihat Detail]
```

---

## 5. KOORDINAT

Gunakan status:

```text
verified
pending_verification
```

Jangan tampilkan label "terverifikasi" jika belum.

---

## 6. ROUTE STATE

Ideal:
```text
/gis?layers=lpg
/gis?layers=bbm
/gis?layers=lpg,bbm
/gis?layers=markets
```

Jika router existing tidak mendukung query param, gunakan pendekatan current system.

---

## 7. INTEGRASI ESDM

Halaman ESDM:
```text
[Lihat Peta Infrastruktur Energi]
```

Target:
```text
GIS + layer LPG + BBM aktif
```

---

## 8. PERFORMANCE

- clustering;
- lazy popup;
- marker virtualization jika banyak;
- jangan load seluruh detail besar pada initial map;
- filter by viewport jika feasible.

---

## 9. MOBILE

- filter layer menjadi bottom sheet/drawer;
- popup jangan keluar layar;
- CTA detail full-width;
- legend collapsible.

---

## 10. TV LAYANAN

TV dapat menampilkan GIS dalam mode publik:
- hanya layer public;
- tidak expose data internal;
- tidak expose data pending;
- tidak expose nama pelapor/pengaduan.

---

## 11. ACCEPTANCE

- [ ] GIS existing tetap digunakan.
- [ ] Tidak ada duplicate master.
- [ ] LPG/BBM dari Firestore existing.
- [ ] Status verifikasi jelas.
- [ ] Route layer dapat dibuka dari ESDM.
- [ ] Mobile usable.
