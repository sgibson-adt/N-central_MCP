/** Device tools — N-central device API endpoints. */

import { apiGet, sanitizePathParam } from '../client.js';
import { paginationParams, paginationArgs } from '../shared.js';

export const deviceTools = [
  {
    name: 'list_devices',
    description: 'Retrieve the list of all devices from N-central for the logged-in user. Supports pagination, sorting, filtering by filter ID, and field selection.',
    inputSchema: {
      type: 'object',
      properties: {
        filterId: { type: 'number', description: 'Filter ID to apply to device list' },
        ...paginationParams,
      },
    },
    handler: async (args) => {
      return await apiGet('/api/devices', {
        filterId: args.filterId,
        ...paginationArgs(args),
      });
    },
  },
  {
    name: 'get_device',
    description: 'Retrieve a specific device by its ID. Note: lastLoggedInUser and stillLoggedIn fields may be null (known issue) — use list_devices to get these values instead.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'The device ID' },
      },
      required: ['deviceId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/devices/${sanitizePathParam(args.deviceId)}`);
    },
  },
  {
    name: 'get_device_status',
    description: 'Retrieve the status of service monitoring tasks for a given device.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'The device ID' },
      },
      required: ['deviceId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/devices/${sanitizePathParam(args.deviceId)}/service-monitor-status`);
    },
  },
  {
    name: 'get_device_assets',
    description: 'Retrieve asset information for a device by ID. Note: Probes do not have assets and will return 404.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'The device ID' },
      },
      required: ['deviceId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/devices/${sanitizePathParam(args.deviceId)}/assets`);
    },
  },
  {
    name: 'get_device_lifecycle',
    description: 'Retrieve asset lifecycle (warranty) information for a device by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'The device ID' },
      },
      required: ['deviceId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/devices/${sanitizePathParam(args.deviceId)}/assets/lifecycle-info`);
    },
  },
  {
    name: 'list_devices_by_org_unit',
    description: 'Retrieve the list of devices belonging to a specific organization unit.',
    inputSchema: {
      type: 'object',
      properties: {
        orgUnitId: { type: 'number', description: 'The organization unit ID' },
        ...paginationParams,
      },
      required: ['orgUnitId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/org-units/${sanitizePathParam(args.orgUnitId)}/devices`, paginationArgs(args));
    },
  },
  {
    name: 'get_appliance_task',
    description: 'Retrieve appliance-task information by task ID.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The appliance task ID' },
      },
      required: ['taskId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/appliance-tasks/${sanitizePathParam(args.taskId)}`);
    },
  },
];
