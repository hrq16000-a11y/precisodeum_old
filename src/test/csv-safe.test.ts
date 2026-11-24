import { describe, it, expect } from 'vitest';
import { csvCell, neutralizeFormula } from '@/lib/csvSafe';

describe('csvSafe', () => {
  it('neutraliza células que começam com fórmula', () => {
    for (const p of ['=', '+', '-', '@']) expect(neutralizeFormula(`${p}HYPERLINK("x")`)).toBe(`'${p}HYPERLINK("x")`);
  });
  it('mantém texto comum e escapa aspas', () => {
    expect(csvCell('Ana "Pintora"')).toBe('"Ana ""Pintora"""');
    expect(csvCell('=1+1')).toBe(`"'=1+1"`);
  });
});
