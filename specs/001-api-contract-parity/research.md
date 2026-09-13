# Research: N-central API Coverage and Curated MCP

## Decision 1: Separate REST coverage from public MCP exposure

**Decision**: Track every OpenAPI operation for coverage and evidence, but classify its preferred MCP
exposure independently as direct tool, composed capability, resource-backed, internal-only, or
excluded. Complete contract coverage does not require one tool per endpoint.

**Rationale**: MCP tools are model-selected interfaces, not a route catalog. The current 87 public
definitions serialize to 55,858 bytes before protocol framing, with several similar names and route
variants. Official GitHub MCP guidance recommends enabling only needed toolsets because fewer tools
improve selection accuracy, security, and context use. MCP itself provides tools, resources, and
prompts as composable primitives rather than prescribing endpoint-shaped tools.

**Sources**: [GitHub MCP toolset guidance](https://docs.github.com/en/copilot/concepts/context/mcp),
[MCP design principles](https://modelcontextprotocol.io/community/design-principles)

**Alternatives considered**: Expose all 104 operations as tools (rejected: maximizes overlap and
definition cost); stop tracking non-public operations (rejected: loses contract confidence).

## Decision 2: Use a twelve-tool default catalog with a hard cap of twenty

**Decision**: Start with twelve core tools covering server/session state, user identity,
organizations, devices, monitoring, scheduled tasks, reports, and job status. Require an explicit
specification change and selection evidence before adding a core tool; the default MUST never exceed
twenty in this major line.

**Rationale**: Twelve covers the common read-oriented goals identified in existing prompts and report
tools while leaving headroom for evidence-driven additions. A cap is a guardrail, not the success
metric; selection quality, schema size, and semantic distinctness are measured separately.

**Alternatives considered**: A rigid target of exactly twelve forever (rejected: prevents justified
additions); no numerical cap (rejected: permits gradual return to the current problem).

## Decision 3: Provide portable, startup-selected toolsets

**Decision**: Add `NC_TOOLSETS` with `core`, `operations`, `administration`, `psa`, `reporting`, and
`compatibility`. Blank selects `core`; unknown names fail closed. Omitted `NC_WRITE_MODE` becomes
`read-only` for 3.0. Selection is fixed at process start and intersects with the write mode before
registration.

**Rationale**: Both GitHub Copilot and Claude offer forms of on-demand tool discovery, but those are
client-specific optimizations. Server-side toolsets work consistently in Codex, Copilot, Claude, and
other MCP clients. The MCP specification allows authorization-sensitive catalogs and recommends
deterministic ordering, but a process-level configuration is simpler and identical across the
project's two transports.

**Sources**: [MCP tools specification](https://modelcontextprotocol.io/specification/draft/server/tools),
[Copilot tool search](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/tool-search),
[Anthropic advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use)

**Alternatives considered**: Depend entirely on deferred loading (rejected: not uniformly portable);
vary toolsets per request or tenant (rejected: introduces catalog/session complexity without a current
requirement); run separate packages per domain (rejected: needless deployment duplication).

## Decision 4: Extract a shared operation layer before curating tools

**Decision**: Move upstream request construction from public tool definitions into domain-grouped,
side-effect-free operation functions. Curated capabilities and compatibility adapters both invoke
that layer through the existing common client.

**Rationale**: Contract tests need a stable boundary for all supported REST operations, including
operations that are composed or not directly exposed. One implementation avoids keeping endpoint
logic in both old and new tools.

**Alternatives considered**: Generate the public surface directly from OpenAPI (rejected: loses
curation, safety scopes, and appliance quirks); duplicate request logic in compatibility tools
(rejected: creates drift); replace the existing client (rejected: its auth, retry, and tenant
boundaries are already valuable).

## Decision 5: Do not expose a generic raw-API dispatcher

**Decision**: No default or optional tool accepts arbitrary HTTP methods and paths. New operations
must enter through a reviewed operation adapter and a task-oriented or compatibility contract.

**Rationale**: A generic request tool hides parameter schemas, prevents accurate per-action safety
annotations, makes user approval opaque, and requires agents to know the REST documentation. It
reduces the count while making the interface materially worse.

**Alternatives considered**: One `call_ncentral_api` tool (rejected for schema and authorization
reasons); one tool with an enum of all operation IDs (rejected: transfers the same large and confusing
surface into one schema).

## Decision 6: Prefer composed context tools for related reads

**Decision**: Add bounded `get_device_context`, `get_organization_context`, and
`get_scheduled_task_context` capabilities with explicit include selections. Each composition has
maximum call, pagination, concurrency, and result-size limits and reports component failures.

**Rationale**: Agents usually need a useful task context, not a chain of raw entity endpoints.
Combining closely related reads reduces repeated inference/tool rounds and avoids filling context
with intermediate responses.

**Source**: [Anthropic guidance for effective agent tools](https://www.anthropic.com/engineering/writing-tools-for-agents)

**Alternatives considered**: Always return every related object (rejected: unbounded and wasteful);
keep each related GET as a core tool (rejected: recreates selection overlap).

## Decision 7: Add structured output contracts to curated tools

**Decision**: Every curated tool declares an output schema and returns conforming
`structuredContent`, plus a concise text representation for compatibility. Large lists retain
pagination, filtering, field selection, and truncation metadata.

**Rationale**: Structured results let clients and tests validate semantics without reparsing JSON
text. The current MCP tool specification supports output schemas and structured tool results.

**Source**: [MCP tools specification](https://modelcontextprotocol.io/specification/draft/server/tools)

**Alternatives considered**: Continue returning only serialized JSON text (rejected: weakens client
validation); remove text output entirely (rejected: some clients still present text most reliably).

## Decision 8: Treat the curated catalog as a 3.0.0 migration

**Decision**: Release the new default catalog as 3.0.0. Provide an opt-in `compatibility` toolset that
references retained preferred definitions and supplies deprecated adapters for safely preservable
displaced aliases. Publish a mapping for all 87 current tools. Deprecation does not waive contract
correctness or safety.

**Rationale**: Moving endpoint-oriented tools out of the default discovery result changes public
behavior even when aliases remain available. Calling it a minor release would understate impact.

**Alternatives considered**: Keep all old tools in core (rejected: defeats the redesign); remove them
without a compatibility set (rejected: avoidable migration burden); ship as 2.2.0 (rejected: SemVer
mismatch).

## Decision 9: Evaluate selection offline and smoke-test clients optionally

**Decision**: Maintain a reviewed prompt corpus containing intended candidates, allowed alternatives,
prohibited candidates, and argument expectations. A deterministic lexical scorer ranks normalized
names, descriptions, and parameter descriptions for mandatory CI. Record optional smoke results from
Codex, Copilot, and Claude without making paid/client-specific access a release dependency.

**Rationale**: Tool count alone does not prove discoverability. A deterministic suite catches vague
names and overlap on every change, while client smoke runs provide useful but non-reproducible
portability evidence.

**Alternatives considered**: Require live model calls in CI (rejected: nondeterministic, credentialed,
and costly); omit selection evaluation (rejected: cannot validate the redesign's primary benefit).

## Decision 10: Correct audited operation gaps in the shared adapter

**Decision**: Correct note fields, pagination policies, opaque mutation inputs, lifecycle labels, and
other audited partial mappings while extracting operations. Add adapters for Windows service action,
remote-control type/task, custom-ticket detail/resolve/reopen, and safe session validation. Keep the
five REST navigation indexes and SSO exchange excluded with documented alternatives.

**Rationale**: Curating MCP tools must not conceal request-contract errors or missing useful behavior.
The shared operation layer is the correct place to fix those mappings once.

**Alternatives considered**: Correct only operations used by core (rejected: compatibility and future
composition would remain unreliable); expose link roots (rejected: MCP discovery already supplies the
useful navigation); add SSO now (rejected: requires a separate credential lifecycle design).

## Decision 11: Fail safely for undocumented note deletion

**Decision**: `clear_device_notes` remains a compatibility name but requires a non-empty `noteIds`
array. A call without IDs fails locally with an actionable error and never issues the undocumented
no-body delete. Canonical `note` and `deviceIds` inputs accept deprecated `text` and `deviceIDs`
aliases only when values do not conflict.

**Rationale**: Preserving an unverified destructive request is less important than preventing an
ambiguous bulk deletion. The planned major release and migration guide make the correction explicit.

**Alternatives considered**: Preserve no-body deletion without evidence (rejected: unsafe); remove the
legacy name entirely (rejected: the corrected behavior can be retained safely).

## Decision 12: Validate the manifest with Ajv

**Decision**: Add Ajv and `ajv-formats` as dev dependencies and compile
`contracts/coverage-record.schema.json` in inventory tests, including URI/date-time formats. No
runtime schema-validation dependency is added.

**Rationale**: The manifest is a JSON Schema contract with conditionals and formats. Ajv provides
deterministic standards-based validation and avoids maintaining a partial custom validator.

**Alternatives considered**: Hand-written validation only (rejected: likely to drift from the schema);
runtime validation (rejected: coverage metadata is build-time evidence).

## Decision 13: Align pagination per operation

**Decision**: Support `pageSize=-1` only where documented, positive sizes through the OpenAPI
overview's 1000 maximum, and keep `all=true` as a separately bounded multi-request mode. Active issues
remains positive-only. Add omitted filters/sorts/pages and remove unsupported parameters.

**Rationale**: The current global 1–200 clamp silently changes `-1` to `1` and narrows contract-valid
behavior. Per-operation policy is both accurate and safely bounded.

**Alternatives considered**: Keep one 200 cap (rejected: contract divergence); permit `-1`
everywhere (rejected: invalid for active issues and unsafe when undocumented).

## Decision 14: Consolidate reviewed dependency updates at release time

The five open PRs were mergeable and individually green when reviewed on 2026-09-12, but they must be
validated together against the new 3.0.0 candidate.

| PR | Decision | Rationale |
|---|---|---|
| [#39](https://github.com/theonlytruebigmac/n-central-rest-api-mcp/pull/39) ESLint/plugin/globals | Include intent, refresh compatible versions | The branch is stale versus current in-range releases; apply once after behavior is covered. |
| [#41](https://github.com/theonlytruebigmac/n-central-rest-api-mcp/pull/41) `actions/checkout` v7 | Include | Current official major; validate in the combined CI candidate. |
| [#42](https://github.com/theonlytruebigmac/n-central-rest-api-mcp/pull/42) MCP SDK 1.30 | Include | Current v1 release and directly relevant; run complete MCP transport/contract tests. |
| [#43](https://github.com/theonlytruebigmac/n-central-rest-api-mcp/pull/43) `actions/setup-node` v7 | Include | Current official major; preserve Node 22/24 coverage. |
| [#44](https://github.com/theonlytruebigmac/n-central-rest-api-mcp/pull/44) Node 25 Docker | Reject exact update; supersede with Node 24 | Node 25 reached EOL; Node 24 is active LTS and already tested. |

Current review found seven audit findings and additional in-range package updates. Refresh compatible
transitives without forced majors, defer TypeScript 7 and the MCP SDK v2 migration, and prepare bot-PR
closure recommendations without changing external PR state unless the maintainer explicitly approves.
