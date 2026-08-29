'use strict';

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const { ADMIN_ROLES, validateEvent, canOperateAgent, calculateNextBalance } = require('./lib/lpg-domain');

initializeApp();

exports.processLpgEvent = onDocumentCreated({
  document: 'lpg_events/{eventId}',
  region: 'asia-southeast2',
  retry: true
}, async event => {
  const db = getFirestore();
  const eventRef = event.data.ref;
  const eventId = event.params.eventId;

  await db.runTransaction(async transaction => {
    const eventSnapshot = await transaction.get(eventRef);
    if (!eventSnapshot.exists) return;
    const data = eventSnapshot.data();
    if (data.status !== 'PENDING') return;

    const reject = reason => {
      transaction.update(eventRef, {
        status: 'REJECTED',
        rejectionReason: reason,
        processedAt: FieldValue.serverTimestamp()
      });
    };

    const validationError = validateEvent(data);
    if (validationError) return reject(validationError);

    const actorRef = db.collection('users').doc(data.createdBy);
    const agentRef = db.collection('lpg_agents').doc(data.agentId);
    const balanceRef = db.collection('lpg_balances').doc(data.agentId);
    const [actorSnapshot, agentSnapshot, balanceSnapshot] = await Promise.all([
      transaction.get(actorRef), transaction.get(agentRef), transaction.get(balanceRef)
    ]);
    const actor = actorSnapshot.exists ? actorSnapshot.data() : null;
    const agent = agentSnapshot.exists ? agentSnapshot.data() : null;
    if (!canOperateAgent(actor, data.agentId)) return reject('ACTOR_NOT_AUTHORIZED');
    if (!agent || agent.status !== 'ACTIVE') return reject('AGENT_NOT_ACTIVE');
    if (['OPENING_BALANCE', 'ADJUSTMENT'].includes(data.type) && !ADMIN_ROLES.has(actor.role)) {
      return reject('ADMIN_ONLY_EVENT');
    }

    const duplicateQuery = db.collection('lpg_events')
      .where('clientEventId', '==', data.clientEventId).limit(2);
    const duplicates = await transaction.get(duplicateQuery);
    if (duplicates.docs.some(doc => doc.id !== eventId && doc.data().status === 'POSTED')) {
      return reject('DUPLICATE_CLIENT_EVENT_ID');
    }

    let pangkalanSnapshot = null;
    let pangkalanRef = null;
    if (data.type === 'DISTRIBUTION') {
      pangkalanRef = db.collection('lpg_pangkalan').doc(data.pangkalanId);
      const pangkalanDoc = await transaction.get(pangkalanRef);
      const pangkalan = pangkalanDoc.exists ? pangkalanDoc.data() : null;
      if (!pangkalan || pangkalan.agentId !== data.agentId) return reject('PANGKALAN_OWNERSHIP_INVALID');
      if (pangkalan.isDeleted || pangkalan.status !== 'ACTIVE') return reject('PANGKALAN_NOT_ACTIVE');
      pangkalanSnapshot = {
        id: pangkalanDoc.id,
        name: pangkalan.name || null,
        kecamatan: pangkalan.kecamatan || null,
        desaKelurahan: pangkalan.desaKelurahan || null,
        address: pangkalan.address || null
      };
    }

    const currentBalance = balanceSnapshot.exists ? balanceSnapshot.data().filledCylinderBalance : 0;
    const next = calculateNextBalance(currentBalance, data);
    if (next.error) return reject(next.error);

    const serverTime = FieldValue.serverTimestamp();
    transaction.set(balanceRef, {
      agentId: data.agentId,
      filledCylinderBalance: next.balance,
      lastPostedEventAt: serverTime,
      updatedAt: serverTime
    }, { merge: true });
    transaction.update(eventRef, {
      status: 'POSTED',
      postedAt: serverTime,
      processedAt: serverTime,
      pangkalanSnapshot,
      balanceAfter: next.balance,
      rejectionReason: null
    });
    if (pangkalanRef) {
      transaction.update(pangkalanRef, {
        lastDeliveryAt: serverTime,
        lastDeliveryQuantity: data.quantity,
        updatedAt: serverTime
      });
    }
    const auditRef = db.collection('lpg_audit_logs').doc(`EVENT_POSTED_${eventId}`);
    transaction.set(auditRef, {
      action: 'LPG_EVENT_POSTED',
      entityType: 'LPG_EVENT',
      entityId: eventId,
      agentId: data.agentId,
      actorUid: data.createdBy,
      actorRole: actor.role,
      after: { status: 'POSTED', balanceAfter: next.balance },
      createdAt: serverTime
    });
  });

  logger.info('LPG event processing finished', { eventId });
});
