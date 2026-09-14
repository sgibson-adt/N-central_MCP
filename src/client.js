// @ts-check
/** N-central API client: authenticated HTTP with retry and auto re-auth on 401. */

import { getAccessToken, reAuthenticate } from './auth.js';
import { getContext } from './context.js';
import { auditLog } from './logging.js';
import { inc } from './metrics.js';
import { configuredNumber } from './config.js';

const MAX_RETRIES = configuredNumber('NC_MAX_RETRIES', 3, { integer: true });
const RETRY_DELAY_MS = configuredNumber('NC_RETRY_DELAY_MS', 2000);
const TIMEOUT_MS = configuredNumber('NC_REQUEST_TIMEOUT_MS', 30_000, { minimum: 1 });

/** @typedef {'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'} HttpMethod */

export class NcentralApiError extends Error {
  /**
   * @param {string} category
   * @param {string} message
   * @param {{status?: number, method?: HttpMethod, path?: string, cause?: unknown}} [options]
   */
  constructor(category, message, options = {}) {
    super(message, options.cause == null ? undefined : { cause: options.cause });
    this.name = 'NcentralApiError';
    this.category = category;
    if (options.status != null) this.status = options.status;
    if (options.method != null) this.method = options.method;
    if (options.path != null) this.path = stripQuery(options.path);
  }
}

function httpError(status, method, path) {
  let category = 'request_failed';
  if (status === 400 || status === 422) category = 'invalid_request';
  else if (status === 401) category = 'authentication_failed';
  else if (status === 403) category = 'forbidden';
  else if (status === 404) category = 'not_found';
  else if (status === 409) category = 'conflict';
  else if (status === 429) category = 'rate_limited';
  else if (status >= 500) category = 'upstream_unavailable';
  return new NcentralApiError(
    category,
    `N-central ${category} (${status}) on ${method} ${stripQuery(path)}`,
    { status, method, path },
  );
}

// Idempotent methods retry on timeouts and 5xx. POST/PATCH retry only on
// auth/rate-limit failures (where the request did not reach the handler).
const IDEMPOTENT_METHODS = new Set(['GET', 'PUT', 'DELETE', 'HEAD']);

/**
 * Validate a value for safe use in a URL path segment.
 *
 * @param {string | number} value
 * @returns {string}
 * @throws {Error}
 */
export function sanitizePathParam(value) {
  if (value == null) throw new Error('Path parameter must not be null or undefined');
  const str = String(value);
  if (!str.length) throw new Error('Path parameter must not be empty');
  if (
    str.includes('..') ||
    str.includes('/') ||
    str.includes('\\') ||
    str.includes('%2F') ||
    str.includes('%2f')
  ) {
    throw new Error('Invalid path parameter');
  }
  if (!/^[a-zA-Z0-9._:-]+$/.test(str)) throw new Error('Invalid path parameter');
  return str;
}

/**
 * @param {HttpMethod} method
 * @param {string} path
 * @param {{ params?: Record<string, unknown>, body?: unknown, retryTransient?: boolean }} [options]
 * @returns {Promise<unknown>}
 */
