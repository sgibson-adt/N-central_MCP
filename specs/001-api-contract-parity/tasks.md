# Tasks: N-central API Coverage and Curated MCP

**Input**: Design documents from `specs/001-api-contract-parity/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: Test-first work is mandatory under the feature specification and constitution. Every
behavior task must be preceded by a failing contract assertion or reproducible regression case.

**Organization**: Tasks are grouped by user story. REST operation evidence, MCP capability evidence,
and migration evidence remain separate and traceable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it targets a different file and has no incomplete dependency.
- **[Story]**: Maps the task to a user story in `spec.md`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the implementation branch, dependencies, and reviewed baselines without changing
runtime behavior.

- [X] T001 Create/switch to implementation branch `001-api-contract-parity` and replace the planned branch marker in `specs/001-api-contract-parity/spec.md`
- [X] T002 Remove the reviewed temporary Sync Impact Report while preserving constitution v1.1.0 in `.specify/memory/constitution.md`
- [X] T003 Add Ajv and `ajv-formats` as dev-only dependencies and update the synchronized lockfile in `package.json` and `package-lock.json`
- [X] T004 [P] Record the 87-tool/55,858-byte definition baseline and known/null OpenAPI provenance fields in `docs/API-COVERAGE.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish importable registries, fixtures, manifests, structured result helpers, and
configuration parsing required by all stories.

**CRITICAL**: No user-story implementation begins until this phase is complete.

- [X] T005 Add a side-effect-free aggregate export for all 87 current definitions in `src/tools/index.js`
- [X] T006 Refactor `index.js` to consume `src/tools/index.js` without changing the existing discovery or call behavior
- [X] T007 [P] Create synthetic tenant, token, response/error, captured-request, and call-counter builders in `test/contract/fixtures.js`
- [X] T008 [P] Create OpenAPI dereference, operation-key, path-matching, and Ajv manifest-validation helpers in `test/contract/helpers.js`
- [X] T009 [P] Create `test/contract/operation-coverage.json` with required nullable provenance, the 87/55,858 baseline, and exactly 104 unique records containing explicit nullable `operationId`, lifecycle, status, verification, exposure, mappings, gaps, rationale, test evidence, and source evidence from `contracts/coverage-record.schema.json`
- [X] T010 [P] Create `test/contract/mcp/legacy-tool-mappings.json` with exactly one placeholder disposition for each of the 87 baseline tool names
- [X] T011 [P] Add reusable schema, structured-result, size-limit, and redacted partial-error assertion helpers in `test/contract/mcp/result-assertions.js`
- [X] T012 [P] Add default, union, normalization, overlap, malformed, unknown, and write-mode fixture vectors in `test/contract/mcp/toolset-fixtures.js`

**Checkpoint**: Existing runtime behavior is preserved while contract and catalog foundations are
importable without starting a transport.

---

## Phase 3: User Story 1 - Trust API Coverage and Exposure Decisions (Priority: P1) MVP

**Goal**: Make all 104 implementation statuses, primary exposure dispositions, mappings, rationales,
evidence, and totals reviewable and reproducible.

**Independent Test**: `npm run coverage:api:check` validates the reviewed fingerprint, enumerates 104
unique operations, validates one record per operation, and confirms generated Markdown is current.

### Tests for User Story 1

- [X] T013 [P] [US1] Add a failing test for OpenAPI validity, SHA-256 review, 84 paths, 104 operation keys, and method/path parameter consistency in `test/contract/operation-inventory.test.js`
- [X] T014 [P] [US1] Add a failing Ajv test for required nullable provenance/operation IDs, lifecycle, coverage conditionals, unique operation reconciliation, evidence paths, and coverage/exposure totals in `test/contract/coverage-manifest.test.js`
- [X] T015 [P] [US1] Add a failing stale-output test comparing deterministic generated Markdown with `docs/API-COVERAGE.md` in `test/contract/coverage-report.test.js`

### Implementation for User Story 1

