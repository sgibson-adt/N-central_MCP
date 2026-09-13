# Feature Specification: N-central API Coverage and Curated MCP

**Feature Branch**: `001-api-contract-parity`

**Created**: 2026-09-12

**Status**: Implementation validation

**Input**: User description: "Maintain complete, tested coverage of the supplied N-central REST API
contract while exposing a smaller, task-oriented MCP interface with a focused default catalog,
opt-in domain toolsets, safe migration from the existing endpoint-oriented tools, and release-ready
testing and dependency evidence."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trust API Coverage and Exposure Decisions (Priority: P1)

As a maintainer or evaluator, I can see every operation in the supplied N-central API contract,
whether its behavior is fully, partially, or not implemented, and how it contributes to the MCP
without assuming that every REST endpoint must be a separate public tool.

**Why this priority**: Contract completeness and public interface design are different concerns. Both
must be explicit before implementation or release decisions are trustworthy.

**Independent Test**: Compare the coverage inventory with the supplied contract and public MCP
catalog. Every operation has exactly one coverage status and one exposure disposition, every public
capability identifies its contributing operations or derived behavior, and all totals reconcile.

**Acceptance Scenarios**:

1. **Given** the supplied OpenAPI document, **When** a maintainer reviews the inventory, **Then** every
   method-and-path operation has exactly one coverage status and one exposure disposition.
2. **Given** a task-oriented capability that combines several operations, **When** its coverage is
   reviewed, **Then** each contributing operation is traceable without being counted more than once.
3. **Given** an operation that is internal, resource-backed, or intentionally excluded, **When** its
   record is reviewed, **Then** the disposition, rationale, user impact, evidence, and alternative are
   explicit.

---

### User Story 2 - Use a Focused Default MCP Interface (Priority: P1)

As an MCP client user, I receive a compact default catalog organized around common N-central tasks,
so an agent can select the right capability and provide valid inputs without navigating dozens of
similar endpoint-shaped tools.

**Why this priority**: The default interface determines tool-selection accuracy, context cost,
security exposure, and the quality of the first-run experience across MCP clients.

**Independent Test**: Connect with default settings, inspect the advertised capabilities, and run the
representative inventory, organization, monitoring, reporting, and status scenarios. The catalog is
within its size budget, each capability has a distinct purpose, and each scenario completes without
requiring knowledge of raw REST paths.

**Acceptance Scenarios**:

1. **Given** a default connection, **When** the client lists MCP tools, **Then** no more than 20 tools
   are advertised and none is an unrestricted raw-API dispatcher.
2. **Given** a request for device or organization context, **When** the agent chooses a capability,
   **Then** one task-oriented capability can return the requested related information with bounded,
   user-selectable detail.
3. **Given** two tools in the default catalog, **When** their names, descriptions, inputs, and effects
   are compared, **Then** each has a distinct user goal and neither is merely a route variant of the
   other.
4. **Given** a successful tool result, **When** a client processes it, **Then** the result has a
   documented structured shape as well as a readable representation where needed.

---

### User Story 3 - Enable Broader Capabilities Through Toolsets (Priority: P1)

As an operator, I can opt into only the N-central capability groups required for a role or workflow,
including operations, administration, PSA, reporting, or a deprecated compatibility surface, without
making every capability visible by default.

**Why this priority**: Some users need broad coverage, but visibility and authority should be
deliberate and should not penalize every agent session.

**Independent Test**: Start otherwise equivalent connections with different toolset selections and
write modes. Each advertised catalog is deterministic, contains only the expected groups, and never
exposes an action beyond the active write mode.

**Acceptance Scenarios**:

1. **Given** no explicit toolset selection, **When** discovery occurs, **Then** only the documented
   core toolset is advertised.
2. **Given** one or more recognized toolsets, **When** discovery occurs, **Then** their documented
   union is advertised in deterministic order with duplicates removed.
3. **Given** an unknown or malformed toolset selection, **When** the server starts or accepts a
   connection, **Then** it fails closed with an actionable error rather than silently enabling more
   capabilities.
4. **Given** a write or destructive capability in an enabled toolset, **When** the active write mode
   is insufficient, **Then** that capability is absent and no upstream mutation can occur.
5. **Given** a user migrating from the existing catalog, **When** the compatibility toolset is
   enabled, **Then** retained preferred names remain non-deprecated, while displaced aliases visibly
   identify their deprecation and preferred replacement.

---

### User Story 4 - Verify REST and MCP Behavior Without a Live Tenant (Priority: P1)

As a contributor or reviewer, I can verify complete supported REST behavior and the curated MCP
interface locally and in automated checks without N-central credentials or contact with a live
tenant.

