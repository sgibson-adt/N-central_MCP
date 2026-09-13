# Version 3 Release Gates

The implementation pull request may establish a ready candidate, but it must not create the release
tag. All pre-publication gates apply to one exact source revision.

## Pre-publication gates

| Gate ID | Required evidence | Blocking condition |
|---|---|---|
| `contract-integrity` | Valid authoritative contract; expected fingerprint, title/version, 84 paths, and 104 operations | Any mismatch or invalid document |
| `operation-closure` | 92 implemented, zero partial, 12 not implemented; exact 104 records | Any partial, missing, duplicate, or unexpected disposition |
| `unsupported-review` | Exact 12 unsupported keys with rationale, impact, disposition, and alternative | Missing field, public mapping, or unapproved extra exclusion |
| `preview-discovery` | Every public mapping to a preview operation contains a discovery warning | Preview operation is exposed without `PREVIEW` disclosure |
| `pagination-contract` | Valid explicit values forwarded unchanged; invalid values rejected before an upstream call | Silent clamping, wrong `-1` policy, or unbounded automatic retrieval |
| `core-catalog` | Exact twelve names/order; read-only default; no raw dispatcher | Name/order/count/default drift |
| `compatibility` | 87 mappings reconciled as 53 retained, 31 consolidated, 3 removed | Missing mapping, dangling alias, or inaccurate ticket-list alias present |
| `mcp-contracts` | All public tools, resources, and prompts have applicable discovery, schema, mapping, result, error, lifecycle, safety, and toolset evidence | Any public capability lacks applicable evidence |
| `security` | Authentication, tenant isolation, target validation, redaction, write gating, audit, retry, timeout, and concurrency checks | Any regression, secret, tenant data, or unreviewed credential path |
| `transport-parity` | Equivalent selected discovery/call behavior over stdio and Streamable HTTP | Undocumented transport difference |
| `provenance` | Every provenance fact known or explicitly unavailable with reason; fingerprint and declared metadata match | Blank fact, invented value, or mismatch |
| `documentation` | Coverage, migration, toolsets, README, setup, readiness, and version claims agree | Generated drift or contradictory counts/limitations |
| `selection-quality` | At least 95 percent top-three success; zero prohibited destructive selections | Threshold miss or prohibited selection |
| `supported-platforms` | Complete required suite passes on Node.js 22 and 24; production container smoke passes | Failure or unapproved skip |
| `static-quality` | Lint and type checks pass without suppression | Non-zero or ignored result |
| `dependency-security` | Full and production dependency audits have zero high-severity findings | High/critical finding or forced unreviewed update |
| `version-consistency` | Package, lockfile, server, migration, readiness record, and tag expectation all equal 3.0.0 | Any disagreement |
| `release-readiness` | Machine-readable scope validates and reconciles every gate above | Pending/failing gate or stale generated readiness report |

## Required aggregate command

Planning reserves `npm run release:check` as the complete pre-publication command. It must be
non-writing and fail when any required generated document is stale. CI and tag verification invoke
the same aggregate command so the release path cannot use weaker checks than the pull request.

Container execution may remain a separate job where a container runtime is required, but its result
is still mandatory for the same source revision.

## Maintainer approval

After the feature is merged and the post-merge checks pass, the maintainer reviews the generated
readiness report. Creating `v3.0.0` is the explicit approval action. Implementation scripts must not
create, move, or push the tag.

## Post-tag publication checks

| Check | Expected outcome |
|---|---|
| Tag integrity | `v3.0.0` points at the exact approved `main` revision and is never moved. |
| Re-verification | The aggregate release check passes again from the tagged source. |
| Image publication | `linux/amd64` and `linux/arm64` images publish under semantic aliases. |
| Artifact identity | The release records the immutable image digest. |
| Release record | One non-draft, non-prerelease version 3.0.0 release exists with generated notes. |
| Retry safety | A retry uses the same source/tag and leaves an already-created release unchanged. |

Publication failure does not authorize retagging different source. Correct the workflow through a
new reviewed commit and version if the immutable release identity cannot be safely retried.