- [X] T016 [US1] Populate reviewed status, verification, primary exposure, capability, gap, rationale, and source-evidence values for all 104 records in `test/contract/operation-coverage.json`
- [X] T017 [US1] Record internal authentication mappings, compatibility mappings, five link-index exclusions, SSO exclusion, and preferred alternatives in `test/contract/operation-coverage.json`
- [X] T018 [US1] Implement deterministic coverage/status/exposure/category rendering plus `--check` behavior in `scripts/generate-api-coverage.js`
- [X] T019 [US1] Regenerate and review the 104-operation status/exposure report in `docs/API-COVERAGE.md`
- [X] T020 [US1] Add `coverage:api` and `coverage:api:check` commands and include US1 checks in the default test command in `package.json`

**Checkpoint**: The coverage inventory explicitly separates REST fidelity from public MCP exposure.

---

## Phase 4: User Story 2 - Use a Focused Default MCP Interface (Priority: P1)

**Goal**: Deliver the twelve-tool, read-only core catalog with contract-shaped operation adapters,
bounded compositions, structured results, and no raw dispatcher.

**Independent Test**: With toolset and write-mode configuration omitted, discovery returns exactly
the twelve core tools in deterministic order and the representative core calls return schema-valid,
bounded results without knowledge of REST paths.

### Tests for User Story 2

- [X] T021 [P] [US2] Add failing tests for per-operation page sizes through 1000, documented `-1`, positive-only active-issue paging, and bounded `all=true` in `test/contract/operations/pagination.contract.test.js`
- [X] T022 [P] [US2] Add failing authentication/refresh, server-info, health, time, current-user, session-validation, and org-unit job-status adapter tests in `test/contract/operations/server.contract.test.js`
- [X] T023 [P] [US2] Add failing service-org, customer, site, org-unit, children, and detail adapter tests in `test/contract/operations/organizations.contract.test.js`
- [X] T024 [P] [US2] Add failing device list/detail/status/assets/lifecycle and org-scoped device adapter tests in `test/contract/operations/devices.contract.test.js`
- [X] T025 [P] [US2] Add failing active-issue, scheduled-task detail/status/search, filter, and core report adapter tests in `test/contract/operations/monitoring-reports.contract.test.js`
- [X] T026 [P] [US2] Add a failing discovery test for the exact twelve names, all-read scopes, distinct descriptions, complete schemas, deterministic order, and <=20 cap in `test/contract/mcp/core-catalog.contract.test.js`
- [X] T027 [P] [US2] Add failing success/partial/fatal and include-selection tests enforcing 10 calls, concurrency 5, 20 pages/10,000 records, and 256 KiB results in `test/contract/mcp/core-composition.contract.test.js`
- [X] T028 [P] [US2] Add failing output-schema, `structuredContent`, readable fallback, truncation, and redacted component-error tests in `test/contract/mcp/structured-results.contract.test.js`
- [X] T029 [P] [US2] Add a failing omitted-configuration stdio/HTTP discovery test for `core` plus `read-only` and updated resource/prompt registrations in `test/contract/mcp/default-discovery.contract.test.js`

### Implementation for User Story 2

- [X] T030 [US2] Implement reviewed per-operation pagination policies while preserving bounded auto-pagination in `src/shared.js`
- [X] T031 [P] [US2] Prove authentication/refresh at the existing internal boundary and extract health, server-info, time, current-user, session-validation, and org-unit job-status functions into `src/auth.js` and `src/operations/server-info.js`
- [X] T032 [P] [US2] Extract core organization search/detail functions into `src/operations/organizations.js`
- [X] T033 [P] [US2] Extract core device search/detail/status/assets/lifecycle functions into `src/operations/devices.js`
- [X] T034 [P] [US2] Extract core scheduled-task and monitoring/report functions into `src/operations/scheduled-tasks.js` and `src/operations/reports.js`
- [X] T035 [P] [US2] Implement server/session/user result composition in `src/capabilities/server.js`
- [X] T036 [P] [US2] Implement bounded `search_organizations` and `get_organization_context` composition in `src/capabilities/organizations.js`
- [X] T037 [P] [US2] Implement bounded `search_devices` and `get_device_context` composition in `src/capabilities/devices.js`
- [X] T038 [P] [US2] Implement active-issue, device-scheduled-task, scheduled-task context, report, and org-unit job-status composition in `src/capabilities/monitoring.js`, `src/capabilities/tasks.js`, and `src/capabilities/reports.js`
- [X] T039 [US2] Define the twelve complete core input/output contracts and operation mappings in `src/tools/core.js`
- [X] T040 [US2] Register output schemas, structured content, readable fallback, accurate annotations, and redacted MCP errors in `src/tool-registry.js`
- [X] T041 [US2] Implement core-only omitted configuration in `src/toolsets.js`, register only the read-only core catalog, and remove direct endpoint definitions from default discovery in `index.js`
- [X] T042 [US2] Update resource loaders and workflow prompt references to use shared operations/preferred names in `src/resources.js` and `src/prompts.js`

