import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SponsorChangeRequestList from '@/components/sponsors/SponsorChangeRequestList';
import SponsorChangeRequestForm from '@/components/sponsors/SponsorChangeRequestForm';
import type { ChangeRequestRow } from '@/lib/sponsorSelfService';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error, info: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true); });

const row: ChangeRequestRow = {
  id: '11111111-1111-1111-1111-111111111111', sponsor_id: '22222222-2222-2222-2222-222222222222',
  requested_by: '33333333-3333-3333-3333-333333333333', status: 'pending', changes: { phone: '12345678' },
  current_snapshot: {}, storage_paths: null, admin_comment: null, reviewed_by: null, reviewed_at: null,
  created_at: '2026-11-24T00:00:00Z', updated_at: '2026-11-24T00:00:00Z',
};

describe('sponsor request results', () => {
  it('thrown cancellation failure does not report success or refresh history', async () => {
    mocks.rpc.mockRejectedValueOnce(new Error('network unavailable'));
    const changed = vi.fn();
    render(<SponsorChangeRequestList rows={[row]} onChanged={changed} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.success).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
  });
  it('missing renewal receipt does not report submission or refresh history', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    const submitted = vi.fn();
    render(<SponsorChangeRequestForm sponsorId={row.sponsor_id} snapshot={{}} hasPending={false} onSubmitted={submitted} />);
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar renovação' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.success).not.toHaveBeenCalled();
    expect(submitted).not.toHaveBeenCalled();
  });
});