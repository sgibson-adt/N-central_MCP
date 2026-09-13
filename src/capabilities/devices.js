// @ts-check
/** Device search and selected-context core capabilities. */

import {
  getDevice, getDeviceAssets, getDeviceLifecycle, getDeviceStatus,
  listDeviceNotes, searchDevices as search,
} from '../operations/devices.js';
import { listDeviceCustomProperties } from '../operations/custom-properties.js';
import { listDeviceScheduledTasks } from '../operations/scheduled-tasks.js';
import { createCapabilityResult } from '../tool-registry.js';
import { composeOptional } from './common.js';

/** @param {Record<string, any>} [args] */
export async function searchDevices(args = {}) {
  const operation = args.orgUnitId == null
    ? 'GET /api/devices'
    : 'GET /api/org-units/{orgUnitId}/devices';
  return createCapabilityResult(await search(args), [operation]);
}

/** @param {{deviceId: string | number, include?: string[]}} args */
export async function getDeviceContext(args) {
  const include = [...new Set(args.include || ['details'])];
  const details = await getDevice(args.deviceId);
  const available = {
    monitoring: {
      operation: 'GET /api/devices/{deviceId}/service-monitor-status',
      load: () => getDeviceStatus(args.deviceId),
    },
    assets: { operation: 'GET /api/devices/{deviceId}/assets', load: () => getDeviceAssets(args.deviceId) },
    lifecycle: {
      operation: 'GET /api/devices/{deviceId}/assets/lifecycle-info',
      load: () => getDeviceLifecycle(args.deviceId),
    },
    notes: { operation: 'GET /api/devices/{deviceId}/notes', load: () => listDeviceNotes(args.deviceId) },
    customProperties: {
      operation: 'GET /api/devices/{deviceId}/custom-properties',
      load: () => listDeviceCustomProperties(args.deviceId),
    },
    tasks: {
      operation: 'GET /api/devices/{deviceId}/scheduled-tasks',
      load: () => listDeviceScheduledTasks(args.deviceId),
    },
  };
  const components = include
    .filter((name) => name !== 'details' && available[name])
    .map((name) => ({ name, ...available[name] }));
  return composeOptional(details, 'GET /api/devices/{deviceId}', components);
}
