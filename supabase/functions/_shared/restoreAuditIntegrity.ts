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

export function checksumInventoryComplete(buckets: readonly {
  file_count: number; sampled: number; files: readonly { sha256?: string; error?: string }[];
}[]): boolean {
  return buckets.length > 0 && buckets.every((bucket) => bucket.file_count === bucket.sampled &&
    bucket.files.length === bucket.sampled && bucket.files.every((file) => !file.error && Boolean(file.sha256)));
}

export function validChecksumManifest(manifest: unknown, allowedBuckets: readonly string[]): boolean {
  if (typeof manifest !== 'object' || manifest === null || !('buckets' in manifest) ||
    !Array.isArray(manifest.buckets) || !manifest.buckets.length) return false;
  const seen = new Set<string>();
  return manifest.buckets.every((bucket) => {
    if (!bucket || typeof bucket.bucket !== 'string' || !allowedBuckets.includes(bucket.bucket) || seen.has(bucket.bucket) || !Array.isArray(bucket.files)) return false;
    seen.add(bucket.bucket);
    const paths = new Set<string>();
    return bucket.files.every((file: unknown) => {
      if (typeof file !== 'object' || file === null || !('path' in file) ||
        typeof file.path !== 'string' || !file.path || paths.has(file.path) ||
        !('sha256' in file) || typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(file.sha256)) return false;
      paths.add(file.path);
      return true;
    });
  });
}