// @ts-check
/** Active monitoring issue capability. */

import { listActiveIssues as readActiveIssues } from '../operations/reports.js';
import { createCapabilityResult } from '../tool-registry.js';

/** @param {Record<string, any>} args */
export async function listActiveIssues(args) {
  if (args.orgUnitId == null) throw new Error('orgUnitId is required by the active-issues API');
  return createCapabilityResult(
    await readActiveIssues(args.orgUnitId, args),
    ['GET /api/org-units/{orgUnitId}/active-issues'],
  );
}
