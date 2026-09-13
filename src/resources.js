/** MCP Resources: read-only context. */

import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getContext } from './context.js';
import { configuredNumber } from './config.js';
import { getHealth, getServerInfo } from './operations/server-info.js';
import { getDevice } from './operations/devices.js';
import { getOrganization, searchOrganizations } from './operations/organizations.js';
import { sanitizeToolError } from './tool-registry.js';

export const RESOURCE_COUNT = 5;
export const RESOURCE_OPERATION_REFERENCES = Object.freeze([
  'GET /api/service-orgs',
  'GET /api/customers',
  'GET /api/sites',
  'GET /api/health',
  'GET /api/server-info',
  'GET /api/devices/{deviceId}',
  'GET /api/customers/{customerId}',
  'GET /api/org-units/{orgUnitId}',
]);

const CACHE_TTL_MS = configuredNumber('NC_RESOURCE_CACHE_TTL_MS', 60_000, { minimum: 0, integer: true });
const cache = new Map();

// Exported for isolation tests (verifies the cache key is tenant-scoped).
export async function cached(uri, loader) {
  if (CACHE_TTL_MS <= 0) return loader();
  // Scope the cache key to the tenant: the URI alone (e.g. ncentral://org-tree)
  // collides across N-central servers, so a bare-URI key would serve one
  // tenant's data to another. The tenant key is a hash, safe to use here.
  const key = `${getContext().key}:${uri}`;
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && now - entry.t < CACHE_TTL_MS) return entry.v;
  const v = await loader();
  cache.set(key, { v, t: now });
  return v;
}

/** Drop all cached resource entries for a tenant (called on session teardown). */
export function evictTenantCache(tenantKey) {
  const prefix = `${tenantKey}:`;
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}

export function registerResources(server) {
  server.resource(
    'org-tree', 'ncentral://org-tree',
    { description: 'Bounded org hierarchy: Service Orgs → Customers → Sites with IDs and names.', mimeType: 'application/json' },
    async () => {
      const result = await cached('ncentral://org-tree', async () => {
        const reads = await Promise.allSettled([
          searchOrganizations('service-org', { all: true }),
          searchOrganizations('customer', { all: true }),
          searchOrganizations('site', { all: true }),
        ]);
        if (reads[0].status === 'rejected') throw reads[0].reason;

        const errors = [];
        const optional = (index, component) => {
          if (reads[index].status === 'fulfilled') {
            return Array.isArray(reads[index].value) ? reads[index].value : [];
          }
          errors.push({
            component,
            code: 'UPSTREAM_ERROR',
            message: sanitizeToolError(reads[index].reason?.message),
          });
          return [];
        };
        const serviceOrgs = Array.isArray(reads[0].value) ? reads[0].value : [];
        const customers = optional(1, 'customers');
        const sites = optional(2, 'sites');
        const customersByParent = Map.groupBy(customers, (customer) => String(customer.parentId ?? ''));
        const sitesByParent = Map.groupBy(sites, (site) => String(site.parentId ?? ''));
        const linkedCustomerIds = new Set();
        const linkedSiteIds = new Set();

        const tree = serviceOrgs.map((serviceOrg) => {
          const soId = serviceOrg.soId ?? serviceOrg.id;
          return {
            soId,
            soName: serviceOrg.soName ?? serviceOrg.name ?? '',
            customers: (customersByParent.get(String(soId)) || []).map((customer) => {
              const customerId = customer.customerId ?? customer.id;
              linkedCustomerIds.add(String(customerId));
              return {
                customerId,
                customerName: customer.customerName ?? customer.name ?? '',
                sites: (sitesByParent.get(String(customerId)) || []).map((site) => {
                  const siteId = site.siteId ?? site.id;
                  linkedSiteIds.add(String(siteId));
                  return { siteId, siteName: site.siteName ?? site.name ?? '' };
                }),
              };
            }),
          };
        });
        const inventory = {
          serviceOrganizations: serviceOrgs.length,
          customers: customers.length,
          sites: sites.length,
        };
        const unlinked = {
          customers: customers.filter((customer) => !linkedCustomerIds.has(String(customer.customerId ?? customer.id))).length,
          sites: sites.filter((site) => !linkedSiteIds.has(String(site.siteId ?? site.id))).length,
        };
        return { tree, errors, inventory, unlinked };
      });

      return {
        contents: [{ uri: 'ncentral://org-tree', mimeType: 'application/json', text: JSON.stringify(result.tree) }],
        _meta: {
          partial: result.errors.length > 0 || result.unlinked.customers > 0 || result.unlinked.sites > 0,
          errors: result.errors,
          inventory: result.inventory,
          unlinked: result.unlinked,
        },
      };
    }
  );

  server.resource(
    'status', 'ncentral://status',
    { description: 'Server health and version info.', mimeType: 'application/json' },
    async () => {
      const [health, info] = await Promise.all([getHealth(), getServerInfo()]);
      return { contents: [{ uri: 'ncentral://status', mimeType: 'application/json', text: JSON.stringify({ health, serverInfo: info }) }] };
    }
  );

  server.resource(
    'device',
    new ResourceTemplate('ncentral://device/{deviceId}', { list: undefined }),
    { description: 'Full device record by ID. URI: ncentral://device/{deviceId}', mimeType: 'application/json' },
    async (uri, { deviceId }) => {
      const device = await getDevice(String(deviceId));
      return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(device) }] };
    }
  );

  server.resource(
    'customer',
    new ResourceTemplate('ncentral://customer/{customerId}', { list: undefined }),
    { description: 'Customer details by ID. URI: ncentral://customer/{customerId}', mimeType: 'application/json' },
    async (uri, { customerId }) => {
      const customer = await getOrganization('customer', String(customerId));
      return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(customer) }] };
    }
  );

  server.resource(
    'org-unit',
    new ResourceTemplate('ncentral://org-unit/{orgUnitId}', { list: undefined }),
    { description: 'Organization unit details by ID. URI: ncentral://org-unit/{orgUnitId}', mimeType: 'application/json' },
    async (uri, { orgUnitId }) => {
      const ou = await getOrganization('org-unit', String(orgUnitId));
      return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(ou) }] };
    }
  );
}
