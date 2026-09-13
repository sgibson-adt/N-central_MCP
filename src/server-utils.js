/**
 * HTTP-server utility helpers. Pure functions only — no I/O, no module-level state.
 */

import { timingSafeEqual, createHash } from 'node:crypto';
import { z } from 'zod';

/**
 * Constant-time string comparison via SHA-256 hashing.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Convert the JSON-Schema subset used by tool contracts to Zod. This is
 * recursive so curated output schemas are advertised and enforced intact.
 *
 * @param {Record<string, any>} prop
 * @returns {z.ZodTypeAny}
 */
export function jsonSchemaToZod(prop) {
  const alternatives = prop.anyOf || prop.oneOf;
  if (Array.isArray(alternatives) && alternatives.length > 0) {
    const { anyOf: _anyOf, oneOf: _oneOf, description: _description, default: _default, ...base } = prop;
    const members = alternatives.map((alternative) => jsonSchemaToZod({ ...base, ...alternative }));
    let union = members.length === 1 ? members[0] : z.union(/** @type {any} */ (members));
    if (prop.description) union = union.describe(prop.description);
    if (Object.hasOwn(prop, 'default')) union = union.default(prop.default);
    return union;
  }
  if (Array.isArray(prop.type)) {
    const members = prop.type.map((type) => jsonSchemaToZod({ ...prop, type }));
    let union = members.length === 1 ? members[0] : z.union(/** @type {any} */ (members));
    if (prop.description) union = union.describe(prop.description);
    if (Object.hasOwn(prop, 'default')) union = union.default(prop.default);
    return union;
  }
  let schema;
  if (Object.hasOwn(prop, 'const')) {
    schema = z.literal(prop.const);
  } else switch (prop.type) {
    case 'number':
      schema = z.number();
      break;
    case 'integer':
      schema = z.number().int();
      break;
    case 'boolean':
      schema = z.boolean();
      break;
    case 'null':
      schema = z.null();
      break;
    case 'array': {
      schema = z.array(prop.items ? jsonSchemaToZod(prop.items) : z.string());
      break;
    }
    case 'object': {
      if (!prop.properties) {
        schema = z.object({}).passthrough();
        break;
      }
      const required = new Set(prop.required || []);
      const shape = {};
      for (const [name, definition] of Object.entries(prop.properties)) {
        const child = jsonSchemaToZod(/** @type {Record<string, any>} */ (definition));
        shape[name] = required.has(name) ? child : child.optional();
      }
      schema = prop.additionalProperties === false ? z.object(shape).strict() : z.object(shape).passthrough();
      break;
    }
    case 'string':
      schema = (prop.enum?.length) ? z.enum(prop.enum) : z.string();
      break;
    default:
      schema = prop.type == null ? z.any() : z.string();
  }
  if (typeof prop.minimum === 'number' && typeof /** @type {any} */ (schema).min === 'function') {
    schema = /** @type {any} */ (schema).min(prop.minimum);
  }
  if (typeof prop.maximum === 'number' && typeof /** @type {any} */ (schema).max === 'function') {
    schema = /** @type {any} */ (schema).max(prop.maximum);
  }
  if (typeof prop.minLength === 'number' && typeof /** @type {any} */ (schema).min === 'function') {
    schema = /** @type {any} */ (schema).min(prop.minLength);
  }
  if (typeof prop.maxLength === 'number' && typeof /** @type {any} */ (schema).max === 'function') {
    schema = /** @type {any} */ (schema).max(prop.maxLength);
  }
  if (typeof prop.minItems === 'number' && typeof /** @type {any} */ (schema).min === 'function') {
    schema = /** @type {any} */ (schema).min(prop.minItems);
  }
  if (typeof prop.maxItems === 'number' && typeof /** @type {any} */ (schema).max === 'function') {
    schema = /** @type {any} */ (schema).max(prop.maxItems);
  }
  if (typeof prop.pattern === 'string' && typeof /** @type {any} */ (schema).regex === 'function') {
    schema = /** @type {any} */ (schema).regex(new RegExp(prop.pattern));
  }
  if (prop.uniqueItems === true && prop.type === 'array') {
    schema = schema.refine((items) => new Set(items.map((item) => JSON.stringify(item))).size === items.length, {
      message: 'Array items must be unique',
    });
  }
  if (prop.description) schema = schema.describe(prop.description);
  if (Object.hasOwn(prop, 'default')) schema = schema.default(prop.default);
  return schema;
}

/**
 * Parse an Authorization header into a token, accepting both
 * `Bearer <token>` and raw `<token>` forms.
 *
 * @param {string | undefined} header
 * @returns {string | null} token, or null if the header is absent/malformed
 */
export function parseAuthorizationHeader(header) {
  if (!header || typeof header !== 'string') return null;
  const parts = header.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') return parts[1];
  return header;
}

/**
 * Validate and normalize a client-supplied N-central server FQDN.
 *
 * Enforces https, rejects embedded credentials / path / query / fragment, and
 * (when an allowlist is provided) requires the hostname to match an entry by
 * exact or DNS-suffix match — NOT substring, so `allowedXcom` and
 * `allowed.com.evil.com` are rejected against an allowlist of `allowed.com`.
 *
 * @param {unknown} value Raw FQDN, e.g. "https://ncentral.example.com".
 * @param {string[]} [allowlist] Permitted host suffixes (empty = any https host).
 * @returns {string} Normalized origin (scheme + host [+ explicit port], no trailing slash).
 * @throws {Error} If the value is invalid or not allowed.
 */
export function validateNcFqdn(value, allowlist = []) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('FQDN is required');

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('FQDN must be a valid URL');
  }

  if (url.protocol !== 'https:') throw new Error('FQDN must use https');
  if (url.username || url.password) throw new Error('FQDN must not contain credentials');
  if ((url.pathname && url.pathname !== '/') || url.search || url.hash) {
    throw new Error('FQDN must not contain a path, query, or fragment');
  }

  const host = url.hostname.toLowerCase();
  if (!host) throw new Error('FQDN must have a host');

  if (allowlist.length) {
    const allowed = allowlist.some((entry) => {
      const a = entry.trim().toLowerCase();
      return a !== '' && (host === a || host.endsWith(`.${a}`));
    });
    if (!allowed) throw new Error('FQDN host is not in the allowlist');
  }

  // url.origin drops any path and preserves an explicit non-default port.
  return url.origin;
}

/**
 * Heuristic: does the value look like a JWT (three non-empty base64url segments)?
 * Does not verify the signature — just shape, to reject obviously-bad input early.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function looksLikeJwt(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split('.');
  return parts.length === 3 && parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p));
}
