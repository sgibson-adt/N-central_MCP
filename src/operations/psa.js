// @ts-check
import { apiGet, apiGetOnce, apiPost, apiPut, sanitizePathParam } from '../client.js';

export const getPsaCustomerMapping = (customerId) => apiGet(`/api/standard-psa/customer/${sanitizePathParam(customerId)}/mappings`);
export const validatePsaCredential = (psaType, body) => apiPost(`/api/standard-psa/${sanitizePathParam(psaType)}/credential`, body);
export const getPsaTicket = (ticketId, credentials = null) => credentials
  ? apiPost(`/api/custom-psa/tickets/${sanitizePathParam(ticketId)}`, credentials)
  : apiGetOnce(`/api/custom-psa/tickets/${sanitizePathParam(ticketId)}`);
export const createPsaTicket = (body) => apiPost('/api/custom-psa/tickets', body);
export const resolvePsaTicket = (ticketId) => apiPost(`/api/custom-psa/tickets/${sanitizePathParam(ticketId)}/resolve`);
export const reopenPsaTicket = (ticketId) => apiPost(`/api/custom-psa/tickets/${sanitizePathParam(ticketId)}/reopen`);
export const listPsaCustomerMappings = (customerId) => apiGet(`/api/standard-psa/customer/${sanitizePathParam(customerId)}/mappings`);
export const updatePsaCustomerMappings = (customerId, body) => apiPut(`/api/standard-psa/customer/${sanitizePathParam(customerId)}/mappings`, body);
export async function listPsaCompanies(customerId) {
  try {
    return await apiGetOnce(`/api/standard-psa/customers/${sanitizePathParam(customerId)}/companies`);
  } catch (error) {
    if (error?.status !== 500) throw error;
    return {
      data: [], totalItems: 0, integrationStatus: 'unavailable',
      reason: 'Standard PSA integration is not configured or company discovery is unavailable.',
    };
  }
}
export const listPsaCompanyContacts = (customerId, companyId) => apiGetOnce(`/api/standard-psa/customers/${sanitizePathParam(customerId)}/companies/${sanitizePathParam(companyId)}/contacts`);
export const listPsaCompanySites = (customerId, companyId) => apiGetOnce(`/api/standard-psa/customers/${sanitizePathParam(customerId)}/companies/${sanitizePathParam(companyId)}/sites`);
