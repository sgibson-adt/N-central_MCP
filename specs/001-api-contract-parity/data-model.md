# Data Model: API Coverage and Curated MCP

The feature adds versioned contract, catalog, migration, and evaluation metadata. It does not add
runtime persistence.

## OpenAPI Operation

Represents one upstream API contract.

| Field | Meaning | Validation |
|---|---|---|
| `key` | Uppercase method plus normalized path | Unique across the 104-operation baseline |
| `method` | HTTP method | `GET`, `POST`, `PUT`, `PATCH`, or `DELETE` for this baseline |
| `path` | OpenAPI path template | Begins with `/api`; variables match declared path parameters |
| `operationId` | Upstream identifier | May be absent; never the primary key |
| `tag` | OpenAPI functional area | Matches the source contract |
| `parameters` | Path/query/header inputs | Requiredness and schemas come from OpenAPI |
| `requestBody` | Request fields/schema | Preserves requiredness and nested references |
| `lifecycle` | Stable, preview, or deprecated | Derived from explicit contract metadata/text and reviewed |

## Operation Adapter

Represents one internal, contract-shaped function over the common N-central client.

| Field | Meaning | Validation |
|---|---|---|
| `name` | Stable internal function name | Unique within its domain module |
| `operationKey` | OpenAPI operation implemented | Resolves to exactly one operation |
| `inputContract` | Normalized parameters/body | Contains no MCP-only formatting choices |
| `outputContract` | Material upstream result | Preserves documented semantics and reviewed quirks |
| `retryClass` | Read/replay-safe or non-retryable | Agrees with client policy and operation impact |
| `evidence` | Synthetic contract cases | Required before adapter is considered verified |

## MCP Capability

Represents a public tool, resource, or prompt, or an internal-only capability used by MCP behavior.

| Field | Meaning | Validation |
|---|---|---|
| `name` | Public or internal capability name | Unique within capability type |
| `type` | Tool, resource, prompt, or internal | Fixed enumeration |
| `purpose` | One user goal | Must be distinct from other tools in the same toolset |
| `writeScope` | Read, write, or destructive | Agrees with annotations and mode visibility |
| `inputSchema` | Accepted inputs | Complete requiredness, enums, bounds, and descriptions |
| `outputSchema` | Structured result contract | Required for curated tools |
| `operations` | Contributing operation keys | Empty only for derived MCP-only behavior |
| `limits` | Calls, pages, concurrency, and result size | Required for composed/list capabilities |
| `partialFailurePolicy` | Component failure behavior | Required when more than one operation contributes |
| `toolsets` | Named catalogs containing the capability | At least one for tools; deterministic |
| `lifecycle` | Preferred, deprecated, or removed | Deprecated requires replacement/migration mapping |

## Coverage Record

Joins exactly one OpenAPI operation to its implementation, preferred exposure, mappings, and evidence.

| Field | Meaning | Validation |
|---|---|---|
| `operationKey` | OpenAPI operation foreign key | Exactly one record per baseline operation |
| `status` | Implemented, partially implemented, or not implemented | Uses reviewed objective criteria |
| `verificationStatus` | Unverified, verified, or excluded | Verified requires test evidence; excluded only with excluded exposure |
| `exposure` | Direct tool, composed capability, resource-backed, internal-only, or excluded | Exactly one preferred disposition |
| `capabilities` | All MCP mappings, including compatibility mappings | Required for public dispositions; may contain more than one |
| `gaps` | Material divergence list | Empty only when implemented |
| `rationale` | Status/exposure explanation | Non-empty for partial, missing, internal-only, or excluded records |
| `testEvidence` | Test identifiers/files | Required for verified supported records |
| `sourceEvidence` | Code/docs references | At least one repository path |

Preferred exposure is independent from additional mappings. For example, an operation may be
`composed-capability` because that is the supported user path while also appearing through a
deprecated compatibility tool. Compatibility mappings do not change the preferred disposition.

### Coverage State Transitions

```text
not implemented -> partially implemented -> implemented
       |                    |                    |
       +--------------------+--------------------+-> excluded

unverified -> verified
     |
     +------> excluded (only when exposure is excluded)
```

