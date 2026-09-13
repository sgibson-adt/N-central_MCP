// @ts-check
/** Reviewed 2.x compatibility aliases. New integrations should not select this toolset. */

import { createRequire } from 'node:module';
import { coreTools } from './core.js';
import { operationTools } from './operations.js';
import { administrationTools } from './administration.js';
import { psaTools } from './psa.js';
import { reportingTools } from './reporting.js';

const require = createRequire(import.meta.url);
const mappingDocument = require('../../test/contract/mcp/legacy-tool-mappings.json');

const preferred = new Map(
  [...coreTools, ...operationTools, ...administrationTools, ...psaTools, ...reportingTools]
    .map((tool) => [tool.name, tool]),
);
const transforms = {
  list_devices: (a) => a,
  get_device: (a) => ({ deviceId: a.deviceId }),
  get_device_status: (a) => ({ deviceId: a.deviceId, include: ['monitoring'] }),
  get_device_assets: (a) => ({ deviceId: a.deviceId, include: ['assets'] }),
  get_device_lifecycle: (a) => ({ deviceId: a.deviceId, include: ['lifecycle'] }),
  list_devices_by_org_unit: (a) => a,
  list_org_units: (a) => ({ ...a, organizationType: 'org-unit' }),
  get_org_unit: (a) => ({ orgUnitId: a.orgUnitId }),
  list_org_unit_children: (a) => ({ orgUnitId: a.orgUnitId, include: ['children'] }),
  list_service_orgs: (a) => ({ ...a, organizationType: 'service-org' }),
  get_service_org: (a) => ({ orgUnitId: a.soId }),
  list_customers: (a) => ({ ...a, organizationType: 'customer', parentId: a.soId }),
  get_customer: (a) => ({ orgUnitId: a.customerId }),
  list_sites: (a) => ({ ...a, organizationType: 'site', parentId: a.customerId }),
  get_site: (a) => ({ orgUnitId: a.siteId }),
  get_scheduled_task: (a) => ({ taskId: a.taskId }),
  get_scheduled_task_status: (a) => ({ taskId: a.taskId, includeStatus: true, detailedStatus: a.detailed }),
  list_device_tasks: (a) => ({ deviceId: a.deviceId }),
  create_direct_scheduled_task: (a) => a,
  list_device_notes: (a) => ({ deviceId: a.deviceId, include: ['notes'] }),
  clear_device_notes: (a) => ({ deviceId: a.deviceId, noteIds: a.noteIds }),
  get_maintenance_windows: (a) => ({ deviceId: a.deviceId }),
  list_custom_psa_tickets: (a) => a,
  create_custom_psa_ticket: (a) => a,
  get_custom_psa_ticket_detail: (a) => ({ ticketId: a.customPsaTicketId, credentials: { username: a.username, password: a.password } }),
  get_server_info: (a) => ({ includeTime: false, ...a }),
  get_server_time: () => ({ includeTime: true }),
  get_report: (a) => ({ reportType: 'patch-comparison', reportId: a.reportId }),
  report_all_users_by_so: (a) => ({ soId: a.soId }),
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
      inputSchema: legacyDefinition.inputSchema,
      toolsets: Object.freeze(['compatibility']),
      writeScope: legacyDefinition.writeScope || target.writeScope,
      handler: (args) => target.handler(transforms[record.legacyName]?.(args) ?? args),
    });
  }));
