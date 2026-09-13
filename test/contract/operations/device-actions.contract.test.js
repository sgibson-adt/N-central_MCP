import { it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installContractFetch, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import {
  createDevice, deleteDevice, performWindowsServiceAction, getRemoteControlType,
  createRemoteControlTask, getApplianceTask, updateDeviceLifecycle, patchDeviceLifecycle,
} from '../../../src/operations/devices.js';

let boundary; afterEach(() => boundary?.restore());
it('routes device lifecycle, service, remote-control, and appliance actions', async () => {
  boundary = installContractFetch();
  await withSyntheticTenant(syntheticTenant('actions'), async () => {
    await createDevice({ customerId: 1 }); await deleteDevice('2', true);
    await updateDeviceLifecycle('2', { assetTag: 'full' });
    await patchDeviceLifecycle('2', { assetTag: 'partial' });
    await performWindowsServiceAction('2', { action: 'restart', serviceName: 'Spooler' });
    await getRemoteControlType('2'); await createRemoteControlTask('2', { type: 'take-control' });
    await getApplianceTask('3');
  });
  assert.deepEqual(boundary.calls.slice(1).map((c) => `${c.method} ${c.path}`), [
    'POST /api/device', 'DELETE /api/devices/2', 'PUT /api/devices/2/assets/lifecycle-info',
    'PATCH /api/devices/2/assets/lifecycle-info', 'POST /api/devices/2/services/actions',
    'GET /api/devices/2/remote-control-type', 'POST /api/devices/2/remote-control-task', 'GET /api/appliance-tasks/3',
  ]);
});
