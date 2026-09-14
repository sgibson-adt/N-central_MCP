# Live MCP UX, Accuracy, and Efficiency Evaluation

Status: four remediation tranches and 15 REST-skill migrations verified live; all 104 tools safely covered; 63 of 68 read tools succeeded live; live mutations not executed
Date: 2026-09-13
Client: Codex IDE session using `N-central-REST-MCP` over Streamable HTTP
Server: local `3.0.0` candidate; tested first as core/read-only, then as all+compatibility/full

## Purpose

Evaluate the live MCP as a user would experience it, with emphasis on:

- correct tool discovery and selection;
- accurate, internally consistent results;
- useful error handling and validation;
- latency and response-size efficiency;
- token-efficient output that retains enough context to answer user questions;
- safe, bounded, read-only behavior.

No tenant names, usernames, email addresses, device names, or raw response bodies are retained in this report.

## Method

- Invoke the MCP tools through the Codex MCP client, not by importing handlers directly.
- Exercise success, empty-result, invalid-input, pagination, composition, and partial-failure paths.
- Cross-check identifiers and fields between search/list results and detail/context tools.
- Record wall-clock latency measured around the client call.
- Record serialized MCP result bytes and estimate tokens as `ceil(bytes / 4)`. This is a directional estimate, not tokenizer billing data.
- Distinguish useful payload bytes from duplicated text and `structuredContent` representations.
- Keep successful live workflows read-only. Mutation tools receive incomplete-input schema probes
  only; their handlers must not execute, and separate read-only discovery must hide them.

## Environment and discovery

| Check | Result |
|---|---|
| Streamable HTTP initialization | Pass |
| MCP protocol negotiated | `2025-03-26` |
| Server identity | `ncentral-api` `3.0.0` |
| Baseline tools discovered | 12 |
| Baseline tool annotations | All discovered core tools advertise read-only/non-destructive |
| Capabilities | Tools, resources, and prompts advertised |
| Baseline effective toolsets | `core` (`NC_TOOLSETS` was unset) |
| Baseline effective write mode | `read-only` (`.env` initially set it) |
| Tool catalog size | 19,002 bytes, about 4,751 estimated tokens |
| Resources / templates / prompts | 2 / 3 / 4 discovered |

After the baseline, the server was restarted with `NC_TOOLSETS=all,compatibility` and
`NC_WRITE_MODE=full`. The live server registered 104 de-duplicated tools: 68 read-only, 27
write-capable, and 9 destructive. The skill evaluation harness enforced `readOnlyHint=true`, so
none of the 36 write-capable/destructive tools were invoked. After strict root input validation was
enabled and the final pagination/projection/error inputs were added, the expanded catalog serialized
to 165,157 bytes (about 41,290 estimated tokens), 8.7 times the core-only catalog.

The HTTP transport is bound to localhost but currently permits unauthenticated MCP clients. This
is acceptable for an isolated local evaluation; set `MCP_API_KEY` before exposing or forwarding
the port beyond the local host.

`NC_TOOLSETS` and `NC_WRITE_MODE` are independent. Setting write mode to `full` does not add
`operations`, `administration`, `psa`, `reporting`, or `compatibility`; it only permits tools from
already selected toolsets whose write scopes require that authority.

## Preliminary measurements (before remediation)

| Tool / case | Result | Latency | Serialized bytes | Est. tokens | Notes |
|---|---:|---:|---:|---:|---|
| `get_server_status` with time | Pass | 154 ms | 935 | 234 | Three upstream operations; complete metadata |
| `validate_session` | Pass | 100 ms | 325 | 82 | Small, useful response |
| `get_current_user` | Pass | 116 ms | 1,750 | 438 | Returns a broad user profile; data minimization review recommended |
| `run_report` device filters, two rows | Pass | 135 ms | 1,309 | 328 | Pagination envelope retained |
| `get_organization_context`, details only | Pass | 120 ms | 1,395 | 349 | Appropriate for a focused lookup |
| `get_organization_context`, all components | Pass | 371 ms | 43,923 | 10,981 | 30 children plus limits and custom properties; expensive result |
| `search_organizations`, exact known name | Pass | 497 ms | 1,534 | 384 | Returned exactly one matching record |
| `search_devices`, scoped contains search | Pass | 109 ms | 16,818 | 4,205 | Nine records; full device objects are verbose |
| `get_device_context`, details only | Pass | 95 ms | 2,175 | 544 | Focused lookup |
| `get_device_context`, monitoring + lifecycle | Pass | 216 ms | 4,265 | 1,067 | Three upstream operations |
| `get_device_context`, all components | Pass | 210 ms | 9,533 | 2,384 | Eight upstream operations; five-note page bound |
| `list_active_issues`, five rows | Pass | 144 ms | 20,214 | 5,054 | Customer scope; five full issue records |
| `list_active_issues`, default 50 rows | Pass | 322 ms | 193,848 | 48,462 | Very large default response |
| `list_active_issues`, `all=true`, 141 rows | Pass | 545 ms | 526,694 | 131,674 | Complete but impractical for model context |
| `list_device_scheduled_tasks`, 48 rows | Pass | 217 ms | 12,103 | 3,026 | Non-empty device fixture |
| `get_scheduled_task_context`, details | Pass | 142 ms | 1,145 | 287 | Task ID matched device-task result |
| `get_scheduled_task_context`, aggregate status | Pass | 175 ms | 1,621 | 406 | Two upstream operations |
| `get_scheduled_task_context`, detailed status | Pass | 270 ms | 14,529 | 3,633 | Per-device status is substantially larger |
| `list_job_statuses`, 515 rows | Pass | 4,287 ms | 444,518 | 111,130 | No pagination/filter input; critical context cost |
| `run_report`, device filters CSV/two rows | Pass | 56 ms | 457 | 115 | Compact and useful |

## Remediation pass 1

