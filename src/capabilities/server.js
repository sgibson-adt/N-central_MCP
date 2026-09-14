// @ts-check
/** Server, session, and current-user core capabilities. */

import {
  getCurrentUser as readCurrentUser,
  getHealth,
  getServerInfo,
  getServerTime,
  validateSession as readSessionValidation,
} from '../operations/server-info.js';
import { createCapabilityResult } from '../tool-registry.js';

/** @param {{includeTime?: boolean}} [args] */
export async function getServerStatus(args = {}) {
  const operations = ['GET /api/health', 'GET /api/server-info'];
  const [health, serverInfo] = await Promise.all([getHealth(), getServerInfo()]);
  const data = { health, serverInfo };
  if (args.includeTime) {
    data.serverTime = await getServerTime();
    operations.push('GET /api/server-info/time');
  }
  return createCapabilityResult(data, operations);
}

export async function validateSession() {
  const response = await readSessionValidation();
  return createCapabilityResult({ valid: true, response }, ['GET /api/auth/validate']);
}

/** @param {{detailLevel?: 'compact'|'full'}} [args] */
export async function getCurrentUser(args = {}) {
  const value = await readCurrentUser();
  const source = value && typeof value === 'object' ? /** @type {Record<string, any>} */ (value) : {};
  if (args.detailLevel === 'full') {
    return createCapabilityResult(source, ['GET /api/users/me']);
  }
  const user = source?.data && typeof source.data === 'object' ? source.data : {};
  const data = Object.fromEntries([
    ['userId', user.userId], ['username', user.username], ['firstName', user.firstName],
    ['lastName', user.lastName], ['customerId', user.customerId], ['isEnabled', user.isEnabled],
    ['isLocked', user.isLocked], ['isPasswordExpired', user.isPasswordExpired],
    ['isPasswordResetRequired', user.isPasswordResetRequired], ['twoFactorType', user.twoFactorType],
    ['previousTwoFactorType', user.previousTwoFactorType], ['isLDAP', user.isLDAP],
    ['externallyProvisioned', user.externallyProvisioned], ['autoSOUser', user.autoSOUser],
    ['autoSOPower', user.autoSOPower],
  ].filter(([, value]) => value !== undefined && value !== null));
  return createCapabilityResult({ status: source?.status, message: source?.message, data }, ['GET /api/users/me']);
}
