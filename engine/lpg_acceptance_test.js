const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');

const storage = {};
global.localStorage = {
  getItem: key => Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null,
  setItem: (key, value) => { storage[key] = String(value); },
  removeItem: key => { delete storage[key]; }
};

vm.runInThisContext(fs.readFileSync('js/lpg-data-seed.js', 'utf8'));
vm.runInThisContext(fs.readFileSync('js/lpg-engine.js', 'utf8'));

const session = { username: 'test-agent-ag001', name: 'Acceptance Test', role: 'LPG_AGENT_ADMIN' };
const checks = [];
function test(name, fn) {
  fn();
  checks.push(name);
  console.log(`PASS  ${name}`);
}

test('seed berisi 8 agen dan 681 pangkalan', () => {
  assert.equal(getLpgStore(LPG_STORAGE_KEYS.AGENTS, []).length, 8);
  assert.equal(getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []).length, 681);
});

test('seluruh seed memiliki provenance dan pemetaan agen valid', () => {
  const agents = new Set(getLpgStore(LPG_STORAGE_KEYS.AGENTS, []).map(item => item.id));
  const items = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
  assert.ok(items.every(item => item.sourceOriginal && Object.keys(item.sourceOriginal).length > 0));
  assert.ok(items.every(item => agents.has(item.agentId)));
  assert.equal(new Set(items.map(item => item.kecamatan)).size, 12);
});

test('saldo awal tidak dibuat secara fiktif', () => {
  assert.deepEqual(getLpgStore(LPG_STORAGE_KEYS.BALANCES, {}), {});
});

const target = getAgentPangkalanList('AG-001').find(item => !item.isDeleted);

test('stok masuk menambah saldo dari immutable event', () => {
  const result = processLpgEvent({ type:'STOCK_IN', agentId:'AG-001', quantity:560, clientEventId:'accept-stock-1' }, session);
  assert.equal(result.success, true);
  assert.equal(result.currentBalance, 560);
});

test('clientEventId mencegah double submit', () => {
  const before = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []).length;
  const result = processLpgEvent({ type:'STOCK_IN', agentId:'AG-001', quantity:560, clientEventId:'accept-stock-1' }, session);
  assert.equal(result.success, true);
  assert.equal(getLpgStore(LPG_STORAGE_KEYS.EVENTS, []).length, before);
  assert.equal(getLpgStore(LPG_STORAGE_KEYS.BALANCES, {})['AG-001'].filledCylinderBalance, 560);
});

test('distribusi mengurangi saldo dan menyimpan snapshot pangkalan', () => {
  const result = processLpgEvent({ type:'DISTRIBUTION', agentId:'AG-001', pangkalanId:target.id, quantity:120, clientEventId:'accept-dist-1' }, session);
  assert.equal(result.success, true);
  assert.equal(result.currentBalance, 440);
  assert.equal(result.event.pangkalanSnapshot.id, target.id);
});

test('saldo negatif diterima sebagai anomali pengawasan', () => {
  const result = processLpgEvent({ type:'DISTRIBUTION', agentId:'AG-001', pangkalanId:target.id, quantity:500, clientEventId:'accept-dist-negative' }, session);
  assert.equal(result.success, true);
  assert.equal(result.currentBalance, -60);
  assert.equal(getLpgStore(LPG_STORAGE_KEYS.BALANCES, {})['AG-001'].hasStockAnomaly, true);
});

test('soft delete menutup distribusi baru tanpa menghapus histori', () => {
  assert.equal(softDeleteAgentPangkalan('AG-001', target.id, 'Acceptance test soft delete', session).success, true);
  const rejected = processLpgEvent({ type:'DISTRIBUTION', agentId:'AG-001', pangkalanId:target.id, quantity:10, clientEventId:'accept-deleted-target' }, session);
  assert.equal(rejected.success, false);
  const history = getLpgStore(LPG_STORAGE_KEYS.EVENTS, []).find(item => item.clientEventId === 'accept-dist-1');
  assert.equal(history.pangkalanSnapshot.id, target.id);
});

test('edit seed mempertahankan sourceOriginal dan mencatat audit diff', () => {
  const another = getAgentPangkalanList('AG-001').find(item => !item.isDeleted && item.sourceType === 'ESDM_PUBLIC_SEED');
  const provenance = JSON.stringify(another.sourceOriginal);
  const result = editAgentPangkalan('AG-001', another.id, { address:'Alamat koreksi acceptance test', editReason:'Uji provenance' }, session);
  assert.equal(result.success, true);
  const updated = getAgentPangkalanList('AG-001').find(item => item.id === another.id);
  assert.equal(JSON.stringify(updated.sourceOriginal), provenance);
  const audit = getLpgStore(LPG_STORAGE_KEYS.AUDIT_LOGS, []).find(item => item.action === 'PANGKALAN_UPDATE' && item.entityId === another.id);
  assert.ok(audit.changedFields.includes('address'));
});

console.log(`\n${checks.length} acceptance checks lulus.`);
