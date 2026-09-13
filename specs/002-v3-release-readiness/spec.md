# Feature Specification: Version 3 Release Readiness

**Feature Branch**: `002-v3-release-readiness`

**Created**: 2026-09-13

**Status**: Implementation complete — awaiting merge and maintainer release approval

**Input**: User description: "Define the concrete completion scope that must be satisfied before publishing version 3.0.0, resolving meaningful API gaps without turning the major release into an unbounded roadmap."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trust Every Public Capability (Priority: P1)

As an operator using the version 3 MCP, I need every advertised capability to accurately describe
and preserve the corresponding N-central contract so that an agent does not silently omit inputs,
misrepresent preview behavior, or interpret navigation metadata as business data.

**Why this priority**: A smaller tool catalog is only valuable if every advertised capability is
dependable. Known partial behavior in a public capability would make the first 3.x contract
ambiguous from its release date.

**Independent Test**: Exercise every capability that currently maps to a partially implemented
operation and verify that its accepted inputs, lifecycle disclosure, request behavior, results, and
documented limitations agree with the reviewed contract.

**Acceptance Scenarios**:

1. **Given** a public capability backed by a preview operation, **When** a user discovers or invokes
   it, **Then** the preview lifecycle and any resulting stability limitation are visible before the
   user relies on it.
2. **Given** a public list capability whose operation accepts pagination controls, **When** a user
   supplies valid page values, **Then** those values are honored within the operation's documented
   bounds.
3. **Given** an upstream route that returns navigation links rather than the business records implied
   by a capability, **When** the release candidate is reviewed, **Then** the mapping is corrected or
   removed from public exposure rather than being described as complete.
4. **Given** the final coverage inventory, **When** public capability mappings are inspected, **Then**
   none of their contributing operations remains partially implemented.

---

### User Story 2 - Make an Objective Release Decision (Priority: P1)

As a maintainer, I need one finite definition of version 3 readiness so that publishing is based on
observable evidence rather than the belief that every conceivable future feature must be finished.

**Why this priority**: A major release must be trustworthy without becoming an indefinite project.
Explicit blockers and accepted exclusions make the decision repeatable.

**Independent Test**: Review one release-readiness record that identifies every blocker, accepted
exclusion, required verification result, documentation obligation, and publication precondition,
then independently derive the same ready or not-ready decision.

**Acceptance Scenarios**:

1. **Given** any unresolved required item, **When** release readiness is evaluated, **Then** the
   candidate is reported as not ready and no version 3 release is published.
2. **Given** all required items and checks have passed, **When** readiness is evaluated, **Then** the
   candidate is eligible for maintainer approval and publication.
3. **Given** an operation intentionally outside the version 3 public surface, **When** readiness is
   evaluated, **Then** its approved rationale and safe alternative satisfy the scope without forcing
   an unnecessary endpoint-shaped tool.

---

### User Story 3 - Migrate Deliberately from 2.x (Priority: P2)

As an existing operator, I need the final default catalog, safety defaults, compatibility option,
and migration mappings frozen before release so that I can upgrade without discovering additional
breaking changes after version 3 is published.

**Why this priority**: Version 3 deliberately changes the default interface. The release must make
that change predictable and provide a tested transition for safely supportable 2.x behavior.

**Independent Test**: Start from a representative 2.x configuration, follow only the published
migration guidance, and verify access to the new default experience and the supported compatibility
surface without weakening the documented safety controls.

**Acceptance Scenarios**:

1. **Given** an operator who accepts the new defaults, **When** they upgrade without optional
   configuration, **Then** they receive the twelve-tool read-only core catalog.
2. **Given** an operator who still needs supported 2.x names, **When** they enable compatibility as
   documented, **Then** retained and consolidated names behave according to the migration inventory.
3. **Given** a removed or unsafe 2.x capability, **When** compatibility is enabled, **Then** it remains
   unavailable and the guide identifies the supported alternative.

---

### User Story 4 - Continue Additive Work after 3.0 (Priority: P3)

As a contributor, I need future improvements separated from version 3 blockers so that useful new
capabilities can ship in focused 3.x releases without destabilizing or delaying the foundational
release.

**Why this priority**: A clear post-release boundary prevents unrelated roadmap work from expanding
the major-release review while preserving a path for continued API coverage.

**Independent Test**: Classify proposed follow-up work against the scope rules and verify that an
additive capability, optional integration, or newly justified operation can be scheduled after 3.0
without changing an existing 3.x public contract.

**Acceptance Scenarios**:

1. **Given** a proposed additive capability that preserves existing names, schemas, defaults, and
   safety behavior, **When** it is classified, **Then** it is assigned to a later 3.x feature rather
   than blocking 3.0.
