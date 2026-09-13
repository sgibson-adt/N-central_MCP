import { it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installContractFetch, jsonResponse, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import {
  getPsaCustomerMapping, validatePsaCredential, getPsaTicket,
  createPsaTicket, resolvePsaTicket, reopenPsaTicket, listPsaCustomerMappings,
  updatePsaCustomerMappings, listPsaCompanies, listPsaCompanyContacts, listPsaCompanySites,
} from '../../../src/operations/psa.js';
import { toolDefinitions } from '../../../src/tools/index.js';

const openapi = JSON.parse(readFileSync(new URL('../../openapi-spec.json', import.meta.url)));

let boundary; afterEach(() => boundary?.restore());
it('treats the Custom PSA ticket root as navigation metadata, not a public ticket list', () => {
  const response = openapi.paths['/api/custom-psa/tickets'].get.responses['200'];
  assert.equal(response.content['application/json'].schema.$ref, '#/components/schemas/LinksResponse');
  assert.equal(toolDefinitions.some(({ name }) => name === 'search_psa_tickets'), false);
  assert.equal(
    toolDefinitions.some(({ operations }) => operations.includes('GET /api/custom-psa/tickets')),
    false,
  );
});

it('routes PSA credentials, mappings, companies, and known-ID ticket lifecycle', async () => {
  boundary = installContractFetch();
  await withSyntheticTenant(syntheticTenant('psa'), async () => {
    await getPsaCustomerMapping('1'); await validatePsaCredential('tigerpaw', { username: 'u', password: 'p' });
    await getPsaTicket('2'); await getPsaTicket('2', { username: 'u', password: 'p' });
    await createPsaTicket({ title: 'x' }); await resolvePsaTicket('2', {}); await reopenPsaTicket('2', {});
    await listPsaCustomerMappings('1'); await updatePsaCustomerMappings('1', { mappings: [] });
    await listPsaCompanies('1'); await listPsaCompanyContacts('1', '3'); await listPsaCompanySites('1', '3');
  });
  assert.deepEqual(boundary.calls.slice(1).map((c) => `${c.method} ${c.path}`), [
    'GET /api/standard-psa/customer/1/mappings', 'POST /api/standard-psa/tigerpaw/credential',
    'GET /api/custom-psa/tickets/2', 'POST /api/custom-psa/tickets/2',
    'POST /api/custom-psa/tickets', 'POST /api/custom-psa/tickets/2/resolve',
    'POST /api/custom-psa/tickets/2/reopen', 'GET /api/standard-psa/customer/1/mappings',
    'PUT /api/standard-psa/customer/1/mappings', 'GET /api/standard-psa/customers/1/companies',
    'GET /api/standard-psa/customers/1/companies/3/contacts',
    'GET /api/standard-psa/customers/1/companies/3/sites',
  ]);
  assert.equal(boundary.calls[6].body, null);
  assert.equal(boundary.calls[7].body, null);
});

it('preserves the list envelopes emitted by Standard PSA read endpoints', async () => {
  const responses = {
    '/api/standard-psa/customer/1/mappings': { data: [{ customerId: 1, psaCompanyId: 2 }] },
    '/api/standard-psa/customers/1/companies': { data: [{ psaCompanyId: 2, psaCompanyName: 'Synthetic PSA' }] },
    '/api/standard-psa/customers/1/companies/2/contacts': { data: [{ psaContactId: 3, psaContactName: 'Synthetic Contact' }] },
    '/api/standard-psa/customers/1/companies/2/sites': { data: [{ psaSiteId: 4, psaSiteName: 'Synthetic Site' }] },
  };
  boundary = installContractFetch({ responder: (call) => jsonResponse(responses[call.path]) });

  const results = await withSyntheticTenant(syntheticTenant('psa-envelopes'), async () => ({
    mapping: await getPsaCustomerMapping('1'),
    mappings: await listPsaCustomerMappings('1'),
    companies: await listPsaCompanies('1'),
    contacts: await listPsaCompanyContacts('1', '2'),
    sites: await listPsaCompanySites('1', '2'),
  }));

  for (const result of Object.values(results)) assert.equal(Array.isArray(result.data), true);
  assert.deepEqual(results.mapping, results.mappings);
});
