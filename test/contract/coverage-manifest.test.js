import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  createCoverageValidator,
  enumerateOperations,
  loadOpenApi,
  readJson,
} from './helpers.js';

const MANIFEST_PATH = 'test/contract/operation-coverage.json';

test('coverage manifest validates and reconciles the reviewed audit', () => {
  const manifest = readJson(MANIFEST_PATH);
  const validate = createCoverageValidator();
  assert.equal(validate(manifest), true, JSON.stringify(validate.errors || [], null, 2));

  const expectedKeys = enumerateOperations(loadOpenApi()).map(({ key }) => key);
  const actualKeys = manifest.operations
    .map(({ operationKey }) => operationKey)
    .sort((a, b) => a.localeCompare(b));
  assert.deepEqual(actualKeys, expectedKeys);

  const statusCounts = Object.fromEntries(
    ['implemented', 'partially-implemented', 'not-implemented'].map((status) => [
      status,
      manifest.operations.filter((record) => record.status === status).length,
    ]),
  );
  assert.deepEqual(statusCounts, {
    implemented: 92,
    'partially-implemented': 0,
    'not-implemented': 12,
  });

  for (const record of manifest.operations) {
    assert.equal(record.gaps.includes('Pending reviewed implementation reconciliation'), false);
    const needsDispositionDetail = record.status !== 'implemented'
      || ['internal-only', 'excluded'].includes(record.exposure);
    if (needsDispositionDetail) {
      assert.ok(record.userImpact?.length > 10, `${record.operationKey}: userImpact`);
      assert.ok(record.intendedDisposition?.length > 10, `${record.operationKey}: intendedDisposition`);
      assert.ok(
        record.safeAlternative === null || record.safeAlternative?.length > 10,
        `${record.operationKey}: safeAlternative`,
      );
    }
    for (const evidence of record.sourceEvidence) {
      const repositoryPath = evidence.split('#')[0];
      assert.equal(fs.existsSync(path.resolve(repositoryPath)), true, `${record.operationKey}: ${evidence}`);
    }
  }
});

test('coverage and exposure summaries reconcile to 104 records', () => {
  const { operations } = readJson(MANIFEST_PATH);
  const countBy = (field) => operations.reduce((counts, record) => {
    counts[record[field]] = (counts[record[field]] || 0) + 1;
    return counts;
  }, {});
  const statuses = countBy('status');
  const exposures = countBy('exposure');
  assert.equal(Object.values(statuses).reduce((sum, count) => sum + count, 0), 104);
  assert.equal(Object.values(exposures).reduce((sum, count) => sum + count, 0), 104);
});

test('every provenance fact is known or explicitly unavailable with a reason', () => {
  const { source } = readJson(MANIFEST_PATH);
  for (const field of ['sourceUrl', 'retrievedAt', 'productVersion', 'repositoryReceipt']) {
    const fact = source[field];
    assert.ok(fact && typeof fact === 'object', field);
    if (fact.status === 'known') assert.ok(fact.value?.trim(), `${field}: value`);
    else {
      assert.equal(fact.status, 'unavailable', `${field}: status`);
      assert.ok(fact.reason?.trim().length >= 10, `${field}: reason`);
    }
  }
});
