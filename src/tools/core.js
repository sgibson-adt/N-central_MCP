// @ts-check
/** The reviewed, task-oriented, read-only default MCP catalog. */

import { getCurrentUser, getServerStatus, validateSession } from '../capabilities/server.js';
import { getOrganizationContext, searchOrganizations } from '../capabilities/organizations.js';
import { getDeviceContext, searchDevices } from '../capabilities/devices.js';
import { listActiveIssues } from '../capabilities/monitoring.js';
import { getScheduledTaskContext, listDeviceScheduledTasks } from '../capabilities/tasks.js';
import { listJobStatuses, runReport } from '../capabilities/reports.js';

const pageProperties = {
  pageNumber: { type: 'integer', minimum: 1, description: 'Page number, starting at 1.' },
  pageSize: { type: 'integer', minimum: -1, maximum: 1000, description: 'Page size from 1-1000; -1 is used only on documented operations.' },
  select: { type: 'string', description: 'N-central FIQL/RSQL row filter.' },
  sortBy: { type: 'string', description: 'Field used to sort results.' },
  sortOrder: { type: 'string', enum: ['asc', 'ascending', 'natural', 'desc', 'descending', 'reverse'], description: 'Sort direction.' },
  all: { type: 'boolean', description: 'Fetch bounded pages, up to 20 pages or 10,000 records.' },
};

const nameSearchProperties = {
  name: {
    type: 'string', minLength: 1, maxLength: 200,
    description: 'Case-insensitive human-name search. Automatically scans bounded pages; do not combine with pageNumber or pageSize.',
  },
  nameMatch: {
    type: 'string', enum: ['exact', 'contains'],
    description: 'Human-name matching mode; requires name.',
  },
};

const metaSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    operations: { type: 'array', items: { type: 'string' } },
    partial: { type: 'boolean' },
    errors: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: { component: { type: 'string' }, code: { type: 'string' }, message: { type: 'string' } },
        required: ['component', 'code', 'message'],
      },
    },
    page: {},
    truncated: { type: 'boolean' },
  },
  required: ['operations', 'partial', 'errors', 'page', 'truncated'],
};

export const CURATED_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { data: {}, meta: metaSchema },
  required: ['data', 'meta'],
};

const input = (properties = {}, required = []) => ({
  type: 'object', additionalProperties: false, properties, ...(required.length ? { required } : {}),
});

function coreTool(name, description, inputSchema, operations, handler) {
  return Object.freeze({
    name, description, inputSchema, outputSchema: CURATED_OUTPUT_SCHEMA, operations: Object.freeze(operations),
    toolsets: Object.freeze(['core']), writeScope: 'read', handler,
  });
}

