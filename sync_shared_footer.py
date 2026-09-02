from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
PARTIAL = (ROOT / "partials" / "footer.html").read_text(encoding="utf-8").strip()
STYLE_VERSION = "20260830_footer_canonical_v2"
FOOTER_PATTERN = re.compile(
    r'<footer\s+class=["\'](?:main-footer|footer)["\'][^>]*>[\s\S]*?</footer>',
    re.IGNORECASE,
)
EXCLUDED = {"admin.html", "login.html", "petugas.html", "lpg-agen.html", "profil-petugas.html"}

def sync_all(target_root: Path = ROOT) -> int:
    updated = 0
    target_root = Path(target_root).resolve()
    for path in target_root.rglob("*.html"):
        if path.name in EXCLUDED or ".git" in path.parts:
            continue
        source = path.read_text(encoding="utf-8")
        result, count = FOOTER_PATTERN.subn(PARTIAL, source)
        if count:
            result = re.sub(
                r'(css/style\.css)(?:\?[^"\']*)?',
                rf'\1?v={STYLE_VERSION}',
                result,
            )
        if count and result != source:
            path.write_text(result, encoding="utf-8", newline="\n")
            updated += 1
    return updated


if __name__ == "__main__":
    print(f"Footer kanonis diterapkan ke {sync_all()} halaman.")