2. **Given** a proposed change that removes or incompatibly changes the frozen 3.x contract, **When**
   it is classified, **Then** it is rejected from a minor release or supplied with a compatible
   design.

### Edge Cases

- The upstream contract is ambiguous or appears inconsistent with observed intent. The operation
  cannot be called fully implemented solely by assumption; the release must retain the limitation,
  remove the public claim, or record reviewable upstream evidence.
- One public capability composes several operations and only one is partial. The entire capability
  remains a release blocker until that contributing operation is resolved or removed from the
  capability contract.
- Resolving a partial operation would require unsafe credential handling or broader permissions.
  Safety takes precedence; the operation is removed from public exposure and receives an explicit
  alternative instead of weakening controls.
- A preview operation later becomes stable, or its shape changes, before publication. The baseline
  and affected evidence must be reviewed again before release.
- The authoritative contract changes after the readiness review. All inventory totals and affected
  dispositions become stale and the readiness decision returns to not ready.
- Version metadata says 3.0.0 but no release tag exists. This is a pre-release candidate, not a
  published release, and may continue to change until final approval.
- Publication succeeds for only some promised artifacts. The release is treated as incomplete and
  must be safely retried or corrected without silently pointing the same version at different code.

## Requirements *(mandatory)*

### Version 3 Scope Boundary

The following seven currently partial public operations are in scope and must receive a final,
contract-accurate disposition before publication:

| Operation | Required version 3 outcome |
|---|---|
| `GET /api/custom-psa/tickets` | Resolve the navigation-link versus ticket-list mismatch; retain a public mapping only if its advertised result is contract-accurate. |
| `GET /api/customers/{customerId}/registration-token` | Disclose preview lifecycle and preserve the operation-specific contract. |
| `GET /api/customers/{customerId}/sites` | Correct the page-size contract and disclose preview lifecycle. |
| `GET /api/devices/{deviceId}/notes` | Support the documented page number and page size behavior wherever the operation is publicly reachable. |
| `GET /api/org-units/{orgUnitId}/user-roles` | Correct the page-size contract and disclose preview lifecycle. |
| `GET /api/org-units/{orgUnitId}/user-roles/{userRoleId}` | Disclose preview lifecycle in public discovery. |
| `GET /api/sites/{siteId}/registration-token` | Disclose preview lifecycle and preserve the operation-specific contract. |

The following twelve operations do not block publication when their listed disposition, rationale,
and alternative have been reviewed and remain accurate:

| Operations | Accepted disposition for version 3 |
|---|---|
| `GET /api`, `GET /api/access-groups`, `GET /api/auth`, `GET /api/custom-psa`, `GET /api/standard-psa` | Exclude navigation indexes because MCP discovery and domain capabilities are the supported alternative. |
| `GET /api/custom-psa/tickets` | Exclude the ticket navigation index because it returns route metadata rather than ticket records; retain known-ID ticket retrieval as the supported alternative. |
| `POST /api/auth/sso` | Exclude pending a separate credential-lifecycle and tenant-isolation security design. |
| `GET /api/scheduled-tasks`, `GET /api/users` | Keep unsupported as global navigation indexes; retain the scoped task and user alternatives. |
| `GET /api/standard-psa/customer-mapping/{customerId}` | Keep unsupported because it is deprecated; retain the canonical customer-mapping alternative. |
| `POST /api/auth/logout` | Keep unsupported until a tenant-safe remote and local session-lifecycle contract is separately approved; closing the MCP session remains the alternative. |
| `POST /api/server-info/extra/authenticated` | Keep unsupported because it is credential-bearing; retain non-secret server status and session validation alternatives. |

The version 3 release scope includes contract closure, safety validation, migration proof,
documentation reconciliation, provenance, and publication readiness. It excludes unrelated additive
domain capabilities, one-tool-per-endpoint expansion, a raw request dispatcher, SSO implementation,
deprecated-route revival, and speculative features not needed to make the frozen 3.x contract
truthful and safe.

### Functional Requirements

- **FR-001**: The project MUST withhold the version 3 release tag and public artifacts until every
  pre-publication requirement and SC-001 through SC-011 are satisfied or explicitly removed through
  maintainer-approved scope revision.
- **FR-002**: The release review MUST use the current authoritative 84-path, 104-operation contract
  as its baseline and MUST restart affected review if that baseline changes before publication.
- **FR-003**: Every baseline operation MUST retain exactly one implementation status and one exposure
  disposition, with totals that reconcile to the detailed inventory.
