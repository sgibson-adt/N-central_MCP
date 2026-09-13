# Implementation Plan: Version 3 Release Readiness

**Branch**: `002-v3-release-readiness` | **Date**: 2026-09-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-v3-release-readiness/spec.md`

## Summary

Close every known partial contract on the public version 3 MCP surface, ratify the intentionally
unsupported operation set, complete OpenAPI provenance, and introduce one deterministic readiness
gate that prevents publication while evidence is incomplete. Six partial operations will be brought
to fully implemented status through explicit preview disclosure and operation-specific pagination.
The Custom PSA ticket root will be reclassified as an excluded navigation index, and its misleading
search/list tools will be removed. The final reviewed inventory is expected to contain 92
implemented, zero partial, and 12 not-implemented operations without changing the twelve-tool core.

## Technical Context

**Language/Version**: ECMAScript modules on Node.js 22.9+; CI validates Node.js 22.x and 24.x

**Primary Dependencies**: `@modelcontextprotocol/sdk` 1.30.x and Zod 4.4 at runtime; Ajv and
`ajv-formats` for contract validation; no new runtime dependency planned

**Storage**: Versioned JSON and Markdown contracts only; runtime credentials and sessions remain
in memory

**Testing**: Built-in `node:test`, synthetic tenant/fetch boundaries, OpenAPI-driven assertions,
stdio and Streamable HTTP integration tests, generated-document drift checks, and container smoke
tests

**Target Platform**: macOS/Linux development, Linux CI, Linux Alpine container on amd64 and arm64,
and MCP clients using stdio or Streamable HTTP

**Project Type**: Single Node.js MCP server with internal REST adapters, composed capabilities,
filtered toolsets, resources, prompts, and release automation

**Performance Goals**: Preserve the sub-5-second coverage check, sub-60-second mandatory CI target,
20-page/10,000-record pagination ceilings, 10-call/5-concurrent composition bounds, and 256 KiB
structured-result ceiling

**Constraints**: No live tenant or real credential in mandatory verification; no raw REST dispatcher;
default catalog remains exactly 12 read-only tools; operation restrictions must fail clearly rather
than silently clamp or reinterpret input; no release tag is created during implementation

**Scale/Scope**: 104 OpenAPI operations, seven partial-operation closures, 12 accepted final
unsupported operations, 12 core tools, 87 legacy-name migrations, six toolsets, three write modes,
and two MCP transports

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

| Principle or gate | Design response | Status |
|---|---|---|
| API Contract Fidelity | All seven partial records receive explicit closure decisions; the link-index route is excluded rather than represented as ticket search, while six public operations gain contract-accurate discovery and inputs. | PASS |
| Secure Tenant Isolation and Least Privilege | No authentication, tenant selection, write-mode, or credential-storage expansion is introduced. Registration-token behavior remains sensitive and read-only; SSO and credential-bearing server-info remain excluded. | PASS |
| Test-First Contract Confidence | Failing assertions for lifecycle disclosure, pagination forwarding, PSA removal, provenance, final counts, and readiness status precede production or manifest changes. Synthetic fixtures remain mandatory. | PASS |
| MCP Interface Quality and Compatibility | The twelve-tool core is frozen. Preview state is disclosed in ordinary tool descriptions because standard MCP annotations contain no lifecycle field. The inaccurate PSA list alias becomes an explicitly removed 2.x mapping. | PASS |
| Reliability, Observability, and Simplicity | Existing pagination and result ceilings remain. Operation-specific validation replaces silent normalization, and one small readiness contract/check reuses current evidence rather than adding runtime state. | PASS |
| Supported runtimes and static quality | Existing Node.js 22/24, lint, type-check, audit, and container gates remain blocking. | PASS |
| Documentation and release governance | Coverage, migration, toolset, provenance, readiness, and version documents are regenerated or checked together before a tag can publish artifacts. | PASS |

Post-design re-check: the data model stores no secrets or tenant data; the public contract adds no
new default capability; all exclusions have safer alternatives; contracts require deterministic
evidence and fail-closed publication. No constitutional exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/002-v3-release-readiness/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── contracts/
    ├── mcp-v3-contract.md
    ├── operation-closure.md
    ├── release-gates.md
    └── release-readiness.schema.json
```

### Source Code (repository root)

