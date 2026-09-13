// @ts-check
import * as psa from '../operations/psa.js';
import { defineTool, id, objectInput } from './helpers.js';

const customerId = id('Customer identifier.');
const ticketId = id('Custom PSA ticket identifier.');
const object = (properties, required = []) => ({
  type: 'object', additionalProperties: false, properties, ...(required.length ? { required } : {}),
});
const credentials = object({ username: { type: 'string' }, password: { type: 'string' } });
const ticketBody = object({
  psaCustomTicketId: { type: 'integer' }, ticketNumber: { type: 'string' },
  ticketUrl: { type: 'string', pattern: '^https?://.+' },
}, ['psaCustomTicketId', 'ticketNumber', 'ticketUrl']);
const mappingBody = object({
  customerId: { type: 'integer', minimum: 1 }, psaCompanyId: { type: 'integer' },
  psaSiteId: { type: 'integer' }, psaContactId: { type: 'integer' },
}, ['customerId']);
const D = (name, description, properties, required, operations, writeScope, run) => defineTool({ name, description, inputSchema: objectInput(properties, required), operations, toolset: 'psa', writeScope, run });
export const psaTools = Object.freeze([
  D('get_psa_customer_mapping', 'Retrieve the canonical Standard PSA mapping for one customer.', { customerId }, ['customerId'], ['GET /api/standard-psa/customer/{customerId}/mappings'], 'read', (a) => psa.getPsaCustomerMapping(a.customerId)),
  D('validate_psa_credential', 'Validate sensitive Standard PSA credentials for a named PSA type.', { psaType: { type: 'string' }, username: { type: 'string' }, password: { type: 'string' } }, ['psaType'], ['POST /api/standard-psa/{psaType}/credential'], 'write', (a) => psa.validatePsaCredential(a.psaType, { username: a.username, password: a.password })),
  D('get_psa_ticket', 'Retrieve one Custom PSA ticket, optionally using supplied PSA credentials.', { ticketId, credentials }, ['ticketId'], ['GET /api/custom-psa/tickets/{customPsaTicketId}', 'POST /api/custom-psa/tickets/{customPsaTicketId}'], 'read', (a) => psa.getPsaTicket(a.ticketId, a.credentials)),
  D('create_psa_ticket', 'Create a Custom PSA ticket from its required external ticket fields.', { body: ticketBody }, ['body'], ['POST /api/custom-psa/tickets'], 'write', (a) => psa.createPsaTicket(a.body)),
  D('resolve_psa_ticket', 'Resolve one explicitly identified Custom PSA ticket.', { ticketId }, ['ticketId'], ['POST /api/custom-psa/tickets/{customPsaTicketId}/resolve'], 'write', (a) => psa.resolvePsaTicket(a.ticketId)),
  D('reopen_psa_ticket', 'Reopen one explicitly identified Custom PSA ticket.', { ticketId }, ['ticketId'], ['POST /api/custom-psa/tickets/{customPsaTicketId}/reopen'], 'write', (a) => psa.reopenPsaTicket(a.ticketId)),
  D('list_psa_customer_mappings', 'List Standard PSA mappings for one customer.', { customerId }, ['customerId'], ['GET /api/standard-psa/customer/{customerId}/mappings'], 'read', (a) => psa.listPsaCustomerMappings(a.customerId)),
  D('update_psa_customer_mappings', 'Replace Standard PSA mappings for one customer.', { customerId, body: mappingBody }, ['customerId', 'body'], ['PUT /api/standard-psa/customer/{customerId}/mappings'], 'write', (a) => psa.updatePsaCustomerMappings(a.customerId, a.body)),
  D('list_psa_companies', 'List Standard PSA companies available to one customer.', { customerId }, ['customerId'], ['GET /api/standard-psa/customers/{customerId}/companies'], 'read', (a) => psa.listPsaCompanies(a.customerId)),
  D('list_psa_company_contacts', 'List contacts for one Standard PSA company and customer.', { customerId, psaCompanyId: id('PSA company identifier.') }, ['customerId', 'psaCompanyId'], ['GET /api/standard-psa/customers/{customerId}/companies/{psaCompanyId}/contacts'], 'read', (a) => psa.listPsaCompanyContacts(a.customerId, a.psaCompanyId)),
  D('list_psa_company_sites', 'List sites for one Standard PSA company and customer.', { customerId, psaCompanyId: id('PSA company identifier.') }, ['customerId', 'psaCompanyId'], ['GET /api/standard-psa/customers/{customerId}/companies/{psaCompanyId}/sites'], 'read', (a) => psa.listPsaCompanySites(a.customerId, a.psaCompanyId)),
]);
