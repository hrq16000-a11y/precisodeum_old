import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { GITHUB_REPO, HOMOLOGATION_WORKFLOW_PATH, isFullSha, type WorkflowRunSummary } from './syncStatus';

const GATEWAY = 'https://connector-gateway.lovable.dev/github';

export interface GithubSyncResult {
  connected: boolean;
  error?: string;
  repo: string;
  mainHead: { sha: string; message: string; date: string } | null;
  remoteShas: string[];
  runs: WorkflowRunSummary[];
  checkedAt: string;
}

type GhCommit = { sha: string; commit?: { message?: string; committer?: { date?: string } } };
type GhRun = {
  name?: string; path?: string; head_branch?: string; head_sha?: string;
  status?: string; conclusion?: string | null; created_at?: string; html_url?: string;
};

export const getGithubSyncStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GithubSyncResult> => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' } as never);
    if (!isAdmin) throw new Error('Forbidden');

    const base: GithubSyncResult = {
      connected: false, repo: GITHUB_REPO, mainHead: null, remoteShas: [], runs: [],
      checkedAt: new Date().toISOString(),
    };
    const lovableKey = process.env['LOVABLE_API_KEY'];
    const ghKey = process.env['GITHUB_API_KEY'];
    if (!lovableKey || !ghKey) return { ...base, error: 'missing_credentials' };

    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': ghKey,
    };
    const get = async <T,>(path: string): Promise<T> => {
      const res = await fetch(`${GATEWAY}/${path}`, { headers });
      if (!res.ok) {
        const body = await res.text();
        console.error(`GitHub request failed [${res.status}]: ${body.slice(0, 300)}`);
        throw new Error(`github_${res.status}`);
      }
      return (await res.json()) as T;
    };

    try {
      const workflowFile = HOMOLOGATION_WORKFLOW_PATH.split('/').pop();
      const [commits, runsPayload, homologPayload] = await Promise.all([
        get<GhCommit[]>(`repos/${GITHUB_REPO}/commits?sha=main&per_page=100`),
        get<{ workflow_runs?: GhRun[] }>(`repos/${GITHUB_REPO}/actions/runs?per_page=30`),
        // Consulta dedicada: a homologação nunca some da janela por excesso de outras automações.
        get<{ workflow_runs?: GhRun[] }>(`repos/${GITHUB_REPO}/actions/workflows/${workflowFile}/runs?per_page=10`),
      ]);
      const seen = new Set<string>();
      const allRuns = [...(homologPayload.workflow_runs ?? []), ...(runsPayload.workflow_runs ?? [])].filter((r) => {
        const k = r.html_url ?? '';
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      const head = commits[0];
      return {
        ...base,
        connected: true,
        mainHead: head
          ? {
              sha: head.sha,
              message: (head.commit?.message ?? '').split('\n')[0]!.slice(0, 160),
              date: head.commit?.committer?.date ?? '',
            }
          : null,
        remoteShas: commits.map((c) => c.sha).filter(isFullSha),
        runs: allRuns.map((r) => ({
          name: r.name ?? '',
          path: r.path ?? '',
          branch: r.head_branch ?? '',
          sha: r.head_sha ?? '',
          status: r.status ?? '',
          conclusion: r.conclusion ?? null,
          createdAt: r.created_at ?? '',
          url: r.html_url ?? '',
        })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      };
    } catch (e) {
      return { ...base, connected: true, error: e instanceof Error ? e.message : 'github_unreachable' };
    }
  });