- Implemented requires no known material gaps.
- Verified requires passing internal operation evidence and any applicable MCP evidence.
- Excluded requires `status=not-implemented`, `verificationStatus=excluded`, no capability mappings,
  and a non-empty rationale.
- A contract change can move a record back to partial/unverified.

## Toolset

Represents a selectable group of tool capabilities.

| Field | Meaning | Validation |
|---|---|---|
| `name` | Configuration identifier | One of `core`, `operations`, `administration`, `psa`, `reporting`, `compatibility` |
| `description` | Intended role/workflow | Non-empty and documented publicly |
| `default` | Selected when configuration is omitted | True only for `core` |
| `members` | Ordered tool names | Unique, deterministic, and all resolve to capabilities |
| `maximumScope` | Greatest possible member write scope | Informational; never overrides write mode |

### Toolset Selection State

```text
raw NC_TOOLSETS
      |
      +-- omitted/blank --> {core}
      |
      +-- valid names ----> normalized de-duplicated set
      |
      +-- unknown name ---> configuration error; no server startup

selected union ∩ active write mode = advertised tools
```

## Compatibility Mapping

Represents the migration disposition for one of the 87 existing tool names.

| Field | Meaning | Validation |
|---|---|---|
| `legacyName` | Existing 2.x public name | Exactly one record per current tool |
| `disposition` | Retained, consolidated, deprecated, or removed | Fixed enumeration |
| `replacement` | Preferred 3.0 capability | Required unless no safe equivalent exists |
| `compatibilityTool` | Name exposed when compatibility is selected | Required for retained/consolidated/deprecated entries; null only for removed entries |
| `behaviorChanges` | Input/output/safety differences | Non-empty when behavior is not identical |
| `removalRationale` | Why no safe adapter exists | Required only for removed entries |

## Selection Evaluation Case

| Field | Meaning | Validation |
|---|---|---|
| `id` | Stable fixture identifier | Unique |
| `prompt` | Synthetic representative user goal | Contains no tenant data or credentials |
| `enabledToolsets` | Catalog under evaluation | Valid named toolsets |
| `writeMode` | Active permission level | Read-only, write, or full |
| `expectedTools` | Intended top candidates | Non-empty for ordinary cases |
| `allowedAlternatives` | Acceptable secondary choices | Resolve to advertised capabilities |
| `prohibitedTools` | Capabilities that must not be selected | Includes unsafe/destructive choices where relevant |
| `argumentExpectations` | Required/forbidden argument characteristics | Validated separately from lexical ranking |
| `caseType` | Ordinary, ambiguous, invalid-input, permission, or destructive-negative | Fixed enumeration |

## Contract Test Case

| Field | Meaning | Validation |
|---|---|---|
| `target` | Operation adapter or MCP capability | Resolves to a known target |
| `input` | Synthetic operation/MCP arguments | Contains no real identifiers or credentials |
| `expectedRequests` | Ordered method/path/query/body calls | Matches OpenAPI transformations and composition bounds |
| `mockResponses` | Synthetic upstream results/errors | Deterministic and network-free |
| `expectedResult` | Structured/text result or error | Conforms to target contract and redaction policy |
| `tenant` | Synthetic tenant identity | Supports isolation/interleaving checks |

## Dependency Update Proposal

| Field | Meaning | Validation |
|---|---|---|
| `pr` | Dependabot PR number/URL | One of the reviewed open proposals |
| `target` | Package, action, or image | Matches proposal diff |
| `proposedVersion` | Dependabot target | Recorded even if superseded |
| `disposition` | Include, supersede, defer, or reject | Required before release |
| `selectedVersion` | Final release target | Required for include/supersede |
| `evidence` | Compatibility, CI, audit, and lifecycle results | Required for final disposition |
| `externalAction` | Recommended close/comment/leave-open action | Recommendation only until maintainer approval |

## Release Candidate

Aggregates the coverage manifest, operation evidence, tool catalogs, migration map, evaluations,
documentation, dependencies, and version proposal. It moves from `draft` to `validated` only when
every release gate passes, then to `versioned` when 3.0.0 metadata is applied. Any later source,
catalog, contract, or lockfile change returns it to `draft`.
