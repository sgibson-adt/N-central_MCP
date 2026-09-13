// @ts-check
import * as devices from '../operations/devices.js';
import * as notes from '../operations/notes.js';
import * as tasks from '../operations/scheduled-tasks.js';
import * as maintenance from '../operations/maintenance-windows.js';
import * as registration from '../operations/registration.js';
import { generatePatchComparisonReport } from '../operations/reports.js';
import { defineTool, id, objectInput } from './helpers.js';

const deviceId = id('N-central device identifier.');
const object = (properties, required = []) => ({
  type: 'object', additionalProperties: false, properties, ...(required.length ? { required } : {}),
});
const dateTime = { type: 'string', pattern: '(\\d{4}-\\d{2}-\\d{2}( \\d{2}:\\d{2}:\\d{2}(\\.\\d{1,9})?)?)?' };
const deviceBody = object({
  customerId: { type: 'string', description: 'Customer ID that owns the new device.' },
  networkAddress: { type: 'string', description: 'Device URI or IP address.' },
  description: { type: 'string', minLength: 0, maxLength: 255 },
  supportedOs: { type: 'string' }, longName: { type: 'string' },
  licenseMode: { type: 'string', minLength: 0, maxLength: 255 }, deviceClass: { type: 'string' },
  macAddress: { type: 'string' }, username: { type: 'string', minLength: 0, maxLength: 255 },
  password: { type: 'string', minLength: 0, maxLength: 255 },
}, ['customerId', 'networkAddress', 'longName', 'supportedOs', 'deviceClass']);
const lifecycleProperties = {
  warrantyExpiryDate: dateTime, leaseExpiryDate: dateTime, expectedReplacementDate: dateTime,
  purchaseDate: dateTime, cost: { type: 'number' }, location: { type: 'string' },
  assetTag: { type: 'string' }, description: { type: 'string', minLength: 0, maxLength: 255 },
};
const lifecycleBodyWithServerHints = object({ ...lifecycleProperties, allNull: { type: 'boolean' } }, [
  'assetTag', 'cost', 'description', 'expectedReplacementDate', 'leaseExpiryDate', 'location',
  'purchaseDate', 'warrantyExpiryDate',
]);
const lifecyclePatchBody = object({ ...lifecycleProperties, updateWarrantyError: { type: 'string' } });
const credential = object({
  type: { type: 'string', enum: ['LocalSystem', 'DeviceCredentials', 'CustomCredentials'] },
  username: { type: 'string' }, password: { type: 'string' },
}, ['type']);
const taskParameter = object({
  name: { type: 'string', minLength: 1 }, value: { type: 'string' },
  description: { type: 'string', minLength: 1 },
  type: { type: 'string', enum: ['string', 'integer', 'boolean', 'text', 'dword', 'password'] },
}, ['name', 'description', 'type']);
const action = object({ Key: { type: 'string' }, Value: { type: ['string', 'null'] } });
const applicableAction = object({
  type: { type: 'string' }, actions: { type: 'array', items: action },
});
const maintenanceProperties = {
  applicableAction: { type: 'array', items: applicableAction }, cron: { type: 'string' },
  duration: { type: 'integer' }, enabled: { type: 'boolean' }, name: { type: 'string' },
  type: { type: 'string', enum: ['action'] }, downtimeOnAction: { type: 'boolean' },
  maxDowntime: { type: 'integer' },
  rebootMethod: { type: 'string', enum: ['allowUserToPostpone', 'forceUserToReboot', 'forceRebootWithoutNotification', 'onlyAcceptedReboot'] },
  rebootDelay: { type: 'integer' }, userMessageEnabled: { type: 'boolean' },
  userMessage: { type: ['string', 'null'] }, messageSenderEnabled: { type: 'boolean' },
  messageSender: { type: ['string', 'null'] }, preserveStateEnabled: { type: 'boolean' },
};
const maintenanceRequired = ['applicableAction', 'cron', 'duration', 'enabled', 'name', 'type'];
const createMaintenanceWindow = object(maintenanceProperties, maintenanceRequired);
const updateMaintenanceWindow = object(
  { scheduleId: id('Maintenance-window schedule identifier.'), ...maintenanceProperties },
  ['scheduleId', ...maintenanceRequired],
);
const serviceActionBody = object({
  serviceNames: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'string' } },
  action: { type: 'string', enum: ['Start', 'Stop', 'Restart', 'Pause', 'Resume'] },
}, ['serviceNames', 'action']);
const remoteControlBody = object({
  remoteControlType: { type: 'string', enum: ['SSH', 'VNC', 'RDP', 'MSP_ANYWHERE', 'TELNET'] },
  description: { type: 'string', minLength: 0, maxLength: 500 }, port: { type: 'integer' },
});
const softwareDownloadBody = object({ softwareId: { type: 'string', pattern: '^[1-9]\\d*$' } });
const patchComparisonBody = object({
  installStatuses: { type: 'array', items: { type: 'string' } },
  patchApprovals: { type: 'array', items: { type: 'string' } },
  patchCategories: { type: 'array', items: { type: 'string' } },
  startDate: { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])(T([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(\\.\\d{3})?Z)?$' },
}, ['startDate']);
const noteFields = {
  note: { type: 'string', minLength: 1, maxLength: 32000, description: 'Canonical note content.' },
  text: { type: 'string', minLength: 1, maxLength: 32000, description: 'Deprecated alias for note; cannot conflict.' },
};
const noteAuthorFields = {
  userId: { type: 'integer', description: 'N-central user ID adding the note.' },
  insertionTime: { type: 'string', description: 'Optional ISO 8601 insertion time; the server supplies current time when omitted.' },
};
const D = (name, description, properties, required, operations, writeScope, run) => defineTool({
  name, description, inputSchema: objectInput(properties, required), operations, toolset: 'operations', writeScope, run,
});

export const operationTools = Object.freeze([
  D('create_device', 'Create a managed N-central device from a validated device request.', { body: deviceBody }, ['body'], ['POST /api/device'], 'write', (a) => devices.createDevice(a.body)),
  D('delete_device', 'Permanently delete one managed device, optionally uninstalling its agents.', { deviceId, removeAgents: { type: 'boolean' } }, ['deviceId'], ['DELETE /api/devices/{deviceId}'], 'destructive', (a) => devices.deleteDevice(a.deviceId, a.removeAgents)),
  D('update_device_lifecycle', 'Replace all asset lifecycle and warranty fields for one device.', { deviceId, body: lifecycleBodyWithServerHints }, ['deviceId', 'body'], ['PUT /api/devices/{deviceId}/assets/lifecycle-info'], 'write', (a) => devices.updateDeviceLifecycle(a.deviceId, a.body)),
  D('patch_device_lifecycle', 'Partially update asset lifecycle and warranty fields for one device.', { deviceId, body: lifecyclePatchBody }, ['deviceId', 'body'], ['PATCH /api/devices/{deviceId}/assets/lifecycle-info'], 'write', (a) => devices.patchDeviceLifecycle(a.deviceId, a.body)),
  D('get_appliance_task', 'Retrieve appliance-task status and details by task identifier.', { taskId: id('Appliance-task identifier.') }, ['taskId'], ['GET /api/appliance-tasks/{taskId}'], 'read', (a) => devices.getApplianceTask(a.taskId)),
  D('add_device_note', 'Add canonical note content to one device.', { deviceId, ...noteAuthorFields, ...noteFields }, ['deviceId', 'userId'], ['POST /api/devices/{deviceId}/notes'], 'write', notes.addDeviceNote),
  D('add_notes_bulk', 'Add canonical note content to a non-empty list of devices.', { deviceIds: { type: 'array', minItems: 1, items: { type: 'integer' } }, deviceIDs: { type: 'array', minItems: 1, items: { type: 'integer', description: 'Deprecated device ID alias.' } }, ...noteAuthorFields, ...noteFields }, ['userId'], ['POST /api/devices/notes'], 'write', notes.addNotesBulk),
  D('update_device_note', 'Replace one existing device note using its note identifier.', { deviceId, noteId: id('Note identifier.'), ...noteFields }, ['deviceId', 'noteId'], ['PUT /api/devices/{deviceId}/notes/{noteId}'], 'write', notes.updateDeviceNote),
  D('delete_device_note', 'Permanently delete one explicitly identified device note.', { deviceId, noteId: id('Note identifier.') }, ['deviceId', 'noteId'], ['DELETE /api/devices/{deviceId}/notes/{noteId}'], 'destructive', (a) => notes.deleteDeviceNote(a.deviceId, a.noteId)),
  D('delete_device_notes', 'Permanently delete a non-empty explicit set of note IDs from one device.', { deviceId, noteIds: { type: 'array', minItems: 1, items: id('Note identifier.') } }, ['deviceId', 'noteIds'], ['DELETE /api/devices/{deviceId}/notes'], 'destructive', notes.deleteDeviceNotes),
  D('create_scheduled_task', 'Execute a direct Automation Policy, Script, or MacScript on a managed endpoint.', { name: { type: 'string' }, itemId: { type: 'integer' }, taskType: { type: 'string', enum: ['AutomationPolicy', 'Script', 'MacScript'] }, customerId: { type: 'integer' }, deviceId: { type: 'integer' }, credential, parameters: { type: 'array', items: taskParameter } }, ['name', 'itemId', 'taskType', 'customerId', 'deviceId', 'credential'], ['POST /api/scheduled-tasks/direct'], 'destructive', tasks.createScheduledTask),
  D('create_maintenance_windows', 'Create explicit patch-maintenance windows for selected devices.', { deviceIds: { type: 'array', minItems: 1, items: deviceId }, maintenanceWindows: { type: 'array', minItems: 1, items: createMaintenanceWindow } }, ['deviceIds', 'maintenanceWindows'], ['POST /api/devices/maintenance-windows'], 'write', maintenance.createMaintenanceWindows),
  D('update_maintenance_windows', 'Update maintenance windows identified by schedule IDs in their nested payloads.', { maintenanceWindows: { type: 'array', minItems: 1, items: updateMaintenanceWindow } }, ['maintenanceWindows'], ['PUT /api/devices/maintenance-windows'], 'write', maintenance.updateMaintenanceWindows),
  D('delete_maintenance_windows', 'Permanently delete an explicit non-empty list of maintenance-window schedule IDs.', { scheduleIds: { type: 'array', minItems: 1, items: id('Schedule identifier.') } }, ['scheduleIds'], ['DELETE /api/devices/maintenance-windows'], 'destructive', maintenance.deleteMaintenanceWindows),
  D('perform_windows_service_action', 'Start, stop, pause, resume, or restart named Windows services on a managed endpoint.', { deviceId, body: serviceActionBody }, ['deviceId', 'body'], ['POST /api/devices/{deviceId}/services/actions'], 'destructive', (a) => devices.performWindowsServiceAction(a.deviceId, a.body)),
  D('get_remote_control_type', 'Retrieve the configured remote-control technology for one device.', { deviceId }, ['deviceId'], ['GET /api/devices/{deviceId}/remote-control-type'], 'read', (a) => devices.getRemoteControlType(a.deviceId)),
  D('create_remote_control_task', 'Create a remote-control session task for one managed endpoint.', { deviceId, body: remoteControlBody }, ['deviceId', 'body'], ['POST /api/devices/{deviceId}/remote-control-task'], 'destructive', (a) => devices.createRemoteControlTask(a.deviceId, a.body)),
  D('get_device_activation_key', 'Generate an activation key for one managed device.', { deviceId }, ['deviceId'], ['GET /api/devices/{deviceId}/activation-key'], 'read', (a) => registration.getDeviceActivationKey(a.deviceId)),
  D('get_software_installers', 'List software installers available to one customer.', { customerId: id('Customer identifier.'), softwareType: { type: 'string' }, installerType: { type: 'string' } }, ['customerId'], ['GET /api/customers/{customerId}/software/installers'], 'read', (a) => registration.getSoftwareInstallers(a.customerId, a)),
  D('generate_software_download_link', 'Generate a customer-scoped software installer download link.', { customerId: id('Customer identifier.'), body: softwareDownloadBody }, ['customerId', 'body'], ['POST /api/customers/{customerId}/software/installers'], 'write', (a) => registration.generateSoftwareDownloadLink(a.customerId, a.body)),
  D('generate_patch_comparison_report', 'Submit a patch-comparison report generation request.', { body: patchComparisonBody }, ['body'], ['POST /api/report/patch-comparison'], 'write', (a) => generatePatchComparisonReport(a.body)),
]);