export const coreTools = Object.freeze([
  coreTool(
    'get_server_status',
    'Check N-central service health and API version, optionally including the server clock.',
    input({ includeTime: { type: 'boolean', description: 'Include the N-central server time.' } }),
    ['GET /api/health', 'GET /api/server-info', 'GET /api/server-info/time'],
    getServerStatus,
  ),
  coreTool(
    'validate_session',
    'Confirm that the current authenticated N-central API session is valid without returning token material.',
    input(), ['GET /api/auth/validate'], validateSession,
  ),
  coreTool(
    'get_current_user',
    'Return compact current-user identity and authorization context, or explicit full profile detail.',
    input({ detailLevel: { type: 'string', enum: ['compact', 'full'], description: 'compact (default) omits contact and postal profile fields.' } }),
    ['GET /api/users/me'], getCurrentUser,
  ),
  coreTool(
    'search_organizations',
    'Find service organizations, customers, sites, or organization units by human name or bounded filtering and pagination. Customer-scoped site listing is PREVIEW and may change.',
    input({
      organizationType: { type: 'string', enum: ['service-org', 'customer', 'site', 'org-unit'], description: 'Organization kind to search.' },
      parentId: { type: ['string', 'number'], description: 'Service-org parent for customers or customer parent for sites.' },
      ...nameSearchProperties,
      ...pageProperties,
    }, ['organizationType']),
    ['GET /api/service-orgs', 'GET /api/service-orgs/{soId}/customers', 'GET /api/customers', 'GET /api/customers/{customerId}/sites', 'GET /api/sites', 'GET /api/org-units'],
    searchOrganizations,
  ),
  coreTool(
    'get_organization_context',
    'Load compact organization details plus selected bounded children, limits, and custom-property context. Request full/all explicitly.',
    input({
      orgUnitId: { type: ['string', 'number'], description: 'Organization unit identifier.' },
      detailLevel: { type: 'string', enum: ['compact', 'full'], description: 'compact (default) returns task-focused fields; full retains upstream records.' },
      include: {
        type: 'array', uniqueItems: true,
        items: { type: 'string', enum: ['details', 'children', 'limits', 'customProperties'] },
        description: 'Optional components; details are always the primary component.',
      },
      childrenOptions: {
        type: 'object', additionalProperties: false,
        description: 'Pagination for children; defaults to page 1 with 25 rows.',
        properties: {
          pageNumber: { type: 'integer', minimum: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 1000 },
          all: { type: 'boolean' },
        },
      },
      propertyOptions: {
        type: 'object', additionalProperties: false,
        description: 'Pagination for custom properties; defaults to page 1 with 25 rows.',
        properties: {
          pageNumber: { type: 'integer', minimum: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 1000 },
          all: { type: 'boolean' },
        },
      },
    }, ['orgUnitId']),
    ['GET /api/org-units/{orgUnitId}', 'GET /api/org-units/{orgUnitId}/children', 'GET /api/org-units/{orgUnitId}/limits', 'GET /api/org-units/{orgUnitId}/custom-properties'],
    getOrganizationContext,
  ),
  coreTool(
    'search_devices',
    'Search the global or organization-scoped N-central device inventory by human name or bounded filters and pagination.',
    input({
      orgUnitId: { type: ['string', 'number'], description: 'Optional organization unit scope.' },
      filterId: { type: 'integer', description: 'Optional N-central device filter identifier.' },
      detailLevel: { type: 'string', enum: ['compact', 'full'], description: 'compact (default) returns discovery fields; full returns complete device records.' },
      ...nameSearchProperties,
      ...pageProperties,
    }),
    ['GET /api/devices', 'GET /api/org-units/{orgUnitId}/devices'], searchDevices,
  ),
  coreTool(
    'get_device_context',
    'Load a device plus selected monitoring, asset, lifecycle, note, custom-property, and task context.',
    input({
      deviceId: { type: ['string', 'number'], description: 'Device identifier.' },
      include: {
        type: 'array', uniqueItems: true,
        items: { type: 'string', enum: ['details', 'monitoring', 'assets', 'lifecycle', 'notes', 'customProperties', 'tasks', 'maintenanceWindows'] },
        description: 'Optional components; details are always the primary component.',
      },
      noteOptions: {
        type: 'object',
        additionalProperties: false,
        description: 'Pagination used only when notes are selected.',
        properties: {
          pageNumber: { type: 'integer', minimum: 1, description: 'Note page number, starting at 1.' },
          pageSize: {
            type: 'integer', minimum: -1, maximum: 1000,
            anyOf: [{ const: -1 }, { minimum: 1, maximum: 1000 }],
            description: 'Note page size: -1 or an integer from 1-1000.',
          },
          all: { type: 'boolean', description: 'Fetch bounded note pages.' },
        },
      },
    }, ['deviceId']),
    ['GET /api/devices/{deviceId}', 'GET /api/devices/{deviceId}/service-monitor-status', 'GET /api/devices/{deviceId}/assets', 'GET /api/devices/{deviceId}/assets/lifecycle-info', 'GET /api/devices/{deviceId}/notes', 'GET /api/devices/{deviceId}/custom-properties', 'GET /api/devices/{deviceId}/scheduled-tasks', 'GET /api/devices/{deviceId}/maintenance-windows'],
    getDeviceContext,
  ),
  coreTool(
    'list_active_issues',
    'List current active monitoring issues for a customer or site (service-org scope is unsupported), with bounded pagination and a compact default projection. Use detailLevel=full only when complete upstream records are required.',
    input({
      orgUnitId: { type: ['string', 'number'], description: 'Organization unit identifier.' },
      ...pageProperties,
      pageSize: { type: 'integer', minimum: 1, maximum: 1000, description: 'Positive active-issue page size from 1-1000; defaults to 10 when omitted.' },
      detailLevel: { type: 'string', enum: ['compact', 'full'], description: 'compact (default) removes the verbose _extra object; full returns complete issue records.' },
    }, ['orgUnitId']),
    ['GET /api/org-units/{orgUnitId}/active-issues'], listActiveIssues,
  ),
  coreTool(
    'list_device_scheduled_tasks',
    'List scheduled tasks associated with one N-central device.',
    input({ deviceId: { type: ['string', 'number'], description: 'Device identifier.' } }, ['deviceId']),
    ['GET /api/devices/{deviceId}/scheduled-tasks'], listDeviceScheduledTasks,
  ),
  coreTool(
    'get_scheduled_task_context',
    'Load a scheduled-task definition and optionally its aggregate or per-device execution status.',
    input({
      taskId: { type: ['string', 'number'], description: 'Scheduled-task identifier.' },
      includeStatus: { type: 'boolean', description: 'Include execution status.' },
      detailedStatus: { type: 'boolean', description: 'Use per-device status; valid only for system/customer task IDs.' },
    }, ['taskId']),
    ['GET /api/scheduled-tasks/{taskId}', 'GET /api/scheduled-tasks/{taskId}/status', 'GET /api/scheduled-tasks/{taskId}/status/details'],
    getScheduledTaskContext,
  ),
  coreTool(
    'run_report',
    'Run one reviewed read-only report adapter; arbitrary REST methods or paths are not accepted.',
    input({
      reportType: { type: 'string', enum: ['patch-comparison', 'device-filters'], description: 'Reviewed report adapter.' },
      reportId: { type: 'string', description: 'Required for a completed patch-comparison report.' },
      viewScope: { type: 'string', enum: ['ALL', 'OWN_AND_USED'], description: 'Optional device-filter view scope.' },
      format: { type: 'string', enum: ['json', 'csv'], description: 'Requested presentation format.' },
      ...pageProperties,
    }, ['reportType']),
    ['GET /api/report/{reportId}', 'GET /api/device-filters'], runReport,
  ),
  coreTool(
    'list_job_statuses',
    'List asynchronous N-central job statuses with local filtering, bounded pagination, and a compact default projection.',
    input({
      orgUnitId: { type: ['string', 'number'], description: 'Organization unit identifier.' },
      pageNumber: { type: 'integer', minimum: 1, description: 'Local result page number; defaults to 1.' },
      pageSize: { type: 'integer', minimum: 1, maximum: 100, description: 'Local result page size from 1-100; defaults to 25.' },
      status: { type: 'string', minLength: 1, maxLength: 100, pattern: '.*\\S.*', description: 'Optional case-insensitive exact status filter.' },
      deviceId: { type: ['string', 'number'], description: 'Optional exact device identifier filter.' },
      jobId: { type: ['string', 'number'], description: 'Optional exact job identifier filter.' },
      since: { type: 'string', format: 'date-time', description: 'Keep jobs scheduled or completed at or after this ISO 8601 timestamp.' },
      detailLevel: { type: 'string', enum: ['compact', 'full'], description: 'compact (default) removes the unbounded _extra object; full retains complete rows.' },
    }, ['orgUnitId']),
    ['GET /api/org-units/{orgUnitId}/job-statuses'], listJobStatuses,
  ),
]);

export const CORE_TOOL_NAMES = Object.freeze(coreTools.map(({ name }) => name));
