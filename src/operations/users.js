// @ts-check
import { apiGet, apiPost, sanitizePathParam } from '../client.js';
import { fetchOrPaginate, PAGINATION_POLICIES } from '../shared.js';

export const listUsers = (orgUnitId, args = {}) => fetchOrPaginate(`/api/org-units/${sanitizePathParam(orgUnitId)}/users`, {}, args, PAGINATION_POLICIES.allowAll);
export const listUserRoles = (orgUnitId, args = {}) => fetchOrPaginate(`/api/org-units/${sanitizePathParam(orgUnitId)}/user-roles`, {}, args, PAGINATION_POLICIES.allowAll);
export const getUserRole = (orgUnitId, roleId) => apiGet(`/api/org-units/${sanitizePathParam(orgUnitId)}/user-roles/${sanitizePathParam(roleId)}`);
export const listAccessGroups = (orgUnitId, args = {}) => fetchOrPaginate(`/api/org-units/${sanitizePathParam(orgUnitId)}/access-groups`, {}, args, PAGINATION_POLICIES.allowAll);
export const getAccessGroup = (accessGroupId) => apiGet(`/api/access-groups/${sanitizePathParam(accessGroupId)}`);
export const createUserRole = (orgUnitId, body) => apiPost(`/api/org-units/${sanitizePathParam(orgUnitId)}/user-roles`, body);
export const createAccessGroup = (orgUnitId, body) => apiPost(`/api/org-units/${sanitizePathParam(orgUnitId)}/access-groups`, body);
export const createDeviceAccessGroup = (orgUnitId, body) => apiPost(`/api/org-units/${sanitizePathParam(orgUnitId)}/device-access-groups`, body);
