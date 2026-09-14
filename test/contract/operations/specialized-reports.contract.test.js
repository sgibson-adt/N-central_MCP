import { it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installContractFetch, jsonResponse, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import {
  generatePatchComparisonReport, reportDevicesBulk, reportDevicesForOrg,
} from '../../../src/operations/reports.js';
import { reportingTools } from '../../../src/tools/reporting.js';

let boundary; afterEach(() => boundary?.restore());
it('classifies patch generation as write and bounds specialized report concurrency', async () => {
  boundary = installContractFetch();
  await withSyntheticTenant(syntheticTenant('reports'), async () => {
    await generatePatchComparisonReport({ deviceIds: [1] });
    await reportDevicesBulk({ devices: [{ deviceId: 1 }, { deviceId: 2 }], dataType: 'assets', concurrency: 99 });
  });
  assert.equal(generatePatchComparisonReport.writeScope, 'write');
  assert.ok(boundary.maxConcurrency <= 5);
  assert.equal(boundary.calls[1].path, '/api/report/patch-comparison');
});

it('defaults bulk device reports to one compact 25-device page with identity', async () => {
  const tool = reportingTools.find(({ name }) => name === 'report_devices_bulk');
  assert.equal(tool.inputSchema.properties.pageSize.maximum, 100);
  assert.deepEqual(tool.inputSchema.properties.detailLevel.enum, ['compact', 'full']);
  assert.equal(tool.inputSchema.properties.propertyNames.maxItems, 20);
  boundary = installContractFetch({ responder(call) {
    if (call.path === '/api/org-units/7/devices') {
      return jsonResponse({
        data: [{ deviceId: 11, longName: 'Synthetic device' }],
        pageNumber: 1, pageSize: 25, totalItems: 51, totalPages: 3,
      });
    }
    if (call.path === '/api/devices/11/assets') {
      return jsonResponse({ data: {
        device: { deviceid: '11', longname: 'Synthetic device', deviceclass: 'Laptop' },
        os: { reportedos: 'Synthetic OS', osarchitecture: '64-bit', version: '1' },
        processor: { name: 'Synthetic CPU', numberofcores: '4', numberofcpus: '1' },
        computersystem: { manufacturer: 'Vendor', model: 'Model', serialnumber: 'Serial', totalphysicalmemory: '16 GB' },
        _extra: {
          device: { ncentralassettag: 'asset-1', warrantyexpirydate: '2027-01-01' },
          physicaldrive: { list: [{ capacity: '1 TB', modelnumber: 'Disk', serialnumber: 'DiskSerial' }] },
          customer: { customerid: 7, customername: 'Synthetic customer' },
          noisy: 'x'.repeat(5000),
        },
      } });
    }
    return null;
  } });
  const result = await withSyntheticTenant(syntheticTenant('compact-assets'), () =>
    reportDevicesForOrg({ orgUnitId: 7, dataType: 'assets' }));
  const deviceCall = boundary.calls.find(({ path }) => path.endsWith('/devices'));
  assert.deepEqual(deviceCall.query, { pageNumber: '1', pageSize: '25' });
  assert.deepEqual(result, {
    data: [{
      deviceId: 11, deviceName: 'Synthetic device', deviceClass: 'Laptop',
      assetTag: 'asset-1', warrantyExpiryDate: '2027-01-01',
      customerId: 7, customerName: 'Synthetic customer',
      manufacturer: 'Vendor', model: 'Model', serialNumber: 'Serial', totalPhysicalMemory: '16 GB',
      processorName: 'Synthetic CPU', processorCores: '4', processorCount: '1',
      reportedOs: 'Synthetic OS', osArchitecture: '64-bit', osVersion: '1',
      physicalDrives: [{ capacity: '1 TB', model: 'Disk', serialNumber: 'DiskSerial' }],
    }],
    dataType: 'assets', detailLevel: 'compact', pageNumber: 1, pageSize: 25,
    itemCount: 1, totalItems: 51, totalPages: 3, hasNextPage: true,
  });
  assert.equal(JSON.stringify(result).includes('noisy'), false);
});

it('retains raw bulk records only when full detail is explicit', async () => {
  boundary = installContractFetch({ responder(call) {
    if (call.path.endsWith('/assets')) return jsonResponse({ data: { _extra: {
      raw: true, application: { list: [{ displayname: 'App', version: '1' }] },
    } } });
    return null;
  } });
  const [compact, withSoftware, full] = await withSyntheticTenant(syntheticTenant('full-assets'), async () => [
    await reportDevicesBulk({ devices: [{ deviceId: 1 }], dataType: 'assets' }),
    await reportDevicesBulk({ devices: [{ deviceId: 1 }], dataType: 'assets', includeSoftware: true }),
    await reportDevicesBulk({ devices: [{ deviceId: 1 }], dataType: 'assets', detailLevel: 'full' }),
  ]);
  assert.equal(JSON.stringify(compact).includes('raw'), false);
  assert.deepEqual(withSoftware[0].applications, [{ name: 'App', version: '1' }]);
  assert.equal(full[0].data._extra.raw, true);
});

it('summarizes monitoring and filters compact custom properties', async () => {
  boundary = installContractFetch({ responder(call) {
    if (call.path.endsWith('/service-monitor-status')) return jsonResponse({ data: [
      { serviceId: 1, moduleName: 'Healthy', stateStatus: 'Normal' },
      { serviceId: 2, moduleName: 'Attention', stateStatus: 'Failed' },
    ] });
    if (call.path.endsWith('/custom-properties')) return jsonResponse({ data: [
      { propertyId: 1, propertyName: 'Important', propertyType: 'TEXT', value: 'yes' },
      { propertyId: 2, propertyName: 'Noise', propertyType: 'TEXT', value: 'no' },
    ] });
    return null;
  } });
  const [monitoring, properties] = await withSyntheticTenant(syntheticTenant('focused-bulk'), async () => [
    await reportDevicesBulk({ devices: [{ deviceId: 1 }], dataType: 'monitoring' }),
    await reportDevicesBulk({
      devices: [{ deviceId: 1 }], dataType: 'customProperties', propertyNames: ['important'],
    }),
  ]);
  assert.deepEqual(monitoring, [{
    deviceId: 1, serviceCount: 2, statusCounts: { Normal: 1, Failed: 1 },
    attentionServiceCount: 1,
    attentionServices: [{ serviceId: 2, moduleName: 'Attention', stateStatus: 'Failed' }],
  }]);
  assert.deepEqual(properties, [{
    deviceId: 1, propertyCount: 2, matchedPropertyCount: 1,
    properties: [{ propertyId: 1, propertyName: 'Important', propertyType: 'TEXT', value: 'yes' }],
  }]);
});

it('defaults explicit full organization reports to five devices', async () => {
  boundary = installContractFetch({ responder(call) {
    if (call.path.endsWith('/devices')) {
      return jsonResponse({ data: [{ deviceId: 1 }], pageNumber: 1, pageSize: 5, totalItems: 1, totalPages: 1 });
    }
    if (call.path.endsWith('/assets')) return jsonResponse({ data: { _extra: { raw: true } } });
    return null;
  } });
  const result = await withSyntheticTenant(syntheticTenant('bounded-full-assets'), () =>
    reportDevicesForOrg({ orgUnitId: 7, dataType: 'assets', detailLevel: 'full' }));
  const deviceCall = boundary.calls.find(({ path }) => path.endsWith('/devices'));
  assert.equal(deviceCall.query.pageSize, '5');
  assert.equal(result.pageSize, 5);
  assert.equal(result.data[0].data._extra.raw, true);
});
