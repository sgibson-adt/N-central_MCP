// @ts-check
/** Contract-shaped read adapters for authentication and server metadata. */

import { apiGet, sanitizePathParam } from '../client.js';

export const getHealth = () => apiGet('/api/health');
export const getServerTime = () => apiGet('/api/server-info/time');
export const getCurrentUser = () => apiGet('/api/users/me');
export const validateSession = () => apiGet('/api/auth/validate');

/** @param {'basic' | 'extra'} [level] */
export function getServerInfo(level = 'basic') {
  return apiGet(level === 'extra' ? '/api/server-info/extra' : '/api/server-info');
}

/** @param {string | number} orgUnitId */
export function listJobStatuses(orgUnitId) {
  return apiGet(`/api/org-units/${sanitizePathParam(orgUnitId)}/job-statuses`);
}
