# Tasks: Version 3 Release Readiness

**Input**: Design documents from `specs/002-v3-release-readiness/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Contract and regression tests are mandatory and must fail before each behavior change is
implemented, per the project constitution.

**Organization**: Tasks are grouped by user story so each outcome remains independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it uses different files and has no dependency on another
  incomplete task in the same group.
- **[Story]**: Maps the task to a user story in spec.md.

## Phase 1: Setup (Shared Release Contract)

**Purpose**: Establish the machine-readable scope and test entry points without changing runtime
behavior.

- [X] T001 Create the version 3 scope record with version `3.0.0`, tag `v3.0.0`, the 84-path/104-operation fingerprinted contract, seven closures, 12 unsupported keys, exact twelve-name core, 87-name migration summary, provenance facts, required gates, `linux/amd64` plus `linux/arm64` artifacts, and an intentionally empty `deferredItems` array as the sole known schema blocker in `test/contract/v3-release-readiness.json`
- [X] T002 Add an initially failing JSON Schema and cross-artifact test for `test/contract/v3-release-readiness.json` using `specs/002-v3-release-readiness/contracts/release-readiness.schema.json` in `test/contract/v3-release-readiness.test.js`

---

## Phase 2: Foundational (Blocking Pagination and Readiness Primitives)

**Purpose**: Add shared fail-closed validation and reconciliation primitives required by the user
stories.

**⚠️ CRITICAL**: No user-story implementation begins until these shared behaviors exist.

- [X] T003 Add failing cases proving `pageNumber` accepts integers starting at 1, allow-all `pageSize` accepts `-1` or 1-1000, positive-only `pageSize` accepts 1-1000, invalid values make zero upstream calls, and valid values are unchanged in `test/pagination-policy.test.js`
- [X] T004 Implement explicit operation-policy pagination validation with no silent clamping while preserving 20-page/10,000-record automatic bounds in `src/shared.js`
- [X] T005 Add failing readiness reconciliation assertions for contract fingerprint/counts, operation closure sets, exact core order, migration counts, provenance availability, deferred classification, gates, and artifact architectures in `test/contract/v3-release-readiness.test.js`

**Checkpoint**: Invalid pagination fails before I/O and the readiness test reports every unresolved
candidate mismatch.

---

## Phase 3: User Story 1 - Trust Every Public Capability (Priority: P1) 🎯 MVP

**Goal**: Resolve all seven partial public mappings so discovery, inputs, routing, and results are
truthful against the authoritative contract.

**Independent Test**: Run the targeted operation and MCP contract files from quickstart section 2;
zero coverage record is partial, all preview mappings warn in discovery, valid page inputs are
unchanged, and the Custom PSA link index has no public list/search tool.

### Tests for User Story 1

> **NOTE: Write these tests first and confirm they fail before implementation.**

- [X] T006 [P] [US1] Add a failing OpenAPI response-shape assertion and public catalog absence assertions for the Custom PSA link index in `test/contract/operations/psa.contract.test.js`
- [X] T007 [P] [US1] Add failing device-note query forwarding cases for `pageNumber`, `pageSize`, and bounded `all`, including zero calls for invalid input, in `test/contract/operations/devices.contract.test.js`
- [X] T008 [P] [US1] Add failing customer-site cases for unchanged page/filter/sort forwarding, documented `-1`, invalid page rejection, and preview discovery in `test/contract/operations/organizations.contract.test.js`
- [X] T009 [P] [US1] Add failing user-role and registration-token cases for path identifiers, unchanged page inputs, invalid page rejection, and preview lifecycle in `test/contract/operations/users-registration.contract.test.js`
- [X] T010 [P] [US1] Add a failing invariant that every tool mapped to a preview operation contains `PREVIEW` in its discoverable description in `test/contract/mcp/all-capabilities.contract.test.js`
- [X] T011 [P] [US1] Add failing `get_device_context.noteOptions` schema, selected-component forwarding, and component-isolation cases in `test/contract/mcp/core-composition.contract.test.js`
- [X] T012 [P] [US1] Add failing absence and count assertions for `search_psa_tickets` and `list_custom_psa_tickets` across PSA and compatibility discovery in `test/contract/mcp/compatibility.contract.test.js`

### Implementation for User Story 1

- [X] T013 [US1] Remove the Custom PSA ticket-root request adapter because its `LinksResponse` is navigation metadata rather than searchable records in `src/operations/psa.js`
- [X] T014 [US1] Remove `search_psa_tickets` while retaining known-ID ticket retrieval and creation/lifecycle tools in `src/tools/psa.js`
- [X] T015 [US1] Change `list_custom_psa_tickets` from consolidated to removed with no replacement/compatibility tool and an explicit link-index rationale in `test/contract/mcp/legacy-tool-mappings.json`
- [X] T016 [US1] Remove the obsolete ticket-list transform and ensure compatibility construction produces no dangling alias in `src/tools/compatibility.js`
- [X] T017 [US1] Accept operation-specific note pagination arguments and forward valid page values unchanged through `fetchOrPaginate` in `src/operations/devices.js`
- [X] T018 [US1] Add the optional closed `noteOptions` object with `pageNumber >= 1`, allow-all `pageSize` of `-1` or 1-1000, and boolean `all`, then pass it only to the notes component in `src/tools/core.js` and `src/capabilities/devices.js`
- [X] T019 [US1] Map legacy device-note page inputs into `noteOptions` without affecting other device-context components in `src/tools/compatibility.js`
- [X] T020 [US1] Apply the allow-all pagination policy to customer-scoped site listing, reject invalid values rather than normalizing them, and preserve valid query fields in `src/operations/organizations.js`
- [X] T021 [US1] Apply the allow-all pagination policy to user-role listing and preserve both organization and role identifiers for detail retrieval in `src/operations/users.js`
- [X] T022 [US1] Add explicit `PREVIEW` discovery wording for mixed customer-site search, customer/site registration-token variants, and all preview administration capabilities in `src/tools/core.js` and `src/tools/administration.js`
- [X] T023 [US1] Update the coverage records and evidence to 92 implemented, zero partial, 12 not implemented, 78 direct-tool, 7 composed, 12 internal-only, and 7 excluded operations in `test/contract/operation-coverage.json`
- [X] T024 [US1] Regenerate the reconciled final operation inventory with no partial public claim in `docs/API-COVERAGE.md`

**Checkpoint**: User Story 1 is complete when the targeted suite passes and all seven baseline
partial records match `contracts/operation-closure.md`.

---

## Phase 4: User Story 2 - Make an Objective Release Decision (Priority: P1)

**Goal**: Produce one deterministic ready/not-ready decision with complete provenance and identical
pre-publication gates in CI and tag verification.

**Independent Test**: Run `npm run release:readiness:check`; it validates the scope record and reports
ready only when source, coverage, core, migration, provenance, documents, version, gates, and
artifacts reconcile without writing files.

### Tests for User Story 2

> **NOTE: Write these tests first and confirm they fail before implementation.**

- [X] T025 [P] [US2] Add failing structured-provenance validation requiring every fact to be `known` with a non-empty value or `unavailable` with a non-empty reason in `test/contract/coverage-manifest.test.js`
- [X] T026 [P] [US2] Add a failing generated-readiness-document freshness test and non-writing checker assertion in `test/contract/v3-release-readiness.test.js`
- [X] T027 [P] [US2] Add failing workflow assertions that pull-request CI and both `amd64` and `arm64` tag-verification paths invoke the same aggregate release gate, require an immutable image digest before publication, preserve an existing release during retry, and never move an existing version tag in `test/release-workflow.test.js`

### Implementation for User Story 2

- [X] T028 [US2] Extend coverage-source validation for structured source URL, retrieval time, product version, and repository receipt facts in `specs/001-api-contract-parity/contracts/coverage-record.schema.json`
- [X] T029 [US2] Record known contract metadata and explicit unavailable-with-reason source facts without inventing product or download information in `test/contract/operation-coverage.json`
- [X] T030 [US2] Render provenance status/reasons and reject blank source facts when generating coverage in `scripts/generate-api-coverage.js`
- [X] T031 [US2] Implement schema validation and deterministic reconciliation of version, contract, closures, unsupported keys, core names, migration counts, provenance, gates, deferred items, and architectures in `scripts/check-release-readiness.js`
- [X] T032 [US2] Implement deterministic generation and `--check` behavior for the release decision, blocker summary, unsupported review, deferred work, and publication contract in `scripts/generate-release-readiness.js`
- [X] T033 [US2] Add `release:readiness:generate`, `release:readiness:check`, and non-writing aggregate `release:check` commands without adding dependencies in `package.json`
- [X] T034 [US2] Generate the current candidate report with exact counts, accepted exclusions, provenance status, deferred classifications, and withheld-tag state in `docs/RELEASE-READINESS.md`
- [X] T035 [US2] Make pull-request CI and tag verification invoke the same aggregate `release:check` while keeping the container smoke gate mandatory in `.github/workflows/ci.yml` and `.github/workflows/release.yml`
- [X] T036 [US2] Link the readiness report and explain that 3.0.0 metadata is an unreleased candidate until the tag is deliberately created in `README.md`

**Checkpoint**: User Story 2 is complete when the same candidate produces a deterministic ready
decision locally and in CI, while `v3.0.0` remains absent.

---

## Phase 5: User Story 3 - Migrate Deliberately from 2.x (Priority: P2)

**Goal**: Freeze and prove the final 87-name migration contract after removing the inaccurate ticket
list alias.

**Independent Test**: Enable the compatibility toolset in read-only, write, and full modes; all
non-null mappings resolve, removed names remain absent, and the guide reports 53 retained, 31
consolidated, and 3 removed names.

### Tests for User Story 3

> **NOTE: Write these tests first and confirm they fail before documentation changes.**

- [X] T037 [P] [US3] Add failing exact migration count, removed-rationale, replacement validity, and absent-removed-tool assertions in `test/contract/mcp/compatibility.contract.test.js`
- [X] T038 [P] [US3] Add a failing generated migration check for the `list_custom_psa_tickets` removal and final 53/31/3 summary in `test/contract/v3-release-readiness.test.js`

### Implementation for User Story 3

- [X] T039 [US3] Update migration generation to summarize 53 retained, 31 consolidated, and 3 removed records and render the Custom PSA link-index rationale in `scripts/generate-migration-guide.js`
- [X] T040 [US3] Regenerate the complete 87-name guide and verify every consolidated or removed name has a preferred replacement or safe rationale in `docs/MIGRATING-TO-3.0.md`
- [X] T041 [US3] Update compatibility setup examples and removed-name guidance without weakening read-only defaults in `docs/SETUP-GUIDE.md`
- [X] T042 [US3] Add a concise upgrade path covering the twelve-tool default and opt-in compatibility catalog in under 15 minutes in `README.md`

**Checkpoint**: User Story 3 is complete when an operator can derive the behavior of every 2.x name
from the guide and all compatibility discovery modes match it.

---

## Phase 6: User Story 4 - Continue Additive Work after 3.0 (Priority: P3)

**Goal**: Make every deferred item explicit so later additive work cannot silently expand the 3.0
release boundary.

**Independent Test**: Inspect the readiness report and machine-readable record; every deferred item
has one unique ID, an `additive-3.x`, `security-specification`, or `compatibility-design`
classification, and a rationale explaining why it does not block 3.0.

### Tests for User Story 4

> **NOTE: Write this test first and confirm it fails before finalizing deferred records.**

- [X] T043 [US4] Add failing exact-ID and classification assertions for additive API coverage, SSO, remote logout, credential-bearing server information, and future incompatible proposals in `test/contract/v3-release-readiness.test.js`

### Implementation for User Story 4

- [X] T044 [US4] Finalize unique deferred-item IDs, classifications, and rationales in `test/contract/v3-release-readiness.json`
- [X] T045 [US4] Extend deterministic readiness generation in `scripts/generate-release-readiness.js`, then regenerate a post-3.0 section that distinguishes additive 3.x work from separate security and compatibility designs in `docs/RELEASE-READINESS.md`

**Checkpoint**: User Story 4 is complete when zero discussed roadmap item remains an implicit 3.0
blocker.

---

## Phase 7: Polish & Cross-Cutting Release Validation

**Purpose**: Reconcile all artifacts, run the complete quality suite, and leave a mergeable but
unpublished candidate.

- [X] T046 [P] Re-run API coverage, migration, toolset, evaluation, and readiness generators and commit only deterministic outputs in `docs/API-COVERAGE.md`, `docs/MIGRATING-TO-3.0.md`, `docs/MCP-TOOLSETS.md`, `docs/MCP-EVALUATION.md`, and `docs/RELEASE-READINESS.md`
- [X] T047 [P] Remove stale implementation comments and reconcile public tool counts, preview warnings, and limitations in `src/toolsets.js`, `README.md`, and `docs/SETUP-GUIDE.md`
- [X] T048 Run the complete behavioral and contract suite with `npm test` and record completion in `specs/002-v3-release-readiness/tasks.md`
- [X] T049 Run `npm run release:check` twice and verify it is non-writing with `git status --short`, recording completion in `specs/002-v3-release-readiness/tasks.md`
- [X] T050 Run `npm run lint`, `npm run type-check`, and full plus production dependency audits with zero suppressed/high-severity findings, recording completion in `specs/002-v3-release-readiness/tasks.md`
- [X] T051 Run `npm run test:container` and verify Node.js 24, non-root execution, invalid-startup failure, and health behavior, recording completion in `specs/002-v3-release-readiness/tasks.md`
- [X] T052 Execute every scenario in `specs/002-v3-release-readiness/quickstart.md`, including a timed synthetic 2.x migration walkthrough completed in under 15 minutes, and reconcile any discrepancy in `specs/002-v3-release-readiness/quickstart.md`
- [X] T053 Run Spec Kit consistency analysis and implementation convergence, then resolve every CRITICAL/HIGH or remaining required task in `specs/002-v3-release-readiness/tasks.md`
- [X] T054 Verify `v3.0.0` is absent locally and remotely and leave publication for explicit post-merge maintainer approval, recording the result only in `specs/002-v3-release-readiness/tasks.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately and establishes the fixed release contract.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; resolves runtime/public contract gaps.
- **User Story 2 (Phase 4)**: Depends on User Story 1's final coverage totals and Setup's readiness
  record.
