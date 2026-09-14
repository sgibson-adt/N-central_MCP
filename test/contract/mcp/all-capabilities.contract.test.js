import { afterEach, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toolDefinitions } from '../../../src/tools/index.js';
import {
  buildToolAnnotations, createCapabilityResult, executeCuratedTool, isToolAllowed,
} from '../../../src/tool-registry.js';
import { jsonSchemaToZod } from '../../../src/server-utils.js';
import { PROMPT_COUNT, PROMPT_TOOL_REFERENCES, registerPrompts } from '../../../src/prompts.js';
import { RESOURCE_COUNT, RESOURCE_OPERATION_REFERENCES, registerResources } from '../../../src/resources.js';
import {
  installContractFetch, jsonResponse, syntheticTenant, withSyntheticTenant,
} from '../fixtures.js';
const operationCoverage = JSON.parse(readFileSync(new URL('../operation-coverage.json', import.meta.url)));
let boundary;
afterEach(() => boundary?.restore());

function tool(name) {
  return toolDefinitions.find((definition) => definition.name === name);
}

function sample(schema) {
  const type = Array.isArray(schema.type) ? schema.type.find((candidate) => candidate !== 'null') : schema.type;
  if (schema.enum?.length) return schema.enum[0];
  if (type === 'object') return Object.fromEntries(
    (schema.required || []).map((name) => [name, sample(schema.properties[name])]),
  );
  if (type === 'array') return Array.from({ length: Math.max(1, schema.minItems || 0) }, () => sample(schema.items || { type: 'string' }));
  if (type === 'integer' || type === 'number') return Math.max(1, schema.minimum || 0);
  if (type === 'boolean') return true;
  if (schema.pattern?.includes('https?')) return 'https://ticket.example.test/1';
  if (schema.pattern?.includes('\\d{4}')) return '2026-01-01';
  if (schema.pattern?.includes('[1-9]')) return '1';
  return 'X'.repeat(Math.max(1, schema.minLength || 0));
}

it('fully describes every unique tool/resource/prompt registration', () => {
  assert.equal(new Set(toolDefinitions.map((t) => t.name)).size, toolDefinitions.length);
  for (const tool of toolDefinitions) {
    assert.ok(tool.description.length > 20, tool.name);
    assert.equal(tool.inputSchema.type, 'object', tool.name);
    assert.equal(tool.outputSchema.type, 'object', tool.name);
    assert.ok(tool.operations.length > 0, tool.name);
    assert.ok(tool.toolsets.length > 0, tool.name);
    assert.ok(['read', 'write', 'destructive'].includes(tool.writeScope), tool.name);
    assert.equal(buildToolAnnotations(tool).destructiveHint, tool.writeScope === 'destructive');
  }
  assert.ok(PROMPT_TOOL_REFERENCES.every((name) => toolDefinitions.some((t) => t.name === name)));
  assert.ok(RESOURCE_OPERATION_REFERENCES.every((key) => /^(GET|POST|PUT|PATCH|DELETE) \/api/.test(key)));

  const toolsByOperation = new Map();
  for (const tool of toolDefinitions) {
    for (const operation of tool.operations) {
      if (!toolsByOperation.has(operation)) toolsByOperation.set(operation, new Set());
      toolsByOperation.get(operation).add(tool.name);
    }
  }
  for (const record of operationCoverage.operations) {
    assert.deepEqual(
      [...record.capabilities].sort(),
      [...(toolsByOperation.get(record.operationKey) || [])].sort(),
      `${record.operationKey} capability mapping drift`,
    );
  }
});

it('discloses PREVIEW for every tool mapped to a preview operation', () => {
  const previewOperations = new Set(operationCoverage.operations
    .filter(({ lifecycle }) => lifecycle === 'preview')
    .map(({ operationKey }) => operationKey));
  for (const definition of toolDefinitions) {
    if (definition.operations.some((operation) => previewOperations.has(operation))) {
      assert.match(definition.description, /PREVIEW/, definition.name);
    }
  }
});

it('publishes operation-shaped mutation inputs instead of opaque request bodies', () => {
  assert.equal(JSON.stringify(toolDefinitions).includes('Schema-shaped N-central request payload.'), false);

  assert.deepEqual(
    tool('create_device').inputSchema.properties.body.required,
    ['customerId', 'networkAddress', 'longName', 'supportedOs', 'deviceClass'],
  );
  assert.deepEqual(
    tool('perform_windows_service_action').inputSchema.properties.body.required,
    ['serviceNames', 'action'],
  );
  assert.equal(
    tool('create_maintenance_windows').inputSchema.properties.maintenanceWindows.items.properties.scheduleId,
    undefined,
  );
  assert.ok(
    tool('update_maintenance_windows').inputSchema.properties.maintenanceWindows.items.required.includes('scheduleId'),
  );
  assert.deepEqual(
    tool('create_user_role').inputSchema.properties.body.required,
    ['roleName', 'description', 'permissionIds'],
  );
  assert.deepEqual(
    tool('create_psa_ticket').inputSchema.properties.body.required,
    ['psaCustomTicketId', 'ticketNumber', 'ticketUrl'],
  );
  assert.ok(tool('add_device_note').inputSchema.required.includes('userId'));
  assert.ok(tool('add_device_note').inputSchema.properties.insertionTime);
  assert.deepEqual(tool('validate_psa_credential').inputSchema.required, ['psaType']);
  assert.equal(tool('resolve_psa_ticket').inputSchema.properties.body, undefined);
  assert.equal(tool('reopen_psa_ticket').inputSchema.properties.body, undefined);
});

