/**
 * AdminProviderPerformancePage
 * ----------------------------
 * Leads, visitas e cliques em WhatsApp por profissional e por cidade.
 * Fonte única: RPC `admin_provider_city_performance` (admin-only).
 * A aba "Por cidade" agrega os mesmos dados e cruza com o tráfego orgânico
 * do Google Search Console (`getGscCityMetrics`).
 * Tempo real: Realtime em `leads` e `contact_clicks` invalida a query.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Activity, Download, MessageCircle, RefreshCw, Users } from 'lucide-react';
import { useSeoHead } from '@/hooks/useSeoHead';
import { supabase } from '@/integrations/supabase/client';
import { getGscCityMetrics, slugifyCity, type GscCityRow } from '@/lib/seo/gscCityMetrics.functions';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PerfRow {
  provider_id: string;
  provider_name: string;
  city: string;
  state: string;
  leads: number;
  views: number;
  whatsapp_clicks: number;
  profile_clicks: number;
}

interface CityRow {
  city: string;
  city_slug: string;
  state: string;
  providers: number;
  leads: number;
  views: number;
  whatsapp_clicks: number;
  profile_clicks: number;
}

const PERIODS = [7, 30, 90] as const;

/** Conversão de visitas → contato (%). Exportada para teste. */
export function contactRate(row: Pick<PerfRow, 'views' | 'whatsapp_clicks' | 'leads'>): number {
  const views = row.views || 0;
  if (views <= 0) return 0;
  return Math.round((((row.whatsapp_clicks || 0) + (row.leads || 0)) / views) * 1000) / 10;
}