- **User Story 3 (Phase 5)**: Depends on User Story 1's removal of the inaccurate compatibility alias
  but remains independently testable as a complete migration outcome.
- **User Story 4 (Phase 6)**: Depends on the readiness record from Setup and may proceed alongside
  User Story 3 after User Story 1.
- **Polish (Phase 7)**: Depends on all four user stories.

### User Story Dependencies

- **US1 (P1)**: Foundational only; independently delivers truthful public capabilities.
- **US2 (P1)**: Uses US1's final operation status but independently delivers the ready/not-ready
  decision and publication guard.
- **US3 (P2)**: Uses US1's one mapping correction but independently delivers the complete operator
  migration contract.
- **US4 (P3)**: Uses the shared readiness record and independently delivers finite roadmap
  classification.

### Within Each User Story

- Add failing tests and confirm the intended failure before changing behavior or generated output.
- Update operation adapters before composed capabilities and public definitions.
- Update public definitions before coverage and migration records.
- Update source records before regenerating documentation.
- Run the independent checkpoint before starting dependent phases.

### Parallel Opportunities

- T006-T012 modify separate focused test files and can be prepared in parallel.
- T025-T027 cover provenance, readiness generation, and workflow behavior in separate files.
- T037-T038 split MCP compatibility behavior from generated migration reconciliation.
- T046-T047 separate deterministic document generation from source/comment cleanup.
- US3 and US4 may proceed in parallel after US1 completes.

