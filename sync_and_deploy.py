import os
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

def print_header(title):
    print("\n" + "="*60)
    print(f"🚀 {title}")
    print("="*60)

def run_step(cmd, desc):
    print(f"\n▶ {desc}...")
    try:
        res = subprocess.run(cmd, shell=True, check=True, text=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Gagal pada langkah: {desc} (Exit Code: {e.returncode})")
        return False

def main():
    print_header("SINKRONISASI RILIS BERITA & DEPLOY PORTAL DISPERINDAG ESDM")
    
    # 1. Generate seluruh halaman statis Open Graph
    if not run_step("python build_static_pages.py", "1. Meng-compile File Statis Berita & Open Graph Medsos"):
        sys.exit(1)
        
    # 2. Git add & commit
    run_step('git add . && git commit -m "feat: Sinkronisasi rilis berita baru & update Open Graph prerendered"', "2. Git Commit Perubahan")
    
    # 3. Git push
    run_step("git push origin main", "3. Git Push ke Repository GitHub")
    
    # 4. Deploy ke Firebase Hosting
    if not run_step("npx -y firebase-tools deploy --only hosting", "4. Deploy ke Firebase Hosting (Live)"):
        print("\n⚠️ Deploy Firebase mengalami kendala. Pastikan koneksi internet stabil.")
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
