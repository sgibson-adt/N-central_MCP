import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));

test('version 3 readiness record satisfies its published schema', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(readJson('specs/002-v3-release-readiness/contracts/release-readiness.schema.json'));
  const valid = validate(readJson('test/contract/v3-release-readiness.json'));
  assert.equal(valid, true, JSON.stringify(validate.errors || [], null, 2));
});

test('release scope reconciles the contract, coverage, catalog, migration, gates, and artifacts', () => {
  const readiness = readJson('test/contract/v3-release-readiness.json');
  const coverage = readJson('test/contract/operation-coverage.json');
  const mappings = readJson('test/contract/mcp/legacy-tool-mappings.json');
  const openapiBytes = fs.readFileSync(path.join(ROOT, readiness.contract.path));
  assert.equal(crypto.createHash('sha256').update(openapiBytes).digest('hex'), readiness.contract.sha256);
  assert.equal(coverage.operations.length, 104);
  assert.equal(coverage.operations.filter(({ status }) => status === 'implemented').length, 92);
  assert.equal(coverage.operations.filter(({ status }) => status === 'partially-implemented').length, 0);
  assert.equal(coverage.operations.filter(({ status }) => status === 'not-implemented').length, 12);
  assert.deepEqual(
    readiness.operationClosures.map(({ operationKey }) => operationKey).sort(),
    [
      'GET /api/custom-psa/tickets',
      'GET /api/customers/{customerId}/registration-token',
      'GET /api/customers/{customerId}/sites',
      'GET /api/devices/{deviceId}/notes',
      'GET /api/org-units/{orgUnitId}/user-roles',
      'GET /api/org-units/{orgUnitId}/user-roles/{userRoleId}',
      'GET /api/sites/{siteId}/registration-token',
    ].sort(),
  );
  assert.deepEqual(readiness.migration, {
    legacyNameCount: mappings.records.length, retained: 53, consolidated: 31, removed: 3,
  });
  assert.equal(readiness.defaultCatalog.length, 12);
  assert.equal(readiness.requiredGates.length, 18);
  assert.deepEqual(readiness.artifacts.architectures, ['linux/amd64', 'linux/arm64']);
});

test('post-3.0 work has exact reviewed IDs and classifications', () => {
  const { deferredItems } = readJson('test/contract/v3-release-readiness.json');
  assert.deepEqual(
    Object.fromEntries(deferredItems.map(({ id, classification }) => [id, classification])),
    {
      'additive-api-coverage': 'additive-3.x',
      'sso-authentication': 'security-specification',
      'remote-logout': 'security-specification',
      'authenticated-server-information': 'security-specification',
      'incompatible-contract-proposals': 'compatibility-design',
    },
  );
});

test('generated migration guide records the final split and Custom PSA removal', () => {
  const guide = fs.readFileSync(path.join(ROOT, 'docs/MIGRATING-TO-3.0.md'), 'utf8');
  assert.match(guide, /53 retained, 31 consolidated\/deprecated, and 3 removed/);
  assert.match(guide, /`list_custom_psa_tickets` \| removed \| — \| — \|/);
  assert.match(guide, /navigation links rather than a searchable ticket collection/);
});

test('readiness checker is non-writing and the generated document is current', () => {
  const generated = fs.readFileSync(path.join(ROOT, 'docs/RELEASE-READINESS.md'), 'utf8');
  assert.doesNotMatch(generated, /[ \t]+$/m, 'generated readiness documentation must not contain trailing whitespace');
  const tracked = [
    'test/contract/v3-release-readiness.json', 'test/contract/operation-coverage.json',
    'docs/RELEASE-READINESS.md',
  ];
  const before = tracked.map((file) => fs.existsSync(path.join(ROOT, file))
    ? crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex') : null);
  const result = spawnSync(process.execPath, ['scripts/generate-release-readiness.js', '--check'], {
    cwd: ROOT, encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const after = tracked.map((file) => fs.existsSync(path.join(ROOT, file))
    ? crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex') : null);
  assert.deepEqual(after, before);
});
