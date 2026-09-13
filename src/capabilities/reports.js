// @ts-check
/** Bounded general report and job-status capabilities. */

import { getReport, listDeviceFilters } from '../operations/reports.js';
import { listJobStatuses as readJobStatuses } from '../operations/server-info.js';
import { createCapabilityResult } from '../tool-registry.js';
import { formatResult } from '../shared.js';

/** @param {Record<string, any>} args */
export async function runReport(args) {
  switch (args.reportType) {
    case 'patch-comparison':
      if (!args.reportId) throw new Error('reportId is required for patch-comparison');
      return createCapabilityResult(formatResult(await getReport(args.reportId), args.format), ['GET /api/report/{reportId}']);
    case 'device-filters':
      return createCapabilityResult(formatResult(await listDeviceFilters(args), args.format), ['GET /api/device-filters']);
    default:
      throw new Error(`Unknown reportType: ${args.reportType}`);
  }
}

/** @param {{orgUnitId: string | number}} args */
export async function listJobStatuses(args) {
  return createCapabilityResult(
    await readJobStatuses(args.orgUnitId),
    ['GET /api/org-units/{orgUnitId}/job-statuses'],
  );
}
