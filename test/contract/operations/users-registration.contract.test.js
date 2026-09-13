import { it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installContractFetch, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import {
  listUsers, listUserRoles, getUserRole, listAccessGroups, getAccessGroup,
  createUserRole, createAccessGroup, createDeviceAccessGroup,
} from '../../../src/operations/users.js';
import {
  getRegistrationToken, getDeviceActivationKey, getSoftwareInstallers, generateSoftwareDownloadLink,
} from '../../../src/operations/registration.js';
import { administrationTools } from '../../../src/tools/administration.js';

let boundary; afterEach(() => boundary?.restore());
it('routes users, roles, access groups, tokens, activation, and installers', async () => {
  boundary = installContractFetch();
  await withSyntheticTenant(syntheticTenant('admin'), async () => {
    await listUsers('1'); await listUserRoles('1'); await getUserRole('1', '2');
    await listAccessGroups('1'); await getAccessGroup('2');
    await createUserRole('1', { roleName: 'r' }); await createAccessGroup('1', { groupName: 'g' });
    await createDeviceAccessGroup('1', { groupName: 'devices' });
    await getRegistrationToken('site', '3'); await getRegistrationToken('orgUnit', '3');
    await getRegistrationToken('customer', '3'); await getDeviceActivationKey('4');
    await getSoftwareInstallers('5', { softwareType: 'agent' });
    await generateSoftwareDownloadLink('5', { softwareId: 6 });
  });
  assert.deepEqual(boundary.calls.slice(1).map((c) => c.path), [
    '/api/org-units/1/users', '/api/org-units/1/user-roles', '/api/org-units/1/user-roles/2',
    '/api/org-units/1/access-groups', '/api/access-groups/2', '/api/org-units/1/user-roles',
    '/api/org-units/1/access-groups', '/api/org-units/1/device-access-groups',
    '/api/sites/3/registration-token', '/api/org-units/3/registration-token',
    '/api/customers/3/registration-token', '/api/devices/4/activation-key',
    '/api/customers/5/software/installers', '/api/customers/5/software/installers',
  ]);
});

it('preserves role identifiers and pagination while rejecting invalid pages before I/O', async () => {
  for (const name of ['list_user_roles', 'get_user_role', 'create_user_role', 'get_registration_token']) {
    assert.match(administrationTools.find((tool) => tool.name === name).description, /PREVIEW/, name);
  }
  boundary = installContractFetch();
  await withSyntheticTenant(syntheticTenant('roles'), async () => {
    await listUserRoles('17', {
      pageNumber: 4, pageSize: -1, select: 'roleName==Ops', sortBy: 'roleName', sortOrder: 'asc',
    });
    await getUserRole('17', '29');
    const callsBeforeInvalid = boundary.calls.length;
    await assert.rejects(() => listUserRoles('17', { pageSize: 1001 }), /pageSize/);
    assert.equal(boundary.calls.length, callsBeforeInvalid);
  });
  const calls = boundary.calls.filter((call) => !call.path.startsWith('/api/auth/'));
  assert.equal(calls[0].path, '/api/org-units/17/user-roles');
  assert.deepEqual(calls[0].query, {
    pageNumber: '4', pageSize: '-1', select: 'roleName==Ops', sortBy: 'roleName', sortOrder: 'asc',
  });
  assert.equal(calls[1].path, '/api/org-units/17/user-roles/29');
});
