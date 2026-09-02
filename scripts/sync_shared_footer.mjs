import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : SOURCE_ROOT;
const partial = fs.readFileSync(path.join(SOURCE_ROOT, "partials", "footer.html"), "utf8").trim();
const excluded = new Set(["admin.html", "login.html", "petugas.html", "lpg-agen.html", "profil-petugas.html"]);
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => {
    if ([".git", ".firebase", "dist"].includes(entry.name)) return [];
    const item = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(item) : entry.name.endsWith(".html") ? [item] : [];
  });
}
let count = 0;
for (const file of walk(ROOT)) {
  if (excluded.has(path.basename(file))) continue;
  const source = fs.readFileSync(file, "utf8");
  if (!/<footer\s+class=["'](?:main-footer|footer)["'][^>]*>[\s\S]*?<\/footer>/i.test(source)) continue;
  const updated = source
    .replace(/<footer\s+class=["'](?:main-footer|footer)["'][^>]*>[\s\S]*?<\/footer>/i, partial)
    .replace(/css\/style\.css(?:\?[^"']*)?/g, "css/style.css?v=20260902_directory_nav_v1");
  if (updated !== source) { fs.writeFileSync(file, updated.replace(/\r\n/g,"\n")); count++; }
}
console.log(`Footer tersinkron: ${count} halaman`);
