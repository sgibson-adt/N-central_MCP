/** MCP capability registration, independent from transport and process lifecycle. */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { inc } from './metrics.js';
import { auditErrorMetadata, auditInputKeys, auditLog } from './logging.js';
import { registerPrompts } from './prompts.js';
import { registerResources } from './resources.js';
import { jsonSchemaToZod } from './server-utils.js';
import {
  buildToolAnnotations,
  isSensitiveTool,
  sanitizeToolError,
  toMcpResult,
} from './tool-registry.js';

/**
 * Construct one MCP server with the supplied, already-authorized tool catalog.
 * A fresh instance is required for each Streamable HTTP transport.
 *
 * @param {Record<string, any>[]} tools
 */
export function createMcpServer(tools) {
  const server = new McpServer({
    name: 'ncentral-api',
    version: '3.0.0',
    description: 'N-central REST API MCP Server (Unofficial)',
  });
  const sensitiveTools = new Set(tools.filter(isSensitiveTool).map(({ name }) => name));

  for (const tool of tools) {
    /** @type {Record<string, any>} */
    const schemaShape = {};
    const properties = tool.inputSchema.properties || {};
    const required = tool.inputSchema.required || [];

    for (const [key, property] of Object.entries(properties)) {
      let zodProperty = jsonSchemaToZod(property);
      if (!required.includes(key)) zodProperty = zodProperty.optional();
      schemaShape[key] = zodProperty;
    }

    server.registerTool(tool.name, {
      description: tool.description,
      inputSchema: schemaShape,
      outputSchema: jsonSchemaToZod(tool.outputSchema),
      annotations: buildToolAnnotations(tool),
    }, async (args) => {
      const startedAt = Date.now();
      try {
        if (sensitiveTools.has(tool.name)) {
          auditLog('sensitive_tool_call', {
            tool: tool.name,
            inputKeys: auditInputKeys(args),
          });
        }

        const result = toMcpResult(tool, await tool.handler(args));
        const durationMs = Date.now() - startedAt;
        auditLog('tool_call', { tool: tool.name, success: true, durationMs });
        inc('nc_mcp_tool_calls_total', { tool: tool.name, success: 'true' });
        return result;
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        auditLog('tool_error', {
          tool: tool.name,
          ...auditErrorMetadata(error),
          durationMs,
        });
        inc('nc_mcp_tool_calls_total', { tool: tool.name, success: 'false' });
        return {
          content: [{ type: 'text', text: `Error: ${sanitizeToolError(error?.message)}` }],
          isError: true,
        };
      }
    });
  }

  registerResources(server);
  registerPrompts(server);
  return server;
}
