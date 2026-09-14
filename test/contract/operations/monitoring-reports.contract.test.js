import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { installContractFetch, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import { listDeviceScheduledTasks, getScheduledTask, getScheduledTaskStatus } from '../../../src/operations/scheduled-tasks.js';
import {
  getReport, listActiveIssues, listDeviceFilters, reportAllUsersByServiceOrg,
  reportCustomerSiteSummary, reportOrgHierarchy,
} from '../../../src/operations/reports.js';

let boundary;
afterEach(() => boundary?.restore());

describe('monitoring, scheduled-task, and report adapters', () => {
  it('routes active issue and device-filter search inputs', async () => {
    boundary = installContractFetch();
    await withSyntheticTenant(syntheticTenant('monitoring'), async () => {
      await listActiveIssues('8', { pageSize: 1, select: 'severity==critical' });
      const callsBeforeInvalid = boundary.calls.length;
      await assert.rejects(() => listActiveIssues('8', { pageSize: -1 }), /pageSize/);
      assert.equal(boundary.calls.length, callsBeforeInvalid);
      await listDeviceFilters({ viewScope: 'OWN_AND_USED', pageNumber: 2 });
    });
    const calls = boundary.calls.slice(1);
    assert.equal(calls[0].path, '/api/org-units/8/active-issues');
    assert.deepEqual(calls[0].query, { pageSize: '1', select: 'severity==critical' });
    assert.equal(calls[1].path, '/api/device-filters');
    assert.equal(calls[1].query.viewScope, 'OWN_AND_USED');
  });

  it('routes task detail, aggregate/detailed status, device task, and report reads', async () => {
    boundary = installContractFetch();
    await withSyntheticTenant(syntheticTenant('tasks'), async () => {
      await listDeviceScheduledTasks('dev-1');
      await getScheduledTask('task-1');
      await getScheduledTaskStatus('task-1');
      await getScheduledTaskStatus('task-1', true);
      await getReport('report-1');
    });
    assert.deepEqual(boundary.calls.slice(1).map((call) => call.path), [
      '/api/devices/dev-1/scheduled-tasks', '/api/scheduled-tasks/task-1',
      '/api/scheduled-tasks/task-1/status', '/api/scheduled-tasks/task-1/status/details', '/api/report/report-1',
    ]);
  });

  it('returns a flat deduplicated user report across a service organization', async () => {
    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/service-orgs/1/customers') return new Response(JSON.stringify({ data: [{ customerId: 2 }], totalPages: 1 }), { headers: { 'content-type': 'application/json' } });
      if (call.path === '/api/org-units/1/users') return new Response(JSON.stringify({ data: [{ userId: 10 }, { userId: 11 }], totalPages: 1 }), { headers: { 'content-type': 'application/json' } });
      if (call.path === '/api/org-units/2/users') return new Response(JSON.stringify({ data: [{ userId: 11 }, { userId: 12 }], totalPages: 1 }), { headers: { 'content-type': 'application/json' } });
      return null;
    } });
    const result = await withSyntheticTenant(syntheticTenant('user-report'), () => reportAllUsersByServiceOrg({ soId: 1 }));
    assert.deepEqual(result.data.map(({ userId }) => userId), [10, 11, 12]);
    assert.equal(result.data.some(Array.isArray), false);
    assert.deepEqual({
      detailLevel: result.detailLevel, pageNumber: result.pageNumber, pageSize: result.pageSize,
      itemCount: result.itemCount, totalItems: result.totalItems, totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
    }, {
      detailLevel: 'compact', pageNumber: 1, pageSize: 25,
      itemCount: 3, totalItems: 3, totalPages: 1, hasNextPage: false,
    });
  });

  it('pages compact users and retains full records only when requested', async () => {
    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/service-orgs/1/customers') return new Response(JSON.stringify({ data: [], totalPages: 1 }), { headers: { 'content-type': 'application/json' } });
      if (call.path === '/api/org-units/1/users') return new Response(JSON.stringify({
        data: [
          { userId: 10, userName: 'one', _extra: { noisy: true } },
          { userId: 11, userName: 'two', _extra: { noisy: true } },
        ], totalPages: 1,
      }), { headers: { 'content-type': 'application/json' } });
      return null;
    } });
    const [compact, full] = await withSyntheticTenant(syntheticTenant('paged-user-report'), async () => [
      await reportAllUsersByServiceOrg({ soId: 1, pageSize: 1 }),
      await reportAllUsersByServiceOrg({ soId: 1, all: true, detailLevel: 'full' }),
    ]);
    assert.deepEqual(compact.data, [{ userId: 10, userName: 'one' }]);
    assert.equal(compact.hasNextPage, true);
    assert.equal(compact.totalItems, 2);
    assert.equal(full.data[0]._extra.noisy, true);
    assert.equal(full.pageSize, 2);
  });

  it('uses detail records for scoped customer/site and service-org hierarchy reports', async () => {
    boundary = installContractFetch({ responder(call) {
      const bodies = {
        '/api/customers/2': { customerId: 2, customerName: 'Synthetic Customer' },
        '/api/customers/2/sites': { data: [{ siteId: 3 }], totalPages: 1 },
        '/api/service-orgs/1': { soId: 1, soName: 'Synthetic Service Org' },
        '/api/service-orgs/1/customers': { data: [{ customerId: 2 }], totalPages: 1 },
      };
      const body = bodies[call.path];
      return body ? new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } }) : null;
    } });
    const [customerSummary, hierarchy] = await withSyntheticTenant(syntheticTenant('scoped-reports'), async () => Promise.all([
      reportCustomerSiteSummary({ customerId: 2 }), reportOrgHierarchy({ soId: 1 }),
    ]));
    assert.deepEqual(customerSummary, [{ customer: { customerId: 2, customerName: 'Synthetic Customer' }, sites: [{ siteId: 3 }] }]);
    assert.deepEqual(hierarchy, [{ serviceOrg: { soId: 1, soName: 'Synthetic Service Org' }, customers: [{ customerId: 2 }] }]);
  });
});
