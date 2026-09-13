#!/usr/bin/env node
// @ts-check
/** Non-writing validation and cross-artifact reconciliation for the version 3 candidate. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { coreTools } from '../src/tools/core.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const READINESS_PATH = path.join(ROOT, 'test/contract/v3-release-readiness.json');
export const READINESS_SCHEMA_PATH = path.join(
  ROOT, 'specs/002-v3-release-readiness/contracts/release-readiness.schema.json',
);
export const READINESS_DOCUMENT_PATH = path.join(ROOT, 'docs/RELEASE-READINESS.md');

const EXPECTED_CLOSURES = [
  'GET /api/custom-psa/tickets',
  'GET /api/customers/{customerId}/registration-token',
  'GET /api/customers/{customerId}/sites',
  'GET /api/devices/{deviceId}/notes',
  'GET /api/org-units/{orgUnitId}/user-roles',
  'GET /api/org-units/{orgUnitId}/user-roles/{userRoleId}',
  'GET /api/sites/{siteId}/registration-token',
];

const EXPECTED_GATES = [
  'contract-integrity', 'operation-closure', 'unsupported-review', 'preview-discovery',
  'pagination-contract', 'core-catalog', 'compatibility', 'mcp-contracts', 'security',
  'transport-parity', 'provenance', 'documentation', 'selection-quality',
  'supported-platforms', 'static-quality', 'dependency-security', 'version-consistency',
  'release-readiness',
];

/** @param {string} relativePath */
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
/** @param {unknown[]} values */
const sorted = (values) => [...values].sort((a, b) => String(a).localeCompare(String(b)));
/** @param {unknown} actual @param {unknown} expected */
const equal = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
/** @param {Record<string, number>} actual @param {Record<string, number>} expected */
const equalCounts = (actual, expected) => equal(
  Object.fromEntries(Object.entries(actual).sort()), Object.fromEntries(Object.entries(expected).sort()),
);
/** @param {Record<string, any>[]} records @param {string} field */
const countBy = (records, field) => Object.fromEntries(
  Object.entries(Object.groupBy(records, (record) => record[field])).map(([key, values]) => [key, values.length]),
);

export function evaluateReadiness() {
  const errors = [];
  const readiness = readJson('test/contract/v3-release-readiness.json');
  const schema = readJson('specs/002-v3-release-readiness/contracts/release-readiness.schema.json');
  const coverage = readJson('test/contract/operation-coverage.json');
  const migration = readJson('test/contract/mcp/legacy-tool-mappings.json');
  const openapiBytes = fs.readFileSync(path.join(ROOT, readiness.contract.path));
  const openapi = JSON.parse(openapiBytes.toString('utf8'));
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');

  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  if (!validate(readiness)) {
    errors.push(`readiness schema: ${JSON.stringify(validate.errors || [])}`);
  }

  const sha256 = crypto.createHash('sha256').update(openapiBytes).digest('hex');
  const operationCount = Object.values(openapi.paths || {}).reduce((total, pathItem) => total
    + Object.keys(pathItem).filter((method) => ['get', 'post', 'put', 'patch', 'delete'].includes(method)).length, 0);
  const contractActual = {
    path: readiness.contract.path,
    sha256,
    openapiVersion: openapi.openapi,
    title: openapi.info?.title,
    contractVersion: openapi.info?.version,
    pathCount: Object.keys(openapi.paths || {}).length,
    operationCount,
  };
  if (!equal(contractActual, readiness.contract)) errors.push('authoritative contract identity does not reconcile');
  if (pkg.version !== readiness.version || lock.version !== readiness.version
    || lock.packages?.['']?.version !== readiness.version || readiness.tag !== `v${readiness.version}`) {
    errors.push('package, lockfile, readiness version, and expected tag do not reconcile');
  }

  const statusCounts = countBy(coverage.operations, 'status');
  const exposureCounts = countBy(coverage.operations, 'exposure');
  if (!equalCounts(statusCounts, { implemented: 92, 'not-implemented': 12 })) {
    errors.push(`coverage statuses do not reconcile: ${JSON.stringify(statusCounts)}`);
  }
  if (!equalCounts(exposureCounts, {
    'direct-tool': 82, excluded: 7, 'composed-capability': 8, 'internal-only': 7,
  })) errors.push(`coverage exposure does not reconcile: ${JSON.stringify(exposureCounts)}`);
  if (coverage.operations.length !== readiness.contract.operationCount) errors.push('coverage operation count differs from the contract');
  const unsupported = sorted(coverage.operations.filter(({ status }) => status === 'not-implemented').map(({ operationKey }) => operationKey));
  if (!equal(unsupported, sorted(readiness.acceptedUnsupportedOperations))) errors.push('unsupported operation set differs from the reviewed scope');
  const incompleteUnsupported = coverage.operations.filter(({ status }) => status === 'not-implemented').filter(
    (record) => !record.rationale?.trim() || !record.userImpact?.trim()
      || !record.intendedDisposition?.trim() || !record.safeAlternative?.trim()
      || record.capabilities.length > 0,
  );
  if (incompleteUnsupported.length) errors.push('unsupported records lack rationale, impact, disposition, alternative, or catalog absence');

  const closures = sorted(readiness.operationClosures.map(({ operationKey }) => operationKey));
  if (!equal(closures, sorted(EXPECTED_CLOSURES))) errors.push('operation closure set differs from the seven reviewed baseline gaps');
  if (!equal(readiness.defaultCatalog, coreTools.map(({ name }) => name))) errors.push('default core catalog differs from the frozen order');

  const migrationCounts = countBy(migration.records, 'disposition');
  const actualMigration = {
    legacyNameCount: migration.records.length,
    retained: migrationCounts.retained || 0,
    consolidated: migrationCounts.consolidated || 0,
    removed: migrationCounts.removed || 0,
  };
  if (!equal(actualMigration, readiness.migration)) errors.push('migration inventory differs from the frozen summary');

  const coverageProvenance = Object.fromEntries(
    ['sourceUrl', 'retrievedAt', 'productVersion', 'repositoryReceipt']
      .map((field) => [field, coverage.source[field]]),
  );
  if (!equal(coverageProvenance, readiness.provenance)) errors.push('coverage and readiness provenance differ');
  if (coverage.source.path !== readiness.contract.path || coverage.source.sha256 !== sha256
    || coverage.source.openapiVersion !== readiness.contract.openapiVersion
    || coverage.source.operationCount !== readiness.contract.operationCount) {
    errors.push('coverage source identity differs from the authoritative contract');
  }

  if (!equal(readiness.requiredGates, EXPECTED_GATES)) errors.push('required gate IDs or order differ from the release contract');
  if (new Set(readiness.deferredItems.map(({ id }) => id)).size !== readiness.deferredItems.length) {
    errors.push('deferred item IDs are not unique');
  }
  if (!equal(readiness.artifacts.architectures, ['linux/amd64', 'linux/arm64'])) {
    errors.push('published architectures differ from the release contract');
  }

  return { ready: errors.length === 0, errors, readiness, coverage, statusCounts, exposureCounts };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = evaluateReadiness();
  if (!result.ready) {
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else console.log('Version 3 readiness sources reconcile.');
}
