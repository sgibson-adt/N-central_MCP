/**
 * N-central auth: JWT → access/refresh token exchange with auto-refresh.
 *
 * Only one auth or refresh request runs at a time (promise guards).
 * On 401 or refresh failure, falls back to full JWT re-auth.
 */

const AUTH_TIMEOUT_MS = 15_000;
const TOKEN_LIFETIME_MS = 50 * 60_000; // refresh well before the 60-min expiry
const REFRESH_BUFFER_MS = 5 * 60_000;

let serverUrl = null;
let jwtToken = null;
let accessToken = null;
let refreshToken = null;
let tokenExpiry = null;

let pendingAuth = null;
let pendingRefresh = null;

export async function authenticate(url, jwt) {
  serverUrl = url.replace(/\/+$/, '');
  jwtToken = jwt;
  await exchangeJwt();
}

function exchangeJwt() {
  if (pendingAuth) return pendingAuth;

  pendingAuth = (async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), AUTH_TIMEOUT_MS);

    try {
      const res = await fetch(`${serverUrl}/api/auth/authenticate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
        signal: ac.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Auth failed (${res.status}): ${body.substring(0, 200)}`);
      }

      const data = await res.json();
      accessToken = data.tokens.access.token;
      refreshToken = data.tokens.refresh.token;
      tokenExpiry = Date.now() + TOKEN_LIFETIME_MS;
    } catch (err) {
      if (err.name === 'AbortError') throw new Error(`Auth timed out (${AUTH_TIMEOUT_MS}ms)`);
      throw err;
    } finally {
      clearTimeout(timer);
      pendingAuth = null;
    }
  })();

  return pendingAuth;
}

function refreshAccessToken() {
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = (async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), AUTH_TIMEOUT_MS);

    try {
      const res = await fetch(`${serverUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${refreshToken}`, 'Content-Type': 'application/json' },
        signal: ac.signal,
      });

      if (!res.ok) {
        console.error(`Refresh failed (${res.status}), re-authenticating...`);
        await exchangeJwt();
        return;
      }

      const data = await res.json();
      accessToken = data.tokens.access.token;
      refreshToken = data.tokens.refresh.token;
      tokenExpiry = Date.now() + TOKEN_LIFETIME_MS;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('Refresh timed out, re-authenticating...');
        await exchangeJwt();
        return;
      }
      throw err;
    } finally {
      clearTimeout(timer);
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
}

export async function getAccessToken() {
  if (!accessToken) throw new Error('Not authenticated');
  if (Date.now() > tokenExpiry - REFRESH_BUFFER_MS) await refreshAccessToken();
  return accessToken;
}

export async function reAuthenticate() {
  await exchangeJwt();
}
