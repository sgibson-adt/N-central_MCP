// @ts-check
import { apiGet, apiPut, sanitizePathParam } from '../client.js';
import { fetchOrPaginate, PAGINATION_POLICIES } from '../shared.js';

const devicePath = (deviceId, propertyId = null) => `/api/devices/${sanitizePathParam(deviceId)}/custom-properties${propertyId == null ? '' : `/${sanitizePathParam(propertyId)}`}`;
const orgPath = (orgUnitId, propertyId = null) => `/api/org-units/${sanitizePathParam(orgUnitId)}/custom-properties${propertyId == null ? '' : `/${sanitizePathParam(propertyId)}`}`;
export const listDeviceCustomProperties = (deviceId) => apiGet(devicePath(deviceId));
export const getDeviceCustomProperty = (deviceId, propertyId) => apiGet(devicePath(deviceId, propertyId));
export const listOrgCustomProperties = (orgUnitId, args = {}) => fetchOrPaginate(orgPath(orgUnitId), {}, args, PAGINATION_POLICIES.allowAll);
export const getOrgUnitProperty = (orgUnitId, propertyId) => apiGet(orgPath(orgUnitId, propertyId));
export const getOrgCustomPropertyDefault = (orgUnitId, propertyId) => apiGet(`/api/org-units/${sanitizePathParam(orgUnitId)}/org-custom-property-defaults/${sanitizePathParam(propertyId)}`);
export const getDeviceDefaultCustomProperty = (orgUnitId, propertyId) => apiGet(`${orgPath(orgUnitId)}/device-custom-property-defaults/${sanitizePathParam(propertyId)}`);
export const updateDeviceCustomProperty = (deviceId, propertyId, body) => apiPut(devicePath(deviceId, propertyId), { propertyId: String(propertyId), ...body });
export const updateOrgUnitCustomProperty = (orgUnitId, propertyId, body) => apiPut(orgPath(orgUnitId, propertyId), { propertyId: String(propertyId), ...body });
export const updateOrgCustomPropertyDefault = (orgUnitId, body) => apiPut(`/api/org-units/${sanitizePathParam(orgUnitId)}/org-custom-property-defaults`, body);
