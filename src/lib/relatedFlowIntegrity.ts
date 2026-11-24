/** A successful read must contain detail for exactly the current summary. */
import { SELF_SERVICE_FIELDS } from '@/lib/sponsorSelfService';

export function sponsorApprovalBlock(changes: unknown): string | null {
  if (typeof changes !== 'object' || changes === null || Array.isArray(changes) || !Object.keys(changes).length)
    return 'Nenhuma alteração válida para aprovar.';
  if ('renewal_requested' in changes)
    return 'Renovação deve ser tratada no faturamento. Esta solicitação permanece pendente.';
  if (Object.entries(changes).some(([key, value]) =>
    !SELF_SERVICE_FIELDS.some((field) => field === key) || typeof value !== 'string'))
    return 'A solicitação contém alterações não permitidas e não pode ser aprovada.';
  return null;
}

export function isAuditComplete(
  summary: readonly { table_name: string }[],
  detail: readonly { table_name: string }[],
): boolean {
  const names = new Set(detail.map((row) => row.table_name));
  return summary.length > 0 && names.size === detail.length &&
    detail.length === summary.length && summary.every((row) => names.has(row.table_name));
}

export function resolvedSuggestionStatus(data: unknown): 'applied' | 'dismissed' | 'already_resolved' {
  const status = typeof data === 'object' && data !== null && 'status' in data ? data.status : null;
  if (status === 'applied' || status === 'dismissed' || status === 'already_resolved') return status;
  throw new Error(status === 'not_found'
    ? 'Esta sugestão não está disponível. Recarregue a lista.'
    : 'Não foi possível confirmar o resultado. Recarregue a lista.');
}

export function flowErrorMessage(error: unknown, fallback: string): string {
  return typeof error === 'object' && error !== null && 'message' in error &&
    typeof error.message === 'string' ? error.message : fallback;
}

export function requireSubmittedRequest(data: unknown): string {
  if (typeof data !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data))
    throw new Error('Não foi possível confirmar o envio. Recarregue o histórico antes de tentar novamente.');
  return data;
}

export function restoreStepSucceeded(action: string, data: unknown): boolean {
  if (typeof data !== 'object' || data === null || !('ok' in data) || data.ok !== true) return false;
  if (action === 'schema-integrity') return 'audit_verified' in data && data.audit_verified === true;
  return true;
}