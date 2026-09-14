# N-central REST API MCP Server

> A [Model Context Protocol](https://modelcontextprotocol.io/) server for **N-able N-central** — exposing the N-central REST API as MCP tools, resources, and prompts for use with any MCP-compatible client.

> **Disclaimer:** This is an unofficial, community-maintained MCP server. It is **not** an official N-able MCP server, and it is focused specifically on the N-central **REST API** surface.

---

## Features at a Glance

- **Focused 12-tool default catalog** for common read-only work, with opt-in `operations`, `administration`, `psa`, `reporting`, and deprecated `compatibility` toolsets
- **Three write modes**: `read-only` (default), `write`, `full` — authority is intersected with selected toolsets, so visibility never grants writes by itself
- **Structured results** with stable `data` and `meta` fields, readable text fallback, operation provenance, partial-error reporting, redaction, and bounded 256 KiB output
- **Bounded report workflows** with safe auto-pagination; `run_report` supports JSON or CSV output
- **MCP Resources** for live org-hierarchy context (`ncentral://org-tree`) and per-entity lookups via templated URIs
- **MCP Prompts** for common audit and reporting workflows
- **Two transports**: stdio (for Claude Desktop / local clients) and Streamable HTTP (for remote clients, MCP Inspector, etc.)
- **Single- or multi-tenant**: self-host against one N-central (env credentials), or run one hosted server many users point at — each targeting their *own* N-central via per-request headers (`NC_MULTI_TENANT=1`), with strict per-request credential isolation. See the **[Setup & Client Guide](docs/SETUP-GUIDE.md)**
- **Production-grade auth**: JWT exchange with auto-refresh, hash-based bearer-token auth for the HTTP endpoint, CORS allow-list, rate limiting, audit log
- **Operability**: `/healthz` and `/metrics` (Prometheus text format) endpoints, structured audit logging, configurable retry/timeout/session caps

---

## Quick Start

### Prerequisites

- **Node.js ≥ 22.9** (uses the built-in `--env-file-if-exists` flag and `fetch`)
- An **N-central instance** you can reach over HTTPS
- A **User-API JWT token** generated in the N-central UI

### 1. Install dependencies

```bash
npm install
```

### 2. Get your N-central JWT token

In the N-central UI: **Administration → User Management → Users → [user] → API Access → Generate JSON Web Token**

> **Best practice:** Use a dedicated API-only user with least-privilege roles. The API user password rotates every 90 days — regenerate the JWT proactively to avoid 500 errors.

### 3. Configure your environment

```bash
cp .env.example .env
# Edit .env — set NC_SERVER_URL and NC_JWT_TOKEN at minimum.
```

The most common variables (full list in [.env.example](.env.example)):

| Variable | Required when | Description |
|---|---|---|
| `NC_SERVER_URL` | single-tenant | Your N-central URL, e.g. `https://ncentral.example.com`. *Not* needed in multi-tenant mode |
| `NC_JWT_TOKEN` | single-tenant | User-API JWT from the N-central UI. *Not* needed in multi-tenant mode |
| `NC_MULTI_TENANT` | hosted mode | Set to `1` to require per-request `X-NC-FQDN`/`X-NC-JWT` headers (HTTP only). See [Multi-Tenant Mode](#multi-tenant-hosted-mode) |
| `NC_FQDN_ALLOWLIST` | multi-tenant | Comma-separated host suffixes a client may target — SSRF guard (exact or DNS-suffix match) |
| `NC_TOOLSETS` | optional | Comma-separated catalogs; defaults to `core`. `all` selects every preferred v3 catalog. Valid names: `all`, `core`, `operations`, `administration`, `psa`, `reporting`, `compatibility` |
| `NC_WRITE_MODE` | optional | `read-only` \| `write` \| `full` (default `read-only`) |
| `MCP_PORT` | HTTP mode only | Setting this enables HTTP mode (omit for stdio) |
| `MCP_API_KEY` | HTTP mode | Bearer token clients must present. Generate with `openssl rand -hex 32`. **Required** unless `MCP_ALLOW_UNAUTHENTICATED=1` |
| `MCP_BIND_ADDRESS` | optional | Interface to bind. `127.0.0.1` (default) for localhost-only; `0.0.0.0` for Docker / LAN exposure |
| `MCP_CORS_ORIGIN` | browser clients | Comma-separated allow-list of origins |

> **Connecting a client?** See the **[Setup & Client Guide](docs/SETUP-GUIDE.md)** for copy-paste config for Claude Code, VS Code, Claude Desktop, and Cursor — in both single- and multi-tenant modes.

#### Toolsets and write modes

Omitting both settings advertises exactly the 12 `core` tools in `read-only` mode. Toolsets control
relevance; write mode controls authority after the selected toolsets are combined.

| Mode | Visible scopes |
|---|---|
| `read-only` *(default)* | read only |
| `write` | read and non-destructive write |
| `full` | read, write, and explicitly destructive |

For example, `NC_TOOLSETS=core,reporting` remains read-only by default, while
`NC_TOOLSETS=operations NC_WRITE_MODE=full` enables destructive operational workflows. All
write/destructive tools are audit-logged. See [MCP Toolsets](docs/MCP-TOOLSETS.md) for exact current
membership and [Migrating to 3.0](docs/MIGRATING-TO-3.0.md) for all 87 legacy-name dispositions.
`NC_TOOLSETS=all` expands to the five preferred v3 catalogs and intentionally excludes the legacy
`compatibility` aliases; use `NC_TOOLSETS=all,compatibility` only while testing or migrating old names.

#### Upgrade from 2.x

1. Keep the version 3 defaults (`NC_TOOLSETS=core`, `NC_WRITE_MODE=read-only`) for the twelve-tool
   task-oriented catalog.
2. If an existing integration still needs supported 2.x names, stage it with
   `NC_TOOLSETS=core,compatibility`; add `NC_WRITE_MODE=write` or `full` only when that authority is
   deliberately required.
3. Review [Migrating to 3.0](docs/MIGRATING-TO-3.0.md) for all 87 names. In particular,
   `list_custom_psa_tickets` is removed because the upstream route returns navigation links; use
   `get_psa_ticket` with a known identifier.
4. Run `node --test test/contract/mcp/compatibility.contract.test.js` before switching production
   clients. This walkthrough is designed to take less than 15 minutes.

### 4. Start the server

The server runs in **stdio mode** by default and switches to **HTTP mode** when `MCP_PORT` is set.

**Option A — stdio (Claude Desktop / local clients)**

Use the npm script (loads `.env` if present):

```bash
npm start
```

Or wire it into Claude Desktop directly. Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ncentral": {
      "command": "node",
      "args": ["--env-file-if-exists=/absolute/path/to/n-central-rest-api-mcp/.env", "/absolute/path/to/n-central-rest-api-mcp/index.js"],
      "env": {
        "NC_WRITE_MODE": "read-only"
      }
    }
  }
}
```

**Option B — Streamable HTTP (remote clients, MCP Inspector)**

Set an `MCP_API_KEY`, then use the HTTP script, which explicitly selects port `3100`:

```bash
npm run start:http
# Listening at http://127.0.0.1:3100/mcp
# Health probe: http://127.0.0.1:3100/healthz
# Metrics:      http://127.0.0.1:3100/metrics
```

To use another port, start the server with `MCP_PORT=<port> npm start`. There is no HTTP port
default in the runtime: an omitted `MCP_PORT` selects stdio.

Clients send `Authorization: Bearer <MCP_API_KEY>` on every request.

The Prometheus endpoint exposes bounded-label call counts plus cumulative tool duration, serialized
response bytes, upstream-operation counts, and partial/truncated-result counters. Divide duration
or byte totals by the matching call count to track average latency and response size without using
tenant, organization, device, user, or request identifiers as labels.

**Option C — Docker**

```bash
cp .env.example .env
# Edit .env: NC_SERVER_URL, NC_JWT_TOKEN, MCP_API_KEY are required for the HTTP listener.
docker compose up -d
```

Compose maps `127.0.0.1:3100:3100` by default. To expose on the LAN, edit `docker-compose.yml` and ensure `MCP_API_KEY` is set.

Versioned images are also published to GitHub Container Registry:

```bash
docker pull ghcr.io/theonlytruebigmac/n-central-rest-api-mcp:<released-version>
```

Version 3.0.0 is currently an unreleased candidate; see [Release Readiness](docs/RELEASE-READINESS.md)
for its exact scope and publication state.

### 5. Verify

```bash
# stdio mode — should print "Authenticated with N-central..." on first tool call.
# HTTP mode — should respond:
curl -s http://127.0.0.1:3100/healthz
# {"status":"ok","sessions":0}
```

Run deterministic and one-off credential-backed checks according to the
[Verification Policy](docs/VERIFICATION.md). The live smoke command is explicitly opt-in,
read-only, and emits no tenant response data. See [Updating the OpenAPI Baseline](docs/OPENAPI-UPDATE.md)
before replacing the contract snapshot.

HTTP sessions, token/cache entries, and rate-limit buckets are process-local. Deploy one instance,
or use reliable session affinity for the full MCP session; round-robin session traffic across
replicas is unsupported in version 3. See [Runtime Architecture](docs/ARCHITECTURE.md).

---

## Multi-Tenant (Hosted) Mode

By default the server is **single-tenant**: it reads one `NC_SERVER_URL` + `NC_JWT_TOKEN` from
its environment. That's the right model for an MSP self-hosting it against a single N-central.

Set **`NC_MULTI_TENANT=1`** to host **one** server that many users point at, each targeting a
**different** N-central server with their **own** JWT — supplied per request via headers in their
own MCP client config. (Intended for a centrally-hosted demo/eval box, not for routing third
parties' production credentials through infrastructure you don't control.)

```bash
# Hosted server (HTTP only — stdio cannot carry per-request headers):
NC_MULTI_TENANT=1 \
MCP_PORT=3100 \
MCP_API_KEY="$(openssl rand -hex 32)" \
NC_FQDN_ALLOWLIST=ncentral.com,n-able.com \
node index.js
```

Each user's MCP client config sends, per request:

```jsonc
{
  "mcpServers": {
    "ncentral": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer <MCP_API_KEY>",       // gates access to THIS server
        "X-NC-FQDN": "https://their-ncentral.example.com",
        "X-NC-JWT":  "<their N-central User-API JWT>"
      }
    }
  }
}
```

**Isolation guarantees**

- **One session = one tenant.** Credentials are validated at session init (before the session
  exists); an invalid/missing header pair is rejected with `400`. The tenant is then bound to the
  session for its lifetime — later header changes on the same session are ignored.
- **No shared credential state.** Tokens are keyed per tenant and resolved per request via
  `AsyncLocalStorage`, so concurrent requests for different servers can never read each other's
  URL or token. The resource cache is tenant-scoped for the same reason.
- **Memory only, auto-evicted.** Tokens and cache entries live in memory and are dropped when the
  last session for a tenant closes. Nothing is persisted; JWTs are never logged.
- **SSRF guard.** `NC_FQDN_ALLOWLIST` restricts which N-central hosts a client may target (exact
  or DNS-suffix match). Leave it unset only behind trusted network boundaries — the server warns
  at startup if it's empty.

**Scaling.** The event loop handles many concurrent users on one process (the work is I/O-bound —
waiting on N-central). If you outgrow one process, run replicas behind a load balancer with
**sticky routing by `mcp-session-id`** — StreamableHTTP sessions live in process memory, so a
session must return to the replica that created it.

> **Tip — multiple servers without hosting:** a self-hoster who just needs to target several
> N-central servers from their own editor can skip multi-tenant mode entirely and define one
> stdio entry per server, each with its own `env: { NC_SERVER_URL, NC_JWT_TOKEN }`.

---

## Tools

The default catalog is deliberately small. With no catalog configuration, clients discover these 12
read-only tools:

1. `get_server_status`
2. `validate_session`
3. `get_current_user`
4. `search_organizations`
5. `get_organization_context`
6. `search_devices`
7. `get_device_context`
8. `list_active_issues`
9. `list_device_scheduled_tasks`
10. `get_scheduled_task_context`
11. `run_report`
12. `list_job_statuses`

Optional catalogs contain 21 operations tools, 23 administration tools, 11 PSA tools, and 6
reporting tools. The deprecated compatibility catalog exposes 84 safely retained or adapted 2.x
names. Counts are catalog memberships and are not additive when selected catalogs overlap. See the
generated [MCP Toolsets](docs/MCP-TOOLSETS.md) reference for exact names, descriptions, scopes, and
configuration examples.

Both core inventory searches accept human names without requiring callers to construct
endpoint-specific FIQL fields:

```json
{ "organizationType": "customer", "name": "Acme", "nameMatch": "contains" }
{ "name": "Vienna Laptop", "nameMatch": "exact", "orgUnitId": 123 }
```

Name matching is case-insensitive and whitespace-normalized. It automatically scans bounded pages
(at most 20 pages or 10,000 records), so `pageNumber` and `pageSize` cannot be combined with `name`.
Advanced `select`, sort, parent, organization-unit, and device-filter inputs remain available as
upstream pre-filters. Results include match mode, count, and retrieval bounds in `meta.page.search`.

Every successful tool result has the same shape:

```json
{
  "data": {},
  "meta": {
    "operations": ["GET /api/..."],
    "partial": false,
    "errors": [],
    "page": null,
    "truncated": false
  }
}
```

The complete value is returned once as MCP `structuredContent`; text content is a compact summary
with record count, page guidance, and partial/truncation state. Component failures can be reported
as partial results; secrets and tenant URLs are redacted. Structured results are capped at 256 KiB.

### Pagination and composition limits

List calls return one page unless `all: true` is supported. Automatic pagination is bounded to 20
pages and 10,000 records, with endpoint-specific page rules (including positive-only active-issue
paging). Compositions use at most 10 upstream calls with concurrency capped at 5.

High-cardinality core/reporting tools use compact, bounded defaults:

- `get_organization_context` returns compact organization, child, and custom-property projections;
  child/property components default to page 1 with 25 rows. Use their option objects and
  `detailLevel: "full"` when broader context is intentional.
- `search_devices` returns compact discovery fields by default; request `detailLevel: "full"` only
  when complete device records are required.
- `get_current_user` omits contact and postal-profile fields by default; request full detail only
  for workflows that need the broader profile.
- `list_active_issues` defaults to 10 compact rows; use `detailLevel: "full"` explicitly for the
  complete upstream issue fields.
- `list_job_statuses` defaults to 25 compact rows and supports local `status`, `deviceId`, `jobId`,
  `since`, `pageNumber`, and `pageSize` filtering/pagination. The upstream REST route itself remains
  unpaged, so these options reduce MCP context rather than upstream latency.
- `report_devices_bulk` defaults to one compact 25-device page. Use `all: true` only for an explicit
  complete-inventory fan-out, `detailLevel: "full"` for raw data, and `propertyNames` to restrict a
  compact custom-property report to named properties.
- `report_all_users_by_service_org` defaults to one compact 25-user page. Page through the deduped
  roster, or request `all: true` / `detailLevel: "full"` only when the broader result is necessary.

### API coverage and limitations

Against the reviewed 104-operation OpenAPI snapshot, 92 operations are implemented, none remains
partially implemented, and 12 have reviewed unsupported dispositions. The generated
[API Coverage](docs/API-COVERAGE.md) report names every exposure decision, capability mapping,
limitation, safe alternative, and test-evidence path. This project does not claim one public tool
per REST operation or support for the 12 reviewed exclusions.

---

## Resources

Resources provide live context to the client without requiring explicit tool calls. Hierarchical resources are cached for 60s by default — set `NC_RESOURCE_CACHE_TTL_MS=0` to disable.

| URI | Description |
|-----|-------------|
| `ncentral://org-tree` | Bounded SO → Customer → Site hierarchy with IDs/names and partial/unlinked diagnostics |
| `ncentral://status` | Server health + version snapshot |
| `ncentral://device/{deviceId}` | Templated — full device record by ID |
| `ncentral://customer/{customerId}` | Templated — customer details by ID |
| `ncentral://org-unit/{orgUnitId}` | Templated — org unit details by ID |

