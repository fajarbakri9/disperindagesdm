# CMS V2 — EXISTING CMS + ONLINE SERVICES ADMIN

## 1. DUA ADMIN DOMAIN

### CMS Project A
Tetap untuk:
- konten;
- data;
- LPG;
- BBM;
- pasar;
- ESDM;
- GIS;
- TV;
- dokumen publik.

### Services Admin Project B
Kelak untuk:
- service definitions;
- permohonan;
- verifikasi;
- approval;
- templates;
- numbering;
- audit.

Jangan campurkan PII layanan ke CMS public existing.

---

## 2. NAVIGATION ADMIN

Saat ini boleh ditambahkan menu:

```text
Layanan Online
└── Status Pengembangan
```

Jangan tampilkan:
```text
Permohonan Baru (0)
Menunggu TTE (0)
```

jika workflow belum benar-benar aktif.

---

## 3. FUTURE ROLE

```text
services_super_admin
application_verifier
market_responsible_officer
head_of_department
document_operator
auditor
```

Role layanan tidak otomatis sama dengan role Project A.

---

## 4. AUDIT

Saat production nanti, setiap event:

```text
submitted
review_started
revision_requested
resubmitted
verified
responsible_approved
head_approved
document_number_reserved
pdf_generated
signature_requested
signed
issued
revoked
expired
```

harus tercatat append-only.

---

## 5. NO HARD DELETE

Permohonan tidak dihapus hanya karena:
- ditolak;
- dibatalkan;
- expired.

Gunakan status + retention policy yang sesuai.

---

## 6. PII

Dashboard internal:
- tampilkan hanya yang diperlukan;
- mask NIK/telepon bila tidak perlu penuh;
- jangan masukkan PII ke analytics/public logs.

---

## 7. CURRENT ACCEPTANCE

- [ ] Existing CMS tidak terganggu.
- [ ] Layanan Online masih informational.
- [ ] Tidak ada dummy application counter.
- [ ] Tidak ada PII sample production.
