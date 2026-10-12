# Laporan Implementasi Arahan V2 Layanan Online

## Ruang lingkup yang dieksekusi

Fase informasional Project A mencakup baseline, restrukturisasi navigasi, landing Layanan Online, halaman Permohonan berstatus Dalam Tahap Pengembangan, Dashboard ESDM read-only, deep-link GIS energi, hardening Command Center, sinkronisasi footer, dan artefak hosting.

## Keputusan keamanan

- Tidak ada form pengajuan, input, upload, login pemohon, atau tracking.
- Halaman Permohonan tidak memuat Firebase SDK dan tidak menghubungi Project B.
- Tidak ada koleksi transaksi yang dibuat di Project A.
- Dashboard ESDM hanya membaca master Project A dan tidak menampilkan angka pengganti ketika pembacaan gagal.
- Project B, Auth layanan, workflow, PDF, Storage, dan TTE sengaja belum diaktifkan karena masih berada di balik gate persetujuan dan security review.

## Navigasi dan fitur existing

Generator `scripts/sync_public_navigation.py` menyinkronkan header desktop dan drawer mobile. Top-level terdiri dari Beranda, Profil, Layanan Publik, Data & Peta, Informasi Publik, serta Berita & Rilis. Footer bersama memuat route layanan online dan Dashboard ESDM.

GIS existing tetap digunakan; query `?layers=lpg,bbm` membuka konteks infrastruktur energi tanpa database baru. TV Layanan tetap publik/read-only. Command Center diberi `noindex, nofollow` dan label ticker statis tidak lagi mengklaim LIVE. Rules dan index Firestore tidak diubah.

## Gate berikutnya

Project B hanya boleh dilanjutkan setelah config proyek disetujui, rules diuji di emulator, role dan retention ditetapkan, privacy notice disahkan, serta keputusan storage/backend tersedia. Aktivasi SIPK production tetap menunggu backend, SOP, PDF, TTE, dukungan, dan template legal selesai.

## Kelanjutan fondasi Project B

Fondasi lokal Project B kemudian ditambahkan di `services-project/`. State machine generik, validasi service definition, allowlist projection publik, snapshot referensi berbasis immutable ID, serta transisi Firestore berbasis role telah diuji. SIPK tetap fail-closed dan tidak ada perubahan status layanan pada website publik.

## Verifikasi lanjutan 4 September 2026

Scope repository lokal/emulator dinyatakan selesai 100% untuk fondasi
fail-closed. Bukti terbaru mencakup 88/88 unit test, preflight 22/22 artefak,
suite Rules Project A dan Project B lulus, audit 103 halaman publik, 7.394
referensi lokal tanpa target hilang, 19 berkas JavaScript tanpa error sintaks,
serta regresi browser 10 halaman tanpa `pageerror`, kegagalan request lokal,
atau overflow horizontal.

Status 100% lokal tidak berarti 100% produksi. Aktivasi tetap diblokir secara
sengaja sampai pemilik kewenangan mengesahkan Auth, privacy notice/DPIA,
retention, storage dan malware scanning, runtime/ingress, distributed rate
limit, observability, SOP, penomoran dokumen, PDF/TTE/QR, UAT, penetration test,
pilot, dan go-live. Advisory dependency moderat transitif telah diremediasi dengan
override `uuid` terpin ke versi 11.1.1 tanpa menurunkan `firebase-admin`; pemeriksaan
ulang `npm audit` pada 4 September 2026 menghasilkan 0 vulnerability. Fondasi
reservasi sequence dokumen kemudian ditambahkan secara atomik, idempotent,
role-limited, dan backend-only. Primitive verifikasi dokumen juga diperkeras dengan
kode acak 256-bit, digest SHA-256, tamper detection, status allowlist, dan projection
minimum-disclosure. Limiter terdistribusi juga memperoleh fondasi counter
transaksional per bucket dengan pseudonim HMAC dan perilaku fail-closed. Setelah
perubahan tersebut, 101/101 tes, Rules Project B 9/9, serta preflight 28/28 tetap
lulus. Format nomor resmi, PDF, TTE, publikasi, QR, kuota, datastore/TTL, dan gateway
produksi belum diaktifkan.