/** Agrega o desempenho por cidade. Exportada para teste. */
export function aggregateByCity(rows: PerfRow[]): CityRow[] {
  const map = new Map<string, CityRow>();
  for (const r of rows) {
    const label = (r.city || '').trim() || 'Sem cidade';
    const slug = slugifyCity(label);
    const cur =
      map.get(slug) ??
      {
        city: label,
        city_slug: slug,
        state: r.state || '',
        providers: 0,
        leads: 0,
        views: 0,
        whatsapp_clicks: 0,
        profile_clicks: 0,
      };
    cur.providers += 1;
    cur.leads += r.leads || 0;
    cur.views += r.views || 0;
    cur.whatsapp_clicks += r.whatsapp_clicks || 0;
    cur.profile_clicks += r.profile_clicks || 0;
    map.set(slug, cur);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.leads - a.leads || b.whatsapp_clicks - a.whatsapp_clicks || b.views - a.views,
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return (
    <Card className="motion-enter">
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value.toLocaleString('pt-BR')}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const AdminProviderPerformancePage = () => {
  useSeoHead({
    title: 'Desempenho por profissional e cidade',
    description: 'Painel interno de leads, visitas e cliques por profissional e cidade.',
    noindex: true,
  });
  const qc = useQueryClient();
  const [days, setDays] = useState<number>(30);
  const [city, setCity] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'profissionais' | 'cidades'>('profissionais');
  const fetchGsc = useServerFn(getGscCityMetrics);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-provider-performance', days, city],
    queryFn: async (): Promise<PerfRow[]> => {
      const { data, error } = await supabase.rpc('admin_provider_city_performance' as never, {
        _days: days,
        _city: city.trim() ? `%${city.trim()}%` : null,
      } as never);
      if (error) throw error;
      return (data as unknown as PerfRow[]) ?? [];
    },
    refetchInterval: 60_000,
  });

  const gsc = useQuery({
    queryKey: ['admin-gsc-city-metrics', days],
    queryFn: () => fetchGsc({ data: { days } }),
    enabled: tab === 'cidades',
    staleTime: 10 * 60_000,
  });

  // Tempo real: qualquer lead ou clique novo revalida a tabela (debounce 1.5s).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void qc.invalidateQueries({ queryKey: ['admin-provider-performance'] });
      }, 1500);
    };
    const channel = supabase
      .channel('admin-provider-performance')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, bump)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_clicks' }, bump)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = data ?? [];
    if (!term) return list;
    return list.filter(
      (r) =>
        r.provider_name.toLowerCase().includes(term) ||
        (r.city || '').toLowerCase().includes(term),
    );
  }, [data, search]);

  const cityRows = useMemo(() => aggregateByCity(rows), [rows]);
  const gscBySlug = useMemo(() => {
    const map = new Map<string, GscCityRow>();
    for (const r of gsc.data?.rows ?? []) map.set(r.city_slug, r);
    return map;
  }, [gsc.data]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          leads: acc.leads + (r.leads || 0),
          views: acc.views + (r.views || 0),
          whats: acc.whats + (r.whatsapp_clicks || 0),
        }),
        { leads: 0, views: 0, whats: 0 },
      ),
    [rows],
  );

  const downloadCsv = (header: string, body: string, name: string) => {
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    if (tab === 'cidades') {
      downloadCsv(
        'cidade;uf;profissionais;leads;visitas;cliques_whatsapp;organico_cliques;organico_impressoes;ctr_pct;posicao_media',
        cityRows
          .map((r) => {
            const g = gscBySlug.get(r.city_slug);
            return [
              r.city,
              r.state,
              r.providers,
              r.leads,
              r.views,
              r.whatsapp_clicks,
              g?.clicks ?? '',
              g?.impressions ?? '',
              g?.ctr ?? '',
              g?.position ?? '',
            ].join(';');
          })
          .join('\n'),
        `desempenho-cidades-${days}d.csv`,
      );
      return;
    }
    downloadCsv(
      'profissional;cidade;uf;leads;visitas;cliques_whatsapp;cliques_perfil;taxa_contato_pct',
      rows
        .map((r) =>
          [
            r.provider_name.replace(/;/g, ','),
            r.city,
            r.state,
            r.leads,
            r.views,
            r.whatsapp_clicks,
            r.profile_clicks,
            contactRate(r),
          ].join(';'),
        )
        .join('\n'),
      `desempenho-profissionais-${days}d.csv`,
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Desempenho por profissional e cidade</h1>
          <p className="text-sm text-muted-foreground">
            Leads recebidos, visitas ao card e cliques em WhatsApp. Atualiza sozinho quando chega algo novo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && <Badge variant="secondary">atualizando…</Badge>}
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="mr-1.5 h-4 w-4" aria-hidden /> CSV
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={days === p ? 'default' : 'outline'}
            onClick={() => setDays(p)}
          >
            {p} dias
          </Button>
        ))}
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Filtrar por cidade (banco)"
          className="h-9 w-56"
          aria-label="Filtrar por cidade"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar nome ou cidade"
          className="h-9 w-56"
          aria-label="Buscar profissional"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Leads" value={totals.leads} icon={Users} />
        <Kpi label="Visitas" value={totals.views} icon={Activity} />
        <Kpi label="Cliques em WhatsApp" value={totals.whats} icon={MessageCircle} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="profissionais">Por profissional</TabsTrigger>
          <TabsTrigger value="cidades">Por cidade</TabsTrigger>
        </TabsList>

        <TabsContent value="profissionais">
          {isLoading ? (
            <Skeleton className="h-96 w-full rounded-md" />
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Nenhum movimento registrado nesse período.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Visitas</TableHead>
                      <TableHead className="text-right">WhatsApp</TableHead>
                      <TableHead className="text-right">Perfil</TableHead>
                      <TableHead className="text-right">Contato %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.provider_id}>
                        <TableCell className="font-medium">{r.provider_name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.city || '—'}
                          {r.state ? ` • ${r.state}` : ''}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{r.leads}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.views}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.whatsapp_clicks}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.profile_clicks}</TableCell>
                        <TableCell className="text-right tabular-nums">{contactRate(r)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cidades" className="space-y-3">
          {gsc.data && !gsc.data.connected && (
            <Card className="border-amber-500/40">
              <CardContent className="p-4 text-sm text-muted-foreground">
                Busca do Google ainda não conectada — as colunas de tráfego orgânico ficam vazias.
              </CardContent>
            </Card>
          )}
          <p className="text-xs text-muted-foreground">
            Tráfego orgânico vem da Busca do Google (cliques, aparições, posição média). Número de
            links de outros sites não é fornecido por essa fonte.
          </p>
          {isLoading ? (
            <Skeleton className="h-96 w-full rounded-md" />
          ) : cityRows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Nenhuma cidade com movimento nesse período.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cidade</TableHead>
                      <TableHead className="text-right">Profissionais</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Visitas</TableHead>
                      <TableHead className="text-right">WhatsApp</TableHead>
                      <TableHead className="text-right">Buscas: cliques</TableHead>
                      <TableHead className="text-right">Aparições</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Posição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cityRows.map((r) => {
                      const g = gscBySlug.get(r.city_slug);
                      return (
                        <TableRow key={r.city_slug}>
                          <TableCell className="font-medium">
                            {r.city}
                            {r.state ? <span className="text-muted-foreground"> • {r.state}</span> : null}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{r.providers}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.leads}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.views}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.whatsapp_clicks}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {gsc.isLoading ? '…' : (g?.clicks ?? '—')}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {gsc.isLoading ? '…' : (g?.impressions ?? '—')}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {g ? `${g.ctr}%` : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{g?.position ?? '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminProviderPerformancePage;
