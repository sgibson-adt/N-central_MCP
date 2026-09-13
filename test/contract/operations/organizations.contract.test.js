import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { installContractFetch, jsonResponse, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import {
  getOrganization, getOrganizationLimits, listOrganizationChildren,
  listOrganizationCustomProperties, searchOrganizations,
} from '../../../src/operations/organizations.js';
import { coreTools } from '../../../src/tools/core.js';

let boundary;
afterEach(() => boundary?.restore());

async function capture(fn) {
  boundary = installContractFetch();
  await withSyntheticTenant(syntheticTenant('organizations'), fn);
  return boundary.calls.filter((call) => !call.path.startsWith('/api/auth/'));
}

describe('organization operation adapters', () => {
  it('routes service-org, customer, site, and org-unit searches', async () => {
    const calls = await capture(async () => {
      await searchOrganizations('service-org', { pageSize: -1 });
      await searchOrganizations('customer', { pageSize: 1000 });
      await searchOrganizations('customer', { parentId: 10, pageSize: 1000 });
      await searchOrganizations('site');
      await searchOrganizations('site', { parentId: 20 });
      await searchOrganizations('org-unit', { select: 'name==Acme' });
    });
    assert.deepEqual(calls.map((call) => call.path), [
      '/api/service-orgs', '/api/customers', '/api/service-orgs/10/customers', '/api/sites',
      '/api/customers/20/sites', '/api/org-units',
    ]);
    assert.equal(calls[0].query.pageSize, '-1');
    assert.equal(calls[2].query.pageSize, '1000');
  });

  it('finds organizations by canonical human name across bounded pages', async () => {
    boundary = installContractFetch({ responder(call) {
      if (call.path !== '/api/service-orgs/256/customers') return null;
      return call.query.pageNumber === '1'
        ? jsonResponse({
          data: [
            { customerId: 1, customerName: 'Freedom Pharmaceuticals' },
            { customerId: 2, customerName: 'Synthetic Customer' },
          ],
          totalPages: 2,
        })
        : jsonResponse({ data: [{ customerId: 3, customerName: ' freedom   pharmaceuticals ' }], totalPages: 2 });
    } });

    const matches = await withSyntheticTenant(syntheticTenant('organization-name'), () =>
      searchOrganizations('customer', {
        parentId: 256, name: 'FREEDOM PHARMACEUTICALS', nameMatch: 'exact', select: 'parentId==256',
        sortBy: 'customerName', sortOrder: 'asc',
      }));
    assert.deepEqual(matches.map(({ customerId }) => customerId), [1, 3]);
    const calls = boundary.calls.filter((call) => call.path === '/api/service-orgs/256/customers');
    assert.deepEqual(calls.map(({ query }) => query), [
      { pageNumber: '1', pageSize: '1000', select: 'parentId==256', sortBy: 'customerName', sortOrder: 'asc' },
      { pageNumber: '2', pageSize: '1000', select: 'parentId==256', sortBy: 'customerName', sortOrder: 'asc' },
    ]);

    const callsBeforeInvalid = boundary.calls.length;
    await assert.rejects(
      () => searchOrganizations('customer', { name: 'Freedom', pageSize: 50 }),
      /name search.*pageSize/i,
    );
    assert.equal(boundary.calls.length, callsBeforeInvalid);
  });

  it('routes typed detail and org-unit children reads', async () => {
    const calls = await capture(async () => {
      await getOrganization('service-org', '1');
      await getOrganization('customer', '2');
      await getOrganization('site', '3');
      await getOrganization('org-unit', '4');
      await listOrganizationChildren('4', { pageNumber: 2 });
      await getOrganizationLimits('4');
      await listOrganizationCustomProperties('4', { pageSize: 10 });
    });
    assert.deepEqual(calls.map((call) => call.path), [
      '/api/service-orgs/1', '/api/customers/2', '/api/sites/3', '/api/org-units/4',
      '/api/org-units/4/children', '/api/org-units/4/limits', '/api/org-units/4/custom-properties',
    ]);
    assert.equal(calls[4].query.pageNumber, '2');
  });

  it('preserves customer-site query fields and rejects invalid pages before I/O', async () => {
    assert.match(coreTools.find(({ name }) => name === 'search_organizations').description, /PREVIEW/);
    const calls = await capture(async () => {
      await searchOrganizations('site', {
        parentId: 20, pageNumber: 2, pageSize: -1, select: 'name==Branch',
        sortBy: 'name', sortOrder: 'desc',
      });
      const callsBeforeInvalid = boundary.calls.length;
      await assert.rejects(
        () => searchOrganizations('site', { parentId: 20, pageNumber: 0 }),
        /pageNumber/,
      );
      assert.equal(boundary.calls.length, callsBeforeInvalid);
    });
    assert.deepEqual(calls[0].query, {
      pageNumber: '2', pageSize: '-1', select: 'name==Branch', sortBy: 'name', sortOrder: 'desc',
    });
  });
});
