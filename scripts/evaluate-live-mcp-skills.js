#!/usr/bin/env node

/**
 * Opt-in, read-only live MCP evaluation for the downloaded N-central skills.
 *
 * The server may advertise write tools, but this script refuses to invoke any
 * tool that is not annotated read-only. It emits structural measurements only;
 * tenant values and response bodies remain in memory and are never printed.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import Ajv from 'ajv';

if (process.env.RUN_LIVE_UX_EVAL !== '1') {
  throw new Error('Live evaluation is disabled; set RUN_LIVE_UX_EVAL=1 explicitly');
}

const endpoint = process.env.MCP_EVAL_URL || 'http://localhost:3100/mcp';
const skipExpensive = process.env.MCP_EVAL_SKIP_EXPENSIVE === '1';
const client = new Client({ name: 'ncentral-live-skill-evaluator', version: '1.0.0' });
const transport = new StreamableHTTPClientTransport(new URL(endpoint));
const measurements = [];

const byteLength = (value) => Buffer.byteLength(JSON.stringify(value), 'utf8');
const textContent = (result) => result.content?.find((item) => item.type === 'text')?.text || '';

function redactError(value) {
  return String(value)
    .replace(/https?:\/\/\S+/giu, '[url]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/giu, '[email]')
    .replace(/\b\d{4,}\b/gu, '[id]')
    .slice(0, 180);
}

function findFirstValue(value, keys) {
  if (value == null || typeof value !== 'object') return undefined;
  if (!Array.isArray(value)) {
    for (const key of keys) {
      if (value[key] !== undefined && value[key] !== null) return value[key];
    }
  }
  for (const child of Object.values(value)) {
    const found = findFirstValue(child, keys);
    if (found !== undefined) return found;
  }
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

await client.connect(transport);

try {
  const { tools } = await client.listTools();
  const catalogBytes = byteLength({ tools });
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  const ajv = new Ajv({ allErrors: true, strict: false });
  const skillSchemaCases = [
    ['access-review', 'report_all_users_by_service_org', {
      soId: 50, pageNumber: 1, pageSize: 25, detailLevel: 'compact',
    }],
    ['active-issues', 'list_active_issues', {
      orgUnitId: 1234, pageNumber: 1, pageSize: 10, detailLevel: 'compact',
    }],
    ['asset-inventory', 'report_devices_bulk', {
      orgUnitId: 388, dataType: 'assets', pageNumber: 1, pageSize: 25,
      detailLevel: 'compact', includeSoftware: false,
    }],
    ['custom-property-audit', 'report_devices_bulk', {
      orgUnitId: 1001, dataType: 'customProperties', propertyNames: ['Backup Vendor'],
      pageNumber: 1, pageSize: 25, detailLevel: 'compact',
    }],
    ['custom-property-audit-write', 'update_device_custom_property', {
      deviceId: '12345', propertyId: 42, body: { value: 'Veeam' },
    }],
    ['deployment-kit', 'generate_software_download_link', {
      customerId: 678, body: { softwareId: '901' },
    }],
    ['deployment-kit-device', 'create_device', {
      body: {
        customerId: '678', longName: 'WS-FRONTDESK-01', networkAddress: '10.0.4.21',
        supportedOs: 'Windows 11', deviceClass: 'Workstation - Windows',
      },
    }],
    ['device-notes', 'add_device_note', {
      deviceId: '123456', userId: 42, note: 'Validated example note.',
    }],
    ['device-notes-bulk', 'add_notes_bulk', {
      deviceIds: [101, 102], userId: 42, note: 'Validated bulk example note.',
    }],
    ['fleet-export', 'report_devices_by_service_org', { soId: 50 }],
    ['license-capacity', 'get_org_unit_limits', { orgUnitId: 101 }],
    ['maintenance-windows', 'create_maintenance_windows', {
      deviceIds: [987654],
      maintenanceWindows: [{
        applicableAction: [{ type: 'Patch', actions: [{ Key: 'detect', Value: null }] }],
        cron: '0 0 2 ? * SUN *', duration: 120, enabled: true,
        name: 'Weekly Patch Window', type: 'action',
      }],
    }],
    ['org-hierarchy', 'search_organizations', {
      organizationType: 'customer', parentId: 50, all: true,
    }],
    ['patch-comparison', 'generate_patch_comparison_report', {
      body: { startDate: '2026-05-01', installStatuses: ['INSTALLED'] },
    }],
    ['psa-ticketing', 'create_psa_ticket', {
      body: {
        psaCustomTicketId: 4412, ticketNumber: 'INC-1042',
        ticketUrl: 'https://psa.example.invalid/tickets/INC-1042',
      },
    }],
    ['scheduled-tasks', 'get_scheduled_task_context', {
      taskId: '12345', includeStatus: true, detailedStatus: true,
    }],
    ['server-health', 'get_server_status', { includeTime: true }],
    ['warranty-lifecycle', 'patch_device_lifecycle', {
      deviceId: '987654', body: { warrantyExpiryDate: '2027-03-01' },
    }],
  ];
  const schemaValidation = skillSchemaCases.map(([skill, name, args]) => {
    const tool = toolsByName.get(name);
    if (!tool) return { skill, name, valid: false, errors: ['tool-missing'] };
    const validate = ajv.compile(tool.inputSchema);
    const valid = validate(args);
    return {
      skill,
      name,
      valid,
      errors: valid ? undefined : validate.errors?.map((error) => (
        `${error.instancePath || '/'} ${error.keyword}`
      )),
    };
  });
  const inventory = {
    tools: tools.length,
    readOnly: tools.filter((tool) => tool.annotations?.readOnlyHint === true).length,
    writeCapable: tools.filter((tool) => tool.annotations?.readOnlyHint !== true).length,
    destructive: tools.filter((tool) => tool.annotations?.destructiveHint === true).length,
    catalogBytes,
    estimatedCatalogTokens: Math.ceil(catalogBytes / 4),
  };

  async function call(name, args = {}, options = {}) {
    const tool = toolsByName.get(name);
    if (!tool) {
      measurements.push({ name, outcome: 'missing' });
      return undefined;
    }
    if (tool.annotations?.readOnlyHint !== true) {
      measurements.push({ name, outcome: 'refused-non-read-only' });
      return undefined;
    }

    const started = performance.now();
    try {
      const result = await client.callTool({ name, arguments: args });
      const elapsedMs = Math.round(performance.now() - started);
      const bytes = byteLength(result);
      const text = textContent(result);
      const data = result.structuredContent?.data;
      const prettyData = data === undefined ? null
        : (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      const isError = result.isError === true;
      measurements.push({
        name,
        case: options.case,
        outcome: isError
          ? (options.expectError ? 'expected-error' : (options.allowError ? 'allowed-error' : 'error'))
          : (options.expectError ? 'unexpected-pass' : 'pass'),
        elapsedMs,
        bytes,
        estimatedTokens: Math.ceil(bytes / 4),
        textBytes: Buffer.byteLength(text, 'utf8'),
        structuredBytes: result.structuredContent ? byteLength(result.structuredContent) : 0,
        duplicatesStructuredData: prettyData !== null && text === prettyData,
        recordCount: firstArrayLength(data),
        dataKeys: data && !Array.isArray(data) && typeof data === 'object'
          ? Object.keys(data).slice(0, 12) : undefined,
        error: isError ? redactError(text) : undefined,
      });
      return isError ? undefined : data;
    } catch (error) {
      measurements.push({
        name,
        case: options.case,
        outcome: options.expectError ? 'expected-error' : 'client-error',
        elapsedMs: Math.round(performance.now() - started),
        error: redactError(error?.message || error),
      });
      return undefined;
    }
  }

  // Server-health skill through the preferred core surface.
  await call('get_server_status', { includeTime: true }, { case: 'skill-server-health' });
  await call('get_current_user', {}, { case: 'skill-current-user' });
  await call('validate_session', {}, { case: 'skill-session' });
  await call('validate_session', { unexpected: true }, {
    case: 'unknown-argument-schema-enforcement', expectError: true,
  });

  // Resolve non-sensitive working IDs without printing any returned values.
  const serviceOrgs = await call('search_organizations', {
    organizationType: 'service-org', pageNumber: 1, pageSize: 2,
  }, { case: 'skill-org-resolution' });
  await call('list_service_orgs', { pageNumber: 1, pageSize: 1, format: 'csv' }, {
    case: 'legacy-format-argument-rejected', expectError: true,
  });
  const soId = findFirstValue(serviceOrgs, ['soId', 'orgUnitId', 'id']);
  const customers = soId === undefined ? undefined : await call(
    'search_organizations', {
      organizationType: 'customer', parentId: soId, pageNumber: 1, pageSize: 2,
    }, { case: 'skill-customer-resolution' },
  );
  const customerId = findFirstValue(customers, ['customerId', 'orgUnitId', 'id']);

  // Former skill examples remain negative regression probes.
  await call('list_all_users', { all: true }, { case: 'legacy-missing-org-rejected', expectError: true });
  await call('list_scheduled_tasks', { all: true }, { case: 'legacy-global-list-rejected', expectError: true });
  await call('report_org_hierarchy', { format: 'csv' }, { case: 'legacy-format-rejected', expectError: true });

  let devices;
  if (soId !== undefined) {
    await call('report_org_hierarchy', { soId }, { case: 'preferred-schema' });
    devices = await call('report_devices_by_service_org', { soId }, { case: 'skill-fleet-enumeration' });
    if (!skipExpensive) {
      await call('report_all_users_by_service_org', {
        soId, pageNumber: 1, pageSize: 25, detailLevel: 'compact',
      }, { case: 'skill-access-review' });
    }
  }

  if (customerId !== undefined) {
    await call('get_organization_context', {
      orgUnitId: customerId, include: ['children', 'limits', 'customProperties'],
    }, { case: 'compact-organization-context' });
    await call('get_organization_context', {
      orgUnitId: customerId, include: ['children', 'limits', 'customProperties'],
      detailLevel: 'full',
      childrenOptions: { pageNumber: 1, pageSize: 25 },
      propertyOptions: { pageNumber: 1, pageSize: 25 },
    }, { case: 'full-organization-context' });
    await call('get_org_unit_limits', { orgUnitId: customerId });
    await call('list_org_custom_properties', {
      orgUnitId: customerId, pageNumber: 1, pageSize: 2,
    });
    await call('list_users', { orgUnitId: customerId, pageNumber: 1, pageSize: 2 });
    await call('list_user_roles', { orgUnitId: customerId, pageNumber: 1, pageSize: 2 });
    await call('list_access_groups', { orgUnitId: customerId, pageNumber: 1, pageSize: 2 });
    await call('list_active_issues', {
      orgUnitId: customerId, pageNumber: 1, pageSize: 5, detailLevel: 'compact',
    }, { case: 'skill-active-issues' });
    await call('list_active_issues', { orgUnitId: customerId, pageNumber: 1, pageSize: 1, format: 'json' }, {
      case: 'skill-format-argument', expectError: true,
    });
    const scopedDevices = await call('search_devices', {
      orgUnitId: customerId, pageNumber: 1, pageSize: 2,
    }, { case: 'skill-device-search' });
    if (devices === undefined) devices = scopedDevices;
    await call('report_customer_site_summary', { customerId });
    await call('list_psa_customer_mappings', { customerId });
    if (!skipExpensive) await call('list_psa_companies', { customerId }, {
      case: 'skill-psa-company-discovery', allowError: true,
    });
    await call('get_software_installers', { customerId });
    if (!skipExpensive) {
      await call('report_devices_bulk', {
        orgUnitId: customerId, dataType: 'assets', pageNumber: 1, pageSize: 5,
        detailLevel: 'compact', includeSoftware: false, concurrency: 5,
      }, { case: 'skill-asset-inventory' });
      await call('report_devices_bulk', {
        orgUnitId: customerId, dataType: 'assets', pageNumber: 1, pageSize: 5,
        detailLevel: 'compact', includeSoftware: true, concurrency: 5,
      }, { case: 'skill-software-inventory' });
      await call('report_devices_bulk', {
        orgUnitId: customerId, dataType: 'customProperties', propertyNames: ['Location'],
        pageNumber: 1, pageSize: 5, detailLevel: 'compact', concurrency: 5,
      }, { case: 'skill-custom-property-audit' });
    }
    await call('report_devices_bulk', {
      orgUnitId: customerId, dataType: 'custom-properties', format: 'json',
    }, { case: 'skill-example-enum-and-format', expectError: true });
  }

  const deviceId = findFirstValue(devices, ['deviceId', 'id']);
  if (deviceId !== undefined) {
    await call('get_device_context', {
      deviceId, include: ['details', 'monitoring', 'assets', 'lifecycle', 'notes', 'maintenanceWindows'],
    }, { case: 'skill-device-context' });
    await call('list_device_custom_properties', { deviceId });
    const tasks = await call('list_device_scheduled_tasks', { deviceId }, {
      case: 'skill-scheduled-task-discovery',
    });
    const taskId = findFirstValue(tasks, ['taskId', 'id']);
    if (taskId !== undefined) {
      await call('get_scheduled_task_context', {
        taskId, includeStatus: true, detailedStatus: true,
      }, { case: 'skill-scheduled-task-context' });
    }
  }

  const summary = {
    endpoint: new URL(endpoint).origin,
    safety: 'Only tools annotated readOnlyHint=true were eligible for invocation.',
    inventory,
    context: {
      serviceOrgResolved: soId !== undefined,
      customerResolved: customerId !== undefined,
      deviceResolved: deviceId !== undefined,
    },
    skillSchemaValidation: {
      total: schemaValidation.length,
      passed: schemaValidation.filter((item) => item.valid).length,
      failed: schemaValidation.filter((item) => !item.valid).length,
      cases: schemaValidation,
    },
    totals: {
      attempted: measurements.length,
      passed: measurements.filter((item) => item.outcome === 'pass').length,
      expectedErrors: measurements.filter((item) => item.outcome === 'expected-error').length,
      allowedErrors: measurements.filter((item) => item.outcome === 'allowed-error').length,
      unexpectedErrors: measurements.filter((item) => [
        'error', 'client-error', 'missing', 'unexpected-pass',
      ].includes(item.outcome)).length,
      refused: measurements.filter((item) => item.outcome === 'refused-non-read-only').length,
    },
    measurements,
  };
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await transport.terminateSession().catch(() => {});
  await client.close();
}
