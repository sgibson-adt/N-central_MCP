// @ts-check
import { apiDelete, apiGet, apiPost, apiPut, sanitizePathParam } from '../client.js';

export const getMaintenanceWindows = (deviceId) => apiGet(`/api/devices/${sanitizePathParam(deviceId)}/maintenance-windows`);
export const createMaintenanceWindows = ({ deviceIds, deviceIDs, maintenanceWindows }) => apiPost('/api/devices/maintenance-windows', { deviceIDs: deviceIds ?? deviceIDs, maintenanceWindows });
export const updateMaintenanceWindows = ({ maintenanceWindows }) => apiPut('/api/devices/maintenance-windows', { maintenanceWindows });
export const deleteMaintenanceWindows = ({ scheduleIds }) => {
  if (!Array.isArray(scheduleIds) || scheduleIds.length === 0) throw new Error('scheduleIds must be a non-empty array');
  return apiDelete('/api/devices/maintenance-windows', {}, { scheduleIds });
};