**Why this priority**: A compact MCP surface must not hide untested adapter gaps, and complete REST
coverage must not substitute for evidence that agents can safely use the public interface.

**Independent Test**: Run the documented behavioral quality checks without credentials or network
access. Every supported operation mapping, public capability contract, toolset composition, safety
boundary, and representative tool-selection scenario is checked deterministically.

**Acceptance Scenarios**:

1. **Given** a supported REST operation, **When** its contract checks run, **Then** method, path,
   parameters, request data, result semantics, error behavior, and exposure disposition are verified
   at the appropriate internal boundary.
2. **Given** a public MCP capability, **When** its contract checks run, **Then** registration, input
   and output shapes, contributing operation mappings, annotations, and write classification are
   verified.
3. **Given** representative user requests containing plausible competing capabilities, **When** the
   selection evaluation runs, **Then** the intended capability ranks within the accepted threshold
   and unsafe actions are rejected in every negative safety case.
4. **Given** authentication refresh, pagination, retry, or concurrent multi-tenant behavior,
   **When** failure and interleaving cases run, **Then** behavior remains bounded, tenant-isolated,
   and free of credential disclosure.
5. **Given** a change to the OpenAPI reference, exposure inventory, toolset membership, or public MCP
   catalog without corresponding evidence, **When** mandatory checks run, **Then** the inconsistency
   is detected before release.

---

### User Story 5 - Prepare a Reviewable Major Release (Priority: P3)

As a maintainer, I can review the curated-interface migration and pending dependency updates as one
release candidate, understand the compatibility impact, and publish only after all required evidence
and migration guidance are complete.

**Why this priority**: Changing the default public catalog is intentional but breaking, so dependency
and version decisions must follow the completed interface and test evidence.

**Independent Test**: Confirm that every automated dependency proposal has a recorded disposition,
included changes pass every release gate, legacy-to-curated mappings are documented, and the proposed
major version is consistent throughout release metadata.

**Acceptance Scenarios**:

1. **Given** the existing endpoint-oriented catalog, **When** the curated catalog is released,
   **Then** migration guidance maps every removed, consolidated, or deprecated public capability to
   its replacement or explicit disposition.
2. **Given** pending automated dependency proposals, **When** release scope is finalized, **Then**
   every proposal has an include, defer, or reject decision with compatibility and security rationale.
3. **Given** an update selected for inclusion, **When** the full quality suite runs, **Then** it passes
   on every supported runtime without weakening a required check.
4. **Given** completed capability, migration, documentation, dependency, and test work, **When** the
   release version is proposed, **Then** it is a major version and is reported consistently.

### Edge Cases

- The OpenAPI document contains an operation without an `operationId`, repeated summaries, or
  reusable parameters and schemas referenced elsewhere.
- One task-oriented tool composes multiple operations, multiple tools reuse one operation, or an
  operation supports both a resource and a tool without changing its coverage count.
- An upstream operation is preview, deprecated, integration-specific, known to be nonfunctional, or
  unsafe enough to remain internal or excluded.
- A composed capability receives a partial upstream failure after other contributing calls succeed.
- A detail include requests unavailable or unauthorized related data, or would trigger an unbounded
  number of upstream requests.
- Selected toolsets overlap, are repeated, differ only in case, or conflict with the active write mode.
- The compatibility toolset contains a legacy name that maps to several new operations or cannot
  preserve prior behavior safely.
- A tool's structured output is valid but its readable representation would exceed a client context
  budget.
- A paginated operation returns empty, malformed, duplicated, or maximum-size pages, or reaches a
  configured safety bound.
- Concurrent tenants use the same identifiers while one tenant reauthenticates or changes toolset
  configuration.
- A dependency proposal is stale, superseded, conflicting, breaking, or already represented in the
  target branch.
- The authoritative OpenAPI file is moved, duplicated, invalid, or replaced without provenance.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST designate one authoritative, versioned N-central OpenAPI document and
  record its provenance and observed contract metadata.
- **FR-002**: The coverage inventory MUST identify every OpenAPI operation by HTTP method and path,
  including operations without stable human-readable identifiers.
- **FR-003**: Each operation MUST have exactly one coverage status: implemented, partially
  implemented, or not implemented.
- **FR-004**: Each operation MUST independently have exactly one exposure disposition: direct tool,
  composed capability, resource-backed, internal-only, or excluded.
- **FR-005**: The inventory MUST reconcile every public MCP tool, resource, and prompt with its
  contributing operations or identify it as derived MCP-only behavior without double-counting REST
  coverage.
