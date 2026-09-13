// @ts-check
/** Contract-shaped organization read adapters. */

import { apiGet, apiPatch, apiPost, sanitizePathParam } from '../client.js';
import { fetchOrPaginate, fetchOrSearchByName, PAGINATION_POLICIES } from '../shared.js';

export const ORGANIZATION_TYPES = Object.freeze(['service-org', 'customer', 'site', 'org-unit']);
const ORGANIZATION_NAME_FIELDS = Object.freeze({
  'service-org': Object.freeze(['soName', 'name']),
  customer: Object.freeze(['customerName', 'name']),
  site: Object.freeze(['siteName', 'name']),
  'org-unit': Object.freeze(['orgUnitName', 'name']),
});

/** @param {string} organizationType @param {Record<string, any>} [args] */
export function searchOrganizations(organizationType, args = {}) {
  const parentId = args.parentId;
  let path;
  switch (organizationType) {
    case 'service-org': path = '/api/service-orgs'; break;
    case 'customer': path = parentId == null ? '/api/customers' : `/api/service-orgs/${sanitizePathParam(parentId)}/customers`; break;
    case 'site': path = parentId == null ? '/api/sites' : `/api/customers/${sanitizePathParam(parentId)}/sites`; break;
    case 'org-unit': path = '/api/org-units'; break;
    default: throw new Error(`Unknown organizationType: ${organizationType}`);
  }
  return fetchOrSearchByName(
    path, {}, args, ORGANIZATION_NAME_FIELDS[organizationType], PAGINATION_POLICIES.allowAll,
  );
}

/** @param {string} organizationType @param {string | number} id */
export function getOrganization(organizationType, id) {
  const safeId = sanitizePathParam(id);
  switch (organizationType) {
    case 'service-org': return apiGet(`/api/service-orgs/${safeId}`);
    case 'customer': return apiGet(`/api/customers/${safeId}`);
    case 'site': return apiGet(`/api/sites/${safeId}`);
    case 'org-unit': return apiGet(`/api/org-units/${safeId}`);
    default: throw new Error(`Unknown organizationType: ${organizationType}`);
  }
}

/** @param {string | number} orgUnitId @param {Record<string, any>} [args] */
export function listOrganizationChildren(orgUnitId, args = {}) {
  return fetchOrPaginate(
    `/api/org-units/${sanitizePathParam(orgUnitId)}/children`, {}, args, PAGINATION_POLICIES.allowAll,
  );
}

/** @param {string | number} orgUnitId */
export const getOrganizationLimits = (orgUnitId) =>
  apiGet(`/api/org-units/${sanitizePathParam(orgUnitId)}/limits`);

/** @param {string | number} orgUnitId @param {Record<string, any>} [args] */
export const listOrganizationCustomProperties = (orgUnitId, args = {}) =>
  fetchOrPaginate(
    `/api/org-units/${sanitizePathParam(orgUnitId)}/custom-properties`, {}, args, PAGINATION_POLICIES.allowAll,
  );

export const createServiceOrg = (body) => apiPost('/api/service-orgs', body);
export const createCustomer = (soId, body) => apiPost(`/api/service-orgs/${sanitizePathParam(soId)}/customers`, body);
export const createSite = (customerId, body) => apiPost(`/api/customers/${sanitizePathParam(customerId)}/sites`, body);
createSite.lifecycle = 'preview';
export const updateOrganizationLimits = (orgUnitId, body) => apiPatch(`/api/org-units/${sanitizePathParam(orgUnitId)}/limits`, body);
