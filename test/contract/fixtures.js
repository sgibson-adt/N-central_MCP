// @ts-check
/** Deterministic, network-free fixtures shared by REST operation and MCP contract tests. */

import { als, makeContext } from '../../src/context.js';
import { evictTenant } from '../../src/auth.js';

const SYNTHETIC_SUFFIXES = ['.example.com', '.example.test', '.invalid'];

/** @param {string} id */
export function syntheticJwt(id = 'tenant-a') {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({ sub: id, synthetic: true })}.signature`;
}

/** @param {string} id */
export function syntheticTenant(id = 'tenant-a') {
  const normalized = id.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return makeContext(`https://${normalized}.example.test`, syntheticJwt(normalized));
}

/** @param {string} id */
export function syntheticTokens(id = 'tenant-a') {
  return {
    access: { token: `synthetic-access-${id}` },
    refresh: { token: `synthetic-refresh-${id}` },
  };
}

/** @param {unknown} body @param {number} [status] @param {Record<string, string>} [headers] */
export function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/** @param {string} body @param {number} [status] @param {Record<string, string>} [headers] */
export function textResponse(body, status = 200, headers = {}) {
  return new Response(body, { status, headers });
}

/** @param {number} status @param {unknown} [body] */
export function errorResponse(status, body = { error: `synthetic-${status}` }) {
  return typeof body === 'string' ? textResponse(body, status) : jsonResponse(body, status);
}

/**
 * Install a deterministic fetch boundary that rejects non-synthetic external hosts.
 * A responder receives the captured call and may return a Response; otherwise a
 * JSON echo response is returned. Authentication endpoints receive synthetic tokens.
 *
 * @param {{ responder?: (call: CapturedRequest) => Response | Promise<Response | null> | null }} [options]
 */
export function installContractFetch({ responder } = {}) {
  const originalFetch = global.fetch;
  /** @type {CapturedRequest[]} */
  const calls = [];
  let active = 0;
  let maxConcurrency = 0;

  global.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (!SYNTHETIC_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))) {
      throw new Error(`External network access rejected by contract fixture: ${url.hostname}`);
    }

    active += 1;
    maxConcurrency = Math.max(maxConcurrency, active);
    try {
      const headers = new Headers(init.headers);
      let body = null;
      if (typeof init.body === 'string' && init.body.length > 0) {
        try { body = JSON.parse(init.body); }
        catch { body = init.body; }
      }
      const call = {
        method: String(init.method || 'GET').toUpperCase(),
        url: url.toString(),
        origin: url.origin,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        body,
        headers: Object.fromEntries(
          [...headers.entries()].map(([name, value]) => [
            name.toLowerCase(),
            name.toLowerCase() === 'authorization' ? '[REDACTED]' : value,
          ]),
        ),
      };
      calls.push(call);

      if (url.pathname === '/api/auth/authenticate') {
        return jsonResponse({ tokens: syntheticTokens(url.hostname) });
      }
      if (url.pathname === '/api/auth/refresh') {
        return jsonResponse({ tokens: syntheticTokens(url.hostname) });
      }

      const response = responder ? await responder(call) : null;
      return response || jsonResponse({ data: { path: call.path, query: call.query, body: call.body } });
    } finally {
      active -= 1;
    }
  };

  return {
    calls,
    get callCount() { return calls.length; },
    get activeCount() { return active; },
    get maxConcurrency() { return maxConcurrency; },
    restore() { global.fetch = originalFetch; },
  };
}

/** @template T @param {ReturnType<typeof syntheticTenant>} tenant @param {() => Promise<T> | T} fn */
export async function withSyntheticTenant(tenant, fn) {
  try {
    return await als.run(tenant, fn);
  } finally {
    evictTenant(tenant.key);
  }
}

/** @typedef {{ method: string, url: string, origin: string, path: string, query: Record<string, string>, body: unknown, headers: Record<string, string> }} CapturedRequest */
