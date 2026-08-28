import os
from PIL import Image
from datetime import datetime

base_dir = r"d:\# DOWNLOAD\web_disperindagesdm_prototype"

print(f"{'Path Relatif':<60} | {'Dimensi':<15} | {'Size':<10} | {'Terakhir Diubah'}")
print("-" * 110)

for root, dirs, files in os.walk(base_dir):
    # Skip engine node_modules or pycache
    if "node_modules" in root or "__pycache__" in root:
        continue
    for f in files:
        if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_dir)
            try:
                stat = os.stat(full_path)
                mtime = datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M')
                size_kb = f"{stat.st_size / 1024:.1f} KB"
                with Image.open(full_path) as im:
                    dim = f"{im.size[0]}x{im.size[1]}"
                print(f"{rel_path:<60} | {dim:<15} | {size_kb:<10} | {mtime}")
            except Exception as e:
                print(f"{rel_path:<60} | Error: {e}")