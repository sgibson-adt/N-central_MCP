#!/usr/bin/env node

/**
 * Opt-in runtime verification for NC_TOOLSETS and NC_WRITE_MODE.
 *
 * Each profile launches a real isolated stdio MCP process. The script compares
 * discovery with the resolved catalog and confirms representative hidden tools
 * cannot be called. It never invokes an advertised tool, so write/destructive
 * handlers and the upstream N-central API are not touched.
 */

import { spawnSync } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import { resolveToolConfiguration } from '../src/toolsets.js';

if (process.env.RUN_LIVE_CONFIG_EVAL !== '1') {
  throw new Error('Live configuration evaluation is disabled; set RUN_LIVE_CONFIG_EVAL=1');
}
if (!process.env.NC_SERVER_URL || !process.env.NC_JWT_TOKEN) {
  throw new Error('Run with the normal server environment so isolated processes can pass startup checks');
}

const profiles = [
  { name: 'default', toolsets: null, writeMode: null },
  { name: 'core-full', toolsets: 'core', writeMode: 'full' },
  { name: 'operations-read-only', toolsets: 'operations', writeMode: 'read-only' },
  { name: 'operations-write', toolsets: 'operations', writeMode: 'write' },
  { name: 'operations-full', toolsets: 'operations', writeMode: 'full' },
  { name: 'core-administration-read-only', toolsets: 'core,administration', writeMode: 'read-only' },
  { name: 'all-read-only', toolsets: 'all', writeMode: 'read-only' },
  { name: 'all-write', toolsets: 'all', writeMode: 'write' },
  { name: 'all-full', toolsets: 'all', writeMode: 'full' },
  { name: 'compatibility-read-only', toolsets: 'compatibility', writeMode: 'read-only' },
  { name: 'all-compatibility-full', toolsets: 'all,compatibility', writeMode: 'full' },
];

const representativeNames = [
  'get_server_status',
  'get_remote_control_type',
  'add_device_note',
  'delete_device',
  'get_org_unit_limits',
  'create_customer',
  'list_psa_companies',
  'create_psa_ticket',
  'report_org_hierarchy',
  'get_server_info',
];

function childEnvironment(toolsets, writeMode) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter((entry) => typeof entry[1] === 'string'),
  );
  delete env.MCP_PORT;
  delete env.NC_TOOLSETS;
  delete env.NC_WRITE_MODE;
  env.MCP_QUIET = '1';
  if (toolsets !== null) env.NC_TOOLSETS = toolsets;
  if (writeMode !== null) env.NC_WRITE_MODE = writeMode;
  return env;
}

async function assertNotCallable(client, name) {
  try {
    const result = await client.callTool({ name, arguments: {} });
    const text = result.content?.filter((item) => item.type === 'text')
      .map((item) => item.text).join(' ') || '';
    return result.isError === true && /tool\b.*\bnot found|unknown tool/iu.test(text);
  } catch (error) {
    return /tool\b.*\bnot found|unknown tool/iu.test(String(error?.message || error));
  }
}

const outcomes = [];
for (const profile of profiles) {
  const configuration = resolveToolConfiguration({
    rawToolsets: profile.toolsets ?? undefined,
    rawWriteMode: profile.writeMode ?? undefined,
  });
  const expectedNames = configuration.tools.map(({ name }) => name).sort();
  const stderrChunks = [];
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['index.js'],
    cwd: process.cwd(),
    env: childEnvironment(profile.toolsets, profile.writeMode),
    stderr: 'pipe',
  });
  transport.stderr?.on('data', (chunk) => stderrChunks.push(String(chunk)));
  const client = new Client({ name: 'ncentral-config-matrix', version: '1.0.0' });

  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    const actualNames = tools.map(({ name }) => name).sort();
    const hiddenRepresentatives = representativeNames.filter((name) => !actualNames.includes(name));
    const hiddenCallChecks = [];
    for (const name of hiddenRepresentatives) {
      hiddenCallChecks.push({ name, rejectedAsMissing: await assertNotCallable(client, name) });
    }

    const readOnly = tools.filter((tool) => tool.annotations?.readOnlyHint === true).length;
    const destructive = tools.filter((tool) => tool.annotations?.destructiveHint === true).length;
    const nonReadOnly = tools.length - readOnly;
    const exactCatalogMatch = JSON.stringify(actualNames) === JSON.stringify(expectedNames);
    const hiddenCallsRejected = hiddenCallChecks.every(({ rejectedAsMissing }) => rejectedAsMissing);
    const modeBoundRespected = configuration.writeMode !== 'read-only'
      || tools.every((tool) => tool.annotations?.readOnlyHint === true);

    outcomes.push({
      profile: profile.name,
      requestedToolsets: profile.toolsets ?? '(unset)',
      requestedWriteMode: profile.writeMode ?? '(unset)',
      resolvedToolsets: configuration.toolsets,
      resolvedWriteMode: configuration.writeMode,
      tools: tools.length,
      readOnly,
      nonDestructiveWrite: nonReadOnly - destructive,
      destructive,
      exactCatalogMatch,
      modeBoundRespected,
      hiddenCallsTested: hiddenCallChecks.length,
      hiddenCallsRejected,
      passed: exactCatalogMatch && modeBoundRespected && hiddenCallsRejected,
    });
  } finally {
    await client.close().catch(() => {});
  }
}

const invalidProfiles = [
  { toolsets: 'mystery', writeMode: 'read-only', expected: /Unknown NC_TOOLSETS/iu },
  { toolsets: 'core,,psa', writeMode: 'read-only', expected: /malformed/iu },
  { toolsets: 'core', writeMode: 'root', expected: /NC_WRITE_MODE must be one of/iu },
].map((profile) => {
  const result = spawnSync(process.execPath, ['index.js'], {
    cwd: process.cwd(),
    env: childEnvironment(profile.toolsets, profile.writeMode),
    encoding: 'utf8',
    timeout: 5_000,
  });
  return {
    toolsets: profile.toolsets,
    writeMode: profile.writeMode,
    nonzeroExit: result.status !== 0,
    usefulError: profile.expected.test(result.stderr),
    passed: result.status !== 0 && profile.expected.test(result.stderr),
  };
});

const passed = outcomes.every((outcome) => outcome.passed)
  && invalidProfiles.every((outcome) => outcome.passed);
console.log(JSON.stringify({
  safety: 'Discovery and calls to absent names only; no advertised tool handler was invoked.',
  passed,
  profiles: outcomes,
  invalidProfiles,
}, null, 2));
if (!passed) process.exitCode = 1;
