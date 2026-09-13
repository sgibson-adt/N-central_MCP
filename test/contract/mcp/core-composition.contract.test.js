import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { installContractFetch, errorResponse, jsonResponse, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import { getOrganizationContext, searchOrganizations } from '../../../src/capabilities/organizations.js';
import { getDeviceContext, searchDevices } from '../../../src/capabilities/devices.js';
import { runReport } from '../../../src/capabilities/reports.js';
import { getScheduledTaskContext } from '../../../src/capabilities/tasks.js';
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
      assert.equal(schema.properties.nameMatch.default, 'contains');
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