The first implementation pass addressed LIVE-001, LIVE-002, and LIVE-015. The rebuilt live server
was tested over the same Streamable HTTP boundary rather than only through unit-level handlers.

| Change | Live verification |
|---|---|
| Optional `nameMatch` no longer receives a schema default | Bounded unfiltered `search_organizations` and `search_devices` calls passed |
| Successful text content is now a compact summary | Zero duplicated successes across the 39-call full skill pass |
| MCP registration retains the strict root Zod object | Unknown `unexpected` and `format` fields returned input-validation errors |
| Full catalog safety regression | 104/104 tools covered: 61 read successes, 7 read error paths, 36 mutation schema rejections, 0 skipped |

Across all 68 read outcomes in the all-tool pass, serialized output fell from 807,650 bytes before
the change to 327,889 bytes after it, a 59.4% reduction (about 201,942 to 81,973 estimated tokens).
The 61 successful post-fix results accounted for 327,060 of those bytes. The structured payload
remains canonical and complete; the savings come from removing its duplicate pretty-printed text
representation.

Representative before/after measurements using the same live fixture paths:

| Workflow | Before | After | Reduction |
|---|---:|---:|---:|
| Active issues, five rows | 20,214 bytes | 8,139 bytes | 59.7% |
| Organization hierarchy | 40,294 bytes | 14,482 bytes | 64.1% |
| All users by Service Org, 154 rows | 175,412 bytes | 68,482 bytes | 61.0% |
| Bulk custom properties, 15 rows | 163,542 bytes | 59,073 bytes | 63.9% |
| Bulk assets, six rows | 655,725 bytes | 226,062 bytes | 65.5% |

The remaining structured payloads were still too large for routine model context. That result
motivated the bounded pagination and projection work in the next pass.

## Remediation pass 2

The second implementation pass added bounded, compact defaults while retaining explicit full-detail
paths:

- `list_active_issues` defaults to a 10-row page and removes `_extra` in compact mode.
- `list_job_statuses` locally filters the upstream collection by status, device, job, or timestamp;
  returns 25 rows by default; caps pages at 100 rows; and removes `_extra` in compact mode.
- `report_devices_bulk` processes one 25-device page by default, uses five devices as the safer
  default for full detail, associates compact results with device identity, and requires `all=true`
  for complete-inventory fan-out.
- Compact monitoring reports provide service/status counts and at most 25 attention services per
  device. Compact custom-property reports accept up to 20 exact property names.
- Text summaries now include page position and the next `pageNumber` when another page exists.

Live compact/full comparisons used identical fixture pages and did not print tenant values:

| Workflow | Compact | Full | Compact reduction |
|---|---:|---:|---:|
| Active issues, five rows | 1,620 bytes / 405 tokens | 7,914 bytes / 1,979 tokens | 79.5% |
| Job statuses, 25 of 511 rows | 7,469 bytes / 1,868 tokens | 9,100 bytes / 2,275 tokens | 17.9% |
| Bulk assets, five devices | 2,389 bytes / 598 tokens | 163,692 bytes / 40,923 tokens | 98.5% |
| Bulk monitoring, five devices | 7,122 bytes / 1,781 tokens | 33,846 bytes / 8,462 tokens | 79.0% |
| Bulk custom properties, five devices | 18,377 bytes / 4,595 tokens | 21,046 bytes / 5,262 tokens | 12.7% |

Filtering the five-device custom-property result by one dynamically discovered property name reduced
it from 18,377 to 1,505 bytes (91.8%) and returned four matching properties. The 511-record job
source still required about 3.5 seconds upstream because that REST endpoint has no pagination, but
its default MCP response is now 7.5 KB instead of returning the complete collection. Compared with
the original 515-row/444,518-byte measurement, the default response is about 98.3% smaller.
The live active-issue call with no page arguments returned the intended 10-row page in 2,894 bytes.

The complete 104-tool safety regression remained clean after this pass. Aggregate output across all
68 live read outcomes fell again, from 327,889 to 261,911 bytes (20.1%), and is now 67.6% below the
original 807,650-byte baseline. The additional input controls increased the expanded discovery
catalog by 2,311 bytes (about 578 estimated tokens, 1.5%) relative to pass 1; narrow production
toolsets avoid most of that fixed compatibility-catalog cost.

Repeated warm-call observations:

| Tool | Runs | Success | p50 | p95 | Stable bytes |
|---|---:|---:|---:|---:|---:|
| `get_server_status` basic | 10 | 10 | 40 ms | 118 ms | 629 |
| `validate_session` | 10 | 10 | 31 ms | 36 ms | 325 |

## Remediation pass 3 and skill migration

The third pass made compact asset results useful enough for the actual inventory skill, bounded the
remaining high-cardinality access report, and migrated all 15 downloaded REST skills to preferred
v3 tool names, strict schemas, and structured result paths.

- Compact assets now retain manufacturer, model, serial, memory, CPU, OS, physical-drive, and
  logical-volume fields. Installed software is excluded unless `includeSoftware=true`.
- `report_all_users_by_service_org` now defaults to 25 compact audit-focused users with local page
  metadata; `all=true` and `detailLevel=full` are explicit escape hatches.
- Every migrated skill declares the minimum preferred toolsets and required write mode, removes
  unsupported `format` arguments, follows paged envelopes, and uses nested mutation bodies.
- PSA, scheduled-task, patch-report, note-author, maintenance-window, and lifecycle capability
  boundaries are now stated accurately instead of relying on similarly named compatibility tools.
- The live skill evaluator validates representative read and mutation examples against advertised
  JSON Schemas without invoking mutation handlers.

Live measurements after rebuilding:

