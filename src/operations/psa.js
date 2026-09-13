// @ts-check
import { apiGet, apiPost, apiPut, sanitizePathParam } from '../client.js';

export const getPsaCustomerMapping = (customerId) => apiGet(`/api/standard-psa/customer/${sanitizePathParam(customerId)}/mappings`);
export const validatePsaCredential = (psaType, body) => apiPost(`/api/standard-psa/${sanitizePathParam(psaType)}/credential`, body);
export const searchPsaTickets = () => apiGet('/api/custom-psa/tickets');
export const getPsaTicket = (ticketId, credentials = null) => credentials
  ? apiPost(`/api/custom-psa/tickets/${sanitizePathParam(ticketId)}`, credentials)
  : apiGet(`/api/custom-psa/tickets/${sanitizePathParam(ticketId)}`);
export const createPsaTicket = (body) => apiPost('/api/custom-psa/tickets', body);
export const resolvePsaTicket = (ticketId) => apiPost(`/api/custom-psa/tickets/${sanitizePathParam(ticketId)}/resolve`);
export const reopenPsaTicket = (ticketId) => apiPost(`/api/custom-psa/tickets/${sanitizePathParam(ticketId)}/reopen`);
export const listPsaCustomerMappings = (customerId) => apiGet(`/api/standard-psa/customer/${sanitizePathParam(customerId)}/mappings`);
export const updatePsaCustomerMappings = (customerId, body) => apiPut(`/api/standard-psa/customer/${sanitizePathParam(customerId)}/mappings`, body);
export const listPsaCompanies = (customerId) => apiGet(`/api/standard-psa/customers/${sanitizePathParam(customerId)}/companies`);
export const listPsaCompanyContacts = (customerId, companyId) => apiGet(`/api/standard-psa/customers/${sanitizePathParam(customerId)}/companies/${sanitizePathParam(companyId)}/contacts`);
export const listPsaCompanySites = (customerId, companyId) => apiGet(`/api/standard-psa/customers/${sanitizePathParam(customerId)}/companies/${sanitizePathParam(companyId)}/sites`);
