/**
 * Tests for core utilities: input validation, CSV generation, audit logging,
 * and report tool logic (user deduplication, device site rollup).
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePathParam } from '../src/client.js';
import { toCsv } from '../src/paginator.js';
import { auditErrorMetadata, auditInputKeys, auditLog, sanitizeLogString } from '../src/logging.js';
import { deduplicateUsers, buildDeviceCountByOrg } from '../src/operations/reports.js';

describe('sanitizePathParam', () => {
  it('accepts numeric IDs', () => {
    assert.equal(sanitizePathParam(12345), '12345');
    assert.equal(sanitizePathParam('12345'), '12345');
  });

  it('accepts IDs with hyphens, dots, colons', () => {
    assert.equal(sanitizePathParam('abc-123'), 'abc-123');
    assert.equal(sanitizePathParam('dev.001'), 'dev.001');
    assert.equal(sanitizePathParam('task:42'), 'task:42');
  });

  it('accepts UUIDs', () => {
    assert.equal(sanitizePathParam('a1b2c3d4-e5f6-7890-abcd-ef1234567890'), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });

  it('rejects empty', () => assert.throws(() => sanitizePathParam(''), /empty/));
  it('rejects ..', () => assert.throws(() => sanitizePathParam('../../etc/passwd')));
  it('rejects slashes', () => assert.throws(() => sanitizePathParam('foo/bar')));
  it('rejects encoded slashes', () => assert.throws(() => sanitizePathParam('%2F')));
  it('rejects backslashes', () => assert.throws(() => sanitizePathParam('foo\\bar')));
  it('rejects spaces and special chars', () => {
    assert.throws(() => sanitizePathParam('foo bar'));
    assert.throws(() => sanitizePathParam('<script>'));
    assert.throws(() => sanitizePathParam('id;DROP'));
  });
});

describe('toCsv', () => {
  it('basic objects', () => {
    const lines = toCsv([{ a: 1, b: 'hello' }]).split('\n');
    assert.equal(lines[0], 'a,b');
    assert.equal(lines[1], '1,hello');
  });

  it('escapes commas and quotes', () => {
    const csv = toCsv([{ name: 'Foo, Inc.', desc: 'He said "hi"' }]);
    assert.match(csv, /"Foo, Inc\."/);
    assert.match(csv, /"He said ""hi"""/);
  });

  it('flattens nested objects', () => {
    const csv = toCsv([{ id: 1, meta: { tag: 'test' } }]);
    assert.match(csv, /meta\.tag/);
  });

  it('returns "No data" for empty input', () => {
    assert.equal(toCsv([]), 'No data');
    assert.equal(toCsv(null), 'No data');
  });

  it('joins arrays with semicolons', () => {
    assert.match(toCsv([{ items: ['a', 'b', 'c'] }]), /a; b; c/);
  });
});

describe('auditLog', () => {
  it('handles normal objects', () => assert.doesNotThrow(() => auditLog('tool_call', { tool: 'foo' })));
  it('handles circular refs', () => {
    const obj = { a: 1 };
    obj.self = obj;
    assert.doesNotThrow(() => auditLog('tool_call', { data: obj }));
  });
  it('handles BigInt', () => assert.doesNotThrow(() => auditLog('tool_call', { durationMs: 9007199254740991n })));
  it('drops fields outside each event contract instead of relying on key-name heuristics', () => {
    const originalError = console.error;
    const messages = [];
    console.error = (message) => messages.push(String(message));
    try {
      auditLog('sensitive_tool_call', {
        tool: 'update_device',
        inputKeys: ['deviceId', 'password'],
        args: { innocentLookingField: 'tenant-private-value' },
        error: 'upstream-private-prose',
      });
    } finally {
      console.error = originalError;
    }
    assert.equal(messages.length, 1);
    assert.doesNotMatch(messages[0], /tenant-private-value|upstream-private-prose|password/);
    assert.match(messages[0], /deviceId/);
  });
  it('classifies errors without retaining messages or custom names', () => {
    const error = new Error('customer 12345 on https://tenant.example.test failed');
    error.name = 'TenantSpecificFailure';
    error.status = 503;
    assert.deepEqual(auditErrorMetadata(error), { errorType: 'Error', status: 503 });
    assert.deepEqual(auditErrorMetadata('private rejection'), { errorType: 'NonErrorThrown' });
  });
  it('records bounded argument names but never argument values or sensitive key names', () => {
    assert.deepEqual(
      auditInputKeys({ pageSize: 10, deviceId: 'private', password: 'private', 'bad key': true }),
      ['deviceId', 'pageSize'],
    );
  });
  it('uses one shared string sanitizer for audit and public tool errors', () => {
    const sanitized = sanitizeLogString(
      'API error 404 on GET /api/customers/12345/sites/67890: private detail',
    );
    assert.doesNotMatch(sanitized, /12345|67890|private detail/);
    assert.match(sanitized, /\/api\/customers\/\{id\}\/sites\/\{id\}/);
  });
  it('redacts resolved identifiers from audited API paths', () => {
    const originalError = console.error;
    const messages = [];
    console.error = (message) => messages.push(String(message));
    try {
      auditLog('api_retry', { method: 'GET', path: '/api/customers/12345/sites/67890', status: 500 });
    } finally {
      console.error = originalError;
    }
    assert.equal(messages.length, 1);
    assert.doesNotMatch(messages[0], /12345|67890/);
    assert.match(messages[0], /\/api\/customers\/\{id\}\/sites\/\{id\}/);
  });
  it('redacts top-level tenant identity fields', () => {
    const originalError = console.error;
    const messages = [];
    console.error = (message) => messages.push(String(message));
    try {
      auditLog('session_init', { fqdn: 'https://tenant.example.test', tenant: 'tenant-key' });
    } finally {
      console.error = originalError;
    }
    assert.equal(messages.length, 1);
    assert.doesNotMatch(messages[0], /tenant\.example\.test|tenant-key/);
    assert.match(messages[0], /\[REDACTED\]/);
  });
  it('redacts session, client address, and identifiers embedded in error text', () => {
    const originalError = console.error;
    const messages = [];
    console.error = (message) => messages.push(String(message));
    try {
      auditLog('tool_error', {
        sessionId: 'session-private',
        ip: '192.0.2.44',
        error: 'API error 404 on GET /api/customers/12345/sites/67890: private detail',
      });
    } finally {
      console.error = originalError;
    }
    assert.equal(messages.length, 1);
    assert.doesNotMatch(messages[0], /session-private|192\.0\.2\.44|12345|67890|private detail/);
    assert.doesNotMatch(messages[0], /"error"|"sessionId"|"ip"/);
  });
});

// ---------------------------------------------------------------------------
// report_all_users_by_so — deduplication logic (imported from reports.js)
// ---------------------------------------------------------------------------
describe('report_all_users_by_so deduplication', () => {
  it('removes duplicate users that appear in multiple org units', () => {
    const shared = { userId: 1, userName: 'a@b.com' };
    const batches = [
      [shared, { userId: 2, userName: 'c@d.com' }],
      [shared, { userId: 3, userName: 'e@f.com' }],
    ];
    const result = deduplicateUsers(batches);
    assert.equal(result.length, 3);
    assert.equal(result.filter(u => u.userId === 1).length, 1);
  });

  it('handles empty and null batches gracefully', () => {
    const result = deduplicateUsers([[], null, [{ userId: 10, userName: 'x@y.com' }]]);
    assert.equal(result.length, 1);
  });

  it('preserves all unique users', () => {
    const batches = [
      [{ userId: 1 }, { userId: 2 }],
      [{ userId: 3 }, { userId: 4 }],
    ];
    assert.equal(deduplicateUsers(batches).length, 4);
  });
});

// ---------------------------------------------------------------------------
// report_customer_site_summary — site→customer device count rollup (imported from reports.js)
// ---------------------------------------------------------------------------
describe('report_customer_site_summary device rollup', () => {
  it('credits site devices to parent customer', () => {
    const siteParentMap = { 200: 100 };
    const devices = [
      { orgUnitId: 200 },
      { orgUnitId: 200 },
      { orgUnitId: 100 },
    ];
    const counts = buildDeviceCountByOrg(devices, siteParentMap);
    assert.equal(counts[200], 2, 'site should have 2 devices');
    assert.equal(counts[100], 3, 'customer should have 3 total (2 from site + 1 direct)');
  });

  it('does not double-count devices already directly under customer', () => {
    const devices = [{ orgUnitId: 100 }, { orgUnitId: 100 }];
    const counts = buildDeviceCountByOrg(devices, {});
    assert.equal(counts[100], 2);
  });

  it('handles devices with no orgUnitId gracefully', () => {
    const counts = buildDeviceCountByOrg([{ orgUnitId: null }, {}], {});
    assert.deepEqual(counts, {});
  });
});
