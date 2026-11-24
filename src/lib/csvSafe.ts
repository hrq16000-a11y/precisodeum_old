/**
 * Célula CSV segura: neutraliza fórmulas (=, +, -, @, tab, CR) prefixando
 * apóstrofo e sempre envolve em aspas, duplicando aspas internas.
 */
export function neutralizeFormula(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '""';
  const raw = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return `"${neutralizeFormula(raw).replace(/"/g, '""')}"`;
}

export function csvRow(values: readonly unknown[], sep = ','): string {
  return values.map(csvCell).join(sep);
}
