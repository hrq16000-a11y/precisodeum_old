import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { CHECKS, cleanupOwned, executionId, failedMigration, ownedResource, ownedWorkspace, testOutcome } from '../../scripts/security/disposable-lifecycle.mjs';

function fixture() {
  const id = randomUUID();
  const workspace = ownedWorkspace(id);
  mkdirSync(workspace, { mode: 0o700 });
  writeFileSync(join(workspace, 'local-status.json'), 'synthetic-test-only', { mode: 0o600 });
  return { executionId: id, workspace, projectId: `preciso-${id}`, network: `preciso-isolated-${id}`, resources: ['workspace'] };
}

describe('current-run evidence and cleanup (adapter tests, not backend certification)', () => {
  it('allows unique run identifiers but rejects paths and other resource scopes', () => {
    expect(executionId('preciso-123-2')).toBe('preciso-123-2');
    expect(() => executionId('../another-project')).toThrow('INVALID_EXECUTION_ID');
    expect(ownedResource('supabase_db_preciso-run-1', 'preciso-run-1')).toBe(true);
    expect(ownedResource('supabase_db_preciso-run-10', 'preciso-run-1')).toBe(false);
    expect(ownedResource('unrelated_preciso-run-1', 'preciso-run-1')).toBe(false);
  });
  it('never turns skipped or partial checks into approved infrastructure', () => {
    expect(testOutcome().checks).toHaveLength(7);
    expect(testOutcome().result).toBe('NOT_EXECUTED');
    expect(testOutcome({ complete: true, checks: [{ check: CHECKS[0] ?? '', result: 'PASS' }] }).complete).toBe(false);
    expect(testOutcome({ complete: true, checks: CHECKS.map(check => ({ check, result: 'PASS' })) }).result).toBe('PASS');
  });
  it('keeps a failed test distinct from tests not executed', () => {
    const result = testOutcome({ complete: false, checks: [{ check: CHECKS[0] ?? '', result: 'FAIL' }] });
    expect(result.result).toBe('FAIL');
    expect(result.checks.filter(row => row.result === 'NOT_EXECUTED')).toHaveLength(6);
  });
  it('does not confuse the last announced migration with the failing migration', () => {
    expect(failedMigration('Applying migration 20261124010000_example.sql\nprivate row')).toBeNull();
    expect(failedMigration('Failed to apply migration 20261124010000_example.sql\nprivate row')).toBe('20261124010000_example.sql');
  });
  it('cleans partial resources and synthetic files after intermediate failure', async () => {
    const state = fixture();
    const resources = [`container:supabase_db_${state.projectId}`, `volume:supabase_db_${state.projectId}`, `network:${state.network}`];
    const removed: string[] = [];
    let stopped = false;
    const result = await cleanupOwned(state, {
      async inventory() { return resources.filter(resource => !removed.includes(resource)); },
      async remove(resource) { removed.push(resource); },
      async stopProcesses() { stopped = true; },
    });
    expect(result.result).toBe('PASS');
    expect(result.removed).toEqual(expect.arrayContaining(resources));
    expect(result.residual).toEqual([]);
    expect(existsSync(state.workspace)).toBe(false);
    expect(stopped).toBe(true);
  });
  it('fails closed when a resource survives deletion', async () => {
    const state = fixture();
    const resource = `volume:supabase_db_${state.projectId}`;
    const result = await cleanupOwned(state, { async inventory() { return [resource]; }, async remove() {}, async stopProcesses() {} });
    expect(result.result).toBe('FAIL');
    expect(result.residual).toEqual([resource]);
  });
  it('removes temporary credentials even when Docker inventory is unavailable', async () => {
    const state = fixture();
    const result = await cleanupOwned(state, { async inventory() { throw new Error('offline'); }, async remove() {}, async stopProcesses() {} });
    expect(existsSync(state.workspace)).toBe(false);
    expect(result.result).toBe('FAIL');
    expect(result.inventoriesComplete).toBe(false);
    expect(result.reasons).toContain('FINAL_DOCKER_INVENTORY_UNAVAILABLE');
  });
  it('does not certify abrupt termination without process verification', async () => {
    const state = fixture();
    const result = await cleanupOwned(state, { async inventory() { return []; }, async remove() {}, async stopProcesses() { throw new Error('not verified'); } });
    expect(result.result).toBe('FAIL');
    expect(result.reasons).toContain('PROCESS_TERMINATION_UNCONFIRMED');
  });
  it('supports an idempotent final always cleanup', async () => {
    const state = fixture();
    const adapter = { async inventory() { return []; }, async remove() {}, async stopProcesses() {} };
    expect((await cleanupOwned(state, adapter)).result).toBe('PASS');
    expect((await cleanupOwned(state, adapter)).result).toBe('PASS');
  });
  it('refuses an unrelated workspace before any deletion or Docker call', async () => {
    const state = fixture();
    let called = false;
    const adapter = { async inventory() { called = true; return []; }, async remove() {}, async stopProcesses() {} };
    const result = await cleanupOwned({ ...state, workspace: tmpdir() }, adapter);
    expect(result.result).toBe('NOT_VERIFIED');
    expect(result.reasons).toEqual(['INVALID_RESOURCE_SCOPE']);
    expect(called).toBe(false);
    expect(existsSync(state.workspace)).toBe(true);
    await cleanupOwned(state, adapter);
  });
  it('handles real SIGTERM during a mocked CLI start without approving integration', async () => {
    // Real process/signal/file lifecycle, fake Docker/CLI; never a business or Docker PASS.
    const id = `signal-test-${randomUUID()}`;
    const fakeBin = mkdtempSync(join(tmpdir(), 'preciso-mocked-tools-'));
    const reportDir = resolve('test-results/disposable-stack');
    const marker = join(ownedWorkspace(id), 'starting');
    const tool = (name: string, source: string) => writeFileSync(join(fakeBin, name), `#!${process.execPath}\n${source}`, { mode: 0o700 });
    tool('docker', `const a=process.argv.slice(2); if(a[0]==='info') console.log('0.0.0'); if(a[0]==='network'&&a[1]==='inspect') console.log('true');`);
    tool('psql', `console.log('psql (PostgreSQL) 15.0');`);
    tool('supabase', `const fs=require('node:fs'); const a=process.argv.slice(2); if(a[0]==='--version') console.log('2.121.0'); if(a[0]==='init'){fs.mkdirSync('supabase');fs.writeFileSync('supabase/config.toml','project_id = "mock"\\nmajor_version = 15\\n');} if(a[0]==='start'){fs.writeFileSync('starting','MOCK');setInterval(()=>{},1000);}`);
    const child = spawn(process.execPath, [resolve('scripts/security/disposable-stack.mjs'), '--candidate'], {
      env: { ...process.env, PATH: `${fakeBin}:${process.env['PATH'] ?? ''}`, GITHUB_STEP_SUMMARY: '', GITHUB_RUN_ID: '', GITHUB_RUN_ATTEMPT: '', DISPOSABLE_EXECUTION_ID: id, DISPOSABLE_SUPABASE_BIN: join(fakeBin, 'supabase') }, stdio: 'ignore',
    });
    const closed = new Promise<number | null>(done => child.on('close', code => done(code)));
    try {
      for (let i = 0; i < 150 && !existsSync(marker); i++) await new Promise(done => setTimeout(done, 20));
      expect(existsSync(marker)).toBe(true);
      child.kill('SIGTERM');
      expect(await closed).toBe(1);
      const report = JSON.parse(readFileSync(join(reportDir, `${id}-summary.json`), 'utf8')) as { decision: string; interruption: string; cleanup: { result: string }; baseline: { result: string }; candidateApplied: boolean };
      expect(report.interruption).toBe('SUPPORTED_SIGNAL');
      expect(report.decision).toBe('NO-GO');
      expect(report.baseline.result).toBe('NOT_EXECUTED');
      expect(report.candidateApplied).toBe(false);
      expect(report.cleanup.result).toBe('PASS');
      expect(existsSync(ownedWorkspace(id))).toBe(false);
    } finally {
      child.kill('SIGTERM');
      await closed;
      rmSync(fakeBin, { recursive: true, force: true });
      for (const kind of ['summary', 'state']) rmSync(join(reportDir, `${id}-${kind}.json`), { force: true });
    }
  }, 10000);
});