---

## Parallel Example: User Story 1

```text
Task T006: Custom PSA response and catalog tests in test/contract/operations/psa.contract.test.js
Task T007: Device-note query tests in test/contract/operations/devices.contract.test.js
Task T008: Customer-site pagination tests in test/contract/operations/organizations.contract.test.js
Task T009: Role/token contract tests in test/contract/operations/users-registration.contract.test.js
Task T010: Preview discovery invariant in test/contract/mcp/all-capabilities.contract.test.js
Task T011: Device-context note options in test/contract/mcp/core-composition.contract.test.js
Task T012: PSA/compatibility absence in test/contract/mcp/compatibility.contract.test.js
```

## Parallel Example: User Story 2

```text
Task T025: Provenance contract in test/contract/coverage-manifest.test.js
Task T026: Readiness generator freshness in test/contract/v3-release-readiness.test.js
Task T027: Aggregate workflow gate in test/release-workflow.test.js
```

---

## Implementation Strategy

### MVP First: Truthful Public Contract

1. Complete Setup and Foundational phases.
2. Complete User Story 1 through T024.
3. Stop and run its independent targeted suite.
4. Confirm zero public partial operations before adding release automation.

### Incremental Delivery

1. US1 closes public contract gaps.
2. US2 turns the fixed scope into an objective release decision.
3. US3 proves migration from every 2.x name.
4. US4 classifies the remaining roadmap.
5. Polish validates the combined candidate while withholding the release tag.

