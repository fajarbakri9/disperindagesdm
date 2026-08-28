import os
import json

def update_photos():
    data_path = os.path.join("assets", "data", "markets.json")
    with open(data_path, "r", encoding="utf-8") as f:
        markets = json.load(f)

    photo_map = {
        "pasar-sentral-pinrang": "assets/pasar/pasar_sentral_pinrang.jpg",
        "pasar-pekkabata": "assets/pasar/pasar_pekkabata.jpg",
        "pasar-bungi": "assets/pasar/pasar_bungi.jpg",
        "pasar-langnga": "assets/pasar/pasar_langnga.jpg",
        "pasar-teppo-benteng": "assets/pasar/pasar_teppo_benteng.jpg",
        "pasar-kariango": "assets/pasar/pasar_kariango.jpg",
        "pasar-pajalele": "assets/pasar/pasar_pajalele.jpg",
        "pasar-paleteang": "assets/pasar/pasar_paleteang_inpres.jpg",
        "pasar-suppa": "assets/pasar/pasar_suppa_evaluasi.jpg",
        "pasar-marawi": "assets/pasar/pasar_marawi_tiroang.jpg"
    }

    default_placeholder = "assets/pasar/pasar_placeholder_verified.jpg"

    for m in markets:
        slug = m.get("slug")
        m["fotoUtama"] = photo_map.get(slug, default_placeholder)
        m["galeri"] = [m["fotoUtama"]]

    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(markets, f, indent=2, ensure_ascii=False)

    print("Updated markets.json with specific verified photos.")

if __name__ == "__main__":
    update_photos()
