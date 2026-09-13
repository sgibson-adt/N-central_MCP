import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CRITICAL_COVERAGE_FLOORS,
  checkCriticalCoverage,
  parseCoverageTable,
} from '../scripts/check-critical-coverage.js';

const fixture = `
ℹ file              | line % | branch % | funcs % | uncovered lines
ℹ index.js          |  92.13 |    46.15 |   71.43 |
ℹ src               |        |          |         |
ℹ  auth.js          |  85.43 |    45.16 |   69.23 |
ℹ  tools            |        |          |         |
ℹ   index.js        | 100.00 |   100.00 |  100.00 |
ℹ all files         |  87.43 |    76.32 |   75.39 |
`;

describe('critical per-file coverage gate', () => {
  it('parses nested Node coverage rows without confusing duplicate basenames', () => {
    assert.deepEqual(parseCoverageTable(fixture), {
      'index.js': { lines: 92.13, branches: 46.15, functions: 71.43 },
      'src/auth.js': { lines: 85.43, branches: 45.16, functions: 69.23 },
      'src/tools/index.js': { lines: 100, branches: 100, functions: 100 },
    });
  });

  it('reports missing files and every metric below its file-specific floor', () => {
    const failures = checkCriticalCoverage({
      'src/auth.js': { lines: 81, branches: 39, functions: 64 },
    }, {
      'src/auth.js': { lines: 82, branches: 40, functions: 65 },
      'src/context.js': { lines: 90, branches: 60, functions: 95 },
    });
    assert.deepEqual(failures, [
      'src/auth.js lines 81.00% is below 82.00%',
      'src/auth.js branches 39.00% is below 40.00%',
      'src/auth.js functions 64.00% is below 65.00%',
      'src/context.js is missing from the coverage report',
    ]);
  });

  it('sets explicit floors for each critical boundary', () => {
    for (const file of [
      'index.js', 'src/auth.js', 'src/client.js', 'src/config.js', 'src/context.js',
      'src/http-runtime.js', 'src/logging.js', 'src/mcp-server.js',
      'src/metrics.js', 'src/server-utils.js', 'src/tool-registry.js',
    ]) {
      assert.ok(CRITICAL_COVERAGE_FLOORS[file], file);
    }
  });
});
