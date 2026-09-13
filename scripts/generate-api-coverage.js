#!/usr/bin/env node
// @ts-check
/** Deterministically render docs/API-COVERAGE.md from the reviewed coverage manifest. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'test/contract/operation-coverage.json');
const OPENAPI_PATH = path.join(ROOT, 'test/openapi-spec.json');
const OUTPUT_PATH = path.join(ROOT, 'docs/API-COVERAGE.md');

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const openapi = JSON.parse(fs.readFileSync(OPENAPI_PATH, 'utf8'));

const STATUS_ORDER = ['implemented', 'partially-implemented', 'not-implemented'];
const EXPOSURE_ORDER = [
  'direct-tool',
  'composed-capability',
  'resource-backed',
  'internal-only',
  'excluded',
];

/** @param {unknown} value */
function cell(value) {
  if (value == null || value === '') return '—';
  return String(value).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

/** @param {{status: 'known', value: string} | {status: 'unavailable', reason: string}} fact */
function provenanceCell(fact) {
  if (!fact || typeof fact !== 'object') throw new Error('Coverage provenance facts must be structured');
  if (fact.status === 'known' && fact.value?.trim()) return cell(fact.value);
  if (fact.status === 'unavailable' && fact.reason?.trim()) {
    return `Unavailable — ${cell(fact.reason)}`;
  }
  throw new Error('Coverage provenance facts must contain a value or an unavailable reason');
}

/** @param {string} value */
function label(value) {
  return value.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

/** @param {Record<string, number>} counts @param {string[]} order */
function summaryRows(counts, order) {
  return order.map((key) => {
    const count = counts[key] || 0;
    const percent = ((count / manifest.operations.length) * 100).toFixed(1);
    return `| ${label(key)} | ${count} | ${percent}% |`;
  });
}

/** @param {string} field */
function countBy(field) {
  return manifest.operations.reduce((counts, record) => {
    const key = record[field];
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

const statusCounts = countBy('status');
const exposureCounts = countBy('exposure');
const tags = [...new Set(manifest.operations.map((record) => record.tag))].sort();

const lines = [
  '# N-central OpenAPI Coverage',
  '',
  '> Generated from `test/contract/operation-coverage.json`. Do not edit operation rows manually.',
  '',
  `**Authoritative contract:** \`${manifest.source.path}\`<br>`,
  `**OpenAPI version:** ${cell(manifest.source.openapiVersion)}<br>`,
  `**Contract title/version:** ${cell(openapi.info?.title)} / ${cell(openapi.info?.version)}<br>`,
  `**SHA-256:** \`${manifest.source.sha256}\`<br>`,
  `**Contract size:** ${Object.keys(openapi.paths || {}).length} paths, ${manifest.source.operationCount} operations`,
  '',
  '| Provenance field | Reviewed value |',
  '|---|---|',
  `| N-central product version | ${provenanceCell(manifest.source.productVersion)} |`,
  `| Retrieved at | ${provenanceCell(manifest.source.retrievedAt)} |`,
  `| Source URL | ${provenanceCell(manifest.source.sourceUrl)} |`,
  `| Received in repository | ${provenanceCell(manifest.source.repositoryReceipt)} |`,
  '',
  `**Comparable MCP definition baseline:** ${manifest.baseline.toolCount} tools; ${manifest.baseline.serializedDefinitionBytes.toLocaleString('en-US')} UTF-8 bytes for ordered \`{name,description,inputSchema}\` JSON definitions.`,
  '',
  'Coverage status and preferred MCP exposure are independent. Complete REST adapter coverage does',
  'not require one public tool per endpoint; one capability may compose several operations.',
  '',
  '## Coverage Summary',
  '',
  '| Status | Operations | Percent |',
  '|---|---:|---:|',
  ...summaryRows(statusCounts, STATUS_ORDER),
  `| **Total** | **${manifest.operations.length}** | **100.0%** |`,
  '',
  '## Exposure Summary',
  '',
  '| Primary exposure | Operations | Percent |',
  '|---|---:|---:|',
  ...summaryRows(exposureCounts, EXPOSURE_ORDER),
  `| **Total** | **${manifest.operations.length}** | **100.0%** |`,
  '',
  '## Coverage by OpenAPI Area',
  '',
  '| Area | Implemented | Partial | Not implemented | Total |',
  '|---|---:|---:|---:|---:|',
  ...tags.map((tag) => {
    const records = manifest.operations.filter((record) => record.tag === tag);
    const count = (status) => records.filter((record) => record.status === status).length;
    return `| ${cell(tag)} | ${count('implemented')} | ${count('partially-implemented')} | ${count('not-implemented')} | ${records.length} |`;
  }),
  '',
  '## Operation Inventory',
  '',
  '| Operation | Lifecycle | Status | Verification | Primary exposure | Capability mappings | Gap or rationale | User impact | Intended disposition | Safe alternative | Evidence |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  ...manifest.operations.map((record) => {
    const explanation = record.gaps.length ? record.gaps.join('; ') : record.rationale;
    const mappings = record.capabilities.length
      ? record.capabilities.map((name) => `\`${name}\``).join(', ')
      : '—';
    const evidence = [...record.sourceEvidence, ...record.testEvidence]
      .map((item) => `\`${item}\``)
      .join(', ');
    return `| \`${record.operationKey}\` | ${label(record.lifecycle)} | ${label(record.status)} | ${label(record.verificationStatus)} | ${label(record.exposure)} | ${mappings} | ${cell(explanation)} | ${cell(record.userImpact)} | ${cell(record.intendedDisposition)} | ${cell(record.safeAlternative)} | ${evidence} |`;
  }),
  '',
  '## Interpretation',
  '',
  '- **Implemented** means no material request/response contract gap is known.',
  '- **Partially implemented** means a source mapping exists but a material contract gap remains.',
  '- **Not implemented** means no supported adapter exists or the operation is intentionally excluded.',
  '- **Verified** is reserved for records with passing automated operation evidence.',
  '- **Excluded** operations retain a reviewed rationale and user-safe alternative.',
  '',
];

const rendered = `${lines.join('\n').trimEnd()}\n`;
if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf8') : '';
  if (current !== rendered) {
    console.error('docs/API-COVERAGE.md is stale; run npm run coverage:api');
    process.exitCode = 1;
  }
} else {
  fs.writeFileSync(OUTPUT_PATH, rendered);
}
