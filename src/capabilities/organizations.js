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

/** @param {{orgUnitId: string | number, include?: string[]}} args */
export async function getOrganizationContext(args) {
  const include = [...new Set(args.include || ['details'])];
  const details = await getOrganization('org-unit', args.orgUnitId);
  const components = [];
  if (include.includes('children')) components.push({
    name: 'children', operation: 'GET /api/org-units/{orgUnitId}/children',
    load: () => listOrganizationChildren(args.orgUnitId, { all: true }),
  });
  if (include.includes('limits')) components.push({
    name: 'limits', operation: 'GET /api/org-units/{orgUnitId}/limits',
    load: () => getOrganizationLimits(args.orgUnitId),
  });
  if (include.includes('customProperties')) components.push({
    name: 'customProperties', operation: 'GET /api/org-units/{orgUnitId}/custom-properties',
    load: () => listOrganizationCustomProperties(args.orgUnitId, { all: true }),
  });
  return composeOptional(details, 'GET /api/org-units/{orgUnitId}', components);
}
