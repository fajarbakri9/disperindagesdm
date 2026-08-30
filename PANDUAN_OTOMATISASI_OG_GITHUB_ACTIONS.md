# Otomatisasi Berita dan Open Graph Tanpa PC Aktif

Workflow `.github/workflows/sync-news-og.yml` berjalan enam kali sehari dan juga dapat dijalankan manual dari GitHub. Workflow mengambil berita `published` dari Firestore, membangun HTML statis/OG/JSON-LD/sitemap, lalu melakukan deploy Hosting. Frekuensi ini sengaja dibatasi agar penggunaan Firestore, Hosting, dan GitHub Actions tetap konservatif pada kuota gratis.

## Konfigurasi satu kali

1. Siapkan Workload Identity Federation (WIF) untuk repository GitHub ini dan service account deployment dengan peran minimum `Firebase Hosting Admin` serta `Service Usage Consumer`.
2. Di **Settings → Secrets and variables → Actions → Variables**, isi `GCP_PROJECT_ID`, `GCP_WIF_PROVIDER`, dan `GCP_MI_SERVICE_ACCOUNT`.
3. Setelah uji WIF berhasil, set `MI_WIF_ENABLED` menjadi `true`.
4. Buka **Actions → Sinkronisasi Berita dan Open Graph → Run workflow** untuk uji pertama.

Workflow tidak menerima JSON service-account key. Jangan membuat atau menyimpan private key di repository, GitHub secret, Firestore, CMS, source JavaScript, maupun perangkat operator.

## Alur operasional

1. Editor membuka CMS dari PC atau HP dan menerbitkan berita.
2. Berita langsung tersedia melalui Firestore reader.
3. Pada jadwal sinkronisasi berikutnya, GitHub Actions memperbarui halaman statis dan metadata sosial.
4. Untuk kebutuhan mendesak, operator dapat menekan **Run workflow** melalui aplikasi atau situs GitHub.

## Batas gambar

Featured image Base64 maksimal 800 KB. Gambar yang tidak valid atau melewati batas otomatis memakai `assets/social/default-share.jpg` sebagai OG image. Galeri tetap harus dijaga agar total payload dokumen Firestore tidak melewati batas CMS.
