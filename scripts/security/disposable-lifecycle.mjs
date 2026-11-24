// Host-only CI tooling; reports never include command output or local credentials.
import { existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

export const CHECKS = ['postgres-real-schema-rls-rpc-audit', 'auth-real-users-and-password-sessions', 'profile-persistence-read-back-through-data-api', 'rls-other-user-cannot-write-profile', 'rpc-real-jwt-role-distinction', 'storage-private-upload-read-and-anonymous-denial', 'edge-runtime-explicit-synthetic-mock'];
export function executionId(value) {
  if (!/^[a-z0-9-]{1,90}$/.test(value)) throw new Error('INVALID_EXECUTION_ID');
  return value;
}
export function ownedWorkspace(id) {
  return join(tmpdir(), `preciso-disposable-${executionId(id)}`);
}
export function ownedResource(name, projectId) {
  return name.startsWith('supabase_') && name.endsWith(`_${executionId(projectId)}`);
}
export function testOutcome(evidence) {
  const checks = CHECKS.map(check => ({ check, result: evidence?.checks?.find(row => row.check === check)?.result ?? 'NOT_EXECUTED' }));
  const complete = evidence?.complete === true && checks.every(row => row.result === 'PASS');
  return { result: complete ? 'PASS' : checks.some(row => row.result === 'FAIL') ? 'FAIL' : 'NOT_EXECUTED', complete, checks };
}
export function failedMigration(output) {
  return [...output.matchAll(/(?:Failed to apply migration|Error applying migration)\s+([0-9]{14}_[a-zA-Z0-9_-]+\.sql)/gi)].at(-1)?.[1] ?? null;
}

// Adapter permits targeted failure tests without pretending a Docker mock is integration.
export async function cleanupOwned(state, adapter) {
  const result = { result: 'NOT_VERIFIED', created: state.resources ?? [], removed: [], residual: [], reasons: [], inventoriesComplete: false };
  const expected = ownedWorkspace(state.executionId);
  if (resolve(state.workspace) !== expected || state.projectId !== `preciso-${state.executionId}` || state.network !== `preciso-isolated-${state.executionId}`) {
    result.reasons.push('INVALID_RESOURCE_SCOPE');
    return result;
  }
  let before;
  try {
    await adapter.stopProcesses();
    result.removed.push(...(state.resources ?? []).filter(resource => resource.startsWith('process:')));
  }
  catch { result.reasons.push('PROCESS_TERMINATION_UNCONFIRMED'); }
  try { before = await adapter.inventory(state); }
  catch { result.reasons.push('DOCKER_INVENTORY_UNAVAILABLE'); }
  if (before) {
    result.created = [...new Set([...result.created, ...before])];
    for (const resource of before) {
      try { await adapter.remove(resource, state); }
      catch { result.reasons.push('RESOURCE_REMOVAL_FAILED'); }
    }
  }
  try {
    rmSync(expected, { recursive: true, force: true });
    if (existsSync(expected)) result.residual.push('workspace');
    else result.removed.push(...(state.resources ?? []).filter(resource => ['workspace', 'temporary-config', 'synthetic-credentials'].includes(resource)));
  } catch { result.reasons.push('WORKSPACE_REMOVAL_FAILED'); result.residual.push('workspace'); }
  try {
    const after = await adapter.inventory(state);
    result.residual.push(...after);
    result.inventoriesComplete = Boolean(before);
    result.removed.push(...(before ?? []).filter(resource => !after.includes(resource)));
  } catch { result.reasons.push('FINAL_DOCKER_INVENTORY_UNAVAILABLE'); }
  result.result = result.inventoriesComplete && result.residual.length === 0 && result.reasons.length === 0 ? 'PASS' : 'FAIL';
  return result;
}

export function stepSummary(report) {
  // All interpolated values are enums, numeric timing, or validated identifiers.
  return `## Disposable backend — ${report.decision}\n\n` +
    `Commit: \`${report.commitSha ?? 'UNAVAILABLE'}\`\n\n` +
    `Duration: ${report.durationMs} ms; baseline: ${report.baseline.result}; candidate SQL: ${report.candidateSql}; candidate checks: ${report.candidate.result}; cleanup: ${report.cleanup.result}.\n\n` +
    '| Stage | Result |\n| --- | --- |\n' + report.stages.map(row => `| ${row.stage} | ${row.result} |`).join('\n') +
    '\n\nInfrastructure only; business approval and production release are NOT certified.\n';
}