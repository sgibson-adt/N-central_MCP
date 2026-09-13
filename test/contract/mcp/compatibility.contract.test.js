import { readFileSync } from 'node:fs';
import { afterEach, it } from 'node:test';
import assert from 'node:assert/strict';
import { compatibilityTools } from '../../../src/tools/compatibility.js';
import { psaTools } from '../../../src/tools/psa.js';
import { toolDefinitions } from '../../../src/tools/index.js';
import { jsonSchemaToZod } from '../../../src/server-utils.js';
import { installContractFetch, syntheticTenant, withSyntheticTenant } from '../fixtures.js';

const mappings = JSON.parse(readFileSync(new URL('./legacy-tool-mappings.json', import.meta.url)));
let boundary;
afterEach(() => boundary?.restore());
it('reconciles all 87 legacy names with reviewed dispositions and shared delegation', () => {
  assert.equal(mappings.records.length, 87);
  assert.equal(mappings.records.some((m) => m.disposition === null), false);
  for (const mapping of mappings.records.filter((m) => m.compatibilityTool)) {
    assert.ok(compatibilityTools.some((t) => t.name === mapping.compatibilityTool), mapping.legacyName);
  }
  for (const tool of compatibilityTools) assert.equal(typeof tool.handler, 'function');
});

it('freezes the final migration counts and omits removed Custom PSA list discovery', () => {
  const counts = Object.fromEntries(['retained', 'consolidated', 'removed'].map((disposition) => [
    disposition, mappings.records.filter((record) => record.disposition === disposition).length,
  ]));
  assert.deepEqual(counts, { retained: 53, consolidated: 31, removed: 3 });
  const mapping = mappings.records.find(({ legacyName }) => legacyName === 'list_custom_psa_tickets');
  assert.equal(mapping.disposition, 'removed');
  assert.equal(mapping.replacement, null);
  assert.equal(mapping.compatibilityTool, null);
  assert.ok(mapping.removalRationale.length > 20);
  assert.equal(compatibilityTools.some(({ name }) => name === 'list_custom_psa_tickets'), false);
  assert.equal(psaTools.some(({ name }) => name === 'search_psa_tickets'), false);
  assert.equal(toolDefinitions.some(({ name }) => name === 'search_psa_tickets'), false);
  assert.equal(toolDefinitions.some(({ name }) => name === 'list_custom_psa_tickets'), false);
  assert.equal(toolDefinitions.length, 104);
});

it('maps legacy device-note paging into the notes component only', async () => {
  const definition = compatibilityTools.find(({ name }) => name === 'list_device_notes');
  assert.ok(definition.inputSchema.properties.pageNumber);
  assert.ok(definition.inputSchema.properties.pageSize);
  boundary = installContractFetch();
  await withSyntheticTenant(syntheticTenant('compat-notes'), () => definition.handler({
    deviceId: '31', pageNumber: 2, pageSize: -1,
  }));
  const calls = boundary.calls.filter(({ path }) => !path.startsWith('/api/auth/'));
  assert.equal(calls.find(({ path }) => path === '/api/devices/31').query.pageNumber, undefined);
  assert.deepEqual(calls.find(({ path }) => path.endsWith('/notes')).query, {
    pageNumber: '2', pageSize: '-1',
  });
});

it('accepts a reviewed input fixture for every consolidated compatibility alias', () => {
  const fixtures = {
    clear_device_notes: { deviceId: '31', noteIds: ['7'] },
    create_custom_psa_ticket: { body: { psaCustomTicketId: 1, ticketNumber: 'SYN-1', ticketUrl: 'https://example.test/1' } },
    create_direct_scheduled_task: { name: 'synthetic', itemId: 2001, taskType: 'Script', customerId: 2, deviceId: 31, credential: { type: 'LocalSystem' } },
    get_custom_psa_ticket_detail: { customPsaTicketId: 'ticket-1', username: 'synthetic-user', password: 'synthetic-password' },
    get_customer: { customerId: 2 },
    get_device: { deviceId: '31' },
    get_device_assets: { deviceId: '31' },
    get_device_lifecycle: { deviceId: '31' },
    get_device_status: { deviceId: '31' },
    get_maintenance_windows: { deviceId: '31' },
    get_org_unit: { orgUnitId: 8 },
    get_report: { reportId: 'report-1' },
    get_scheduled_task: { taskId: 'task-1' },
    get_scheduled_task_status: { taskId: 'task-1', detailed: true },
    get_server_info: { level: 'extra' },
    get_server_time: {},
    get_service_org: { soId: 1 },
    get_site: { siteId: 3 },
    list_all_users: { orgUnitId: 8, all: true },
    list_customers: { soId: 1, pageNumber: 1 },
    list_device_notes: { deviceId: '31', pageNumber: 1 },
    list_device_tasks: { deviceId: '31' },
    list_devices: { pageNumber: 1 },
    list_devices_by_org_unit: { orgUnitId: 8, pageNumber: 1 },
    list_org_unit_children: { orgUnitId: 8 },
    list_org_units: { pageNumber: 1 },
    list_scheduled_tasks: { deviceId: '31' },
    list_service_orgs: { pageNumber: 1 },
    list_sites: { customerId: 2, pageNumber: 1 },
    report_all_users_by_so: { soId: 1 },
    report_devices_by_so: { soId: 1 },
  };
  const consolidated = mappings.records.filter(({ disposition }) => disposition === 'consolidated');
  assert.deepEqual(consolidated.map(({ legacyName }) => legacyName).sort(), Object.keys(fixtures).sort());
  for (const { legacyName, compatibilityTool } of consolidated) {
    const definition = compatibilityTools.find(({ name }) => name === compatibilityTool);
    assert.ok(definition, legacyName);
    assert.doesNotThrow(() => jsonSchemaToZod(definition.inputSchema).parse(fixtures[legacyName]), legacyName);
  }
});

it('delegates restored compatibility inputs to the intended concrete reads', async () => {
  boundary = installContractFetch();
  const run = (name, args) => compatibilityTools.find((tool) => tool.name === name).handler(args);
  await withSyntheticTenant(syntheticTenant('compat-routes'), async () => {
    await run('get_customer', { customerId: 2 });
    await run('get_service_org', { soId: 1 });
    await run('get_site', { siteId: 3 });
    await run('list_customers', { soId: 1 });
    await run('list_sites', { customerId: 2 });
    await run('get_report', { reportId: 'report-1' });
    await run('get_server_info', { level: 'extra' });
    await run('get_maintenance_windows', { deviceId: '31' });
    await run('get_custom_psa_ticket_detail', {
      customPsaTicketId: 'ticket-1', username: 'synthetic-user', password: 'synthetic-password',
    });
  });
  const calls = boundary.calls.filter(({ path }) => !path.startsWith('/api/auth/'));
  assert.deepEqual(calls.map(({ method, path }) => `${method} ${path}`), [
    'GET /api/customers/2',
    'GET /api/service-orgs/1',
    'GET /api/sites/3',
    'GET /api/service-orgs/1/customers',
    'GET /api/customers/2/sites',
    'GET /api/report/report-1',
    'GET /api/server-info/extra',
    'GET /api/devices/31/maintenance-windows',
    'POST /api/custom-psa/tickets/ticket-1',
  ]);
  assert.deepEqual(calls.at(-1).body, { username: 'synthetic-user', password: 'synthetic-password' });
  assert.equal(compatibilityTools.find(({ name }) => name === 'get_custom_psa_ticket_detail').writeScope, 'write');
});
