/**
 * AdminSignupFunnelStepsPage
 * --------------------------
 * Funil de cadastro por etapa: quantas pessoas entraram, quantas concluíram
 * e onde elas travam (drop-off). Fonte: RPC `admin_signup_funnel_steps`
 * (agrega `onboarding_events`, admin-only).
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { useSeoHead } from '@/hooks/useSeoHead';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface StepRow {
  phase: string;
  entered: number;
  completed: number;
  errors: number;
  drop_off: number;
  drop_pct: number;
}

const PERIODS = [7, 14, 30] as const;

/** Acima disso a etapa é destacada como gargalo. Exportado para teste. */
export const DROP_ALERT_PCT = 40;

export function isBottleneck(row: Pick<StepRow, 'entered' | 'drop_pct'>): boolean {
  return row.entered >= 10 && row.drop_pct >= DROP_ALERT_PCT;
}

const AdminSignupFunnelStepsPage = () => {
  useSeoHead({ title: 'Funil de cadastro por etapa', noindex: true });
  const [days, setDays] = useState<number>(14);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-signup-funnel-steps', days],
    queryFn: async (): Promise<StepRow[]> => {
      const { data, error } = await supabase.rpc('admin_signup_funnel_steps' as never, {
        _days: days,
      } as never);
      if (error) throw error;
      return (data as unknown as StepRow[]) ?? [];
    },
    refetchInterval: 120_000,
  });

  const rows = data ?? [];
  const worst = useMemo(() => rows.filter(isBottleneck).slice(0, 3), [rows]);
  const maxEntered = useMemo(() => Math.max(1, ...rows.map((r) => r.entered)), [rows]);

  const exportCsv = () => {
    const header = 'etapa;entraram;concluiram;erros;abandono;abandono_pct';
    const body = rows
      .map((r) => [r.phase, r.entered, r.completed, r.errors, r.drop_off, r.drop_pct].join(';'))
      .join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `funil-cadastro-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Funil de cadastro</h1>
          <p className="text-sm text-muted-foreground">
            Quantas pessoas entraram em cada etapa, quantas concluíram e onde elas desistem.
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

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Button key={p} size="sm" variant={days === p ? 'default' : 'outline'} onClick={() => setDays(p)}>
            {p} dias
          </Button>
        ))}
      </div>

      {worst.length > 0 && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
            <span className="font-medium">Etapas onde mais gente trava:</span>
            {worst.map((r) => (
              <Badge key={r.phase} variant="destructive">
                {r.phase} · {r.drop_pct}%
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-md" />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Sem registros de cadastro nesse período.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead className="text-right">Entraram</TableHead>
                  <TableHead className="text-right">Concluíram</TableHead>
                  <TableHead className="text-right">Abandono</TableHead>
                  <TableHead className="text-right">Erros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.phase} className={isBottleneck(r) ? 'bg-destructive/5' : undefined}>
                    <TableCell className="font-medium">{r.phase}</TableCell>
                    <TableCell>
                      <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.round((r.entered / maxEntered) * 100)}%` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.entered}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.completed}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.drop_off} <span className="text-muted-foreground">({r.drop_pct}%)</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.errors}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminSignupFunnelStepsPage;
