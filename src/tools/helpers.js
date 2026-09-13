// @ts-check
import { createCapabilityResult } from '../tool-registry.js';
import { CURATED_OUTPUT_SCHEMA } from './core.js';

export const objectInput = (properties = {}, required = []) => ({
  type: 'object', additionalProperties: false, properties, ...(required.length ? { required } : {}),
});
export const id = (description) => ({ type: ['string', 'number'], description });

export function defineTool({ name, description, inputSchema, operations, toolset, writeScope = 'read', run }) {
  return Object.freeze({
    name, description, inputSchema, outputSchema: CURATED_OUTPUT_SCHEMA,
    operations: Object.freeze(operations), toolsets: Object.freeze([toolset]), writeScope,
    handler: async (args) => createCapabilityResult(await run(args), operations),
  });
}
