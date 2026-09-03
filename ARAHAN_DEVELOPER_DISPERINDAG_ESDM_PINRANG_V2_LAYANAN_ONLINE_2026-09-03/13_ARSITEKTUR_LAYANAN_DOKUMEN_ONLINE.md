# ARSITEKTUR LAYANAN DOKUMEN ONLINE

## 1. TUJUAN

Membangun fondasi layanan dokumen elektronik yang reusable.

SIPK adalah pilot, bukan aplikasi sekali pakai.

---

## 2. SERVICE ENGINE

```text
serviceDefinitions
        │
        ▼
serviceApplications
        │
        ▼
workflow engine
        │
  ┌─────┼─────┐
  ▼     ▼     ▼
verify approve revise
        │
        ▼
document lifecycle
        │
        ▼
issued document metadata
```

---

## 3. SERVICE DEFINITION

Contoh:

```json
{
  "code": "SIPK",
  "name": "Surat Izin Pemakaian Kios",
  "category": "pasar",
  "status": "development",
  "acceptingApplications": false,
  "requiresAuthentication": true,
  "requiresAttachments": true,
  "requiresDocumentIssuance": true,
  "requiresElectronicSignature": true
}
```

Pada tahap sekarang:
```text
status = development
acceptingApplications = false
```

UI harus menghormati flag tersebut.

---

## 4. FAIL CLOSED

Jika config tidak ditemukan:
- jangan anggap layanan aktif;
- default = unavailable.

Benar:
```text
unknown config -> service unavailable
```

Salah:
```text
unknown config -> enable form
```

---

## 5. WORKFLOW

Future SIPK:

```text
draft
submitted
under_administrative_review
revision_requested
resubmitted
verified
pending_responsible_approval
responsible_approved
pending_head_approval
head_approved
document_preparation
pending_signature
signed
issued
```

Terminal:
```text
rejected
cancelled
revoked
expired
```

---

## 6. EVENT MODEL

Jangan hanya overwrite `status`.

Simpan event append-only:
```text
workflowEvents/{eventId}
```

`serviceApplications.currentStatus` boleh menjadi projection current state.

---

## 7. SLA

Jangan hardcode janji waktu pelayanan sebelum SOP resmi.

Kelak serviceDefinition dapat memiliki:
```text
serviceStandardDays
serviceStandardUnit
```

tetapi hanya setelah dasar pelayanan ditetapkan.

---

## 8. ACCEPTANCE

- [ ] Engine generik.
- [ ] SIPK config `development`.
- [ ] `acceptingApplications=false`.
- [ ] Fail closed.
- [ ] Status event append-only.
