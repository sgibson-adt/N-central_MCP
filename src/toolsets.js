// @ts-check
/** Deterministic toolset and write-mode configuration. */

import { coreTools } from './tools/core.js';
import { operationTools } from './tools/operations.js';
import { administrationTools } from './tools/administration.js';
import { psaTools } from './tools/psa.js';
import { reportingTools } from './tools/reporting.js';
import { compatibilityTools } from './tools/compatibility.js';
import { isToolAllowed } from './tool-registry.js';

export const PREFERRED_TOOLSET_NAMES = Object.freeze([
  'core', 'operations', 'administration', 'psa', 'reporting',
]);
export const TOOLSET_NAMES = Object.freeze([
  ...PREFERRED_TOOLSET_NAMES, 'compatibility',
]);
export const TOOLSET_ALIASES = Object.freeze({
  all: PREFERRED_TOOLSET_NAMES,
});
export const WRITE_MODES = Object.freeze(['read-only', 'write', 'full']);

/** @param {string | undefined | null} raw */
export function parseToolsets(raw) {
  if (raw == null || raw.trim() === '') return ['core'];
  const pieces = raw.split(',').map((value) => value.trim().toLowerCase());
  if (pieces.some((value) => value === '')) throw new Error('NC_TOOLSETS is malformed: empty toolset name');
  const unknown = pieces.find((value) => !TOOLSET_NAMES.includes(value) && !TOOLSET_ALIASES[value]);
  if (unknown) {
    throw new Error(
      `Unknown NC_TOOLSETS value "${unknown}". Allowed values: all, ${TOOLSET_NAMES.join(', ')}`,
    );
  }
  return [...new Set(pieces.flatMap((value) => TOOLSET_ALIASES[value] || value))];
}

/**
 * Resolve catalog configuration without transport-specific behavior.
 * All preferred and compatibility catalogs are resolved before write-mode filtering.
 * @param {{rawToolsets?: string, rawWriteMode?: string, definitions?: readonly Record<string, any>[], transport?: string}} [options]
 */
export function resolveToolConfiguration(options = {}) {
  const toolsets = parseToolsets(options.rawToolsets);
  const writeMode = (options.rawWriteMode || 'read-only').trim().toLowerCase();
  if (!WRITE_MODES.includes(writeMode)) {
    throw new Error(`NC_WRITE_MODE must be one of: ${WRITE_MODES.join(', ')} (got: ${writeMode})`);
  }
  const definitions = options.definitions || [
    ...coreTools, ...operationTools, ...administrationTools, ...psaTools, ...reportingTools, ...compatibilityTools,
  ];
  const selected = definitions
    .filter((tool) => tool.toolsets?.some((toolset) => toolsets.includes(toolset)))
    .filter((tool) => isToolAllowed(tool, writeMode));
  const byName = new Map();
  for (const tool of selected) if (!byName.has(tool.name)) byName.set(tool.name, tool);
  const tools = [...byName.values()];
  return { toolsets, writeMode, tools };
}
