# COMMAND CENTER HARDENING

## 1. STATUS

Command Center adalah **internal executive monitoring view**.

Bukan TV layanan publik.

---

## 2. TEMUAN KRITIS YANG HARUS DIHAPUS

Pola seperti:

```javascript
getStorage('disperindag_command_center', DEFAULT_COMMAND_CENTER_CONFIG)
getStorage('disperindag_districts', DEFAULT_DISTRICTS_STATUS)
getStorage('disperindag_reports', DEFAULT_REPORTS)
getStorage('disperindag_prices', DEFAULT_COMMODITY_PRICES)
```

harus dihentikan sebagai authority.

---

## 3. TARGET DATA FLOW

```text
Firestore
   |
validate
   |
in-memory state
   |
Command Center UI
```

LocalStorage hanya boleh untuk:
- theme;
- auto-slide setting;
- non-data UI preference.

---

## 4. TICKER

Jangan:

```javascript
if (!text) {
  text = "Beras ... Rp ...";
}
```

Benar:

```text
Tidak ada informasi ticker yang terpublikasi.
```

---

## 5. PRIVACY PENGADUAN

Jangan tampilkan ke public:
```text
Pelapor: Nama
```

Untuk Command Center internal sekalipun:
- minimalkan PII;
- gunakan anonymized label jika tidak perlu;
- role-based access;
- jangan expose via unauthenticated page.

---

## 6. INDEXING

Jika internal:
```html
<meta name="robots" content="noindex, nofollow">
```

Ideal:
- auth-gated;
- role required.

---

## 7. LIVE / REALTIME LABEL

Gunakan:
- LIVE hanya jika listener benar-benar realtime;
- SNAPSHOT jika periodik;
- LAST UPDATED untuk data non-realtime.

---

## 8. FIRESTORE COLLECTION

Jika `command_center/metrics` tetap digunakan:
- jadikan projection/aggregation;
- jangan jadi master kedua;
- data harus dibangun dari master collection atau CMS verified snapshot.

---

## 9. DATA FRESHNESS

Tambahkan:
```text
lastUpdatedAt
source
status
```

Status:
```text
fresh
delayed
stale
offline
```

---

## 10. ERROR / CACHE

Jika koneksi putus:
- boleh menampilkan last-known-good jika jelas dilabeli;
- jangan menyebut live;
- tampilkan timestamp;
- jangan silently fallback ke default.

---

## 11. PRINSIP LAST-KNOWN-GOOD

Diperbolehkan jika:
```text
Data terakhir: 03 Sep 2026 10:45 WITA
Status: Koneksi terputus
```

Tidak diperbolehkan:
```text
LIVE
84.5%
```
jika angka hanya berasal dari default.

---

## 12. ACCEPTANCE

- [ ] Tidak ada DEFAULT_* sebagai data authority.
- [ ] Tidak ada fallback ticker harga.
- [ ] Tidak ada PII di public.
- [ ] noindex jika internal.
- [ ] auth jika memungkinkan.
- [ ] last updated jelas.
- [ ] Firestore projection sinkron.
