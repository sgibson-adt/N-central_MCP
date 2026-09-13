import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { installContractFetch, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import { listDeviceScheduledTasks, getScheduledTask, getScheduledTaskStatus } from '../../../src/operations/scheduled-tasks.js';
import { getReport, listActiveIssues, listDeviceFilters } from '../../../src/operations/reports.js';

let boundary;
afterEach(() => boundary?.restore());

describe('monitoring, scheduled-task, and report adapters', () => {
  it('routes active issue and device-filter search inputs', async () => {
    boundary = installContractFetch();
    await withSyntheticTenant(syntheticTenant('monitoring'), async () => {
      await listActiveIssues('8', { pageSize: -1, select: 'severity==critical' });
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
});
