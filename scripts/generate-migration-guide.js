#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = `${root}docs/MIGRATING-TO-3.0.md`;
const inventory = JSON.parse(readFileSync(`${root}test/contract/mcp/legacy-tool-mappings.json`, 'utf8'));
const counts = Object.groupBy(inventory.records, ({ disposition }) => disposition);
const lines = [
  '# Migrating to 3.0', '',
  'Version 3.0 replaces the default endpoint-shaped catalog with twelve read-only, task-oriented tools. The 2.x names are available only through the opt-in `compatibility` toolset when their behavior remains safe.', '',
  '## Default changes', '',
  '- `NC_TOOLSETS` now defaults to `core`.',
  '- `NC_WRITE_MODE` now defaults to `read-only`.',
  '- Curated tools return `structuredContent` plus a readable text fallback.',
  '- Automatic pagination is bounded to 20 pages and 10,000 records; results are bounded to 256 KiB.', '',
  'To stage migration, set `NC_TOOLSETS=core,compatibility`. Write and destructive aliases still require `NC_WRITE_MODE=write` or `full`.', '',
  '## Inventory', '',
  `The reviewed 87-name inventory contains ${counts.retained?.length || 0} retained, ${counts.consolidated?.length || 0} consolidated/deprecated, and ${counts.removed?.length || 0} removed names.`, '',
  '| 2.x name | Disposition | Preferred replacement | Compatibility name | Behavior change or rationale |',
  '|---|---|---|---|---|',
  ...inventory.records.map((record) => `| \`${record.legacyName}\` | ${record.disposition} | ${record.replacement ? `\`${record.replacement}\`` : '—'} | ${record.compatibilityTool ? `\`${record.compatibilityTool}\`` : '—'} | ${(record.behaviorChanges.join(' ') || record.removalRationale || 'No contract change.').replaceAll('|', '\\|')} |`),
  '',
];
const generated = `${lines.join('\n').trimEnd()}\n`;
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== generated) { console.error('docs/MIGRATING-TO-3.0.md is stale'); process.exit(1); }
} else writeFileSync(target, generated);