### Suggested Review Boundaries

- Review contract behavior and coverage closure together (T006-T024).
- Review provenance and release gating together (T025-T036).
- Review compatibility and migration documentation together (T037-T042).
- Review deferred scope and final evidence together (T043-T054).

## Notes

- Every task includes a checkbox, sequential ID, required story label where applicable, and an
  explicit repository path.
- `[P]` marks file-independent work only; implementation still follows test-first checkpoints.
- The feature intentionally ends with a ready candidate, not a tag or public release.

## Phase 8: Convergence

- [X] T055 Add failing end-to-end schema and delegation cases for every consolidated 2.x alias, then restore legacy inputs and correct maintenance-window delegation in `test/contract/mcp/compatibility.contract.test.js` and `src/tools/compatibility.js` per FR-014 and SC-005 (contradicts)
  - Convergence outcome: compatibility aliases now advertise only the operations their reviewed transforms can execute. This supersedes T023's pre-live exposure snapshot with 82 direct-tool, 8 composed-capability, 7 internal-only, and 7 excluded operations while preserving 104 total operations.
- [X] T056 Add failing scoped and result-shape cases, then return a deduplicated user view and contract-accurate scoped customer/site and service-organization hierarchy reports in `test/contract/operations/monitoring-reports.contract.test.js` and `src/operations/reports.js` per FR-016 and SC-006 (contradicts)
- [X] T057 Add failing configuration, nullish-path, and audit-redaction cases, then honor explicit zero retries, reject null or undefined path values before I/O, and redact resolved path identifiers in `test/contract/client-errors.contract.test.js`, `test/helpers.test.js`, `src/client.js`, and `src/logging.js` per FR-017 and Constitution II/III/V (partial)
- [X] T058 Run the complete deterministic release gates and repeat guarded one-off live verification of affected preferred and compatibility capabilities, recording only redacted outcomes in `specs/002-v3-release-readiness/tasks.md` per FR-023 and Constitution III (partial)
  - Deterministic outcome (2026-09-13): `npm run release:check` passed with 188 tests passing and one opt-in container test skipped in the aggregate suite; the separate Docker lifecycle smoke passed 2/2. Generated-document, selection, version, lint, type, and dependency-security gates all passed.
  - Guarded live outcome (2026-09-13): 16 affected preferred/compatibility scenarios passed, zero failed, and the network boundary observed authentication plus GET requests only with zero blocked attempts. Scoped user, customer/site, service-organization hierarchy, server-extra, typed organization aliases, and device maintenance-window behavior passed.
  - Justified live skips: no site record was available for `get_site`; no known completed report ID was available for `get_report`; credential-bearing `get_custom_psa_ticket_detail` remained write-scoped and was not executed during the read-only pass. Its schema, scope, POST route, and credential body are covered deterministically.
  - Post-redaction live outcome (2026-09-13): session validation passed through the authentication-plus-GET guard, and authentication output contained no tenant host value.
  - Final exact-operation live outcome (2026-09-13): the maintenance-window compatibility alias passed with only its advertised maintenance-window operation, using authentication plus GET requests with zero blocked attempts.
