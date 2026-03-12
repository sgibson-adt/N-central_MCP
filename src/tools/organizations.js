/** Organization tools — service orgs, customers, sites. */

import { apiGet, sanitizePathParam } from '../client.js';
import { paginationParams, paginationArgs } from '../shared.js';

export const organizationTools = [
  {
    name: 'list_org_units',
    description: 'Retrieve a list of all organization units.',
    inputSchema: {
      type: 'object',
      properties: { ...paginationParams },
    },
    handler: async (args) => {
      return await apiGet('/api/org-units', paginationArgs(args));
    },
  },
  {
    name: 'get_org_unit',
    description: 'Retrieve a specific organization unit by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        orgUnitId: { type: 'number', description: 'The organization unit ID' },
      },
      required: ['orgUnitId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/org-units/${sanitizePathParam(args.orgUnitId)}`);
    },
  },
  {
    name: 'list_org_unit_children',
    description: 'Retrieve a list of all child organization units for a given org unit.',
    inputSchema: {
      type: 'object',
      properties: {
        orgUnitId: { type: 'number', description: 'The parent organization unit ID' },
      },
      required: ['orgUnitId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/org-units/${sanitizePathParam(args.orgUnitId)}/children`);
    },
  },
  {
    name: 'list_service_orgs',
    description: 'Retrieve a list of all service organizations.',
    inputSchema: {
      type: 'object',
      properties: { ...paginationParams },
    },
    handler: async (args) => {
      return await apiGet('/api/service-orgs', paginationArgs(args));
    },
  },
  {
    name: 'get_service_org',
    description: 'Retrieve a specific service organization by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        soId: { type: 'number', description: 'The service organization ID' },
      },
      required: ['soId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/service-orgs/${sanitizePathParam(args.soId)}`);
    },
  },
  {
    name: 'list_customers',
    description: 'Retrieve a list of customers. If soId is provided, returns only customers under that service organization; otherwise returns all customers.',
    inputSchema: {
      type: 'object',
      properties: {
        soId: { type: 'number', description: 'Optional service organization ID to filter customers by SO' },
        ...paginationParams,
      },
    },
    handler: async (args) => {
      if (args.soId != null) {
        return await apiGet(`/api/service-orgs/${sanitizePathParam(args.soId)}/customers`, paginationArgs(args));
      }
      return await apiGet('/api/customers', paginationArgs(args));
    },
  },
  {
    name: 'get_customer',
    description: 'Retrieve a specific customer by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        customerId: { type: 'number', description: 'The customer ID' },
      },
      required: ['customerId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/customers/${sanitizePathParam(args.customerId)}`);
    },
  },
  {
    name: 'list_sites',
    description: 'Retrieve a list of sites. If customerId is provided, returns only sites under that customer; otherwise returns all sites.',
    inputSchema: {
      type: 'object',
      properties: {
        customerId: { type: 'number', description: 'Optional customer ID to filter sites by customer' },
        ...paginationParams,
      },
    },
    handler: async (args) => {
      if (args.customerId != null) {
        return await apiGet(`/api/customers/${sanitizePathParam(args.customerId)}/sites`, paginationArgs(args));
      }
      return await apiGet('/api/sites', paginationArgs(args));
    },
  },
  {
    name: 'get_site',
    description: 'Retrieve a specific site by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        siteId: { type: 'number', description: 'The site ID' },
      },
      required: ['siteId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/sites/${sanitizePathParam(args.siteId)}`);
    },
  },
];
