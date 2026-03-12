/** Scheduled task tools. */

import { apiGet, sanitizePathParam } from '../client.js';
import { paginationParams, paginationArgs } from '../shared.js';

export const scheduledTaskTools = [
  {
    name: 'get_scheduled_task',
    description: 'Retrieve general information for a given scheduled task by ID. Returns parent ID, name, type, customer ID, device IDs, and enabled status.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The scheduled task ID' },
      },
      required: ['taskId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/scheduled-tasks/${sanitizePathParam(args.taskId)}`);
    },
  },
  {
    name: 'get_scheduled_task_status',
    description: 'Retrieve status for a given scheduled task. Returns aggregated status by default; set detailed=true to get per-device status breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The scheduled task ID' },
        detailed: { type: 'boolean', description: 'If true, returns per-device status details instead of the aggregated summary' },
      },
      required: ['taskId'],
    },
    handler: async (args) => {
      const base = `/api/scheduled-tasks/${sanitizePathParam(args.taskId)}/status`;
      return await apiGet(args.detailed ? `${base}/details` : base);
    },
  },
  {
    name: 'list_device_tasks',
    description: 'Retrieve scheduled tasks for a specific device. Returns task ID, task name, and status.',
    inputSchema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'The device ID' },
        ...paginationParams,
      },
      required: ['deviceId'],
    },
    handler: async (args) => {
      return await apiGet(`/api/devices/${sanitizePathParam(args.deviceId)}/scheduled-tasks`, paginationArgs(args));
    },
  },
];
