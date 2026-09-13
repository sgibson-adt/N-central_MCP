import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { installContractFetch, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import {
  getDevice, getDeviceAssets, getDeviceLifecycle, getDeviceStatus, listDeviceNotes, searchDevices,
} from '../../../src/operations/devices.js';

let boundary;
afterEach(() => boundary?.restore());

describe('device operation adapters', () => {
  it('routes global and org-scoped searches with filters', async () => {
    boundary = installContractFetch();
    await withSyntheticTenant(syntheticTenant('devices'), async () => {
      await searchDevices({ filterId: 7, pageSize: 1000 });
      await searchDevices({ orgUnitId: 42, select: 'longName==workstation' });
    });
    const calls = boundary.calls.filter((call) => !call.path.startsWith('/api/auth/'));
    assert.deepEqual(calls.map((call) => call.path), ['/api/devices', '/api/org-units/42/devices']);
    assert.deepEqual(calls[0].query, { filterId: '7', pageSize: '1000' });
    assert.deepEqual(calls[1].query, { select: 'longName==workstation' });
  });

  it('routes device detail, status, assets, and lifecycle reads', async () => {
    boundary = installContractFetch();
    await withSyntheticTenant(syntheticTenant('device-detail'), async () => {
      await getDevice('device-1');
      await getDeviceStatus('device-1');
      await getDeviceAssets('device-1');
      await getDeviceLifecycle('device-1');
      await listDeviceNotes('device-1');
    });
    assert.deepEqual(boundary.calls.slice(1).map((call) => call.path), [
      '/api/devices/device-1',
      '/api/devices/device-1/service-monitor-status',
      '/api/devices/device-1/assets',
      '/api/devices/device-1/assets/lifecycle-info',
      '/api/devices/device-1/notes',
    ]);
  });
});
