import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, GitBranch, RefreshCw, XCircle } from 'lucide-react';
import { getGithubSyncStatus } from '@/lib/github/syncStatus.functions';
import {
  GITHUB_REPO,
  classifyLocalCommits,
  homologationState,
  type LocalCommit,
} from '@/lib/github/syncStatus';

declare const __GIT_LOCAL_COMMITS__: LocalCommit[] | undefined;
const LOCAL_COMMITS: LocalCommit[] =
  typeof __GIT_LOCAL_COMMITS__ !== 'undefined' && Array.isArray(__GIT_LOCAL_COMMITS__) ? __GIT_LOCAL_COMMITS__ : [];

const fmt = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
};
const short = (sha: string) => sha.slice(0, 8);

const HOMOLOGATION_LABEL = {
  passed: { text: 'Aprovada', icon: CheckCircle2, variant: 'default' as const },
  failed: { text: 'Reprovada', icon: XCircle, variant: 'destructive' as const },
  running: { text: 'Em andamento', icon: Clock, variant: 'secondary' as const },
  not_run: { text: 'Não executada', icon: AlertTriangle, variant: 'outline' as const },
};

function CommitList({ items, empty }: { items: LocalCommit[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((c) => (
        <li key={c.sha} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
          <code className="font-mono text-xs text-muted-foreground">{short(c.sha)}</code>
          <span className="min-w-0 flex-1 break-words">{c.message || 'Sem descrição'}</span>
          <span className="text-xs text-muted-foreground">{fmt(c.date)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AdminGithubSyncPage() {
  const fetchStatus = useServerFn(getGithubSyncStatus);
  const q = useQuery({
    queryKey: ['admin-github-sync'],
    queryFn: () => fetchStatus(),
    refetchInterval: 120_000,
  });

  const data = q.data;
  const { sent, pending } = useMemo(
    () => classifyLocalCommits(LOCAL_COMMITS, data?.remoteShas ?? []),
    [data?.remoteShas],
  );
  const homolog = homologationState(data?.runs ?? []);
  const H = HOMOLOGATION_LABEL[homolog];
  const localHead = LOCAL_COMMITS[0];
  const inSync = !!localHead && !!data?.mainHead && pending.length === 0;

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Envio para o GitHub</h1>
            <p className="text-sm text-muted-foreground">
              Repositório <span className="font-mono">{GITHUB_REPO}</span> · ramo <span className="font-mono">main</span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} strokeWidth={1.75} />
            Atualizar
          </Button>
        </header>

        {q.isLoading ? (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))]">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : q.isError ? (
          <Card><CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.75} /> Não foi possível consultar o status agora.
          </CardContent></Card>
        ) : !data?.connected ? (
          <Card><CardContent className="p-4 text-sm">
            A conta do GitHub ainda não está ligada ao portal. Sem ela, esta tela não consegue ler o repositório.
          </CardContent></Card>
        ) : (
          <>
            {data.error && (
              <Card><CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" strokeWidth={1.75} /> O GitHub recusou a consulta ({data.error}). Os números abaixo podem estar incompletos.
              </CardContent></Card>
            )}
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))]">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Situação do envio</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {LOCAL_COMMITS.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Lista local indisponível nesta versão.</p>
                  ) : inSync ? (
                    <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-primary" strokeWidth={1.75} /> Tudo enviado</p>
                  ) : (
                    <p className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4 text-destructive" strokeWidth={1.75} /> {pending.length} pendente(s)</p>
                  )}
                  <p className="text-xs text-muted-foreground">Consultado em {fmt(data.checkedAt)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Última versão no GitHub</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p className="font-mono">{data.mainHead ? short(data.mainHead.sha) : '—'}</p>
                  <p className="break-words text-muted-foreground">{data.mainHead?.message}</p>
                  <p className="text-xs text-muted-foreground">{fmt(data.mainHead?.date ?? '')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Homologação descartável</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  <Badge variant={H.variant} className="gap-1"><H.icon className="h-3.5 w-3.5" strokeWidth={1.75} />{H.text}</Badge>
                  <p className="text-xs text-muted-foreground">
                    {homolog === 'passed' ? 'Release pode seguir para publicação, com autorização.' : 'Publicação bloqueada até a última execução passar.'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Falta enviar ({pending.length})</CardTitle></CardHeader>
              <CardContent><CommitList items={pending} empty="Nenhuma alteração pendente." /></CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Já enviado ({sent.length})</CardTitle></CardHeader>
              <CardContent><CommitList items={sent} empty="Nenhuma alteração recente confirmada no GitHub." /></CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Automações recentes no GitHub</CardTitle></CardHeader>
              <CardContent>
                {data.runs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma execução encontrada.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.runs.slice(0, 15).map((r) => (
                      <li key={r.url} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                        <Badge variant={r.status !== 'completed' ? 'secondary' : r.conclusion === 'success' ? 'default' : 'destructive'}>
                          {r.status !== 'completed' ? 'Em andamento' : r.conclusion === 'success' ? 'Passou' : 'Falhou'}
                        </Badge>
                        <span className="min-w-0 flex-1 break-words">{r.name}</span>
                        <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                          <GitBranch className="h-3.5 w-3.5" strokeWidth={1.75} />{r.branch} · {short(r.sha)}
                        </span>
                        <span className="text-xs text-muted-foreground">{fmt(r.createdAt)}</span>
                        {r.url.startsWith('https://github.com/') && (
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-primary" aria-label={`Abrir ${r.name} no GitHub`}>
                            <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
