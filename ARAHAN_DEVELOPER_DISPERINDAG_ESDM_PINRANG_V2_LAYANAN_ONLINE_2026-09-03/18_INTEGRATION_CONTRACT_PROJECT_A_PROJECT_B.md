# INTEGRATION CONTRACT — PROJECT A ↔ PROJECT B

## 1. TUJUAN

Mencegah sinkronisasi liar dan data ganda.

---

## 2. PROJECT A EXPORTS

Project A hanya menyediakan resource yang diperlukan:
- market public/reference;
- kiosk reference bila dibutuhkan;
- service standards/doc links;
- branding/config public.

Jangan expose collection internal secara luas.

---

## 3. PROJECT B EXPORTS

Project B hanya menyediakan:
- publicServiceCatalog;
- publicServiceStats;
- publicDocumentVerification;
- internal metrics melalui jalur terproteksi.

---

## 4. IDENTIFIER

Gunakan immutable ID:
```text
marketId
kioskId
applicationId
documentId
```

Jangan integrasi berdasarkan nama pasar string.

---

## 5. VERSION

Projection sebaiknya memiliki:
```text
schemaVersion
updatedAt
```

Jika schemaVersion unsupported:
- fail safely;
- jangan render data parsial tanpa validasi.

---

## 6. READ FAILURE

Jika Project B tidak tersedia:
Website A:
```text
Layanan online sedang tidak tersedia.
```

Jangan menampilkan data lama tanpa timestamp/status.

---

## 7. WRITE CONTRACT FUTURE

Jika issued SIPK perlu mengubah master kios:
- secure backend only;
- event contains applicationId/documentId/kioskId;
- verify issued state;
- whitelist fields;
- idempotency key;
- audit in both systems.

---

## 8. ACCEPTANCE

- [ ] ID-based integration.
- [ ] Schema version.
- [ ] Minimal projections.
- [ ] No client privileged write.
- [ ] Failure state jujur.
