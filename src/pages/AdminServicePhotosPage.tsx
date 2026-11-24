import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type Row = {
  id: string;
  image_url: string;
  is_cover: boolean | null;
  display_order: number | null;
  service_id: string;
  service_name: string;
  provider_name: string;
  provider_status: string;
  city: string;
  neighborhood: string;
  deleted: boolean;
};

const ALL = '__all__';

export function isPubliclyListed(r: Pick<Row, 'provider_status' | 'deleted' | 'image_url'>) {
  return r.provider_status === 'approved' && !r.deleted && !!r.image_url;
}

async function downloadImage(url: string, name: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const a = document.createElement('a');
    const obj = URL.createObjectURL(blob);
    a.href = obj;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 30_000);
  } catch {
    toast.error('Não foi possível baixar esta foto (arquivo indisponível).');
  }
}

export default function AdminServicePhotosPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState(ALL);
  const [hood, setHood] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [q, setQ] = useState('');
  const [broken, setBroken] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_images')
        .select('id, image_url, is_cover, display_order, service_id, services!inner(service_name, deleted_at, providers!inner(business_name, status, city, neighborhood))')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) {
        toast.error('Erro ao carregar fotos: ' + error.message);
        setLoading(false);
        return;
      }
      setRows(
        (data as any[]).map((d) => ({
          id: d.id,
          image_url: d.image_url,
          is_cover: d.is_cover,
          display_order: d.display_order,
          service_id: d.service_id,
          service_name: d.services?.service_name ?? '',
          provider_name: d.services?.providers?.business_name ?? '',
          provider_status: d.services?.providers?.status ?? '',
          city: (d.services?.providers?.city ?? '').trim() || 'Sem cidade',
          neighborhood: (d.services?.providers?.neighborhood ?? '').trim() || 'Sem bairro',
          deleted: !!d.services?.deleted_at,
        })),
      );
      setLoading(false);
    })();
  }, []);

  const cities = useMemo(() => Array.from(new Set(rows.map((r) => r.city))).sort(), [rows]);
  const hoods = useMemo(
    () => Array.from(new Set(rows.filter((r) => city === ALL || r.city === city).map((r) => r.neighborhood))).sort(),
    [rows, city],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (city !== ALL && r.city !== city) return false;
      if (hood !== ALL && r.neighborhood !== hood) return false;
      const pub = isPubliclyListed(r) && !broken.has(r.id);
      if (status === 'public' && !pub) return false;
      if (status === 'hidden' && pub) return false;
      if (term && !`${r.service_name} ${r.provider_name}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [rows, city, hood, status, q, broken]);

  const exportCsv = () => {
    const head = 'cidade,bairro,profissional,servico,publica,url';
    const body = filtered.map((r) =>
      [r.city, r.neighborhood, r.provider_name, r.service_name, isPubliclyListed(r) && !broken.has(r.id) ? 'sim' : 'nao', r.image_url]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([[head, ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'fotos-servicos.csv';
    a.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Fotos dos serviços</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} de {rows.length} fotos · confira se cada uma aparece na lista pública.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="mr-1.5 h-4 w-4" /> Baixar lista (CSV)
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={city} onValueChange={(v) => { setCity(v); setHood(ALL); }}>
            <SelectTrigger aria-label="Cidade"><SelectValue placeholder="Cidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as cidades</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={hood} onValueChange={setHood}>
            <SelectTrigger aria-label="Bairro"><SelectValue placeholder="Bairro" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os bairros</SelectItem>
              {hoods.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Situação"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as situações</SelectItem>
              <SelectItem value="public">Aparece na lista pública</SelectItem>
              <SelectItem value="hidden">Não aparece / com problema</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Buscar serviço ou profissional" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {loading ? (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))]">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">Nenhuma foto encontrada com esses filtros.</p>
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))]">
            {filtered.map((r) => {
              const pub = isPubliclyListed(r) && !broken.has(r.id);
              return (
                <Card key={r.id} className="overflow-hidden">
                  <div className="aspect-[4/3] bg-muted">
                    <img
                      src={r.image_url}
                      alt={r.service_name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={() => setBroken((s) => new Set(s).add(r.id))}
                    />
                  </div>
                  <CardContent className="space-y-1.5 p-3 text-sm">
                    <p className="font-semibold leading-tight">{r.service_name || 'Sem nome'}</p>
                    <p className="text-muted-foreground">{r.provider_name}</p>
                    <p className="text-xs text-muted-foreground">{r.neighborhood} · {r.city}</p>
                    <div className="flex flex-wrap gap-1">
                      {pub ? (
                        <Badge variant="secondary"><CheckCircle2 className="mr-1 h-3 w-3" />Pública</Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {broken.has(r.id) ? 'Arquivo quebrado' : r.deleted ? 'Serviço removido' : 'Profissional não aprovado'}
                        </Badge>
                      )}
                      {r.is_cover && <Badge variant="outline">Capa</Badge>}
                    </div>
                    <div className="flex gap-1 pt-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => downloadImage(r.image_url, `${r.service_id}-${r.id}.jpg`)}>
                        <Download className="mr-1 h-3.5 w-3.5" /> Baixar
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`/servico-detalhe/${r.service_id}`} target="_blank" rel="noreferrer" aria-label="Abrir anúncio público">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