**Checkpoint**: The default client experience is compact, read-only, structured, and independently
usable before optional toolsets are enabled.

---

## Phase 5: User Story 3 - Enable Broader Capabilities Through Toolsets (Priority: P1)

**Goal**: Complete remaining eligible operation adapters and expose deliberate operations,
administration, PSA, reporting, and compatibility catalogs without weakening write gating.

**Independent Test**: For each documented toolset/write-mode pair, discovery returns the exact
deterministic intersection; compatibility mappings reconcile all 87 existing names; every enabled
tool delegates to a shared operation or curated capability.

### Tests for User Story 3

- [X] T043 [P] [US3] Add failing canonical/legacy note-field, alias-conflict, note-ID deletion, and no-body-delete rejection tests in `test/contract/operations/notes.contract.test.js`
- [X] T044 [P] [US3] Add failing device create/delete/lifecycle, Windows service action, remote-control type/task, and appliance-task tests in `test/contract/operations/device-actions.contract.test.js`
- [X] T045 [P] [US3] Add failing organization creation/limits and preview-lifecycle adapter tests in `test/contract/operations/organization-admin.contract.test.js`
- [X] T046 [P] [US3] Add failing custom-property schema, default/value, and update adapter tests in `test/contract/operations/custom-properties.contract.test.js`
- [X] T047 [P] [US3] Add failing user, role, access-group, registration-token, activation, installer, and download adapter tests in `test/contract/operations/users-registration.contract.test.js`
- [X] T048 [P] [US3] Add failing direct-task and maintenance-window nested-schema/payload tests in `test/contract/operations/tasks-maintenance.contract.test.js`
- [X] T049 [P] [US3] Add failing PSA credential, company/contact/site, mapping, and ticket detail/create/resolve/reopen tests in `test/contract/operations/psa.contract.test.js`
- [X] T050 [P] [US3] Add failing specialized report mapping and bounded fan-out tests that classify patch-comparison generation as write and all report retrieval/composition as read in `test/contract/operations/specialized-reports.contract.test.js`
- [X] T051 [P] [US3] Add failing valid union, normalization, overlap de-duplication, malformed/unknown rejection, and exact-membership tests in `test/contract/mcp/toolsets.contract.test.js`
- [X] T052 [P] [US3] Add failing 87-record migration reconciliation tests proving compatibility alone includes retained names without deprecation, displaced aliases name preferred replacements, removed names stay absent, all safe members share delegation, and no stale endpoint request builders or duplicate aggregate exports remain in `test/contract/mcp/compatibility.contract.test.js`
- [X] T053 [P] [US3] Add failing default read-only, write/full intersections, sensitive audit, and individually named destructive-action tests in `test/contract/mcp/write-safety.contract.test.js`

### Implementation for User Story 3

