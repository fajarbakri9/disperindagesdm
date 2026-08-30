import os
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

def print_header(title):
    print("\n" + "="*60)
    print(f"🚀 {title}")
    print("="*60)

def run_step(cmd, desc, allow_failure=False):
    print(f"\n▶ {desc}...")
    try:
        res = subprocess.run(cmd, shell=True, text=True)
        if res.returncode == 0:
            return True
        if allow_failure:
            print(f"ℹ️ Langkah '{desc}' selesai dengan catatan (Exit Code: {res.returncode}). Melanjutkan...")
            return True
        print(f"❌ Gagal pada langkah: {desc} (Exit Code: {res.returncode})")
        return False
    except Exception as e:
        print(f"❌ Exception pada langkah: {desc} ({e})")
        return False

def main():
    print_header("SINKRONISASI RILIS BERITA & DEPLOY PORTAL DISPERINDAG ESDM")
    
    # 1. Generate seluruh halaman statis Open Graph & Sitemap
    if not run_step("python build_static_pages.py --cloud", "1. Sinkronisasi Firestore dan compile halaman OG statis"):
        print("❌ Gagal meng-compile halaman statis. Proses dibatalkan.")
        sys.exit(1)
        
    # 2. Validasi sintaks sebelum menyentuh produksi
    if not run_step("node --check js/admin.js && node --check js/data.js && python -m py_compile build_static_pages.py", "2. Validasi sintaks aplikasi"):
        sys.exit(1)

    # 3. Deploy rules dan hosting. Commit/push tetap keputusan operator.
    if not run_step("npx -y firebase-tools deploy --only firestore:rules,hosting", "3. Deploy Firestore Rules dan Hosting (Live)"):
        print("\n❌ Deploy Firebase gagal. Periksa koneksi internet atau status project.")
        sys.exit(1)
        
    print_header("SUKSES! SELURUH BERITA & OPEN GRAPH MEDSOS TELAH AKTIF")
    print("""
✓ Seluruh halaman berita telah di-generate dalam format statis murni.
✓ Foto utama HD, judul berita lengkap, ringkasan isi, dan nama dinas resmi telah aktif.
✓ Tautan rilis berita siap dibagikan ke WhatsApp, Facebook, Telegram, dan Twitter/X!

🌐 Portal Utama: https://disperindagesdm-pinrang.web.app
📰 Portal Berita: https://disperindagesdm-pinrang.web.app/arsip-berita.html
    """)

if __name__ == "__main__":
    main()
