#!/usr/bin/env node

import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const CRITICAL_COVERAGE_FLOORS = Object.freeze({
  'index.js': { lines: 88, branches: 40, functions: 65 },
  'src/auth.js': { lines: 82, branches: 40, functions: 65 },
  'src/client.js': { lines: 48, branches: 20, functions: 30 },
  'src/config.js': { lines: 95, branches: 90, functions: 95 },
  'src/context.js': { lines: 90, branches: 60, functions: 95 },
  'src/http-runtime.js': { lines: 72, branches: 65, functions: 75 },
  'src/logging.js': { lines: 95, branches: 75, functions: 95 },
  'src/mcp-server.js': { lines: 75, branches: 75, functions: 95 },
  'src/metrics.js': { lines: 90, branches: 75, functions: 90 },
  'src/server-utils.js': { lines: 98, branches: 90, functions: 95 },
  'src/tool-registry.js': { lines: 95, branches: 75, functions: 95 },
});

export function parseCoverageTable(output) {
  const rows = {};
  let directories = [];
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine
      .replace(/^\s*(?:ℹ|#) ?/, '');
    const columns = line.split('|');
    if (columns.length < 5) continue;
    const nameCell = columns[0];
    const name = nameCell.trim();
    const indent = nameCell.length - nameCell.trimStart().length;
    const metricCells = columns.slice(1, 4).map((value) => value.trim());
    const values = metricCells.map((value) => value === '' ? Number.NaN : Number(value));
    if (values.every(Number.isFinite)) {
      if (name === 'all files' || name === 'file') continue;
      const parent = directories
        .filter((directory) => directory.indent < indent)
        .map((directory) => directory.name);
      rows[[...parent, name].join('/')] = {
        lines: values[0], branches: values[1], functions: values[2],
      };
      continue;
    }
    if (name && metricCells.every((value) => value === '')) {
      directories = directories.filter((directory) => directory.indent < indent);
      directories.push({ indent, name });
    }
  }
  return rows;
}

export function checkCriticalCoverage(rows, floors = CRITICAL_COVERAGE_FLOORS) {
  const failures = [];
  for (const [file, expected] of Object.entries(floors)) {
    const actual = rows[file];
    if (!actual) {
      failures.push(`${file} is missing from the coverage report`);
      continue;
    }
    for (const metric of ['lines', 'branches', 'functions']) {
      if (actual[metric] < expected[metric]) {
        failures.push(`${file} ${metric} ${actual[metric].toFixed(2)}% is below ${expected[metric].toFixed(2)}%`);
      }
    }
  }
  return failures;
}

function testFiles() {
  const directories = [
    'test', 'test/contract', 'test/contract/operations', 'test/contract/mcp', 'test/evaluation',
  ];
  return directories.flatMap((directory) => readdirSync(directory)
    .filter((name) => name.endsWith('.test.js'))
    .sort()
    .map((name) => `${directory}/${name}`));
}

function main() {
  const result = spawnSync(process.execPath, [
    '--experimental-test-coverage',
    '--test',
    '--test-coverage-lines=85',
    '--test-coverage-branches=70',
    '--test-coverage-functions=70',
    ...testFiles(),
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error) {
    console.error(`Coverage runner failed: ${result.error.message}`);
    process.exitCode = 1;
    return;
  }
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return;
  }
  const rows = parseCoverageTable(`${result.stdout || ''}\n${result.stderr || ''}`);
  const failures = checkCriticalCoverage(rows);
  if (failures.length > 0) {
    console.error('Critical per-file coverage floors failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Critical per-file coverage floors passed for ${Object.keys(CRITICAL_COVERAGE_FLOORS).length} files.`);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || '')) main();
