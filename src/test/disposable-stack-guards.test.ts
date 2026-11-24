import { describe, expect, it } from 'vitest';
// Local-only tools deliberately remain outside the app import graph.
import { assertLoopback, isolatedEnvironment, migrationHint } from '../../scripts/security/disposable-guards.mjs';

describe('disposable integration isolation', () => {
  it('rejects nonlocal targets before any authentication or mutation', () => {
    expect(() => assertLoopback('https://precisodeum.com.br')).toThrow('NON_LOCAL_TARGET');
    expect(() => assertLoopback('http://127.0.0.1.evil.test:54321')).toThrow('NON_LOCAL_TARGET');
    expect(() => assertLoopback('postgresql://postgres:local@db.example.test/postgres', ['postgresql:'])).toThrow('NON_LOCAL_TARGET');
    expect(assertLoopback('http://127.0.0.1:54321').hostname).toBe('127.0.0.1');
  });
  it('does not inherit production database credentials or remote Docker targets', () => {
    expect(isolatedEnvironment({ PATH: '/bin', PGHOST: 'remote', PGPASSWORD: 'synthetic', SUPABASE_ACCESS_TOKEN: 'synthetic', VITE_SUPABASE_URL: 'https://example.test', DATABASE_URL: 'remote', DOCKER_HOST: 'tcp://remote', DOCKER_CONTEXT: 'remote' })).toEqual({ PATH: '/bin' });
  });
  it('reports only the migration filename, never row values or credential-bearing logs', () => {
    expect(migrationHint('secret synthetic\nApplying migration 20260312210720_example.sql\nrow sensitive text')).toBe('20260312210720_example.sql');
    expect(migrationHint('password=synthetic')).toBeNull();
  });
});