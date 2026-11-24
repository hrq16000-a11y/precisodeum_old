import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { assertLoopback, isolatedEnvironment, migrationHint } from './disposable-guards.mjs';
import { commandDiagnostic } from './disposable-diagnostics.mjs';
import { cleanupOwned, executionId, failedMigration, ownedResource, ownedWorkspace, stepSummary, testOutcome } from './disposable-lifecycle.mjs';

const root = resolve(import.meta.dirname, '../..');
const reportDir = join(root, 'test-results/disposable-stack');
mkdirSync(reportDir, { recursive: true });
const cleanupOnly = process.argv.includes('--cleanup');
const id = executionId(process.env['DISPOSABLE_EXECUTION_ID'] || crypto.randomUUID());
const manifestPath = join(reportDir, `${id}-state.json`);
const summaryPath = join(reportDir, `${id}-summary.json`);
const env = isolatedEnvironment(process.env);
env.DOCKER_HOST = 'unix:///var/run/docker.sock';
const cli = process.env['DISPOSABLE_SUPABASE_BIN'] || 'supabase';
const startedAt = new Date();
const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, env, encoding: 'utf8' });
const sha = git.stdout?.trim();
const initial = {
  executionId: id, workspace: ownedWorkspace(id), projectId: `preciso-${id}`, network: `preciso-isolated-${id}`, resources: [], processes: [],
};
const state = cleanupOnly && existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : initial;
const report = cleanupOnly && existsSync(summaryPath) ? JSON.parse(readFileSync(summaryPath, 'utf8')) : {
  executionId: id, commitSha: /^[a-f0-9]{40}$/.test(sha ?? '') ? sha : null,
  workflow: '.github/workflows/disposable-stack.yml',
  workflowRunId: /^\d+$/.test(process.env['GITHUB_RUN_ID'] ?? '') ? process.env['GITHUB_RUN_ID'] : null,
  workflowRunAttempt: /^\d+$/.test(process.env['GITHUB_RUN_ATTEMPT'] ?? '') ? process.env['GITHUB_RUN_ATTEMPT'] : null,
  startedAt: startedAt.toISOString(), finishedAt: null, durationMs: 0,
  tools: { node: process.version, docker: null, supabase: null, psql: null }, missingDependencies: [],
  synthetic: true, productionTouched: false, businessApprovalCertified: false, candidateApplied: false,
  baseline: testOutcome(), candidate: testOutcome(), candidateSql: 'NOT_EXECUTED',
  lastMigrationAnnounced: null, failedMigration: null, commandFailures: [], stages: [], decision: 'NO-GO', cleanup: { result: 'NOT_VERIFIED' },
};
let phase = 'docker';
let interrupted = false;
const active = new Set();
function persist() { writeFileSync(manifestPath, JSON.stringify(state, null, 2), { mode: 0o600 }); }
function signal() {
  interrupted = true;
  report.interruption = 'SUPPORTED_SIGNAL';
  for (const child of active) { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
}
process.on('SIGTERM', signal);
process.on('SIGINT', signal);
async function command(binary, args, { record = true } = {}) {
  if (interrupted && record) throw new Error('INTERRUPTED');
  return await new Promise((accept, reject) => {
    const child = spawn(binary, args, { cwd: state.workspace && existsSync(state.workspace) ? state.workspace : root, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    active.add(child);
    if (child.pid) {
      state.processes.push(child.pid);
      if (record) state.resources.push(`process:${child.pid}`);
      if (!cleanupOnly) persist();
    }
    let stdout = '';
    let stderr = '';
    // Bounded, in-memory only: output may include local secrets and is never emitted.
    child.stdout.on('data', chunk => { stdout = (stdout + chunk.toString()).slice(-8 * 1024 * 1024); });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-8 * 1024 * 1024); });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, 600_000);
    let missing = false;
    child.on('error', error => { missing = error.code === 'ENOENT'; });
    child.on('close', (code, signal) => {
      clearTimeout(timer); active.delete(child);
      if (record) {
        const output = `${stdout}\n${stderr}`;
        report.lastMigrationAnnounced = migrationHint(output) ?? report.lastMigrationAnnounced;
        report.failedMigration = failedMigration(output) ?? report.failedMigration;
        if (code !== 0 || interrupted) {
          const diagnostic = commandDiagnostic(output, { code, signal, timedOut, missing });
          (report.commandFailures ??= []).push({ stage: phase, tool: binary === cli ? 'supabase-cli' : binary === 'docker' ? 'docker' : binary === 'psql' ? 'psql' : 'node', ...diagnostic });
        }
        if (missing && ['docker', 'psql', cli].includes(binary)) report.missingDependencies.push(binary === cli ? 'supabase-cli' : binary);
      }
      if (code !== 0 || (interrupted && record)) reject(new Error('COMMAND_FAILED'));
      else accept(stdout);
    });
  });
}
async function stage(name, action) {
  phase = name;
  try { await action(); report.stages.push({ stage: name, result: 'PASS' }); }
  catch { report.stages.push({ stage: name, result: 'FAIL' }); throw new Error('STAGE_FAILED'); }
}
function cliRun(args) { return command(cli, [...args, '--workdir', state.workspace, '--network-id', state.network]); }
async function inventory() {
  const resources = [];
  const containers = await command('docker', ['ps', '-a', '--format', '{{.Names}}'], { record: false });
  for (const name of containers.trim().split('\n').filter(name => ownedResource(name, state.projectId))) resources.push(`container:${name}`);
  const volumes = await command('docker', ['volume', 'ls', '--format', '{{.Name}}'], { record: false });
  for (const name of volumes.trim().split('\n').filter(name => ownedResource(name, state.projectId))) resources.push(`volume:${name}`);
  const networks = await command('docker', ['network', 'ls', '--format', '{{.Name}}'], { record: false });
  if (networks.trim().split('\n').includes(state.network)) resources.push(`network:${state.network}`);
  return resources;
}
async function cleanup() {
  if (cleanupOnly && !existsSync(manifestPath)) {
    return { result: 'NOT_VERIFIED', created: [], removed: [], residual: [], reasons: ['NO_CURRENT_RUN_MANIFEST'], inventoriesComplete: false };
  }
  return await cleanupOwned(state, {
    inventory,
    async remove(resource) {
      const [kind, name] = resource.split(':');
      if (kind === 'network' && name === state.network) await command('docker', ['network', 'rm', name], { record: false });
      else if (ownedResource(name, state.projectId) && kind === 'container') await command('docker', ['rm', '-f', name], { record: false });
      else if (ownedResource(name, state.projectId) && kind === 'volume') await command('docker', ['volume', 'rm', name], { record: false });
      else throw new Error('INVALID_RESOURCE_SCOPE');
    },
    async stopProcesses() {
      for (const pid of state.processes) {
        if (!Number.isInteger(pid) || pid <= 1 || pid === process.pid) throw new Error('INVALID_PROCESS');
        // A reused PID from another project must never be killed.
        let cwd;
        try { cwd = readlinkSync(`/proc/${pid}/cwd`); } catch { continue; }
        if (cwd !== state.workspace) continue;
        try { process.kill(-pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
        for (let i = 0; i < 50 && existsSync(`/proc/${pid}`); i++) await new Promise(done => setTimeout(done, 20));
        if (existsSync(`/proc/${pid}`)) throw new Error('PROCESS_REMAINS');
      }
    },
  });
}
try {
  if (!cleanupOnly) {
    mkdirSync(state.workspace, { mode: 0o700 });
    state.resources.push('workspace');
    persist();
    await stage('docker', async () => {
      const version = (await command('docker', ['info', '--format', '{{.ServerVersion}}'])).trim();
      report.tools.docker = /^[0-9][0-9a-zA-Z.+-]{0,60}$/.test(version) ? version : 'AVAILABLE';
    });
    await stage('network-isolation', async () => {
      await command('docker', ['network', 'create', '--internal', state.network]);
      state.resources.push(`network:${state.network}`); persist();
      const internal = await command('docker', ['network', 'inspect', state.network, '--format', '{{.Internal}}']);
      if (internal.trim() !== 'true') throw new Error('NETWORK_NOT_INTERNAL');
    });
    await stage('prepare', async () => {
      const cliVersion = (await command(cli, ['--version'])).trim();
      report.tools.supabase = /^\d+\.\d+\.\d+$/.test(cliVersion) ? cliVersion : 'AVAILABLE';
      const pgVersion = (await command('psql', ['--version'])).match(/\d+\.\d+(?:\.\d+)?/);
      report.tools.psql = pgVersion?.[0] ?? 'AVAILABLE';
      await cliRun(['init']);
      const configPath = join(state.workspace, 'supabase/config.toml');
      let config = readFileSync(configPath, 'utf8');
      config = config.replace(/^project_id\s*=.*$/m, `project_id = "${state.projectId}"`);
      config = config.replace(/^major_version\s*=.*$/m, 'major_version = 15');
      config += '\n[functions.runtime-probe]\nverify_jwt = false\n';
      writeFileSync(configPath, config, { mode: 0o600 });
      state.resources.push('temporary-config'); persist();
      cpSync(join(root, 'supabase/migrations'), join(state.workspace, 'supabase/migrations'), { recursive: true });
      cpSync(join(root, 'supabase/seed.sql'), join(state.workspace, 'supabase/seed.sql'));
      cpSync(join(root, 'tests/security/disposable/functions'), join(state.workspace, 'supabase/functions'), { recursive: true });
    });
    await stage('migration-replay-and-seed', async () => { await cliRun(['start']); });
    let statusPath;
    let status;
    await stage('local-target', async () => {
      status = JSON.parse(await cliRun(['status', '-o', 'json']));
      assertLoopback(status.API_URL); assertLoopback(status.DB_URL, ['postgresql:', 'postgres:']);
      if (!status.ANON_KEY || !status.SERVICE_ROLE_KEY) throw new Error('MISSING_LOCAL_KEYS');
      statusPath = join(state.workspace, 'local-status.json');
      writeFileSync(statusPath, JSON.stringify(status), { mode: 0o600 });
      state.resources.push('synthetic-credentials'); persist();
    });
    async function verify(kind) {
      const outputPath = join(reportDir, `${id}-${kind}.json`);
      try { await command(process.execPath, [join(root, 'tests/security/disposable/verify-stack.mjs'), statusPath, outputPath]); }
      finally { report[kind] = testOutcome(existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, 'utf8')) : undefined); }
      if (!report[kind].complete) throw new Error('INCOMPLETE_EVIDENCE');
    }
    await stage('baseline-integration', () => verify('baseline'));
    if (process.argv.includes('--candidate')) {
      await stage('local-candidate', async () => {
        report.candidateSql = 'FAIL';
        await command('psql', [status.DB_URL, '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-f', join(root, 'docs/security/local-fixes/related-flows.sql')]);
        report.candidateApplied = true; report.candidateSql = 'PASS';
      });
      await stage('candidate-integration', () => verify('candidate'));
    }
    report.decision = 'GO-INFRASTRUCTURE-ONLY';
  }
} catch {
  process.exitCode = 1; report.decision = 'NO-GO';
} finally {
  const previousCleanup = report.cleanup;
  report.cleanup = await cleanup();
  report.cleanup.created = [...new Set([...(previousCleanup.created ?? []), ...report.cleanup.created])];
  report.cleanup.removed = [...new Set([...(previousCleanup.removed ?? []), ...report.cleanup.removed])];
  report.cleanupAttempts = [...(report.cleanupAttempts ?? []), { at: new Date().toISOString(), result: report.cleanup.result, reasons: report.cleanup.reasons }];
  if (interrupted || report.cleanup.result !== 'PASS') { report.decision = 'NO-GO'; process.exitCode = 1; }
  report.finishedAt = new Date().toISOString();
  report.durationMs = Date.parse(report.finishedAt) - Date.parse(report.startedAt);
  for (const name of ['docker', 'network-isolation', 'prepare', 'migration-replay-and-seed', 'local-target', 'baseline-integration', 'local-candidate', 'candidate-integration']) {
    if (!report.stages.some(row => row.stage === name)) report.stages.push({ stage: name, result: 'NOT_EXECUTED' });
  }
  report.tests = {
    passed: [...report.baseline.checks, ...report.candidate.checks].filter(row => row.result === 'PASS').length,
    failed: [...report.baseline.checks, ...report.candidate.checks].filter(row => row.result === 'FAIL').length,
    notExecuted: [...report.baseline.checks, ...report.candidate.checks].filter(row => row.result === 'NOT_EXECUTED').length,
  };
  writeFileSync(summaryPath, JSON.stringify(report, null, 2));
  if (process.env['GITHUB_STEP_SUMMARY']) appendFileSync(process.env['GITHUB_STEP_SUMMARY'], stepSummary(report));
  console.log(JSON.stringify(report, null, 2));
}
