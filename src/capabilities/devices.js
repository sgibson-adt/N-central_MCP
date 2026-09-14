// @ts-check
/** Device search and selected-context core capabilities. */

import {
  getDevice, getDeviceAssets, getDeviceLifecycle, getDeviceStatus,
  listDeviceNotes, searchDevices as search,
} from '../operations/devices.js';
import { listDeviceCustomProperties } from '../operations/custom-properties.js';
import { listDeviceScheduledTasks } from '../operations/scheduled-tasks.js';
import { getMaintenanceWindows } from '../operations/maintenance-windows.js';
import { createCapabilityResult } from '../tool-registry.js';
import { composeOptional, nameSearchPage } from './common.js';

const compactDevice = (device) => Object.fromEntries([
  ['deviceId', device?.deviceId ?? device?.id],
  ['longName', device?.longName], ['discoveredName', device?.discoveredName],
  ['deviceStatus', device?.deviceStatus], ['deviceClass', device?.deviceClass],
  ['deviceClassLabel', device?.deviceClassLabel], ['supportedOs', device?.supportedOs],
  ['supportedOsLabel', device?.supportedOsLabel], ['isProbe', device?.isProbe],
  ['lastApplianceCheckinTime', device?.lastApplianceCheckinTime],
  ['orgUnitId', device?.orgUnitId], ['siteId', device?.siteId], ['siteName', device?.siteName],
  ['customerId', device?.customerId], ['customerName', device?.customerName],
  ['soId', device?.soId], ['soName', device?.soName],
].filter(([, value]) => value !== undefined && value !== null));

/** @param {Record<string, any>} [args] */
export async function searchDevices(args = {}) {
  const { detailLevel = 'compact', ...query } = args;
  const operation = query.orgUnitId == null
    ? 'GET /api/devices'
    : 'GET /api/org-units/{orgUnitId}/devices';
  const source = await search(query);
  const envelope = source && typeof source === 'object'
    ? /** @type {Record<string, any>} */ (source) : {};
  const data = detailLevel === 'full' ? source : (Array.isArray(source)
    ? source.map(compactDevice)
    : { ...envelope, data: Array.isArray(envelope.data) ? envelope.data.map(compactDevice) : envelope.data });
  return createCapabilityResult(data, [operation], [], { page: nameSearchPage(query, source) });
}

/** @param {{deviceId: string | number, include?: string[], noteOptions?: Record<string, any>}} args */
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
    notes: {
      operation: 'GET /api/devices/{deviceId}/notes',
      load: () => listDeviceNotes(args.deviceId, args.noteOptions),
    },
    customProperties: {
      operation: 'GET /api/devices/{deviceId}/custom-properties',
      load: () => listDeviceCustomProperties(args.deviceId),
    },
    tasks: {
      operation: 'GET /api/devices/{deviceId}/scheduled-tasks',
      load: () => listDeviceScheduledTasks(args.deviceId),
    },
    maintenanceWindows: {
      operation: 'GET /api/devices/{deviceId}/maintenance-windows',
      load: () => getMaintenanceWindows(args.deviceId),
    },
  };
  const components = include
    .filter((name) => name !== 'details' && available[name])
    .map((name) => ({ name, ...available[name] }));
  return composeOptional(details, 'GET /api/devices/{deviceId}', components);
}
