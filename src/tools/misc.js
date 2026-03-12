/** Misc tools — filters, maintenance windows, tokens, server health, etc. */

import { apiGet, sanitizePathParam } from '../client.js';
import { paginationParams, paginationArgs } from '../shared.js';

export const miscTools = [
  {
    name: 'list_device_filters',
    description: 'Retrieve the list of device filters.',
    inputSchema: {
      type: 'object',
      properties: {
        viewScope: { type: 'string', description: 'View scope for filters' },
        ...paginationParams,
      },
    },
    handler: async (args) => {
      return await apiGet('/api/device-filters', {
        viewScope: args.viewScope,
        ...paginationArgs(args),
      });
    },
  },
  {
    name: 'get_maintenance_windows',
    description: 'Retrieve all maintenance windows for a specific device.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'The device ID' },
      },
      required: ['deviceId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/devices/${sanitizePathParam(args.deviceId)}/maintenance-windows`);
    },
  },
  {
    name: 'get_registration_token',
    description: 'Retrieve the registration token for a site, organization unit, or customer.',
    inputSchema: {
      type: 'object',
      properties: {
        entityType: {
          type: 'string',
          description: 'The type of entity to retrieve the token for',
          enum: ['site', 'orgUnit', 'customer'],
        },
        id: { type: 'number', description: 'The entity ID (siteId, orgUnitId, or customerId)' },
      },
      required: ['entityType', 'id'],
    },
    handler: async (args) => {
      const id = sanitizePathParam(args.id);
      switch (args.entityType) {
        case 'site':     return await apiGet(`/api/sites/${id}/registration-token`);
        case 'orgUnit':  return await apiGet(`/api/org-units/${id}/registration-token`);
        case 'customer': return await apiGet(`/api/customers/${id}/registration-token`);
        default: throw new Error(`Unknown entityType: ${args.entityType}`);
      }
    },
  },
  {
    name: 'get_server_info',
    description: 'Return N-central server information. Use level="health" for uptime/start time, level="extra" for system version details, or omit level (default) for API-service version info.',
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          description: 'Information level: omit for basic API version info, "health" for uptime check, "extra" for system component versions',
          enum: ['basic', 'health', 'extra'],
        },
      },
    },
    handler: async (args) => {
      switch (args.level) {
        case 'health': return await apiGet('/api/health');
        case 'extra':  return await apiGet('/api/server-info/extra');
        default:       return await apiGet('/api/server-info');
      }
    },
  },
  {
    name: 'validate_token',
    description: 'Check the validity of the current API access token.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      return await apiGet('/api/auth/validate');
    },
  },
  {
    name: 'get_device_activation_key',
    description: 'Generate an activation key for a device by device ID.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'The device ID' },
      },
      required: ['deviceId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/devices/${sanitizePathParam(args.deviceId)}/activation-key`);
    },
  },
  {
    name: 'get_software_installers',
    description: 'Retrieve software installer download URLs for a specific customer. Supports filtering by software type and installer type.',
    inputSchema: {
      type: 'object',
      properties: {
        customerId: { type: 'number', description: 'The customer ID' },
        softwareType: { type: 'string', description: 'Software type filter (e.g. "agent")' },
        installerType: { type: 'string', description: 'Installer type filter (e.g. "msi", "exe")' },
      },
      required: ['customerId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/customers/${sanitizePathParam(args.customerId)}/software/installers`, {
        softwareType: args.softwareType,
        installerType: args.installerType,
      });
    },
  },
  {
    name: 'get_psa_customer_mapping',
    description: 'Retrieve PSA (Professional Services Automation) customer mapping for a given customer ID.',
    inputSchema: {
      type: 'object',
      properties: {
        customerId: { type: 'number', description: 'The customer ID' },
      },
      required: ['customerId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/standard-psa/customer-mapping/${sanitizePathParam(args.customerId)}`);
    },
  },
  {
    name: 'get_report',
    description: 'Retrieve an N-central report by its report ID.',
    inputSchema: {
      type: 'object',
      properties: {
        reportId: { type: 'string', description: 'The report ID' },
      },
      required: ['reportId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/report/${sanitizePathParam(args.reportId)}`);
    },
  },
];
