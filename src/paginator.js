/**
 * Pagination and concurrency utilities for N-central API.
 */

import { apiGet } from './client.js';

const DEFAULT_PAGE_SIZE = 200;
const MAX_PAGES = 200;

/**
 * Auto-paginate through a list endpoint, returning all items.
 */
export async function fetchAll(path, params = {}, pageSize = DEFAULT_PAGE_SIZE) {
  const all = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const res = await apiGet(path, { ...params, pageNumber: page, pageSize });
    const items = res.data || [];
    all.push(...items);

    const totalPages = res.totalPages ?? res._page?.totalPages ?? 1;
    if (page >= totalPages || items.length === 0) break;
    page++;
  }

  return all;
}

/**
 * Map over items with bounded concurrency. Results preserve input order.
 * Errors are captured per-item as { _error, _item } instead of throwing.
 *
 * Safe without locks: Node is single-threaded and `nextIndex++` only
 * executes between awaits, so two workers can't grab the same index.
 */
export async function mapConcurrent(items, fn, concurrency = 5) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      try {
        results[i] = await fn(items[i], i);
      } catch (err) {
        results[i] = { _error: err.message, _item: items[i] };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

/**
 * Convert an array of objects to CSV.
 * Nested objects are flattened with dot notation.
 */
export function toCsv(items, columns = null) {
  if (!items?.length) return 'No data';

  const flat = items.map(flatten);
  const cols = columns ?? [...new Set(flat.flatMap(Object.keys))];
  const header = cols.map(csvEscape).join(',');
  const rows = flat.map(item => cols.map(c => csvEscape(item[c] ?? '')).join(','));

  return [header, ...rows].join('\n');
}

function flatten(obj, prefix = '') {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v == null) out[key] = '';
    else if (Array.isArray(v)) out[key] = v.join('; ');
    else if (typeof v === 'object') Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

function csvEscape(value) {
  const s = String(value);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}
