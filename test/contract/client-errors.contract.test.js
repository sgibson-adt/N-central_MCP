import { afterEach, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { errorResponse, installContractFetch, jsonResponse, syntheticTenant, textResponse, withSyntheticTenant } from './fixtures.js';
import { sanitizeToolError } from '../../src/tool-registry.js';

let client; let boundary;
before(async () => {
  process.env.NC_MAX_RETRIES = '1';
  process.env.NC_RETRY_DELAY_MS = '1';
  client = await import('../../src/client.js?contract-errors=1');
  delete process.env.NC_MAX_RETRIES;
  delete process.env.NC_RETRY_DELAY_MS;
});
afterEach(() => boundary?.restore());

describe('client error contract', () => {
  it('honors an explicit zero retry configuration', async () => {
    process.env.NC_MAX_RETRIES = '0';
    process.env.NC_RETRY_DELAY_MS = '1';
    const zeroRetryClient = await import(`../../src/client.js?zero-retries=${Date.now()}`);
    delete process.env.NC_MAX_RETRIES;
    delete process.env.NC_RETRY_DELAY_MS;
    boundary = installContractFetch({ responder(call) {
      return call.path === '/api/no-retries' ? errorResponse(500) : null;
    } });
    await assert.rejects(withSyntheticTenant(syntheticTenant('zero-retry'), () => zeroRetryClient.apiGet('/api/no-retries')), /Server error 500/);
    assert.equal(boundary.calls.filter(({ path }) => path === '/api/no-retries').length, 1);
  });

  it('retries every transient 5xx for replay-safe methods but never retries POST', async () => {
    const attempts = new Map();
    boundary = installContractFetch({ responder(call) {
      const match = call.path.match(/^\/api\/retry-(500|502|503|504)$/);
      if (match) {
        const count = attempts.get(call.path) || 0;
        attempts.set(call.path, count + 1);
        if (count === 0) return errorResponse(Number(match[1]));
      }
      if (call.path === '/api/no-retry') return errorResponse(502);
      return jsonResponse({ ok: true });
    } });
    for (const status of [500, 502, 503, 504]) {
      await withSyntheticTenant(syntheticTenant(`retry-${status}`), () => client.apiGet(`/api/retry-${status}`));
      assert.equal(boundary.calls.filter((c) => c.path === `/api/retry-${status}`).length, 2);
    }
    await assert.rejects(withSyntheticTenant(syntheticTenant('post'), () => client.apiPost('/api/no-retry', {})), /Server error 502/);
    assert.equal(boundary.calls.filter((c) => c.path === '/api/no-retry').length, 1);
  });

  it('retries throttling, surfaces wrapped errors, and returns non-JSON text', async () => {
    let throttled = false;
    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/throttle' && !throttled) { throttled = true; return errorResponse(429); }
      if (call.path === '/api/wrapped') return jsonResponse({ 'error message': 'tenant detail' });
      if (call.path === '/api/wrapped-case') return jsonResponse({ 'Error Message': 'tenant detail' });
      if (call.path === '/api/text') return textResponse('plain response');
      return jsonResponse({ ok: true });
    } });
    assert.deepEqual(await withSyntheticTenant(syntheticTenant('throttle'), () => client.apiPost('/api/throttle', {})), { ok: true });
    await assert.rejects(withSyntheticTenant(syntheticTenant('wrapped'), () => client.apiGet('/api/wrapped')), /API error in 200 response/);
    await assert.rejects(withSyntheticTenant(syntheticTenant('wrapped-case'), () => client.apiGet('/api/wrapped-case')), /API error in 200 response/);
    assert.equal(await withSyntheticTenant(syntheticTenant('text'), () => client.apiGet('/api/text')), 'plain response');
  });

  it('retries timeout-shaped failures and redacts upstream locations', async () => {
    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/timeout') { const error = new Error('aborted'); error.name = 'AbortError'; throw error; }
      return null;
    } });
    await assert.rejects(withSyntheticTenant(syntheticTenant('timeout'), () => client.apiGet('/api/timeout')), /timed out/);
    assert.equal(boundary.calls.filter((c) => c.path === '/api/timeout').length, 2);
    assert.equal(sanitizeToolError('Bearer secret at https://tenant.example.test/api').includes('secret'), false);
  });
});
