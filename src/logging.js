/**
 * Audit logging. Structured JSON to stderr; redacts sensitive keys.
 *
 * MCP_AUDIT_LEVEL: off | sensitive (default) | all
 */

const SENSITIVE_KEYS = /token|password|secret|jwt|credential|authoriz|api[_-]?key|bearer|cookie|x-api|fqdn|tenant|session|client|ip|id$/i;
const SENSITIVE_ARGUMENT_KEYS = /token|password|secret|jwt|credential|authoriz|api[_-]?key|bearer|cookie|x-api/i;

const AUDIT_EVENT_FIELDS = Object.freeze({
  api_retry: new Set(['method', 'path', 'reason', 'status', 'attempt', 'delayMs']),
  auth_failed: new Set(['ip', 'path']),
  context_rejected: new Set(['ip', 'reasonCode']),
  rate_limited: new Set(['ip', 'path']),
  request_error: new Set(['method', 'path', 'errorType', 'status']),
  sensitive_tool_call: new Set(['tool', 'inputKeys']),
  server_shutdown: new Set([]),
  server_start: new Set(['mode', 'toolCount']),
  session_delete: new Set(['sessionId', 'ip']),
  session_expired: new Set(['sessionId']),
  session_init: new Set(['ip', 'fqdn', 'tenant']),
  session_limit_reached: new Set(['ip', 'count']),
  tool_call: new Set(['tool', 'success', 'durationMs']),
  tool_error: new Set(['tool', 'errorType', 'status', 'durationMs']),
  uncaught_exception: new Set(['errorType', 'status']),
  unhandled_rejection: new Set(['errorType', 'status']),
});

const LEVEL = (process.env.MCP_AUDIT_LEVEL || 'sensitive').toLowerCase();

const ROUTINE_EVENTS = new Set(['tool_call']);

/**
 * @param {string} event
 * @param {Record<string, any>} [data]
 */
export function auditLog(event, data = {}) {
  if (LEVEL === 'off') return;
  if (LEVEL === 'sensitive' && ROUTINE_EVENTS.has(event)) return;

  /** @type {Record<string, any>} */
  const allowed = AUDIT_EVENT_FIELDS[event] || new Set();
  const safeData = Object.fromEntries(Object.entries(data).filter(([key]) => allowed.has(key)));
  if (event === 'sensitive_tool_call') {
    safeData.inputKeys = sanitizeInputKeyList(safeData.inputKeys);
  }
  const entry = redact({ timestamp: new Date().toISOString(), event, ...safeData });
  try {
    console.error(`[audit] ${safeStringify(entry)}`);
  } catch {
    console.error(`[audit] {"event":"${event}","error":"serialization failed"}`);
  }
}

const SAFE_ERROR_TYPES = new Set([
  'AbortError', 'AggregateError', 'Error', 'RangeError', 'ReferenceError',
  'SyntaxError', 'TypeError', 'URIError',
]);

/** Return diagnostic error metadata that cannot include upstream prose. */
export function auditErrorMetadata(error) {
  if (!(error instanceof Error)) return { errorType: 'NonErrorThrown' };
  const errorType = SAFE_ERROR_TYPES.has(error.name) ? error.name : 'Error';
  const status = Number(/** @type {Error & {status?: unknown}} */ (error).status);
  return Number.isInteger(status) && status >= 100 && status <= 599
    ? { errorType, status }
    : { errorType };
}

/** Return only bounded, non-sensitive argument names for audit discovery. */
export function auditInputKeys(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return [];
  return sanitizeInputKeyList(Object.keys(args));
}

function sanitizeInputKeyList(keys) {
  if (!Array.isArray(keys)) return [];
  return keys
    .filter((key) => typeof key === 'string'
      && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)
      && !SENSITIVE_ARGUMENT_KEYS.test(key))
    .sort()
    .slice(0, 64);
}

const IDENTIFIER_PARENTS = new Set([
  'access-groups', 'appliance-tasks', 'companies', 'customers', 'custom-properties',
  'devices', 'notes', 'org-custom-property-defaults', 'org-units', 'report',
  'scheduled-tasks', 'service-orgs', 'sites', 'user-roles',
]);
const PATH_LITERALS = new Set([
  'access-groups', 'actions', 'activation-key', 'appliance-tasks', 'assets', 'children',
  'companies', 'contacts', 'credential', 'customers', 'custom-properties', 'device-access-groups',
  'device-custom-property-defaults', 'devices', 'extra', 'job-statuses', 'lifecycle-info',
  'limits', 'maintenance-windows', 'mappings', 'notes', 'org-custom-property-defaults',
  'org-units', 'remote-control-task', 'remote-control-type', 'report', 'scheduled-tasks',
  'service-monitor-status', 'service-orgs', 'services', 'sites', 'software', 'status',
  'time', 'tickets', 'user-roles', 'users',
]);

export function redactPathIdentifiers(path) {
  const segments = path.split('/');
  for (let index = 1; index < segments.length; index += 1) {
    const parent = segments[index - 1];
    const segment = segments[index];
    if (IDENTIFIER_PARENTS.has(parent) && segment && !PATH_LITERALS.has(segment)) {
      segments[index] = '{id}';
    }
  }
  return segments.join('/');
}

const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/-]+/gi,
  /(?:access|refresh|jwt|password|credential)[_-]?(?:token)?\s*[:=]\s*[^\s,;]+/gi,
];

export function sanitizeLogString(value) {
  let text = value.replace(/^(API error[^:]*):.*$/i, '$1');
  text = text.replace(/https?:\/\/[^\s/]+/gi, '[REDACTED]');
  for (const pattern of SECRET_PATTERNS) text = text.replace(pattern, '[REDACTED]');
  return text.replace(/\/api\/[^\s"']+/g, (path) => redactPathIdentifiers(path));
}

function safeStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  });
}

function redact(obj, seen = new WeakMap()) {
  if (obj == null) return obj;
  if (typeof obj === 'string') return sanitizeLogString(obj);
  if (typeof obj !== 'object') return obj;
  if (seen.has(obj)) return '[Circular]';
  if (Array.isArray(obj)) {
    const out = [];
    seen.set(obj, out);
    for (const value of obj) out.push(redact(value, seen));
    return out;
  }

  const out = {};
  seen.set(obj, out);
  for (const [k, v] of Object.entries(obj)) {
    out[k] = SENSITIVE_KEYS.test(k) ? '[REDACTED]' : redact(v, seen);
  }
  return out;
}
