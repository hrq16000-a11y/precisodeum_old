/**
 * visibilityPerfReport — mini relatório de desempenho (somente DEV) do tempo
 * gasto dentro de `measureVisibility`, agregado por rota.
 *
 * Uso:
 *   recordVisibilitySample('ProviderProfile', durationMs)
 *   printVisibilityPerfReport()            // console.table manual
 *   window.__visibilityPerf.report()       // no console do navegador
 *
 * Mantemos uma janela deslizante das últimas N amostras por rota para calcular
 * média, p95 e pico sem crescer memória indefinidamente.
 */

const MAX_SAMPLES_PER_ROUTE = 500;

export interface VisibilityRouteStats {
  route: string;
  samples: number;
  avgMs: number;
  p95Ms: number;
  peakMs: number;
  lastMs: number;
}

interface RouteBucket {
  durations: number[];
  peak: number;
  last: number;
  total: number;
  count: number;
}

const buckets = new Map<string, RouteBucket>();

const isDev = (): boolean => Boolean(import.meta.env?.DEV);

const round = (value: number) => Number(value.toFixed(3));

/** Percentil por interpolação-nearest-rank sobre a janela ordenada. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  const index = Math.min(sorted.length - 1, Math.max(0, rank));
  return sorted[index];
}

/** Registra uma amostra de duração (ms) para a rota informada. */
export function recordVisibilitySample(route: string, durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  let bucket = buckets.get(route);
  if (!bucket) {
    bucket = { durations: [], peak: 0, last: 0, total: 0, count: 0 };
    buckets.set(route, bucket);
  }
  bucket.durations.push(durationMs);
  if (bucket.durations.length > MAX_SAMPLES_PER_ROUTE) bucket.durations.shift();
  bucket.peak = Math.max(bucket.peak, durationMs);
  bucket.last = durationMs;
  bucket.total += durationMs;
  bucket.count += 1;
}

/** Estatísticas agregadas por rota (ordenadas por p95 desc). */
export function getVisibilityPerfStats(): VisibilityRouteStats[] {
  const rows: VisibilityRouteStats[] = [];
  buckets.forEach((bucket, route) => {
    const sorted = [...bucket.durations].sort((a, b) => a - b);
    rows.push({
      route,
      samples: bucket.count,
      avgMs: round(bucket.count === 0 ? 0 : bucket.total / bucket.count),
      p95Ms: round(percentile(sorted, 95)),
      peakMs: round(bucket.peak),
      lastMs: round(bucket.last),
    });
  });
  return rows.sort((a, b) => b.p95Ms - a.p95Ms);
}

/** Imprime o relatório com console.table. No-op fora de DEV. */
export function printVisibilityPerfReport(force = false): VisibilityRouteStats[] {
  const rows = getVisibilityPerfStats();
  if (!force && !isDev()) return rows;
  if (rows.length === 0) return rows;
  // eslint-disable-next-line no-console
  console.groupCollapsed?.('[perf] measureVisibility por rota (média / p95 / pico)');
  // eslint-disable-next-line no-console
  console.table(rows);
  // eslint-disable-next-line no-console
  console.groupEnd?.();
  return rows;
}

/** Limpa todas as amostras (usado em testes e no console). */
export function resetVisibilityPerfReport(): void {
  buckets.clear();
}

if (typeof window !== 'undefined' && isDev()) {
  (window as unknown as Record<string, unknown>).__visibilityPerf = {
    report: () => printVisibilityPerfReport(true),
    stats: getVisibilityPerfStats,
    reset: resetVisibilityPerfReport,
  };
}