- [X] T054 [US3] Extract and correct note adapters with canonical `note`/`deviceIds`, safe aliases, explicit non-empty `noteIds`, and local no-body-delete rejection in `src/operations/notes.js`
- [X] T055 [P] [US3] Extract remaining device mutations and add service-action/remote-control adapters in `src/operations/devices.js`
- [X] T056 [P] [US3] Extract organization creation and limits adapters with reviewed requirements/lifecycle metadata in `src/operations/organizations.js`
- [X] T057 [P] [US3] Extract all custom-property adapters with explicit input contracts in `src/operations/custom-properties.js`
- [X] T058 [P] [US3] Extract user, role, access-group, and registration/software adapters in `src/operations/users.js` and `src/operations/registration.js`
- [X] T059 [P] [US3] Extract direct-task and maintenance-window adapters with explicit nested inputs in `src/operations/scheduled-tasks.js` and `src/operations/maintenance-windows.js`
- [X] T060 [P] [US3] Extract PSA mappings/discovery and add ticket detail/resolve/reopen adapters in `src/operations/psa.js`
- [X] T061 [P] [US3] Extract specialized report adapters, classify patch-comparison generation as write, and keep retrieval/composition read-only in `src/operations/reports.js`
- [X] T062 [US3] Export every supported non-auth operation once from `src/operations/index.js` and reconcile authenticate/refresh in `src/auth.js` plus excluded link-index/SSO keys in `test/contract/operation-coverage.json`
- [X] T063 [P] [US3] Define exact operations and administration tool contracts from `contracts/toolsets.md` in `src/tools/operations.js` and `src/tools/administration.js`
- [X] T064 [P] [US3] Define exact PSA and reporting tool contracts from `contracts/toolsets.md` in `src/tools/psa.js` and `src/tools/reporting.js`
- [X] T065 [US3] Populate all 87 retained/consolidated/deprecated/removed records, reference retained preferred definitions, implement only displaced safe aliases in `test/contract/mcp/legacy-tool-mappings.json` and `src/tools/compatibility.js`, then—only after every record resolves and no imports remain—remove obsolete endpoint-definition modules `src/tools/devices.js`, `src/tools/organizations.js`, `src/tools/scheduled-tasks.js`, `src/tools/custom-properties.js`, `src/tools/users.js`, `src/tools/notes.js`, `src/tools/maintenance-windows.js`, `src/tools/registration.js`, `src/tools/server-info.js`, and `src/tools/reports.js` (`src/tools/psa.js` is repurposed by T064)
- [X] T066 [US3] Rebuild `src/tools/index.js` from `src/tools/core.js`, `src/tools/operations.js`, `src/tools/administration.js`, `src/tools/psa.js`, `src/tools/reporting.js`, and `src/tools/compatibility.js`, then define the six exact ordered memberships and compatibility derivation in `src/toolsets.js`
- [X] T067 [US3] Apply selected-union then write-mode-intersection registration with fail-closed startup errors in `index.js`
- [X] T068 [US3] Implement deterministic migration and selected-toolset documentation rendering/check behavior in `scripts/generate-migration-guide.js` and `scripts/generate-toolset-docs.js`
- [X] T069 [US3] Generate the complete legacy mapping, default-change notice, exact toolset membership, scopes, and configuration examples in `docs/MIGRATING-TO-3.0.md` and `docs/MCP-TOOLSETS.md`
- [X] T070 [US3] Add `migration:generate`, `migration:check`, `toolsets:generate`, and `toolsets:check` scripts and include toolset/compatibility suites in `package.json`

**Checkpoint**: Specialized users can opt into broad capability groups, while default visibility and
write authority remain least-privilege.

---

## Phase 6: User Story 4 - Verify REST and MCP Behavior Without a Live Tenant (Priority: P1)

**Goal**: Give every supported operation and public capability deterministic evidence, prove
selection/safety quality, and enforce drift and performance budgets offline.

**Independent Test**: `npm test`, focused operation/MCP/evaluation commands, lint, and type-check pass
without credentials or network; all evidence links resolve and deliberate drift is rejected.

### Tests for User Story 4

