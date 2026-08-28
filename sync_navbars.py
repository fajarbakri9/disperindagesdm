import os
import re

def sync_navbar_menus():
    html_files = [
        "profil.html",
        "layanan.html",
        "berita.html",
        "arsip-berita.html",
        "dokumen.html",
        "katalog-ikm.html",
        "ppid.html",
        "maklumat-pelayanan.html",
        "search.html",
        "kontak.html",
        "petugas.html"
    ]

    pasar_item = '''            <a href="pasar.html" class="dropdown-item">
              <div class="dropdown-icon">🏬</div>
              <div class="dropdown-text">
                <span class="dropdown-title">Direktori Pasar Daerah</span>
                <span class="dropdown-desc">17 sarana pasar & status operasional</span>
              </div>
            </a>'''

    for filename in html_files:
        if not os.path.exists(filename):
            continue
        with open(filename, "r", encoding="utf-8") as f:
            content = f.read()

        if "Direktori Pasar Daerah" in content or "pasar.html" in content:
            print(f"Already synced: {filename}")
            continue

        # Cari dropdown transparansi
        # Pola umum: setelah Transparansi Pelayanan
        pattern = r'(<span class="dropdown-title">Transparansi Pelayanan</span>.*?</a>)'
        match = re.search(pattern, content, re.DOTALL)
        if match:
            target_str = match.group(1)
            new_str = target_str + "\n" + pasar_item
            content = content.replace(target_str, new_str, 1)
            with open(filename, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Successfully injected pasar menu into: {filename}")
        else:
            print(f"Could not find match in: {filename}")

if __name__ == "__main__":
    sync_navbar_menus()
