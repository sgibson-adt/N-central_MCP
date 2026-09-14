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

/** @param {[string, unknown][]} entries */
const compactObject = (entries) => Object.fromEntries(
  entries.filter(([, value]) => value !== undefined && value !== null),
);

/**
 * @param {Record<string, any>} device
 * @param {unknown} result
 * @param {string} dataType
 * @param {{propertyNames?: string[], includeSoftware?: boolean}} [options]
 */
export function compactDeviceReportResult(device, result, dataType, options = {}) {
  const { propertyNames, includeSoftware } = options;
  const envelope = result && typeof result === 'object' ? /** @type {Record<string, any>} */ (result) : {};
  const payload = envelope.data ?? result;
  if (dataType === 'monitoring') {
    const services = Array.isArray(payload) ? payload : [];
    const statusCounts = services.reduce((counts, service) => {
      const status = String(service?.stateStatus ?? 'unknown');
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {});
    const attentionServices = services.filter((service) => !['normal', 'ok', 'healthy', 'clear']
      .includes(String(service?.stateStatus ?? '').trim().toLocaleLowerCase('en-US')));
    return compactObject([
      ['deviceId', device?.deviceId ?? device?.id],
      ['deviceName', device?.longName ?? device?.deviceName ?? device?.name],
      ['serviceCount', services.length],
      ['statusCounts', statusCounts],
      ['attentionServiceCount', attentionServices.length],
      ['attentionServices', attentionServices.slice(0, 25).map((service) => compactObject([
        ['serviceId', service?.serviceId], ['serviceItemId', service?.serviceItemId],
        ['moduleName', service?.moduleName], ['stateStatus', service?.stateStatus],
        ['transitionTime', service?.transitionTime], ['lastScanTime', service?.lastScanTime],
        ['lastUpdate', service?.lastUpdate], ['taskId', service?.taskId],
      ]))],
    ]);
  }
  if (dataType === 'customProperties') {
    const properties = Array.isArray(payload) ? payload : [];
    const wanted = propertyNames?.length
      ? new Set(propertyNames.map((name) => name.trim().toLocaleLowerCase('en-US'))) : null;
    const selected = wanted
      ? properties.filter((property) => wanted.has(String(property?.propertyName ?? '').trim().toLocaleLowerCase('en-US')))
      : properties;
    return compactObject([
      ['deviceId', device?.deviceId ?? device?.id],
      ['deviceName', device?.longName ?? device?.deviceName ?? device?.name],
      ['propertyCount', properties.length],
      ['matchedPropertyCount', selected.length],
      ['properties', selected.map((property) => compactObject([
        ['propertyId', property?.propertyId], ['propertyName', property?.propertyName],
        ['propertyType', property?.propertyType], ['value', property?.value],
      ]))],
    ]);
  }
  const asset = payload && typeof payload === 'object' ? /** @type {Record<string, any>} */ (payload) : {};
  const assetDevice = asset.device && typeof asset.device === 'object' ? asset.device : {};
  const extra = asset._extra && typeof asset._extra === 'object' ? asset._extra : {};
  const extraDevice = extra.device && typeof extra.device === 'object' ? extra.device : {};
  const customer = extra.customer && typeof extra.customer === 'object' ? extra.customer : {};
  const os = asset.os && typeof asset.os === 'object' ? asset.os : {};
  const extraOs = extra.os && typeof extra.os === 'object' ? extra.os : {};
  const processor = asset.processor && typeof asset.processor === 'object' ? asset.processor : {};
  const computer = asset.computersystem && typeof asset.computersystem === 'object' ? asset.computersystem : {};
  const list = (value) => Array.isArray(value?.list) ? value.list : [];
  const applications = list(extra.application).map((application) => compactObject([
    ['name', application?.displayname], ['version', application?.version],
    ['publisher', application?.publisher], ['installationDate', application?.installationdate],
  ]));
  const physicalDrives = list(extra.physicaldrive).map((drive) => compactObject([
    ['capacity', drive?.capacity], ['model', drive?.modelnumber], ['serialNumber', drive?.serialnumber],
  ]));
  const logicalVolumes = list(extra.logicaldevice).map((volume) => compactObject([
    ['name', volume?.volumename], ['capacity', volume?.maxcapacity],
  ]));
  return compactObject([
    ['deviceId', device?.deviceId ?? device?.id ?? assetDevice.deviceid],
    ['deviceName', device?.longName ?? device?.deviceName ?? device?.name ?? assetDevice.longname],
    ['deviceClass', assetDevice.deviceclass], ['deleted', assetDevice.deleted],
    ['createdOn', extraDevice.createdon], ['assetTag', extraDevice.ncentralassettag],
    ['warrantyExpiryDate', extraDevice.warrantyexpirydate],
    ['customerId', customer.customerid ?? extraDevice.customerid],
    ['customerName', customer.customername],
    ['manufacturer', computer.manufacturer], ['model', computer.model],
    ['serialNumber', computer.serialnumber ?? extraOs.serialnumber],
    ['totalPhysicalMemory', computer.totalphysicalmemory],
    ['processorName', processor.name], ['processorCores', processor.numberofcores],
    ['processorCount', processor.numberofcpus],
    ['reportedOs', os.reportedos], ['osArchitecture', os.osarchitecture],
    ['osVersion', os.version], ['supportedOs', extraOs.supportedos],
    ['osInstallDate', extraOs.installdate], ['lastBootTime', extraOs.lastbootuptime],
    ['physicalDrives', physicalDrives.length ? physicalDrives : undefined],
    ['logicalVolumes', logicalVolumes.length ? logicalVolumes : undefined],
    ['applications', includeSoftware ? applications : undefined],
  ]);
}

export async function reportDevicesBulk({
  devices, dataType, concurrency = 5, detailLevel = 'compact', propertyNames, includeSoftware,
}) {
  const readers = { assets: getDeviceAssets, monitoring: getDeviceStatus, customProperties: listDeviceCustomProperties };
  const read = readers[dataType];
  if (!read) throw new Error(`Unknown dataType: ${dataType}`);
  return mapConcurrent(devices.slice(0, 10_000), async (device) => {
    const result = await read(device.deviceId ?? device.id);
    return detailLevel === 'full'
      ? result : compactDeviceReportResult(device, result, dataType, { propertyNames, includeSoftware });
  }, Math.min(5, Math.max(1, concurrency)));
}

export async function reportDevicesForOrg({
  orgUnitId, dataType, concurrency, detailLevel = 'compact', pageNumber = 1, pageSize, all = false,
  propertyNames, includeSoftware,
}) {
  const requestedPageSize = pageSize ?? (detailLevel === 'full' ? 5 : 25);
  const source = await searchDevices(all
    ? { orgUnitId, all: true }
    : { orgUnitId, pageNumber, pageSize: requestedPageSize });
  const envelope = source && typeof source === 'object' && !Array.isArray(source)
    ? /** @type {Record<string, any>} */ (source) : {};
  const devices = Array.isArray(source) ? source : (Array.isArray(envelope.data) ? envelope.data : []);
  const data = await reportDevicesBulk({
    devices, dataType, concurrency, detailLevel, propertyNames, includeSoftware,
  });
  const effectivePageNumber = all ? 1 : Number(envelope.pageNumber ?? pageNumber);
  const effectivePageSize = all ? devices.length : Number(envelope.pageSize ?? requestedPageSize);
  const totalItems = all ? devices.length : Number(envelope.totalItems ?? devices.length);
  const totalPages = all ? 1 : Number(
    envelope.totalPages ?? Math.max(1, Math.ceil(totalItems / Math.max(1, effectivePageSize))),
  );
  return {
    data, dataType, detailLevel,
    pageNumber: effectivePageNumber,
    pageSize: effectivePageSize,
    itemCount: data.length,
    totalItems,
    totalPages,
    hasNextPage: effectivePageNumber < totalPages,
  };
}

const compactUser = (user) => compactObject([
  ['userId', user?.userId], ['userName', user?.userName], ['fullName', user?.fullName],
  ['isEnabled', user?.isEnabled], ['isLocked', user?.isLocked],
  ['twoFactorEnabled', user?.twoFactorEnabled], ['apiOnlyUser', user?.apiOnlyUser],
  ['loggedInUser', user?.loggedInUser], ['currentSsoProvider', user?.currentSsoProvider],
  ['roleIds', user?.roleIds], ['accessGroupIds', user?.accessGroupIds],
  ['customerTree', user?.customerTree],
]);

export async function reportAllUsersByServiceOrg({
  soId, pageNumber = 1, pageSize = 25, all = false, detailLevel = 'compact',
}) {
  const customers = /** @type {any[]} */ (await searchOrganizations('customer', { parentId: soId, all: true }));
  const orgIds = [soId, ...customers.slice(0, 8).map((c) => c.customerId ?? c.id)];
  const perOrgUsers = await mapConcurrent(orgIds, (orgId) => listUsers(orgId, { all: true }), 5);
  const users = deduplicateUsers(perOrgUsers);
  const selected = all ? users : users.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
  const data = detailLevel === 'full' ? selected : selected.map(compactUser);
  const effectivePageSize = all ? users.length : pageSize;
  const totalPages = all ? 1 : Math.max(1, Math.ceil(users.length / pageSize));
  return {
    data, detailLevel, pageNumber: all ? 1 : pageNumber, pageSize: effectivePageSize,
    itemCount: data.length, totalItems: users.length, totalPages,
    hasNextPage: all ? false : pageNumber < totalPages,
  };
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
