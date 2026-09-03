# MEDIA INTELLIGENCE INTEGRATION

## 1. POSISI

Media Intelligence adalah **sensing & verification layer**.

Bukan master data ESDM/perdagangan.

---

## 2. DATA FLOW

```text
Media Sources
     |
pipeline
     |
verification
     |
mi_public/current
     |
+----+-------------+
|                  |
v                  v
Command Center   Public Curated Feed
                   |
                   v
                TV Layanan
```

---

## 3. VERIFIED GUARD

Hanya status:
```text
VERIFIED_DIRECT
VERIFIED_FEED
MANUAL_VERIFIED
```

yang boleh tampil di public feed.

---

## 4. PUBLIC CURATION

Tambahkan field/projection:

```text
curatedForPublic: true
```

TV hanya mengambil:
```text
verified && curatedForPublic
```

---

## 5. URL

Canonical URL wajib valid:
- http/https;
- sanitize;
- rel noopener noreferrer.

---

## 6. THUMBNAIL

Jika image source invalid:
- gunakan placeholder brand;
- jangan hotlink URL berbahaya;
- jangan menampilkan gambar random.

---

## 7. FRESHNESS

Pertahankan:
```text
fresh
delayed
stale
offline
```

Display:
- sumber;
- waktu update;
- coverage.

---

## 8. COMMAND CENTER

Command Center boleh menampilkan:
- top issues;
- media volume;
- alert;
- cluster;
- sentiment (jika confidence cukup).

Tidak otomatis dipublikasikan ke TV.

---

## 9. TV LAYANAN

Gunakan:
- headline;
- publisher;
- thumbnail;
- waktu;
- QR/link opsional.

Jangan tampilkan:
- isu kritis internal;
- rumor;
- pending verification;
- negative internal alert tanpa kurasi.

---

## 10. ACCEPTANCE

- [ ] Verified guard tetap aktif.
- [ ] Public curation terpisah.
- [ ] TV tidak membaca raw crawler.
- [ ] Source URL aman.
- [ ] Freshness tampil.
