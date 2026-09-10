import { describe, expect, it } from 'vitest';
import fs from 'fs';

const src = fs.readFileSync('src/hooks/useAuth.tsx', 'utf8');

/** Extrai apenas a lista de colunas de PROFILE_AUTH_COLUMNS. */
function profileColumns(): string {
  const start = src.indexOf('const PROFILE_AUTH_COLUMNS');
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf('const PROVIDER_AUTH_COLUMNS', start);
  return src.slice(start, end === -1 ? start + 800 : end);
}

describe('useAuth · regressão de colunas do profile', () => {
  it('não consulta colunas removidas do schema público e deriva fallbacks do provider', () => {
    const cols = profileColumns();

    expect(cols).not.toMatch(/\baccount_type\b(?!_id)/);
    expect(cols).not.toMatch(/\bprimary_category_id\b/);

    expect(src).toContain('account_type: (pData as any)?.account_type ?? derivedAccountType');
    expect(src).toContain('primary_category_id: (pData as any)?.primary_category_id ?? derivedPrimaryCategoryId');
    expect(src).toMatch(/normalizedProviderRows\.find\(\(row: (any|Provider)\) => row\?\.category_id\)\?\.category_id/);
  });
});