- [X] T059 Reconcile N-able's endpoint reference, FAQ, and known-issue guidance with the reviewed OpenAPI and a system-level read-only live pass; add failing refresh-body and wrapped-error-casing regressions before correcting `src/auth.js` and `src/client.js`, preserve live Standard PSA list envelopes in contract evidence, and update `README.md` plus `research.md`
  - Post-reconciliation deterministic outcome (2026-09-13): `npm run release:check` passed with 189 tests passing and one opt-in container test skipped in the aggregate suite; the separate Docker lifecycle smoke passed 2/2. Generated-document, selection, version, lint, type, and both dependency-security gates passed.
  - Expanded live inventory outcome (2026-09-13): all 56 accessible service organizations yielded 205 unique customers; `get_site`, all four Standard PSA read capabilities, and `get_appliance_task` passed. Appliance task IDs were discoverable from device monitoring-status responses.
  - Scheduled-task evidence: all 78 accessible devices returned successful scheduled-task collection responses, but every collection was empty. Known-ID scheduled-task detail/status scenarios therefore remain fixture-limited rather than failed.
  - Standard PSA evidence: 189 of 205 customer-mapping reads succeeded and 16 returned customer/integration-specific HTTP 500 responses; company, contact, and site reads passed when a configured mapping was present. Successful mapping/company/contact/site responses were `data` arrays despite singular OpenAPI schema references, and the public adapters preserved those envelopes.
  - Navigation evidence: scheduled-task, Standard PSA, Custom PSA, and Custom PSA ticket roots returned link metadata. No custom ticket identifier was exposed by those roots, so credential-bearing Custom PSA detail remained outside the read-only pass.
  - Custom PSA discovery follow-up: active-issue reads succeeded for all 205 accessible customers, but no ticket-ID-shaped field was present, so the no-credentials known-ticket GET could not be exercised without a UI-supplied fixture.
  - Service organization 256 follow-up: all four customer active-issue reads succeeded and returned nine issues. The records exposed `psaIntegrationExists`, `psaIntegrationDisabled`, `psaTicketDetails`, and `ticketCreationInProgress`, but all nine ticket-detail strings were empty and none supplied a candidate ID. Service-organization detail, org-unit detail, custom-property, and child responses exposed no PSA/integration configuration field, confirming the documented REST surface cannot enumerate this configured Custom PSA connection or its ticket IDs.
  - Known-ticket follow-up: a UI-supplied Custom PSA ticket identifier reached the exact no-credentials GET adapter, but N-central returned an upstream DMS/credential-class HTTP 500 rather than a not-found or invalid-identifier response. The maintainer confirmed that temporary PSA credentials are unavailable, so the credential-bearing POST variant remains a justified live skip with deterministic route, input, and scope coverage.
  - Direct-task audit follow-up: UUID-shaped audit-event and correlation identifiers were rejected with HTTP 400 by both scheduled-task and appliance-task endpoints. Neither the supplied resource name/identity nor its customer name matched the current server's 78-device and 205-customer inventories, including a recursive device-field and scoped-customer search. Unified audit identifiers from a different tenant/product data plane are therefore not treated as N-central REST task identifiers, and this fixture remains a justified live skip until an ID from the configured N-central server is available.
  - Authentication evidence: a direct contract-format refresh and a forced refresh through `src/auth.js` both returned HTTP 200 without logging the tenant host or token material.