| Workflow | Result | Serialized bytes | Est. tokens | Notes |
|---|---:|---:|---:|---|
| Access review, default page | 25 of 154 users | 8,030 | 2,008 | Was 68,482 bytes for the unpaged result; 88.3% lower |
| Asset inventory, five devices | Pass | 4,630 | 1,158 | Hardware-complete compact projection |
| Software inventory, five devices | Pass | 13,107 | 3,277 | Same projection with `includeSoftware=true` |
| Custom-property audit, five devices / one property name | Pass | 1,206 | 302 | Focused property selection |
| Device discovery, nine devices | Pass | 3,915 | 979 | Full was 6,886 bytes; compact is 43.1% lower |
| Current-user identity | Pass | 597 | 150 | Full was 858 bytes; compact is 30.4% lower |

The migrated-skill run completed 24 live read successes, seven intentional legacy-schema rejection
probes, one allowed not-configured PSA error, and zero unexpected errors. All 18 representative
skill contracts validated against the live catalog, including nine write-schema examples that
were validated only and never executed. A complete follow-up mapping also validated all 37 fenced
JSON examples across the 15 skill files against their advertised live tool schemas: 37 passed,
zero failed.

## Remediation pass 4

The final safe pass bounded organization composition, made upstream failures actionable, removed
known PSA retry stalls, completed metric regressions, and made the all-tool harness respect the
server's HTTP request guard.

- `get_organization_context` now defaults child and custom-property components to 25-row pages and
  compact projections. `childrenOptions`, `propertyOptions`, and `detailLevel:"full"` are explicit
  escape hatches; compatibility detail aliases preserve their full-record behavior.
- API failures now carry sanitized categories such as `invalid_request`, `not_found`,
  `authentication_failed`, `rate_limited`, `timeout`, `invalid_response`, and
  `upstream_unavailable`, plus HTTP status metadata where available. Partial composed results retain
  the category as their component error code.
- `list_psa_companies` performs one upstream attempt and maps the tenant's ambiguous 500 to an empty
  `integrationStatus:"unavailable"` result. PSA detail reads avoid transient 5xx retry loops, and
  any request receives at most one replay after re-authentication.
- The all-tool evaluator defaults to 550 ms between HTTP calls so a comprehensive pass does not
  overwhelm the local 120-request/minute guard. It now reports aggregate read-result bytes directly.
- Runtime regressions force both partial and oversized/truncated results and verify their Prometheus
  counters. This covers the event-driven series without deliberately pulling an unsafe live export.

Final live measurements:

| Workflow | Before | Final | Change |
|---|---:|---:|---:|
| Organization context, all components | 43,923 bytes | 3,355 bytes compact | 92.4% lower |
| Same bounded organization fixture | n/a | 3,355 compact / 3,710 full | Explicit detail tradeoff |
| Standard PSA company discovery | 18.6 s generic 500 | 0.35–0.43 s, 396-byte structured status | Stall and ambiguity removed |
| Custom PSA placeholder lookup | 14.5 s generic 500 | 43 ms categorized error | 99.7% lower latency |
| PSA contact/site placeholder lookups | 6.7 s repeated-auth failures | about 0.33 s categorized errors | 95% lower latency |
| All 68 read outcomes | 807,650 bytes | 201,671 bytes / about 50,442 tokens | 75.0% lower |

The final skill-oriented pass recorded 27 successful safe reads, seven expected legacy-schema
rejections, zero allowed or unexpected errors, and 18/18 representative schema validations. The
final all-tool pass recorded 63 live read successes, five fixture-dependent live error paths, 36
mutation schema rejections, and zero skips. No mutation handler executed.

## Findings

### LIVE-001 — Unfiltered search/list calls failed because `nameMatch` was defaulted

- Severity: high
- Area: usability, correctness
- Affected tools: `search_organizations`, `search_devices`
- Status: resolved and verified through the rebuilt live MCP

Reproduction:

```json
{"organizationType":"customer","pageNumber":1,"pageSize":2}
```

or:

```json
{"pageNumber":1,"pageSize":2}
```

Original result:

```text
Error: nameMatch requires name
```

Expected: a bounded page of organizations or devices. The advertised descriptions explicitly
support filtering and pagination without requiring `name`.

Root cause: the input schema declared `nameMatch` with `default: "contains"`. The MCP SDK
materialized that default even when the client omitted it, then `fetchOrSearchByName()` treated the
resulting `nameMatch` as an explicitly supplied argument and rejected it because `name` was absent.

Implemented fix: removed the JSON Schema default from `nameMatch` and retained the handler-level
fallback only when `name` is present. Contract and real MCP-boundary regressions now invoke both
tools without `name`. After rebuilding, bounded unfiltered organization and device searches both
passed live; the compatibility `list_devices_by_org_unit {all:true}` path also passed.

### LIVE-002 — Successful results duplicated the payload in text and structured content

- Severity: high
- Area: token efficiency
- Status: resolved and verified through the rebuilt live MCP

The original result builder emitted the same data twice: pretty-printed JSON in `content[0].text`
and again in `structuredContent.data`. Examples:

| Case | Text bytes | Structured bytes | Total serialized bytes |
|---|---:|---:|---:|
| Server status | 366 | 456 | 935 |
| Current user | 817 | 744 | 1,750 |
| Device filters (two rows) | 592 | 578 | 1,309 |
| Organization details | 617 | 613 | 1,395 |
| Full organization context | 23,671 | 16,384 | 43,923 |

For the original sampled calls, `content[0].text` exactly equaled a pretty-printed serialization
of `structuredContent.data`. This substantially increased context consumption, especially for
composed tools.

Implemented fix: retained `structuredContent` as the canonical machine-readable payload and
replaced the text copy with a compact summary containing shape/count, partial, and truncation
information without copying tenant values. Contract tests cover arrays, paged data, text, partial
results, truncation, and non-disclosure. No successful call in the 39-call live skill pass duplicated
structured data. Across all read outcomes in the all-tool pass, this reduced serialized output by
59.4%.

### LIVE-003 — Broad composed context is costly by default when all components are requested

