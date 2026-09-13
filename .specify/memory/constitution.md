# N-central REST API MCP Constitution

## Core Principles

### I. API Contract Fidelity
The versioned N-central OpenAPI document under `test/openapi-spec.json` MUST be the baseline for
endpoint coverage and request/response contracts. Every documented operation MUST be classified as
implemented, partially implemented, or not implemented in the coverage documentation and MUST have
an explicit exposure disposition: direct tool, composed capability, resource-backed, internal-only,
or excluded. REST contract coverage MUST NOT be interpreted as a requirement to expose one public
tool per endpoint. Implemented adapter and MCP capabilities MUST preserve the upstream HTTP method,
path, parameters, required request fields, and material response semantics. Intentional deviations,
unsupported upstream behavior, and verified N-central quirks MUST be documented with their evidence.
A changed OpenAPI document MUST trigger a coverage review and corresponding spec, implementation,
documentation, and test updates.

Rationale: users must be able to distinguish reliable MCP coverage from assumptions or stale API
claims.

### II. Secure Tenant Isolation and Least Privilege (NON-NEGOTIABLE)
Credentials, tokens, cached responses, sessions, and requests MUST remain isolated by tenant under
concurrent and retrying workloads. Secrets MUST NOT appear in logs, metrics, errors, fixtures,
specifications, or committed configuration. User-controlled server targets and path parameters MUST
be validated before use. Read-only behavior MUST be the safest supported operating mode; mutations
MUST remain gated by the documented write modes, and destructive or arbitrary-code operations MUST
require `full` mode. Every mutation MUST produce a redacted audit event. Changes to authentication,
tenant context, transport headers, target validation, or write gating MUST include negative and
cross-tenant tests.

Rationale: this server can access many managed customer environments and can execute high-impact
operations, so a single isolation or authorization failure is unacceptable.

### III. Test-First Contract Confidence (NON-NEGOTIABLE)
Every behavior change MUST begin with a failing automated test, contract assertion, or reproducible
regression case before production code changes. Each supported OpenAPI operation MUST have automated
coverage for its HTTP method, path, parameters, payload, result semantics, and exposure disposition
at the adapter or domain layer. Each public MCP capability MUST separately have automated coverage
for registration, input and output schemas, contributing operation mappings, and write-mode
classification. Risk-sensitive behavior MUST additionally cover authentication, validation,
redaction, retries, pagination, concurrency, error propagation, and tenant isolation as applicable.
Tests MUST be deterministic, MUST NOT require live N-central credentials or network access, and MUST
run on every supported Node.js major version. In addition to deterministic tests, every code change
that alters N-central request construction, authentication or session behavior, response handling,
operation composition, or public MCP execution MUST receive a one-off credential-backed verification
against an authorized test server before merge. A maintainer MUST supply a temporary token at
verification time; the token MUST remain outside source control and CI. Live verification MUST be
read-only by default. A mutating scenario MUST use an explicitly approved disposable fixture, and a
destructive scenario MUST receive separate maintainer approval before execution. The retained result
MUST identify the behaviors checked and their pass, fail, or justified not-applicable outcomes without
including credentials or tenant-derived values. A skipped or weakened deterministic test requires an
explicit, time-bounded justification in the governing feature artifacts; live verification required
by this principle cannot be replaced by mocks or contract inspection alone.

Rationale: contract breadth without automated evidence creates a deceptively complete but unsafe MCP
surface.

### IV. MCP Interface Quality and Compatibility
Tools, resources, and prompts MUST expose clear names, descriptions, schemas, safety annotations,
and actionable errors suitable for agent use. The default public surface MUST be curated around
distinct user goals, minimize semantic overlap and definition overhead, and keep destructive actions
individually identifiable. Broader capabilities MUST be grouped into documented, opt-in toolsets with
deterministic membership and least-privilege defaults. Every retained or added tool MUST have a
distinct purpose and evidence that representative users can select it and supply valid arguments.
Stdio and Streamable HTTP transports MUST provide equivalent MCP behavior except where
transport-specific credentials or session semantics are explicitly documented. Existing public
names and input/output contracts MUST remain compatible within a major release. Removing or
consolidating public tools MUST be treated as breaking unless a compatibility layer preserves the
prior contract. Breaking changes MUST be identified in the feature specification, include a
migration path, and receive a major version bump. Additive capabilities and fixes MUST follow
Semantic Versioning.

