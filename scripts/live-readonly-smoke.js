#!/usr/bin/env node

/** Opt-in live verification. Emits structural outcomes only—never response data. */

import { apiGet } from '../src/client.js';
import { auditErrorMetadata } from '../src/logging.js';

if (process.env.RUN_LIVE_TESTS !== '1') {
  throw new Error('Live verification is disabled; set RUN_LIVE_TESTS=1 explicitly');
}
if (process.env.NC_WRITE_MODE !== 'read-only') {
  throw new Error('Live verification requires NC_WRITE_MODE=read-only');
}
if (!process.env.NC_SERVER_URL || !process.env.NC_JWT_TOKEN) {
  throw new Error('Live verification requires temporary NC_SERVER_URL and NC_JWT_TOKEN values');
}

const checks = [
  ['health', '/api/health'],
  ['session_validation', '/api/auth/validate'],
  ['server_info', '/api/server-info'],
  ['bounded_service_org_read', '/api/service-orgs?pageNumber=1&pageSize=1'],
];

const outcomes = [];
for (const [name, path] of checks) {
  try {
    const value = await apiGet(path);
    outcomes.push({
      name,
      passed: true,
      responseType: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value,
    });
  } catch (error) {
    outcomes.push({ name, passed: false, ...auditErrorMetadata(error) });
  }
}

const failed = outcomes.filter(({ passed }) => !passed).length;
const summary = {
  mode: 'read-only',
  passed: outcomes.length - failed,
  failed,
  checks: outcomes,
};
console.log(JSON.stringify(summary));
if (failed > 0) process.exitCode = 1;
