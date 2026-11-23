import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

type Click = { provider_id: string | null; category_slug: string | null; contact_type: string | null };
type Prov = { id: string; business_name: string | null; city: string | null; neighborhood: string | null; slug: string | null; category_id: string | null };
type Bucket = { key: string; total: number };

export function bucketize<T>(items: T[], pick: (t: T) => string | null | undefined): Bucket[] {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = (pick(it) || '').trim() || 'Não informado';
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].map(([key, total]) => ({ key, total })).sort((a, b) => b.total - a.total);
}

function ChartCard({ title, data }: { title: string; data: Bucket[] }) {
  const top = data.slice(0, 10);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem cliques no período.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="key" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" name="Cliques" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAdClicksPage() {
  const [days, setDays] = useState('30');
  const [clicks, setClicks] = useState<Click[]>([]);
  const [provs, setProvs] = useState<Map<string, Prov>>(new Map());
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - Number(days) * 86400000).toISOString();
      const { data, error } = await supabase
        .from('contact_clicks')
        .select('provider_id, category_slug, contact_type')
        .gte('created_at', since)
        .limit(10000);
      if (error) { toast.error('Erro ao carregar cliques: ' + error.message); setLoading(false); return; }
      const list = (data || []) as Click[];
      const ids = [...new Set(list.map((c) => c.provider_id).filter(Boolean))] as string[];
      const map = new Map<string, Prov>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data: p } = await supabase.from('providers').select('id, business_name, city, neighborhood, slug, category_id').in('id', ids.slice(i, i + 200));
        (p || []).forEach((x: any) => map.set(x.id, x));
      }
      const catIds = [...new Set([...map.values()].map((p) => p.category_id).filter(Boolean))] as string[];
      const cm = new Map<string, string>();
      if (catIds.length) {
        const { data: cs } = await supabase.from('categories').select('id, name').in('id', catIds);
        (cs || []).forEach((c: any) => cm.set(c.id, c.name));
      }
      setCats(cm);
      setClicks(list);
      setProvs(map);
      setLoading(false);
    })();
  }, [days]);

  const byCity = useMemo(() => bucketize(clicks, (c) => provs.get(c.provider_id || '')?.city), [clicks, provs]);
  const byHood = useMemo(() => bucketize(clicks, (c) => provs.get(c.provider_id || '')?.neighborhood), [clicks, provs]);
  const byCat = useMemo(() => bucketize(clicks, (c) => c.category_slug || cats.get(provs.get(c.provider_id || '')?.category_id || '')), [clicks, provs, cats]);
  const topProv = useMemo(() => bucketize(clicks, (c) => c.provider_id).filter((b) => b.key !== 'Não informado').slice(0, 15), [clicks]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Cliques nos anúncios</h1>
            <p className="text-sm text-muted-foreground">{clicks.length} cliques (WhatsApp, telefone e perfil) no período.</p>
          </div>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40" aria-label="Período"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {loading ? (
          <div className="grid gap-3 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72" />)}</div>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-3">
              <ChartCard title="Por cidade" data={byCity} />
              <ChartCard title="Por bairro" data={byHood} />
              <ChartCard title="Por categoria" data={byCat} />
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Profissionais mais visitados</CardTitle></CardHeader>
              <CardContent>
                {topProv.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  <ol className="divide-y">
                    {topProv.map((b, i) => {
                      const p = provs.get(b.key);
                      return (
                        <li key={b.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                          <span className="min-w-0">
                            <span className="mr-2 text-muted-foreground">{i + 1}.</span>
                            {p?.slug ? (
                              <a href={`/profissional/${p.slug}`} target="_blank" rel="noreferrer" className="font-medium hover:underline">{p.business_name || 'Sem nome'}</a>
                            ) : (
                              <span className="font-medium">{p?.business_name || 'Profissional removido'}</span>
                            )}
                            <span className="ml-2 text-xs text-muted-foreground">{[p?.neighborhood, p?.city].filter(Boolean).join(' · ')}</span>
                          </span>
                          <span className="font-semibold tabular-nums">{b.total}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
