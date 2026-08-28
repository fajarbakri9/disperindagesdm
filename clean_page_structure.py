import os
import re

MASTER_FOOTER = '''  <!-- ==========================================================================
       13. FOOTER RESMI KEDINASAN (100% IDENTIK & KONSISTEN SE-WEBSITE)
       ========================================================================== -->
  <footer class="main-footer">
    <div class="container">
      <div class="footer-grid">
        
        <!-- Kolom 1: Profil Kedinasan -->
        <div class="footer-col">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
            <img src="{prefix}assets/brand/logo_pinrang_opt.png" alt="Logo Kabupaten Pinrang" style="width: 44px; height: auto;">
            <div>
              <h4 style="margin: 0; font-size: 0.95rem; font-weight: 900; color: #FFFFFF; letter-spacing: 0.03em;">DISPERINDAG ESDM</h4>
              <span style="font-size: 0.76rem; color: #94A3B8; font-weight: 700;">KABUPATEN PINRANG</span>
            </div>
          </div>
          <p style="font-size: 0.82rem; color: #CBD5E1; line-height: 1.6; margin-bottom: 16px;">
            Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang berkomitmen menyelenggarakan pelayanan publik prima, tertib metrologi, pengawasan distribusi pangan, dan pembinaan sentra IKM.
          </p>
          
          <!-- Motto MANTAP Profesional Card -->
          <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(250, 204, 21, 0.35); border-left: 4px solid var(--accent-gold, #EAB308); padding: 12px 14px; border-radius: 10px; display: flex; align-items: center; gap: 12px; margin-top: 14px;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(250, 204, 21, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0;">
              🎯
            </div>
            <div>
              <div style="font-size: 0.68rem; font-weight: 800; color: #FDE047; text-transform: uppercase; letter-spacing: 0.5px;">Motto Pelayanan</div>
              <div style="font-size: 0.95rem; font-weight: 900; color: #FFFFFF; letter-spacing: 0.5px; margin: 1px 0;">MANTAP</div>
              <div style="font-size: 0.72rem; color: #CBD5E1; line-height: 1.35;">Melayani Anda dengan Transparan, Adil &amp; Profesional</div>
            </div>
          </div>
        </div>

        <!-- Kolom 2: Layanan Publik & Pengaduan -->
        <div class="footer-col">
          <h4>Standar Pelayanan</h4>
          <ul class="footer-links">
            <li><a href="{prefix}layanan.html">Standar Pelayanan &amp; SOP</a></li>
            <li><a href="{prefix}layanan.html#srv_oss_industri">Verifikasi Perizinan OSS Industri</a></li>
            <li><a href="{prefix}layanan.html#srv_oss_perdagangan">Fasilitasi Perizinan OSS Perdagangan</a></li>
            <li><a href="{prefix}layanan.html#srv_pupuk_subsidi">Keterangan Distributor Pupuk</a></li>
            <li><a href="{prefix}layanan.html#srv_tera">Pelayanan Tera &amp; Tera Ulang UTTP</a></li>
            <li><a href="{prefix}index.html#pengaduan">Formulir Pengaduan Online</a></li>
          </ul>
        </div>

        <!-- Kolom 3: Transparansi & Dokumen -->
        <div class="footer-col">
          <h4>Transparansi &amp; Dokumen</h4>
          <ul class="footer-links">
            <li><a href="{prefix}pasar.html" style="color: var(--accent-gold, #FDE047); font-weight: 800;">🏬 Direktori Pasar Daerah</a></li>
            <li><a href="{prefix}index.html#transparansi-pelayanan">Transparansi Pelayanan Publik</a></li>
            <li><a href="{prefix}profil.html">Profil &amp; Organisasi Resmi</a></li>
            <li><a href="{prefix}maklumat-pelayanan.html">Maklumat Pelayanan</a></li>
            <li><a href="{prefix}ppid.html">Portal PPID Pelaksana</a></li>
            <li><a href="{prefix}dokumen.html">Dokumen &amp; Regulasi Daerah</a></li>
            <li><a href="{prefix}katalog-ikm.html">Katalog Produk IKM Binaan</a></li>
          </ul>
        </div>

        <!-- Kolom 4: Kontak & Jam Layanan Resmi -->
        <div class="footer-col">
          <h4>Kontak &amp; Jam Layanan</h4>
          <div style="font-size: 0.84rem; color: #CBD5E1; line-height: 1.65; display: flex; flex-direction: column; gap: 10px;">
            
            <!-- Alamat Google Maps -->
            <a href="https://maps.google.com/?q=Jalan+Bintang+No.+1+Pinrang+Sulawesi+Selatan" target="_blank" rel="noopener noreferrer" style="color: #CBD5E1; text-decoration: none; display: flex; align-items: flex-start; gap: 10px; transition: color 0.2s ease;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#EA4335" style="flex-shrink: 0; margin-top: 3px;"><path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 7.15 15.35 7.45 15.78.3.42.8.42 1.1 0 .3-.43 7.45-10.53 7.45-15.78 0-4.42-3.58-8-8-8zm0 11.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
              <span>Jalan Bintang No. 1, Kabupaten Pinrang, Sulawesi Selatan</span>
            </a>

            <!-- WhatsApp -->
            <a href="https://wa.me/6282316002226" style="color: #FDE047; text-decoration: none; display: flex; align-items: center; gap: 10px; font-weight: 700; transition: opacity 0.2s ease;" target="_blank" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366" style="flex-shrink: 0;"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.82a8.19 8.19 0 0 1-5.82 2.42c-1.47 0-2.92-.39-4.19-1.14l-.3-.18-3.11.82.83-3.03-.2-.31a8.212 8.212 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.07-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43l-.47-.01c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.31 3.8 2.53 1.09 2.53.73 2.99.69.46-.04 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.07-.1-.23-.17-.48-.29z"/></svg>
              <span>0823 1600 2226</span>
            </a>

            <!-- Email -->
            <a href="mailto:dinasperindagem.pinrang@gmail.com" style="color: #93C5FD; text-decoration: none; display: flex; align-items: center; gap: 10px; font-weight: 600; transition: opacity 0.2s ease;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#60A5FA" style="flex-shrink: 0;"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              <span>dinasperindagem.pinrang@gmail.com</span>
            </a>

            <!-- Jam Layanan -->
            <div style="margin-top: 6px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.12); font-size: 0.78rem; display: flex; align-items: flex-start; gap: 10px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FACC15" style="flex-shrink: 0; margin-top: 2px;"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
              <div>
                <strong style="color: #FFFFFF;">Jam Pelayanan Tatap Muka:</strong><br>
                <span style="color: #CBD5E1;">Senin–Kamis: 08.00–16.00 WITA<br>Jumat: 08.00–16.30 WITA</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      <div class="footer-bottom">
        <div>&copy; 2026 Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang - <a href="https://www.instagram.com/maroaproject/" target="_blank" rel="noopener noreferrer" style="color: #FACC15; font-weight: 800; text-decoration: none;">MAROA Project</a></div>
        <div style="color: var(--accent-gold); font-size: 0.8rem; font-weight: 700;">#BanggaMelayaniBangsa</div>
      </div>
    </div>
  </footer>'''

