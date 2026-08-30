# Guardrail Spark / Tanpa Billing

Modul Media Intelligence wajib tetap beroperasi tanpa billing account dan tanpa runtime Google Cloud berbayar.

## Komponen yang diizinkan

- Firebase Spark: Hosting, Authentication email/password, Firestore, Rules, dan App Check;
- GitHub Actions dengan Workload Identity Federation (WIF) untuk identitas sementara tanpa private key;
- crawler maksimum enam kali sehari dengan maksimum 20 kandidat global per run;
- sinkronisasi berita/OG maksimum enam kali sehari;
- satu database Firestore default dan satu dokumen snapshot publik;
- backup berupa artifact privat GitHub, bukan fitur managed backup/PITR Firestore.

## Komponen yang dilarang

- billing account atau upgrade Blaze;
- Cloud Functions, Cloud Run, Cloud Build, BigQuery, Pub/Sub, Secret Manager, dan Artifact Registry;
- Firebase Storage, Phone/SMS Auth, Firestore TTL, PITR, managed backup/restore, clone database, atau database tambahan;
- service-account JSON/private key;
- Cloud SDK sebagai dependency aplikasi atau workflow.

## Batas operasional

Spark membatasi Firestore pada kuota gratis. Jangan menaikkan frekuensi scheduler, jumlah sumber, batas kandidat, listener, atau retensi tanpa menghitung reads/writes/storage terlebih dahulu. Jika kuota mendekati batas, kurangi frekuensi atau nonaktifkan sumber; jangan mengaktifkan billing.

WIF hanya menyediakan autentikasi sementara dari GitHub Actions ke resource Firebase yang sudah dipakai. Ia tidak menjalankan compute Google Cloud. Konfigurasi selanjutnya dilakukan melalui GitHub/Firebase Console; aplikasi dan workflow tidak membutuhkan Cloud SDK.