- [X] T071 [P] [US4] Add a failing completeness test requiring evidence for every supported operation and approved rationale for every excluded operation in `test/contract/operations/all-operations.contract.test.js`
- [X] T072 [P] [US4] Add a failing completeness test for every tool/resource/prompt registration, applicable input/output contract, operation mapping or derived behavior, and result handling plus every tool's annotations, scope, and toolset membership in `test/contract/mcp/all-capabilities.contract.test.js`
- [X] T073 [P] [US4] Add a failing fixture-schema test requiring >=40 cases, >=20 core, >=8 confusion, >=4 invalid, >=4 permission, >=4 destructive-negative, two expected cases per core tool, and one safety case per destructive tool in `test/evaluation/tool-selection.test.js`
- [X] T074 [P] [US4] Add failing deterministic ranking tests for >=95% top-three success, zero accepted prohibited tools, and hidden-tool exclusion in `test/evaluation/tool-selection.test.js`
- [X] T075 [P] [US4] Extend identical-ID cross-tenant, refresh, sensitive-tool, audit, and structured-result redaction tests in `test/auth-isolation.test.js`
- [X] T076 [P] [US4] Add retry/no-retry, timeout, throttling, wrapped-error, non-JSON, partial-composition, and redaction tests in `test/contract/client-errors.contract.test.js`
- [X] T077 [P] [US4] Extend real-registry stdio/HTTP discovery and call parity across toolsets/write modes in `test/isolation.test.js`
- [X] T078 [P] [US4] Add a failing default <=20 and >=60% comparable `{name,description,inputSchema}` UTF-8 reduction assertion against the 87/55,858 baseline plus full advertised-byte reporting in `test/contract/mcp/catalog-size.contract.test.js`

### Implementation and Evidence for User Story 4

- [X] T079 [US4] Populate the reviewed selection corpus satisfying every count and safety constraint in `test/evaluation/tool-selection-cases.json`
- [X] T080 [US4] Implement documented normalization, weighted scoring, deterministic tie-breaking, thresholds, metrics, deterministic `docs/MCP-EVALUATION.md` rendering/check, and non-zero failures in `scripts/evaluate-tool-selection.js`
- [X] T081 [US4] Add fail-closed external-network protection, deterministic auth cleanup, call/concurrency counters, and result-size assertions in `test/contract/fixtures.js`
- [X] T082 [US4] Reconcile final status, verification status, primary exposure, capability mappings, gaps/rationale, and source/test evidence for all 104 operations, then reject implemented-but-unverified release records in `test/contract/operation-coverage.json`
- [X] T083 [US4] Add `test:operations`, `test:mcp`, `test:evaluation`, `evaluation:generate`, and `evaluation:check` scripts and include all mandatory suites/checks in `npm test` in `package.json`
- [X] T084 [US4] Add OpenAPI, manifest, migration, generated-document, catalog-size, and selection-evaluation gates to `.github/workflows/ci.yml`
- [X] T085 [US4] Generate offline selection metrics and explicit `not run` entries for unavailable optional clients in `docs/MCP-EVALUATION.md`
- [X] T086 [US4] Measure the <5-second coverage and <60-second mandatory-suite budgets and record environment/durations in `docs/MCP-EVALUATION.md` and `specs/001-api-contract-parity/quickstart.md`

**Checkpoint**: Operation fidelity and agent-facing quality are independently proven without a live
tenant or model API.

---

## Phase 7: User Story 5 - Prepare a Reviewable Major Release (Priority: P3)

**Goal**: Apply reviewed dependency/runtime changes, publish complete migration/toolset documentation,
and prepare the combined candidate for final validation and versioning.

**Independent Test**: PRs #39–#44 have repository-local dispositions, the combined Node 22/24
candidate passes every release gate, all public docs agree, and the candidate is ready for one
consistent 3.0.0 version update.

### Dependency and Release Tests for User Story 5

- [X] T087 [P] [US5] Record pre-update tests, lint, type-check, production/full audit counts, and disposition fields for PRs #39–#44 in `docs/DEPENDENCY-REVIEW.md`
- [X] T088 [P] [US5] Add SDK transport, structured-result, session, and shutdown regressions required before the v1.30 update in `test/isolation.test.js`
- [X] T089 [P] [US5] Add a container assertion for Node 24, non-root execution, startup failure safety, and health behavior in `test/container-smoke.test.js`

