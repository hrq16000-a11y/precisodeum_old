import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordVisibilitySample,
  getVisibilityPerfStats,
  printVisibilityPerfReport,
  resetVisibilityPerfReport,
  percentile,
} from '@/lib/dev/visibilityPerfReport';

describe('visibilityPerfReport', () => {
  beforeEach(() => resetVisibilityPerfReport());

  it('calcula média, p95 e pico por rota', () => {
    for (let i = 1; i <= 100; i += 1) recordVisibilitySample('ProviderProfile', i);
    const [row] = getVisibilityPerfStats();
    expect(row.route).toBe('ProviderProfile');
    expect(row.samples).toBe(100);
    expect(row.avgMs).toBeCloseTo(50.5, 3);
    expect(row.p95Ms).toBe(95);
    expect(row.peakMs).toBe(100);
    expect(row.lastMs).toBe(100);
  });

  it('ignora valores inválidos', () => {
    recordVisibilitySample('X', Number.NaN);
    recordVisibilitySample('X', -1);
    expect(getVisibilityPerfStats()).toHaveLength(0);
  });

  it('percentile lida com listas curtas', () => {
    expect(percentile([], 95)).toBe(0);
    expect(percentile([7], 95)).toBe(7);
  });

  it('imprime console.table quando forçado', () => {
    const spy = vi.spyOn(console, 'table').mockImplementation(() => {});
    recordVisibilitySample('ProviderProfile', 2);
    printVisibilityPerfReport(true);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('ordena rotas por p95 desc', () => {
    recordVisibilitySample('A', 1);
    recordVisibilitySample('B', 50);
    expect(getVisibilityPerfStats().map((r) => r.route)).toEqual(['B', 'A']);
  });
});
