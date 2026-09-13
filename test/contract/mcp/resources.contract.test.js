import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { registerResources } from '../../../src/resources.js';
import {
  errorResponse, installContractFetch, jsonResponse, syntheticTenant, withSyntheticTenant,
} from '../fixtures.js';

let boundary;
afterEach(() => boundary?.restore());

function orgTreeHandler() {
  const resources = [];
  registerResources({ resource: (...args) => resources.push({ name: args[0], handler: args.at(-1) }) });
  return resources.find(({ name }) => name === 'org-tree').handler;
}

describe('organization-tree resource contract', () => {
  it('builds the complete hierarchy from exactly three bounded inventory reads', async () => {
    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/service-orgs') {
        return jsonResponse({ data: [{ soId: 10, soName: 'SO' }], totalPages: 1 });
      }
      if (call.path === '/api/customers') {
        return jsonResponse({ data: [{ customerId: 20, customerName: 'Customer', parentId: 10 }], totalPages: 1 });
      }
      if (call.path === '/api/sites') {
        return jsonResponse({ data: [{ siteId: 30, siteName: 'Site', parentId: 20 }], totalPages: 1 });
      }
      return null;
    } });

    const result = await withSyntheticTenant(syntheticTenant('resource-bounded'), () => orgTreeHandler()());
    assert.deepEqual(boundary.calls.map(({ path }) => path), [
      '/api/auth/authenticate', '/api/service-orgs', '/api/customers', '/api/sites',
    ]);
    assert.deepEqual(JSON.parse(result.contents[0].text), [{
      soId: 10,
      soName: 'SO',
      customers: [{
        customerId: 20,
        customerName: 'Customer',
        sites: [{ siteId: 30, siteName: 'Site' }],
      }],
    }]);
    assert.equal(result._meta?.partial, false);
    assert.deepEqual(result._meta.inventory, { serviceOrganizations: 1, customers: 1, sites: 1 });
    assert.deepEqual(result._meta.unlinked, { customers: 0, sites: 0 });
  });

  it('returns explicit partial-data diagnostics without tenant identifiers', async () => {
    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/service-orgs') {
        return jsonResponse({ data: [{ soId: 10, soName: 'SO' }], totalPages: 1 });
      }
      if (call.path === '/api/customers') return errorResponse(404, 'customer 998 private detail');
      if (call.path === '/api/sites') return jsonResponse({ data: [], totalPages: 1 });
      return null;
    } });

    const result = await withSyntheticTenant(syntheticTenant('resource-partial'), () => orgTreeHandler()());
    assert.equal(result._meta.partial, true);
    assert.deepEqual(result._meta.errors.map(({ component }) => component), ['customers']);
    assert.doesNotMatch(JSON.stringify(result._meta), /998|private detail/);
    assert.equal(boundary.calls.filter(({ path }) => /^\/api\/(service-orgs|customers|sites)$/.test(path)).length, 3);
  });
});
