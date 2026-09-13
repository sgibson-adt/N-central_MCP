import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

import {
  OPENAPI_PATH,
  enumerateOperations,
  loadOpenApi,
  pathParameterErrors,
} from './helpers.js';

const EXPECTED_SHA256 = '051882a41b6e4f8b895abf85b46c3d90e90a88019b08ec5a8c6782aec6585640';

test('authoritative OpenAPI inventory is the reviewed 104-operation baseline', () => {
  const document = loadOpenApi();
  const operations = enumerateOperations(document);
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(OPENAPI_PATH)).digest('hex');

  assert.equal(document.openapi, '3.0.1');
  assert.equal(sha256, EXPECTED_SHA256);
  assert.equal(Object.keys(document.paths).length, 84);
  assert.equal(operations.length, 104);
  assert.equal(new Set(operations.map(({ key }) => key)).size, 104);

  const errors = operations.flatMap((operation) =>
    pathParameterErrors(operation, document).map((error) => `${operation.key}: ${error}`));
  assert.deepEqual(errors, []);
});
