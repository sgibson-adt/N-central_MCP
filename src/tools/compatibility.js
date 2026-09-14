// @ts-check
/** Reviewed 2.x compatibility aliases. New integrations should not select this toolset. */

import { createRequire } from 'node:module';
import { coreTools } from './core.js';
import { operationTools } from './operations.js';
import { administrationTools } from './administration.js';
import { psaTools } from './psa.js';
import { reportingTools } from './reporting.js';
import { createCapabilityResult } from '../tool-registry.js';
import { getOrganization } from '../operations/organizations.js';
import { getHealth, getServerInfo, getServerTime } from '../operations/server-info.js';
import { getMaintenanceWindows } from '../operations/maintenance-windows.js';

const require = createRequire(import.meta.url);
const mappingDocument = require('../../test/contract/mcp/legacy-tool-mappings.json');

const preferred = new Map(
  [...coreTools, ...operationTools, ...administrationTools, ...psaTools, ...reportingTools]
    .map((tool) => [tool.name, tool]),
);
const legacySchemas = {
  get_custom_psa_ticket_detail: {
    type: 'object', additionalProperties: false,
    properties: {
      customPsaTicketId: { type: ['string', 'number'], description: 'Custom PSA ticket identifier.' },
      username: { type: 'string' }, password: { type: 'string' },
    },
    required: ['customPsaTicketId', 'username', 'password'],
  },
  get_customer: legacyIdSchema('customerId', 'Customer identifier.'),
  get_service_org: legacyIdSchema('soId', 'Service organization identifier.'),
  get_site: legacyIdSchema('siteId', 'Site identifier.'),
  get_report: legacyIdSchema('reportId', 'Report identifier.'),
  get_scheduled_task_status: {
    type: 'object', additionalProperties: false,
    properties: {
      taskId: { type: ['string', 'number'], description: 'Scheduled-task identifier.' },
      detailed: { type: 'boolean' },
    },
    required: ['taskId'],
  },
  get_server_info: {
    type: 'object', additionalProperties: false,
    properties: { level: { type: 'string', enum: ['basic', 'health', 'extra'] } },
  },
  list_org_units: legacyPagedSchema(),
  list_service_orgs: legacyPagedSchema(),
  list_customers: legacyPagedSchema({ soId: { type: ['string', 'number'] } }),
  list_sites: legacyPagedSchema({ customerId: { type: ['string', 'number'] } }),
  list_device_notes: {
    type: 'object', additionalProperties: false,
    properties: {
      deviceId: { type: ['string', 'number'], description: 'Device identifier.' },
      pageNumber: { type: 'integer', minimum: 1 },
      pageSize: {
        type: 'integer', minimum: -1, maximum: 1000,
        anyOf: [{ const: -1 }, { minimum: 1, maximum: 1000 }],
      },
      all: { type: 'boolean' },
    },
    required: ['deviceId'],
  },
};

function legacyIdSchema(name, description) {
  return {
    type: 'object', additionalProperties: false,
    properties: { [name]: { type: ['string', 'number'], description } }, required: [name],
  };
}

function legacyPagedSchema(extra = {}) {
  return {
    type: 'object', additionalProperties: false,
    properties: {
      ...extra,
      pageNumber: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: -1, maximum: 1000 },
      select: { type: 'string' }, sortBy: { type: 'string' },
      sortOrder: { type: 'string', enum: ['asc', 'ascending', 'natural', 'desc', 'descending', 'reverse'] },
      all: { type: 'boolean' },
    },
  };
}

