import { it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installContractFetch, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import {
  getPsaCustomerMapping, validatePsaCredential, searchPsaTickets, getPsaTicket,
  createPsaTicket, resolvePsaTicket, reopenPsaTicket, listPsaCustomerMappings,
  updatePsaCustomerMappings, listPsaCompanies, listPsaCompanyContacts, listPsaCompanySites,
} from '../../../src/operations/psa.js';

let boundary; afterEach(() => boundary?.restore());
it('routes PSA credentials, discovery, mappings, companies, and ticket lifecycle', async () => {
  boundary = installContractFetch();
  await withSyntheticTenant(syntheticTenant('psa'), async () => {
    await getPsaCustomerMapping('1'); await validatePsaCredential('tigerpaw', { username: 'u', password: 'p' });
    await searchPsaTickets(); await getPsaTicket('2'); await getPsaTicket('2', { username: 'u', password: 'p' });
    await createPsaTicket({ title: 'x' }); await resolvePsaTicket('2', {}); await reopenPsaTicket('2', {});
    await listPsaCustomerMappings('1'); await updatePsaCustomerMappings('1', { mappings: [] });
    await listPsaCompanies('1'); await listPsaCompanyContacts('1', '3'); await listPsaCompanySites('1', '3');
  });
  assert.deepEqual(boundary.calls.slice(1).map((c) => `${c.method} ${c.path}`), [
    'GET /api/standard-psa/customer/1/mappings', 'POST /api/standard-psa/tigerpaw/credential',
    'GET /api/custom-psa/tickets', 'GET /api/custom-psa/tickets/2', 'POST /api/custom-psa/tickets/2',
    'POST /api/custom-psa/tickets', 'POST /api/custom-psa/tickets/2/resolve',
    'POST /api/custom-psa/tickets/2/reopen', 'GET /api/standard-psa/customer/1/mappings',
    'PUT /api/standard-psa/customer/1/mappings', 'GET /api/standard-psa/customers/1/companies',
    'GET /api/standard-psa/customers/1/companies/3/contacts',
    'GET /api/standard-psa/customers/1/companies/3/sites',
  ]);
  assert.equal(boundary.calls[7].body, null);
  assert.equal(boundary.calls[8].body, null);
});
