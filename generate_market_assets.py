import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_market_photos():
    os.makedirs(os.path.join("assets", "pasar"), exist_ok=True)

    base_banner = os.path.join("assets", "banner", "pasar_sentral_pinrang_clean_hd.jpg")
    if not os.path.exists(base_banner):
        base_banner = os.path.join("assets", "banner", "1741917868_c77d822a24b99f45347f.png")

    markets_meta = [
        {
            "filename": "pasar_sentral_pinrang.jpg",
            "name": "PASAR SENTRAL PINRANG",
            "district": "KECAMATAN WATANG SAWITTO",
            "badge": "🟢 PASAR BEROPERASI AKTIF (BAROMETER DAERAH)",
            "badge_bg": (16, 185, 129),
            "theme_color": (15, 44, 89),
            "sub": "Pusat Induk Distribusi & 786 Lapak Terdata"
        },
        {
            "filename": "pasar_pekkabata.jpg",
            "name": "PASAR PEKKABATA",
            "district": "KECAMATAN DUAMPANUA",
            "badge": "🟢 PASAR AKTIF • JALUR POROS TRANS-SULAWESI",
            "badge_bg": (16, 185, 129),
            "theme_color": (26, 77, 46),
            "sub": "Hari Pasar: Rabu & Sabtu • Sentra Pangan & Ternak"
        },
        {
            "filename": "pasar_bungi.jpg",
            "name": "PASAR BUNGI",
            "district": "KECAMATAN DUAMPANUA",
            "badge": "🟢 PASAR AKTIF • PERDESAAN DUAMPANUA",
            "badge_bg": (16, 185, 129),
            "theme_color": (30, 58, 138),
            "sub": "Hari Pasar: Kamis & Minggu • Komoditas Hasil Bumi"
        },
        {
            "filename": "pasar_langnga.jpg",
            "name": "PASAR LANGNGA",
            "district": "KECAMATAN MATTIRO SOMPE",
            "badge": "🟢 PASAR AKTIF • SENTRA PESISIR & TAMBAK",
            "badge_bg": (16, 185, 129),
            "theme_color": (14, 116, 144),
            "sub": "Hari Pasar: Selasa & Jumat • Ikan Bandeng & Hasil Laut"
        },
        {
            "filename": "pasar_teppo_benteng.jpg",
            "name": "PASAR TEPPO / BENTENG",
            "district": "KECAMATAN PATAMPANUA",
            "badge": "🟢 PASAR AKTIF • SENTRA LUMBUNG PADI",
            "badge_bg": (16, 185, 129),
            "theme_color": (120, 53, 15),
            "sub": "Hari Pasar: Senin & Kamis • Komoditas Padi & Palawija"
        },
        {
            "filename": "pasar_kariango.jpg",
            "name": "PASAR KARIANGO",
            "district": "KECAMATAN MATTIRO BULU",
            "badge": "🟢 PASAR AKTIF • PERDESAAN MATTIRO BULU",
            "badge_bg": (16, 185, 129),
            "theme_color": (21, 94, 117),
            "sub": "Hari Pasar: Rabu & Sabtu • Pertanian & Sembako"
        },
        {
            "filename": "pasar_pajalele.jpg",
            "name": "PASAR PAJALELE",
            "district": "KECAMATAN LEMBANG",
            "badge": "🟢 PASAR AKTIF • DATARAN TINGGI LEMBANG",
            "badge_bg": (16, 185, 129),
            "theme_color": (77, 124, 15),
            "sub": "Hari Pasar: Senin & Jumat • Kopi & Sayuran Pegunungan"
        },
        {
            "filename": "pasar_paleteang_inpres.jpg",
            "name": "PASAR PALETEANG",
            "district": "KECAMATAN PALETEANG",
            "badge": "⚫ TIDAK BEROPERASI (EKS PASAR INPRES / ASET)",
            "badge_bg": (71, 85, 105),
            "theme_color": (30, 41, 59),
            "sub": "Klasifikasi Historis: Perda 2/2017 • Non-Aktif Faktual 2026"
        },
        {
            "filename": "pasar_suppa_evaluasi.jpg",
            "name": "PASAR SUPPA",
            "district": "KECAMATAN SUPPA",
            "badge": "🟠 PERLU VERIFIKASI OPERASIONAL",
            "badge_bg": (217, 119, 6),
            "theme_color": (67, 56, 202),
            "sub": "Sarana Pesisir Suppa • Tahap Evaluasi Pemanfaatan Dinas"
        },
        {
            "filename": "pasar_marawi_tiroang.jpg",
            "name": "PASAR MARAWI",
            "district": "KECAMATAN TIROANG",
            "badge": "🟠 PERLU VERIFIKASI LANJUTAN",
            "badge_bg": (217, 119, 6),
            "theme_color": (13, 148, 136),
            "sub": "Sentra Hortikultura Tiroang • Pemutakhiran Data 2026"
        },
        {
            "filename": "pasar_placeholder_verified.jpg",
            "name": "SARANA PASAR RAKYAT DAERAH",
            "district": "DISPERINDAG ESDM KABUPATEN PINRANG",
            "badge": "🟠 DOKUMENTASI SEDANG DIPERBARUI",
            "badge_bg": (217, 119, 6),
            "theme_color": (15, 23, 42),
            "sub": "Verifikasi Lapangan Bertahap Berbasis Data Faktual"
        }
    ]

    # Coba load font
    font_path_bold = "C:\\Windows\\Fonts\\arialbd.ttf"
    font_path_reg = "C:\\Windows\\Fonts\\arial.ttf"
    
    try:
        f_title = ImageFont.truetype(font_path_bold, 44)
        f_sub = ImageFont.truetype(font_path_bold, 24)
        f_badge = ImageFont.truetype(font_path_bold, 20)
        f_tag = ImageFont.truetype(font_path_reg, 20)
    except:
        f_title = f_sub = f_badge = f_tag = ImageFont.load_default()

    for item in markets_meta:
        W, H = 1200, 675
        img = Image.new("RGB", (W, H), item["theme_color"])

        # Jika ada background image, blend secara elegan
        if os.path.exists(base_banner):
            try:
                bg = Image.open(base_banner).convert("RGB")
                bg = bg.resize((W, H), Image.Resampling.LANCZOS)
                # Gelapkan background
                bg_dark = Image.new("RGB", (W, H), item["theme_color"])
                img = Image.blend(bg, bg_dark, 0.45)
            except Exception as e:
                pass

        draw = ImageDraw.Draw(img)

        # Gradient overlay di bagian bawah
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d_over = ImageDraw.Draw(overlay)
        for y in range(H // 3, H):
            alpha = int(240 * ((y - H // 3) / (H * 2 // 3)))
            d_over.line([(0, y), (W, y)], fill=(10, 15, 30, alpha))
        img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(img)

        # Header Ribbon
        draw.rectangle([(40, 40), (W - 40, 44)], fill=(234, 179, 8))

        # Badge Status
        badge_text = item["badge"]
        badge_w = 480
        badge_h = 44
        draw.rounded_rectangle([(60, 70), (60 + badge_w, 70 + badge_h)], radius=8, fill=item["badge_bg"])
        draw.text((80, 80), badge_text, font=f_badge, fill=(255, 255, 255))

        # Nama Pasar & Kecamatan
        draw.text((60, H - 240), item["district"], font=f_tag, fill=(203, 213, 225))
        draw.text((60, H - 200), item["name"], font=f_title, fill=(255, 255, 255))
        draw.text((60, H - 130), item["sub"], font=f_sub, fill=(253, 224, 71))

        # Footer Watermark
        draw.rectangle([(60, H - 70), (W - 60, H - 68)], fill=(255, 255, 255, 60))
        draw.text((60, H - 55), "PEMERINTAH KABUPATEN PINRANG • DINAS PERINDUSTRIAN, PERDAGANGAN, ESDM", font=f_tag, fill=(148, 163, 184))

        out_path = os.path.join("assets", "pasar", item["filename"])
        img.save(out_path, "JPEG", quality=92)
        print(f"Generated market visual: {out_path}")

if __name__ == "__main__":
    create_market_photos()