const specialHandlers = {
  get_customer: async (a) => createCapabilityResult(await getOrganization('customer', a.customerId), ['GET /api/customers/{customerId}']),
  get_service_org: async (a) => createCapabilityResult(await getOrganization('service-org', a.soId), ['GET /api/service-orgs/{soId}']),
  get_site: async (a) => createCapabilityResult(await getOrganization('site', a.siteId), ['GET /api/sites/{siteId}']),
  get_server_info: async (a) => {
    const level = a.level || 'basic';
    const operation = level === 'health' ? 'GET /api/health'
      : level === 'extra' ? 'GET /api/server-info/extra' : 'GET /api/server-info';
    const data = level === 'health' ? await getHealth() : await getServerInfo(level);
    return createCapabilityResult(data, [operation]);
  },
  get_server_time: async () => createCapabilityResult(await getServerTime(), ['GET /api/server-info/time']),
  get_maintenance_windows: async (a) => createCapabilityResult(
    await getMaintenanceWindows(a.deviceId), ['GET /api/devices/{deviceId}/maintenance-windows'],
  ),
};
const legacyOperations = {
  clear_device_notes: ['DELETE /api/devices/{deviceId}/notes'],
  create_custom_psa_ticket: ['POST /api/custom-psa/tickets'],
  create_direct_scheduled_task: ['POST /api/scheduled-tasks/direct'],
  get_custom_psa_ticket_detail: ['POST /api/custom-psa/tickets/{customPsaTicketId}'],
  get_customer: ['GET /api/customers/{customerId}'],
  get_device: ['GET /api/devices/{deviceId}'],
  get_device_assets: ['GET /api/devices/{deviceId}', 'GET /api/devices/{deviceId}/assets'],
  get_device_lifecycle: ['GET /api/devices/{deviceId}', 'GET /api/devices/{deviceId}/assets/lifecycle-info'],
  get_device_status: ['GET /api/devices/{deviceId}', 'GET /api/devices/{deviceId}/service-monitor-status'],
  get_maintenance_windows: ['GET /api/devices/{deviceId}/maintenance-windows'],
  get_org_unit: ['GET /api/org-units/{orgUnitId}'],
  get_report: ['GET /api/report/{reportId}'],
  get_scheduled_task: ['GET /api/scheduled-tasks/{taskId}'],
  get_scheduled_task_status: [
    'GET /api/scheduled-tasks/{taskId}', 'GET /api/scheduled-tasks/{taskId}/status',
    'GET /api/scheduled-tasks/{taskId}/status/details',
  ],
  get_server_info: ['GET /api/health', 'GET /api/server-info', 'GET /api/server-info/extra'],
  get_server_time: ['GET /api/server-info/time'],
  get_service_org: ['GET /api/service-orgs/{soId}'],
  get_site: ['GET /api/sites/{siteId}'],
  list_all_users: ['GET /api/org-units/{orgUnitId}/users'],
  list_customers: ['GET /api/customers', 'GET /api/service-orgs/{soId}/customers'],
  list_device_notes: ['GET /api/devices/{deviceId}', 'GET /api/devices/{deviceId}/notes'],
  list_device_tasks: ['GET /api/devices/{deviceId}/scheduled-tasks'],
  list_devices: ['GET /api/devices'],
  list_devices_by_org_unit: ['GET /api/org-units/{orgUnitId}/devices'],
  list_org_unit_children: ['GET /api/org-units/{orgUnitId}', 'GET /api/org-units/{orgUnitId}/children'],
  list_org_units: ['GET /api/org-units'],
  list_scheduled_tasks: ['GET /api/devices/{deviceId}/scheduled-tasks'],
  list_service_orgs: ['GET /api/service-orgs'],
  list_sites: ['GET /api/sites', 'GET /api/customers/{customerId}/sites'],
  report_all_users_by_so: ['GET /api/service-orgs/{soId}/customers', 'GET /api/org-units/{orgUnitId}/users'],
  report_devices_by_so: ['GET /api/service-orgs/{soId}/customers', 'GET /api/org-units/{orgUnitId}/devices'],
};
const transforms = {
  list_devices: (a) => ({ ...a, detailLevel: a.detailLevel ?? 'full' }),
  get_device: (a) => ({ deviceId: a.deviceId }),
  get_device_status: (a) => ({ deviceId: a.deviceId, include: ['monitoring'] }),
  get_device_assets: (a) => ({ deviceId: a.deviceId, include: ['assets'] }),
  get_device_lifecycle: (a) => ({ deviceId: a.deviceId, include: ['lifecycle'] }),
  list_devices_by_org_unit: (a) => ({ ...a, detailLevel: a.detailLevel ?? 'full' }),
  list_org_units: (a) => ({ ...a, organizationType: 'org-unit' }),
  get_org_unit: (a) => ({ orgUnitId: a.orgUnitId, detailLevel: 'full' }),
  list_org_unit_children: (a) => ({
    orgUnitId: a.orgUnitId, include: ['children'], detailLevel: 'full',
    childrenOptions: {
      ...(a.pageNumber == null ? {} : { pageNumber: a.pageNumber }),
      ...(a.pageSize == null ? {} : { pageSize: a.pageSize }),
      ...(a.all == null ? {} : { all: a.all }),
    },
  }),
  list_service_orgs: (a) => ({ ...a, organizationType: 'service-org' }),
  get_service_org: (a) => ({ orgUnitId: a.soId, detailLevel: 'full' }),
  list_customers: (a) => ({ ...a, organizationType: 'customer', parentId: a.soId }),
  get_customer: (a) => ({ orgUnitId: a.customerId, detailLevel: 'full' }),
  list_sites: (a) => ({ ...a, organizationType: 'site', parentId: a.customerId }),
  get_site: (a) => ({ orgUnitId: a.siteId, detailLevel: 'full' }),
  get_scheduled_task: (a) => ({ taskId: a.taskId }),
  get_scheduled_task_status: (a) => ({ taskId: a.taskId, includeStatus: true, detailedStatus: a.detailed }),
  list_device_tasks: (a) => ({ deviceId: a.deviceId }),
  create_direct_scheduled_task: (a) => a,
  list_device_notes: (a) => ({
    deviceId: a.deviceId,
    include: ['notes'],
    noteOptions: {
      ...(a.pageNumber == null ? {} : { pageNumber: a.pageNumber }),
      ...(a.pageSize == null ? {} : { pageSize: a.pageSize }),
      ...(a.all == null ? {} : { all: a.all }),
    },
  }),
  clear_device_notes: (a) => ({ deviceId: a.deviceId, noteIds: a.noteIds }),
  get_maintenance_windows: (a) => ({ deviceId: a.deviceId, include: ['maintenanceWindows'] }),
  create_custom_psa_ticket: (a) => a,
  get_custom_psa_ticket_detail: (a) => ({ ticketId: a.customPsaTicketId, credentials: { username: a.username, password: a.password } }),
  get_server_info: (a) => ({ includeTime: false, ...a }),
  get_server_time: () => ({ includeTime: true }),
  get_report: (a) => ({ reportType: 'patch-comparison', reportId: a.reportId }),
  report_all_users_by_so: (a) => ({ ...a, all: a.all ?? true, detailLevel: a.detailLevel ?? 'full' }),
  report_devices_by_so: (a) => ({ soId: a.soId }),
};

export const compatibilityTools = Object.freeze(mappingDocument.records
  .filter((record) => record.compatibilityTool)
  .map((record) => {
    const target = preferred.get(record.replacement);
    if (!target) throw new Error(`Invalid compatibility mapping for ${record.legacyName}`);
    const legacyDefinition = target;
    if (record.disposition === 'retained') return Object.freeze({ ...target, toolsets: Object.freeze([...target.toolsets, 'compatibility']) });
    return Object.freeze({
      ...target,
      name: record.compatibilityTool,
      description: `DEPRECATED: use ${record.replacement}. ${legacyDefinition.description}`,
      inputSchema: legacySchemas[record.legacyName] || legacyDefinition.inputSchema,
      operations: Object.freeze(legacyOperations[record.legacyName] || legacyDefinition.operations),
      toolsets: Object.freeze(['compatibility']),
      writeScope: record.legacyName === 'get_custom_psa_ticket_detail' ? 'write' : (legacyDefinition.writeScope || target.writeScope),
      handler: specialHandlers[record.legacyName]
        || ((args) => target.handler(transforms[record.legacyName]?.(args) ?? args)),
    });
  }));