it('validates, permission-checks, and renders success/error results for every public tool', async () => {
  for (const definition of toolDefinitions) {
    const input = sample(definition.inputSchema);
    const validator = jsonSchemaToZod(definition.inputSchema);
    assert.equal(validator.safeParse(input).success, true, `${definition.name}: valid input`);
    if (definition.inputSchema.required?.length) {
      const invalid = { ...input };
      delete invalid[definition.inputSchema.required[0]];
      assert.equal(validator.safeParse(invalid).success, false, `${definition.name}: missing required input`);
    }

    assert.equal(isToolAllowed(definition, 'read-only'), definition.writeScope === 'read', definition.name);
    assert.equal(isToolAllowed(definition, 'write'), definition.writeScope !== 'destructive', definition.name);
    assert.equal(isToolAllowed(definition, 'full'), true, definition.name);

    const successful = await executeCuratedTool({
      ...definition,
      handler: async () => createCapabilityResult({ tool: definition.name }, definition.operations),
    }, input);
    assert.equal(successful.isError, undefined, `${definition.name}: success result`);
    assert.equal(successful.structuredContent.data.tool, definition.name);

    const failed = await executeCuratedTool({
      ...definition,
      handler: async () => { throw new Error('Bearer synthetic-secret at https://tenant.example.test/api'); },
    }, input);
    assert.equal(failed.isError, true, `${definition.name}: error result`);
    assert.equal(JSON.stringify(failed).includes('synthetic-secret'), false, definition.name);
    assert.equal(JSON.stringify(failed).includes('tenant.example.test'), false, definition.name);
  }
});

it('registers and renders every public resource and prompt with synthetic tenant data', async () => {
  const resources = [];
  const prompts = [];
  const server = {
    resource: (...args) => resources.push({ name: args[0], handler: args.at(-1) }),
    registerPrompt: (...args) => prompts.push({ name: args[0], handler: args.at(-1) }),
  };
  registerResources(server);
  registerPrompts(server);
  assert.equal(resources.length, RESOURCE_COUNT);
  assert.equal(prompts.length, PROMPT_COUNT);

  boundary = installContractFetch({ responder(call) {
    if (/^\/api\/(service-orgs|customers|sites)$/.test(call.path)
      || /\/customers$|\/sites$/.test(call.path)) {
      const record = call.path.endsWith('/service-orgs') ? { soId: 1, soName: 'Synthetic SO' }
        : call.path.endsWith('/customers') ? { customerId: 2, customerName: 'Synthetic Customer' }
          : { siteId: 3, siteName: 'Synthetic Site' };
      return jsonResponse({ data: [record], totalPages: 1 });
    }
    return jsonResponse({ data: { id: 1, path: call.path } });
  } });

  await withSyntheticTenant(syntheticTenant('capabilities'), async () => {
    for (const resource of resources) {
      const args = resource.name === 'device' ? [new URL('ncentral://device/1'), { deviceId: '1' }]
        : resource.name === 'customer' ? [new URL('ncentral://customer/2'), { customerId: '2' }]
          : resource.name === 'org-unit' ? [new URL('ncentral://org-unit/3'), { orgUnitId: '3' }]
            : [];
      const result = await resource.handler(...args);
      assert.equal(result.contents.length, 1, resource.name);
      assert.doesNotThrow(() => JSON.parse(result.contents[0].text), resource.name);
    }
  });

  for (const prompt of prompts) {
    const result = await prompt.handler({ customerId: '2', orgUnitId: '3' });
    assert.ok(result.messages.length > 0, prompt.name);
    assert.ok(result.messages[0].content.text.length > 40, prompt.name);
    const text = result.messages.map((message) => message.content?.text || '').join('\n');
    assert.doesNotMatch(text, /search_(?:organizations|devices)[^\n]*all=true/);
    if (prompt.name === 'device-health-audit') {
      assert.match(text, /list_active_issues[^\n]*pageSize=25[^\n]*detailLevel='compact'/);
    }
    if (prompt.name === 'full-customer-report' || prompt.name === 'custom-property-audit') {
      assert.match(text, /get_organization_context[^\n]*propertyOptions=\{all:true\}[^\n]*compact/);
    }
  }
});
