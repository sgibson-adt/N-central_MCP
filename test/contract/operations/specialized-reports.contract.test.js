import { it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installContractFetch, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import { generatePatchComparisonReport, reportDevicesBulk } from '../../../src/operations/reports.js';

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
