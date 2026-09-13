# Research: Version 3 Release Readiness

## Decision 1: Define readiness as zero partial public mappings, not universal endpoint support

**Decision**: Version 3 may ship with explicitly reviewed unsupported operations, but no operation
contributing to a public capability may retain a known material contract gap. The current seven
partial records must therefore become fully implemented or lose their inaccurate public mapping.

**Rationale**: The project constitution separates REST coverage from public MCP exposure and rejects
one-tool-per-endpoint expansion. Honest exclusions are safer than nominal completeness, while a
known partial public contract would make the new 3.x compatibility boundary unreliable on day one.

**Alternatives considered**:

- Require all 104 operations to be implemented. Rejected because several are navigation indexes,
  deprecated duplicates, or credential-sensitive flows with safer alternatives.
- Permit documented partial public tools in 3.0. Rejected because these gaps affect discoverable
  inputs, lifecycle expectations, or result meaning and can be closed before release.

## Decision 2: Exclude the Custom PSA ticket root and remove its misleading search/list tools

**Decision**: Reclassify `GET /api/custom-psa/tickets` from partial/direct-tool to
not-implemented/excluded. Remove `search_psa_tickets`; change the legacy `list_custom_psa_tickets`
mapping from consolidated to removed; direct users who know a ticket identifier to `get_psa_ticket`.

**Rationale**: The authoritative response is `LinksResponse` containing a route template. It does not
accept search inputs and does not return a ticket collection. Publishing it as search or list would
misrepresent navigation metadata as business records and add little value beyond MCP discovery.

**Alternatives considered**:

- Rename it to a public link-discovery tool. Rejected because the output duplicates capability
  discovery and is not a meaningful user task.
- Preserve the old list alias while correcting only its description. Rejected because callers would
  still reasonably expect ticket records from its name.
- Infer a list from other PSA endpoints. Rejected because the contract has no reviewed operation for
  enumerating ticket identifiers.

## Decision 3: Disclose preview lifecycle in the ordinary tool description

**Decision**: Every tool whose contributing operations include a preview route will say `PREVIEW`
in its discoverable description. Mixed tools will identify the exact variant that is preview. Add a
contract assertion that derives preview operations from the coverage inventory and checks all mapped
tool descriptions.

**Rationale**: The installed MCP tool contract provides standard annotations for title, read-only,
destructive, idempotent, and open-world hints, but no standard lifecycle field. Description is
portable across clients and is already delivered by tool discovery. It also works for compatibility
aliases because they inherit the preferred definition's description.

**Alternatives considered**:

- Use only custom `_meta`. Rejected as the sole signal because clients may ignore vendor metadata
  and models may never see it.
- Add a new runtime dependency or custom MCP extension. Rejected because no interoperable behavior
  requires it.
- Put preview status only in README documentation. Rejected because users need the warning during
  capability selection.

## Decision 4: Validate pagination explicitly and keep operation-specific policies

**Decision**: Replace silent normalization with explicit validation. `pageNumber` accepts integers
starting at 1. `pageSize` accepts positive integers and accepts `-1` only for operations that
document it. The MCP safety ceiling remains 1,000 records per requested page; values beyond that
ceiling are rejected with an actionable message rather than silently changed. Automatic pagination
retains its existing 20-page and 10,000-record ceilings.

**Rationale**: Silent clamping makes the executed request differ from the user's contract. Explicit
rejection preserves predictable behavior while retaining the project's bounded-call safety rules.
Named policies prevent an operation that allows `-1` from inheriting a positive-only rule, or vice
versa.

**Alternatives considered**:

- Pass every integer accepted by the OpenAPI document. Rejected because unbounded page sizes conflict
  with reliability requirements and upstream deployments may enforce their own undocumented caps.
- Keep silently clamping values. Rejected because it conceals invalid or risky requests.
- Continue one shared schema for every list operation. Rejected because `-1` semantics differ across
  routes.

## Decision 5: Add note pagination as an option of the composed device-context task

**Decision**: Add a bounded `noteOptions` object to `get_device_context` containing `pageNumber`,
`pageSize`, and `all`. Pass it only when notes are selected. Update the `list_device_notes`
compatibility transform to populate this object and update the REST adapter to forward the query.

**Rationale**: This preserves the twelve-tool task-oriented core and gives the existing notes
component its documented pagination behavior without adding another default endpoint-shaped tool.
A nested option keeps the main schema readable and leaves unrelated context components unchanged.

**Alternatives considered**:

- Add `list_device_notes` to core. Rejected because it expands overlap and is unnecessary for the
  user goal.
- Always fetch every note page. Rejected because note histories can be large and complete retrieval
  must be explicit.
- Add generic component options for every composed subrequest. Rejected as premature abstraction;
  only notes have a current release-blocking need.

## Decision 6: Finalize twelve reviewed unsupported operations

**Decision**: Retain the previously reviewed unsupported operations and add the Custom PSA
ticket root after confirming that it is a navigation index rather than a ticket collection. The
final set contains seven excluded navigation/security operations and five unsupported/internal-only
operations. Re-run structural assertions for all twelve rationales, user impacts, and safe
alternatives.

**Rationale**: None of these operations provides unique safe user value that is necessary for 3.0.
Implementing SSO, logout, or credential-bearing server information would broaden security scope;
implementing navigation or deprecated routes would add surface without a distinct agent task.

**Alternatives considered**:

- Add internal adapters for every route to reach 100 percent. Rejected because unused credential and
  deprecated flows create maintenance and security burden without a public outcome.
- Change every unsupported operation to excluded. Rejected because internal-only accurately records
  routes with nearby internal domain ownership that may receive a future contract-accurate adapter.

