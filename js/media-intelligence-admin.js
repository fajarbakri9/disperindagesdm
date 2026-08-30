(() => {
  'use strict';
  const ALLOWED_ROLES = new Set(['SUPER_ADMIN','DISPERINDAG_ADMIN','PUBLIC_RELATIONS_EDITOR','INDUSTRY_ESDM_EDITOR']);
  const state = { user: null, profile: null, items: [], issues: [] };
  const $ = id => document.getElementById(id);
  const serverTime = () => firebase.firestore.FieldValue.serverTimestamp();
  const text = value => value === undefined || value === null || value === '' ? '-' : String(value);

  function notice(message, error = false) {
    $('notice').textContent = message;
    $('notice').className = `notice${error ? ' error' : ''}`;
  }
  function button(label, action, danger = false) {
    const el = document.createElement('button'); el.type = 'button'; el.className = `btn${danger ? ' danger' : ''}`;
    el.textContent = label; el.addEventListener('click', async () => {
      try { await action(); } catch (error) { notice(error.message || 'Aksi review gagal.', true); }
    }); return el;
  }
  function addMeta(parent, value) { const el = document.createElement('div'); el.className = 'meta'; el.textContent = value; parent.append(el); }
  function selectedSnapshot(data, fields) { const result = {}; fields.forEach(key => { result[key] = data[key] ?? null; }); return result; }
  function newEventId() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

  async function auditedUpdate(collection, id, entityType, action, changes, reason) {
    if (!reason || !reason.trim()) throw new Error('Alasan review wajib diisi.');
    const ref = db.collection(collection).doc(id); const eventId = newEventId();
    const current = (await ref.get()).data(); if (!current) throw new Error('Data sudah tidak tersedia.');
    const keys = Object.keys(changes); const before = selectedSnapshot(current, keys);
    const after = selectedSnapshot({ ...current, ...changes }, keys); const batch = db.batch();
    batch.update(ref, { ...changes, reviewed_by: state.user.uid, reviewed_at: serverTime(),
      review_event_id: eventId, review_notes: reason.trim(), updated_at: serverTime() });
    batch.set(db.collection('mi_audit_logs').doc(eventId), {
      event_id: eventId, action, entity_type: entityType, entity_id: id,
      actor_uid: state.user.uid, actor_role: state.profile.role, before, after,
      reason: reason.trim(), created_at: serverTime()
    });
    await batch.commit(); notice(`${action} berhasil dan audit log ${eventId} tercatat.`); await loadData();
  }
  function askReason(label) { return window.prompt(`Alasan ${label} (wajib):`, '') || ''; }

  function renderItems() {
    const host = $('items'); host.replaceChildren();
    if (!state.items.length) { host.textContent = 'Tidak ada item pada antrean saat ini.'; host.className = 'empty'; return; }
    host.className = '';
    state.items.forEach(({ id, data }) => {
      const row = document.createElement('section'); row.className = 'entry'; const title = document.createElement('h3'); title.textContent = text(data.title); row.append(title);
      addMeta(row, `${text(data.publisher)} • ${text(data.verification_status)} • ${text(data.source_id)}`);
      const actions = document.createElement('div'); actions.className = 'actions';
      actions.append(
        button('Accept', () => auditedUpdate('mi_items', id, 'ITEM', 'ACCEPT', { verification_status:'MANUAL_VERIFIED' }, askReason('penerimaan'))),
        button('Reject', () => auditedUpdate('mi_items', id, 'ITEM', 'REJECT', { verification_status:'REJECTED' }, askReason('penolakan')), true),
        button('Edit', async () => { const value = window.prompt('Judul hasil koreksi:', data.title || ''); if (value && value.trim()) await auditedUpdate('mi_items', id, 'ITEM', 'EDIT', { title:value.trim() }, askReason('edit')); }),
        button('Merge Story', async () => { const value = window.prompt('ID story tujuan:', data.story_cluster_id || ''); if (value && value.trim()) await auditedUpdate('mi_items', id, 'ITEM', 'MERGE_STORY', { story_cluster_id:value.trim() }, askReason('merge story')); }),
        button('Attach Issue', async () => { const value = window.prompt('ID issue tujuan:', data.issue_id || ''); if (value && value.trim()) await auditedUpdate('mi_items', id, 'ITEM', 'ATTACH_ISSUE', { issue_id:value.trim() }, askReason('attach issue')); })
      ); row.append(actions); host.append(row);
    });
  }
  function renderIssues() {
    const host = $('issues'); host.replaceChildren();
    if (!state.issues.length) { host.textContent = 'Tidak ada issue pada antrean saat ini.'; host.className = 'empty'; return; }
    host.className = '';
    state.issues.forEach(({ id, data }) => {
      const row = document.createElement('section'); row.className = 'entry'; const title = document.createElement('h3'); title.textContent = text(data.title); row.append(title);
      addMeta(row, `${text(data.severity)} • ${text(data.status)} • ${text(data.verification_status)}`);
      const actions = document.createElement('div'); actions.className = 'actions';
      actions.append(
        button('Accept', () => auditedUpdate('mi_issues', id, 'ISSUE', 'ACCEPT', { verification_status:'VERIFIED' }, askReason('verifikasi issue'))),
        button('Reject', () => auditedUpdate('mi_issues', id, 'ISSUE', 'REJECT', { verification_status:'REJECTED', status:'DISMISSED' }, askReason('penolakan issue')), true),
        button('Set Severity', async () => { const value = (window.prompt('Severity: LOW / MEDIUM / HIGH / CRITICAL', data.severity || 'MEDIUM') || '').toUpperCase(); if (['LOW','MEDIUM','HIGH','CRITICAL'].includes(value)) await auditedUpdate('mi_issues', id, 'ISSUE', 'SET_SEVERITY', { severity:value }, askReason('perubahan severity')); })
      ); row.append(actions); host.append(row);
    });
  }
  async function loadData() {
    $('reload').disabled = true; notice('Memuat antrean internal…');
    try {
      const [items, issues] = await Promise.all([
        db.collection('mi_items').orderBy('updated_at','desc').limit(50).get(),
        db.collection('mi_issues').orderBy('updated_at','desc').limit(50).get()
      ]);
      state.items = items.docs.map(doc => ({ id:doc.id, data:doc.data() }));
      state.issues = issues.docs.map(doc => ({ id:doc.id, data:doc.data() }));
      renderItems(); renderIssues(); notice(`Antrean dimuat: ${state.items.length} item dan ${state.issues.length} issue.`);
    } catch (error) { notice(`Gagal memuat antrean: ${error.message}`, true); }
    finally { $('reload').disabled = false; }
  }
  $('reload').addEventListener('click', loadData);
  auth.onAuthStateChanged(async user => {
    if (!user) { location.replace(`/login?redirect=${encodeURIComponent('/media-intelligence-admin')}`); return; }
    try {
      const snap = await db.collection('users').doc(user.uid).get(); const profile = snap.data();
      if (!profile || profile.status !== 'ACTIVE' || !ALLOWED_ROLES.has(profile.role)) {
        $('identity').textContent = user.email || user.uid; notice('Akun ini tidak berwenang mengakses review Media Intelligence.', true); return;
      }
      state.user = user; state.profile = profile; $('identity').textContent = `${profile.name || user.email} • ${profile.role}`; await loadData();
    } catch (error) { notice(`Validasi akses gagal: ${error.message}`, true); }
  });
})();
