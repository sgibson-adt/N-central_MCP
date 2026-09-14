#!/usr/bin/env node

/**
 * Opt-in structural evaluation of every advertised MCP tool.
 *
 * Read tools are invoked against live data with dynamically resolved fixtures.
 * Write/destructive tools receive an empty-input validation probe only, and are
 * also verified absent from an isolated read-only runtime. No response bodies,
 * identifiers, names, credentials, tokens, or other tenant values are printed.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

if (process.env.RUN_LIVE_ALL_TOOL_EVAL !== '1') {
  throw new Error('Full live evaluation is disabled; set RUN_LIVE_ALL_TOOL_EVAL=1');
}

const endpoint = process.env.MCP_EVAL_URL || 'http://localhost:3100/mcp';
const allowSensitiveReads = process.env.MCP_EVAL_SENSITIVE_READS === '1';
const requestDelayMs = Number(process.env.MCP_EVAL_REQUEST_DELAY_MS ?? 550);
if (!Number.isFinite(requestDelayMs) || requestDelayMs < 0) {
  throw new Error('MCP_EVAL_REQUEST_DELAY_MS must be a non-negative number');
}
const sensitiveReadNames = new Set([
  'get_registration_token', 'get_device_activation_key', 'get_psa_ticket',
  'list_users', 'list_all_users', 'list_user_roles', 'get_user_role',
  'list_access_groups', 'get_access_group', 'report_all_users_by_so',
  'report_all_users_by_service_org',
]);
const client = new Client({ name: 'ncentral-all-tool-evaluator', version: '1.0.0' });
const transport = new StreamableHTTPClientTransport(new URL(endpoint));
const outcomes = new Map();

const byteLength = (value) => Buffer.byteLength(JSON.stringify(value), 'utf8');
const textContent = (result) => result.content?.filter((item) => item.type === 'text')
  .map((item) => item.text).join(' ') || '';

function redactError(value) {
  return String(value)
    .replace(/https?:\/\/\S+/giu, '[url]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/giu, '[email]')
    .replace(/\b\d{4,}\b/gu, '[id]')
    .slice(0, 180);
}

function findObject(value, keys) {
  if (value == null || typeof value !== 'object') return undefined;
  if (!Array.isArray(value) && keys.some((key) => value[key] != null)) return value;
  for (const child of Object.values(value)) {
    const found = findObject(child, keys);
    if (found) return found;
  }
  return undefined;
}

function findObjects(value, keys, found = []) {
  if (value == null || typeof value !== 'object') return found;
  if (!Array.isArray(value) && keys.some((key) => value[key] != null)) found.push(value);
  for (const child of Object.values(value)) findObjects(child, keys, found);
  return found;
}

function field(value, keys) {
  const object = findObject(value, keys);
  if (!object) return undefined;
  for (const key of keys) if (object[key] != null) return object[key];
  return undefined;
}

function firstArrayLength(value) {
  if (Array.isArray(value)) return value.length;
  if (value == null || typeof value !== 'object') return null;
  for (const child of Object.values(value)) {
    const count = firstArrayLength(child);
    if (count !== null) return count;
  }
  return null;
}

function record(name, observation) {
  const previous = outcomes.get(name);
  const rank = { pass: 4, 'live-error': 3, 'schema-rejected': 2, skipped: 1 };
  if (!previous || rank[observation.outcome] > rank[previous.outcome]) {
    outcomes.set(name, { name, ...observation });
  } else {
    previous.attempts = (previous.attempts || 1) + 1;
  }
}


const pace = () => requestDelayMs === 0
  ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, requestDelayMs));

await client.connect(transport);

try {
  const { tools } = await client.listTools();
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  const readTools = tools.filter((tool) => tool.annotations?.readOnlyHint === true);
  const mutationTools = tools.filter((tool) => tool.annotations?.readOnlyHint !== true);

  async function callRead(name, args = {}, note) {
    await pace();
    const tool = toolsByName.get(name);
    if (!tool) {
      record(name, { outcome: 'skipped', reason: 'not-advertised' });
      return undefined;
    }
    if (tool.annotations?.readOnlyHint !== true) {
      record(name, { outcome: 'skipped', reason: 'not-read-only' });
      return undefined;
    }
    if (sensitiveReadNames.has(name) && !allowSensitiveReads) {
      record(name, { outcome: 'skipped', reason: 'sensitive-read-opt-in-required' });
      return undefined;
    }

    const started = performance.now();
    try {
      const result = await client.callTool({ name, arguments: args });
      const elapsedMs = Math.round(performance.now() - started);
      const bytes = byteLength(result);
      const data = result.structuredContent?.data;
      const isError = result.isError === true;
      record(name, {
        outcome: isError ? 'live-error' : 'pass',
        note,
        elapsedMs,
        bytes,
        estimatedTokens: Math.ceil(bytes / 4),
        recordCount: firstArrayLength(data),
        partial: result.structuredContent?.meta?.partial === true,
        truncated: result.structuredContent?.meta?.truncated === true,
        sensitive: sensitiveReadNames.has(name) || undefined,
        error: isError ? redactError(textContent(result)) : undefined,
      });
      return isError ? undefined : data;
    } catch (error) {
      record(name, {
        outcome: 'live-error',
        note,
        elapsedMs: Math.round(performance.now() - started),
        sensitive: sensitiveReadNames.has(name) || undefined,
        error: redactError(error?.message || error),
      });
      return undefined;
    }
  }

  async function probeMutationSchema(tool) {
    await pace();
    if (!Array.isArray(tool.inputSchema?.required) || tool.inputSchema.required.length === 0) {
      record(tool.name, { outcome: 'skipped', reason: 'unsafe-empty-input-could-reach-handler' });
      return;
    }
    const started = performance.now();
    try {
      const result = await client.callTool({ name: tool.name, arguments: {} });
      const rejected = result.isError === true && /validation|invalid|required/iu.test(textContent(result));
      record(tool.name, {
        outcome: rejected ? 'schema-rejected' : 'skipped',
        reason: rejected ? 'empty-input-rejected-before-handler' : 'unexpected-validation-result',
        elapsedMs: Math.round(performance.now() - started),
      });
    } catch (error) {
      const rejected = /validation|invalid|required/iu.test(String(error?.message || error));
      record(tool.name, {
        outcome: rejected ? 'schema-rejected' : 'skipped',
        reason: rejected ? 'empty-input-rejected-before-handler' : 'unexpected-validation-exception',
        elapsedMs: Math.round(performance.now() - started),
      });
    }
  }

  // Server and session.
  await callRead('get_server_status', { includeTime: true });
  await callRead('validate_session');
  await callRead('get_current_user');
  await callRead('get_server_info', { level: 'basic' });
  await callRead('get_server_time');

  // Resolve organization fixtures.
  const serviceOrgs = await callRead('list_service_orgs', { pageNumber: 1, pageSize: 2 });
  const soObject = findObject(serviceOrgs, ['soId']);
  const soId = soObject?.soId ?? soObject?.orgUnitId ?? soObject?.id;
  const soName = soObject?.soName ?? soObject?.orgUnitName ?? soObject?.name;
  const customers = soId == null ? undefined : await callRead(
    'list_customers', { soId, pageNumber: 1, pageSize: 10 },
  );
  const customerObjects = findObjects(customers, ['customerId']);
  const customerObject = customerObjects[0];
  const customerId = customerObject?.customerId ?? customerObject?.orgUnitId ?? customerObject?.id;
  let siteObject;
  for (const candidate of customerObjects.slice(0, 10)) {
    if (siteObject) break;
    const candidateId = candidate.customerId ?? candidate.orgUnitId ?? candidate.id;
    if (candidateId == null) continue;
    const candidateSites = await callRead(
      'list_sites', { customerId: candidateId, pageNumber: 1, pageSize: 10 }, 'fixture-search',
    );
    siteObject = findObject(candidateSites, ['siteId']);
  }
  const siteId = siteObject?.siteId ?? siteObject?.orgUnitId ?? siteObject?.id;
  const orgUnits = await callRead('list_org_units', { pageNumber: 1, pageSize: 5 });
  const orgUnitId = customerId ?? field(orgUnits, ['orgUnitId', 'id']);

  if (soId != null) {
    await callRead('get_service_org', { soId });
    await callRead('report_org_hierarchy', { soId });
    await callRead('report_all_users_by_so', { soId });
    await callRead('report_all_users_by_service_org', { soId });
  }
  if (soName != null) {
    await callRead('search_organizations', {
      organizationType: 'service-org', name: String(soName), nameMatch: 'exact',
    });
  }
  if (customerId != null) {
    await callRead('get_customer', { customerId });
    await callRead('report_customer_site_summary', { customerId });
  }
  if (siteId != null) await callRead('get_site', { siteId });
  else record('get_site', { outcome: 'skipped', reason: 'no-site-fixture' });
  if (orgUnitId != null) {
    await callRead('get_org_unit', { orgUnitId });
    await callRead('list_org_unit_children', { orgUnitId });
    await callRead('get_organization_context', { orgUnitId, include: ['details', 'limits'] });
  }

  // Resolve device fixtures from bounded reports without emitting their data.
  const preferredDevices = soId == null ? undefined
    : await callRead('report_devices_by_service_org', { soId });
  const compatibilityDevices = soId == null ? undefined
    : await callRead('report_devices_by_so', { soId });
  const deviceObjects = findObjects(preferredDevices ?? compatibilityDevices, ['deviceId']);
  const deviceObject = deviceObjects[0];
  const deviceId = deviceObject?.deviceId ?? deviceObject?.id;
  const deviceName = deviceObject?.longName ?? deviceObject?.deviceName ?? deviceObject?.name;

  if (deviceName != null) {
    await callRead('search_devices', { name: String(deviceName), nameMatch: 'exact' });
    await callRead('list_devices', { name: String(deviceName), nameMatch: 'exact' });
    await callRead('list_devices_by_org_unit', {
      orgUnitId: customerId ?? orgUnitId, name: String(deviceName), nameMatch: 'exact',
    });
  }

  let deviceProperties;
  let deviceTasks;
  if (deviceId != null) {
    await callRead('get_device', { deviceId });
    await callRead('get_device_status', { deviceId });
    await callRead('get_device_assets', { deviceId });
    await callRead('get_device_lifecycle', { deviceId });
    await callRead('get_maintenance_windows', { deviceId });
    await callRead('list_device_notes', { deviceId, pageNumber: 1, pageSize: 2 });
    deviceProperties = await callRead('list_device_custom_properties', { deviceId });
    deviceTasks = await callRead('list_device_tasks', { deviceId });
    await callRead('list_scheduled_tasks', { deviceId });
    await callRead('get_device_context', {
      deviceId, include: ['details', 'monitoring', 'lifecycle'],
    });
    await callRead('get_remote_control_type', { deviceId });
    await callRead('get_device_activation_key', { deviceId });
    for (const candidate of deviceObjects.slice(1, 12)) {
      if (outcomes.get('get_device_activation_key')?.outcome === 'pass') break;
      const candidateId = candidate.deviceId ?? candidate.id;
      if (candidateId != null) {
        await callRead('get_device_activation_key', { deviceId: candidateId }, 'eligibility-fixture-search');
      }
    }
  }

  // Find a task-bearing device if the first device did not have a task.
  let taskId = field(deviceTasks, ['taskId', 'scheduledTaskId', 'id']);
  for (const candidate of deviceObjects.slice(0, 12)) {
    if (taskId != null) break;
    const candidateId = candidate.deviceId ?? candidate.id;
    if (candidateId == null) continue;
    const tasks = await callRead('list_device_scheduled_tasks', { deviceId: candidateId }, 'fixture-search');
    taskId = field(tasks, ['taskId', 'scheduledTaskId', 'id']);
  }
  if (!outcomes.has('list_device_scheduled_tasks') && deviceId != null) {
    await callRead('list_device_scheduled_tasks', { deviceId });
  }
  const taskProbe = taskId ?? '1';
  await callRead('get_scheduled_task', { taskId: taskProbe }, taskId == null ? 'placeholder-fixture' : undefined);
  await callRead('get_scheduled_task_status', { taskId: taskProbe }, taskId == null ? 'placeholder-fixture' : undefined);
  await callRead('get_scheduled_task_context', { taskId: taskProbe }, taskId == null ? 'placeholder-fixture' : undefined);

  // Monitoring, reports, and appliance status.
  const issueOrgId = siteId ?? customerId ?? orgUnitId;
  if (issueOrgId != null) await callRead('list_active_issues', {
    orgUnitId: issueOrgId, pageNumber: 1, pageSize: 2,
  });
  const jobs = orgUnitId == null ? undefined : await callRead('list_job_statuses', { orgUnitId });
  const applianceTaskId = field(jobs, ['applianceTaskId']) ?? '1';
  await callRead('get_appliance_task', { taskId: applianceTaskId },
    applianceTaskId === '1' ? 'placeholder-fixture' : undefined);
  await callRead('list_device_filters', { pageNumber: 1, pageSize: 2 });
  await callRead('run_report', { reportType: 'device-filters', pageNumber: 1, pageSize: 2 });
  await callRead('get_report', { reportId: '1' }, 'placeholder-fixture');
  if (issueOrgId != null) await callRead('report_devices_bulk', {
    orgUnitId: issueOrgId, dataType: 'customProperties', concurrency: 5,
  });

  // Administration fixtures.
  let orgProperties;
  let roles;
  let groups;
  if (orgUnitId != null) {
    await callRead('get_org_unit_limits', { orgUnitId });
    orgProperties = await callRead('list_org_custom_properties', {
      orgUnitId, pageNumber: 1, pageSize: 5,
    });
    await callRead('list_users', { orgUnitId, pageNumber: 1, pageSize: 5 });
    await callRead('list_all_users', { orgUnitId, pageNumber: 1, pageSize: 5 });
    roles = await callRead('list_user_roles', { orgUnitId, pageNumber: 1, pageSize: 5 });
    groups = await callRead('list_access_groups', { orgUnitId, pageNumber: 1, pageSize: 5 });
  }
  const orgPropertyId = field(orgProperties, ['propertyId', 'id']);
  const devicePropertyId = field(deviceProperties, ['propertyId', 'id']);
  if (orgUnitId != null && orgPropertyId != null) {
    await callRead('get_org_unit_property', { orgUnitId, propertyId: orgPropertyId });
    await callRead('get_org_custom_property_default', { orgUnitId, propertyId: orgPropertyId });
    await callRead('get_device_default_custom_property', { orgUnitId, propertyId: orgPropertyId });
  }
  if (deviceId != null && devicePropertyId != null) {
    await callRead('get_device_custom_property', { deviceId, propertyId: devicePropertyId });
  }
  const userRoleId = field(roles, ['userRoleId', 'roleId', 'id']);
  if (orgUnitId != null && userRoleId != null) {
    await callRead('get_user_role', { orgUnitId, userRoleId });
  }
  const accessGroupId = field(groups, ['accessGroupId', 'groupId', 'id']);
  if (accessGroupId != null) await callRead('get_access_group', { accessGroupId });
  if (customerId != null) {
    await callRead('get_registration_token', { entityType: 'customer', id: customerId });
    await callRead('get_software_installers', { customerId });
  }

  // PSA reads. A mapping can supply a company ID even when company enumeration is unavailable.
  let mapping;
  let companies;
  if (customerId != null) {
    mapping = await callRead('get_psa_customer_mapping', { customerId });
    await callRead('list_psa_customer_mappings', { customerId });
    companies = await callRead('list_psa_companies', { customerId });
  }
  const psaCompanyId = field(companies ?? mapping, ['psaCompanyId', 'companyId', 'id']);
  if (customerId != null && psaCompanyId != null) {
    await callRead('list_psa_company_contacts', { customerId, psaCompanyId });
    await callRead('list_psa_company_sites', { customerId, psaCompanyId });
  }
  await callRead('get_psa_ticket', { ticketId: '1' }, 'placeholder-fixture');

  // Any unresolved read still receives a conservative schema/path probe.
  for (const tool of readTools) {
    if (outcomes.has(tool.name)) continue;
    const args = {};
    for (const required of tool.inputSchema?.required || []) {
      if (required === 'organizationType') args[required] = 'customer';
      else if (required === 'reportType') args[required] = 'device-filters';
      else if (required === 'dataType') args[required] = 'customProperties';
      else if (required === 'entityType') args[required] = 'customer';
      else args[required] = '1';
    }
    await callRead(tool.name, args, 'fallback-placeholder-fixture');
  }

  // Validate every mutation schema without supplying enough input to reach a handler.
  for (const tool of mutationTools) await probeMutationSchema(tool);

  // Independently verify every mutation is absent from an all+compatibility read-only runtime.
  const childEnv = Object.fromEntries(
    Object.entries(process.env).filter((entry) => typeof entry[1] === 'string'),
  );
  delete childEnv.MCP_PORT;
  childEnv.MCP_QUIET = '1';
  childEnv.NC_TOOLSETS = 'all,compatibility';
  childEnv.NC_WRITE_MODE = 'read-only';
  const boundedTransport = new StdioClientTransport({
    command: process.execPath,
    args: ['index.js'],
    cwd: process.cwd(),
    env: childEnv,
    stderr: 'pipe',
  });
  boundedTransport.stderr?.resume();
  const boundedClient = new Client({ name: 'ncentral-all-tool-boundary', version: '1.0.0' });
  await boundedClient.connect(boundedTransport);
  const boundedNames = new Set((await boundedClient.listTools()).tools.map(({ name }) => name));
  await boundedClient.close();
  const mutationsHiddenInReadOnly = mutationTools.every((tool) => !boundedNames.has(tool.name));

  const rows = tools.map((tool) => outcomes.get(tool.name) || {
    name: tool.name, outcome: 'skipped', reason: 'not-exercised',
  });
  const counts = Object.fromEntries(
    ['pass', 'live-error', 'schema-rejected', 'skipped']
      .map((status) => [status, rows.filter((row) => row.outcome === status).length]),
  );
  const allCovered = rows.every((row) => row.outcome !== 'skipped');
  const readRows = rows.filter((row) => readTools.some((tool) => tool.name === row.name));
  console.log(JSON.stringify({
    endpoint: new URL(endpoint).origin,
    safety: {
      responseBodiesPrinted: false,
      mutationHandlersInvoked: false,
      sensitiveReadsEnabled: allowSensitiveReads,
      mutationsHiddenInReadOnly,
      requestDelayMs,
    },
    inventory: {
      tools: tools.length,
      readOnly: readTools.length,
      mutation: mutationTools.length,
      destructive: mutationTools.filter((tool) => tool.annotations?.destructiveHint === true).length,
    },
    counts,
    readResultTotals: {
      serializedBytes: readRows.reduce((total, row) => total + (row.bytes || 0), 0),
      estimatedTokens: readRows.reduce((total, row) => total + (row.estimatedTokens || 0), 0),
    },
    allCovered,
    rows,
  }, null, 2));
  if (!allCovered || !mutationsHiddenInReadOnly) process.exitCode = 1;
} finally {
  await transport.terminateSession().catch(() => {});
  await client.close();
}
