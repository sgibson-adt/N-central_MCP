// @ts-check
import * as organizations from '../operations/organizations.js';
import * as properties from '../operations/custom-properties.js';
import * as users from '../operations/users.js';
import { getRegistrationToken } from '../operations/registration.js';
import { defineTool, id, objectInput } from './helpers.js';

const orgUnitId = id('Organization unit identifier.');
const propertyId = id('Custom-property identifier.');
const object = (properties, required = []) => ({
  type: 'object', additionalProperties: false, properties, ...(required.length ? { required } : {}),
});
const contactFields = {
  contactFirstName: { type: 'string' }, contactLastName: { type: 'string' },
  externalId: { type: 'string' }, phone: { type: 'string' }, contactTitle: { type: 'string' },
  contactEmail: { type: 'string' }, contactPhone: { type: 'string' },
  contactPhoneExt: { type: ['string', 'null'] }, contactDepartment: { type: 'string' },
  street1: { type: 'string' }, street2: { type: 'string' }, city: { type: 'string' },
  stateProv: { type: 'string' }, country: { type: 'string', minLength: 2, maxLength: 2 },
  postalCode: { type: 'string' },
};
const limitsBody = {
  type: 'array', minItems: 1,
  items: object({ limitName: { type: 'string' }, value: { type: 'integer' } }, ['limitName', 'value']),
};
const serviceOrgBody = object({ ...contactFields, soName: { type: 'string' } }, ['soName']);
const customerBody = object({
  ...contactFields, customerName: { type: 'string' }, licenseType: { type: 'string', default: 'Professional' },
}, ['customerName']);
const siteBody = object({
  ...contactFields, siteName: { type: 'string' }, licenseType: { type: 'string', default: 'Professional' },
}, ['siteName']);
const customPropertyBody = object({ value: { type: 'string', description: 'New custom-property value.' } });
const propagationTypes = [
  'NO_PROPAGATION', 'SERVICE_ORGANIZATION_ONLY', 'SERVICE_ORGANIZATION_AND_CUSTOMER_AND_SITE',
  'SERVICE_ORGANIZATION_AND_CUSTOMER', 'SERVICE_ORGANIZATION_AND_SITE', 'CUSTOMER_AND_SITE',
  'CUSTOMER_ONLY', 'SITE_ONLY', 'SERVICE_AND_ORGANIZATION', 'SERVICE_AND_ORGANIZATION_AND_DEVICE',
  'SERVICE_AND_DEVICE', 'ORGANIZATION_AND_DEVICE', 'ORGANIZATION_ONLY', 'DEVICE_ONLY',
];
const customPropertyDefaultBody = object({
  propagate: { type: 'boolean' }, propertyId: { type: 'integer' }, propertyName: { type: 'string' },
  propagationType: { type: 'string', enum: propagationTypes }, defaultValue: { type: 'string' },
  selectedOrgUnitIds: { type: 'array', items: { type: 'integer' } },
  enumeratedValueList: { type: 'array', items: { type: 'string' } },
});
const userRoleBody = object({
  roleName: { type: 'string' }, description: { type: 'string', minLength: 0, maxLength: 255 },
  permissionIds: { type: 'array', items: { type: 'string' } },
  userIds: { type: 'array', items: { type: 'string' } },
}, ['roleName', 'description', 'permissionIds']);
const accessGroupFields = {
  groupName: { type: 'string' }, groupDescription: { type: 'string' },
  userIds: { type: 'array', items: { type: 'string' } },
};
const accessGroupBody = object({
  ...accessGroupFields, orgUnitIds: { type: 'array', items: { type: 'string' } },
  autoIncludeNewOrgUnits: { type: 'string', enum: ['true', 'false'] },
}, ['groupName', 'groupDescription']);
const deviceAccessGroupBody = object({
  ...accessGroupFields, deviceIds: { type: 'array', items: { type: 'string' } },
}, ['groupName', 'groupDescription']);
const page = { pageNumber: { type: 'integer', minimum: 1 }, pageSize: { type: 'integer', minimum: -1, maximum: 1000 }, select: { type: 'string' }, sortBy: { type: 'string' }, sortOrder: { type: 'string' }, all: { type: 'boolean' } };
const D = (name, description, propertiesMap, required, operations, writeScope, run) => defineTool({ name, description, inputSchema: objectInput(propertiesMap, required), operations, toolset: 'administration', writeScope, run });

