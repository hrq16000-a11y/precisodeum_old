import test from 'node:test';
import assert from 'node:assert/strict';
import { commandDiagnostic } from './disposable-diagnostics.mjs';
test('classifies infrastructure and SQL failure without revealing text', () => {
  const result = commandDiagnostic('failed to pull image https://secret.invalid/key; ERROR: private row SQLSTATE 42501', { code: 1 });
  assert.deepEqual(result.categories, ['IMAGE_PULL_FAILED','MIGRATION_SQL']);
  assert.equal(result.sqlState, '42501');
  assert.equal(result.exitCode, 1);
  assert.doesNotMatch(JSON.stringify(result), /secret|private row|https/i);
});
test('unknown failure and timeout remain explicit', () => {
  assert.deepEqual(commandDiagnostic('private token ABC', {code:1}).categories, ['UNCLASSIFIED']);
  assert.deepEqual(commandDiagnostic('', {timedOut:true,signal:'SIGKILL'}).categories, ['COMMAND_TIMEOUT']);
  assert.deepEqual(commandDiagnostic('', {missing:true}).categories, ['COMMAND_MISSING']);
});

test('terminal diagnostic vocabulary cannot expose arbitrary data', () => {
  const result = commandDiagnostic('Error: failed to initialize container; https://private.invalid/ABCD; key=verysecret', { code: 1 });
  assert.deepEqual(result.terminalVocabulary, ['error failed initialize container invalid']);
  assert.doesNotMatch(JSON.stringify(result), /private|verysecret|ABCD|https/i);
});
