import { it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installContractFetch, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import { createServiceOrg, createCustomer, createSite, updateOrganizationLimits } from '../../../src/operations/organizations.js';

let boundary; afterEach(() => boundary?.restore());
it('routes organization creation and limit updates with preview site metadata', async () => {
  boundary = installContractFetch();
  await withSyntheticTenant(syntheticTenant('org-admin'), async () => {
    await createServiceOrg({ soName: 'SO' });
    await createCustomer('1', { customerName: 'C' });
    await createSite('2', { siteName: 'S' });
    await updateOrganizationLimits('2', { maxDevices: 5 });
  });
  assert.deepEqual(boundary.calls.slice(1).map((c) => `${c.method} ${c.path}`), [
    'POST /api/service-orgs', 'POST /api/service-orgs/1/customers', 'POST /api/customers/2/sites', 'PATCH /api/org-units/2/limits',
  ]);
  assert.equal(createSite.lifecycle, 'preview');
});
