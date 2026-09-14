// @ts-check
import * as reports from '../operations/reports.js';
import { defineTool, id, objectInput } from './helpers.js';

const D = (name, description, properties, required, operations, run) => defineTool({ name, description, inputSchema: objectInput(properties, required), operations, toolset: 'reporting', writeScope: 'read', run });
const orgUnitId = id('Organization unit identifier.');
export const reportingTools = Object.freeze([
  D('report_devices_bulk', 'Retrieve one selected data class across a bounded organization device page. Compact output and 25 devices are the defaults; request all/full explicitly.', {
    orgUnitId,
    dataType: { type: 'string', enum: ['assets', 'monitoring', 'customProperties'] },
    concurrency: { type: 'integer', minimum: 1, maximum: 5 },
    pageNumber: { type: 'integer', minimum: 1, description: 'Device inventory page number; defaults to 1.' },
    pageSize: { type: 'integer', minimum: 1, maximum: 100, description: 'Devices per report page from 1-100; defaults to 25 for compact or 5 for full detail.' },
    all: { type: 'boolean', description: 'Explicitly process the bounded complete inventory instead of one page; potentially expensive.' },
    detailLevel: { type: 'string', enum: ['compact', 'full'], description: 'compact (default) returns task-focused fields with device identity; full retains raw upstream records.' },
    propertyNames: {
      type: 'array', minItems: 1, maxItems: 20, uniqueItems: true,
      items: { type: 'string', minLength: 1, maxLength: 200, pattern: '.*\\S.*' },
      description: 'For compact customProperties reports, return only exact case-insensitive property-name matches.',
    },
    includeSoftware: { type: 'boolean', description: 'For compact asset reports, include a focused installed-software list; omitted by default to reduce output.' },
  }, ['orgUnitId', 'dataType'], ['GET /api/org-units/{orgUnitId}/devices', 'GET /api/devices/{deviceId}/assets', 'GET /api/devices/{deviceId}/service-monitor-status', 'GET /api/devices/{deviceId}/custom-properties'], reports.reportDevicesForOrg),
  D('report_all_users_by_service_org', 'Build a deduplicated user view beneath one service organization. Compact output and 25 users are the defaults.', {
    soId: id('Service organization identifier.'),
    pageNumber: { type: 'integer', minimum: 1, description: 'Local result page number; defaults to 1.' },
    pageSize: { type: 'integer', minimum: 1, maximum: 100, description: 'Users per result page; defaults to 25.' },
    all: { type: 'boolean', description: 'Explicitly return every deduplicated user.' },
    detailLevel: { type: 'string', enum: ['compact', 'full'], description: 'compact (default) returns audit-focused fields; full retains upstream user records.' },
  }, ['soId'], ['GET /api/service-orgs/{soId}/customers', 'GET /api/org-units/{orgUnitId}/users'], reports.reportAllUsersByServiceOrg),
  D('report_devices_by_service_org', 'Build a bounded device inventory grouped beneath one service organization.', { soId: id('Service organization identifier.') }, ['soId'], ['GET /api/service-orgs/{soId}/customers', 'GET /api/org-units/{orgUnitId}/devices'], reports.reportDevicesByServiceOrg),
  D('report_customer_site_summary', 'Summarize customers and their sites with bounded fan-out. Customer-scoped site listing is PREVIEW and may change.', { customerId: id('Optional customer identifier.') }, [], ['GET /api/customers', 'GET /api/customers/{customerId}/sites'], reports.reportCustomerSiteSummary),
  D('report_org_hierarchy', 'Build a bounded service-organization and customer hierarchy report.', { soId: id('Optional service organization identifier.') }, [], ['GET /api/service-orgs', 'GET /api/service-orgs/{soId}/customers'], reports.reportOrgHierarchy),
  D('list_device_filters', 'List N-central device filters with bounded pagination.', { viewScope: { type: 'string', enum: ['ALL', 'OWN_AND_USED'] }, pageNumber: { type: 'integer', minimum: 1 }, pageSize: { type: 'integer', minimum: -1, maximum: 1000 }, all: { type: 'boolean' } }, [], ['GET /api/device-filters'], reports.listDeviceFilters),
]);
