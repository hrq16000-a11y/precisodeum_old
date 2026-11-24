/**
 * Regras puras da tela /admin/github-sync: o que já está no GitHub, o que
 * falta enviar e se a homologação descartável liberou a release.
 */
export const GITHUB_REPO = 'hrq16000-a11y/precisodeum_old';
export const HOMOLOGATION_WORKFLOW_PATH = '.github/workflows/disposable-stack.yml';

export interface LocalCommit {
  sha: string;
  message: string;
  date: string;
}

export interface WorkflowRunSummary {
  name: string;
  path: string;
  branch: string;
  sha: string;
  status: string;
  conclusion: string | null;
  createdAt: string;
  url: string;
}

export function isFullSha(sha: string): boolean {
  return /^[0-9a-f]{40}$/.test(sha);
}

/** Separa commits locais em enviados (presentes no GitHub) e pendentes. */
export function classifyLocalCommits(local: LocalCommit[], remoteShas: Iterable<string>) {
  const remote = new Set(remoteShas);
  const sent: LocalCommit[] = [];
  const pending: LocalCommit[] = [];
  for (const c of local) (remote.has(c.sha) ? sent : pending).push(c);
  return { sent, pending };
}

export type HomologationState = 'passed' | 'failed' | 'running' | 'not_run';

/**
 * A homologação só conta como aprovada quando a execução MAIS RECENTE do
 * workflow descartável terminou com sucesso. Falha, cancelamento ou ausência
 * de execução nunca liberam a publicação.
 */
export function homologationState(runs: WorkflowRunSummary[]): HomologationState {
  const latest = runs
    .filter((r) => r.path === HOMOLOGATION_WORKFLOW_PATH)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!latest) return 'not_run';
  if (latest.status !== 'completed') return 'running';
  return latest.conclusion === 'success' ? 'passed' : 'failed';
}
