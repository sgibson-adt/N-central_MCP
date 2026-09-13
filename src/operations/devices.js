// @ts-check
/** Contract-shaped device read adapters. */

import { apiDelete, apiGet, apiPatch, apiPost, apiPut, sanitizePathParam } from '../client.js';
import { fetchOrPaginate, fetchOrSearchByName, PAGINATION_POLICIES } from '../shared.js';

const DEVICE_NAME_FIELDS = Object.freeze(['longName', 'discoveredName', 'deviceName', 'name']);

/** @param {Record<string, any>} [args] */
export function searchDevices(args = {}) {
  const path = args.orgUnitId == null
    ? '/api/devices'
    : `/api/org-units/${sanitizePathParam(args.orgUnitId)}/devices`;
  const base = args.filterId == null ? {} : { filterId: args.filterId };
  return fetchOrSearchByName(path, base, args, DEVICE_NAME_FIELDS, PAGINATION_POLICIES.allowAll);
}

/** @param {string | number} deviceId */
export const getDevice = (deviceId) => apiGet(`/api/devices/${sanitizePathParam(deviceId)}`);
/** @param {string | number} deviceId */
export const getDeviceStatus = (deviceId) => apiGet(`/api/devices/${sanitizePathParam(deviceId)}/service-monitor-status`);
/** @param {string | number} deviceId */
export const getDeviceAssets = (deviceId) => apiGet(`/api/devices/${sanitizePathParam(deviceId)}/assets`);
/** @param {string | number} deviceId */
export const getDeviceLifecycle = (deviceId) => apiGet(`/api/devices/${sanitizePathParam(deviceId)}/assets/lifecycle-info`);
/** @param {string | number} deviceId @param {Record<string, any>} [args] */
export const listDeviceNotes = (deviceId, args = {}) => fetchOrPaginate(
  `/api/devices/${sanitizePathParam(deviceId)}/notes`, {}, args, PAGINATION_POLICIES.allowAll,
);
export const createDevice = (body) => apiPost('/api/device', body);
export const deleteDevice = (deviceId, removeAgents) => apiDelete(
  `/api/devices/${sanitizePathParam(deviceId)}`,
  removeAgents == null ? {} : { removeAgents },
);
export const updateDeviceLifecycle = (deviceId, body) => apiPut(`/api/devices/${sanitizePathParam(deviceId)}/assets/lifecycle-info`, body);
export const patchDeviceLifecycle = (deviceId, body) => apiPatch(`/api/devices/${sanitizePathParam(deviceId)}/assets/lifecycle-info`, body);
export const performWindowsServiceAction = (deviceId, body) => apiPost(`/api/devices/${sanitizePathParam(deviceId)}/services/actions`, body);
export const getRemoteControlType = (deviceId) => apiGet(`/api/devices/${sanitizePathParam(deviceId)}/remote-control-type`);
export const createRemoteControlTask = (deviceId, body) => apiPost(`/api/devices/${sanitizePathParam(deviceId)}/remote-control-task`, body);
export const getApplianceTask = (taskId) => apiGet(`/api/appliance-tasks/${sanitizePathParam(taskId)}`);
