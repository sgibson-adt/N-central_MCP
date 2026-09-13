import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('generated API coverage report is current', () => {
  const result = spawnSync(process.execPath, ['scripts/generate-api-coverage.js', '--check'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
