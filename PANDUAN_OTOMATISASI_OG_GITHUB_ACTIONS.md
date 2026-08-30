# Otomatisasi Berita dan Open Graph Tanpa PC Aktif

Workflow `.github/workflows/sync-news-og.yml` berjalan setiap 10 menit dan juga dapat dijalankan manual dari GitHub. Workflow mengambil berita `published` dari Firestore, mengekstrak featured image Base64 menjadi aset Firebase Hosting, membangun HTML statis/OG/JSON-LD/sitemap, lalu melakukan deploy Hosting.

## Konfigurasi satu kali

1. Buat service account khusus deployment di Google Cloud project `disperindagesdm-pinrang`.
2. Berikan peran minimum `Firebase Hosting Admin` dan `Service Usage Consumer`.
3. Buat JSON key untuk service account tersebut.
4. Di repository GitHub buka **Settings → Secrets and variables → Actions**.
5. Buat repository secret bernama `FIREBASE_SERVICE_ACCOUNT_JSON` dan tempel seluruh isi JSON key.
6. Buka tab **Actions → Sinkronisasi Berita dan Open Graph → Run workflow** untuk uji pertama.

Jangan menyimpan JSON key di repository, Firestore, CMS, atau source JavaScript. Setelah konfigurasi berhasil, hapus salinan key dari perangkat yang digunakan untuk setup.

## Alur operasional

1. Editor membuka CMS dari PC atau HP dan menerbitkan berita.
2. Berita langsung tersedia melalui Firestore reader.
3. Maksimal sekitar 10 menit kemudian, GitHub Actions memperbarui halaman statis dan metadata sosial.
4. Untuk kebutuhan mendesak, operator dapat menekan **Run workflow** melalui aplikasi atau situs GitHub.

## Batas gambar

Featured image Base64 maksimal 800 KB. Gambar yang tidak valid atau melewati batas otomatis memakai `assets/social/default-share.jpg` sebagai OG image. Galeri tetap harus dijaga agar total payload dokumen Firestore tidak melewati batas CMS.
