import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { installContractFetch, errorResponse, jsonResponse, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import { getOrganizationContext, searchOrganizations } from '../../../src/capabilities/organizations.js';
import { getDeviceContext, searchDevices } from '../../../src/capabilities/devices.js';
import { listActiveIssues } from '../../../src/capabilities/monitoring.js';
import { listJobStatuses, runReport } from '../../../src/capabilities/reports.js';
import { getScheduledTaskContext } from '../../../src/capabilities/tasks.js';
import { getCurrentUser } from '../../../src/capabilities/server.js';
import { COMPOSITION_LIMITS } from '../../../src/tool-registry.js';
import { coreTools } from '../../../src/tools/core.js';

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
    assert.deepEqual(result.meta.errors.map(({ code }) => code), ['NOT_FOUND']);
    assert.equal(JSON.stringify(result).includes('missing limits'), false);
  });

  it('treats a primary device detail failure as fatal', async () => {
    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/devices/bad') return errorResponse(404, 'tenant secret');
      return null;
    } });
    await assert.rejects(
      withSyntheticTenant(syntheticTenant('device-context'), () => getDeviceContext({ deviceId: 'bad' })),
      (error) => error.category === 'not_found' && error.status === 404,
    );
  });

  it('defaults organization context collections to compact bounded pages with a full escape hatch', async () => {
    const schema = coreTools.find(({ name }) => name === 'get_organization_context').inputSchema;
    assert.equal(schema.properties.childrenOptions.additionalProperties, false);
    assert.equal(schema.properties.propertyOptions.additionalProperties, false);
    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/org-units/42') {
        return jsonResponse({ data: { orgUnitId: 42, orgUnitName: 'Synthetic', noisy: 'private' } });
      }
      if (call.path.endsWith('/children')) {
        return jsonResponse({ data: [{ orgUnitId: 43, orgUnitName: 'Child', noisy: 'private' }] });
      }
      if (call.path.endsWith('/custom-properties')) {
        return jsonResponse({ data: [{ propertyId: 1, propertyName: 'Tier', value: 'A', noisy: 'private' }] });
      }
      return null;
    } });
    const compact = await withSyntheticTenant(syntheticTenant('compact-org-context'), () =>
      getOrganizationContext({ orgUnitId: 42, include: ['children', 'customProperties'] }));
    assert.equal(JSON.stringify(compact).includes('private'), false);
    assert.deepEqual(compact.data.details.data, { orgUnitId: 42, orgUnitName: 'Synthetic' });
    const listCalls = boundary.calls.filter(({ path }) => path.endsWith('/children') || path.endsWith('/custom-properties'));
    assert.equal(listCalls.every(({ query }) => query.pageNumber === '1' && query.pageSize === '25'), true);

    const full = await withSyntheticTenant(syntheticTenant('full-org-context'), () =>
      getOrganizationContext({
        orgUnitId: 42, include: ['children'], detailLevel: 'full',
        childrenOptions: { pageNumber: 2, pageSize: 5 },
      }));
    assert.equal(full.data.details.data.noisy, 'private');
    assert.equal(full.data.children.data[0].noisy, 'private');
    assert.deepEqual(boundary.calls.at(-1).query, { pageNumber: '2', pageSize: '5' });
  });

  it('publishes closed note options and forwards them only when notes are selected', async () => {
    const schema = coreTools.find(({ name }) => name === 'get_device_context').inputSchema;
    assert.equal(schema.properties.noteOptions.additionalProperties, false);
    assert.equal(schema.properties.noteOptions.properties.pageNumber.minimum, 1);
    assert.equal(schema.properties.noteOptions.properties.pageSize.minimum, -1);
    assert.equal(schema.properties.noteOptions.properties.pageSize.maximum, 1000);

    boundary = installContractFetch();
    await withSyntheticTenant(syntheticTenant('device-note-context'), async () => {
      await getDeviceContext({
        deviceId: '42', include: ['details', 'notes'],
        noteOptions: { pageNumber: 2, pageSize: -1 },
      });
      await getDeviceContext({
        deviceId: '43', include: ['details', 'assets'],
        noteOptions: { pageNumber: 9, pageSize: 10 },
      });
    });
    const noteCalls = boundary.calls.filter(({ path }) => path.endsWith('/notes'));
    assert.equal(noteCalls.length, 1);
    assert.deepEqual(noteCalls[0].query, { pageNumber: '2', pageSize: '-1' });
  });

  it('publishes human-name search and returns bounded match diagnostics', async () => {
    for (const toolName of ['search_organizations', 'search_devices']) {
      const schema = coreTools.find(({ name }) => name === toolName).inputSchema;
      assert.equal(schema.properties.name.type, 'string');
      assert.equal(schema.properties.name.minLength, 1);
      assert.equal(Object.hasOwn(schema.properties.nameMatch, 'default'), false);
      assert.deepEqual(schema.properties.nameMatch.enum, ['exact', 'contains']);
    }

    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/customers') {
        return jsonResponse({ data: [{ customerId: 1, customerName: 'Freedom Pharmaceuticals' }], totalPages: 1 });
      }
      if (call.path === '/api/devices') {
        return jsonResponse({ data: [{ deviceId: 2, longName: 'HP Laptop - Vienna' }], totalPages: 1 });
      }
      return null;
    } });
    const [organizations, devices] = await withSyntheticTenant(syntheticTenant('core-name-search'), () =>
      Promise.all([
        searchOrganizations({ organizationType: 'customer', name: 'freedom', nameMatch: 'contains' }),
        searchDevices({ name: 'vienna' }),
      ]));
    for (const result of [organizations, devices]) {
      assert.equal(result.data.length, 1);
      assert.deepEqual(result.meta.page, {
        search: { match: 'contains', matched: 1, bounded: true, maxPages: 20, maxRecords: 10_000 },
      });
    }
    assert.deepEqual(devices.data, [{ deviceId: 2, longName: 'HP Laptop - Vienna' }]);

    const fullDevices = await withSyntheticTenant(syntheticTenant('core-full-device-search'), () =>
      searchDevices({ name: 'vienna', detailLevel: 'full' }));
    assert.equal(fullDevices.data[0].longName, 'HP Laptop - Vienna');
  });

  it('defaults current-user identity to a compact non-contact projection', async () => {
    const upstream = {
      status: 0, message: 'success',
      data: {
        userId: 7, username: 'synthetic', firstName: 'Test', lastName: 'User',
        isEnabled: true, twoFactorType: 'TOTP', street1: 'private', contactEmail: 'private@example.test',
      },
    };
    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/users/me') return jsonResponse(upstream);
      return null;
    } });
    const [compact, full] = await withSyntheticTenant(syntheticTenant('compact-current-user'), async () => [
      await getCurrentUser(), await getCurrentUser({ detailLevel: 'full' }),
    ]);
    assert.deepEqual(compact.data.data, {
      userId: 7, username: 'synthetic', firstName: 'Test', lastName: 'User',
      isEnabled: true, twoFactorType: 'TOTP',
    });
    assert.equal(JSON.stringify(compact).includes('private'), false);
    assert.equal(full.data.data.street1, 'private');
  });

  it('renders reviewed reports as CSV when requested', async () => {
    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/device-filters') {
        return jsonResponse({ data: [{ filterId: 1, filterName: 'Windows' }], totalPages: 1 });
      }
      return null;
    } });
    const result = await withSyntheticTenant(syntheticTenant('csv-report'), () =>
      runReport({ reportType: 'device-filters', format: 'csv' }));
    assert.equal(typeof result.data, 'string');
    assert.match(result.data, /filterId,filterName/);
    assert.match(result.data, /1,Windows/);
  });

  it('defaults active issues to ten compact rows while retaining an explicit full view', async () => {
    const activeIssues = coreTools.find(({ name }) => name === 'list_active_issues');
    assert.deepEqual(activeIssues.inputSchema.properties.detailLevel.enum, ['compact', 'full']);
    assert.match(activeIssues.inputSchema.properties.pageSize.description, /defaults to 10/);
    boundary = installContractFetch({ responder(call) {
      if (call.path.endsWith('/active-issues')) {
        return jsonResponse({
          data: [{ deviceId: 2, serviceName: 'Disk', _extra: { deviceName: 'Synthetic', noisy: 'x'.repeat(5000) } }],
          pageNumber: 1, pageSize: 10, itemCount: 1, totalItems: 11, totalPages: 2,
        });
      }
      return null;
    } });
    const [compact, full] = await withSyntheticTenant(syntheticTenant('compact-issues'), async () => [
      await listActiveIssues({ orgUnitId: 1 }),
      await listActiveIssues({ orgUnitId: 1, pageSize: 1, detailLevel: 'full' }),
    ]);
    const issueCalls = boundary.calls.filter(({ path }) => path.endsWith('/active-issues'));
    assert.equal(issueCalls[0].query.pageSize, '10');
    assert.equal(issueCalls[1].query.pageSize, '1');
    assert.deepEqual(compact.data, [{ deviceId: 2, deviceName: 'Synthetic', serviceName: 'Disk' }]);
    assert.equal(compact.meta.page.hasNextPage, true);
    assert.equal(full.data[0]._extra.noisy.length, 5000);
  });

  it('filters and paginates compact job statuses locally', async () => {
    const jobTool = coreTools.find(({ name }) => name === 'list_job_statuses');
    assert.equal(jobTool.inputSchema.properties.pageSize.maximum, 100);
    assert.deepEqual(jobTool.inputSchema.properties.detailLevel.enum, ['compact', 'full']);
    boundary = installContractFetch({ responder(call) {
      if (call.path.endsWith('/job-statuses')) {
        return jsonResponse({ data: [
          { jobId: 1, deviceId: 9, status: 'FAILED', scheduledTime: '2026-01-01T00:00:00Z', _extra: { noisy: 'x'.repeat(5000) } },
          { jobId: 2, deviceId: 9, status: 'failed', scheduledTime: '2026-02-01T00:00:00Z', _extra: { noisy: 'x'.repeat(5000) } },
          { jobId: 3, deviceId: 9, status: 'complete', scheduledTime: '2026-03-01T00:00:00Z' },
        ], totalItems: 3 });
      }
      return null;
    } });
    const result = await withSyntheticTenant(syntheticTenant('compact-jobs'), () => listJobStatuses({
      orgUnitId: 1, status: 'failed', deviceId: 9, since: '2026-01-15T00:00:00Z', pageSize: 1,
    }));
    assert.deepEqual(result.data, [{
      jobId: 2, status: 'failed', deviceId: 9, scheduledTime: '2026-02-01T00:00:00Z',
    }]);
    assert.deepEqual(result.meta.page, {
      pageNumber: 1, pageSize: 1, itemCount: 1, totalItems: 1,
      totalPages: 1, hasNextPage: false, sourceTotalItems: 3,
    });
    assert.equal(JSON.stringify(result).includes('noisy'), false);
  });

  it('rejects detailed task status unless status was explicitly requested', async () => {
    boundary = installContractFetch();
    await assert.rejects(
      withSyntheticTenant(syntheticTenant('task-options'), () =>
        getScheduledTaskContext({ taskId: '42', detailedStatus: true })),
      /detailedStatus requires includeStatus/,
    );
    assert.equal(boundary.calls.length, 0);
  });
});