- **FR-006**: Every partial, missing, internal-only, or excluded entry MUST state its gap or rationale,
  user impact, evidence, intended disposition, and user-safe alternative where one exists.
- **FR-007**: Coverage and exposure summary totals MUST reconcile with detailed records and MUST be
  generated from the same reviewed evidence.
- **FR-008**: REST behavior classified as implemented MUST preserve upstream methods, paths, parameters, required
  request data, and material result and error semantics regardless of whether it is directly exposed
  as an MCP tool.
- **FR-009**: The default MCP catalog MUST contain no more than 20 task-oriented tools and MUST NOT
  expose an unrestricted raw-API request tool.
- **FR-010**: Every default tool MUST represent a distinct user goal; endpoint route variants MUST be
  combined behind meaningful inputs or internal composition when doing so preserves safety and clear
  result semantics.
- **FR-011**: Common device, organization, monitoring, reporting, and server-status tasks MUST be
  achievable through the default catalog without knowledge of REST paths.
- **FR-012**: Composed capabilities MUST offer bounded, user-selectable detail and MUST clearly report
  partial upstream failures without presenting incomplete data as complete.
- **FR-013**: Every public tool MUST provide a clear name, task-oriented description, complete input
  requirements, actionable errors, safety annotations, write-mode classification, and documented
  output contract. Every curated tool MUST additionally declare and return a structured result;
  compatibility-only aliases MAY retain documented text output when variable upstream data cannot be
  represented accurately by one stable schema.
- **FR-014**: Broader capabilities MUST be grouped into documented core, operations, administration,
  PSA, reporting, and compatibility toolsets with deterministic membership and ordering.
- **FR-015**: The core toolset and read-only write mode MUST be selected when their respective
  configuration is omitted; additional toolsets MUST require explicit selection, and unknown
  selections MUST fail closed.
- **FR-016**: Toolset filtering and write-mode filtering MUST compose by intersection so enabling a
  toolset never grants a capability prohibited by the active write mode.
- **FR-017**: Destructive actions MUST remain individually identifiable, MUST be absent from the core
  toolset, MUST require full write mode, and MUST generate redacted audit evidence.
- **FR-018**: Safely preservable legacy names that remain preferred in core or domain toolsets MUST be
  retained without deprecation and MAY also be referenced by the compatibility toolset. The
  compatibility toolset MUST recreate the safely supportable legacy catalog, mark only displaced
  aliases for consolidated capabilities deprecated, identify their preferred replacements, and never
  preserve behavior that violates current contract or safety requirements.
- **FR-019**: The default and selected toolset behavior MUST be equivalent across supported MCP
  transports except for documented transport-specific authentication or session behavior.
- **FR-020**: Every supported REST operation MUST have deterministic automated evidence for request
  mapping, accepted data, material results and errors, and exposure disposition at an internal
  adapter or domain boundary.
- **FR-021**: Every public MCP tool, resource, and prompt MUST have deterministic automated evidence
  for registration, applicable input/output contracts, contributing operation mappings or derived
  behavior, and result handling. Tools MUST additionally have evidence for annotations, write
  classification, and toolset membership.
- **FR-022**: Representative selection evaluations MUST cover common goals, plausible tool confusion,
  invalid arguments, insufficient permissions, and requests that must not invoke destructive actions.
- **FR-023**: Automated verification MUST detect drift among the OpenAPI contract, coverage inventory,
  exposure dispositions, public catalog, toolset membership, documentation, and required evidence.
- **FR-024**: Behavioral and contract verification MUST require no live N-central tenant, real
  credentials, model API, or external network access and MUST use synthetic tenant-specific data.
  Dependency acquisition/security audits and container base-image retrieval MAY access only their
  configured package or image registries during separate release gates.
- **FR-025**: Risk-sensitive behavior MUST have additional evidence for applicable authentication,
  validation, tenant isolation, redaction, retry, timeout, pagination, concurrency, audit, and failure
  behavior.
- **FR-026**: Public documentation MUST report current default and optional capability totals, toolset
  membership, write classifications, limitations, migration mappings, and known upstream quirks from
  verified evidence.
- **FR-027**: Every pending automated dependency update proposal MUST receive an include, defer, or
  reject disposition with compatibility and security rationale; external proposal state MUST NOT be
  changed without explicit maintainer approval.
- **FR-028**: Included dependency updates MUST pass the same complete quality gates as capability work
  and MUST NOT rely on disabling or weakening an existing check.
- **FR-029**: The release version MUST be selected only after capability, migration, documentation,
  dependency, and test gates pass and MUST reflect the breaking default-interface change.

