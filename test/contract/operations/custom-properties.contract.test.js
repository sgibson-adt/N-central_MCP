import { it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installContractFetch, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import {
  getDeviceCustomProperty, getDeviceDefaultCustomProperty, getOrgCustomPropertyDefault,
  getOrgUnitProperty, listDeviceCustomProperties, listOrgCustomProperties,
  updateDeviceCustomProperty, updateOrgCustomPropertyDefault, updateOrgUnitCustomProperty,
} from '../../../src/operations/custom-properties.js';

let boundary; afterEach(() => boundary?.restore());
it('routes custom-property value/default reads and schema-shaped updates', async () => {
  boundary = installContractFetch();
  await withSyntheticTenant(syntheticTenant('properties'), async () => {
    await listDeviceCustomProperties('1'); await getDeviceCustomProperty('1', '2');
    await listOrgCustomProperties('3'); await getOrgUnitProperty('3', '4');
    await getOrgCustomPropertyDefault('3', '4'); await getDeviceDefaultCustomProperty('3', '4');
    await updateDeviceCustomProperty('1', '2', { propertyName: 'Tier', propertyType: 'TEXT', value: 'gold' });
    await updateOrgUnitCustomProperty('3', '4', { value: 'bronze' });
    await updateOrgCustomPropertyDefault('3', { propertyId: 4, defaultValue: 'silver' });
  });
  assert.deepEqual(boundary.calls.slice(1).map((c) => `${c.method} ${c.path}`), [
    'GET /api/devices/1/custom-properties', 'GET /api/devices/1/custom-properties/2',
    'GET /api/org-units/3/custom-properties', 'GET /api/org-units/3/custom-properties/4',
    'GET /api/org-units/3/org-custom-property-defaults/4',
    'GET /api/org-units/3/custom-properties/device-custom-property-defaults/4',
    'PUT /api/devices/1/custom-properties/2', 'PUT /api/org-units/3/custom-properties/4',
    'PUT /api/org-units/3/org-custom-property-defaults',
  ]);
});