## Phase 9: Convergence

- [X] T060 Add failing operation and MCP contract cases, then implement bounded human-name discovery for `search_organizations` and `search_devices` with explicit exact/contains matching, automatic complete-page retrieval, preserved advanced FIQL inputs, diagnostic match metadata, generated documentation updates, and guarded live verification per FR-016, SC-006, and Constitution IV (partial)
  - Deterministic outcome (2026-09-13): exact and contains searches now normalize case and whitespace, automatically retrieve within the existing 20-page/10,000-record guard, preserve FIQL selection and sorting, reject ambiguous manual-page combinations before I/O, and return bounded match diagnostics. The complete `release:check` passed with 192 tests passing and one opt-in container test skipped; the separate Docker lifecycle smoke passed 2/2.
  - Guarded live outcome (2026-09-13): exact organization and device name discovery each resolved an existing record to the same REST identifier returned by the corresponding complete inventory. The authentication-plus-GET boundary observed one authentication, four reads, and zero blocked requests; no tenant data or credentials were retained in the evidence.
  - Fixture conclusion: the user-supplied customer and device names remain absent from this configured N-central server, so improved discovery cannot make a cross-tenant/product record appear. The new contract makes that absence directly testable without requiring endpoint-specific FIQL field knowledge.

## Phase 10: Convergence

