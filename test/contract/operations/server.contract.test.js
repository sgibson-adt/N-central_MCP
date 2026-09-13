import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { installContractFetch, jsonResponse, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import {
  getHealth, getServerInfo, getServerTime, getCurrentUser, validateSession, listJobStatuses,
} from '../../../src/operations/server-info.js';

let boundary;
afterEach(() => boundary?.restore());

describe('server and authentication operation adapters', () => {
  it('authenticates lazily and routes all server/session/user reads', async () => {
    boundary = installContractFetch();
    await withSyntheticTenant(syntheticTenant('server'), async () => {
      await getHealth();
      await getServerInfo();
      await getServerInfo('extra');
      await getServerTime();
      await getCurrentUser();
      await validateSession();
      await listJobStatuses('42');
    });
    assert.deepEqual(boundary.calls.map(({ method, path }) => `${method} ${path}`), [
      'POST /api/auth/authenticate',
      'GET /api/health',
      'GET /api/server-info',
      'GET /api/server-info/extra',
      'GET /api/server-info/time',
      'GET /api/users/me',
      'GET /api/auth/validate',
      'GET /api/org-units/42/job-statuses',
    ]);
  });

  it('re-authenticates after a 401 without leaking tokens', async () => {
    let first = true;
    boundary = installContractFetch({ responder(call) {
      if (call.path === '/api/health' && first) {
        first = false;
        return jsonResponse({ error: 'expired' }, 401);
      }
      return null;
    } });
    await withSyntheticTenant(syntheticTenant('refresh'), () => getHealth());
    assert.equal(boundary.calls.filter((call) => call.path === '/api/auth/authenticate').length, 2);
    assert.equal(JSON.stringify(boundary.calls).includes('synthetic-access'), false);
  });
});