### Dependency and Release Implementation for User Story 5

- [X] T090 [US5] Update `@modelcontextprotocol/sdk` to 1.30.x and refresh compatible transitive fixes without forced majors in `package.json` and `package-lock.json`
- [X] T091 [US5] Refresh the compatible ESLint, `eslint-plugin-n`, and `globals` versions representing PR #39 intent in `package.json` and `package-lock.json`
- [X] T092 [P] [US5] Update official checkout/setup-node actions to v7 while preserving Node 22/24 coverage in `.github/workflows/ci.yml`
- [X] T093 [P] [US5] Replace the rejected Node 25 proposal with Node 24 Alpine and preserve non-root execution in `Dockerfile`
- [X] T094 [US5] Remediate fixable high-severity dependency findings and document any remaining exposure without forced majors in `package-lock.json` and `docs/DEPENDENCY-REVIEW.md`
- [X] T095 [US5] Remove `continue-on-error`, enforce the approved audit threshold, and run contract/evaluation gates in the Node matrix in `.github/workflows/ci.yml`
- [X] T096 [US5] Run every combined release gate and record final include/supersede/reject evidence for PRs #39–#44 in `docs/DEPENDENCY-REVIEW.md`
- [X] T097 [US5] Prepare exact Dependabot closure/comment recommendations and request maintainer approval without changing external PR state in `docs/DEPENDENCY-REVIEW.md`
- [X] T098 [US5] Update setup, toolset selection, read-only default, structured results, counts, limitations, and 3.0 migration links in `README.md` and `docs/SETUP-GUIDE.md`
- [X] T099 [US5] Regenerate final coverage, migration, evaluation, and toolset evidence in `docs/API-COVERAGE.md`, `docs/MIGRATING-TO-3.0.md`, `docs/MCP-EVALUATION.md`, and `docs/MCP-TOOLSETS.md`

**Checkpoint**: The combined candidate is tested, documented, dependency-reviewed, and ready for
final cross-cutting validation; external PR state remains untouched pending explicit approval.

---

## Phase 8: Polish and Cross-Cutting Validation

**Purpose**: Reconcile artifacts, complete convergence, and apply final release versioning.

- [X] T100 Validate local Markdown links and remove stale placeholders/review comments in `.specify/memory/constitution.md`, `docs/`, and `specs/001-api-contract-parity/`
- [X] T101 Add failing matching, mismatch, malformed, and expected-target tests for package, lockfile, and server version metadata in `test/version-consistency.test.js`
- [X] T102 Implement a non-writing checker with an optional expected-version argument and `version:check` command in `scripts/check-version-consistency.js` and `package.json`, then run `npm ci`, coverage/migration checks, operation/MCP/evaluation/full tests, lint, type-check, audit, and container smoke and record only reproducible instructions in `specs/001-api-contract-parity/quickstart.md`
- [X] T103 Run `$speckit-analyze`, resolve all CRITICAL/HIGH findings in `specs/001-api-contract-parity/spec.md`, `plan.md`, and `tasks.md`, then rerun analysis
- [X] T104 Run `$speckit-converge` after implementation; if it finds work, stop release, append and complete that work in `specs/001-api-contract-parity/tasks.md`, rerun convergence, and renumber the final version task so it remains the highest task ID
- [X] T109 Apply version 3.0.0 as the final repository change in `package.json`, `package-lock.json`, and `index.js`, then run `npm run version:check -- 3.0.0` without further file writes

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundation (Phase 2)**: Depends on Setup and blocks all stories.
- **US1 / coverage and exposure (Phase 3)**: Depends on Foundation and is the documentation/test MVP.
- **US2 / focused core (Phase 4)**: Depends on US1 so operation mappings update one source of truth.
- **US3 / optional toolsets (Phase 5)**: Depends on US2's operation/capability boundaries.
- **US4 / complete verification (Phase 6)**: Depends on US2 and US3 catalogs being complete.
- **US5 / release preparation (Phase 7)**: Depends on all behavior and evidence.
- **Polish and final versioning (Phase 8)**: Depends on every selected story.

