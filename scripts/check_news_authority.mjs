import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const storage = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem: key => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
};

vm.runInThisContext(fs.readFileSync("js/data.js", "utf8"), { filename: "js/data.js" });

const cloudArticle = { id: "cloud-1", slug: "cloud-1", title: "Cloud", status: "published", updated_at: "2026-09-04T00:00:00Z" };
let snapshot = globalThis.setAuthoritativeNewsSnapshot([cloudArticle], "published");
assert.deepEqual(snapshot.map(item => item.id), ["cloud-1"], "snapshot cloud tidak boleh dicampur DEFAULT_NEWS");
assert.equal(globalThis.hasAuthoritativeNewsSnapshot("published"), true);

snapshot = globalThis.setAuthoritativeNewsSnapshot([], "published");
assert.deepEqual(snapshot, [], "snapshot cloud kosong harus tetap kosong");
assert.deepEqual(JSON.parse(storage.get("disperindag_news")), []);

const appSource = fs.readFileSync("js/app.js", "utf8");
assert.equal((appSource.match(/function initFirestoreLiveSync\s*\(/g) || []).length, 1, "listener berita tidak boleh dideklarasikan ganda");
assert.match(appSource, /collection\('news'\)\.where\('status', '==', 'published'\)/);
assert.doesNotMatch(appSource, /mergeNewsWithDefaults\(cloudNews\)/);

const adminSource = fs.readFileSync("js/admin.js", "utf8");
assert.doesNotMatch(adminSource, /mergeNewsWithDefaults\(cloudNews\)/);
assert.match(adminSource, /await db\.collection\('news'\)\.doc\(id\)\.set\(updatedArticle/);
assert.match(adminSource, /await batch\.commit\(\)/);

const buildSource = fs.readFileSync("scripts/build_production.py", "utf8");
assert.match(buildSource, /BUILD_NEWS_SOURCE", "cloud"/);

const generatorSource = fs.readFileSync("build_static_pages.py", "utf8");
assert.match(generatorSource, /duplicate_slugs[\s\S]*raise RuntimeError/,
  "build cloud harus berhenti ketika slug published duplikat");

console.log("PASS news cloud-authoritative regression checks");