- Severity: medium
- Area: token efficiency, user experience
- Affected tool: `get_organization_context`
- Status: resolved and verified through the rebuilt live MCP

The full context request returned about 43.9 KB / 11.0K estimated tokens for 30 child organizations plus limits and custom properties. The focused details-only call was about 1.4 KB / 349 estimated tokens.

Implemented fix: child and custom-property components now default to page 1 with 25 rows and use
task-focused compact projections. Callers can page each component independently or explicitly use
`all:true`; `detailLevel:"full"` restores upstream records. The comparable broad live call measured
3,355 bytes (about 839 tokens), 92.4% below the original 43,923-byte result. On the same bounded
fixture, full detail measured 3,710 bytes.

### LIVE-004 — Device search returned full records for discovery workflows

- Severity: medium
- Area: token efficiency
- Affected tool: `search_devices`
- Status: resolved and verified through the rebuilt live MCP

A scoped contains search returning nine devices consumed about 16.8 KB / 4.2K estimated tokens. Discovery usually needs only an identifier, display name, organization, class, OS label, and status; the remaining fields can be obtained from `get_device_context` after selection.

Implemented fix: `search_devices` now returns an identity/status/organization discovery projection
by default and accepts `detailLevel:"full"` for complete upstream records. Compatibility aliases
explicitly retain their full-record default. A matched nine-device page measured 3,915 bytes compact
versus 6,886 bytes full, a 43.1% reduction.

### LIVE-005 — Unbounded job-status output can consume an entire model context

- Severity: critical
- Area: token efficiency, reliability
- Affected tool: `list_job_statuses`
- Status: MCP response bounded and verified; unpaged upstream latency remains

Originally the tool accepted only `orgUnitId`; it offered no `pageNumber`, `pageSize`, status filter,
time window, or compact projection. An SO-level call returned 515 full records in 4.287 seconds and
serialized to 444,518 bytes (about 111K estimated tokens). A customer-level call returned 214
records and about 46K estimated tokens. Neither result was marked truncated because the 256 KiB
limit applied to the structured payload. LIVE-002 has since removed the duplicate text, but a
post-LIVE-002 213-row fixture still required 73,597 bytes (about 18,400 estimated tokens).

Implemented fix: the MCP now applies local pagination capped at 100 rows, defaults to 25 compact
rows, and supports exact status/device/job filters plus an ISO timestamp lower bound. It returns
stable page metadata and next-page guidance; `detailLevel=full` remains available. With 511 source
records, the default live response was 7,469 bytes (about 1,868 tokens), approximately 98.3% below
the original comparable result. The REST endpoint still sends the full source collection, so live
latency remained about 3.5 seconds; response/context cost is fixed, but upstream efficiency cannot
be resolved without API support or caching.

### LIVE-006 — The default active-issue page is too expensive for routine triage

- Severity: high
- Area: token efficiency
- Affected tool: `list_active_issues`
- Status: resolved for the default path and verified live

The default 50-row response serialized to 193,848 bytes (about 48K estimated tokens). An
`all=true` call returned 141 records and serialized to 526,694 bytes (about 132K estimated tokens)
without being marked truncated. Explicitly requesting five rows reduced it to 20,214 bytes, which
is still about 1,011 estimated tokens per issue. The active-issues skill does not currently request
a small page.

Implemented fix: the MCP-facing default is now 10 rows, compact mode removes the verbose `_extra`
object while preserving identifiers, service information, notification state, device name/class,
and transition time, and stable page metadata guides follow-up calls. `detailLevel=full` explicitly
restores complete records. The same five-row live fixture measured 1,620 bytes compact versus 7,914
bytes full, an additional 79.5% reduction after LIVE-002.

### LIVE-007 — Invalid upstream identifiers produce safe but low-actionability errors

- Severity: medium
- Area: accuracy, troubleshooting UX
- Status: resolved for transport classification; endpoint-specific constraints documented

Errors correctly redact identifiers and do not leak response bodies, but all tested invalid IDs
collapse to messages such as `API error 400 on GET /api/devices/{id}`. The user cannot distinguish
not-found, malformed ID, unsupported org tier, permission failure, or upstream validation detail.
The same generic 400 appeared when a valid Service Org ID was passed to `list_active_issues`, which
only supports customer/site IDs.

Implemented fix: the API client now emits safe typed categories with HTTP status metadata and never
retains upstream response bodies. Composed partial results preserve those categories as error codes.
The active-issues tool description explicitly says that only customer/site scope is supported.
Contract coverage verifies the common HTTP categories, timeouts, malformed/wrapped responses, and
non-disclosure. Final live failures distinguish `not_found`, `authentication_failed`, and
`upstream_unavailable` rather than collapsing into one generic message.

### LIVE-008 — Bundled prompts lacked bounded paging guidance

- Severity: high
- Area: prompt correctness, end-to-end UX
- Status: resolved at the server boundary; downstream narrative quality remains host-model behavior

Each advertised prompt instructs the client to call `search_organizations` or `search_devices` with
`all=true` and no `name`. Before remediation, those calls failed with `nameMatch requires name`
(LIVE-001):

- `full-customer-report`;
- `device-health-audit`;
- `agent-deployment-status`;
- `custom-property-audit`.

LIVE-001 restored enumeration. The prompts now request explicit bounded page sizes and compact
device/issue detail instead of broad `all=true` search calls. A contract regression rejects the old
unbounded search wording and verifies the health prompt's compact issue page. Customer/property
prompts explicitly request all property pages while retaining compact projection. All four prompts
were discovered and rendered through MCP; their referenced tools exist and their prescribed input
shapes have live/contract coverage. The final narrative is generated by the client model rather
than this MCP server, so it is not a server implementation gate.

### LIVE-009 — Efficiency observability stopped at success/failure counters

