import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Loader2, RefreshCw } from "lucide-react";

type HealthResult = {
  ok: boolean;
  checked_at: string;
  rpcs: { name: string; ok: boolean }[];
  columns: { table: string; column: string; ok: boolean }[];
};

interface Props {
  alwaysShow?: boolean;
  onHealthChange?: (ok: boolean) => void;
  /** Background re-run interval in ms. Default: 5 minutes. Set 0 to disable. */
  intervalMs?: number;
}

const STORAGE_LAST_LOG = "health_check_last_logged_at";
const LOG_THROTTLE_MS = 10 * 60 * 1000; // log to DB at most every 10 min per tab

/**
 * Runs validate_db_health on mount, then periodically (every 5 min by default).
 * Records each result into health_check_history (throttled to avoid spam).
 * Surfaces a red alert if any RPC/column is missing.
 */
export function DashboardHealthCheck({
  alwaysShow = false,
  onHealthChange,
  intervalMs = 5 * 60 * 1000,
}: Props) {
  const [result, setResult] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const lastLoggedRef = useRef<number>(0);
  // Track previous OK state so we can detect recovery transitions
  // (failure → success) and persist a "recovered" event in history.
  const previousOkRef = useRef<boolean | null>(null);
  const runningRef = useRef(false);

  const persistResult = async (r: HealthResult, recovered: boolean) => {
      const now = Date.now();
      const last = lastLoggedRef.current;
      // Always log when status changes (failure or recovery), otherwise throttle
      const shouldLog = previousOkRef.current === null || r.ok === false || recovered || (now - last) > LOG_THROTTLE_MS;
      if (!shouldLog) return;
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Não foi possível identificar o autor do registro de saúde.');
      const failedRpcs = r.rpcs.filter((x) => !x.ok).map((x) => x.name);
      const failedColumns = r.columns.filter((x) => !x.ok)
        .map((x) => ({ table: x.table, column: x.column }));
      const { error } = await supabase.from("health_check_history" as never).insert({
        user_id: user?.id ?? null,
        source: recovered ? "dashboard:recovered" : "dashboard",
        ok: r.ok,
        failed_rpcs: failedRpcs,
        failed_columns: failedColumns,
        raw: { ...(r as unknown as Record<string, unknown>), recovered } as Record<string, unknown>,
      } as never);
      if (error) throw new Error('Não foi possível gravar o histórico de saúde. A recuperação não está confirmada.');
      lastLoggedRef.current = now;
    try {
      sessionStorage.setItem(STORAGE_LAST_LOG, String(now));
    } catch (e) {
      // The database write already succeeded; local cache failure is not a failed audit.
      console.warn("[DashboardHealthCheck] local throttle cache unavailable:", e);
    }
  };

  const run = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setLoading(true);
    // Mantém o último resultado visível durante re-checagens periódicas
    // para não exibir o aviso de carregamento a cada 5 minutos.
    try {
      const { data, error } = await supabase.rpc("validate_db_health" as never);
      if (error) throw error;
      const r = data as unknown as HealthResult;
      if (!r || typeof r.ok !== 'boolean' || !Array.isArray(r.rpcs) || !Array.isArray(r.columns)) {
        throw new Error('A verificação de saúde retornou dados incompletos.');
      }
      const wasFailing = previousOkRef.current === false;
      const recovered = wasFailing && r.ok === true;
      await persistResult(r, recovered);
      setErr(null);
      setResult(r);
      previousOkRef.current = r.ok;
      onHealthChange?.(r.ok);
      if (recovered) {
        toast.success("Banco recuperado", {
          description: "As funções e colunas críticas estão presentes novamente. As ações ainda precisam de verificação.",
          duration: 5000,
        });
      }
    } catch (e: any) {
      // PostgrestError não é `instanceof Error` — extrair campos manualmente
      // para não acabar exibindo "[object Object]".
      const parts = [
        e?.message,
        e?.details,
        e?.hint,
        e?.code ? `(code: ${e.code})` : null,
      ].filter(Boolean);
      const msg = parts.length
        ? parts.join(' · ')
        : (typeof e === 'string' ? e : JSON.stringify(e));
      console.error('[DashboardHealthCheck] validate_db_health failed:', e);
      setResult(null);
      setErr(msg);
      onHealthChange?.(false);
    } finally {
      runningRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    void run();
    if (intervalMs <= 0) return;
    const id = window.setInterval(() => void run(), intervalMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  if (loading && !result) {
    return (
      <Alert className="mb-3">
        <Loader2 className="size-4 animate-spin" />
        <AlertTitle>Verificando integridade do banco...</AlertTitle>
      </Alert>
    );
  }

  if (err) {
    return (
      <Alert variant="destructive" className="mb-3">
        <AlertTriangle className="size-4" />
        <AlertTitle>Não foi possível validar a saúde do banco</AlertTitle>
        <AlertDescription className="space-y-2">
          <p className="text-xs">{err}</p>
          <Button size="sm" variant="outline" onClick={run}>
            <RefreshCw className="size-3 mr-1" /> Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!result) return null;

  if (result.ok) {
    if (!alwaysShow) return null;
    return (
      <Alert className="mb-3 border-green-500/40">
        <CheckCircle2 className="size-4 text-green-600" />
        <AlertTitle className="text-sm">
          Estrutura verificada — funções e colunas presentes
        </AlertTitle>
      </Alert>
    );
  }

  const badRpcs = result.rpcs.filter((r) => !r.ok);
  const badCols = result.columns.filter((c) => !c.ok);

  return (
    <Alert variant="destructive" className="mb-3">
      <AlertTriangle className="size-4" />
      <AlertTitle>Inconsistência detectada — algumas ações estão bloqueadas</AlertTitle>
      <AlertDescription className="space-y-2">
        {badRpcs.length > 0 && (
          <div className="text-xs">
            <strong>RPCs ausentes:</strong>{" "}
            {badRpcs.map((r) => r.name).join(", ")}
          </div>
        )}
        {badCols.length > 0 && (
          <div className="text-xs">
            <strong>Colunas ausentes:</strong>{" "}
            {badCols.map((c) => `${c.table}.${c.column}`).join(", ")}
          </div>
        )}
        <p className="text-[11px] opacity-80">
          Rode a última migração ou contate o administrador antes de prosseguir.
        </p>
        <Button size="sm" variant="outline" onClick={run}>
          <RefreshCw className="size-3 mr-1" /> Revalidar
        </Button>
      </AlertDescription>
    </Alert>
  );
}
