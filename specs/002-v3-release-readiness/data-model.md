# Data Model: Version 3 Release Readiness

This feature adds no runtime database or tenant state. Its data model consists of versioned release
contracts, existing operation/capability records, and derived verification results.

## Release Candidate

Represents the exact source state proposed for publication.

| Field | Type | Rules |
|---|---|---|
| `version` | semantic version string | Exactly `3.0.0` for this feature. |
| `tag` | string | Exactly `v3.0.0`; absent from the remote until pre-publication approval. |
| `sourceRevision` | derived commit identifier | Resolved at verification time and not persisted in the scope record; all artifacts must reference the same immutable revision. |
| `contract` | Contract Baseline | Must match the authoritative file and coverage manifest. |
| `operationClosures` | Operation Closure array | Exactly seven baseline partial-operation decisions. |
| `acceptedUnsupportedOperations` | operation-key array | Exactly 12 final unsupported operations with reviewed dispositions. |
| `defaultCatalog` | capability-name array | Exactly the twelve names in the frozen order. |
| `migration` | Migration Summary | Must reconcile all 87 reviewed 2.x names. |
| `provenance` | Provenance Record | Every fact is known or explicitly unavailable with a reason. |
| `requiredGates` | gate identifier array | Unique, non-empty, and reconciled with release verification. |
| `deferredItems` | Post-3.0 Feature array | Every deferred item has a stable ID, classification, and rationale. |
| `artifacts` | Publication Contract | Declares supported architectures and digest requirement. |

Relationships:

- Has one Contract Baseline and one Provenance Record.
- Contains seven Operation Closures drawn from that baseline.
- References 12 final unsupported Operation Dispositions.
- Freezes one default catalog and one Migration Summary.
- Is evaluated by many Evidence Gates.

## Contract Baseline

| Field | Type | Rules |
|---|---|---|
| `path` | repository-relative path | Must identify the single authoritative OpenAPI document. |
| `sha256` | lowercase hexadecimal string | Exactly 64 characters and equal to the file fingerprint. |
| `openapiVersion` | string | Equal to the document's declared OpenAPI version. |
| `title` | string | Equal to the document's declared contract title. |
| `contractVersion` | string | Equal to the document's declared contract version. |
| `pathCount` | integer | Exactly 84 for the current baseline. |
| `operationCount` | integer | Exactly 104 for the current baseline. |

Validation: a fingerprint, path count, operation count, or declared metadata change invalidates the
candidate and returns it to contract review.

## Operation Disposition

The existing coverage record remains authoritative for one method-and-path operation.

| Field | Type | Rules |
|---|---|---|
| `operationKey` | method plus path | Unique across all 104 records. |
| `lifecycle` | `stable` or `preview` | Derived from reviewed upstream metadata. |
| `status` | `implemented`, `partially-implemented`, or `not-implemented` | Final candidate contains zero partial records. |
| `verificationStatus` | `verified`, `unverified`, or `excluded` | Implemented records must be verified. |
| `exposure` | public or non-public disposition | Independent of implementation status. |
| `capabilities` | capability-name array | Must exactly match tool definitions; empty for final unsupported operations. |
| `gaps` | string array | Empty for implemented operations; non-empty for unsupported operations. |
| `rationale` | string | Required for non-public or unsupported behavior. |
| `userImpact` | string | Required when behavior is partial, missing, internal-only, or excluded. |
| `intendedDisposition` | string | Required for every final unsupported operation. |
| `safeAlternative` | string | Required when a supported route or MCP action can satisfy the user goal. |
| `testEvidence` | path array | Non-empty and resolvable for every implemented operation. |
| `sourceEvidence` | path array | Includes the authoritative contract and relevant implementation evidence. |

Final expected aggregate:

| Status | Count |
|---|---:|
| Implemented | 92 |
| Partially implemented | 0 |
| Not implemented | 12 |
| Total | 104 |

Final expected exposure aggregate:

| Exposure | Count |
|---|---:|
| Direct tool | 82 |
| Composed capability | 8 |
| Resource backed | 0 |
| Internal only | 7 |
| Excluded | 7 |
| Total | 104 |

## Operation Closure

Records how one of the seven baseline partial operations reached a final state.

| Field | Type | Rules |
|---|---|---|
| `operationKey` | operation identifier | Must be one of the seven keys fixed by this feature. |
| `baselineStatus` | string | Always `partially-implemented`. |
| `resolution` | `implemented` or `excluded` | Six expected implemented; Custom PSA root expected excluded. |
| `decision` | string | Explains the contract-accurate outcome without claiming unsupported behavior. |
| `evidence` | path array | At least one behavioral/contract test and one source or manifest artifact. |

Expected resolution count: six `implemented`, one `excluded`.

## Public Capability Contract

