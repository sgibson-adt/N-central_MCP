#!/usr/bin/env node
// @ts-check
/** Deterministically render the version 3 readiness decision from reviewed source records. */

import fs from 'node:fs';
import { evaluateReadiness, READINESS_DOCUMENT_PATH } from './check-release-readiness.js';

const label = (value) => value.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
const fact = (value) => value.status === 'known' ? value.value : `Unavailable — ${value.reason}`;

export function renderReleaseReadiness() {
  const result = evaluateReadiness();
  const { readiness, coverage } = result;
  const unsupported = readiness.acceptedUnsupportedOperations.map((operationKey) =>
    coverage.operations.find((record) => record.operationKey === operationKey));
  const lines = [
    '# Version 3 Release Readiness',
    '',
    '> Generated from `test/contract/v3-release-readiness.json` and reconciled repository evidence. Do not edit manually.',
    '',
    `**Candidate:** ${readiness.version} (expected tag \`${readiness.tag}\`)`,
    '',
    `**Scope decision:** ${result.ready ? 'RECONCILED — PRE-PUBLICATION GATES REQUIRED' : 'NOT READY'}`,
    '',
    `**Authoritative contract:** \`${readiness.contract.path}\` at SHA-256 \`${readiness.contract.sha256}\``,
    '',
    'This report describes an unreleased candidate. Generation and validation never create, move, or push a tag and never publish an artifact.',
    '',
    '## Release decision',
    '',
    ...(result.errors.length ? result.errors.map((error) => `- Blocker: ${error}`) : [
      '- All machine-readable scope and repository evidence reconcile.',
      '- The authoritative executable ready/not-ready decision is `npm run release:check` plus the mandatory container smoke result for the same revision.',
      '- Publication still requires those gates, merge, and explicit maintainer approval.',
    ]),
    '',
    '## Contract closure',
    '',
    '| Status | Operations |',
    '|---|---:|',
    `| Implemented | ${result.statusCounts.implemented || 0} |`,
    `| Partially implemented | ${result.statusCounts['partially-implemented'] || 0} |`,
    `| Not implemented | ${result.statusCounts['not-implemented'] || 0} |`,
    '',
    '| Exposure | Operations |',
    '|---|---:|',
    `| Direct tool | ${result.exposureCounts['direct-tool'] || 0} |`,
    `| Composed capability | ${result.exposureCounts['composed-capability'] || 0} |`,
    `| Resource backed | ${result.exposureCounts['resource-backed'] || 0} |`,
    `| Internal only | ${result.exposureCounts['internal-only'] || 0} |`,
    `| Excluded | ${result.exposureCounts.excluded || 0} |`,
    '',
    '### Resolved baseline gaps',
    '',
    '| Operation | Resolution | Decision |',
    '|---|---|---|',
    ...readiness.operationClosures.map((closure) =>
      `| \`${closure.operationKey}\` | ${label(closure.resolution)} | ${closure.decision} |`),
    '',
    '### Accepted unsupported operations',
    '',
    '| Operation | Rationale | Safe alternative |',
    '|---|---|---|',
    ...unsupported.map((record) =>
      `| \`${record.operationKey}\` | ${record.rationale} | ${record.safeAlternative} |`),
    '',
    '## Frozen MCP and migration contracts',
    '',
    `- Default discovery contains exactly ${readiness.defaultCatalog.length} read-only core tools in reviewed order.`,
    `- The ${readiness.migration.legacyNameCount}-name 2.x inventory contains ${readiness.migration.retained} retained, ${readiness.migration.consolidated} consolidated, and ${readiness.migration.removed} removed names.`,
    '- Optional toolsets do not grant write authority; write mode remains an independent gate.',
    '',
    '## Provenance',
    '',
    '| Fact | Value or reason |',
    '|---|---|',
    `| Source URL | ${fact(readiness.provenance.sourceUrl)} |`,
    `| Retrieved at | ${fact(readiness.provenance.retrievedAt)} |`,
    `| Product version | ${fact(readiness.provenance.productVersion)} |`,
    `| Repository receipt | ${fact(readiness.provenance.repositoryReceipt)} |`,
    '',
    '## Required pre-publication gates',
    '',
    ...readiness.requiredGates.map((gate) => `- \`${gate}\``),
    '',
    '## Post-3.0 work',
    '',
    '| Item | Classification | Why it does not block 3.0 |',
    '|---|---|---|',
    ...readiness.deferredItems.map((item) =>
      `| \`${item.id}\` | ${label(item.classification)} | ${item.rationale} |`),
    '',
    'Additive API coverage may ship in compatible 3.x releases. SSO, remote logout, and credential-bearing server information require separate security specifications. Any incompatible proposal requires a compatibility-preserving design or a later major release.',
    '',
    '## Publication contract',
    '',
    `- Required architectures: ${readiness.artifacts.architectures.map((value) => `\`${value}\``).join(', ')}.`,
    '- An immutable image digest must be recorded in the GitHub release.',
    '- Release notes are generated from the exact approved tag.',
    '- A retry must preserve an existing release and must never move the version tag.',
    '- Creating `v3.0.0` is a separate, explicit post-merge maintainer approval action.',
    '',
  ];
  return { rendered: `${lines.join('\n').trimEnd()}\n`, result };
}

const { rendered, result } = renderReleaseReadiness();
if (process.argv.includes('--check')) {
  const current = fs.existsSync(READINESS_DOCUMENT_PATH)
    ? fs.readFileSync(READINESS_DOCUMENT_PATH, 'utf8') : '';
  if (!result.ready) {
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  }
  if (current !== rendered) {
    console.error('docs/RELEASE-READINESS.md is stale; run npm run release:readiness:generate');
    process.exitCode = 1;
  }
} else {
  fs.writeFileSync(READINESS_DOCUMENT_PATH, rendered);
  if (!result.ready) {
    console.error('Generated a NOT READY report because source reconciliation has blockers.');
    process.exitCode = 1;
  }
}
