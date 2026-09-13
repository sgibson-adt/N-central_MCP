import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { installContractFetch, errorResponse, jsonResponse, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import { getOrganizationContext } from '../../../src/capabilities/organizations.js';
import { getDeviceContext } from '../../../src/capabilities/devices.js';
import { COMPOSITION_LIMITS } from '../../../src/tool-registry.js';

let boundary;
afterEach(() => boundary?.restore());

describe('core composition bounds and failure semantics', () => {
  it('publishes and enforces the outer limits', () => {
    assert.deepEqual(COMPOSITION_LIMITS, {
      calls: 10, concurrency: 5, pages: 20, records: 10_000, resultBytes: 256 * 1024,
    });
  });

  it('fetches only selected organization components and records partial optional failure', async () => {
    boundary = installContractFetch({ responder(call) {
      if (call.path.endsWith('/limits')) return errorResponse(404, 'missing limits');
      return jsonResponse({ data: { path: call.path } });
    } });
    const result = await withSyntheticTenant(syntheticTenant('org-context'), () =>
      getOrganizationContext({ orgUnitId: '42', include: ['details', 'limits'] }));
    assert.equal(boundary.calls.length, 3);
    assert.equal(result.meta.partial, true);
    assert.deepEqual(result.meta.errors.map(({ component }) => component), ['limits']);
    assert.equal(JSON.stringify(result).includes('missing limits'), false);
  });

  it('treats a primary device detail failure as fatal', async () => {
    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/devices/bad') return errorResponse(404, 'tenant secret');
      return null;
    } });
    await assert.rejects(
      withSyntheticTenant(syntheticTenant('device-context'), () => getDeviceContext({ deviceId: 'bad' })),
      /API error 404/,
    );
  });
});
