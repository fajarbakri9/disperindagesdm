const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');

const storage = {};
global.localStorage = {
  getItem: key => Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null,
  setItem: (key, value) => { storage[key] = String(value); },
  removeItem: key => { delete storage[key]; }
};

vm.runInThisContext(fs.readFileSync('js/lpg-engine.js', 'utf8'));

const checks = [];
function test(name, fn) {
  fn();
  checks.push(name);
  console.log(`PASS  ${name}`);
}

test('master LPG tidak diisi dari seed atau localStorage', () => {
  initLpgDatabase();
  assert.deepEqual(getLpgStore(LPG_STORAGE_KEYS.AGENTS, []), []);
  assert.deepEqual(getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []), []);
  assert.deepEqual(storage, {});
});

test('processor transaksi lokal selalu ditolak', () => {
  const result = processLpgEvent({ type: 'STOCK_IN', agentId: 'AG-001', quantity: 560 }, {});
  assert.equal(result.success, false);
  assert.equal(result.persistence, 'DISABLED');
  assert.deepEqual(storage, {});
});

test('fungsi mutasi resmi membutuhkan server dan bersifat async', () => {
  assert.equal(submitLpgLedgerEvent.constructor.name, 'AsyncFunction');
  assert.equal(addAgentPangkalanFirestore.constructor.name, 'AsyncFunction');
  assert.equal(editAgentPangkalanFirestore.constructor.name, 'AsyncFunction');
  assert.equal(softDeleteAgentPangkalanFirestore.constructor.name, 'AsyncFunction');
});

test('source menolak snapshot Firestore dari cache', () => {
  const source = fs.readFileSync('js/lpg-engine.js', 'utf8');
  assert.match(source, /snapshot\.metadata\.fromCache/);
  assert.match(source, /source:\s*'server'/);
  assert.match(source, /no_fallback/);
});

console.log(`\n${checks.length} acceptance checks lulus.`);
