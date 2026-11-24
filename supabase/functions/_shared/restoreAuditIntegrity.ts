export function restoreCoverageStatus(
  rows: unknown,
  failed: boolean,
  minimum: number,
  strict: boolean,
) {
  const valid = !failed && Array.isArray(rows) && rows.length > 0 && rows.every((row) =>
    typeof row === 'object' && row !== null &&
    Number.isFinite(Number(row.total_rows)) && Number.isFinite(Number(row.filled)) &&
    Number(row.total_rows) >= 0 && Number(row.filled) >= 0 && Number(row.filled) <= Number(row.total_rows));
  if (!valid) return { verified: false, coverage_pct: null, ok: false };
  const total = rows.reduce((sum, row) => sum + Number(row.total_rows), 0);
  const filled = rows.reduce((sum, row) => sum + Number(row.filled), 0);
  const coverage = total > 0 ? filled / total * 100 : 100;
  return { verified: true, coverage_pct: coverage, ok: !strict || coverage >= minimum };
}