- **FR-004**: Every operation contributing to a public capability MUST be either fully implemented or
  explicitly removed from that public capability before release; no public mapping may remain
  partially implemented.
- **FR-005**: Each of the seven operations listed as partial in the scope boundary MUST be reviewed
  and resolved through contract completion or removal of its inaccurate public mapping.
- **FR-006**: Public capabilities backed by preview operations MUST disclose that lifecycle and the
  associated stability expectation during capability discovery.
- **FR-007**: Public list capabilities MUST accept and honor the operation-specific pagination
  controls and bounds they advertise, without applying a shared bound that contradicts the
  contributing operation.
- **FR-008**: A capability MUST NOT describe a navigation-link response as a collection of business
  records; ambiguous upstream behavior MUST remain documented rather than silently normalized.
- **FR-009**: Each of the twelve non-implemented operations listed in the scope boundary MUST have a
  maintainer-reviewed disposition, user impact, rationale, and safe alternative where one exists.
- **FR-010**: Version 3 MUST NOT require implementation or public exposure of navigation indexes,
  deprecated operations, or credential-sensitive operations when a safer supported alternative
  satisfies the user goal.
- **FR-011**: The default version 3 catalog MUST remain the following twelve capabilities in
  deterministic order: `get_server_status`, `validate_session`, `get_current_user`,
  `search_organizations`, `get_organization_context`, `search_devices`, `get_device_context`,
  `list_active_issues`, `list_device_scheduled_tasks`, `get_scheduled_task_context`, `run_report`, and
  `list_job_statuses`.
- **FR-012**: The default configuration MUST remain read-only and MUST NOT expose destructive or
  unrestricted request capabilities.
- **FR-013**: Optional toolsets MUST remain explicit, deterministic, and constrained by the active
  write mode; enabling a toolset MUST NOT independently grant mutation authority.
- **FR-014**: The compatibility option MUST preserve every safely supportable 2.x contract and MUST
  continue to exclude behavior that is inaccurate, unsafe, or intentionally removed.
- **FR-015**: All 87 reviewed 2.x public names MUST retain a final migration disposition, including a
  preferred replacement or safe alternative for every consolidated or removed name.
- **FR-016**: Every public capability MUST have repeatable evidence for discovery, accepted and
  rejected inputs, results, errors, contributing operations, lifecycle, safety classification,
  toolset membership, and write-mode behavior as applicable.
- **FR-017**: Risk-sensitive behavior MUST retain repeatable negative evidence for tenant isolation,
  authentication, target validation, secret redaction, retries, timeouts, pagination, concurrency,
  write gating, destructive actions, and audit records as applicable.
- **FR-018**: Supported transports MUST advertise and execute the same selected capability contracts
  except for explicitly documented authentication and session differences.
- **FR-019**: Required verification MUST use synthetic data and MUST NOT depend on a live tenant,
  real credentials, paid model access, or unapproved external services.
- **FR-020**: The contract provenance record MUST identify the document origin and retrieval context,
  its fingerprint, its declared title and version, and the associated product version when known;
  unavailable provenance MUST be stated explicitly with the reason rather than left blank.
- **FR-021**: Public documentation MUST agree on the version, default catalog, optional toolsets,
  write defaults, compatibility behavior, operation counts, accepted exclusions, preview behavior,
  limitations, and migration steps.
- **FR-022**: Public documentation MUST describe supported contract coverage accurately and MUST NOT
  claim that all 104 operations are implemented or publicly exposed.
- **FR-023**: The complete release candidate MUST pass all behavioral, contract, security,
  compatibility, documentation, dependency, supported-platform, container, and packaging checks
  without suppressing failures.
- **FR-024**: The candidate MUST contain no known high-severity dependency finding, committed secret,
  tenant data, or unreviewed credential-handling path.
- **FR-025**: The version identifier, migration guidance, candidate source, published image labels,
  and release record MUST all identify the same immutable version 3.0.0 candidate.
- **FR-026**: Publication MUST produce installable artifacts for every documented processor
  architecture and MUST record an immutable artifact digest that operators can verify.
- **FR-027**: A failed or partial publication MUST be recoverable without silently changing the
  source represented by version 3.0.0.
- **FR-028**: Any change to the frozen default names, public schemas, configuration defaults, safety
  behavior, or migration dispositions before publication MUST repeat all affected review and
  verification.
- **FR-029**: Additive capabilities and implementation of newly justified operations that preserve
  the frozen 3.x contract MUST be tracked as later 3.x features and MUST NOT block version 3.0.0.
- **FR-030**: Work that would remove or incompatibly change a frozen 3.x public contract MUST NOT be
  placed in a later minor release without a compatibility-preserving design.

