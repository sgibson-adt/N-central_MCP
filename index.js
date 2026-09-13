#!/usr/bin/env node

/** N-central REST API MCP process entry point. */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { ENV_CONTEXT, MULTI_TENANT } from './src/context.js';
import { configuredNumber, parseConfiguredNumber } from './src/config.js';
import { startHttpRuntime } from './src/http-runtime.js';
import { auditErrorMetadata, auditLog } from './src/logging.js';
import { createMcpServer } from './src/mcp-server.js';
import { PROMPT_COUNT } from './src/prompts.js';
import { RESOURCE_COUNT } from './src/resources.js';
import { resolveToolConfiguration } from './src/toolsets.js';

if (!MULTI_TENANT && !ENV_CONTEXT) {
  console.error('Error: NC_SERVER_URL and NC_JWT_TOKEN environment variables are required.');
  console.error('  NC_SERVER_URL: Your N-central server URL (e.g. https://ncentral.example.com)');
  console.error('  NC_JWT_TOKEN:  Your User-API JWT token from N-central UI');
  console.error('  (or set NC_MULTI_TENANT=1 to accept per-request credentials over HTTP)');
  process.exit(1);
}

const fqdnAllowlist = (process.env.NC_FQDN_ALLOWLIST || '')
  .split(',').map((value) => value.trim()).filter(Boolean);
const apiKey = process.env.MCP_API_KEY || null;
const corsOrigin = process.env.MCP_CORS_ORIGIN || null;
const bindAddress = process.env.MCP_BIND_ADDRESS || '127.0.0.1';
const allowUnauthenticated = process.env.MCP_ALLOW_UNAUTHENTICATED === '1';
const quiet = process.env.MCP_QUIET === '1';
const port = process.env.MCP_PORT == null || process.env.MCP_PORT.trim() === ''
  ? null
  : parseConfiguredNumber(process.env.MCP_PORT, 3100, {
    name: 'MCP_PORT', minimum: 1, maximum: 65_535, integer: true,
  });

let toolConfiguration;
try {
  toolConfiguration = resolveToolConfiguration({
    rawToolsets: process.env.NC_TOOLSETS,
    rawWriteMode: process.env.NC_WRITE_MODE,
  });
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}

const tools = toolConfiguration.tools;

process.on('unhandledRejection', (reason) => {
  auditLog('unhandled_rejection', auditErrorMetadata(reason));
});
process.on('uncaughtException', (error) => {
  auditLog('uncaught_exception', auditErrorMetadata(error));
  process.exit(1);
});

async function main() {
  if (MULTI_TENANT && !port) {
    throw new Error('NC_MULTI_TENANT=1 requires HTTP mode (set MCP_PORT)');
  }
  if (port && !apiKey && !allowUnauthenticated) {
    throw new Error('MCP_PORT is set but MCP_API_KEY is not; HTTP mode requires an API key');
  }

  if (!quiet) {
    console.error(`Registered ${tools.length} tools, ${RESOURCE_COUNT} resources, ${PROMPT_COUNT} prompts (NC_TOOLSETS=${toolConfiguration.toolsets.join(',')}, NC_WRITE_MODE=${toolConfiguration.writeMode})`);
    console.error(MULTI_TENANT
      ? 'Multi-tenant mode: per-request X-NC-FQDN / X-NC-JWT required; auth is per-tenant on first call.'
      : 'Auth will be performed on first tool call.');
  }

  if (!port) {
    const server = createMcpServer(tools);
    await server.connect(new StdioServerTransport());
    console.error('N-central REST API MCP Server running on stdio');
    auditLog('server_start', { mode: 'stdio', toolCount: tools.length });
    return;
  }

  if (!apiKey && allowUnauthenticated) {
    console.error('⚠️  WARNING: MCP_API_KEY not set — HTTP endpoint is unauthenticated (MCP_ALLOW_UNAUTHENTICATED=1).');
  }
  if (!corsOrigin && !quiet) console.error('ℹ️  CORS disabled (no MCP_CORS_ORIGIN set).');
  if (MULTI_TENANT && fqdnAllowlist.length === 0) {
    console.error('⚠️  WARNING: NC_MULTI_TENANT=1 with no NC_FQDN_ALLOWLIST — any https FQDN will be accepted (SSRF risk).');
  }

  const runtime = await startHttpRuntime({
    port,
    bindAddress,
    apiKey,
    corsOrigin,
    trustProxy: process.env.MCP_TRUST_PROXY === '1',
    metricsRequireAuth: process.env.MCP_METRICS_REQUIRE_AUTH === '1',
    maxBodySize: configuredNumber('MCP_MAX_BODY_SIZE', 1024 * 1024, { minimum: 1, integer: true }),
    rateLimitWindowMs: configuredNumber('MCP_RATE_LIMIT_WINDOW_MS', 60_000, { minimum: 1, integer: true }),
    rateLimitMaximum: configuredNumber('MCP_RATE_LIMIT_MAX', 120, { minimum: 1, integer: true }),
    maxRateLimitEntries: 10_000,
    maxSessions: configuredNumber('MCP_MAX_SESSIONS', 256, { minimum: 1, integer: true }),
    sessionTtlMs: configuredNumber('MCP_SESSION_TTL_MS', 30 * 60_000, { minimum: 1, integer: true }),
    multiTenant: MULTI_TENANT,
    envContext: ENV_CONTEXT,
    fqdnAllowlist,
    createServer: () => createMcpServer(tools),
  });
  console.error(`N-central REST API MCP Server on http://${bindAddress}:${port}/mcp`);
  if (apiKey) console.error('  Auth: Bearer token required');
  auditLog('server_start', { mode: 'http', toolCount: tools.length });

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.error('Shutting down...');
    auditLog('server_shutdown', {});
    await runtime.shutdown();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(`Failed to start: ${error.message}`);
  process.exit(1);
});
