// @ts-check
/** Shared tool schema helpers. */

import { apiGet } from './client.js';
import { fetchAll, toCsv } from './paginator.js';

/** @typedef {{ pageNumber?: number, pageSize?: number, select?: string, sortBy?: string, sortOrder?: string, all?: boolean, format?: 'csv' | 'json' }} PaginationArgs */
/** @typedef {{ maxPageSize: number, allowMinusOne: boolean, autoPageSize: number }} PaginationPolicy */

/** Reviewed policies derived from the OpenAPI descriptions. */
export const PAGINATION_POLICIES = Object.freeze({
  positiveOnly: Object.freeze({ maxPageSize: 1000, allowMinusOne: false, autoPageSize: 1000 }),
  allowAll: Object.freeze({ maxPageSize: 1000, allowMinusOne: true, autoPageSize: 1000 }),
  activeIssues: Object.freeze({ maxPageSize: 1000, allowMinusOne: false, autoPageSize: 1000 }),
});

export const formatParam = {
  format: {
    type: 'string',
    description: 'Output format: "csv" or "json". Default varies by tool — list_* default to json; report_* default to csv.',
    enum: ['csv', 'json'],
  },
};

export const paginationParams = {
  pageNumber: { type: 'number', description: 'Page number (starts at 1)' },
  pageSize: { type: 'integer', description: 'Number of items per page (1-1000; some operations also document -1)', minimum: -1, maximum: 1000 },
  select: {
    type: 'string',
    description: 'Filter expression (FIQL/RSQL predicate) — despite the "select" name, this filters rows, it does NOT pick fields. Syntax: `field==value`, join predicates with `;` for AND. Example: `soId==50` returns only the SO with that ID. Not all fields are queryable; unsupported ones error with "Field not found: X".',
  },
  sortBy: { type: 'string', description: 'Field to sort results by' },
  sortOrder: {
    type: 'string',
    description: 'Sort order: ASC, asc, ascending, natural, desc, descending, reverse',
    enum: ['ASC', 'asc', 'ascending', 'natural', 'desc', 'descending', 'reverse'],
  },
  all: {
    type: 'boolean',
    description: 'Auto-paginate: fetch every page and return the combined list. Ignores pageNumber/pageSize. Use for complete results; omit to return a single page (cheaper, safer for large environments).',
  },
};

/** @param {PaginationArgs | Record<string, any>} args @param {PaginationPolicy} [policy] */
export function paginationArgs(args, policy = PAGINATION_POLICIES.positiveOnly) {
  const requestedPageSize = Number(args.pageSize);
  const clampedPageSize = args.pageSize == null
    ? undefined
    : requestedPageSize === -1 && policy.allowMinusOne
      ? -1
      : Math.min(policy.maxPageSize, Math.max(1, Number.isFinite(requestedPageSize) ? Math.floor(requestedPageSize) : 1));
  const clampedPageNumber = args.pageNumber != null
    ? Math.max(1, Number(args.pageNumber) || 1)
    : undefined;
  return {
    pageNumber: clampedPageNumber,
    pageSize: clampedPageSize,
    select: args.select,
    sortBy: args.sortBy,
    sortOrder: args.sortOrder,
  };
}

/**
 * Fetch a single page or auto-paginate based on `args.all`.
 *
 * @param {string} path
 * @param {Record<string, unknown>} baseParams
 * @param {PaginationArgs} [args]
 * @returns {Promise<unknown>}
 */
/** @param {string} path @param {Record<string, unknown>} baseParams @param {PaginationArgs} [args] @param {PaginationPolicy} [policy] */
export async function fetchOrPaginate(path, baseParams, args, policy = PAGINATION_POLICIES.positiveOnly) {
  if (args?.all) return fetchAll(path, baseParams, policy.autoPageSize);
  return apiGet(path, { ...baseParams, ...paginationArgs(args || {}, policy) });
}

/**
 * Format a result as JSON or CSV. Unwraps `.data` envelopes before CSV conversion.
 */
export function formatResult(result, format) {
  if (format !== 'csv') return result;
  const items = result?.data && Array.isArray(result.data) ? result.data
    : Array.isArray(result) ? result
    : result == null ? []
    : [result];
  return toCsv(items);
}
