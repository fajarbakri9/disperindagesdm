import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

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
    await setDoc(doc(context.firestore(), 'users/ordinary-user'), {
      status: 'ACTIVE', role: 'TRADE_EDITOR',
    });
    await setDoc(doc(context.firestore(), 'mi_story_clusters/story-example'), { status: 'ACTIVE' });
    await setDoc(doc(context.firestore(), 'mi_issues/issue-example'), {
      title: 'Issue LPG', status: 'MONITORING', severity: 'MEDIUM',
      verification_status: 'UNVERIFIED', story_cluster_id: 'story-example',
      updated_at: new Date(),
    });
    await setDoc(doc(context.firestore(), 'mi_items/example'), {
      title: 'Internal', excerpt: 'Ringkasan', topic_ids: ['lpg'], district_ids: ['pinrang'],
      verification_status: 'NEEDS_REVIEW', story_cluster_id: 'story-example',
      issue_id: 'issue-example', updated_at: new Date(),
    });
    await setDoc(doc(context.firestore(), 'reports/private-example'), {
      id: 'rep-private-example', ticket_number: 'DPE-2026-999999',
      nama: 'Pelapor Privat', pesan: 'Isi laporan privat.',
    });
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

it('denies an admin item change without its required audit log', async () => {
  const db = env.authenticatedContext('admin-user').firestore();
  await assertFails(updateDoc(doc(db, 'mi_items/example'), {
    verification_status: 'MANUAL_VERIFIED', reviewed_by: 'admin-user',
    reviewed_at: serverTimestamp(), review_event_id: 'event-without-audit-123',
    review_notes: 'Sudah diperiksa', updated_at: serverTimestamp(),
  }));
});

it('allows an authorized atomic review and immutable audit log', async () => {
  const db = env.authenticatedContext('admin-user').firestore();
  const eventId = `review-event-${Date.now()}`;
  const batch = writeBatch(db);
  batch.update(doc(db, 'mi_items/example'), {
    verification_status: 'MANUAL_VERIFIED', reviewed_by: 'admin-user',
    reviewed_at: serverTimestamp(), review_event_id: eventId,
    review_notes: 'Sumber asli telah diperiksa', updated_at: serverTimestamp(),
  });
  batch.set(doc(db, `mi_audit_logs/${eventId}`), {
    event_id: eventId, action: 'ACCEPT', entity_type: 'ITEM', entity_id: 'example',
    actor_uid: 'admin-user', actor_role: 'PUBLIC_RELATIONS_EDITOR',
    before: { verification_status: 'NEEDS_REVIEW' },
    after: { verification_status: 'MANUAL_VERIFIED' },
    reason: 'Sumber asli telah diperiksa', created_at: serverTimestamp(),
  });
  await assertSucceeds(batch.commit());
  await assertFails(updateDoc(doc(db, `mi_audit_logs/${eventId}`), { reason: 'diubah' }));
});

it('denies review writes from an unauthorized active role', async () => {
  const db = env.authenticatedContext('ordinary-user').firestore();
  await assertFails(updateDoc(doc(db, 'mi_items/example'), {
    title: 'Tidak boleh', reviewed_by: 'ordinary-user', reviewed_at: serverTimestamp(),
    review_event_id: 'unauthorized-event-0001', review_notes: 'uji', updated_at: serverTimestamp(),
  }));
});

it('keeps public operational data readable but rejects every anonymous mutation', async () => {
  const db = env.unauthenticatedContext().firestore();
  const publicCollections = [
    'prices', 'sembako', 'market_prices_latest', 'documents',
    'banners', 'districts', 'skm',
  ];
  for (const collection of publicCollections) {
    await assertSucceeds(getDoc(doc(db, `${collection}/example`)));
    await assertFails(setDoc(doc(db, `${collection}/anonymous-write`), { value: 'forged' }));
  }
  await assertFails(getDoc(doc(db, 'sp2kp_pilot/example')));
  await assertFails(setDoc(doc(db, 'sp2kp_pilot/anonymous-write'), { value: 'forged' }));
});

it('allows an anonymous complaint only with the bounded public schema', async () => {
  const db = env.unauthenticatedContext().firestore();
  const suffix = String(Date.now()).slice(-6);
  const reportId = `rep-20260903-${suffix}`;
  await assertSucceeds(setDoc(doc(db, `reports/${reportId}`), {
    id: reportId,
    ticket_number: `DPE-2026-${suffix}`,
    submitted_at: '3 September 2026 • 10.00 WITA',
    nama: 'Pelapor Uji', kontak: '081234567890', kategori: 'Pengaduan Umum',
    lokasi: 'Kabupaten Pinrang', judul: 'Laporan uji',
    pesan: 'Uraian laporan yang valid.', assigned_unit: 'Sekretariat',
    status: 'Diterima & Sedang Diverifikasi',
    resolution: 'Laporan masuk dalam antrean verifikasi.', createdAt: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(db, 'reports/rep-invalid'), {
    id: 'rep-invalid', ticket_number: 'INVALID', pesan: '<script>alert(1)</script>',
    createdAt: serverTimestamp(),
  }));
});

it('protects complaint contents from ordinary accounts', async () => {
  const ordinary = env.authenticatedContext('ordinary-user').firestore();
  const admin = env.authenticatedContext('admin-user').firestore();
  await assertFails(getDoc(doc(ordinary, 'reports/private-example')));
  await assertSucceeds(getDoc(doc(admin, 'reports/private-example')));
});

it('allows authorized banner configuration without reopening legacy banners', async () => {
  const admin = env.authenticatedContext('admin-user').firestore();
  await assertSucceeds(setDoc(doc(admin, 'settings/banners'), {
    list: [], deleted_ids: [], updated_at: '2026-09-03T00:00:00Z',
  }));
  await assertFails(setDoc(doc(admin, 'banners/legacy'), { title: 'legacy' }));
});