```text
src/
├── capabilities/
│   ├── devices.js                 # note pagination in composed context
│   ├── organizations.js           # conditional preview route behavior
│   ├── reports.js                 # bounded report composition
│   └── tasks.js                   # scheduled-task contract composition
├── operations/
│   ├── devices.js                 # device-note list query forwarding
│   ├── organizations.js           # site-list pagination policy
│   ├── psa.js                     # link-index removal and PSA envelopes
│   ├── reports.js                 # scoped hierarchy/report semantics
│   ├── registration.js            # mixed stable/preview token routes
│   └── users.js                   # user-role pagination policy
├── tools/
│   ├── administration.js          # preview descriptions and role schemas
│   ├── compatibility.js           # final 2.x migration dispositions
│   ├── core.js                    # preview disclosure and note options
│   ├── psa.js                     # remove misleading ticket search
│   └── reporting.js               # report input reconciliation
├── config.js                      # fail-closed environment parsing
├── http-runtime.js                # Streamable HTTP/session lifecycle
├── logging.js                     # centralized safe audit metadata
├── mcp-server.js                  # transport-independent MCP construction
├── resources.js                   # bounded organization hierarchy
├── shared.js                      # explicit pagination validation
├── tool-registry.js               # lifecycle/discovery and audit invariants
└── toolsets.js                    # deterministic catalog remains unchanged

test/
├── contract/
│   ├── operation-coverage.json
│   ├── v3-release-readiness.json
│   ├── v3-release-readiness.test.js
│   ├── coverage-manifest.test.js
│   ├── mcp/
│   │   ├── all-capabilities.contract.test.js
│   │   ├── compatibility.contract.test.js
│   │   └── core-composition.contract.test.js
│   └── operations/
│       ├── devices.contract.test.js
│       ├── organizations.contract.test.js
│       ├── psa.contract.test.js
│       └── users-registration.contract.test.js
├── config.test.js
├── critical-coverage.test.js
├── repository-quality.test.js
├── server-runtime.test.js
└── release-workflow.test.js

scripts/
├── check-critical-coverage.js
├── check-release-readiness.js
├── generate-api-coverage.js
├── generate-migration-guide.js
├── generate-release-readiness.js
└── live-readonly-smoke.js

docs/
├── ARCHITECTURE.md
├── API-COVERAGE.md
├── MIGRATING-TO-3.0.md
├── OPENAPI-UPDATE.md
├── RELEASE-READINESS.md
└── VERIFICATION.md

.github/workflows/
├── ci.yml
└── release.yml
```

**Structure Decision**: Retain the current single-project separation between REST operations,
task-oriented capabilities, tool definitions, transport/runtime wiring, contract evidence, and
generated documentation. The initial contract-closure work remains concentrated in the five
affected API domains; implementation convergence additionally hardens shared configuration,
authentication, logging, resources, MCP construction, HTTP lifecycle behavior, and verification
without expanding the frozen twelve-tool default contract.

### Implementation Convergence Amendment

Whole-repository review expanded the implementation touch-points while preserving the feature's
user-facing scope. The delivered convergence work:

- validates every server target and numeric runtime setting before startup;
- centralizes redacted audit metadata and safe error classification;
- separates MCP construction and Streamable HTTP/session lifecycle from the entry point;
- bounds organization hierarchy composition and preserves complete public JSON Schema semantics;
- enforces aggregate and security/lifecycle-critical per-file coverage floors;
- documents live verification, OpenAPI provenance refresh, and process-local deployment limits; and
- adds repository-quality contracts that keep configuration examples and documentation aligned.

These changes implement existing FR-016 through FR-024 reliability, security, transport, evidence,
and documentation obligations discovered during convergence. They do not add a default capability,
broaden write authority, or change the accepted 92 implemented / 12 unsupported operation boundary.

## Phase 0: Research Decisions

Research in [research.md](research.md) resolves the public lifecycle representation, Custom PSA link
index, operation-specific pagination behavior, provenance model, unsupported-operation treatment,
compatibility impact, and release gate composition. There are no unresolved clarifications and no
new dependency decisions.

## Phase 1: Design and Contracts

- [data-model.md](data-model.md) defines the release candidate, closure decision, capability
  lifecycle, provenance datum, compatibility mapping, evidence gate, and release state transitions.
- [contracts/operation-closure.md](contracts/operation-closure.md) fixes the expected outcome and
  evidence for all seven partial records and all 12 final unsupported records.
- [contracts/mcp-v3-contract.md](contracts/mcp-v3-contract.md) freezes core discovery, preview
  disclosure, pagination behavior, safety defaults, and compatibility changes.
- [contracts/release-readiness.schema.json](contracts/release-readiness.schema.json) defines the
  machine-readable release-scope record, including classified deferred items, consumed by readiness
  checks and generated documentation.
- [contracts/release-gates.md](contracts/release-gates.md) separates pre-publication blockers from
  post-tag artifact verification.
- [quickstart.md](quickstart.md) provides the end-to-end validation sequence without creating a tag.

## Implementation Strategy

1. Add failing contract assertions for final operation counts, PSA link-index exclusion, preview
   discovery wording, device-note query forwarding, explicit pagination rejection, provenance, and
   readiness reconciliation.
2. Correct operation and capability behavior: validate pagination by policy, forward note options,
   disclose preview routes in discovery, and remove the misleading Custom PSA ticket list/search
   surface.
3. Update the 87-name migration inventory so `list_custom_psa_tickets` is removed with a supported
   known-ID alternative; verify retained and consolidated behavior is unchanged.
4. Update the coverage manifest to 92 implemented, zero partial, and 12 not implemented; add
   structured provenance availability and regenerate coverage and migration documents.
5. Add the release-readiness scope record, deterministic checker, generated readiness document, and
   one aggregate `release:check` command used by both CI and release verification.
6. Run targeted tests first, then the complete Node.js 22/24, security, documentation, dependency,
   transport, and container gates. Re-run Spec Kit analysis and convergence before requesting merge.
7. Keep `v3.0.0` untagged after implementation. Publication remains a separate maintainer-approved
   action against the exact merged candidate.