---

## Prompts

| Name | Description |
|------|-------------|
| `full-customer-report` | Comprehensive customer/site report with org custom properties |
| `device-health-audit` | Active issues and monitoring status across the environment |
| `agent-deployment-status` | Find sites with missing or low device counts |
| `custom-property-audit` | Audit custom property consistency across all customers |

---

## Resilience

| Concern | Behavior |
|---------|----------|
| Rate limits (429) | Auto-retry with exponential backoff on all methods (up to 3 attempts) |
| Unauthorized (401) | Auto re-authenticates from JWT and replays the request on all methods |
| Token expiry | Access tokens (1hr) and refresh tokens (25hr) auto-refreshed; concurrent refreshes coalesced |
| Server errors (all 5xx) | Retried on GET/PUT/DELETE/HEAD (replay-safe), except PSA discovery/detail reads that fail fast because those routes can use 500 for missing integration/data. POST/PATCH fail fast to avoid duplicate writes |
| Request timeouts | 30s on API calls, 15s on auth calls. Retried on idempotent methods only |
| Stale HTTP sessions | Cleaned up after 30 minutes of inactivity |

---

## Known API Quirks

- **Errors inside HTTP 200:** Some N-central failures arrive as an `error message` field in an otherwise successful HTTP response. The client rejects that field case-insensitively instead of returning it as valid data. See N-able's [known issues and limitations](https://developer.n-able.com/n-central/docs/rest-api-known-issues-and-limitations).
- **Probe assets:** Return 404 — probes don't have asset records (expected behavior, skipped in bulk reports)
- **Active issues:** `deviceClassValue` and `deviceClassLabel` are always `null` (known N-central API bug)
- **`get_device` by ID:** `lastLoggedInUser` and `stillLoggedIn` may return `null` — use `list_devices` instead for these fields. (`lastApplianceCheckinTime` was also missing pre-v2025.3.1.9 — now fixed.)
- **Active issues at SO level:** The `/active-issues` endpoint only supports customer/site org unit types, not service org
- **Scheduled task `/details`:** does NOT accept DEVICE-level task IDs — only SYSTEM and CUSTOMER. Navigate via `parentId` if you have a device task ID.
- **Scheduled-task root:** `GET /api/scheduled-tasks` is a link-discovery root, not a pageable global task list. Use a device's scheduled-task route to discover DEVICE-level IDs, then follow `parentId` when SYSTEM/CUSTOMER-level task information is required. N-able's [endpoint reference](https://developer.n-able.com/n-central/reference/taskroot) and [task FAQ](https://developer.n-able.com/n-central/docs/rest-api-faqs) agree with the OpenAPI/live response; the task overview's global-list wording is inconsistent.
- **`create_direct_scheduled_task`:** Scripts must have Repository ID ≥ 2000 and "Enable API" toggled ON in the N-central UI. There's no API to enumerate scripts — find IDs in the Script/Software Repository UI. Extensive use accumulates DB rows that slow the UI's Task Execution page.
- **`validate_psa_credential`:** only works with TigerPaw 3.0 — calls for other PSAs will fail.
- **Standard PSA collection shapes:** Customer mappings, companies, contacts, and sites return `{ data: [...] }` envelopes on live systems even though the reviewed OpenAPI responses reference singular PSA models. The MCP preserves the upstream envelope.
- **Standard PSA company discovery:** Some systems return HTTP 500 when no integration is configured.
  `list_psa_companies` converts that ambiguous condition into an empty result with
  `integrationStatus: "unavailable"`; it does not claim the integration is definitively absent.
- **Per-endpoint concurrency limits:** N-central enforces concurrency per-endpoint (range 1-50). `/api/devices` allows 5 concurrent; `/api/devices/{id}/assets/lifecycle-info` only 1. Bulk reports default to safe values; tune via the `concurrency` parameter.
- **PREVIEW endpoints:** customer-scoped site listing/creation, customer/site registration tokens, and user-role listing/detail/creation are flagged PREVIEW by N-central. Every mapped tool warns during discovery because these contracts may change.
- **Credentialed POST tools:** `validate_psa_credential` and the compatibility alias `get_custom_psa_ticket_detail` transmit plaintext credentials in request bodies — use them only over HTTPS. The credential-bearing authenticated server-information operation is intentionally not exposed.
- **`select` is a filter, not a projection:** despite the name, the `select` query parameter on list endpoints is a **FIQL/RSQL predicate** that filters rows. It does NOT pick which fields come back. Valid: `select=soId==50` (returns only that SO). Invalid: `select=soId,soName` (parse error). Not all fields are queryable — unsupported ones error with `Field not found: X`. Some operators (e.g. `=gt=`) throw NPEs on the server.
- **Device-create required fields:** The reviewed OpenAPI snapshot contains one malformed generated entry in `DeviceAddRequest.required`. `create_device` deliberately enforces the five valid required fields (`customerId`, `networkAddress`, `longName`, `supportedOs`, and `deviceClass`) and ignores only that invalid schema artifact.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 500 errors on every API call | N-central API user password expired (rotates every 90 days) | Reset the password in N-central UI; regenerate the JWT; set a reminder for ~80 days |
| Repeated `Got 401, re-authenticating...` logs | N-central instance was rebooted (in-memory token state lost) | First 401 triggers re-auth; subsequent calls recover automatically. Noisy on restart but transient. |
| JWT works now but fails 5 minutes later | Token revocation propagation | After regenerating a JWT in N-central UI, allow up to 5 minutes for the old token's revocation to propagate |
| Server restart loses authentication state | Tokens are stored in-memory only | First API call after restart triggers fresh JWT exchange — no action needed |
| Can't reach the API on a custom port | N-central only serves the API on port 443 | Use a reverse proxy or accept port 443 |
| `create_direct_scheduled_task` errors with no script found | Repository ID < 2000 (bundled default) or "Enable API" toggle is OFF | Use a custom-uploaded script; toggle "Enable API" in the UI |
| Reaching pagination bounds on big environments | Automatic pagination caps at 20 pages or 10,000 records | Use a tighter filter via the `select` parameter, or call the tool with explicit `pageNumber`/`pageSize` |
| HTTP mode exits with "FATAL: MCP_PORT is set but MCP_API_KEY is not" | Safety check — HTTP mode requires an API key | Set `MCP_API_KEY=$(openssl rand -hex 32)` or `MCP_ALLOW_UNAUTHENTICATED=1` for local dev |
| `ERR_CONNECTION_REFUSED` / can't reach `/healthz`/`/metrics` from another machine | Server bound or published to localhost only | Set `MCP_BIND_ADDRESS=0.0.0.0`; in Docker publish `0.0.0.0:3100:3100` (not `127.0.0.1:3100:3100`) and connect to the host's **LAN IP**, not `localhost`. If `curl 127.0.0.1:3100/healthz` works *on the host* but not remotely, it's the bind/publish scope |
| Client connects but queries the **wrong** N-central / `X-NC-*` headers ignored | Server not started with `NC_MULTI_TENANT=1` | In single-tenant mode the headers are ignored and env `NC_SERVER_URL`/`NC_JWT_TOKEN` are used. Start with `NC_MULTI_TENANT=1` for header passthrough |
| `400` at connect in multi-tenant mode | Missing/invalid `X-NC-FQDN` / `X-NC-JWT` | Send both; FQDN must be `https://` and match `NC_FQDN_ALLOWLIST` if set |
| "FATAL: NC_MULTI_TENANT=1 requires HTTP mode" | Multi-tenant needs per-request headers, which stdio can't carry | Set `MCP_PORT` (run in HTTP mode) |

For client-side setup issues, see the **[Setup & Client Guide](docs/SETUP-GUIDE.md)**.

---

## Releases

Pushing a stable semantic-version tag starts `.github/workflows/release.yml`. The workflow requires
the tag to exactly match the package, lockfile, and MCP server version, runs the release gates, builds
Linux AMD64 and ARM64 images, publishes them to GHCR, and then creates the corresponding GitHub
Release.

Version `3.0.0` metadata currently describes an unreleased candidate. Do not create its tag until
the generated [Release Readiness](docs/RELEASE-READINESS.md) report is current, `npm run release:check`
and the container smoke gate pass on the merged revision, and a maintainer explicitly approves
publication.

After those conditions are satisfied for version `3.0.0`:

```bash
git tag -a v3.0.0 -m "Release v3.0.0"
git push origin v3.0.0
```

The container receives immutable `3.0.0` and moving `3.0`, `3`, and `latest` tags. The GitHub Release
includes the pushed image digest. A mismatched or non-stable tag fails before anything is published.

---

## Spec-Driven Development

This repository is initialized with [GitHub Spec Kit](https://github.com/github/spec-kit) for three coding-agent integrations. All three agents share the specifications and plans under `specs/` and the project-wide constitution under `.specify/memory/constitution.md`.

| Agent | Project skills | How to start a workflow |
|---|---|---|
| Codex | `.agents/skills/` | Invoke `$speckit-constitution`, then `$speckit-specify` |
| Claude Code | `.claude/skills/` | Invoke `/speckit-constitution`, then `/speckit-specify` |
| GitHub Copilot | `.github/skills/` | In Agent mode, ask Copilot to use `speckit-constitution` or `speckit-specify` |

Establish the constitution once. For each feature, use the shared workflow:

```text
constitution (once) -> specify -> clarify (optional) -> plan -> tasks -> analyze (optional) -> implement -> converge
```

Codex is the default Spec Kit integration. To make another installed integration the default for shared templates and any extensions or presets, run `specify integration use claude` or `specify integration use copilot`. Return to Codex with `specify integration use codex`.

The Copilot integration requires Spec Kit's explicit multi-install override when it is installed alongside other agents. This repository has that supported setup recorded in `.specify/integration.json`; the three agent-specific skill directories do not overlap.

---

## Project Structure

```
├── index.js                  # Entry point — transport selection (stdio / HTTP)
├── src/
│   ├── auth.js               # Per-tenant JWT → Access Token auth, auto-refresh logic
│   ├── client.js             # HTTP client with retry, timeout, and rate-limit handling
│   ├── config.js             # Shared bounded numeric environment parsing
│   ├── context.js            # Per-request tenant context (AsyncLocalStorage) — credential isolation
│   ├── http-runtime.js       # Streamable HTTP routing, rate limits, and session lifecycle
│   ├── logging.js            # Structured logger + audit log
│   ├── mcp-server.js         # Transport-independent MCP capability registration
│   ├── metrics.js            # Prometheus counters / gauges
│   ├── paginator.js          # Auto-pagination, bounded concurrency, CSV helpers
│   ├── prompts.js            # MCP Prompts definitions
│   ├── resources.js          # MCP Resources definitions
│   ├── server-utils.js       # JSON-schema → Zod, header parsing, safeCompare
│   ├── shared.js             # Shared pagination/format schema helpers
│   ├── tool-registry.js      # Write-mode gating + MCP tool annotations
│   ├── toolsets.js           # Deterministic catalog union + write-mode intersection
│   ├── capabilities/         # Bounded, task-oriented compositions used by core tools
│   ├── operations/           # Contract-shaped REST operation adapters
│   └── tools/
│       ├── core.js
│       ├── operations.js
│       ├── administration.js
│       ├── psa.js
│       ├── reporting.js
│       └── compatibility.js
├── scripts/
│   ├── check-critical-coverage.js # Aggregate and critical per-file coverage gate
│   ├── live-readonly-smoke.js     # Explicit credential-backed read-only verification
│   └── …                          # Generated-doc, evaluation, readiness, and version checks
├── test/
│   ├── auth-isolation.test.js  # Per-tenant token/credential isolation (forced interleave, 401 path)
│   ├── config.test.js          # Fail-fast numeric configuration contracts
│   ├── critical-coverage.test.js # Per-file coverage parser and enforcement
│   ├── isolation.test.js       # End-to-end session isolation, cache, boot matrix, SSRF guard
│   ├── mock-fetch.js           # Shared test helpers (not a test suite)
│   ├── repository-quality.test.js # Documentation, defaults, and repository hygiene
│   ├── server-runtime.test.js  # Focused MCP/HTTP runtime behavior
│   ├── helpers.test.js
│   ├── server-utils.test.js
│   └── utils.test.js
├── docs/
│   ├── API-COVERAGE.md          # Generated 104-operation implementation/evidence ledger
│   ├── ARCHITECTURE.md           # Runtime boundaries and supported deployment topology
│   ├── DEPENDENCY-REVIEW.md      # Combined dependency and superseded-PR disposition record
│   ├── MCP-EVALUATION.md         # Generated tool-selection quality report
│   ├── MCP-TOOLSETS.md          # Generated exact catalog membership and scopes
│   ├── MIGRATING-TO-3.0.md      # All 87 legacy-name dispositions
│   ├── OPENAPI-UPDATE.md         # Contract replacement and provenance procedure
│   ├── RELEASE-READINESS.md      # Generated version-3 scope and gate reconciliation
│   ├── SETUP-GUIDE.md           # Client setup how-to
│   └── VERIFICATION.md          # Deterministic and guarded live verification policy
├── .env.example
├── Dockerfile
└── docker-compose.yml
```

---

## License

Released under the [MIT License](LICENSE) — see the `LICENSE` file for the full text.