### Key Entities

- **Release Candidate**: The exact source revision proposed for version 3.0.0, together with its
  version identity, verification results, documentation, migration contract, and publishable
  artifacts.
- **Release Blocker**: An unmet requirement that makes a public claim inaccurate, creates safety or
  compatibility risk, leaves required evidence incomplete, or prevents consistent publication.
- **Operation Disposition**: One operation's implementation status, exposure decision, lifecycle,
  user impact, evidence, rationale, and supported alternative.
- **Public Capability Contract**: The discoverable name, purpose, lifecycle, inputs, results, errors,
  contributing operations, toolset membership, and safety behavior on which an MCP client may rely.
- **Compatibility Mapping**: The final relationship between one 2.x public name and its retained,
  consolidated, deprecated, or removed version 3 behavior.
- **Provenance Record**: Reviewable evidence identifying the authoritative contract document, its
  origin and retrieval context, fingerprint, declared metadata, and associated product version when
  available.
- **Release Evidence Set**: The repeatable results demonstrating contract fidelity, safety,
  compatibility, documentation consistency, supported-platform behavior, and artifact integrity for
  the candidate.
- **Post-3.0 Feature**: Additive work that preserves the frozen 3.x public contract and can therefore
  be planned, reviewed, and released independently after version 3.0.0.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 104 baseline operations have exactly one implementation status and one exposure
  disposition, with zero missing, duplicate, or unreconciled records.
- **SC-002**: Zero operations contributing to public capabilities remain partially implemented at
  release; all seven currently partial operations have an approved final disposition and repeatable
  evidence.
- **SC-003**: All twelve non-implemented operations have an approved rationale, user impact, and safe
  alternative where available, with zero misleading claims of support.
- **SC-004**: Default discovery returns exactly the twelve capabilities named in FR-011 in the stated
  order, with zero write or destructive capabilities when configuration is omitted.
- **SC-005**: One hundred percent of the 87 reviewed 2.x names have a tested migration disposition,
  and an operator can identify the version 3 replacement or reason for removal for every name.
- **SC-006**: One hundred percent of public capabilities pass discovery, input, result, error,
  operation-mapping, lifecycle, safety, toolset, and write-mode checks applicable to their contract.
- **SC-007**: Representative users can select the intended capability among the top three candidates
  in at least 95 percent of approved ordinary cases, with zero prohibited destructive selections.
- **SC-008**: All checks for documented execution environments, connection modes, packaged
  deployment, security, dependencies, and documentation pass for the same candidate, with zero
  suppressed failures and zero known high-severity dependency findings.
- **SC-009**: The authoritative contract provenance fields are 100 percent populated with a value or
  an explicit unavailable-with-reason statement; no provenance field is blank.
- **SC-010**: The default catalog, migration inventory, coverage totals, accepted limitations,
  version, and release instructions agree across all public documentation with zero contradictory
  values.
- **SC-011**: A representative 2.x operator can configure either the new default experience or the
  supported compatibility experience using only the migration guide in under 15 minutes.
- **SC-012**: The publication process produces artifacts for all documented processor architectures,
  records one immutable digest, and associates every artifact with the same version 3.0.0 source
  revision.
- **SC-013**: No version 3.0.0 tag or public release artifact exists before SC-001 through SC-011 have
  passed and a maintainer records final approval.
- **SC-014**: Every deferred item is identifiable as either an additive 3.x feature or a separately
  governed security/compatibility change, leaving zero unclassified roadmap items as implicit 3.0
  blockers.

## Assumptions

- The OpenAPI document currently stored as the authoritative baseline remains at 84 paths and 104
  operations through the version 3 release-readiness work.
- The merged API-contract-parity work is the version 3 foundation, but the existing 3.0.0 metadata
  represents a candidate until a corresponding release tag is deliberately created.
- No version 3.0.0 tag or public release currently exists.
- The twelve-tool read-only core catalog is the approved default contract; this feature closes known
  gaps rather than redesigning that catalog again.
- The twelve listed unsupported operations are acceptable exclusions when their current rationale
  and alternatives survive maintainer review; full endpoint count is not a release goal.
- Preview operations are supportable when their lifecycle and limitations are visible and their
  behavior is otherwise contract-accurate.
- Existing dependency updates and their security remediation are already incorporated; any new
  dependency change discovered before publication is evaluated against the same release gates.
- Mandatory verification remains synthetic and tenant-free. Optional live-system confirmation may
  add evidence but cannot replace deterministic contract and safety checks.
- Additive API coverage and new optional capabilities will use separate Spec Kit features after
  3.0.0 unless they are required to resolve one of the explicit blockers in this specification.
