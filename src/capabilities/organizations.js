// @ts-check
/** Organization search and selected-context core capabilities. */

import {
  getOrganization,
  getOrganizationLimits,
  listOrganizationChildren,
  listOrganizationCustomProperties,
  searchOrganizations as search,
} from '../operations/organizations.js';
import { createCapabilityResult } from '../tool-registry.js';
import { composeOptional, nameSearchPage } from './common.js';

const compactObject = (value, keys) => Object.fromEntries(keys
  .map((key) => [key, value?.[key]])
  .filter(([, field]) => field !== undefined && field !== null));
const organizationKeys = [
  'orgUnitId', 'orgUnitName', 'orgUnitType', 'parentId', 'soId', 'soName',
  'customerId', 'customerName', 'siteId', 'siteName', 'externalId', 'licenseType',
];
const propertyKeys = ['propertyId', 'propertyName', 'propertyType', 'value', 'defaultValue'];

function projectCollection(value, keys) {
  if (Array.isArray(value)) return value.map((item) => compactObject(item, keys));
  const envelope = value && typeof value === 'object' ? /** @type {Record<string, any>} */ (value) : {};
  return {
    ...envelope,
    data: Array.isArray(envelope.data)
      ? envelope.data.map((item) => compactObject(item, keys)) : envelope.data,
  };
}

function projectDetail(value, keys) {
  const envelope = value && typeof value === 'object' ? /** @type {Record<string, any>} */ (value) : {};
  if (envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data)) {
    return { ...envelope, data: compactObject(envelope.data, keys) };
  }
  return compactObject(envelope, keys);
}

/** @param {Record<string, any>} args */
export async function searchOrganizations(args) {
  const data = await search(args.organizationType, args);
  const path = args.organizationType === 'service-org' ? '/api/service-orgs'
    : args.organizationType === 'customer' && args.parentId != null ? '/api/service-orgs/{soId}/customers'
    : args.organizationType === 'customer' ? '/api/customers'
    : args.organizationType === 'site' && args.parentId != null ? '/api/customers/{customerId}/sites'
    : args.organizationType === 'site' ? '/api/sites'
    : '/api/org-units';
  return createCapabilityResult(data, [`GET ${path}`], [], { page: nameSearchPage(args, data) });
}

/** @param {{orgUnitId: string | number, include?: string[], detailLevel?: 'compact'|'full', childrenOptions?: Record<string, any>, propertyOptions?: Record<string, any>}} args */
export async function getOrganizationContext(args) {
  const include = [...new Set(args.include || ['details'])];
  const detailLevel = args.detailLevel ?? 'compact';
  const detailsSource = await getOrganization('org-unit', args.orgUnitId);
  const details = detailLevel === 'full'
    ? detailsSource : projectDetail(detailsSource, organizationKeys);
  const components = [];
  if (include.includes('children')) components.push({
    name: 'children', operation: 'GET /api/org-units/{orgUnitId}/children',
    load: async () => {
      const value = await listOrganizationChildren(
        args.orgUnitId, args.childrenOptions ?? { pageNumber: 1, pageSize: 25 },
      );
      return detailLevel === 'full' ? value : projectCollection(value, organizationKeys);
    },
  });
  if (include.includes('limits')) components.push({
    name: 'limits', operation: 'GET /api/org-units/{orgUnitId}/limits',
    load: () => getOrganizationLimits(args.orgUnitId),
  });
  if (include.includes('customProperties')) components.push({
    name: 'customProperties', operation: 'GET /api/org-units/{orgUnitId}/custom-properties',
    load: async () => {
      const value = await listOrganizationCustomProperties(
        args.orgUnitId, args.propertyOptions ?? { pageNumber: 1, pageSize: 25 },
      );
      return detailLevel === 'full' ? value : projectCollection(value, propertyKeys);
    },
  });
  return composeOptional(details, 'GET /api/org-units/{orgUnitId}', components);
}