- [X] T061 Validate single-tenant `NC_SERVER_URL` with the same HTTPS/origin rules as multi-tenant targets and add negative boot coverage per Constitution II and FR-017 (contradicts, CRITICAL)
- [X] T062 Restore read-only and localhost-only example/deployment defaults and add configuration contract assertions for `.env.example`, `docker-compose.yml`, and public setup guidance per FR-012, SC-004, and Constitution II (contradicts, CRITICAL)
- [X] T063 Eliminate raw tenant, path, client, and session identifiers from operational/audit logs and add negative redaction coverage for resource failures, tool errors, session cleanup, and client addresses per Constitution II and FR-017 (contradicts, CRITICAL)
- [X] T064 Replace unsafe numeric environment coercion with bounded shared parsing across request, rate, session, tenant, retry, timeout, and cache limits, including malformed, negative, fractional, and intentional-zero tests per Constitution V and FR-017 (partial)
- [X] T065 Rebuild `ncentral://org-tree` from at most three bounded global inventory reads with deterministic parent joining, partial-data diagnostics, and exact call-bound tests per Constitution V and FR-016 (contradicts, CRITICAL)
- [X] T066 Preserve nullable types, constants, alternatives, defaults, and closed-object semantics when converting public JSON Schemas to registered Zod contracts, with unit and real-transport discovery/execution cases per FR-016 and Constitution IV (partial)
- [X] T067 Add failing core-contract cases, then reconcile required and conditional inputs and remove or implement every advertised `list_active_issues`, `run_report`, and scheduled-task option per FR-016 and SC-006 (contradicts)
- [X] T068 Add failing transient-status cases, then safely retry every HTTP 5xx response only for replay-safe methods while retaining non-idempotent no-retry behavior per Constitution V and FR-017 (partial)
- [X] T069 Make `release:check` invoke release readiness explicitly, add a deterministic coverage command with enforced floors, and strengthen high-risk runtime branch coverage per FR-023 and SC-008 (partial)
- [X] T070 Reconcile deployment, metrics-auth, CSV, dependency-state, OpenAPI-deviation, and project-structure documentation; tighten Git and Docker ignore hygiene; and verify every local/external documentation link per FR-021, SC-010, and Constitution I (contradicts)

  - Deterministic outcome (2026-09-13): the aggregate release gate passed with 209 tests passing and one Docker-only lifecycle test skipped there; enforced coverage was 86.11% lines, 75.46% branches, and 74.80% functions. Lint, type checking, every generated-artifact check, version consistency, and full/production audits at low severity passed. The separate Node 24 non-root container lifecycle passed 2/2, and a before/after diff hash confirmed the aggregate gate was non-writing.
  - Live read-only outcome (2026-09-13): startup accepted the configured HTTPS origin; health, CSV report, and active-issue reads succeeded. The bounded organization resource reconciled 56 service organizations, all 205 customers, and all 166 sites from three global inventories with zero failed components and zero unlinked records. No credentials, tenant URLs, names, or raw identifiers were retained in this evidence.
  - Repository-integrity outcome (2026-09-13): JavaScript, JSON, shell, and YAML parsing passed across all 196 reviewed files; 65 Markdown files had zero missing local links; all 20 external documentation links resolved except npm's expected bot-protection 403 for the valid `mcp-remote` package URL. Spec Kit reported Claude, Codex (default), and Copilot installed, and all 30 agent-integration files plus 12 shared files matched their manifests. `.env.live-test` remained ignored, no tracked private-key/token signatures were detected, and `git diff --check` passed.

## Phase 11: Pre-release hardening convergence