- Severity: medium
- Area: operability, performance regression detection
- Status: resolved and verified through the rebuilt live MCP

Metrics expose per-tool success/failure counts and active sessions, but no latency histogram,
response byte count, record count, truncation count, pagination count, or upstream-call count. These
are the measurements needed to track the efficiency goal over time.

Implemented fix: `/metrics` now adds cumulative per-tool duration and serialized-response bytes,
upstream-operation counts, and partial/truncated result counters. Labels are limited to tool name
and success state; tenant, organization, device, user, and request identifiers are excluded. The
duration, byte, and upstream-operation series appeared after live calls; partial/truncated series
are event-driven and have contract coverage for their emission paths.

### LIVE-010 — `NC_TOOLSETS` was missing from both environment templates

- Severity: medium
- Area: configuration UX
- Status: resolved in the working tree and verified in the live configuration

The runtime reads `process.env.NC_TOOLSETS`, and README/setup/toolset documentation describes it,
but neither `.env` nor `.env.example` contains the setting or its allowed values. Operators can set
`NC_WRITE_MODE=full` and reasonably assume the full catalog is active while still receiving only
the default 12-tool `core` catalog.

Recommended fix: add a commented `NC_TOOLSETS=core` block to `.env.example` immediately before the
write-mode block, list all allowed values, and state explicitly that toolset selection controls
visibility while write mode controls authority. This is now implemented; the local `.env` uses
`NC_TOOLSETS=all,compatibility` for the expanded evaluation.

### LIVE-011 — `get_current_user` returns more personal profile data than core identity needs

- Severity: low
- Area: data minimization, token efficiency
- Status: resolved and verified through the rebuilt live MCP

The core identity tool returns contact and postal-profile fields in addition to identity and
authorization context. Most health/preflight workflows need only user/customer identifiers,
username/display name, enabled/locked state, API-only status, and relevant authorization flags.

Implemented fix: the default projection retains identity, enabled/locked/password/2FA, LDAP,
provisioning, and authorization-context fields while omitting contact and postal profile data.
`detailLevel:"full"` explicitly restores the upstream profile. The live compact result was 597
bytes versus 858 bytes full, a 30.4% reduction.

### LIVE-012 — Partial component failures are represented cleanly

- Severity: positive observation
- Area: correctness, resilience
- Status: verified with a probe device whose asset endpoint returned 404

`get_device_context` returned the valid details and monitoring components, omitted only the failed
asset component, set `meta.partial=true`, and recorded a sanitized component-specific error. This is
useful behavior and should be retained as output compaction changes are made.

### LIVE-013 — There was no concise selector for all preferred v3 toolsets

- Severity: medium
- Area: configuration UX
- Status: resolved and verified against the restarted live server

Operators must currently spell out:

```dotenv
NC_TOOLSETS=core,operations,administration,psa,reporting
```

Implemented fix: support `NC_TOOLSETS=all` as an alias for those five preferred v3 catalogs. Do
not include `compatibility` in `all`, because doing so would advertise legacy aliases alongside
their preferred replacements and substantially increase discovery-token cost. Operators who need
legacy names should opt in explicitly with `NC_TOOLSETS=all,compatibility`.

Parser tests cover `all`, case/whitespace normalization, de-duplication, and `all,compatibility`.
The expansion is documented in `.env.example`, README, setup guide, and generated toolset
documentation. The live startup log expanded `all,compatibility` to
`core,operations,administration,psa,reporting,compatibility` and registered 104 tools.

### LIVE-014 — The expanded compatibility catalog has a high fixed discovery cost

- Severity: high
- Area: token efficiency, tool selection
- Status: measured through live `tools/list`

The 12-tool core catalog serialized to 19,002 bytes (about 4,751 estimated tokens). Enabling all
preferred toolsets plus compatibility produced 104 tools and, after the final strict schemas,
165,157 bytes (about 41,290 tokens), an 8.7-times increase before any tool is called. The
compatibility aliases also advertise old and
new names together, increasing selection ambiguity.

Recommended fix: keep `all` limited to the five preferred v3 toolsets, as implemented, and require
an explicit `compatibility` opt-in. For routine agents, document narrower task profiles such as
`core,reporting` or `core,administration`. Consider server/client support for deferred tool
discovery if the target MCP clients support it.

### LIVE-015 — Unknown top-level arguments were silently discarded

- Severity: high
- Area: correctness, validation UX
- Status: resolved and verified through the rebuilt live MCP boundary

All advertised input objects declared `additionalProperties:false`, but the MCP registration layer
passed only a Zod property shape to `registerTool`. The strictness of the root object was therefore
lost. A no-argument `validate_session` call with an unexpected field succeeded, as did list/report
calls with unsupported `format` fields.

This was particularly harmful to the downloaded skills: `report_org_hierarchy {"format":"csv"}`
succeeded but returned the normal JSON structure (40,294 bytes / about 10,074 tokens). The client
received no warning that its requested presentation was ignored.

Implemented fix: the registration layer now passes the complete strict root Zod object to the MCP
SDK rather than only its property shape. A real in-memory MCP-boundary test verifies unknown-field
rejection, normal success output, and sensitive-write error/audit handling. Live calls containing
`unexpected` or unsupported `format` fields now return actionable input-validation errors. The 15
REST skills have since been migrated to omit unsupported presentation fields.

### LIVE-016 — Compatibility aliases preserved names more often than behavior

- Severity: critical
- Area: skill compatibility, correctness
- Status: resolved in the 15 downloaded REST skills and verified against the live schemas

The 15 REST skills reference 74 unique tool names; 72 are present in the expanded catalog. The two
missing names are `list_custom_psa_tickets` and `get_server_info_authenticated`. Despite 97% name
coverage, no skill is compatible unchanged because multiple aliases use replacement schemas or
composed return shapes:

