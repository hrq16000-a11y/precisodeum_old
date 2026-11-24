import { render, waitFor, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardHealthCheck } from '@/components/dashboard/DashboardHealthCheck';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), insert: vi.fn(), getUser: vi.fn(), success: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mocks.rpc, auth: { getUser: mocks.getUser }, from: () => ({ insert: mocks.insert }),
} }));
vi.mock('sonner', () => ({ toast: { success: mocks.success } }));

const result = (ok: boolean) => ({ ok, checked_at: '2026-11-24T03:43:00Z',
  rpcs: [{ name: 'validate_db_health', ok }], columns: [] });

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.rpc.mockResolvedValue({ data: result(true), error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'synthetic-author' } }, error: null });
  mocks.insert.mockResolvedValue({ error: null });
});
afterEach(cleanup);

describe('health history confirmation', () => {
  it('does not announce health success when history insertion fails', async () => {
    mocks.insert.mockResolvedValue({ error: { message: 'synthetic write failure' } });
    const change = vi.fn();
    render(<DashboardHealthCheck intervalMs={0} onHealthChange={change} />);
    await waitFor(() => expect(change).toHaveBeenCalledWith(false));
    expect(change).not.toHaveBeenCalledWith(true);
    expect(mocks.success).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('health_check_last_logged_at')).toBeNull();
  });

  it('does not certify a failed read or null response', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const change = vi.fn();
    render(<DashboardHealthCheck intervalMs={0} onHealthChange={change} />);
    await waitFor(() => expect(change).toHaveBeenCalledWith(false));
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalledWith(true);
  });

  it('requires an identified author before persisting or reporting success', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const change = vi.fn();
    render(<DashboardHealthCheck intervalMs={0} onHealthChange={change} />);
    await waitFor(() => expect(change).toHaveBeenCalledWith(false));
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalledWith(true);
  });

  it('waits for confirmed recovery history before emitting success', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: result(false), error: null })
      .mockResolvedValue({ data: result(true), error: null });
    const change = vi.fn();
    render(<DashboardHealthCheck intervalMs={0} onHealthChange={change} />);
    await waitFor(() => expect(change).toHaveBeenCalledWith(false));
    let confirm: ((value: { error: null }) => void) | undefined;
    mocks.insert.mockImplementationOnce(() => new Promise<{ error: null }>((resolve) => { confirm = resolve; }));
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(2));
    expect(change).not.toHaveBeenCalledWith(true);
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.insert.mock.calls[1]?.[0]).toMatchObject({ user_id: 'synthetic-author', source: 'dashboard:recovered', ok: true });
    if (!confirm) throw new Error('Expected pending history write');
    confirm({ error: null });
    await waitFor(() => expect(change).toHaveBeenLastCalledWith(true));
    expect(mocks.success).toHaveBeenCalledTimes(1);
  });

  it('keeps failed recovery retryable and does not throttle an unconfirmed write', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: result(false), error: null })
      .mockResolvedValue({ data: result(true), error: null });
    const change = vi.fn();
    render(<DashboardHealthCheck intervalMs={0} onHealthChange={change} />);
    await waitFor(() => expect(change).toHaveBeenCalledWith(false));
    mocks.insert.mockResolvedValueOnce({ error: { message: 'synthetic write failure' } });
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(change).toHaveBeenCalledTimes(2));
    expect(change).not.toHaveBeenCalledWith(true);
    expect(mocks.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(change).toHaveBeenLastCalledWith(true));
    expect(mocks.insert).toHaveBeenCalledTimes(3);
    expect(mocks.success).toHaveBeenCalledTimes(1);
  });

  it('does not reuse a prior mounted widget cache as current-run audit evidence', async () => {
    sessionStorage.setItem('health_check_last_logged_at', String(Date.now()));
    const change = vi.fn();
    render(<DashboardHealthCheck intervalMs={0} onHealthChange={change} />);
    await waitFor(() => expect(change).toHaveBeenCalledWith(true));
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });
});