Rationale: agents and client configurations depend on a predictable, discoverable interface across
releases and transports.

### V. Reliability, Observability, and Simplicity
External calls MUST use explicit timeouts, bounded pagination and concurrency, and retries limited to
failures that are safe to replay. Runtime behavior MUST remain observable through structured,
redacted audit logs plus documented health and metrics endpoints. Error handling MUST retain enough
upstream context to diagnose failures without exposing secrets. Implementations MUST prefer the
smallest design that satisfies the approved specification; new abstractions, dependencies, caches,
or background state require a concrete need and tests for their lifecycle and failure behavior.

Rationale: predictable failure modes and modest designs are easier to operate safely against varied
N-central installations.

## Engineering and Security Standards

- Production code MUST remain compatible with the Node.js versions declared in `package.json` and
  tested by CI, use ECMAScript modules, and avoid runtime transpilation.
- `package-lock.json` MUST remain synchronized with `package.json`; dependency changes MUST be
  reviewed for behavioral, licensing, and security impact rather than merged solely because they are
  automated.
- The OpenAPI reference MUST be valid JSON, retain its source version/provenance in adjacent
  documentation, and never contain real tenant data or credentials.
- `npm test`, `npm run lint`, and `npm run type-check` MUST pass before merge. CI MUST test every
  supported Node.js major version. Any temporary exception requires an issue, owner, and removal
  condition documented in the feature plan.
- Public behavior, configuration, tool counts, write classifications, and known API quirks MUST be
  updated in the same change that alters them.
- Automated test fixtures MUST use synthetic hosts, identifiers, and credentials. Required one-off
  live verification for N-central-facing code changes MUST use a maintainer-provided temporary token,
  remain isolated from CI, avoid persistent tenant-derived fixtures, and record only redacted
  structural outcomes. Documentation-only, specification-only, test-only, and internal refactors that
  cannot change upstream or public MCP execution do not require a live token.

## Delivery Workflow and Quality Gates

1. Establish or amend this constitution before approving work that changes its governing rules.
2. For each cohesive release objective, create a Spec Kit specification describing user outcomes,
   scope, acceptance scenarios, and measurable success criteria. Resolve material ambiguity before
   planning.
3. Create and review the plan and dependency-ordered tasks before implementation. Requirements,
   OpenAPI operations, implementation tasks, and tests MUST remain traceable to one another.
4. Implement in test-first increments. Run Spec Kit analysis before implementation and convergence
   after implementation until no required work remains.
5. For every N-central-facing behavior change, obtain a temporary test token from a maintainer after
   deterministic checks pass, perform the required one-off live verification, and retain a redacted
   summary. The pull request MUST NOT merge until this gate passes or every unexecuted scenario is
   outside the change's applicable behavior.
6. Update the API coverage report whenever the OpenAPI source or endpoint implementation changes.
   The report MUST be reproducible from repository evidence and MUST distinguish full, partial, and
   absent behavior.
7. Review open automated dependency updates before a planned release. Compatible, verified updates
   MAY be consolidated into the release pull request; unrelated, breaking, or unverified updates MUST
   remain separate. The release version changes only after feature, documentation, dependency, and
   test gates pass.
8. A pull request is merge-ready only when its Spec Kit artifacts agree, required coverage is
   implemented, documentation is current, all mandatory checks pass, applicable one-off live
   verification is recorded, and security-sensitive changes have explicit reviewer attention.

## Governance

This constitution governs all specifications, plans, tasks, implementation changes, reviews, and
releases in this repository. If another project document conflicts with it, this constitution takes
precedence.

Amendments MUST be proposed as an explicit documentation change with rationale, impact analysis,
and any required migration work. Approval requires maintainer review. Constitution versions follow
Semantic Versioning: MAJOR for incompatible governance changes or removed principles, MINOR for new
principles or materially expanded obligations, and PATCH for non-semantic clarification. The
ratification date remains fixed; the last-amended date changes whenever governance meaning changes.

Every feature plan MUST include a constitution check before implementation. Every pull-request
review MUST verify applicable principles and quality gates. Exceptions MUST be documented in the
relevant specification or plan with an owner, risk statement, expiration condition, and follow-up
task; security isolation and secret-handling requirements cannot be waived.

**Version**: 1.2.0 | **Ratified**: 2026-09-12 | **Last Amended**: 2026-09-13