def standardize_html_file(filepath, prefix=""):
    if not os.path.exists(filepath):
        return
    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()

    rendered_footer = MASTER_FOOTER.replace("{prefix}", prefix)

    # 1. Ambil seluruh skrip penutup sebelum </body>
    # Cari posisi script pertama yang berada di luar <head>
    # Pisahkan head dan body
    body_idx = html.find("<body")
    if body_idx == -1:
        return

    head_part = html[:body_idx]
    body_part = html[body_idx:]

    # Hapus SEMUA tag footer di body_part
    body_part = re.sub(r'<footer.*?</footer>', '', body_part, flags=re.DOTALL | re.IGNORECASE)

    # Cari blok skrip terakhir di body
    # Biasanya ditandai dengan <!-- CORE SCRIPTS atau tag <script teratas setelah konten utama
    # Mari cari tag </main> atau akhir section
    if "</main>" in body_part:
        main_close = body_part.rfind("</main>") + len("</main>")
        body_part = body_part[:main_close] + "\n\n" + rendered_footer + "\n\n" + body_part[main_close:]
    elif "</section>" in body_part:
        sec_close = body_part.rfind("</section>") + len("</section>")
        body_part = body_part[:sec_close] + "\n\n" + rendered_footer + "\n\n" + body_part[sec_close:]
    else:
        # Sisipkan sebelum tag <script pertama di body
        scr_idx = body_part.find("<script")
        if scr_idx != -1:
            body_part = body_part[:scr_idx] + "\n" + rendered_footer + "\n\n  " + body_part[scr_idx:]
        else:
            b_close = body_part.rfind("</body>")
            body_part = body_part[:b_close] + "\n" + rendered_footer + "\n" + body_part[b_close:]

    new_html = head_part + body_part
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_html)
    print(f"Standardized: {filepath}")

def run():
    root_files = [
        "index.html",
        "profil.html",
        "layanan.html",
        "ppid.html",
        "dokumen.html",
        "katalog-ikm.html",
        "arsip-berita.html",
        "berita.html",
        "maklumat-pelayanan.html",
        "search.html",
        "kontak.html",
        "pasar.html"
    ]

    for rf in root_files:
        standardize_html_file(rf, "")

    if os.path.exists("berita"):
        for d in os.listdir("berita"):
            sub = os.path.join("berita", d, "index.html")
            if os.path.isfile(sub):
                standardize_html_file(sub, "../../")

    if os.path.exists("pasar"):
        for d in os.listdir("pasar"):
            sub = os.path.join("pasar", d, "index.html")
            if os.path.isfile(sub):
                standardize_html_file(sub, "../../")

if __name__ == "__main__":
    run()
