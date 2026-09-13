// @ts-check
/** Side-effect-free aggregate exports for the curated MCP catalogs. */

export { coreTools, CORE_TOOL_NAMES } from './core.js';
export { operationTools } from './operations.js';
export { administrationTools } from './administration.js';
export { psaTools } from './psa.js';
export { reportingTools } from './reporting.js';
export { compatibilityTools } from './compatibility.js';

import { coreTools } from './core.js';
import { operationTools } from './operations.js';
import { administrationTools } from './administration.js';
import { psaTools } from './psa.js';
import { reportingTools } from './reporting.js';
import { compatibilityTools } from './compatibility.js';

const byName = new Map();
for (const tool of [
  ...coreTools, ...operationTools, ...administrationTools, ...psaTools, ...reportingTools, ...compatibilityTools,
]) {
  const existing = byName.get(tool.name);
  byName.set(tool.name, existing
    ? Object.freeze({ ...existing, toolsets: Object.freeze([...new Set([...existing.toolsets, ...tool.toolsets])]) })
    : tool);
}
export const toolDefinitions = Object.freeze([...byName.values()]);
