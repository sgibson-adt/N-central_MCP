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
  it('retries an idempotent GET once but never retries POST on 500', async () => {
    let getAttempts = 0;
    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/retry' && getAttempts++ === 0) return errorResponse(500);
      if (call.path === '/api/no-retry') return errorResponse(500);
      return jsonResponse({ ok: true });
    } });
    await withSyntheticTenant(syntheticTenant('retry'), () => client.apiGet('/api/retry'));
    await assert.rejects(withSyntheticTenant(syntheticTenant('post'), () => client.apiPost('/api/no-retry', {})), /Server error 500/);
    assert.equal(boundary.calls.filter((c) => c.path === '/api/retry').length, 2);
    assert.equal(boundary.calls.filter((c) => c.path === '/api/no-retry').length, 1);
  });

  it('retries throttling, surfaces wrapped errors, and returns non-JSON text', async () => {
    let throttled = false;
    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/throttle' && !throttled) { throttled = true; return errorResponse(429); }
      if (call.path === '/api/wrapped') return jsonResponse({ 'error message': 'tenant detail' });
      if (call.path === '/api/text') return textResponse('plain response');
      return jsonResponse({ ok: true });
    } });
    assert.deepEqual(await withSyntheticTenant(syntheticTenant('throttle'), () => client.apiPost('/api/throttle', {})), { ok: true });
    await assert.rejects(withSyntheticTenant(syntheticTenant('wrapped'), () => client.apiGet('/api/wrapped')), /API error in 200 response/);
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
