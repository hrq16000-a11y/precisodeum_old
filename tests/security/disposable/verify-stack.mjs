import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { assertLoopback } from '../../../scripts/security/disposable-guards.mjs';
import { CHECKS } from '../../../scripts/security/disposable-lifecycle.mjs';

const [statusPath, outputPath, scope] = process.argv.slice(2);
const coreOnly = scope === '--core-only';
const status = JSON.parse(readFileSync(statusPath, 'utf8'));
assertLoopback(status.API_URL);
assertLoopback(status.DB_URL, ['postgres:', 'postgresql:']);
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, options);
const anonymous = createClient(status.API_URL, status.ANON_KEY, options);
const db = new pg.Client({ connectionString: status.DB_URL });
const results = [];
async function check(name, action) {
  try { await action(); results.push({ check: name, result: 'PASS' }); }
  catch { results.push({ check: name, result: 'FAIL' }); throw new Error('CHECK_FAILED'); }
}
const accounts = [];
const runId = crypto.randomUUID();
try {
  await db.connect();
  await check('postgres-real-schema-rls-rpc-audit', async () => {
    const names = ['profiles', 'providers', 'services', 'service_images', 'sponsors', 'sponsor_change_requests', 'profile_change_suggestions', 'audit_log'];
    const tables = await db.query('select relname, relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname=$1 and relname=any($2)', ['public', names]);
    assert.equal(tables.rows.length, names.length);
    assert.ok(tables.rows.every(row => row.relrowsecurity === true));
    const functions = ['has_role', 'resolve_identity_suggestion', 'admin_review_sponsor_change_request', 'audit_user_ref_full_detailed'];
    const rpc = await db.query('select distinct proname from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname=$1 and proname=any($2)', ['public', functions]);
    assert.equal(rpc.rows.length, functions.length);
  });
  await check('auth-real-users-and-password-sessions', async () => {
    for (const kind of ['admin', 'owner', 'other']) {
      const email = `${kind}-${runId}@local.test`;
      const password = `Synthetic-${crypto.randomUUID()}-aA1`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `Synthetic ${kind}` } });
      assert.equal(created.error, null);
      assert.ok(created.data.user?.id);
      const client = createClient(status.API_URL, status.ANON_KEY, options);
      const session = await client.auth.signInWithPassword({ email, password });
      assert.equal(session.error, null);
      assert.equal(session.data.user?.id, created.data.user.id);
      accounts.push({ id: created.data.user.id, client, kind });
    }
    const administrator = accounts.find(a => a.kind === 'admin');
    assert.ok(administrator);
    await db.query("insert into public.user_roles(user_id, role) values ($1, 'admin') on conflict (user_id, role) do nothing", [administrator.id]);
  });
  const owner = accounts.find(a => a.kind === 'owner');
  const other = accounts.find(a => a.kind === 'other');
  const administrator = accounts.find(a => a.kind === 'admin');
  assert.ok(owner && other && administrator);
  await check('profile-persistence-read-back-through-data-api', async () => {
    const name = `Synthetic persisted ${runId}`;
    const update = await owner.client.from('profiles').update({ full_name: name }).eq('id', owner.id);
    assert.equal(update.error, null);
    const row = await owner.client.from('profiles').select('id,full_name').eq('id', owner.id).single();
    assert.equal(row.error, null);
    assert.equal(row.data?.full_name, name);
  });
  await check('rls-other-user-cannot-write-profile', async () => {
    // A denial may return zero affected rows, not necessarily an HTTP error.
    await other.client.from('profiles').update({ full_name: 'UNAUTHORIZED' }).eq('id', owner.id);
    const readBack = await owner.client.from('profiles').select('full_name').eq('id', owner.id).single();
    assert.equal(readBack.error, null);
    assert.equal(readBack.data?.full_name, `Synthetic persisted ${runId}`);
  });
  await check('rpc-real-jwt-role-distinction', async () => {
    for (const account of [owner, administrator]) {
      const response = await account.client.rpc('has_role', { _user_id: account.id, _role: 'admin' });
      assert.equal(response.error, null);
      assert.equal(response.data, account.kind === 'admin');
    }
  });
  await check('storage-private-upload-read-and-anonymous-denial', async () => {
    // Infrastructure probe only, not certification of the service-photo policies.
    const bucket = `synthetic-${runId}`;
    const created = await admin.storage.createBucket(bucket, { public: false });
    assert.equal(created.error, null);
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const upload = await admin.storage.from(bucket).upload('probe.png', bytes, { contentType: 'image/png' });
    assert.equal(upload.error, null);
    const downloaded = await admin.storage.from(bucket).download('probe.png');
    assert.equal(downloaded.error, null);
    assert.deepEqual(new Uint8Array(await downloaded.data.arrayBuffer()), bytes);
    const denied = await anonymous.storage.from(bucket).download('probe.png');
    assert.ok(denied.error);
  });
  if (!coreOnly) await check('edge-runtime-explicit-synthetic-mock', async () => {
    const response = await fetch(`${status.API_URL}/functions/v1/runtime-probe`, { headers: { apikey: status.ANON_KEY } });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.mocked, true);
    assert.equal(body.synthetic, true);
  });
} catch {
  process.exitCode = 1;
} finally {
  await db.end().catch(() => {});
  const checks = CHECKS.map(check => results.find(result => result.check === check) ?? { check, result: 'NOT_EXECUTED' });
  writeFileSync(outputPath, JSON.stringify({ synthetic: true, checks, complete: checks.every(r => r.result === 'PASS'), coreComplete: coreOnly && checks.filter(r => r.check !== 'edge-runtime-explicit-synthetic-mock').every(r => r.result === 'PASS'), businessApprovalCertified: false }, null, 2));
  // Entire disposable stack is deleted by the parent, including users/files.
}