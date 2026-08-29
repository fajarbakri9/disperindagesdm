'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEvent, canOperateAgent, calculateNextBalance } = require('../lib/lpg-domain');

const valid = { status: 'PENDING', type: 'STOCK_IN', agentId: 'AG-001', createdBy: 'uid-1', clientEventId: 'client-1', quantity: 100 };

test('hanya menerima event PENDING lengkap dengan integer positif', () => {
  assert.equal(validateEvent(valid), null);
  assert.equal(validateEvent({ ...valid, status: 'POSTED' }), 'INVALID_INITIAL_STATUS');
  assert.equal(validateEvent({ ...valid, quantity: 1.5 }), 'INVALID_QUANTITY');
  assert.equal(validateEvent({ ...valid, clientEventId: '' }), 'MISSING_REQUIRED_FIELD');
});

test('agen hanya dapat mengoperasikan agentId sendiri', () => {
  assert.equal(canOperateAgent({ role: 'LPG_AGENT_ADMIN', agentId: 'AG-001' }, 'AG-001'), true);
  assert.equal(canOperateAgent({ role: 'LPG_AGENT_ADMIN', agentId: 'AG-001' }, 'AG-002'), false);
  assert.equal(canOperateAgent({ role: 'LPG_ADMIN' }, 'AG-002'), true);
});

test('ledger menolak saldo negatif dan menghitung delta deterministik', () => {
  assert.deepEqual(calculateNextBalance(50, { type: 'DISTRIBUTION', quantity: 60 }), { error: 'INSUFFICIENT_STOCK' });
  assert.deepEqual(calculateNextBalance(50, { type: 'DISTRIBUTION', quantity: 20 }), { balance: 30, delta: -20 });
  assert.deepEqual(calculateNextBalance(50, { type: 'STOCK_IN', quantity: 20 }), { balance: 70, delta: 20 });
});
