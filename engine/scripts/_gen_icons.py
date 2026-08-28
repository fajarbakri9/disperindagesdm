from PIL import Image, ImageDraw, ImageFont
import math

def create_badge_icon(filename, bg_color1, bg_color2, border_color, title, subtitle, icon_type):
    width, height = 360, 360
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background squircle / rounded rect
    margin = 12
    r = 64
    x0, y0, x1, y1 = margin, margin, width - margin, height - margin
    
    # Gradient simulation using layers
    for i in range(y1 - y0):
        ratio = i / float(y1 - y0)
        # Interpolate color
        r_c = int(bg_color1[0] * (1 - ratio) + bg_color2[0] * ratio)
        g_c = int(bg_color1[1] * (1 - ratio) + bg_color2[1] * ratio)
        b_c = int(bg_color1[2] * (1 - ratio) + bg_color2[2] * ratio)
        draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=(r_c, g_c, b_c, 255))
        break # Draw once with rounded rect, then overlay
        
    draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=bg_color1, outline=border_color, width=6)
    
    # Inner subtle glow/border
    draw.rounded_rectangle([x0+8, y0+8, x1-8, y1-8], radius=r-6, outline=(255, 255, 255, 60), width=2)
    
    # Draw central graphic based on icon_type
    cx, cy = width // 2, height // 2 - 24
    
    if icon_type == "sipd":
        # Draw emblem / building / shield with gold & red
        # Outer shield
        shield_w, shield_h = 100, 110
        draw.polygon([
            (cx, cy - 50),
            (cx + 48, cy - 30),
            (cx + 48, cy + 20),
            (cx, cy + 60),
            (cx - 48, cy + 20),
            (cx - 48, cy - 30),
        ], fill=(220, 38, 38, 255), outline=(255, 215, 0, 255))
        
        # Pillars / building bars inside shield
        for bar_x in [-28, -10, 8, 26]:
            draw.rectangle([cx + bar_x - 3, cy - 15, cx + bar_x + 3, cy + 25], fill=(255, 255, 255, 240))
        # Top pediment
        draw.polygon([(cx, cy - 25), (cx + 34, cy - 5), (cx - 34, cy - 5)], fill=(255, 215, 0, 255))
        # Base
        draw.rectangle([cx - 36, cy + 28, cx + 36, cy + 34], fill=(255, 215, 0, 255))
        
    elif icon_type == "esakip":
        # Draw performance chart / target / star with cyan & gold
        # Circular target & upward growth arrow
        draw.ellipse([cx - 50, cy - 50, cx + 50, cy + 50], outline=(255, 215, 0, 255), width=6)
        draw.ellipse([cx - 32, cy - 32, cx + 32, cy + 32], outline=(14, 165, 233, 255), width=4)
        
        # Bar chart bars
        draw.rectangle([cx - 24, cy + 5, cx - 14, cy + 28], fill=(255, 255, 255, 220))
        draw.rectangle([cx - 8, cy - 8, cx + 2, cy + 28], fill=(255, 255, 255, 220))
        draw.rectangle([cx + 8, cy - 22, cx + 18, cy + 28], fill=(255, 215, 0, 255))
        
        # Growth line & arrow
        draw.line([(cx - 30, cy + 12), (cx - 6, cy - 4), (cx + 22, cy - 28)], fill=(74, 222, 128, 255), width=5)
        draw.polygon([(cx + 22, cy - 38), (cx + 30, cy - 20), (cx + 12, cy - 22)], fill=(74, 222, 128, 255))
        
    # Text rendering (Font fallback standard)
    try:
        font_title = ImageFont.truetype("arialbd.ttf", 36)
        font_sub   = ImageFont.truetype("arial.ttf", 20)
    except:
        font_title = ImageFont.load_default()
        font_sub   = ImageFont.load_default()
        
    # Title
    t_bbox = draw.textbbox((0, 0), title, font=font_title)
    t_w = t_bbox[2] - t_bbox[0]
    draw.text((cx - t_w // 2, height - 90), title, font=font_title, fill=(255, 255, 255, 255))
    
    # Subtitle
    s_bbox = draw.textbbox((0, 0), subtitle, font=font_sub)
    s_w = s_bbox[2] - s_bbox[0]
    draw.text((cx - s_w // 2, height - 50), subtitle, font=font_sub, fill=(212, 220, 235, 255))
    
    img.save(filename, "PNG")
    print(f"Generated: {filename}")

# Generate SIPD (Kemendagri / Keuangan - Merah & Navy)
create_badge_icon(
    "d:/# DOWNLOAD/web_disperindagesdm_prototype/assets/partners/logo_sipd.png",
    bg_color1=(153, 27, 27), # Dark Red
    bg_color2=(69, 10, 10),
    border_color=(251, 191, 36),
    title="SIPD RI",
    subtitle="KEMENDAGRI",
    icon_type="sipd"
)

# Generate e-SAKIP (Akuntabilitas - Navy & Cyan)
create_badge_icon(
    "d:/# DOWNLOAD/web_disperindagesdm_prototype/assets/partners/logo_esakip.png",
    bg_color1=(12, 74, 110), # Deep Cyan Blue
    bg_color2=(3, 30, 50),
    border_color=(56, 189, 248),
    title="e-SAKIP",
    subtitle="KAB. PINRANG",
    icon_type="esakip"
)