### User Story Dependencies

```text
Foundation -> US1 -> US2 -> US3 -> US4 -> US5 -> Polish
```

- **US1 (P1)** is independently deliverable as a reconciled coverage/exposure inventory.
- **US2 (P1)** independently delivers the safe default MCP experience.
- **US3 (P1)** independently proves selectable specialized/compatibility catalogs over shared adapters.
- **US4 (P1)** makes all preceding behavior release-verifiable offline.
- **US5 (P3)** packages the completed major release candidate.

### Within Each User Story

- Write each listed test and verify the expected failure before its implementation task.
- Extract request behavior before deleting or adapting an existing tool implementation.
- Update manifest/migration records only after source and evidence agree.
- Regenerate derived documentation only after reviewed source records change.
- Do not update package/server version metadata before T105.

## Parallel Opportunities

- T007–T010 target separate foundational artifacts after registry boundaries are agreed.
- US1 tests T013–T015 can be written in parallel.
- US2 operation tests T022–T025 and core MCP tests T026–T029 target separate files.

- US2 extraction/composition tasks T031–T038 can proceed by domain after T030.
- US3 operation tests T043–T050 and toolset tests T051–T053 can proceed in parallel.
- US3 operation extraction tasks T055–T061 can proceed by domain after their failing tests.
- US4 completeness/security/transport/size tests T071–T078 target separate concerns.
- US5 baseline/SDK/container tests T087–T089 and workflow/container edits T092–T093 are parallelizable.

## Parallel Example: User Story 3

```text
Task: T043 - note contract and destructive-safety tests
Task: T044 - device action and remote-control tests
Task: T045 - organization administration tests
Task: T046 - custom-property tests
Task: T047 - user and registration tests
Task: T048 - scheduled-task and maintenance tests
Task: T049 - PSA tests
Task: T050 - specialized report tests
Task: T051 - toolset composition tests
Task: T052 - compatibility mapping tests
Task: T053 - write-safety and audit tests
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundation.
2. Complete US1 to replace the manual coverage snapshot with an enforced status/exposure manifest.
3. Stop and review all 104 operation dispositions and the proposed twelve-tool core before runtime
   behavior changes.

### Incremental Delivery

1. Extract and test only core operations, then deliver the twelve-tool default surface in US2.
2. Extract remaining operations by domain and add opt-in toolsets in US3.
3. Complete all evidence, selection evaluation, and drift enforcement in US4.
4. Apply dependencies once against the stable candidate in US5.
5. Version 3.0.0 only after every prior gate and document is current.

## Notes

- All 108 tasks use the required checkbox, optional parallel marker, story label where applicable,
  and explicit repository file paths; the final release task was renumbered T109 after convergence.
- T109 is the final version task and remains the highest task ID after convergence work.
- The current worktree is on `001-api-contract-parity`.
- T097 prepares external PR actions but does not perform them; explicit maintainer approval remains
  required at execution time.

---

## Phase 9: Convergence

**Purpose**: Close implementation and evidence gaps found by the post-implementation convergence audit.

- [X] T106 Add explicit user-impact, intended-disposition, and safe-alternative fields and generated-report coverage for every applicable record in `specs/001-api-contract-parity/contracts/coverage-record.schema.json`, `test/contract/operation-coverage.json`, `test/contract/coverage-manifest.test.js`, `scripts/generate-api-coverage.js`, and `docs/API-COVERAGE.md` per FR-006 (partial)
- [X] T107 Replace opaque optional-tool request bodies with operation-shaped required fields, enums, bounds, and nested input contracts, with schema assertions in `src/tools/helpers.js`, `src/tools/operations.js`, `src/tools/administration.js`, `src/tools/psa.js`, and `test/contract/mcp/all-capabilities.contract.test.js` per FR-013 and SC-003 (partial)
- [X] T108 Add deterministic MCP-facing registration, validation, permission, result, resource, and prompt evidence for every public capability in `test/contract/mcp/all-capabilities.contract.test.js` and supporting fixtures per FR-021 and SC-003 (partial)
