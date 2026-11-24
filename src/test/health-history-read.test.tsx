import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdminPortabilityDetailsPage from '@/pages/AdminPortabilityDetailsPage';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), history: vi.fn(), error: vi.fn() }));
vi.mock('@/components/AdminLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@/lib/router-compat', () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock('sonner', () => ({ toast: { error: mocks.error } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mocks.rpc, from: () => ({ select: () => ({ order: () => ({ limit: mocks.history }) }) }),
} }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: { ok: true, checked_at: '2026-11-24T03:43:00Z', rpcs: [], columns: [] }, error: null });
});
afterEach(cleanup);

it('cannot use a failed history read as complete health evidence', async () => {
  mocks.history.mockResolvedValue({ data: null, error: { message: 'synthetic read error' } });
  render(<AdminPortabilityDetailsPage />);
  await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole('table')).toBeNull();
});

it('discards previously successful evidence when a history reload fails', async () => {
  mocks.history.mockResolvedValueOnce({ data: [], error: null })
    .mockResolvedValue({ data: null, error: { message: 'synthetic read error' } });
  render(<AdminPortabilityDetailsPage />);
  await screen.findByRole('table');
  fireEvent.click(screen.getByRole('button', { name: 'Reexecutar checks' }));
  await waitFor(() => expect(mocks.error).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole('table')).toBeNull();
});