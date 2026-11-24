import { describe, expect, it } from 'vitest';
import { classifyLocalCommits, homologationState, type WorkflowRunSummary } from '@/lib/github/syncStatus';

const sha = (c: string) => c.repeat(40);
const run = (over: Partial<WorkflowRunSummary>): WorkflowRunSummary => ({
  name: 'Disposable backend integration', path: '.github/workflows/disposable-stack.yml',
  branch: 'main', sha: sha('a'), status: 'completed', conclusion: 'success',
  createdAt: '2026-11-24T07:00:00Z', url: '', ...over,
});

describe('classifyLocalCommits', () => {
  it('marca como pendente todo commit local ausente do GitHub', () => {
    const local = [sha('a'), sha('b'), sha('c')].map((s) => ({ sha: s, message: '', date: '' }));
    const { sent, pending } = classifyLocalCommits(local, [sha('b')]);
    expect(sent.map((c) => c.sha)).toEqual([sha('b')]);
    expect(pending.map((c) => c.sha)).toEqual([sha('a'), sha('c')]);
  });
});

describe('homologationState', () => {
  it('sem execução do workflow descartável não libera a release', () => {
    expect(homologationState([run({ path: '.github/workflows/other.yml' })])).toBe('not_run');
  });
  it('última execução com falha bloqueia mesmo com sucesso anterior', () => {
    expect(homologationState([
      run({ createdAt: '2026-11-24T06:00:00Z', conclusion: 'success' }),
      run({ createdAt: '2026-11-24T07:00:00Z', conclusion: 'failure' }),
    ])).toBe('failed');
  });
  it('execução em andamento não conta como aprovada', () => {
    expect(homologationState([run({ status: 'in_progress', conclusion: null })])).toBe('running');
  });
  it('só a última execução concluída com sucesso na versão candidata aprova', () => {
    expect(homologationState([run({ conclusion: 'success' })], sha('a'))).toBe('passed');
  });
  it('sucesso em outra versão (ex.: ramo de teste) não aprova a versão candidata', () => {
    expect(homologationState([run({ conclusion: 'success', sha: sha('b') })], sha('a'))).toBe('outdated');
  });
});