- `list_scheduled_tasks` now requires `deviceId`; the documented global `{all:true}` call fails.
- `list_all_users` requires `orgUnitId`; the documented whole-environment `{all:true}` fallback fails.
- `list_devices` and `list_devices_by_org_unit` enumeration now works after LIVE-001, but still
  returns legacy-incompatible composed/full shapes in downstream detail workflows.
- `get_device_status`, `get_device_assets`, and `get_device_lifecycle` return
  `{details, <component>}` rather than the direct legacy payload the skills parse.
- `list_device_notes` returns `{details, notes}` rather than a direct note collection.
- write tools retained under the same name frequently require a nested `body`, `userId`, or renamed
  properties not present in the skill examples.

Implemented fix: all 15 assessed REST skills now use preferred v3 tools, declare their toolset and
write-mode preflight, follow structured/paged result paths, and use strict nested write shapes.
The live evaluator schema-validates 18 representative calls (including write examples without
execution); all passed. Legacy calls remain negative regression probes and were rejected as
intended. Compatibility remains an opt-in migration surface, not a dependency for new skill text.

### LIVE-017 — Bulk skill workflows can exceed practical model context by themselves

- Severity: critical
- Area: token efficiency, truncation
- Status: compact default resolved and verified; explicit full exports remain expensive

Before remediation, `report_devices_bulk` for assets returned only six top-level rows in the
selected customer but serialized to 655,725 bytes (about 163,932 estimated tokens). Removing the
duplicate text reduced that same result to 226,062 bytes (about 56,516 tokens), nearly all of which
is still canonical structured data. A custom-property bulk call fell from 163,542 to 59,073 bytes,
and `report_all_users_by_so` for 154 users fell from 175,412 to 68,482 bytes.

Implemented fix: bulk reports now default to one compact 25-device page, require `all=true` for
complete inventory fan-out, and default explicit full detail to five devices. Compact results carry
device identity; assets retain inventory-grade hardware fields while software is opt-in; monitoring
uses status counts plus at most 25 attention services per device; custom properties support exact-
name filtering. The final five-device hardware projection measured 4,630 bytes versus 163,692 bytes
for full data (97.2% lower); enabling software raised it deliberately to 13,107 bytes. A named
custom-property filter measured 1,206 bytes in the migrated workflow. Full asset pages remain
inherently large, so artifact/cursor export remains future work for complete raw exports.

### LIVE-018 — A missing Standard PSA integration takes 18 seconds to return a generic 500

- Severity: medium
- Area: latency, error semantics
- Status: resolved and verified through the rebuilt live MCP

`list_psa_companies` returned a sanitized 500 after 18.6 seconds. The PSA skill already documents
that this may mean the customer has no Standard PSA integration, but the tool itself does not
classify the condition and gives the model no actionable distinction from a server failure.

Implemented fix: `list_psa_companies` now makes one upstream attempt and returns an empty,
396-byte result with `integrationStatus:"unavailable"` and an intentionally non-definitive reason.
The live response completed in 0.35–0.43 seconds. The migrated PSA skill now handles this state
without claiming that an integration is definitively absent. Known-ID PSA detail reads fail fast on
5xx, and authentication recovery is capped at one replay; the Custom PSA placeholder fell from
14.5 seconds to 43 ms and contact/site placeholder failures from about 6.7 seconds to 0.33 seconds.

### LIVE-019 — Toolset and write-mode bounds are enforced at the MCP boundary

- Severity: positive observation
- Area: authorization, configuration correctness
- Status: passed across 11 isolated live runtime profiles

Each profile launched the real server over stdio with distinct environment settings, listed its
actual tools through MCP, compared exact membership, inspected annotations, and attempted calls to
representative hidden names. No advertised tool handler was invoked, so the matrix did not contact
the upstream API or perform mutations.

| `NC_TOOLSETS` | `NC_WRITE_MODE` | Tools | Read-only | Non-destructive write | Destructive |
|---|---|---:|---:|---:|---:|
| unset | unset | 12 | 12 | 0 | 0 |
| `core` | `full` | 12 | 12 | 0 | 0 |
| `operations` | `read-only` | 4 | 4 | 0 | 0 |
| `operations` | `write` | 14 | 4 | 10 | 0 |
| `operations` | `full` | 21 | 4 | 10 | 7 |
| `core,administration` | `read-only` | 25 | 25 | 0 | 0 |
| `all` | `read-only` | 41 | 41 | 0 | 0 |
| `all` | `write` | 66 | 41 | 25 | 0 |
| `all` | `full` | 73 | 41 | 25 | 7 |
| `compatibility` | `read-only` | 55 | 55 | 0 | 0 |
| `all,compatibility` | `full` | 104 | 68 | 27 | 9 |

All 11 discovered catalogs exactly matched their resolved configuration. Across 64 negative calls,
every representative tool excluded by its toolset or write-mode bound returned `tool not found`.
This verifies that restriction occurs at registration/discovery, not only inside handlers.

Three invalid configurations also failed closed at startup with actionable messages: an unknown
toolset, an empty item in a toolset list, and an unknown write mode. The matrix confirms:

- `NC_WRITE_MODE=full` does not add tools from unselected catalogs;
- `read-only` excludes every write and destructive tool even when `all` is selected;
- `write` adds non-destructive mutations but still excludes destructive tools;
- `full` adds destructive tools only from the selected catalogs; and
- `all` excludes `compatibility` unless it is named explicitly.

Configuration is evaluated at process startup. An `.env` change therefore requires a server
restart, and clients that cache MCP discovery may also require a reconnect. The repeatable harness
is `scripts/evaluate-live-toolset-matrix.js`, exposed as `npm run evaluation:live:config`.

### LIVE-020 — Every advertised tool now has a recorded safe test outcome

- Severity: coverage milestone with remaining fixture gaps
- Area: comprehensive tool coverage
- Status: 104 of 104 tools covered; no tools skipped

