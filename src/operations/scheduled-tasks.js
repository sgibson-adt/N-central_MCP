// @ts-check
/** Contract-shaped scheduled-task read adapters. */

import { apiGet, apiPost, sanitizePathParam } from '../client.js';

/** @param {string | number} deviceId */
export const listDeviceScheduledTasks = (deviceId) =>
  apiGet(`/api/devices/${sanitizePathParam(deviceId)}/scheduled-tasks`);

/** @param {string | number} taskId */
export const getScheduledTask = (taskId) => apiGet(`/api/scheduled-tasks/${sanitizePathParam(taskId)}`);

/** @param {string | number} taskId @param {boolean} [detailed] */
export function getScheduledTaskStatus(taskId, detailed = false) {
  const base = `/api/scheduled-tasks/${sanitizePathParam(taskId)}/status`;
  return apiGet(detailed ? `${base}/details` : base);
}

export const createScheduledTask = (body) => apiPost('/api/scheduled-tasks/direct', body);
