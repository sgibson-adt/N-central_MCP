import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { coreTools } from '../../../src/tools/core.js';
import { createCapabilityResult, toMcpResult } from '../../../src/tool-registry.js';
import { assertRedacted, assertSerializedSize, assertStructuredResult } from './result-assertions.js';

describe('curated MCP structured results', () => {
  it('returns structuredContent plus a compact non-duplicating text summary', () => {
    const result = toMcpResult(coreTools[0], createCapabilityResult({ healthy: true }, ['GET /api/health']));
    assertStructuredResult(result);
    assert.deepEqual(result.structuredContent.data, { healthy: true });
    assert.match(result.content[0].text, /healthy/);
    assert.notEqual(result.content[0].text, JSON.stringify(result.structuredContent.data, null, 2));
    assert.ok(Buffer.byteLength(result.content[0].text) < 100);
  });

  it('summarizes arrays, paged data, text, partial results, and truncation without copying values', () => {
    const array = toMcpResult(coreTools[5], createCapabilityResult([
      { id: 1, secretValue: 'must-not-appear-in-text' }, { id: 2 },
    ], ['GET /api/devices']));
    assert.equal(array.content[0].text, 'Returned 2 records.');
    assert.equal(array.content[0].text.includes('must-not-appear-in-text'), false);

    const paged = toMcpResult(coreTools[5], createCapabilityResult({ data: [{ id: 1 }] }, ['GET /api/devices']));
    assert.equal(paged.content[0].text, 'Returned 1 record in a paged result.');

    const nextPage = toMcpResult(coreTools[7], createCapabilityResult(
      [{ id: 1 }], ['GET /api/issues'], [],
      { page: { pageNumber: 2, totalPages: 4, hasNextPage: true } },
    ));
    assert.equal(nextPage.content[0].text, 'Returned 1 record. Page 2 of 4. Request pageNumber=3 for more.');

    const text = toMcpResult(coreTools[10], createCapabilityResult('secret,csv\nvalue,1', ['GET /api/device-filters']));
    assert.match(text.content[0].text, /^Returned a text result \(\d+ bytes\)\.$/);
    assert.equal(text.content[0].text.includes('secret'), false);

    const partial = toMcpResult(coreTools[0], createCapabilityResult({}, ['GET /api/health'], [
      { component: 'extra', message: 'failed' },
    ], { truncated: true }));
    assert.match(partial.content[0].text, /1 component error\(s\).*truncated/);
  });

  it('truncates oversized arrays to 256 KiB and marks metadata', () => {
    const rows = Array.from({ length: 4000 }, (_, id) => ({ id, value: 'x'.repeat(200) }));
    const result = toMcpResult(coreTools[5], createCapabilityResult(rows, ['GET /api/devices']));
    assertStructuredResult(result);
    assert.equal(result.structuredContent.meta.truncated, true);
    assertSerializedSize(result.structuredContent, 256 * 1024);
  });

  it('redacts component error messages and token-like material', () => {
    const internal = createCapabilityResult(null, ['GET /api/example'], [{
      component: 'optional', code: 'UPSTREAM_ERROR', message: 'Bearer secret-token at https://tenant.example.test/api',
    }]);
    const result = toMcpResult(coreTools[0], internal);
    assertRedacted(result, ['secret-token', 'tenant.example.test']);
    assert.equal(result.structuredContent.meta.partial, true);
  });
});