The all-tool harness exercised the full `all,compatibility` catalog while retaining a strict safety
boundary. Read tools received live calls with dynamically resolved tenant fixtures. Sensitive read
results, including a successfully retrieved registration token, were measured and discarded
without printing values. Every write or destructive tool received an incomplete-input schema probe
only, and every one was independently verified absent from an `all,compatibility` read-only server.

| Outcome | Tools | Meaning |
|---|---:|---|
| Live read success | 63 | A live upstream request completed successfully |
| Live read error path | 5 | The tool reached a real categorized error using the best available or placeholder fixture |
| Mutation schema rejected | 36 | Required-input validation rejected the call before its handler could execute |
| Skipped | 0 | Every advertised tool received one of the test outcomes above |

The five non-successful reads were:

- `get_appliance_task`: no appliance-task fixture was discoverable; placeholder returned 404.
- `get_report`: no completed report ID was available; placeholder returned categorized 404.
- `get_psa_ticket`: no discoverable Custom PSA ticket ID was available; placeholder returned a
  categorized 500 in 43 ms.
- `list_psa_company_contacts` and `list_psa_company_sites`: no valid PSA company fixture was
  discoverable, so placeholder company IDs returned categorized 401 responses in about 0.33 s.

`get_device_activation_key` moved to the success set after the evaluator searched the available
device sample for an eligible read-only fixture. `list_psa_companies` also moved to the success set
after its structured unavailable-state handling was implemented.

Before LIVE-002, the 68 unique read-tool outcomes totaled 807,650 serialized bytes, or about
201,942 estimated tokens. After pass 1, all outcomes produced 327,889 bytes. After the bounded
projection work in pass 2, the 61 successes totaled 261,082 bytes and the seven concise errors
brought the aggregate to 261,911 bytes. With the pass-3 paged access report, the same final outcome
mix totaled 201,671 bytes (about 50,442 estimated tokens summed per response): 23.0% below pass 2
and 75.0% below the original baseline. This is a test-suite aggregate rather than the cost of a
normal workflow. None of the default-path measured results reported truncation.

The repeatable harness is `scripts/evaluate-live-all-tools.js`, exposed as
`npm run evaluation:live:all-tools`. Sensitive reads require the explicit
`MCP_EVAL_SENSITIVE_READS=1` opt-in. It never prints response bodies or tenant identifiers. Its
default 550 ms request pacing can be changed with `MCP_EVAL_REQUEST_DELAY_MS` when the target's
transport rate policy is known.

## Skill compatibility: `nable-skills-master`

The 15 REST-specific skills under `plugins/ncentral/skills` were read in full and migrated in their
downloaded `nable-skills-master` workspace. They no longer depend on the compatibility catalog.

| Skill | Migrated result | Key correction |
|---|---|---|
| `access-review` | Schema/live pass | Preferred report now pages 25 compact users by default; skill follows its envelope |
| `active-issues` | Schema/live pass | Compact issue pages plus `get_device_context` monitoring drill-down |
| `asset-inventory` | Schema/live pass | Inventory-grade compact hardware with opt-in software and bounded paging |
| `custom-property-audit` | Schema/live pass | Correct `customProperties` enum, name filter, envelope, and nested writes |
| `deployment-kit` | Schema pass; sensitive reads not printed | Correct download-link body and explicit write-mode requirement |
| `device-notes` | Schema pass; context read live | Explicit `userId`, canonical `deviceIds`, context reads, and confirmation gates |
| `fleet-export` | Schema/live pass | Preferred device reports; CSV assembled locally from structured JSON |
| `license-capacity` | Schema/live pass | Preferred scoped searches and accurate limit-versus-consumption distinction |
| `maintenance-windows` | Schema pass; read context live | Canonical `deviceIds`, `type:"action"`, nested applicable actions, full verification |
| `org-hierarchy` | Schema/live pass | Explicit typed hierarchy searches; no unsupported `format` claim |
| `patch-comparison` | Schema pass | Required nested body, preferred `run_report`, and honest write-mode classification |
| `psa-ticketing` | Schema pass; mapping read live | No nonexistent list call; ticket registration semantics and mapping body corrected |
| `scheduled-tasks` | Schema/live pass | Device-scoped discovery replaces nonexistent global list workflow |
| `server-health` | Schema/live pass | Consolidated preferred server status/session/user workflow |
| `warranty-lifecycle` | Schema/live pass | Context composition, server-relative date, and nested lifecycle patch |

The final live run performed 27 successful safe reads across these workflows and the compact/full
organization comparison. Seven old examples are kept as negative regression probes and were
rejected by strict validation. The sampled PSA-company read returned the new structured unavailable
status; there were no unexpected results. All 18 selected schemas validated, including mutation
examples that were not invoked. A separate parser verified
all 37 JSON examples in the 15 files.

The repeatable harness is `scripts/evaluate-live-mcp-skills.js` and can be run with
`npm run evaluation:live:skills`. It refuses any tool not annotated `readOnlyHint=true` and emits
only structural measurements; no response bodies or tenant values are printed. Set
`MCP_EVAL_SKIP_EXPENSIVE=1` for a shorter contract-focused pass.

## Accuracy checks completed

- Server status combined three documented upstream operations and reported no partial errors.
- Session validation reported a valid authenticated session without exposing token material.
- Exact organization-name search returned exactly one record.
- Exact case-insensitive organization and device matching returned one correct record each.
- Exact Service Org, parent-scoped customer, and generic org-unit searches returned the expected IDs.
- Bounded unfiltered searches passed for all four supported organization types: service-org,
  customer, site, and org-unit.
