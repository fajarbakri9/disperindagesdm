import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-media-intelligence',
    firestore: {
      rules: fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/admin-user'), {
      status: 'ACTIVE',
      role: 'PUBLIC_RELATIONS_EDITOR',
    });
    await setDoc(doc(context.firestore(), 'mi_items/example'), { title: 'Internal' });
  });
});

after(async () => {
  await env.cleanup();
});

it('allows anonymous read only for mi_public/current', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, 'mi_public/current')));
  await assertFails(getDoc(doc(db, 'mi_public/other')));
});

it('denies anonymous reads from internal media intelligence data', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'mi_items/example')));
});

it('allows active media intelligence admin to read internal data', async () => {
  const db = env.authenticatedContext('admin-user').firestore();
  await assertSucceeds(getDoc(doc(db, 'mi_items/example')));
});

it('denies browser writes even for media intelligence admin', async () => {
  const db = env.authenticatedContext('admin-user').firestore();
  await assertFails(setDoc(doc(db, 'mi_items/browser-write'), { title: 'Rejected' }));
});
