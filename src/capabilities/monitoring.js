// @ts-check
/** Active monitoring issue capability. */

import { listActiveIssues as readActiveIssues } from '../operations/reports.js';
import { createCapabilityResult } from '../tool-registry.js';

/** @param {[string, unknown][]} entries */
const compactObject = (entries) => Object.fromEntries(
  entries.filter(([, value]) => value !== undefined && value !== null),
);

/** @param {Record<string, any>} issue */
export function compactActiveIssue(issue) {
  const extra = issue?._extra && typeof issue._extra === 'object' ? issue._extra : {};
  return compactObject([
    ['orgUnitId', issue?.orgUnitId],
    ['deviceId', issue?.deviceId],
    ['deviceName', issue?.deviceName ?? extra.deviceName],
    ['serviceId', issue?.serviceId],
    ['serviceName', issue?.serviceName],
    ['serviceType', issue?.serviceType],
    ['taskId', issue?.taskId],
    ['serviceItemId', issue?.serviceItemId],
    ['notificationState', issue?.notificationState],
    ['transitionTime', issue?.transitionTime ?? extra.transitionTime],
    ['deviceClassLabel', issue?.deviceClassLabel ?? extra.deviceClassLabel],
  ]);
}

/** @param {unknown} result */
function rowsAndPage(result) {
  if (Array.isArray(result)) {
    return {
      rows: result,
      page: {
        pageNumber: 1, pageSize: result.length, itemCount: result.length,
        totalItems: result.length, totalPages: 1, hasNextPage: false, all: true,
      },
    };
  }
  const envelope = result && typeof result === 'object' ? /** @type {Record<string, any>} */ (result) : {};
  const rows = Array.isArray(envelope.data) ? envelope.data : [];
  const pageNumber = Number(envelope.pageNumber ?? 1);
  const pageSize = Number(envelope.pageSize ?? rows.length);
  const totalItems = Number(envelope.totalItems ?? rows.length);
  const totalPages = Number(envelope.totalPages ?? Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize))));
  return {
    rows,
    page: {
      pageNumber, pageSize, itemCount: Number(envelope.itemCount ?? rows.length),
      totalItems, totalPages, hasNextPage: pageNumber < totalPages,
    },
  };
}

/** @param {Record<string, any>} args */
export async function listActiveIssues(args) {
  if (args.orgUnitId == null) throw new Error('orgUnitId is required by the active-issues API');
  const detailLevel = args.detailLevel ?? 'compact';
  const request = {
    ...args,
    ...(!args.all && args.pageSize == null ? { pageSize: 10 } : {}),
  };
  const { rows, page } = rowsAndPage(await readActiveIssues(args.orgUnitId, request));
  return createCapabilityResult(
    detailLevel === 'full' ? rows : rows.map(compactActiveIssue),
    ['GET /api/org-units/{orgUnitId}/active-issues'],
    [],
    { page },
  );
}
