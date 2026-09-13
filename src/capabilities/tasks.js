// @ts-check
/** Device scheduled-task and task-context capabilities. */

import {
  getScheduledTask, getScheduledTaskStatus, listDeviceScheduledTasks as readDeviceTasks,
} from '../operations/scheduled-tasks.js';
import { createCapabilityResult } from '../tool-registry.js';
import { composeOptional } from './common.js';

/** @param {{deviceId: string | number}} args */
export async function listDeviceScheduledTasks(args) {
  return createCapabilityResult(
    await readDeviceTasks(args.deviceId),
    ['GET /api/devices/{deviceId}/scheduled-tasks'],
  );
}

/** @param {{taskId: string | number, includeStatus?: boolean, detailedStatus?: boolean}} args */
export async function getScheduledTaskContext(args) {
  const details = await getScheduledTask(args.taskId);
  const components = args.includeStatus ? [{
    name: 'status',
    operation: args.detailedStatus
      ? 'GET /api/scheduled-tasks/{taskId}/status/details'
      : 'GET /api/scheduled-tasks/{taskId}/status',
    load: () => getScheduledTaskStatus(args.taskId, args.detailedStatus),
  }] : [];
  return composeOptional(details, 'GET /api/scheduled-tasks/{taskId}', components);
}
