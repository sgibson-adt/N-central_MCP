# Version 3 Release Readiness

> Generated from `test/contract/v3-release-readiness.json` and reconciled repository evidence. Do not edit manually.

**Candidate:** 3.0.0 (expected tag `v3.0.0`)

**Scope decision:** RECONCILED — PRE-PUBLICATION GATES REQUIRED

**Authoritative contract:** `test/openapi-spec.json` at SHA-256 `051882a41b6e4f8b895abf85b46c3d90e90a88019b08ec5a8c6782aec6585640`

This report describes an unreleased candidate. Generation and validation never create, move, or push a tag and never publish an artifact.

## Release decision

- All machine-readable scope and repository evidence reconcile.
- The authoritative executable ready/not-ready decision is `npm run release:check` plus the mandatory container smoke result for the same revision.
- Publication still requires those gates, merge, and explicit maintainer approval.

## Contract closure

| Status | Operations |
|---|---:|
| Implemented | 92 |
| Partially implemented | 0 |
| Not implemented | 12 |

| Exposure | Operations |
|---|---:|
| Direct tool | 82 |
| Composed capability | 8 |
| Resource backed | 0 |
| Internal only | 7 |
| Excluded | 7 |

### Resolved baseline gaps

| Operation | Resolution | Decision |
|---|---|---|
| `GET /api/custom-psa/tickets` | Excluded | Treat the LinksResponse as navigation metadata and remove public list/search claims. |
| `GET /api/customers/{customerId}/registration-token` | Implemented | Preserve the customer identifier and disclose the preview lifecycle in discovery. |
| `GET /api/customers/{customerId}/sites` | Implemented | Honor the route pagination policy and disclose the preview lifecycle in discovery. |
| `GET /api/devices/{deviceId}/notes` | Implemented | Expose bounded note pagination through device context and the compatibility mapping. |
| `GET /api/org-units/{orgUnitId}/user-roles` | Implemented | Honor allow-all pagination and disclose the preview lifecycle in discovery. |
| `GET /api/org-units/{orgUnitId}/user-roles/{userRoleId}` | Implemented | Preserve both path identifiers and disclose the preview lifecycle in discovery. |
| `GET /api/sites/{siteId}/registration-token` | Implemented | Preserve the site identifier and disclose the preview lifecycle in discovery. |

### Accepted unsupported operations

| Operation | Rationale | Safe alternative |
|---|---|---|
| `GET /api` | REST navigation index; MCP discovery is the user-facing alternative. | Use MCP tool and resource discovery instead of the REST navigation index. |
| `GET /api/access-groups` | Access-group navigation index; administration discovery is the alternative. | Use the administration toolset access-group tools instead of the REST navigation index. |
| `GET /api/auth` | Authentication navigation index; authenticated session capabilities are the alternative. | Use validate_session and the configured JWT authentication flow instead of the REST navigation index. |
| `GET /api/custom-psa` | Custom PSA navigation index; the PSA toolset is the alternative. | Use the PSA toolset instead of the REST navigation index. |
| `GET /api/custom-psa/tickets` | Custom PSA ticket navigation is represented by MCP discovery instead of a misleading list tool. | Use `get_psa_ticket` when a Custom PSA ticket identifier is already known. |
| `GET /api/scheduled-tasks` | The route is a navigation index and no contract-accurate global task-list adapter is currently exposed. | Use list_device_scheduled_tasks for device-scoped task discovery. |
| `GET /api/standard-psa` | Standard PSA navigation index; the PSA toolset is the alternative. | Use the PSA toolset instead of the REST navigation index. |
| `GET /api/standard-psa/customer-mapping/{customerId}` | The deprecated route is not called; use the canonical customer mappings operation instead. | Use get_psa_customer_mapping or list_psa_customer_mappings through the canonical mappings route. |
| `GET /api/users` | The route is a navigation index and no contract-accurate global user-list adapter is currently exposed. | Use list_users with an explicit organization-unit scope. |
| `POST /api/auth/logout` | Logout was removed because no contract-accurate tenant-safe session behavior is currently retained. | Close the MCP client session to release local tenant authentication state. |
| `POST /api/auth/sso` | Separate SSO credential lifecycle is outside this feature and requires its own security specification. | Configure JWT authentication with NC_JWT_TOKEN; SSO requires a separate security design. |
| `POST /api/server-info/extra/authenticated` | The credential-bearing authenticated server-info variant is not exposed; use the non-secret server status capability. | Use get_server_status and validate_session for supported server and authentication checks. |

## Frozen MCP and migration contracts

- Default discovery contains exactly 12 read-only core tools in reviewed order.
- The 87-name 2.x inventory contains 53 retained, 31 consolidated, and 3 removed names.
- Optional toolsets do not grant write authority; write mode remains an independent gate.

## Provenance

| Fact | Value or reason |
|---|---|
| Source URL | Unavailable — The source URL was not recorded when the maintainer supplied the contract. |
| Retrieved at | Unavailable — The upstream retrieval timestamp was not recorded with the supplied contract. |
| Product version | Unavailable — The supplied OpenAPI document does not declare an N-central product version. |
| Repository receipt | 2026-09-12 |

## Required pre-publication gates

- `contract-integrity`
- `operation-closure`
- `unsupported-review`
- `preview-discovery`
- `pagination-contract`
- `core-catalog`
- `compatibility`
- `mcp-contracts`
- `security`
- `transport-parity`
- `provenance`
- `documentation`
- `selection-quality`
- `supported-platforms`
- `static-quality`
- `dependency-security`
- `version-consistency`
- `release-readiness`

## Post-3.0 work

| Item | Classification | Why it does not block 3.0 |
|---|---|---|
| `additive-api-coverage` | Additive 3.x | Newly justified capabilities may ship in later 3.x releases without changing the frozen contract. |
| `sso-authentication` | Security Specification | SSO requires a separately reviewed credential lifecycle and tenant-isolation design. |
| `remote-logout` | Security Specification | Remote logout requires separately defined local and upstream session semantics. |
| `authenticated-server-information` | Security Specification | Credential-bearing server information needs a separate secret-handling security review. |
| `incompatible-contract-proposals` | Compatibility Design | Future incompatible changes require a compatibility-preserving design or a later major release. |

Additive API coverage may ship in compatible 3.x releases. SSO, remote logout, and credential-bearing server information require separate security specifications. Any incompatible proposal requires a compatibility-preserving design or a later major release.

## Publication contract

- Required architectures: `linux/amd64`, `linux/arm64`.
- An immutable image digest must be recorded in the GitHub release.
- Release notes are generated from the exact approved tag.
- A retry must preserve an existing release and must never move the version tag.
- Creating `v3.0.0` is a separate, explicit post-merge maintainer approval action.
