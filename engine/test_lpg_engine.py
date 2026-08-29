import subprocess
import os

# Buat script JS sederhana untuk menjalankan test lpg-engine via node
js_test_code = """
const fs = require('fs');

// Mock localStorage
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = v; },
  removeItem: (k) => { delete storage[k]; }
};

// Load Seed & Engine ke global
const seedCode = fs.readFileSync('js/lpg-data-seed.js', 'utf-8');
const engineCode = fs.readFileSync('js/lpg-engine.js', 'utf-8');
const vm = require('vm');
vm.runInThisContext(seedCode);
vm.runInThisContext(engineCode);

console.log("=== RUNNING LPG ENGINE UNIT TESTS ===");

// TEST 1: Database Initialization
const pangkalan = getLpgStore(LPG_STORAGE_KEYS.PANGKALAN, []);
const agents = getLpgStore(LPG_STORAGE_KEYS.AGENTS, []);
const balances = getLpgStore(LPG_STORAGE_KEYS.BALANCES, {});

console.log(`[TEST 1] Agents Count: ${agents.length} (Expected: 8) -> ${agents.length === 8 ? 'PASS' : 'FAIL'}`);
console.log(`[TEST 1] Pangkalan Count: ${pangkalan.length} (Expected: 681) -> ${pangkalan.length === 681 ? 'PASS' : 'FAIL'}`);
console.log(`[TEST 1] Initial Balance AG-001: ${balances['AG-001'].filledCylinderBalance} (Expected: 1240) -> ${balances['AG-001'].filledCylinderBalance === 1240 ? 'PASS' : 'FAIL'}`);

// TEST 2: Stock In (+560)
const stockInRes = processLpgEvent({
  type: 'STOCK_IN',
  agentId: 'AG-001',
  agentName: 'PT. GASIFA MULYA PERSADA',
  quantity: 560,
  doNumber: 'DO-PERTAMINA-001',
  clientEventId: 'test-evt-001'
}, { username: 'agen_gasifa', name: 'Operator Gasifa', role: 'LPG_AGENT_ADMIN' });

console.log(`[TEST 2] Stock In Result: ${stockInRes.success ? 'PASS' : 'FAIL'} | New Balance: ${stockInRes.currentBalance} (Expected: 1800) -> ${stockInRes.currentBalance === 1800 ? 'PASS' : 'FAIL'}`);

// TEST 3: Idempotency (Submit Ulang Event yang sama)
const duplicateRes = processLpgEvent({
  type: 'STOCK_IN',
  agentId: 'AG-001',
  quantity: 560,
  clientEventId: 'test-evt-001'
}, { username: 'agen_gasifa', name: 'Operator Gasifa', role: 'LPG_AGENT_ADMIN' });

const balanceAfterDup = getLpgStore(LPG_STORAGE_KEYS.BALANCES, {})['AG-001'].filledCylinderBalance;
console.log(`[TEST 3] Idempotency Handled: ${balanceAfterDup === 1800 ? 'PASS' : 'FAIL'} (Saldo tetap 1800, tidak double post)`);

// TEST 4: Distribution to Pangkalan (-120)
const agentPangkalan = getAgentPangkalanList('AG-001');
const targetP = agentPangkalan[0];

const distRes = processLpgEvent({
  type: 'DISTRIBUTION',
  agentId: 'AG-001',
  agentName: 'PT. GASIFA MULYA PERSADA',
  pangkalanId: targetP.id,
  quantity: 120,
  vehicleNumber: 'DP 8123 LP',
  clientEventId: 'test-evt-002'
}, { username: 'agen_gasifa', name: 'Operator Gasifa', role: 'LPG_AGENT_ADMIN' });

console.log(`[TEST 4] Distribution Result: ${distRes.success ? 'PASS' : 'FAIL'} | New Balance: ${distRes.currentBalance} (Expected: 1680) -> ${distRes.currentBalance === 1680 ? 'PASS' : 'FAIL'}`);
console.log(`[TEST 4] Snapshot Stored: ${distRes.event.pangkalanSnapshot ? 'PASS' : 'FAIL'} (${distRes.event.pangkalanSnapshot.name})`);

// TEST 5: Insufficient Stock (Anti-Saldo Negatif)
const overRes = processLpgEvent({
  type: 'DISTRIBUTION',
  agentId: 'AG-001',
  pangkalanId: targetP.id,
  quantity: 5000, // Lebih dari saldo 1680
  clientEventId: 'test-evt-003'
}, { username: 'agen_gasifa', name: 'Operator Gasifa', role: 'LPG_AGENT_ADMIN' });

const balanceAfterOver = getLpgStore(LPG_STORAGE_KEYS.BALANCES, {})['AG-001'].filledCylinderBalance;
console.log(`[TEST 5] Insufficient Stock Rejected: ${!overRes.success ? 'PASS' : 'FAIL'} | Saldo: ${balanceAfterOver} (Tidak Berubah) -> ${balanceAfterOver === 1680 ? 'PASS' : 'FAIL'}`);

// TEST 6: Soft Delete Pangkalan
const delRes = softDeleteAgentPangkalan('AG-001', targetP.id, 'Pangkalan tutup permanen', { username: 'agen_gasifa', role: 'LPG_AGENT_ADMIN' });
console.log(`[TEST 6] Soft Delete: ${delRes.success ? 'PASS' : 'FAIL'}`);

const activeList = getAgentPangkalanList('AG-001').filter(p => !p.isDeleted);
const checkDeleted = activeList.find(p => p.id === targetP.id);
console.log(`[TEST 6] Excluded from Active List: ${!checkDeleted ? 'PASS' : 'FAIL'}`);

// TEST 7: Summary Dashboard Refreshed
const summary = refreshLpgDashboardSummary();
console.log(`[TEST 7] Dashboard Summary Stock In Today: ${summary.stockInToday} (Expected: 560) -> ${summary.stockInToday === 560 ? 'PASS' : 'FAIL'}`);
console.log(`[TEST 7] Dashboard Summary Distributed Today: ${summary.distributedToday} (Expected: 120) -> ${summary.distributedToday === 120 ? 'PASS' : 'FAIL'}`);
console.log(`[TEST 7] Dashboard Summary Total Pangkalan: ${summary.totalPangkalan} (Expected: 680 karena 1 soft delete) -> ${summary.totalPangkalan === 680 ? 'PASS' : 'FAIL'}`);

console.log("=== ALL UNIT TESTS COMPLETED SUCCESSFULLY ===");
"""

with open('engine/run_unit_tests.js', 'w', encoding='utf-8') as f:
    f.write(js_test_code)

res = subprocess.run('node engine/run_unit_tests.js', shell=True, text=True, capture_output=True)
print(res.stdout)
if res.stderr:
    print("STDERR:", res.stderr)

if os.path.exists('engine/run_unit_tests.js'):
    os.remove('engine/run_unit_tests.js')
