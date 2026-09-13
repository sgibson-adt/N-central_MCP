# Implementation Plan: N-central API Coverage and Curated MCP

**Branch**: `001-api-contract-parity`
**Date**: 2026-09-12
**Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-api-contract-parity/spec.md`

## Summary

Turn `test/openapi-spec.json` into a versioned, machine-checked 104-operation contract baseline, then
separate endpoint fidelity from agent-facing MCP design. Extract reusable N-central operation
adapters from the current endpoint-shaped tools, compose them into a default catalog of 12
task-oriented tools, and place broader capabilities in explicit `operations`, `administration`,
`psa`, `reporting`, and `compatibility` toolsets. Preserve safely supportable legacy names through
preferred definitions and the opt-in compatibility toolset, add structured outputs and
selection/safety evaluations, and release
the default-surface change as 3.0.0 only after contract, migration, dependency, and CI gates pass.

## Technical Context

**Language/Version**: ECMAScript modules on Node.js 22.13+ and 24.x
**Primary Dependencies**: `@modelcontextprotocol/sdk` 1.30.x and Zod at runtime; Ajv plus
`ajv-formats` as dev-only JSON Schema validators; ESLint and TypeScript for quality gates
**Storage**: Versioned JSON/Markdown contracts only; runtime authentication, sessions, and caches
remain in memory
**Testing**: Built-in `node:test`, synthetic `fetch` capture, OpenAPI-driven operation cases,
MCP discovery/call integration tests, deterministic lexical selection evaluation, and optional
recorded Codex/Copilot/Claude smoke results
**Target Platform**: macOS/Linux development, GitHub-hosted Linux CI, Linux Alpine container, and
MCP-compatible stdio and Streamable HTTP clients
**Project Type**: Single Node.js MCP server with internal REST operation adapters, composed domain
capabilities, resources, prompts, and filtered tool registries
**Performance Goals**: OpenAPI/coverage check under 5 seconds; complete mandatory suite under 60
seconds in CI; default serialized tool definitions at least 60% smaller than the 55,858-byte baseline;
all composed calls, pagination, concurrency, and rendered results remain explicitly bounded
**Constraints**: Mandatory tests use no live tenant, real credentials, paid model API, or network;
default catalog has at most 20 tools; no unrestricted raw-API tool; destructive actions require
`full` mode and are absent from `core`; toolset selection is fixed at server startup and fails closed;
legacy behavior is preserved only when contract-accurate and safe; omitted write mode becomes
`read-only` for the major release
**Scale/Scope**: 104 OpenAPI operations, 87 existing tools, 12 planned default tools, 6 named
toolsets, 3 write modes, 2 transports, and 5 reviewed Dependabot PRs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle or gate | Design response | Status |
|---|---|---|
| API Contract Fidelity | A 104-record manifest separates implementation status from primary exposure disposition and supports many-to-many capability mappings | PASS |
| Secure Tenant Isolation | Toolsets only reduce visibility; write-mode intersection, synthetic tenant fixtures, redaction, and audit tests remain mandatory | PASS |
| Test-First Contract Confidence | Operation-adapter tests and MCP contract tests are distinct; failing cases precede extraction, correction, composition, and registration | PASS |
| MCP Interface Quality | Default catalog is capped at 20, planned at 12, task-oriented, structured, non-overlapping, and portable without deferred loading | PASS |
| MCP Compatibility | Moving legacy tools out of the default catalog is treated as breaking; 3.0.0 migration and an opt-in compatibility toolset are required | PASS |
| Reliability and Simplicity | Composition reuses one operation layer, preserves bounded calls, and avoids a generic raw-request escape hatch | PASS |
| Engineering gates | Node 22/24, tests, contract checks, lint, type-check, audit, and container smoke are mandatory | PASS |
| Delivery gates | Coverage, operation correctness, curated interface, migration, dependencies, convergence, then version bump | PASS |

**Post-design re-check**: PASS. The data model, coverage schema, toolset contract, evaluation contract,
migration policy, release gates, and validation guide satisfy constitution v1.1.0. No exception or
complexity waiver is required.

## Project Structure

### Documentation (this feature)

```text
specs/001-api-contract-parity/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── coverage-record.schema.json
│   ├── mcp-tool-contract.md
│   ├── toolsets.md
│   ├── selection-evaluation.md
│   └── release-gates.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
index.js                         # Transport setup and server construction
src/
├── auth.js                      # JWT exchange/refresh and validation adapter
├── client.js                    # Capturable upstream request boundary
├── shared.js                    # Pagination, formatting, and bounded helpers
├── operations/                  # Contract-shaped N-central REST functions
│   ├── devices.js
│   ├── organizations.js
│   ├── scheduled-tasks.js
│   ├── custom-properties.js
│   ├── users.js
│   ├── notes.js
│   ├── maintenance-windows.js
│   ├── registration.js
│   ├── psa.js
│   ├── server-info.js
│   └── reports.js
├── capabilities/                # Task-oriented compositions over operations
│   ├── devices.js
│   ├── organizations.js
│   ├── monitoring.js
│   ├── tasks.js
│   ├── reports.js
│   └── server.js
├── tools/
│   ├── core.js                  # Twelve default task-oriented tools
│   ├── operations.js            # Opt-in operational/write tools
│   ├── administration.js        # Opt-in admin/custom-property/registration tools
│   ├── psa.js                   # Opt-in PSA tools
│   ├── reporting.js             # Opt-in specialized report tools
│   ├── compatibility.js         # Deprecated legacy definitions/adapters
│   └── index.js                 # Side-effect-free aggregate exports
├── toolsets.js                  # Membership, selection, ordering, and validation
└── tool-registry.js             # Schema/annotation registration and write filtering
scripts/
├── generate-api-coverage.js     # Deterministic report generation/check
├── evaluate-tool-selection.js   # Offline relevance and safety evaluation
└── check-version-consistency.js # Non-writing package/lock/server version assertion
test/
├── openapi-spec.json            # Authoritative upstream contract
├── contract/
│   ├── operation-coverage.json
│   ├── fixtures.js
│   ├── operations/
│   └── mcp/
├── evaluation/
│   ├── tool-selection-cases.json
│   └── tool-selection.test.js
└── ...
docs/
├── API-COVERAGE.md              # Generated operation and exposure summary
├── MCP-TOOLSETS.md              # User-facing catalog and configuration
├── MIGRATING-TO-3.0.md          # Legacy-to-curated mappings
├── MCP-EVALUATION.md            # Baseline, offline, and optional client results
└── DEPENDENCY-REVIEW.md
```

**Structure Decision**: Keep one ESM package and the existing common client. Extract request logic
once into domain-grouped operation modules, then let curated and compatibility tools call the same
functions. Do not generate public tools directly from OpenAPI and do not add a general method/path
dispatcher. This creates one contract boundary without duplicating endpoint logic or expanding
runtime dependencies.

## Design Decisions

### Default Core Catalog

The planned default catalog contains twelve tools:

1. `get_server_status`
2. `validate_session`
3. `get_current_user`
4. `search_organizations`
5. `get_organization_context`
6. `search_devices`
7. `get_device_context`
8. `list_active_issues`
9. `list_device_scheduled_tasks`
10. `get_scheduled_task_context`
11. `run_report`
12. `list_job_statuses`

Exact inputs, outputs, component operations, limits, and partial-failure behavior are governed by
`contracts/mcp-tool-contract.md`. The cap of 20 allows evidence-driven additions without requiring a
new major version solely for crossing an arbitrary target of twelve.

### Toolset and Write-Mode Composition

`NC_TOOLSETS` accepts a comma-separated set from `core`, `operations`, `administration`, `psa`,
`reporting`, and `compatibility`; omitted or blank selects `core`. Omitted `NC_WRITE_MODE` selects
`read-only` in 3.0. Toolset selection occurs at server startup for both transports, is normalized and
validated once, and fails closed on unknown names. The advertised catalog is the deterministic,
de-duplicated union of selected toolsets intersected with `NC_WRITE_MODE`. Toolsets grant visibility,
never authority.

### Compatibility and Versioning

The first curated release is 3.0.0 because existing tools move out of the default catalog and some
are consolidated. Existing names that remain good task interfaces stay preferred in core or domain
toolsets and are not deprecated; compatibility may reference those same definitions so selecting it
alone recreates the safe legacy surface. Displaced aliases in `compatibility` are deprecated adapters
over the operation layer. `clear_device_notes`
requires a non-empty `noteIds` array and fails locally when omitted; the server must never issue the
undocumented no-body delete. Legacy aliases `text` and `deviceIDs` remain accepted with conflict
validation. A mapping document records every one of the 87 current names, including any safe removal.

### Structured Results

Every curated tool declares an output schema and returns `structuredContent`. A concise text content
block remains available for clients that do not consume structured results. Compatibility tools may
retain their existing text-oriented output during the 3.0 transition when adding a schema would
misrepresent variable upstream data, but their preferred replacement must be structured.

### Selection Evaluation

The mandatory evaluation is offline and deterministic: an approved prompt corpus is scored against
normalized tool names, descriptions, parameter descriptions, and explicit positive/negative terms.
The intended tool must rank in the top three for at least 95% of ordinary cases, and prohibited
destructive tools must never be accepted in negative safety cases. Optional recorded smoke runs in
Codex, Copilot, and Claude validate portability but do not gate CI or require paid access.

## Implementation Strategy

### Phase A - Coverage and Operation Foundation

1. Validate the OpenAPI fingerprint and enumerate 104 unique method/path operations.
2. Validate a reviewed coverage manifest with Ajv and generate the Markdown report from it.
3. Add primary exposure dispositions and many-to-many MCP capability mappings.
4. Build synthetic authentication/fetch fixtures that capture method, URL, query, body, tenant, and
   bounded-call behavior.
5. Extract current request logic into side-effect-free operation modules under failing contract tests.
6. Correct note, pagination, opaque-schema, lifecycle-label, and other audited partial mappings in the
   operation layer.
7. Implement eligible missing operation adapters; keep link indexes and SSO explicitly excluded.

### Phase B - Curated MCP Surface

1. Add bounded composed capability functions for the twelve core goals.
2. Register complete Zod input schemas, output schemas, structured results, readable fallbacks, and
   annotations through one registry path.
3. Add deterministic startup toolset selection and write-mode intersection.
4. Build optional operations, administration, PSA, and reporting catalogs from the shared operation
   layer.
5. Keep suitable current names in preferred domain toolsets, reference them from compatibility,
   adapt displaced safe aliases, and document every legacy mapping.
6. Rebuild the aggregate tool export from curated, domain, and compatibility definitions; remove
   obsolete endpoint-definition modules only after migration reconciliation passes and no imports
   remain.
7. Keep resources and prompts, updating them to use preferred curated capability names and bounded
   data patterns.

### Phase C - Verification and Documentation

1. Prove every supported operation at the adapter boundary and every public capability at the MCP
   boundary with synthetic tests.
2. Verify default size, serialized definition reduction, deterministic ordering, unknown-toolset
   rejection, overlaps, and write-mode intersections.
3. Run the offline selection/safety corpus and record measured results and duration.
4. Verify stdio and HTTP discovery/call parity, tenant isolation, audit/redaction, retry, pagination,
   concurrency, errors, and partial composed results.
5. Generate coverage and toolset documentation plus a complete 2.x-to-3.0 migration map.

### Phase D - Dependency, CI, and Major Release

1. Incorporate approved Dependabot intents at current compatible versions and refresh the lockfile
   once after behavior is covered.
2. Update the MCP SDK within v1 to 1.30.x; defer the separate v2 SDK migration and TypeScript 7 major.
3. Use Node 24 LTS for Docker and retain Node 22/24 CI; reject the EOL Node 25 proposal.
4. Make contract, evaluation, lint, type-check, audit, and container checks mandatory and measure the
   documented performance budgets.
5. Prepare Dependabot closure recommendations but do not mutate PR state without explicit maintainer
   approval.
6. Add a tested, non-writing package/lock/server version-consistency checker, then run Spec Kit
   analysis and convergence after evidence generation; complete any discovered work and rerun affected
   gates/evidence before applying 3.0.0 as the final repository change and checking consistency without
   further file writes.

## Complexity Tracking

| Added complexity | Why required | Simpler alternative rejected |
|---|---|---|
| Operation layer separate from MCP definitions | Both curated and compatibility tools must reuse one tested request mapping | Leaving requests inside 87 tools would duplicate logic during consolidation |
| Named toolsets | Cross-client default must stay compact while specialized users retain broad capabilities | Depending on client-specific deferred loading would not be portable |
| Compatibility toolset | Major migration needs a practical transition path for existing names | Immediate removal would create avoidable migration risk |
| Deterministic selection evaluator | Tool count reduction must be supported by repeatable discoverability evidence | Counting tools alone does not measure overlap or selection quality |
