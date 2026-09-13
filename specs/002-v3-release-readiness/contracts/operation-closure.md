# Operation Closure Contract

This contract fixes the version 3 disposition of every operation that is partial or unsupported at
the feature baseline. The implementation may not claim a different outcome without updating and
re-reviewing the feature specification.

## Partial-operation closures

| Operation | Final status | Final exposure | Required behavior | Required evidence |
|---|---|---|---|---|
| `GET /api/custom-psa/tickets` | Not implemented | Excluded | Treat the `LinksResponse` as a navigation index. Remove `search_psa_tickets` and the `list_custom_psa_tickets` compatibility alias. Direct known-ID use to `get_psa_ticket`. | OpenAPI response assertion; catalog absence; migration removal; coverage reconciliation. |
| `GET /api/customers/{customerId}/registration-token` | Implemented | Direct tool | Preserve the customer-specific path and declare in discovery that the customer variant is preview. | Path/ID test; preview-description test; coverage record. |
| `GET /api/customers/{customerId}/sites` | Implemented | Direct tool | Forward valid page number, page size, filter, and sort inputs; accept documented `-1`; reject out-of-policy values; declare that customer-scoped site listing is preview. | Query-forwarding and rejection tests; discovery test; composed/compatibility mapping test. |
| `GET /api/devices/{deviceId}/notes` | Implemented | Direct tool | Accept bounded note page options through device context and compatibility mapping; forward valid page number/page size without silent changes; retain bounded all-pages behavior. | Adapter query test; core schema/composition test; compatibility transform test. |
| `GET /api/org-units/{orgUnitId}/user-roles` | Implemented | Direct tool | Forward valid page/filter/sort inputs; accept documented `-1`; reject out-of-policy values; declare preview in discovery. | Query-forwarding and rejection tests; preview-description test. |
| `GET /api/org-units/{orgUnitId}/user-roles/{userRoleId}` | Implemented | Direct tool | Preserve both identifiers and declare preview in discovery. | Path/ID test; preview-description test. |
| `GET /api/sites/{siteId}/registration-token` | Implemented | Direct tool | Preserve the site-specific path and declare in discovery that the site variant is preview. | Path/ID test; preview-description test; coverage record. |

The final coverage inventory must contain no `partially-implemented` records. If a planned
implementation outcome cannot be made accurate and safe, the affected mapping returns to feature
review rather than being marked implemented by documentation alone.

## Accepted unsupported operations

| Operation | Verification | Exposure | Required rationale and alternative |
|---|---|---|---|
| `GET /api` | Excluded | Excluded | REST navigation index; use MCP discovery. |
| `GET /api/access-groups` | Excluded | Excluded | Access-group navigation index; use administration access-group capabilities. |
| `GET /api/auth` | Excluded | Excluded | Authentication navigation index; use configured authentication and `validate_session`. |
| `GET /api/custom-psa` | Excluded | Excluded | Custom PSA navigation index; use the PSA toolset. |
| `GET /api/custom-psa/tickets` | Excluded | Excluded | Ticket navigation links, not a searchable list; use `get_psa_ticket` with a known ID. |
| `GET /api/standard-psa` | Excluded | Excluded | Standard PSA navigation index; use the PSA toolset. |
| `POST /api/auth/sso` | Excluded | Excluded | Requires a separate credential/session security design; use configured JWT authentication. |
| `GET /api/scheduled-tasks` | Unverified | Internal only | Global navigation index; use device-scoped task listing. |
| `GET /api/standard-psa/customer-mapping/{customerId}` | Unverified | Internal only | Deprecated route; use canonical customer mapping capabilities. |
| `GET /api/users` | Unverified | Internal only | Global navigation index; use organization-scoped user listing. |
| `POST /api/auth/logout` | Unverified | Internal only | Remote/local session semantics are not safely defined; close the MCP client session. |
| `POST /api/server-info/extra/authenticated` | Unverified | Internal only | Credential-bearing operation; use non-secret server status and session validation. |

## Aggregate invariants

- Status counts: 92 implemented, 0 partial, 12 not implemented.
- Exposure counts: 82 direct tool, 8 composed capability, 0 resource backed, 7 internal only,
  7 excluded.
- Implemented records have non-empty test and source evidence.
- Unsupported records have no public capability mappings.
- Every unsupported record has non-empty gap, rationale, user impact, intended disposition, and safe
  alternative fields.
- Generated coverage documentation is byte-for-byte current with the reviewed manifest.