## Decision 7: Represent provenance availability explicitly

**Decision**: Replace blank provenance output with structured facts that distinguish `known` from
`unavailable`. Each unavailable product version, original retrieval time, or source URL must include
a reason. Record the known repository receipt context and retain the document path, fingerprint,
declared OpenAPI version, contract title/version, path count, and operation count.

**Rationale**: Inventing missing source facts would be worse than acknowledging they were not
captured. A status-plus-reason model makes completeness machine-checkable and prevents an em dash or
null from looking like an accidental omission.

**Alternatives considered**:

- Guess a product version or source URL. Rejected because it would create false provenance.
- Leave nullable fields in the generated report. Rejected because the constitution requires
  reviewable provenance and the release specification prohibits blanks.
- Require a new download before any other work. Rejected because the supplied contract remains
  fingerprinted and usable; a future authoritative replacement would trigger a fresh review.

## Decision 8: Add one machine-readable release-scope record and aggregate check

**Decision**: Add a versioned readiness record validated by the feature's JSON Schema. It fixes the
candidate version, contract fingerprint and counts, seven closure decisions, 12 accepted unsupported
operations, twelve core names, final migration counts, provenance facts, required gate identifiers,
classified deferred items, publication tag, and artifact architectures. A deterministic checker compares it with source,
coverage, tool discovery, migration data, generated documentation, and version metadata. An
aggregate `release:check` command runs this checker plus the existing release gates.

**Rationale**: The current evidence is comprehensive but distributed. One declarative scope record
lets maintainers answer ready/not-ready without copying transient test results into documentation.
Existing specialized tests remain the source of behavioral proof.

**Alternatives considered**:

- Rely only on prose checklists. Rejected because counts and names can drift silently.
- Store pass/fail timestamps in the repository. Rejected because results become stale and should be
  produced by the candidate's verification run.
- Replace all existing scripts with a new release framework. Rejected as unnecessary complexity.

## Decision 9: Keep publication separate from implementation completion

**Decision**: The feature PR may make the candidate objectively ready, but it does not create or push
`v3.0.0`. After merge, a maintainer reviews the readiness output and deliberately creates the tag.
The tag-driven workflow re-runs release gates before publishing the multi-architecture image and
release record. Retry behavior must leave an existing release unchanged and must never repoint the
tag to different source.

**Rationale**: A version already present in package metadata identifies a release candidate; the tag
is the publication event. Keeping them separate provides a final human decision and prevents the
implementation workflow from releasing its own unreviewed commit.

**Alternatives considered**:

- Publish automatically when the feature merges. Rejected because maintainer approval is an explicit
  precondition.
- Lower the package version until release day. Rejected because all merged 3.0 contract work already
  consistently identifies the candidate and version checks depend on it.

## Decision 10: Add no new dependency

**Decision**: Use existing JSON, schema validation, test, documentation-generation, MCP, and release
facilities.

**Rationale**: The work is contract closure and deterministic reconciliation. Current dependencies
already cover every required function, so another package would add audit and lifecycle cost without
user value.

**Alternatives considered**: Introduce a release-management or metadata library. Rejected because
the repository's existing small scripts and workflow are sufficient.

## Decision 11: Reconcile official guides through endpoint contracts and live evidence

**Decision**: Use the checked-in OpenAPI snapshot and N-able endpoint reference as the operation
contract, then use guarded live verification to resolve observable ambiguity. Treat guides, FAQs,
and known-issue pages as important behavioral context, but do not let an inconsistent overview
silently replace an endpoint contract. Record material discrepancies in user-facing quirks and
deterministic tests.

**Rationale**: N-able's task overview describes `GET /api/scheduled-tasks` as a pageable global list,
while the [endpoint reference](https://developer.n-able.com/n-central/reference/taskroot), OpenAPI
schema, and live response identify it as a link root. The
[REST API FAQ](https://developer.n-able.com/n-central/docs/rest-api-faqs) instead documents
device-scoped task discovery and the SYSTEM/CUSTOMER/DEVICE task-ID hierarchy. Likewise, live
Standard PSA mapping, company, contact, and site reads returned `data` arrays although the OpenAPI
responses reference singular PSA models. Preserving the raw envelopes is more accurate than
inventing normalization.

**Alternatives considered**:

- Implement the task overview's global list contract. Rejected because the endpoint-specific and
  live evidence contradict it.
- Normalize live PSA arrays into singular objects. Rejected because it would discard valid records
  and make the MCP response differ from N-central.
- Add `INTEGRATION-KEY` from the PSA guide immediately. Rejected because the OpenAPI/reference do
  not declare that header consistently and the relevant credential-bearing POST was outside the
  read-only live pass; it requires a separate secret-handling and live-write review.

## Decision 12: Send refresh tokens as plain-text request bodies

**Decision**: `POST /api/auth/refresh` sends the refresh token as a `text/plain` body without an
Authorization header, includes configured expiry-override headers, and retains the existing
per-tenant refresh isolation.

**Rationale**: The [refresh endpoint reference](https://developer.n-able.com/n-central/reference/refresh)
and checked-in OpenAPI both require the refresh token in the request body. A guarded live probe and
a forced refresh through `src/auth.js` both returned HTTP 200 with that format. The prior bearer
header implementation was contract-inaccurate and could fail only after a long-running session
reached refresh time.

**Alternatives considered**:

- Keep the refresh token in the Authorization header. Rejected because neither authoritative
  contract source specifies that request.
- Always re-exchange the long-lived JWT instead of refreshing. Rejected because it bypasses the
  documented session lifecycle and needlessly uses the root credential.
