/**
 * Métricas orgânicas do Google Search Console agregadas por cidade.
 *
 * Lê Search Analytics (dimensão `page`) via connector-gateway e agrupa por
 * slug de cidade presente na URL. Somente administradores.
 *
 * Observação: a API do Search Console NÃO expõe backlinks. Por isso este
 * endpoint devolve apenas cliques, impressões, CTR e posição média.
 */
import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const GATEWAY = 'https://connector-gateway.lovable.dev/google_search_console';

export interface GscCityRow {
  city_slug: string;
  city: string;
  pages: number;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number | null;
}

export interface GscCityResult {
  connected: boolean;
  error?: string;
  rows: GscCityRow[];
  /** A API do Search Console não fornece backlinks. */
  backlinks_supported: false;
}

export const slugifyCity = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Extrai o slug de cidade de uma URL de página programática. */
export function cityFromUrl(pageUrl: string, knownCities: Set<string>): string | null {
  let path = pageUrl;
  try {
    path = new URL(pageUrl).pathname;
  } catch {
    /* já é path */
  }
  const parts = path
    .split('/')
    .filter(Boolean)
    .map((p) => {
      try {
        return slugifyCity(decodeURIComponent(p));
      } catch {
        return slugifyCity(p);
      }
    });
  const emIdx = parts.indexOf('em');
  if (emIdx >= 0 && parts[emIdx + 1] && knownCities.has(parts[emIdx + 1])) return parts[emIdx + 1];
  for (let i = parts.length - 1; i >= 0; i--) {
    if (knownCities.has(parts[i])) return parts[i];
  }
  return null;
}

export const getGscCityMetrics = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days?: number; site?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<GscCityResult> => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    } as never);
    if (!isAdmin) throw new Error('Forbidden');

    const lovableKey = process.env['LOVABLE_API_KEY'];
    const gscKey = process.env['GOOGLE_SEARCH_CONSOLE_API_KEY'];
    if (!lovableKey || !gscKey) {
      return { connected: false, error: 'missing_credentials', rows: [], backlinks_supported: false };
    }

    const site = data.site || 'sc-domain:precisodeum.com.br';
    const days = Math.min(Math.max(data.days ?? 28, 1), 90);
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    // Cidades conhecidas (profissionais aprovados) para casar com a URL.
    const { data: provRows } = await supabase
      .from('providers')
      .select('city')
      .eq('status', 'approved')
      .not('city', 'is', null)
      .limit(5000);

    const cityLabelBySlug = new Map<string, string>();
    for (const r of (provRows ?? []) as Array<{ city: string | null }>) {
      const label = (r.city ?? '').trim();
      if (!label) continue;
      cityLabelBySlug.set(slugifyCity(label), label);
    }
    const knownCities = new Set(cityLabelBySlug.keys());

    let payload: { rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; position?: number }> } = {};
    try {
      const res = await fetch(
        `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            'X-Connection-Api-Key': gscKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: iso(start),
            endDate: iso(end),
            dimensions: ['page'],
            rowLimit: 5000,
          }),
        },
      );
      if (!res.ok) {
        return { connected: true, error: `gsc_${res.status}`, rows: [], backlinks_supported: false };
      }
      payload = (await res.json()) as typeof payload;
    } catch {
      return { connected: true, error: 'gsc_unreachable', rows: [], backlinks_supported: false };
    }

    const acc = new Map<
      string,
      { clicks: number; impressions: number; posSum: number; posW: number; pages: number }
    >();
    for (const row of payload.rows ?? []) {
      const page = row.keys?.[0] ?? '';
      const slug = cityFromUrl(page, knownCities);
      if (!slug) continue;
      const cur = acc.get(slug) ?? { clicks: 0, impressions: 0, posSum: 0, posW: 0, pages: 0 };
      const imp = Number(row.impressions ?? 0);
      cur.clicks += Number(row.clicks ?? 0);
      cur.impressions += imp;
      cur.posSum += Number(row.position ?? 0) * imp;
      cur.posW += imp;
      cur.pages += 1;
      acc.set(slug, cur);
    }

    const rows: GscCityRow[] = Array.from(acc.entries())
      .map(([slug, r]) => ({
        city_slug: slug,
        city: cityLabelBySlug.get(slug) ?? slug,
        pages: r.pages,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.impressions > 0 ? Math.round((r.clicks / r.impressions) * 1000) / 10 : 0,
        position: r.posW > 0 ? Math.round((r.posSum / r.posW) * 10) / 10 : null,
      }))
      .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);

    return { connected: true, rows, backlinks_supported: false };
  });
