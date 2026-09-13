// @ts-check
/** Shared helpers for bounded, partially successful capability composition. */

import { mapConcurrent } from '../paginator.js';
import { COMPOSITION_LIMITS, createCapabilityResult, sanitizeToolError } from '../tool-registry.js';

/** @param {Record<string, any>} args @param {unknown} data */
export function nameSearchPage(args, data) {
  if (args?.name == null) return undefined;
  return {
    search: {
      match: args.nameMatch ?? 'contains',
      matched: Array.isArray(data) ? data.length : 0,
      bounded: true,
      maxPages: COMPOSITION_LIMITS.pages,
      maxRecords: COMPOSITION_LIMITS.records,
    },
  };
}

/**
 * @param {unknown} primaryData
 * @param {string} primaryOperation
 * @param {{name: string, operation: string, load: () => Promise<unknown>}[]} components
 */
export async function composeOptional(primaryData, primaryOperation, components) {
  const results = await mapConcurrent(components, async (component) => ({
    name: component.name,
    operation: component.operation,
    value: await component.load(),
  }), 5);

  const data = { details: primaryData };
  const operations = [primaryOperation];
  const errors = [];
  for (const [index, result] of results.entries()) {
    const component = components[index];
    operations.push(component.operation);
    if (result && typeof result === 'object' && '_error' in result) {
      errors.push({
        component: component.name,
        code: 'UPSTREAM_ERROR',
        message: sanitizeToolError(result._error),
      });
    } else {
      const success = /** @type {{name: string, value: unknown}} */ (result);
      data[success.name] = success.value;
    }
  }
  return createCapabilityResult(data, operations, errors);
}