| Field | Type | Rules |
|---|---|---|
| `name` | string | Unique across selected tools. |
| `description` | string | Task-oriented; contains `PREVIEW` when any contributing operation is preview. |
| `inputSchema` | object schema | Rejects unknown fields and invalid operation-specific pagination values. |
| `outputSchema` | object schema | Curated capabilities retain structured data and metadata. |
| `operations` | operation-key array | Every key exists in the coverage inventory and is fully implemented for public tools. |
| `toolsets` | toolset-name array | Deterministic and valid. |
| `writeScope` | `read`, `write`, or `destructive` | Intersects with the configured write mode. |

Additional device-context rule: `noteOptions` is optional and may contain only `pageNumber`,
`pageSize`, and `all`; it affects only the notes component.

## Pagination Policy

| Field | Type | Rules |
|---|---|---|
| `maxPageSize` | positive integer | 1,000 for the version 3 MCP safety boundary. |
| `allowMinusOne` | boolean | True only when the operation documents `-1`. |
| `autoPageSize` | positive integer | No greater than `maxPageSize`. |
| `maxPages` | positive integer | 20. |
| `maxRecords` | positive integer | 10,000. |

Validation transitions:

- Missing page values -> omit them from the upstream query.
- Valid values -> forward unchanged.
- Non-integer, less-than-one page number, unsupported `-1`, zero page size, or values above the
  safety ceiling -> reject before any upstream request.
- `all: true` -> use bounded automatic pagination; it does not combine with caller page values.

## Compatibility Mapping and Migration Summary

Each of the 87 reviewed 2.x names has one mapping record.

| Field | Type | Rules |
|---|---|---|
| `legacyName` | string | Unique across 87 records. |
| `disposition` | `retained`, `consolidated`, or `removed` | Never null. |
| `replacement` | string or null | Required for retained/consolidated; null for removed. |
| `compatibilityTool` | string or null | Must resolve to a real tool when present. |
| `behaviorChanges` | string array | Describes migration-visible differences. |
| `removalRationale` | string or null | Required for removed names. |

Final expected counts after removing the inaccurate legacy ticket-list name:

| Disposition | Count |
|---|---:|
| Retained | 53 |
| Consolidated | 31 |
| Removed | 3 |
| Total | 87 |

## Provenance Fact and Provenance Record

A Provenance Fact prevents unknown information from being confused with missing review work.

| Field | Type | Rules |
|---|---|---|
| `status` | `known` or `unavailable` | Required. |
| `value` | string or null | Non-empty for `known`; null for `unavailable`. |
| `reason` | string or null | Non-empty for `unavailable`; omitted/null for `known`. |

The Provenance Record contains facts for original source, original retrieval time, associated
N-central product version, and repository receipt context. Document path, fingerprint, declared
version, title, counts, and review date remain known baseline fields.

## Evidence Gate

| Field | Type | Rules |
|---|---|---|
| `id` | stable identifier | Unique and referenced by the readiness record. |
| `category` | string | Contract, MCP, security, compatibility, documentation, dependency, platform, packaging, or publication. |
| `required` | boolean | True for all pre-publication gates in this feature. |
| `outcome` | `pending`, `pass`, or `fail` | Derived at verification time, never committed as durable proof. |
| `evidence` | command/result references | Produced for the exact candidate revision. |

Gate aggregation: any required `pending` or `fail` outcome makes the candidate not ready.

## Post-3.0 Feature

| Field | Type | Rules |
|---|---|---|
| `id` | stable identifier | Unique, lowercase, and suitable for later specification tracking. |
| `classification` | `additive-3.x`, `security-specification`, or `compatibility-design` | Identifies why the item does not block 3.0. |
| `rationale` | string | Explains both user value and why deferral preserves the frozen contract. |

Validation: every roadmap item discussed during release review appears exactly once. SSO and remote
logout require security specifications; additive operation coverage uses `additive-3.x`; any future
incompatible contract proposal uses `compatibility-design`.

## Release State Transitions

```text
draft
  -> under-review
  -> ready
  -> approved/tagged
  -> publishing
  -> published
              \-> publication-failed -> publishing (same source/tag only)
```

- `draft -> under-review`: implementation and targeted evidence exist.
- `under-review -> ready`: all pre-publication gates pass for one source revision.
- `ready -> approved/tagged`: maintainer explicitly approves and creates the immutable tag.
- `approved/tagged -> publishing`: tag-driven publication begins and repeats release verification.
- `publishing -> published`: all documented artifacts and immutable digest exist.
- `publishing -> publication-failed`: any artifact or release-record step fails.
- `publication-failed -> publishing`: retry is allowed only for the same tag and source revision.
- Any contract, default-surface, migration, safety, dependency, or documentation change before tag
  returns `ready` to `under-review` and invalidates prior results.