- Bounded unfiltered organization and device searches passed after the `nameMatch` fix.
- No-match organization and device searches returned successful empty arrays with `matched: 0`.
- Organization IDs, device IDs/names, and scheduled-task IDs were consistent across search/list and context tools.
- Device details, selected composition, and full composition succeeded.
- A probe asset 404 produced a correct partial result rather than losing successful components.
- Invalid cross-field input (`detailedStatus` without `includeStatus`) returned a concise validation error.
- Device-filter CSV output was substantially more compact than JSON for the sampled page.
- All two static resources, three resource templates, and four prompts were discovered; all five sampled resource reads succeeded.
- HTTP session creation and explicit DELETE cleanup correctly incremented and decremented the active-session gauge.
- The `all,compatibility` restart expanded to the intended six catalogs and de-duplicated retained aliases to 104 tools.
- Compatibility server-info basic, health, extra, and time reads all succeeded with stable structural shapes.
- Service-org/customer discovery, hierarchy, customer/site summary, limits, custom properties, users, roles,
  access groups, PSA mappings, installers, bulk reports, device components, notes, and task reads were exercised live.
- The expanded evaluator resolved service-org, customer, and device fixtures without emitting their values.
- The live evaluator refused eligibility to every non-read-only tool by annotation; no mutation was attempted.
- Eleven isolated `NC_TOOLSETS`/`NC_WRITE_MODE` profiles matched their exact expected catalogs.
- All 64 attempted calls to tools hidden by catalog or authority bounds were rejected as missing.
- Unknown/malformed toolsets and an unknown write mode failed closed during process startup.
- All 104 advertised tools received a safe recorded outcome with zero skips.
- Sixty-three of 68 read tools succeeded against live tenant fixtures; five reached sanitized,
  fixture- or integration-dependent error paths.
- All 36 write/destructive tools rejected incomplete schema probes before handler execution and
  were absent from a separately launched read-only catalog.
- Unknown top-level fields now fail at the live MCP boundary instead of being silently stripped.
- Successful responses retain canonical structured data with compact, non-duplicating text summaries.
- Active-issue and job-status results expose bounded page metadata and actionable next-page guidance.
- Compact bulk results retain device identity, and full-detail bulk requests remain explicitly available.
- Compact asset results retain hardware inventory fields; installed software is present only when
  `includeSoftware=true`.
- The preferred Service Org user report returns a 25-user compact page with stable total/page metadata.
- All 15 migrated REST skills declare preferred toolsets/write mode; all 18 representative fixtures
  and all 37 fenced JSON examples passed their advertised schemas without executing a mutation.

## Remaining live matrix

- Patch-comparison retrieval success (requires a safely generated or pre-existing report ID).
- Valid fixtures for appliance tasks, completed reports, Custom PSA tickets, and a Standard PSA
  company, to convert the final five live error-path checks into success-path checks.
- Live write/destructive success paths still require separately approved disposable devices, notes,
  schedules, roles, groups, mappings, and tickets. Representative write schemas now validate without
  execution.

Partial and truncation behavior is complete at the deterministic runtime boundary and partial
behavior was also observed live. Intentionally forcing a 256 KiB live truncation would require a
broad tenant-data pull with no additional implementation signal, so it is not an outstanding safe
test. Narrative rendering is client-model behavior; the MCP-owned prompt discovery, text, tool
references, paging instructions, and input contracts are verified.

## Final validation

- `npm run release:check` passed: 243 tests, 242 passed, one opt-in container lifecycle test
  skipped, zero failed; critical coverage floors, generated artifacts, migration/readiness checks,
  lint, type checking, version consistency, and both dependency audits passed.
- The repeated live configuration matrix passed all 11 valid profiles, all 64 hidden-tool calls,
  and all three fail-closed invalid configurations.
- A final live HTTP prompt pass rendered all four prompts. Each returned one non-empty message,
  used bounded search guidance, and both property workflows included explicit property pagination.
- `git diff --check` passed, and the rebuilt Docker container reports `running healthy` with
  `NC_TOOLSETS=all,compatibility` and `NC_WRITE_MODE=full` for this local evaluation.

## Post-rebuild regression pass

The current working tree was rebuilt into a fresh Docker image and retested through the live
Streamable HTTP endpoint. No new functional, schema, configuration-boundary, prompt, resource,
privacy, or response-size regression was found.

| Surface | Follow-up result |
|---|---|
| Full tool catalog | 104 discovered: 68 read, 27 write, 9 destructive |
| Every-tool pass | 63 live read successes, 5 known fixture errors, 36 pre-handler schema rejections, 0 skipped |
| Read-result aggregate | 201,719 bytes / about 50,455 tokens; 48 bytes (0.02%) above the prior pass due to live job-row variation |
| Skill pass | 27 read successes, 7 expected strict-schema failures, 0 unexpected; 18/18 representative schemas valid |
| Configuration matrix | All 11 valid profiles and all 3 invalid profiles behaved exactly as expected |
| Prompts | 4/4 rendered; all bounded, with explicit property paging where required |
| Resources | 2/2 static and 3/3 templated resource reads succeeded |
| Metrics | Duration, response-byte, call, retry, and upstream-operation families present; labels limited to `tool`, `success`, and `reason` |
| Release gate | 243 tests: 242 passed, 1 opt-in container test skipped, 0 failed; lint/type/audits/generated checks passed |

The same five fixture-dependent errors remained stable and categorized: appliance task and report
placeholders returned `not_found`; the Custom PSA ticket placeholder returned
`upstream_unavailable`; and PSA contact/site placeholders returned `authentication_failed` because
no valid Standard PSA company is discoverable in this tenant. These are not newly broken tools—the
server reached the correct live routes but lacks safe success fixtures.

The largest result remains the explicitly enabled compatibility report
`report_all_users_by_so` at 68,628 bytes for 154 full users. Together with the two legacy/full fleet
reports and hierarchy report, compatibility-oriented outputs account for about 62% of the
every-read aggregate. This reinforces the existing recommendation to use `NC_TOOLSETS=all` without
`compatibility` for normal v3 clients; it does not indicate a regression in preferred defaults.
