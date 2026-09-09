import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, TrendingUp, ArrowRight, MapPin, Shield, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from '@/lib/router-compat';

const RankingAlertWidget = () => {
  const { provider, profile } = useAuth();
  const [currentPos, setCurrentPos] = useState<number | null>(null);
  const [previousPos, setPreviousPos] = useState<number | null>(null);
  const [totalInCity, setTotalInCity] = useState(0);
  const [categoryPos, setCategoryPos] = useState<number | null>(null);
  const [totalInCategory, setTotalInCategory] = useState(0);
  const [topCompetitorName, setTopCompetitorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!provider?.id || !provider?.city) { setLoading(false); return; }

    (async () => {
      // Ranking calculado por RPC SECURITY DEFINER (`get_local_ranking`).
      // O embed antigo `profiles!inner(...)` não existe como FK → 400 PGRST200.
      const { data, error } = await (supabase as any).rpc('get_local_ranking', {
        _city: provider.city,
        _category_id: provider.category_id ?? null,
      });
      if (error) { setLoading(false); return; }
      const row = Array.isArray(data) ? data[0] : data;

      const total = row?.total_in_city ?? 0;
      const pos = (row?.ahead_in_city ?? 0) + 1;

      setTotalInCity(total);
      setCurrentPos(pos);

      if (provider.category_id) {
        setTotalInCategory(row?.total_in_category ?? 0);
        setCategoryPos((row?.ahead_in_category ?? 0) + 1);
        setTopCompetitorName(row?.top_competitor ?? null);
      }


      // Store previous in localStorage for real tracking
      const storageKey = `ranking_${provider.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreviousPos(parsed.pos);
      }
      localStorage.setItem(storageKey, JSON.stringify({ pos, ts: Date.now() }));

      setLoading(false);
    })();
  }, [provider?.id, provider?.city, provider?.category_id, profile?.engagement_points]);

  if (loading || currentPos === null || !provider?.city) return null;

  const diff = previousPos !== null ? currentPos - previousPos : 0;
  const dropped = diff > 0;
  const improved = diff < 0;
  const isTop5 = currentPos <= 5;

  // Only show alert if position dropped or user is outside top 5
  if (isTop5 && !dropped) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 sm:p-5 relative overflow-hidden ${
        dropped
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-amber-500/30 bg-amber-500/5'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          dropped ? 'bg-destructive/15' : 'bg-amber-500/15'
        }`}>
          {dropped ? (
            <TrendingDown className="h-5 w-5 text-destructive" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          )}
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">
            {dropped ? '⚠️ Posição em queda!' : '📊 Monitor de Ranking'}
          </h3>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {provider.city}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-center">
          <span className={`text-2xl font-black ${dropped ? 'text-destructive' : 'text-amber-600'}`}>
            #{currentPos}
          </span>
          <p className="text-[10px] text-muted-foreground">de {totalInCity}</p>
        </div>

        {categoryPos !== null && totalInCategory > 1 && (
          <div className="text-center border-l border-border pl-3">
            <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
              <Target className="h-3 w-3 text-accent" />
              #{categoryPos}
            </div>
            <p className="text-[10px] text-muted-foreground">na categoria</p>
          </div>
        )}

        {dropped && (
          <div className="flex items-center gap-1 text-destructive text-xs font-semibold ml-auto">
            <TrendingDown className="h-3.5 w-3.5" />
            Caiu {diff} posição{diff > 1 ? 'ões' : ''}
          </div>
        )}
      </div>

      {topCompetitorName && categoryPos && categoryPos > 1 && (
        <p className="mt-2 text-[11px] text-destructive/80 font-medium">
          ⚠️ <strong>{topCompetitorName}</strong> está à sua frente na categoria!
        </p>
      )}

      <p className="mt-1.5 text-xs text-muted-foreground">
        {dropped
          ? 'Outros profissionais cadastraram mais serviços e subiram no ranking. Reaja agora!'
          : 'Cadastre mais serviços e complete seu perfil para subir no ranking da sua cidade.'
        }
      </p>

      <Link
        to="/dashboard/servicos"
        className={`mt-3 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${
          dropped
            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            : 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25'
        }`}
      >
        <Shield className="h-3.5 w-3.5" />
        {dropped ? 'Recuperar Topo' : 'Subir no Ranking'}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </motion.div>
  );
};

export default RankingAlertWidget;
