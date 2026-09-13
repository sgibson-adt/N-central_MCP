import { it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installContractFetch, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import { createScheduledTask } from '../../../src/operations/scheduled-tasks.js';
import {
  getMaintenanceWindows, createMaintenanceWindows, updateMaintenanceWindows, deleteMaintenanceWindows,
} from '../../../src/operations/maintenance-windows.js';

let boundary; afterEach(() => boundary?.restore());
it('preserves explicit nested scheduled-task and maintenance-window payloads', async () => {
  boundary = installContractFetch();
  await withSyntheticTenant(syntheticTenant('maintenance'), async () => {
    await createScheduledTask({ name: 'run', credential: { username: 'u' }, parameters: [{ name: 'x', value: 'y' }] });
    await getMaintenanceWindows('1');
    await createMaintenanceWindows({ deviceIds: [1], maintenanceWindows: [{ scheduleId: 2 }] });
    await updateMaintenanceWindows({ maintenanceWindows: [{ scheduleId: 2 }] });
    await deleteMaintenanceWindows({ scheduleIds: [2] });
  });
  assert.deepEqual(boundary.calls.slice(1).map((c) => c.method), ['POST', 'GET', 'POST', 'PUT', 'DELETE']);
  assert.deepEqual(boundary.calls[3].body, { deviceIDs: [1], maintenanceWindows: [{ scheduleId: 2 }] });
  assert.deepEqual(boundary.calls.at(-1).body, { scheduleIds: [2] });
});
