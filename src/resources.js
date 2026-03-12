/** MCP Resources — read-only data for AI context. */

import { apiGet, sanitizePathParam } from './client.js';
import { fetchAll } from './paginator.js';

export function registerResources(server, ensureAuth) {
  server.resource(
    'org-tree', 'ncentral://org-tree',
    { description: 'Full org hierarchy: Service Orgs → Customers → Sites with IDs and names.', mimeType: 'application/json' },
    async () => {
      await ensureAuth();
      const serviceOrgs = await fetchAll('/api/service-orgs');
      const tree = [];

      for (const so of serviceOrgs) {
        const soId = so.soId || so.id;
        const customers = await fetchAll(`/api/service-orgs/${sanitizePathParam(soId)}/customers`);
        const customerNodes = [];

        for (const cust of customers) {
          const custId = cust.customerId || cust.id;
          let sites = [];
          try {
            sites = await fetchAll(`/api/customers/${sanitizePathParam(custId)}/sites`);
          } catch (err) {
            console.error(`Failed to fetch sites for customer ${custId}: ${err.message}`);
          }

          customerNodes.push({
            customerId: custId,
            customerName: cust.customerName || cust.name || '',
            sites: sites.map(s => ({ siteId: s.siteId || s.id, siteName: s.siteName || s.name || '' })),
          });
        }

        tree.push({ soId, soName: so.soName || so.name || '', customers: customerNodes });
      }

      return { contents: [{ uri: 'ncentral://org-tree', mimeType: 'application/json', text: JSON.stringify(tree, null, 2) }] };
    }
  );

  server.resource(
    'customers', 'ncentral://customers',
    { description: 'All customers with IDs, names, and parent org info.', mimeType: 'application/json' },
    async () => {
      await ensureAuth();
      const customers = await fetchAll('/api/customers');
      return { contents: [{ uri: 'ncentral://customers', mimeType: 'application/json', text: JSON.stringify(customers, null, 2) }] };
    }
  );

  server.resource(
    'sites', 'ncentral://sites',
    { description: 'All sites with IDs, names, and parent customer info.', mimeType: 'application/json' },
    async () => {
      await ensureAuth();
      const sites = await fetchAll('/api/sites');
      return { contents: [{ uri: 'ncentral://sites', mimeType: 'application/json', text: JSON.stringify(sites, null, 2) }] };
    }
  );

  server.resource(
    'status', 'ncentral://status',
    { description: 'Server health and version info.', mimeType: 'application/json' },
    async () => {
      await ensureAuth();
      const [health, info] = await Promise.all([apiGet('/api/health'), apiGet('/api/server-info')]);
      return { contents: [{ uri: 'ncentral://status', mimeType: 'application/json', text: JSON.stringify({ health, serverInfo: info }, null, 2) }] };
    }
  );
}
