import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
let env;
const hash = 'a'.repeat(64);

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-local-market-prices',
    firestore: { rules: fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'users/trade-admin'), { status: 'ACTIVE', role: 'TRADE_EDITOR' });
    await setDoc(doc(context.firestore(), 'markets/pasar-sentral'), { name: 'Pasar Sentral Pinrang', status: 'active' });
    await setDoc(doc(context.firestore(), 'marketPriceObservations/staged-one'), { status: 'staged', dataStatus: 'valid', price: 15000 });
  });
});

after(async () => env.cleanup());

it('denies anonymous access to staged observations and all writes', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'marketPriceObservations/staged-one')));
  await assertFails(setDoc(doc(db, 'marketPriceImportBatches/anonymous'), { status: 'staging' }));
});

it('requires the publication and batch release to commit atomically', async () => {
  const db = env.authenticatedContext('trade-admin').firestore();
  const batchId = 'local_atomic_batch';
  await assertSucceeds(setDoc(doc(db, `marketPriceImportBatches/${batchId}`), {
    batchId, status: 'staging', fileHash: hash, marketId: 'pasar-sentral', createdBy: 'trade-admin', createdAt: serverTimestamp(),
  }));
  const publication = {
    batchId, status: 'published', dataStatus: 'valid', observations: [{ commodityName: 'Beras', price: 15000 }], publishedAt: serverTimestamp(),
  };
  await assertFails(setDoc(doc(db, `marketPricePublications/${batchId}`), publication));
  const release = writeBatch(db);
  release.update(doc(db, `marketPriceImportBatches/${batchId}`), { status: 'published', publishedAt: serverTimestamp() });
  release.set(doc(db, `marketPricePublications/${batchId}`), publication);
  await assertSucceeds(release.commit());
  await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), `marketPricePublications/${batchId}`)));
  await assertFails(updateDoc(doc(db, `marketPricePublications/${batchId}`), { observationCount: 2 }));
});
