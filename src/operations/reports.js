// @ts-check
/** Contract-shaped monitoring and general report read adapters. */

import { apiGet, apiPost, sanitizePathParam } from '../client.js';
import { fetchOrPaginate, PAGINATION_POLICIES } from '../shared.js';
import { mapConcurrent } from '../paginator.js';
import { getDeviceAssets, getDeviceStatus } from './devices.js';
import { listDeviceCustomProperties } from './custom-properties.js';
import { searchDevices } from './devices.js';
import { getOrganization, searchOrganizations } from './organizations.js';
import { listUsers } from './users.js';

export function deduplicateUsers(perOrgUsers) {
  const seen = new Set();
  return perOrgUsers.flatMap((batch) => Array.isArray(batch) ? batch : []).filter((user) => {
    const id = user.userId;
    if (id == null || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function buildDeviceCountByOrg(devices, siteParentMap) {
  const counts = {};
  for (const device of devices) {
    const orgId = device.orgUnitId || device.customerId;
    if (!orgId) continue;
    counts[orgId] = (counts[orgId] || 0) + 1;
    const parentId = siteParentMap[orgId];
    if (parentId) counts[parentId] = (counts[parentId] || 0) + 1;
  }
  return counts;
}

/** @param {string | number} orgUnitId @param {Record<string, any>} [args] */
export const listActiveIssues = (orgUnitId, args = {}) =>
  fetchOrPaginate(
    `/api/org-units/${sanitizePathParam(orgUnitId)}/active-issues`, {}, args, PAGINATION_POLICIES.activeIssues,
  );

/** @param {Record<string, any>} [args] */
export function listDeviceFilters(args = {}) {
  const params = args.viewScope == null ? {} : { viewScope: args.viewScope };
  return fetchOrPaginate('/api/device-filters', params, args, PAGINATION_POLICIES.allowAll);
}

/** @param {string | number} reportId */
export const getReport = (reportId) => apiGet(`/api/report/${sanitizePathParam(reportId)}`);

export const generatePatchComparisonReport = (body) => apiPost('/api/report/patch-comparison', body);
generatePatchComparisonReport.writeScope = 'write';

export async function reportDevicesBulk({ devices, dataType, concurrency = 5 }) {
  const readers = { assets: getDeviceAssets, monitoring: getDeviceStatus, customProperties: listDeviceCustomProperties };
  const read = readers[dataType];
  if (!read) throw new Error(`Unknown dataType: ${dataType}`);
  return mapConcurrent(devices.slice(0, 10_000), (device) => read(device.deviceId ?? device.id), Math.min(5, Math.max(1, concurrency)));
}

export async function reportDevicesForOrg({ orgUnitId, dataType, concurrency }) {
  const devices = /** @type {any[]} */ (await searchDevices({ orgUnitId, all: true }));
  return reportDevicesBulk({ devices, dataType, concurrency });
}

export async function reportAllUsersByServiceOrg({ soId }) {
  const customers = /** @type {any[]} */ (await searchOrganizations('customer', { parentId: soId, all: true }));
  const orgIds = [soId, ...customers.slice(0, 8).map((c) => c.customerId ?? c.id)];
  const perOrgUsers = await mapConcurrent(orgIds, (orgId) => listUsers(orgId, { all: true }), 5);
  return deduplicateUsers(perOrgUsers);
}

export async function reportDevicesByServiceOrg({ soId }) {
  const customers = /** @type {any[]} */ (await searchOrganizations('customer', { parentId: soId, all: true }));
  return mapConcurrent(customers.slice(0, 9), (customer) => searchDevices({ orgUnitId: customer.customerId ?? customer.id, all: true }), 5);
}

/** @param {{customerId?: string | number}} [args] */
export async function reportCustomerSiteSummary({ customerId } = {}) {
  const customers = customerId == null
    ? /** @type {any[]} */ (await searchOrganizations('customer', { all: true }))
    : [await getOrganization('customer', customerId)];
  return mapConcurrent(customers.slice(0, 9), async (customer) => ({
    customer,
    sites: await searchOrganizations('site', { parentId: customer.customerId ?? customer.id, all: true }),
  }), 5);
}

/** @param {{soId?: string | number}} [args] */
export async function reportOrgHierarchy({ soId } = {}) {
  const serviceOrgs = soId == null
    ? /** @type {any[]} */ (await searchOrganizations('service-org', { all: true }))
    : [await getOrganization('service-org', soId)];
  return mapConcurrent(serviceOrgs.slice(0, 9), async (serviceOrg) => ({
    serviceOrg,
    customers: await searchOrganizations('customer', { parentId: serviceOrg.soId ?? serviceOrg.id, all: true }),
  }), 5);
}
