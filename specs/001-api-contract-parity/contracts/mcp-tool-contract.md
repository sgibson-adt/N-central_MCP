# MCP Capability Contract

## Public Capability Requirements

Every public tool must declare:

- A unique, task-oriented name and a description using terms a user would search for.
- A complete input schema with requiredness, enums, aliases, and bounds.
- An output schema for curated tools and a matching `structuredContent` result.
- A read, write, or destructive scope plus accurate MCP annotations.
- Its named toolset memberships and contributing OpenAPI operation keys.
- Synthetic success, validation, permission, upstream-error, and result-contract cases.

Handlers use the common client and tenant context so authentication, timeout, retry, path
sanitization, redaction, metrics, and audit behavior remain consistent.

Mutation impact, not HTTP method alone, determines scope:

- `read`: no upstream mutation.
- `write`: reversible or ordinary create/update action.
- `destructive`: deletion, endpoint code execution, service control, direct task execution, or
  remote-control session setup; available only in `full` mode.

## Standard Curated Result

Curated tools return both a concise text content block and this structured envelope:

```json
{
  "data": {},
  "meta": {
    "operations": ["GET /api/example"],
    "partial": false,
    "errors": [],
    "page": null,
    "truncated": false
  }
}
```

`data` may be an object, array, scalar, or null as declared by the individual output schema.
`operations` contains the operation keys actually attempted. A composed result sets `partial=true`
when an optional component fails and adds a redacted `{ component, code, message }` entry. Failure of
the primary component returns an MCP error instead of a misleading partial success.

List and composed capabilities use these outer bounds unless a stricter operation contract applies:

- No more than 10 upstream requests per MCP call.
- No more than 5 concurrent upstream requests.
- No more than 20 auto-pagination pages or 10,000 accumulated records.
- No more than 256 KiB of serialized structured result; excess list data is truncated with metadata.
- `pageSize=-1` is passed upstream only for operations that explicitly support it and is never used
  by automatic multi-request pagination.

## Default Core Catalog

| Tool | Scope | Required inputs | Optional selection | Primary outcome |
|---|---|---|---|---|
| `get_server_status` | read | none | `includeTime` | Health, version, and optional server time in one result |
| `validate_session` | read | none | none | Valid/invalid authenticated-session state without token material |
| `get_current_user` | read | none | none | Current user identity and non-secret authorization context |
| `search_organizations` | read | `organizationType` | parent identifier, filters, sort, page, page size, all | Service organizations, customers, sites, or org units through one bounded search |
| `get_organization_context` | read | `orgUnitId` | includes from `details`, `children`, `limits`, `customProperties` | Selected organization context with component status |
| `search_devices` | read | none | `filterId`, `orgUnitId`, filters, sort, page, page size, all | Bounded device inventory search across global or org-unit routes |
| `get_device_context` | read | `deviceId` | includes from `details`, `monitoring`, `assets`, `lifecycle`, `notes`, `customProperties`, `tasks` | Selected device context with component status |
| `list_active_issues` | read | none | organization/filter/severity and supported pagination inputs | Current active monitoring issues |
| `list_device_scheduled_tasks` | read | `deviceId` | supported filters, sort, page, page size | Bounded tasks for a specific device; the REST link index is not represented as a task list |
| `get_scheduled_task_context` | read | `taskId` | `includeStatus` | Scheduled task definition and optional execution status |
| `run_report` | read | `reportType` | report-specific typed parameters and output format | One of the documented general or composed read-only reports |
| `list_job_statuses` | read | `orgUnitId` | supported filters and pagination | Bounded asynchronous job statuses for an organization unit |

The `run_report.reportType` enum is limited to documented report adapters; it cannot accept an
arbitrary path, method, or upstream report name that lacks a reviewed schema.

## Optional Capability Contracts

The `operations` toolset contains ordinary and destructive device/task/note/maintenance actions,
including the new Windows service and remote-control operations. The `administration` toolset
contains organization creation/limits, users, roles, access groups, custom properties, and
registration capabilities. The `psa` toolset contains PSA discovery, mapping, credential validation,
and custom ticket workflows. The `reporting` toolset contains specialized composed reports beyond
the core `run_report` contract. Exact membership is governed by [toolsets.md](toolsets.md).

Every delete, service action, direct scheduled task, or remote-control setup remains a separately
named tool so client approval and destructive annotations are unambiguous. Related ordinary create
and update actions may be combined only when an explicit action enum keeps schemas and effects clear.

## Compatibility Contracts

- Every one of the 87 current tool names receives a record in `docs/MIGRATING-TO-3.0.md`.
- A legacy name that remains a preferred core or domain tool uses the same non-deprecated definition
  when `compatibility` is selected. A displaced legacy alias is registered only when `compatibility`
  is selected and the active write mode permits it.
- A legacy name may delegate to a curated tool or directly to an operation adapter, but it must not
  retain duplicate request-building logic.
- Deprecated metadata and the preferred replacement appear in compatibility-only alias descriptions.
- Canonical note fields are `note` and `deviceIds`; deprecated `text` and `deviceIDs` aliases are
  accepted only when canonical and alias values do not conflict.
- `clear_device_notes` requires a non-empty `noteIds` list. Omission is a local validation error and
  no undocumented no-body delete request is sent.
- Existing link-index names may remain only as compatibility discovery helpers with descriptions and
  results that state they return links rather than entity collections.
- A legacy behavior that cannot be kept contract-accurate and safe is marked removed with rationale
  and is not registered, even in compatibility mode.

## Intentional Operation Exclusions

`GET /api`, `GET /api/auth`, `GET /api/standard-psa`, `GET /api/custom-psa`, and
`GET /api/access-groups` are REST navigation indexes. MCP discovery and documented toolsets provide
the user-facing alternative. `POST /api/auth/sso` remains excluded because it is a separate
credential architecture requiring its own security specification.
