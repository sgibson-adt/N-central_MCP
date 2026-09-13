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

export async function getCurrentUser() {
  return createCapabilityResult(await readCurrentUser(), ['GET /api/users/me']);
}