### Key Entities

- **OpenAPI Operation**: One upstream method-and-path contract, including parameters, request data,
  responses, lifecycle status, and contract references.
- **Supported OpenAPI Operation**: An operation classified as implemented. A partially implemented
  operation is evidence of a usable subset with documented gaps, not complete contract support.
- **MCP Capability**: A public tool, resource, or prompt with a distinct user goal, safety
  classification, input/output contract, and relationship to one or more operations.
- **Coverage Record**: The relationship between an operation and implementation evidence, including
  coverage status, exposure disposition, gaps, rationale, and follow-up.
- **Toolset**: A named, deterministic collection of capabilities selected independently from the
  active write mode.
- **Compatibility Mapping**: A legacy capability name, its lifecycle state, preferred replacement,
  preserved contract, and migration notes.
- **Selection Evaluation Case**: A representative user goal with expected capability candidates,
  prohibited candidates, valid argument characteristics, and scoring outcome.
- **Test Evidence**: Repeatable proof that an operation or MCP capability preserves its contract and
  safety requirements without accessing a live tenant.
- **Dependency Update Proposal**: An automated change request with current applicability,
  compatibility/security impact, disposition, and validation evidence.
- **Release Candidate**: The combined capability, migration, documentation, dependency, and test
  state evaluated against release gates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 104 operations in the supplied contract have exactly one coverage status and one
  exposure disposition, with zero omissions, duplicates, or unreconciled totals.
- **SC-002**: One hundred percent of supported operations have traceable automated contract evidence;
  zero operations remain labeled implemented while a material contract gap is known.
- **SC-003**: One hundred percent of public capabilities identify their contributing operations or
  derived behavior and have verified applicable input/output and safety contracts; every public tool
  additionally has verified toolset membership and write classification.
- **SC-004**: The default catalog contains at most 20 tools and its serialized definitions are at
  least 60 percent smaller than the current 87-tool baseline.
- **SC-005**: In the approved representative selection suite, the intended capability appears within
  the top three candidates for at least 95 percent of ordinary cases and a destructive capability is
  selected in zero prohibited cases.
- **SC-006**: One hundred percent of toolset composition cases advertise the expected deterministic
  catalog, and zero cases expose a capability beyond the active write mode.
- **SC-007**: All composed-capability tests remain within documented call, pagination, concurrency,
  and result-size bounds, including partial-failure cases.
- **SC-008**: All mandatory behavioral and contract checks pass on every supported runtime with no
  live credentials, tenant access, model API, or external network dependency; separate dependency and
  container gates access only their configured registries.
- **SC-009**: Automated checks detect 100 percent of sampled operation changes, exposure changes,
  unregistered mappings, toolset drift, and stale documentation before release.
- **SC-010**: Existing tenant-isolation, write-gating, redaction, retry, pagination, transport, and
  error-handling guarantees show zero regressions across the complete quality suite.
- **SC-011**: Every existing public tool has a documented retained, consolidated, deprecated, or
  removed disposition and migration path before the major release is proposed.
- **SC-012**: Every pending automated dependency proposal has a documented disposition, and 100
  percent of included updates pass the complete release checks.
- **SC-013**: The README, coverage report, MCP discovery output, migration guide, and release metadata
  report mutually consistent capability counts, toolsets, compatibility status, and version.

## Assumptions

- `test/openapi-spec.json` remains the authoritative contract and its 84 paths and 104 operations are
  the baseline counts for this feature.
- Full REST contract coverage is an internal quality objective; it does not imply one public MCP tool
  per operation.
- The 3.0 default will be the read-only core catalog; enabling write-capable toolsets does not enable
  mutations unless the write mode is also explicitly raised.
- Optional toolsets are `core`, `operations`, `administration`, `psa`, `reporting`, and
  `compatibility`; their exact capability membership is finalized during planning and remains
  documented as a public contract.
- Existing names that remain good task interfaces stay preferred in core or domain toolsets and are
  also available when compatibility alone is selected. Safely supportable aliases displaced by
  consolidation remain available through the compatibility toolset for the first curated-interface
  major release.
- The default catalog change is intentionally breaking and therefore targets the next major version;
  migration evidence is required even when a legacy alias remains available.
- Agent-specific deferred-loading features may improve large catalogs but are not assumed, because
  the default interface must work consistently across MCP clients.
- Selection quality is evaluated through a deterministic local relevance suite plus recorded client
  smoke scenarios when supported clients are available; release CI does not require paid model API
  access.
- Pending dependency proposals are reviewed against the final release state and are not merged or
  closed automatically.