async function apiRequest(method, path, { params = {}, body = null, retryTransient = true } = {}) {
  // Resolve the tenant context once and reuse it for the whole request,
  // including retries — never re-read mid-flight (defends against any future
  // async-context drift, and one request always belongs to one tenant).
  const ctx = getContext();

  const url = buildUrl(ctx.fqdn, path, params);
  const hasBody = body != null;
  const canRetryTransient = retryTransient && IDEMPOTENT_METHODS.has(method);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const token = await getAccessToken(ctx);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
    if (hasBody) headers['Content-Type'] = 'application/json';

    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: hasBody ? JSON.stringify(body) : undefined,
        signal: ac.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        if (attempt < MAX_RETRIES && canRetryTransient) {
          const delay = RETRY_DELAY_MS * 2 ** attempt;
          auditLog('api_retry', { method, path: stripQuery(path), reason: 'timeout', attempt: attempt + 1, delayMs: delay });
        inc('nc_mcp_api_retries_total', { reason: 'timeout' });
          await sleep(delay);
          continue;
        }
        throw new NcentralApiError(
          'timeout', `N-central timeout on ${method} ${stripQuery(path)}`,
          { method, path, cause: err },
        );
      }
      throw err;
    }

    clearTimeout(timer);

    if (res.status === 429) {
      if (attempt < MAX_RETRIES) {
        await discardResponse(res);
        const delay = RETRY_DELAY_MS * 2 ** attempt;
        auditLog('api_retry', { method, path: stripQuery(path), status: 429, attempt: attempt + 1, delayMs: delay });
        inc('nc_mcp_api_retries_total', { reason: '429' });
        await sleep(delay);
        continue;
      }
      await discardResponse(res);
      throw httpError(429, method, path);
    }

    if (res.status === 401) {
      // One fresh token replay is enough to distinguish expiry from a route-
      // specific permission/integration rejection. Re-authenticating the same
      // request repeatedly only adds delay and cannot change authorization.
      if (attempt < Math.min(MAX_RETRIES, 1)) {
        await discardResponse(res);
        const delay = 0;
        auditLog('api_retry', { method, path: stripQuery(path), status: 401, attempt: attempt + 1, delayMs: delay });
        inc('nc_mcp_api_retries_total', { reason: '401' });
        await reAuthenticate(ctx);
        continue;
      }
      await discardResponse(res);
      throw httpError(401, method, path);
    }

    if (res.status >= 500 && res.status <= 599) {
      if (attempt < MAX_RETRIES && canRetryTransient) {
        await discardResponse(res);
        const delay = RETRY_DELAY_MS * 2 ** attempt;
        auditLog('api_retry', { method, path: stripQuery(path), status: res.status, attempt: attempt + 1, delayMs: delay });
        inc('nc_mcp_api_retries_total', { reason: String(res.status) });
        await sleep(delay);
        continue;
      }
      await discardResponse(res);
      throw httpError(res.status, method, path);
    }

    if (!res.ok) {
      // Do not expose response bodies: N-central errors can contain tenant data.
      await discardResponse(res);
      throw httpError(res.status, method, path);
    }

    if (res.status === 204) return null;

    const text = await res.text();
    if (!text) return null;

    const contentType = res.headers.get('content-type') || '';
    const looksJson = contentType.includes('json') || /^\s*[{[]/.test(text);

    if (!looksJson) return text;

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new NcentralApiError(
        'invalid_response', `N-central invalid_response on ${method} ${stripQuery(path)}`,
        { method, path },
      );
    }

    // N-central wraps some errors as an `error message` property inside 200
    // responses. Deployments have emitted different capitalization, so match
    // the documented field name case-insensitively.
    const wrappedErrorEntry = data && typeof data === 'object' && !Array.isArray(data)
      ? Object.entries(data).find(([key]) => key.trim().toLowerCase() === 'error message')
      : undefined;
    if (wrappedErrorEntry) {
      throw new NcentralApiError(
        'invalid_response', `N-central invalid_response (error envelope) on ${method} ${stripQuery(path)}`,
        { method, path },
      );
    }

    return data;
  }
  throw new Error(`apiRequest: retry loop exhausted on ${method} ${stripQuery(path)} without returning`);
}

export function apiGet(path, params = {}) {
  return apiRequest('GET', path, { params });
}

/** GET without transient timeout/5xx retries; authentication and rate-limit recovery still apply. */
export function apiGetOnce(path, params = {}) {
  return apiRequest('GET', path, { params, retryTransient: false });
}

export function apiPost(path, body = null, params = {}) {
  return apiRequest('POST', path, { body, params });
}

export function apiPut(path, body = null, params = {}) {
  return apiRequest('PUT', path, { body, params });
}

export function apiPatch(path, body = null, params = {}) {
  return apiRequest('PATCH', path, { body, params });
}

export function apiDelete(path, params = {}, body = null) {
  return apiRequest('DELETE', path, { body, params });
}

function stripQuery(path) {
  const q = path.indexOf('?');
  return q === -1 ? path : path.slice(0, q);
}

function buildUrl(fqdn, path, params) {
  const url = new URL(`${fqdn}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function discardResponse(response) {
  try { await response.body?.cancel(); } catch { /* best-effort connection cleanup */ }
}
