// @ts-check
import { apiGet, apiPost, sanitizePathParam } from '../client.js';

export function getRegistrationToken(entityType, id) {
  const safe = sanitizePathParam(id);
  if (entityType === 'site') return apiGet(`/api/sites/${safe}/registration-token`);
  if (entityType === 'orgUnit') return apiGet(`/api/org-units/${safe}/registration-token`);
  if (entityType === 'customer') return apiGet(`/api/customers/${safe}/registration-token`);
  throw new Error(`Unknown entityType: ${entityType}`);
}
export const getDeviceActivationKey = (deviceId) => apiGet(`/api/devices/${sanitizePathParam(deviceId)}/activation-key`);
export const getSoftwareInstallers = (customerId, params = {}) => apiGet(`/api/customers/${sanitizePathParam(customerId)}/software/installers`, params);
export const generateSoftwareDownloadLink = (customerId, body) => apiPost(`/api/customers/${sanitizePathParam(customerId)}/software/installers`, body);