export const administrationTools = Object.freeze([
  D('get_org_unit_limits', 'Retrieve licensing and usage limits for one organization unit.', { orgUnitId }, ['orgUnitId'], ['GET /api/org-units/{orgUnitId}/limits'], 'read', (a) => organizations.getOrganizationLimits(a.orgUnitId)),
  D('update_org_unit_limits', 'Patch selected licensing and usage limits for one organization unit.', { orgUnitId, body: limitsBody }, ['orgUnitId', 'body'], ['PATCH /api/org-units/{orgUnitId}/limits'], 'write', (a) => organizations.updateOrganizationLimits(a.orgUnitId, a.body)),
  D('create_service_org', 'Create a service organization with its required contact details.', { body: serviceOrgBody }, ['body'], ['POST /api/service-orgs'], 'write', (a) => organizations.createServiceOrg(a.body)),
  D('create_customer', 'Create a customer beneath an explicitly identified service organization.', { soId: id('Service organization identifier.'), body: customerBody }, ['soId', 'body'], ['POST /api/service-orgs/{soId}/customers'], 'write', (a) => organizations.createCustomer(a.soId, a.body)),
  D('create_site', 'PREVIEW: Create a site through the customer-site API; its contract may change.', { customerId: id('Customer identifier.'), body: siteBody }, ['customerId', 'body'], ['POST /api/customers/{customerId}/sites'], 'write', (a) => organizations.createSite(a.customerId, a.body)),
  D('list_device_custom_properties', 'List custom-property values assigned to one device.', { deviceId: id('Device identifier.') }, ['deviceId'], ['GET /api/devices/{deviceId}/custom-properties'], 'read', (a) => properties.listDeviceCustomProperties(a.deviceId)),
  D('get_device_custom_property', 'Retrieve one custom property assigned to one device.', { deviceId: id('Device identifier.'), propertyId }, ['deviceId', 'propertyId'], ['GET /api/devices/{deviceId}/custom-properties/{propertyId}'], 'read', (a) => properties.getDeviceCustomProperty(a.deviceId, a.propertyId)),
  D('list_org_custom_properties', 'List organization custom properties with bounded pagination.', { orgUnitId, ...page }, ['orgUnitId'], ['GET /api/org-units/{orgUnitId}/custom-properties'], 'read', (a) => properties.listOrgCustomProperties(a.orgUnitId, a)),
  D('get_org_unit_property', 'Retrieve one organization-unit custom property.', { orgUnitId, propertyId }, ['orgUnitId', 'propertyId'], ['GET /api/org-units/{orgUnitId}/custom-properties/{propertyId}'], 'read', (a) => properties.getOrgUnitProperty(a.orgUnitId, a.propertyId)),
  D('get_org_custom_property_default', 'Retrieve one organization custom-property default.', { orgUnitId, propertyId }, ['orgUnitId', 'propertyId'], ['GET /api/org-units/{orgUnitId}/org-custom-property-defaults/{propertyId}'], 'read', (a) => properties.getOrgCustomPropertyDefault(a.orgUnitId, a.propertyId)),
  D('get_device_default_custom_property', 'Retrieve one inherited device custom-property default.', { orgUnitId, propertyId }, ['orgUnitId', 'propertyId'], ['GET /api/org-units/{orgUnitId}/custom-properties/device-custom-property-defaults/{propertyId}'], 'read', (a) => properties.getDeviceDefaultCustomProperty(a.orgUnitId, a.propertyId)),
  D('update_device_custom_property', 'Update one device custom-property value using its existing schema fields.', { deviceId: id('Device identifier.'), propertyId, body: customPropertyBody }, ['deviceId', 'propertyId', 'body'], ['PUT /api/devices/{deviceId}/custom-properties/{propertyId}'], 'write', (a) => properties.updateDeviceCustomProperty(a.deviceId, a.propertyId, a.body)),
  D('update_org_unit_custom_property', 'Update one organization-unit custom-property value.', { orgUnitId, propertyId, body: customPropertyBody }, ['orgUnitId', 'propertyId', 'body'], ['PUT /api/org-units/{orgUnitId}/custom-properties/{propertyId}'], 'write', (a) => properties.updateOrgUnitCustomProperty(a.orgUnitId, a.propertyId, a.body)),
  D('update_org_custom_property_default', 'Update and optionally propagate an organization custom-property default.', { orgUnitId, body: customPropertyDefaultBody }, ['orgUnitId', 'body'], ['PUT /api/org-units/{orgUnitId}/org-custom-property-defaults'], 'write', (a) => properties.updateOrgCustomPropertyDefault(a.orgUnitId, a.body)),
  D('list_users', 'List users visible beneath one organization unit.', { orgUnitId, ...page }, ['orgUnitId'], ['GET /api/org-units/{orgUnitId}/users'], 'read', (a) => users.listUsers(a.orgUnitId, a)),
  D('list_user_roles', 'PREVIEW: List user roles for one organization unit; this contract may change.', { orgUnitId, ...page }, ['orgUnitId'], ['GET /api/org-units/{orgUnitId}/user-roles'], 'read', (a) => users.listUserRoles(a.orgUnitId, a)),
  D('get_user_role', 'PREVIEW: Retrieve one user role by organization and role IDs; this contract may change.', { orgUnitId, userRoleId: id('User-role identifier.') }, ['orgUnitId', 'userRoleId'], ['GET /api/org-units/{orgUnitId}/user-roles/{userRoleId}'], 'read', (a) => users.getUserRole(a.orgUnitId, a.userRoleId)),
  D('list_access_groups', 'List access groups assigned beneath one organization unit.', { orgUnitId, ...page }, ['orgUnitId'], ['GET /api/org-units/{orgUnitId}/access-groups'], 'read', (a) => users.listAccessGroups(a.orgUnitId, a)),
  D('get_access_group', 'Retrieve one access group by its identifier.', { accessGroupId: id('Access-group identifier.') }, ['accessGroupId'], ['GET /api/access-groups/{accessGroupId}'], 'read', (a) => users.getAccessGroup(a.accessGroupId)),
  D('create_user_role', 'PREVIEW: Create a user role beneath one organization unit; this contract may change.', { orgUnitId, body: userRoleBody }, ['orgUnitId', 'body'], ['POST /api/org-units/{orgUnitId}/user-roles'], 'write', (a) => users.createUserRole(a.orgUnitId, a.body)),
  D('create_access_group', 'Create an organization-unit access group.', { orgUnitId, body: accessGroupBody }, ['orgUnitId', 'body'], ['POST /api/org-units/{orgUnitId}/access-groups'], 'write', (a) => users.createAccessGroup(a.orgUnitId, a.body)),
  D('create_device_access_group', 'Create a device-scoped access group beneath one organization unit.', { orgUnitId, body: deviceAccessGroupBody }, ['orgUnitId', 'body'], ['POST /api/org-units/{orgUnitId}/device-access-groups'], 'write', (a) => users.createDeviceAccessGroup(a.orgUnitId, a.body)),
  D('get_registration_token', 'Retrieve a sensitive registration token. The site and customer variants are PREVIEW and may change; the organization-unit variant is stable.', { entityType: { type: 'string', enum: ['site', 'orgUnit', 'customer'] }, id: id('Entity identifier.') }, ['entityType', 'id'], ['GET /api/sites/{siteId}/registration-token', 'GET /api/org-units/{orgUnitId}/registration-token', 'GET /api/customers/{customerId}/registration-token'], 'read', (a) => getRegistrationToken(a.entityType, a.id)),
]);
