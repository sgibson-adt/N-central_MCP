# Runtime Architecture and Deployment Boundary

The executable entry point loads validated configuration and selects stdio or Streamable HTTP.
`src/mcp-server.js` constructs the MCP capability registry, while `src/http-runtime.js` owns HTTP
routing, gateway authentication, rate limiting, tenant-bound sessions, health/metrics, and clean
shutdown. REST adapters remain under `src/operations/`; task-oriented compositions remain under
`src/capabilities/`.

## Version 3 state model

Authentication tokens, resource caches, MCP sessions, tenant reference counts, rate-limit buckets,
and session activity are process-local and intentionally bounded. Version 3 therefore supports:

- one server process for a given HTTP endpoint; or
- multiple replicas only when the load balancer provides reliable session affinity for the entire
  MCP session and operators accept that rate limits and caches remain per replica.

Round-robin requests from one MCP session across replicas are unsupported: another process cannot
resolve the in-memory session ID or its tenant context. Restarts intentionally discard all of this
state and require clients to initialize a new session.

Distributed sessions, rate limits, cache eviction, credential lifecycle, and cross-replica shutdown
need a separately specified external-state design. That additive architecture work belongs after
3.0; this release does not imply horizontal scaling or introduce an unneeded runtime dependency.

## Review map for the v3 pull request

Review the large release change by boundary rather than as one undifferentiated diff:

1. Security and lifecycle: `src/logging.js`, `src/context.js`, `src/auth.js`,
   `src/http-runtime.js`, and their isolation/negative tests.
2. Public MCP contract: `src/mcp-server.js`, `src/toolsets.js`, `src/tools/`,
   `src/capabilities/`, and MCP contract tests.
3. REST fidelity: `src/operations/`, `src/client.js`, the OpenAPI inventory, and operation contract
   tests.
4. Generated claims: source JSON records first, then API coverage, toolset, migration, evaluation,
   and release-readiness Markdown drift checks.
5. Publication: package/version consistency, CI, container behavior, and release workflow last.

This ordering makes security assumptions and frozen public behavior reviewable before generated
output or release automation can obscure their causes.
