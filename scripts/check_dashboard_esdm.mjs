import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const elements = new Map();
for (const id of ["kpiAgents","kpiBases","kpiFuel","kpiSpbu","bbmRegular","bbmCompact","bbmFisher","bbmPertashop","energyState","energyUpdated","energyRetry"])
  elements.set(id, { textContent: "", hidden: false, addEventListener() {}, previousElementSibling: { textContent: "" } });

let ready;
globalThis.window = globalThis;
globalThis.document = {
  getElementById: id => elements.get(id) || null,
  querySelector: () => null,
  createElement: () => ({ dataset: {} }),
  head: { appendChild() {} },
  addEventListener: (event, callback) => { if (event === "DOMContentLoaded") ready = callback; },
};
const rows = [
  ...Array.from({ length: 10 }, () => ({ kategori_code: "spbu_reguler" })),
  ...Array.from({ length: 7 }, () => ({ jenis_resmi: "SPBU Kompak / Seri 76" })),
  { kategori_badge: "SPBUN Nelayan" },
  ...Array.from({ length: 9 }, () => ({ kategori_code: "pertashop" })),
];
const snapshot = values => ({ docs: values.map(value => ({ data: () => value })) });
globalThis.db = { collection: name => ({ get: async () => snapshot(name === "bbm_outlets" ? rows : name === "lpg_agents" ? Array(9).fill({}) : Array(681).fill({})) }) };

vm.runInThisContext(fs.readFileSync("js/dashboard-esdm.js", "utf8"));
ready();
await new Promise(resolve => setTimeout(resolve, 0));

assert.equal(elements.get("kpiFuel").textContent, "27");
assert.equal(elements.get("kpiSpbu").textContent, "18");
assert.equal(elements.get("bbmRegular").textContent, "10");
assert.equal(elements.get("bbmCompact").textContent, "7");
assert.equal(elements.get("bbmFisher").textContent, "1");
assert.equal(elements.get("bbmPertashop").textContent, "9");
console.log("PASS Dashboard ESDM category normalization");