- [X] T071 Replace raw tool arguments and exception prose in audit events with an explicit safe metadata and error-classification contract, centralize sanitization, and add negative leakage coverage in `index.js`, `src/logging.js`, `src/tool-registry.js`, and `test/utils.test.js` per Constitution II and FR-017 (contradicts, CRITICAL)
- [X] T072 Extract MCP construction and Streamable HTTP lifecycle concerns from `index.js` into focused runtime modules with behavior-parity unit and transport tests in `src/mcp-server.js`, `src/http-runtime.js`, `index.js`, and `test/server-runtime.test.js` per Constitution IV/V and FR-018/FR-023 (partial)
- [X] T073 Make every explicitly malformed or out-of-range numeric environment setting fail startup with a setting-specific diagnostic while preserving defaults only for absent settings, and update tests and examples in `src/config.js`, `test/config.test.js`, `test/isolation.test.js`, and `.env.example` per Constitution V and FR-017 (partial)
- [X] T074 Add deterministic per-file coverage enforcement for security- and lifecycle-critical runtime modules without weakening the aggregate floors in `scripts/check-critical-coverage.js`, `test/critical-coverage.test.js`, `package.json`, and `test/repository-quality.test.js` per Constitution III and FR-023/SC-008 (partial)
- [X] T075 Codify the opt-in, credential-backed read-only verification procedure and future OpenAPI provenance capture without retaining credentials or tenant-derived values in `scripts/live-readonly-smoke.js`, `docs/VERIFICATION.md`, `docs/OPENAPI-UPDATE.md`, `.env.example`, `README.md`, and `test/repository-quality.test.js` per Constitution I/III and FR-019/FR-020/FR-024 (partial)
- [X] T076 Document and test the version 3 deployment boundary for process-local sessions, rate limits, and caches; require a single instance or session affinity and track distributed state as post-v3 architecture work in `docs/ARCHITECTURE.md`, `docs/SETUP-GUIDE.md`, `README.md`, and `test/repository-quality.test.js` per Constitution V and FR-021/FR-029 (partial)

  - Hardening outcome (2026-09-13): `index.js` was reduced from approximately 550 lines to 127 lines of configuration and lifecycle wiring. MCP registration and Streamable HTTP/session behavior now reside in focused modules with transport-parity and pure-runtime tests. Audit events accept only event-specific fields, sensitive calls retain safe input names rather than values, and exception prose is replaced by bounded classifications.
  - Deterministic outcome (2026-09-13): `npm run release:check` passed with 225 tests passing and one Docker-only lifecycle test skipped in the aggregate run. Aggregate coverage was 87.36% lines, 76.70% branches, and 75.86% functions; all 11 security/lifecycle-critical per-file floors passed. Generated-document, migration, toolset, evaluation, readiness, version, lint, type, and both dependency-audit gates passed.
  - Container outcome (2026-09-13): the separate Node 24 Alpine non-root lifecycle passed 2/2, including fail-safe missing-credential startup and authenticated health behavior.
  - Guarded live outcome (2026-09-13): the explicit read-only smoke passed health, session validation, server information, and one bounded service-organization read (4/4). Retained output contained only scenario names, pass/fail values, and response types; no credentials, tenant URLs, record counts, names, identifiers, or response bodies were emitted.

## Phase 12: Convergence

- [X] T077 Reconcile the final 12-operation unsupported scope, feature status, research decision, and requirements-quality evidence in `specs/002-v3-release-readiness/spec.md`, `specs/002-v3-release-readiness/research.md`, and `specs/002-v3-release-readiness/checklists/requirements.md` per FR-009 and SC-003 (contradicts)
- [X] T078 Amend `specs/002-v3-release-readiness/plan.md` so its implementation structure and scope describe the configuration, security, runtime, resource, coverage, verification, and documentation hardening delivered during convergence per plan: structure decision and Constitution workflow (partial)
- [X] T079 Reconcile stale task metadata, record the final documentation-default correction, rerun Spec Kit consistency/convergence plus the complete same-candidate release and container gates, and retain only redacted outcomes in `specs/002-v3-release-readiness/tasks.md` per FR-021, FR-023, SC-010, and Constitution III (partial)

  - Final artifact outcome (2026-09-13): the normative specification, research decision, plan, checklist, executable readiness record, and generated documentation now agree on the explicit 12-operation unsupported set. The plan records the shared configuration, security, runtime, resource, coverage, verification, and documentation work delivered during convergence; stale fixed task-count prose was removed.
  - Final deterministic outcome (2026-09-13): `npm run release:check` passed with 226 tests passing and one Docker-only lifecycle test skipped in the aggregate run. Aggregate coverage was 87.37% lines, 76.70% branches, and 75.86% functions; all 11 critical per-file floors, generated-artifact checks, lint, type checking, version consistency, and full/production dependency audits passed without modifying the worktree.
  - Final container outcome (2026-09-13): the separate Node 24 Alpine non-root lifecycle passed 2/2, including fail-safe missing-credential startup and authenticated health behavior.
  - Final repository-safety outcome (2026-09-13): all 68 Markdown files had zero missing local links; `.env.live-test` remained ignored and untracked; no tracked private-key marker was detected; `git diff --check` passed; and `v3.0.0` remained absent locally and remotely.
