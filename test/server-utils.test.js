/**
 * Tests for server-utils.js — safeCompare timing/correctness,
 * jsonSchemaToZod type mapping, and parseAuthorizationHeader parsing rules.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  safeCompare,
  jsonSchemaToZod,
  parseAuthorizationHeader,
  validateNcFqdn,
  looksLikeJwt,
} from '../src/server-utils.js';

// ---------------------------------------------------------------------------
// safeCompare
// ---------------------------------------------------------------------------
describe('safeCompare', () => {
  it('returns true for equal strings', () => {
    assert.equal(safeCompare('hello', 'hello'), true);
    assert.equal(safeCompare('a', 'a'), true);
  });

  it('returns false for different equal-length strings', () => {
    assert.equal(safeCompare('hello', 'world'), false);
  });

  it('returns false for different-length strings (no length leak)', () => {
    assert.equal(safeCompare('short', 'verymuchlongersecret'), false);
    assert.equal(safeCompare('', 'x'), false);
  });

  it('returns false for non-string inputs', () => {
    assert.equal(safeCompare(null, 'x'), false);
    assert.equal(safeCompare('x', null), false);
    assert.equal(safeCompare(undefined, undefined), false);
    assert.equal(safeCompare(123, '123'), false);
    assert.equal(safeCompare(['x'], 'x'), false);
    assert.equal(safeCompare({}, 'x'), false);
  });

  it('handles empty strings', () => {
    assert.equal(safeCompare('', ''), true);
  });

  it('is case-sensitive', () => {
    assert.equal(safeCompare('Token', 'token'), false);
  });

  it('handles unicode correctly', () => {
    assert.equal(safeCompare('héllo', 'héllo'), true);
    assert.equal(safeCompare('héllo', 'hello'), false);
  });
});

// ---------------------------------------------------------------------------
// jsonSchemaToZod
// ---------------------------------------------------------------------------
describe('jsonSchemaToZod', () => {
  it('maps "number" and "integer" to z.number()', () => {
    assert.equal(jsonSchemaToZod({ type: 'number' }).safeParse(42).success, true);
    assert.equal(jsonSchemaToZod({ type: 'integer' }).safeParse(42).success, true);
    assert.equal(jsonSchemaToZod({ type: 'number' }).safeParse('x').success, false);
  });

  it('preserves both minimum and maximum bounds', () => {
    const schema = jsonSchemaToZod({ type: 'integer', minimum: 1, maximum: 1000 });
    assert.equal(schema.safeParse(1).success, true);
    assert.equal(schema.safeParse(1000).success, true);
    assert.equal(schema.safeParse(0).success, false);
    assert.equal(schema.safeParse(1001).success, false);
  });

  it('maps "boolean" to z.boolean()', () => {
    assert.equal(jsonSchemaToZod({ type: 'boolean' }).safeParse(true).success, true);
    assert.equal(jsonSchemaToZod({ type: 'boolean' }).safeParse('true').success, false);
  });

  it('maps "string" without enum to z.string()', () => {
    assert.equal(jsonSchemaToZod({ type: 'string' }).safeParse('hi').success, true);
    assert.equal(jsonSchemaToZod({ type: 'string' }).safeParse(42).success, false);
  });

  it('preserves string length and pattern constraints', () => {
    const schema = jsonSchemaToZod({ type: 'string', minLength: 2, maxLength: 4, pattern: '^[A-Z]+$' });
    assert.equal(schema.safeParse('AB').success, true);
    assert.equal(schema.safeParse('a').success, false);
    assert.equal(schema.safeParse('ABCDE').success, false);
  });

  it('maps "string" with enum to z.enum()', () => {
    const schema = jsonSchemaToZod({ type: 'string', enum: ['a', 'b'] });
    assert.equal(schema.safeParse('a').success, true);
    assert.equal(schema.safeParse('c').success, false);
  });

  it('maps "array" with number items to z.array(z.number())', () => {
    const schema = jsonSchemaToZod({ type: 'array', items: { type: 'number' } });
    assert.equal(schema.safeParse([1, 2, 3]).success, true);
    assert.equal(schema.safeParse(['x']).success, false);
  });

  it('preserves array item-count constraints', () => {
    const schema = jsonSchemaToZod({ type: 'array', minItems: 1, maxItems: 2, items: { type: 'string' } });
    assert.equal(schema.safeParse(['a']).success, true);
    assert.equal(schema.safeParse([]).success, false);
    assert.equal(schema.safeParse(['a', 'b', 'c']).success, false);
  });

  it('maps "array" without items.type to z.array(z.string())', () => {
    const schema = jsonSchemaToZod({ type: 'array' });
    assert.equal(schema.safeParse(['x', 'y']).success, true);
  });

  it('maps "array" with object items to z.array(z.object(...))', () => {
    const schema = jsonSchemaToZod({ type: 'array', items: { type: 'object' } });
    assert.equal(schema.safeParse([{ a: 1 }, { b: 2 }]).success, true);
  });

  it('maps "object" to z.object({}).passthrough()', () => {
    const schema = jsonSchemaToZod({ type: 'object' });
    assert.equal(schema.safeParse({ foo: 'bar' }).success, true);
    assert.equal(schema.safeParse('x').success, false);
  });

  it('falls back to z.string() for unknown types', () => {
    const schema = jsonSchemaToZod({ type: 'banana' });
    assert.equal(schema.safeParse('x').success, true);
    assert.equal(schema.safeParse(42).success, false);
  });

  it('preserves the description on the schema', () => {
    const schema = jsonSchemaToZod({ type: 'string', description: 'A name' });
    // _def.description survives across Zod 3/4
    const desc = schema._def?.description ?? schema.description;
    assert.equal(desc, 'A name');
  });

  it('preserves nullable types, constants, alternatives, and defaults', () => {
    const nullable = jsonSchemaToZod({ type: ['string', 'null'] });
    assert.equal(nullable.safeParse('value').success, true);
    assert.equal(nullable.safeParse(null).success, true);

    const constant = jsonSchemaToZod({ const: -1 });
    assert.equal(constant.safeParse(-1).success, true);
    assert.equal(constant.safeParse(1).success, false);

    const alternative = jsonSchemaToZod({
      type: 'integer',
      anyOf: [{ const: -1 }, { minimum: 1, maximum: 1000 }],
    });
    assert.equal(alternative.safeParse(-1).success, true);
    assert.equal(alternative.safeParse(1).success, true);
    assert.equal(alternative.safeParse(1000).success, true);
    assert.equal(alternative.safeParse(0).success, false);
    assert.equal(alternative.safeParse(1001).success, false);

    const defaulted = jsonSchemaToZod({ type: 'string', default: 'contains' });
    assert.equal(defaulted.parse(undefined), 'contains');
  });

  it('preserves closed-object semantics inside alternatives', () => {
    const schema = jsonSchemaToZod({
      anyOf: [{
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false,
      }],
    });
    assert.equal(schema.safeParse({ id: '1' }).success, true);
    assert.equal(schema.safeParse({ id: '1', unexpected: true }).success, false);
  });
});

// ---------------------------------------------------------------------------
// parseAuthorizationHeader
// ---------------------------------------------------------------------------
describe('parseAuthorizationHeader', () => {
  it('extracts the token from a Bearer header', () => {
    assert.equal(parseAuthorizationHeader('Bearer abc123'), 'abc123');
    assert.equal(parseAuthorizationHeader('bearer abc123'), 'abc123');
    assert.equal(parseAuthorizationHeader('BEARER abc123'), 'abc123');
  });

  it('returns the raw value when no "Bearer" prefix', () => {
    assert.equal(parseAuthorizationHeader('rawtoken'), 'rawtoken');
  });

  it('returns null for missing or non-string headers', () => {
    assert.equal(parseAuthorizationHeader(undefined), null);
    assert.equal(parseAuthorizationHeader(''), null);
    assert.equal(parseAuthorizationHeader(null), null);
    assert.equal(parseAuthorizationHeader(['Bearer x']), null);
  });

  it('handles "Bearer " with extra spaces by returning the raw form', () => {
    // "Bearer  x" splits to ['Bearer', '', 'x'] — three parts, not two — so raw return.
    const out = parseAuthorizationHeader('Bearer  x');
    assert.equal(out, 'Bearer  x');
  });
});

// ---------------------------------------------------------------------------
// validateNcFqdn
// ---------------------------------------------------------------------------
describe('validateNcFqdn', () => {
  it('accepts a plain https origin and normalizes it (no trailing slash)', () => {
    assert.equal(validateNcFqdn('https://ncentral.example.com'), 'https://ncentral.example.com');
    assert.equal(validateNcFqdn('https://ncentral.example.com/'), 'https://ncentral.example.com');
  });

  it('preserves an explicit non-default port', () => {
    assert.equal(validateNcFqdn('https://host.example.com:8443'), 'https://host.example.com:8443');
  });

  it('rejects non-https schemes', () => {
    assert.throws(() => validateNcFqdn('http://host.example.com'), /https/);
    assert.throws(() => validateNcFqdn('ftp://host.example.com'), /https/);
  });

  it('rejects embedded credentials (userinfo)', () => {
    assert.throws(() => validateNcFqdn('https://evil@allowed.com'), /credentials/);
    assert.throws(() => validateNcFqdn('https://user:pass@host.com'), /credentials/);
  });

  it('rejects a path, query, or fragment', () => {
    assert.throws(() => validateNcFqdn('https://host.com/api'), /path|query|fragment/);
    assert.throws(() => validateNcFqdn('https://host.com/?x=1'), /path|query|fragment/);
    assert.throws(() => validateNcFqdn('https://host.com/#f'), /path|query|fragment/);
  });

  it('rejects non-string / empty input', () => {
    assert.throws(() => validateNcFqdn(undefined), /required/);
    assert.throws(() => validateNcFqdn(''), /required/);
    assert.throws(() => validateNcFqdn('   '), /required/);
    assert.throws(() => validateNcFqdn('not a url'), /valid URL/);
  });

  it('enforces an allowlist by exact or DNS-suffix match', () => {
    const allow = ['ncentral.com', 'n-able.com'];
    assert.equal(validateNcFqdn('https://ncentral.com', allow), 'https://ncentral.com');
    assert.equal(validateNcFqdn('https://eu.ncentral.com', allow), 'https://eu.ncentral.com');
    assert.equal(validateNcFqdn('https://demo.n-able.com', allow), 'https://demo.n-able.com');
  });

  it('rejects substring / look-alike hosts that are not true suffixes', () => {
    const allow = ['ncentral.com'];
    // suffix-spoof: ncentral.com is NOT a DNS-suffix of these
    assert.throws(() => validateNcFqdn('https://ncentral.com.evil.com', allow), /allowlist/);
    assert.throws(() => validateNcFqdn('https://evilncentral.com', allow), /allowlist/);
    assert.throws(() => validateNcFqdn('https://ncentralXcom', allow), /allowlist/);
    assert.throws(() => validateNcFqdn('https://notallowed.io', allow), /allowlist/);
  });

  it('allows any https host when the allowlist is empty', () => {
    assert.equal(validateNcFqdn('https://anything.io', []), 'https://anything.io');
  });
});

// ---------------------------------------------------------------------------
// looksLikeJwt
// ---------------------------------------------------------------------------
describe('looksLikeJwt', () => {
  it('accepts three non-empty base64url segments', () => {
    assert.equal(looksLikeJwt('aaa.bbb.ccc'), true);
    assert.equal(looksLikeJwt('eyJhbGci.eyJzdWIi.S-flKx_w0'), true);
  });

  it('rejects wrong segment counts', () => {
    assert.equal(looksLikeJwt('aaa.bbb'), false);
    assert.equal(looksLikeJwt('aaa.bbb.ccc.ddd'), false);
    assert.equal(looksLikeJwt('plain-token'), false);
  });

  it('rejects empty segments and non-base64url characters', () => {
    assert.equal(looksLikeJwt('aaa..ccc'), false);
    assert.equal(looksLikeJwt('aaa.bbb.'), false);
    assert.equal(looksLikeJwt('aa+a.bbb.ccc'), false);
    assert.equal(looksLikeJwt('aaa.bb/b.ccc'), false);
  });

  it('rejects non-string input', () => {
    assert.equal(looksLikeJwt(undefined), false);
    assert.equal(looksLikeJwt(null), false);
    assert.equal(looksLikeJwt(123), false);
  });
});
