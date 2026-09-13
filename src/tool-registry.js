/**
 * Tool-registration helpers. Pure functions only — no I/O, no globals.
 */

import { sanitizeLogString } from './logging.js';

export const COMPOSITION_LIMITS = Object.freeze({
  calls: 10,
  concurrency: 5,
  pages: 20,
  records: 10_000,
  resultBytes: 256 * 1024,
});

const EXPLICIT_SENSITIVE_TOOLS = new Set([
  'get_registration_token',
  'list_users',
  'list_user_roles',
  'get_user_role',
  'list_access_groups',
  'get_access_group',
  'get_psa_ticket',
]);

export function isSensitiveTool(tool) {
  return tool.writeScope !== 'read' || EXPLICIT_SENSITIVE_TOOLS.has(tool.name);
}

/** @param {unknown} message */
export function sanitizeToolError(message) {
  const text = sanitizeLogString(String(message ?? 'Unknown upstream error'));
  return text.length > 300 ? `${text.slice(0, 300)}...` : text;
}

/**
 * Build the internal form of the standard curated result.
 * @param {unknown} data
 * @param {string[]} operations
 * @param {{component: string, code?: string, message?: string}[]} [errors]
 * @param {{page?: unknown, truncated?: boolean}} [options]
 */
export function createCapabilityResult(data, operations, errors = [], options = {}) {
  const safeErrors = errors.map((error) => ({
    component: error.component,
    code: error.code || 'UPSTREAM_ERROR',
    message: sanitizeToolError(error.message),
  }));
  return {
    data,
    meta: {
      operations: [...new Set(operations)],
      partial: safeErrors.length > 0,
      errors: safeErrors,
      page: options.page ?? null,
      truncated: options.truncated === true,
    },
  };
}

function serializedBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function fitResultToLimit(result) {
  if (serializedBytes(result) <= COMPOSITION_LIMITS.resultBytes) return result;
  const fitted = structuredClone(result);
  fitted.meta.truncated = true;
  if (Array.isArray(fitted.data)) {
    let low = 0;
    let high = fitted.data.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      const candidate = { ...fitted, data: fitted.data.slice(0, mid) };
      if (serializedBytes(candidate) <= COMPOSITION_LIMITS.resultBytes) low = mid;
      else high = mid - 1;
    }
    fitted.data = fitted.data.slice(0, low);
  } else {
    fitted.data = { omitted: true, reason: 'Result exceeded the 256 KiB structured-result limit.' };
  }
  if (serializedBytes(fitted) > COMPOSITION_LIMITS.resultBytes) {
    fitted.meta.errors = [];
  }
  return fitted;
}

/** @param {Record<string, any>} tool @param {{data: unknown, meta: Record<string, any>}} result */
export function toMcpResult(tool, result) {
  const structuredContent = fitResultToLimit(createCapabilityResult(
    result?.data,
    result?.meta?.operations || tool.operations || [],
    result?.meta?.errors || [],
    { page: result?.meta?.page, truncated: result?.meta?.truncated },
  ));
  const data = structuredContent.data;
  const summary = typeof data === 'string'
    ? data
    : JSON.stringify(data, null, 2);
  const suffix = structuredContent.meta.partial ? '\n\nSome optional components could not be loaded.' : '';
  return {
    content: [{ type: /** @type {const} */ ('text'), text: `${summary}${suffix}` }],
    structuredContent,
  };
}

/** @param {Record<string, any>} tool @param {Record<string, unknown>} args */
export async function executeCuratedTool(tool, args) {
  try {
    return toMcpResult(tool, await tool.handler(args));
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${sanitizeToolError(error?.message)}` }],
      isError: true,
    };
  }
}

/**
 * Returns true if a tool's writeScope is permitted by the current write mode.
 *   scope 'read'        → always allowed
 *   scope 'write'       → allowed in 'write' and 'full' modes
 *   scope 'destructive' → allowed only in 'full' mode
 *   unknown scope       → denied
 */
export function isToolAllowed(tool, writeMode) {
  const scope = tool.writeScope || 'read';
  if (scope === 'read') return true;
  if (scope === 'write') return writeMode === 'write' || writeMode === 'full';
  if (scope === 'destructive') return writeMode === 'full';
  return false;
}

/**
 * Build MCP tool annotations from our internal writeScope tag.
 * Maps to the spec's readOnlyHint / destructiveHint / openWorldHint.
 */
export function buildToolAnnotations(tool) {
  const scope = tool.writeScope || 'read';
  return {
    readOnlyHint: scope === 'read',
    destructiveHint: scope === 'destructive',
    openWorldHint: true, // calls a remote API
  };
}
