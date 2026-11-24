import { describe, expect, it } from 'vitest';
import { isAuditComplete, resolvedSuggestionStatus, sponsorApprovalBlock } from '@/lib/relatedFlowIntegrity';
import { restoreCoverageStatus } from '../../supabase/functions/_shared/restoreAuditIntegrity';

describe('related flow result integrity', () => {
  it('blocks forbidden or renewal payloads without pretending approval applied', () => {
    expect(sponsorApprovalBlock({ phone: '12345678' })).toBeNull();
    expect(sponsorApprovalBlock({ phone: '12345678', secret: 'attack' })).not.toBeNull();
    expect(sponsorApprovalBlock({ renewal_requested: true })).not.toBeNull();
    expect(sponsorApprovalBlock({ phone: '12345678', renewal_requested: true })).not.toBeNull();
    expect(sponsorApprovalBlock({})).not.toBeNull();
  });
  it('does not certify a missing detailed report', () => {
    expect(isAuditComplete([{ table_name: 'profiles' }], [])).toBe(false);
    expect(isAuditComplete([{ table_name: 'profiles' }], [{ table_name: 'providers' }])).toBe(false);
    expect(isAuditComplete([{ table_name: 'profiles' }], [{ table_name: 'profiles' }])).toBe(true);
  });
  it('keeps unresolved suggestion responses from appearing successful', () => {
    expect(() => resolvedSuggestionStatus({ status: 'not_found' })).toThrow();
    expect(() => resolvedSuggestionStatus(null)).toThrow();
    expect(resolvedSuggestionStatus({ status: 'applied' })).toBe('applied');
    expect(resolvedSuggestionStatus({ status: 'dismissed' })).toBe('dismissed');
  });
  it('failed or absent audit cannot certify restoration even in non-strict mode', () => {
    expect(restoreCoverageStatus(null, true, 95, false).ok).toBe(false);
    expect(restoreCoverageStatus([], false, 95, false).ok).toBe(false);
    expect(restoreCoverageStatus([{ total_rows: 10, filled: 11 }], false, 95, false).ok).toBe(false);
  });
  it('preserves strict and non-strict coverage rules for verified audits', () => {
    expect(restoreCoverageStatus([{ total_rows: 100, filled: 94 }], false, 95, true).ok).toBe(false);
    expect(restoreCoverageStatus([{ total_rows: 100, filled: 95 }], false, 95, true).ok).toBe(true);
    expect(restoreCoverageStatus([{ total_rows: 100, filled: 94 }], false, 95, false).ok).toBe(true);
  });
});