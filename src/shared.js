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
  if (args.pageNumber != null
    && (!Number.isInteger(args.pageNumber) || args.pageNumber < 1)) {
    throw new TypeError('pageNumber must be an integer starting at 1');
  }
  if (args.pageSize != null) {
    const validPageSize = Number.isInteger(args.pageSize)
      && ((policy.allowMinusOne && args.pageSize === -1)
        || (args.pageSize >= 1 && args.pageSize <= policy.maxPageSize));
    if (!validPageSize) {
      const accepted = policy.allowMinusOne
        ? `-1 or an integer from 1 through ${policy.maxPageSize}`
        : `an integer from 1 through ${policy.maxPageSize}`;
      throw new TypeError(`pageSize must be ${accepted}`);
    }
  }
  if (Object.hasOwn(args, 'all') && args.all !== undefined && typeof args.all !== 'boolean') {
    throw new TypeError('all must be a boolean');
  }
  return {
    pageNumber: args.pageNumber,
    pageSize: args.pageSize,
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
  const query = paginationArgs(args || {}, policy);
  if (args?.all) {
    const { pageNumber: _pageNumber, pageSize: _pageSize, ...filters } = query;
    return fetchAll(path, { ...baseParams, ...filters }, policy.autoPageSize);
  }
  return apiGet(path, { ...baseParams, ...query });
}

/**
 * Search canonical human-name fields after bounded complete-page retrieval.
 * Raw FIQL/sort inputs remain upstream pre-filters; names are never inserted
 * into a server expression, avoiding endpoint-specific escaping ambiguity.
 *
 * @param {string} path
 * @param {Record<string, unknown>} baseParams
 * @param {Record<string, any>} args
 * @param {readonly string[]} fields
 * @param {PaginationPolicy} [policy]
 * @returns {Promise<unknown>}
 */
export async function fetchOrSearchByName(
  path, baseParams, args, fields, policy = PAGINATION_POLICIES.allowAll,
) {
  const hasName = args?.name != null;
  if (!hasName) {
    if (args?.nameMatch != null) throw new TypeError('nameMatch requires name');
    return fetchOrPaginate(path, baseParams, args, policy);
  }
  if (typeof args.name !== 'string' || args.name.trim().length === 0 || args.name.length > 200) {
    throw new TypeError('name must be a non-empty string no longer than 200 characters');
  }
  const match = args.nameMatch ?? 'contains';
  if (match !== 'exact' && match !== 'contains') {
    throw new TypeError('nameMatch must be exact or contains');
  }
  if (args.pageNumber != null || args.pageSize != null) {
    const field = args.pageNumber != null ? 'pageNumber' : 'pageSize';
    throw new TypeError(`name search automatically retrieves bounded pages; omit ${field}`);
  }
  if (args.all === false) {
    throw new TypeError('name search automatically retrieves bounded pages; omit all or set it to true');
  }

  const normalize = (value) => String(value).trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
  const needle = normalize(args.name);
  const records = await fetchOrPaginate(path, baseParams, { ...args, all: true }, policy);
  if (!Array.isArray(records)) return [];
  return records.filter((record) => fields.some((field) => {
    const value = record?.[field];
    if (typeof value !== 'string') return false;
    const candidate = normalize(value);
    return match === 'exact' ? candidate === needle : candidate.includes(needle);
  }));
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
