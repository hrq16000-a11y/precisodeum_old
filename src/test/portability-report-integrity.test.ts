import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import JSZip from 'jszip';

const directories: string[] = [];
afterEach(() => { for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });

async function report(restore: Record<string, unknown> | null, validationOk: boolean) {
  const dir = mkdtempSync(join(tmpdir(), 'portability-evidence-'));
  directories.push(dir);
  const bundle = join(dir, 'synthetic.zip');
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify({ files: [{ user_ref: 'synthetic', bytes: 1 }], coverage: { files_exported: 1 } }));
  writeFileSync(bundle, await zip.generateAsync({ type: 'nodebuffer' }));
  if (restore) writeFileSync(`${bundle}.restore-report.json`, JSON.stringify({ report: restore }));
  writeFileSync(`${bundle}.validation-report.json`, JSON.stringify({ report: { ok: validationOk, files_expected: 1, files_ok: 1, files_failed: 0, active_media_without_user_ref: 0 } }));
  const output = join(dir, 'report');
  const processResult = spawnSync('node', ['scripts/portability/migration-report.mjs', bundle, output], { encoding: 'utf8' });
  const summary = JSON.parse(readFileSync(join(output, 'migration-report.json'), 'utf8')).summary as { ok: boolean };
  return { exit: processResult.status, ok: summary.ok };
}

describe('offline restoration evidence', () => {
  it('does not certify missing restoration evidence', async () => {
    expect(await report(null, true)).toEqual({ exit: 2, ok: false });
  });
  it('does not certify a dry run as restored', async () => {
    expect(await report({ ok: true, dry_run: true, uploaded: 1 }, true)).toEqual({ exit: 2, ok: false });
  });
  it('does not ignore a failed validation with matching file counts', async () => {
    expect(await report({ ok: true, dry_run: false, uploaded: 1 }, false)).toEqual({ exit: 2, ok: false });
  });
  it('certifies only explicit successful restoration and validation', async () => {
    expect(await report({ ok: true, dry_run: false, uploaded: 1 }, true)).toEqual({ exit: 0, ok: true });
  });
});