'use strict';

const EVENT_TYPES = new Set(['OPENING_BALANCE', 'STOCK_IN', 'DISTRIBUTION', 'ADJUSTMENT']);
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'DISPERINDAG_ADMIN', 'LPG_ADMIN']);

function validateEvent(event) {
  if (!event || event.status !== 'PENDING') return 'INVALID_INITIAL_STATUS';
  if (!EVENT_TYPES.has(event.type)) return 'INVALID_EVENT_TYPE';
  if (!event.agentId || !event.createdBy || !event.clientEventId) return 'MISSING_REQUIRED_FIELD';
  if (!Number.isSafeInteger(event.quantity) || event.quantity <= 0) return 'INVALID_QUANTITY';
  if (event.type === 'DISTRIBUTION' && !event.pangkalanId) return 'PANGKALAN_REQUIRED';
  return null;
}

function canOperateAgent(actor, agentId) {
  if (!actor) return false;
  if (ADMIN_ROLES.has(actor.role)) return true;
  return ['LPG_AGENT_ADMIN', 'LPG_AGENT_OPERATOR'].includes(actor.role) && actor.agentId === agentId;
}

function calculateNextBalance(currentBalance, event) {
  const current = Number.isSafeInteger(currentBalance) ? currentBalance : 0;
  if (event.type === 'DISTRIBUTION') {
    if (current < event.quantity) return { error: 'INSUFFICIENT_STOCK' };
    return { balance: current - event.quantity, delta: -event.quantity };
  }
  if (event.type === 'ADJUSTMENT' && event.direction === 'OUT') {
    if (current < event.quantity) return { error: 'INSUFFICIENT_STOCK' };
    return { balance: current - event.quantity, delta: -event.quantity };
  }
  return { balance: current + event.quantity, delta: event.quantity };
}

module.exports = { ADMIN_ROLES, validateEvent, canOperateAgent, calculateNextBalance };
