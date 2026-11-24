import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { exportLeadsPdf } from '@/lib/exportLeads';
import type { LeadRow, LeadHistoryEntry } from '@/hooks/useLeadFollowup';

const attack = '<script>window.__exportAttack = 1</script>';
const lead: LeadRow = {
  id: 'synthetic-lead', client_name: 'Synthetic client', phone: '00000000000',
  service_needed: null, message: null, status: 'new', lead_score: 0,
  created_at: '2026-11-24T03:57:00Z', last_status_at: '2026-11-24T03:57:00Z',
  next_followup_at: null, followup_window_hours: 24,
  last_followup_notified_at: null, lead_context: null,
};

function inspectExport(input: Parameters<typeof exportLeadsPdf>[0]) {
  let output = '';
  vi.spyOn(window, 'open').mockReturnValue({ document: {
    write: (html: string) => { output = html; }, close: vi.fn(),
  } } as unknown as Window);
  exportLeadsPdf(input);
  const report = new JSDOM(output, { runScripts: 'dangerously', beforeParse: (w) => { w.print = () => {}; } });
  try {
    expect((report.window as unknown as Record<string, unknown>)['__exportAttack']).toBeUndefined();
  } finally { report.window.close(); }
}

afterEach(() => vi.restoreAllMocks());
describe('lead PDF untrusted input cannot execute code', () => {
  it('treats the editable provider name as inert text', () => {
    inspectExport({ providerName: attack, leads: [], history: {} });
  });
  it.each(['from', 'to'] as const)('treats the URL-derived %s date filter as inert text', (field) => {
    inspectExport({ leads: [], history: {}, range: { [field]: attack } });
  });
  it('treats history types and status fallbacks as inert text', () => {
    const entry: LeadHistoryEntry = { id: 'synthetic-event', lead_id: lead.id,
      entry_type: attack, old_status: attack, new_status: attack, message: attack,
      created_at: '2026-11-24T03:57:00Z' };
    inspectExport({ leads: [lead], history: { [lead.id]: [entry] } });
  });
});