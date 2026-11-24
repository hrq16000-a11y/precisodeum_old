import { describe, expect, it } from 'vitest';
import { isAuditComplete, resolvedSuggestionStatus, sponsorApprovalBlock, requireSubmittedRequest, restoreStepSucceeded } from '@/lib/relatedFlowIntegrity';
import { checksumInventoryComplete, restoreCoverageStatus, validChecksumManifest } from '../../supabase/functions/_shared/restoreAuditIntegrity';

describe('related flow result integrity', () => {
  it('cannot certify partial inventories or failed downloads', () => {
    expect(checksumInventoryComplete([{ file_count: 201, sampled: 200, files: [] }])).toBe(false);
    expect(checksumInventoryComplete([{ file_count: 1, sampled: 1, files: [{ error: 'missing' }] }])).toBe(false);
    expect(checksumInventoryComplete([{ file_count: 1, sampled: 1, files: [{ sha256: 'verified' }] }])).toBe(true);
  });
  it('rejects empty, unsupported, duplicate, or unverifiable checksum manifests', () => {
    expect(validChecksumManifest({ buckets: [] }, ['portfolio'])).toBe(false);
    expect(validChecksumManifest({ buckets: [{ bucket: 'private', files: [] }] }, ['portfolio'])).toBe(false);
    expect(validChecksumManifest({ buckets: [{ bucket: 'portfolio', files: [{ path: 'photo' }] }] }, ['portfolio'])).toBe(false);
    expect(validChecksumManifest({ buckets: [{ bucket: 'portfolio', files: [{ path: 'photo', sha256: 'a'.repeat(64) }] }] }, ['portfolio'])).toBe(true);
  });
  it('requires a confirmed request identifier before reporting submission', () => {
    expect(() => requireSubmittedRequest(null)).toThrow();
    expect(() => requireSubmittedRequest('')).toThrow();
    expect(requireSubmittedRequest('11111111-1111-1111-1111-111111111111')).toBe('11111111-1111-1111-1111-111111111111');
  });
  it('does not treat missing success or missing audit evidence as a successful restoration step', () => {
    expect(restoreStepSucceeded('smoke-tests', {})).toBe(false);
    expect(restoreStepSucceeded('smoke-tests', { ok: false })).toBe(false);
    expect(restoreStepSucceeded('schema-integrity', { ok: true })).toBe(false);
    expect(restoreStepSucceeded('schema-integrity', { ok: true, audit_verified: true })).toBe(true);
  });
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