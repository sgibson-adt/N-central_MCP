# Release Gates

The release candidate cannot be versioned or opened for merge until every mandatory gate passes.

| Gate | Required evidence |
|---|---|
| OpenAPI integrity | Valid JSON/OpenAPI, reviewed fingerprint/provenance, and 104 unique operations |
| Coverage reconciliation | One record per operation; coverage and primary exposure totals reconcile with generated Markdown |
| Operation evidence | Every supported operation has passing method/path/parameter/payload/result/error tests at the adapter boundary |
| Exclusion review | Five link indexes and SSO have rationale/alternatives; any additional exclusion is explicitly approved |
| Core catalog | Exactly the reviewed core members, no more than 20 tools, deterministic order, no raw dispatcher |
| Definition budget | Default serialized definitions are at least 60% smaller than the 55,858-byte baseline |
| Toolset behavior | Valid selections, overlap de-duplication, malformed/unknown rejection, and write-mode intersections pass |
| MCP contracts | Tools/resources/prompts have applicable registration, contract, mapping, and result tests; curated tools also have output schemas and structured results |
| Selection quality | At least 40 cases; >=95% top-three success; zero prohibited destructive selections |
| Composition safety | Calls, pages, concurrency, result size, and partial failures remain within documented bounds |
| Security | Tenant isolation, path validation, secret redaction, default read-only mode, write gating, destructive annotations, and audit pass |
| Transport parity | Stdio and Streamable HTTP advertise and execute equivalent selected catalogs except documented auth/session differences |
| Runtime matrix | Complete mandatory suite passes on Node 22 and Node 24 |
| Static quality | Lint and type-check exit zero and cannot continue on error in CI |
| Dependency security | Included updates are documented and the mandatory audit threshold exits zero |
| Container | Node 24 Alpine image builds, runs as non-root, and passes its health smoke check |
| Migration | All 87 existing names have retained/consolidated/deprecated/removed mappings and compatibility tests where applicable |
| Documentation | README, setup guide, API coverage, toolsets, evaluation, migration, counts, and limitations agree |
| Performance | Measured coverage check <5 seconds and complete mandatory suite <60 seconds in the reference CI run |
| Spec Kit | Analyze has no CRITICAL/HIGH inconsistency; implementation convergence leaves no required task |
| Version | Package, lockfile, server metadata, and release guidance consistently identify 3.0.0; bump occurs last and `npm run version:check -- 3.0.0` exits zero without writing files |

## Dependabot Follow-Up Plan

- Prepare exact closure/comment recommendations for PRs #39, #41, #42, and #43 after their reviewed
  intents are present in the release PR and combined checks pass.
- Recommend closing PR #44 as rejected/superseded, with the release PR pointing to Node 24 LTS rather
  than EOL Node 25.
- Do not merge, close, comment on, or otherwise mutate any Dependabot PR without explicit maintainer
  approval at the time of the external action.
- Do not merge a bot branch directly into the feature worktree; reproduce approved changes in the
  tested release candidate and retain attribution in the dependency review.
