/**
 * N-central API client — authenticated GET with retry, rate-limit handling,
 * and automatic token refresh on 401.
 */

import { getAccessToken, reAuthenticate } from './auth.js';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const TIMEOUT_MS = 30_000;

let serverUrl = null;

export function setServerUrl(url) {
  serverUrl = url.replace(/\/+$/, '');
}

/**
 * Validates a value for safe use in a URL path segment.
 * Rejects empty strings, path traversal, slashes, and special chars.
 */
export function sanitizePathParam(value) {
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

export async function apiGet(path, params = {}) {
  if (!serverUrl) throw new Error('Server URL not set');

  const url = buildUrl(path, params);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const token = await getAccessToken();
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

    let res;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: ac.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * 2 ** attempt;
          console.error(`Timeout on ${stripQuery(path)}, retry in ${delay}ms...`);
          await sleep(delay);
          continue;
        }
        throw new Error(`Request timed out after ${MAX_RETRIES} retries`);
      }
      throw err;
    }

    clearTimeout(timer);

    if (res.status === 429) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * 2 ** attempt;
        console.error(`Rate limited (429), retry in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw new Error('Rate limited (429) after retries');
    }

    if (res.status === 401) {
      if (attempt < MAX_RETRIES) {
        console.error('Got 401, re-authenticating...');
        await reAuthenticate();
        continue;
      }
      throw new Error('Unauthorized (401) after re-auth');
    }

    if (res.status === 500 || res.status === 503) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * 2 ** attempt;
        console.error(`Server error (${res.status}), retry in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw new Error(`Server error ${res.status} after retries`);
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API error ${res.status} on ${stripQuery(path)}: ${truncate(body, 200)}`);
    }

    const data = await res.json();

    // N-central sometimes wraps errors inside 200 responses
    if (data?.['error message']) {
      throw new Error(`API error in 200 response: ${truncate(data['error message'], 200)}`);
    }

    return data;
  }
}

function stripQuery(path) {
  const q = path.indexOf('?');
  return q === -1 ? path : path.slice(0, q);
}

function truncate(str, max) {
  if (!str) return '';
  const s = String(str);
  return s.length > max ? `${s.slice(0, max)}...` : s;
}

function buildUrl(path, params) {
  const url = new URL(`${serverUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
