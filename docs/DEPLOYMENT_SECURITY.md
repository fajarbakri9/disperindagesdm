# Deployment dan Kredensial

## Source of truth

Production deployment hanya dilakukan dari GitHub Actions pada commit yang sudah direview. Jangan menjalankan `firebase deploy` dari folder kerja yang berisi backup atau perubahan lokal. `firebase.json` memakai root repository sebagai hosting directory, sehingga isi folder lokal adalah isi yang dapat terkirim ke produksi.

Perubahan manual di Firebase Console bukan source of truth dan dapat tertimpa deployment berikutnya.

## Secret handling

`FIREBASE_API_KEY` hanya disediakan melalui GitHub Actions Secret atau environment lokal yang tidak dilacak Git. Firebase Web API key bukan service-account private key, tetapi harus dibatasi berdasarkan domain resmi dan API yang diperlukan.

Jika credential pernah masuk GitHub:

1. Rotasi atau batasi key di Google Cloud Console.
2. Periksa penggunaan API dan billing setelah rotasi.
3. Revoke service-account key bila private key pernah terekspos.
4. Bersihkan histori Git secara terkoordinasi bila terdapat private key atau credential server.
5. Jangan mengandalkan penghapusan file terbaru; nilai lama tetap berada di commit terdahulu.

## Pre-deploy checklist

```text
git status --short
git grep -n -I -E "BEGIN .*PRIVATE KEY|client_secret|private_key|service-account"
python -m py_compile build_static_pages.py
node --check js/admin.js
node --check js/data.js
```

Workflow menolak checkout kotor dan pola credential sebelum build. Bila pemeriksaan gagal, hentikan deployment dan rotasi credential terkait.
