import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { coreTools } from '../../../src/tools/core.js';
import { createCapabilityResult, toMcpResult } from '../../../src/tool-registry.js';
import { assertRedacted, assertSerializedSize, assertStructuredResult } from './result-assertions.js';

describe('curated MCP structured results', () => {
  it('returns structuredContent plus a readable text fallback matching output schema', () => {
    const result = toMcpResult(coreTools[0], createCapabilityResult({ healthy: true }, ['GET /api/health']));
    assertStructuredResult(result);
    assert.deepEqual(result.structuredContent.data, { healthy: true });
    assert.match(result.content[0].text, /healthy/);
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
