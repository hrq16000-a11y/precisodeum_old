import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { assertLoopback, isolatedEnvironment, migrationHint } from './disposable-guards.mjs';

const root = resolve(import.meta.dirname, '../..');
const reportDir = join(root, 'test-results/disposable-stack');
mkdirSync(reportDir, { recursive: true });
const report = { synthetic: true, productionTouched: false, candidateApplied: false, stages: [], decision: 'NO-GO' };
const workspace = mkdtempSync(join(tmpdir(), 'preciso-disposable-'));
const env = isolatedEnvironment(process.env);
// Never use a saved Docker context or remote daemon to run destructive checks.
env.DOCKER_HOST = 'unix:///var/run/docker.sock';
const cli = process.env['DISPOSABLE_SUPABASE_BIN'] || 'supabase';
const network = `preciso-isolated-${crypto.randomUUID()}`;
let networkCreated = false;
let started = false;
let phase = 'infrastructure';
function run(binary, args, options = {}) {
  const result = spawnSync(binary, args, { cwd: workspace, env, encoding: 'utf8', timeout: 600_000, maxBuffer: 16 * 1024 * 1024, ...options });
  if (result.status !== 0) {
    report.stages.push({ stage: phase, result: 'FAIL', migration: migrationHint(`${result.stdout ?? ''}\n${result.stderr ?? ''}`) });
    throw new Error('STAGE_FAILED');
  }
  return result.stdout;
}
function cliRun(args) { return run(cli, [...args, '--workdir', workspace, '--network-id', network]); }
try {
  // Do not install Docker here or try a remote daemon. Fail once, reproducibly.
  run('docker', ['info', '--format', '{{.ServerVersion}}']);
  // Containers cannot call scheduled webhooks or external notification services.
  // Docker image downloads happen on the host, not through this internal network.
  run('docker', ['network', 'create', '--internal', network]);
  networkCreated = true;
  report.stages.push({ stage: phase, result: 'PASS' });
  phase = 'prepare';
  cliRun(['init']);
  const configPath = join(workspace, 'supabase/config.toml');
  let config = readFileSync(configPath, 'utf8');
  config = config.replace(/^project_id\s*=.*$/m, 'project_id = "preciso-disposable-2a"');
  // Match the repository database version, without touching its managed config.
  config = config.replace(/^major_version\s*=.*$/m, 'major_version = 15');
  config += '\n[functions.runtime-probe]\nverify_jwt = false\n';
  writeFileSync(configPath, config);
  cpSync(join(root, 'supabase/migrations'), join(workspace, 'supabase/migrations'), { recursive: true });
  cpSync(join(root, 'supabase/seed.sql'), join(workspace, 'supabase/seed.sql'));
  cpSync(join(root, 'tests/security/disposable/functions'), join(workspace, 'supabase/functions'), { recursive: true });
  report.stages.push({ stage: phase, result: 'PASS' });
  phase = 'migration-replay-and-seed';
  started = true;
  // Start a fresh project; CLI replays the entire history and configured seed.
  cliRun(['start']);
  report.stages.push({ stage: phase, result: 'PASS' });
  phase = 'local-target';
  const status = JSON.parse(cliRun(['status', '-o', 'json']));
  assertLoopback(status.API_URL);
  assertLoopback(status.DB_URL, ['postgresql:', 'postgres:']);
  if (!status.ANON_KEY || !status.SERVICE_ROLE_KEY) throw new Error('MISSING_LOCAL_KEYS');
  const statusPath = join(workspace, 'local-status.json');
  writeFileSync(statusPath, JSON.stringify(status), { mode: 0o600 });
  report.stages.push({ stage: phase, result: 'PASS' });
  phase = 'baseline-integration';
  run(process.execPath, [join(root, 'tests/security/disposable/verify-stack.mjs'), statusPath, join(reportDir, 'baseline.json')]);
  report.stages.push({ stage: phase, result: 'PASS' });
  if (process.argv.includes('--candidate')) {
    phase = 'local-candidate';
    // Explicit loopback URL; no PG* inherited from the connected production DB.
    run('psql', [status.DB_URL, '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-f', join(root, 'docs/security/local-fixes/related-flows.sql')]);
    report.candidateApplied = true;
    report.stages.push({ stage: phase, result: 'PASS' });
    phase = 'candidate-integration';
    run(process.execPath, [join(root, 'tests/security/disposable/verify-stack.mjs'), statusPath, join(reportDir, 'candidate.json')]);
    report.stages.push({ stage: phase, result: 'PASS' });
  }
  report.decision = 'GO-INFRASTRUCTURE-ONLY';
} catch {
  if (!report.stages.some(s => s.stage === phase && s.result === 'FAIL')) {
    report.stages.push({ stage: phase, result: 'FAIL', migration: null });
  }
  process.exitCode = 1;
} finally {
  if (started) {
    phase = 'cleanup';
    try { cliRun(['stop', '--no-backup']); report.stages.push({ stage: phase, result: 'PASS' }); }
    catch { report.decision = 'NO-GO'; process.exitCode = 1; }
  }
  if (networkCreated) {
    phase = 'network-cleanup';
    try { run('docker', ['network', 'rm', network]); report.stages.push({ stage: phase, result: 'PASS' }); }
    catch { report.decision = 'NO-GO'; process.exitCode = 1; }
  }
  rmSync(workspace, { recursive: true, force: true });
  writeFileSync(join(reportDir, 'summary.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}