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

/** @param {[string, unknown][]} entries */
const compactObject = (entries) => Object.fromEntries(
  entries.filter(([, value]) => value !== undefined && value !== null),
);

/** @param {Record<string, any>} job */
export function compactJobStatus(job) {
  return compactObject([
    ['jobId', job?.jobId],
    ['jobName', job?.jobName],
    ['jobTarget', job?.jobTarget],
    ['jobTypeId', job?.jobTypeId],
    ['status', job?.status],
    ['deviceId', job?.deviceId],
    ['orgUnitId', job?.orgUnitId],
    ['scheduledTime', job?.scheduledTime],
    ['lastCompletionTime', job?.lastCompletionTime],
  ]);
}

/** @param {unknown} result @param {Record<string, any>} args */
export function paginateJobStatuses(result, args) {
  const envelope = result && typeof result === 'object' && !Array.isArray(result)
    ? /** @type {Record<string, any>} */ (result) : {};
  const source = Array.isArray(result) ? result : (Array.isArray(envelope.data) ? envelope.data : []);
  const status = args.status == null ? null : String(args.status).trim().toLocaleLowerCase('en-US');
  if (args.status != null && status === '') throw new TypeError('status must not be blank');
  const since = args.since == null ? null : Date.parse(args.since);
  if (args.since != null && !Number.isFinite(since)) throw new TypeError('since must be a valid date-time');
  const matches = source.filter((job) => {
    if (status && String(job?.status ?? '').trim().toLocaleLowerCase('en-US') !== status) return false;
    if (args.deviceId != null && String(job?.deviceId) !== String(args.deviceId)) return false;
    if (args.jobId != null && String(job?.jobId) !== String(args.jobId)) return false;
    if (since != null) {
      const times = [job?.lastCompletionTime, job?.scheduledTime]
        .map((value) => Date.parse(value)).filter(Number.isFinite);
      if (times.length === 0 || Math.max(...times) < since) return false;
    }
    return true;
  });
  const pageNumber = args.pageNumber ?? 1;
  const pageSize = args.pageSize ?? 25;
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new TypeError('pageNumber must be an integer starting at 1');
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new TypeError('pageSize must be an integer from 1 through 100');
  }
  const start = (pageNumber - 1) * pageSize;
  const rows = matches.slice(start, start + pageSize);
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  return {
    rows: args.detailLevel === 'full' ? rows : rows.map(compactJobStatus),
    page: {
      pageNumber, pageSize, itemCount: rows.length, totalItems: matches.length,
      totalPages, hasNextPage: pageNumber < totalPages,
      sourceTotalItems: Number(envelope.totalItems ?? source.length),
    },
  };
}

/** @param {Record<string, any>} args */
export async function listJobStatuses(args) {
  const { rows, page } = paginateJobStatuses(await readJobStatuses(args.orgUnitId), args);
  return createCapabilityResult(
    rows,
    ['GET /api/org-units/{orgUnitId}/job-statuses'],
    [],
    { page },
  );
}
