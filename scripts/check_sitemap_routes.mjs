import assert from "node:assert/strict";
import fs from "node:fs";

const origin = process.env.HOSTING_TEST_ORIGIN || "http://127.0.0.1:5000";
const sitemap = fs.readFileSync("dist/sitemap.xml", "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname);

assert.ok(urls.length > 0, "sitemap tidak memuat URL");
assert.equal(new Set(urls).size, urls.length, "sitemap memuat URL duplikat");

const failures = [];
for (const pathname of urls) {
  const response = await fetch(new URL(pathname, origin), { redirect: "manual" });
  if (response.status !== 200) failures.push(`${pathname}: HTTP ${response.status}`);
}

assert.deepEqual(failures, [], `rute sitemap gagal:\n${failures.join("\n")}`);
console.log(`PASS ${urls.length} sitemap routes returned HTTP 200`);
