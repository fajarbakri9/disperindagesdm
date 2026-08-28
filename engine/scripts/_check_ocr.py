import os
from PIL import Image

base = r"d:\# DOWNLOAD"
files = [
    "787366330_17923822161406640_1136556280456397705_n.jpg",
    "776130386_17921856342406640_322800854756346735_n.jpg",
    "775956290_17921857386406640_5423288001523287466_n.jpg",
    "786955267_17923821162406640_3203291423697788637_n.jpg",
    "786914261_17923821390406640_4644781829296681369_n.jpg",
    "787101977_17923823646406640_1362053036790766049_n.jpg",
    "788601056_17923975209406640_7535306425707613915_n.jpg",
    "787244181_17923975542406640_8179997291169875098_n.jpg",
    "788728706_17923975722406640_5177873322523013738_n.jpg",
    "789143166_17923976379406640_412870947623367718_n.jpg"
]

try:
    import pytesseract
    for f in files:
        p = os.path.join(base, f)
        txt = pytesseract.image_to_string(Image.open(p))
        first_line = txt.strip().split("\n")[0] if txt.strip() else "NO TEXT"
        print(f"{f}: {first_line[:80]}")
except Exception as e:
    print("Pytesseract not available, checking by visual size/aspect ratio:", e)