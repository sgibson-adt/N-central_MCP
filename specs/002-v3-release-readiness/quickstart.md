# Quickstart: Validate Version 3 Release Readiness

This guide validates the completed feature without creating or pushing a release tag.

## Prerequisites

- Checkout `002-v3-release-readiness` after implementation is complete.
- Use a supported Node.js 22.x or 24.x runtime with npm.
- Install a working container runtime for the mandatory image smoke check.
- Do not configure live N-central credentials; all mandatory behavior uses synthetic tenants.

## 1. Install the candidate exactly

```bash
npm ci
```

Expected: the lockfile installs without modification and the dependency audit later reports no high
or critical findings.

## 2. Verify the seven operation closures

```bash
node --test \
  test/contract/operations/devices.contract.test.js \
  test/contract/operations/organizations.contract.test.js \
  test/contract/operations/psa.contract.test.js \
  test/contract/operations/users-registration.contract.test.js \
  test/contract/mcp/all-capabilities.contract.test.js \
  test/contract/mcp/compatibility.contract.test.js \
  test/contract/mcp/core-composition.contract.test.js
```

Expected:

- Customer/site registration tokens and user-role/site-list tools disclose preview status.
- Valid page inputs are forwarded unchanged and invalid inputs fail before an upstream request.
- Device note options reach only the notes component.
- `search_psa_tickets` and `list_custom_psa_tickets` are not discoverable.
- `get_psa_ticket` remains available for known identifiers.

See [operation-closure.md](contracts/operation-closure.md) and
[mcp-v3-contract.md](contracts/mcp-v3-contract.md) for exact invariants.

## 3. Verify coverage and readiness records

```bash
npm run coverage:api:check
npm run migration:check
npm run release:readiness:check
```

Expected final coverage:

| Status | Count |
|---|---:|
| Implemented | 92 |
| Partially implemented | 0 |
| Not implemented | 12 |

Expected final migration dispositions:

| Disposition | Count |
|---|---:|
| Retained | 53 |
| Consolidated | 31 |
| Removed | 3 |

The readiness check also verifies the exact twelve-tool core, 12 unsupported-operation keys,
provenance availability, version identity, artifact architectures, and current generated readiness
document.

## 4. Run the aggregate pre-publication gate

```bash
npm run release:check
```

Expected: all behavioral, contract, generated-document, evaluation, lint, type, audit, and version
checks exit successfully without modifying the worktree.

Confirm determinism:

```bash
git status --short
npm run release:check
git status --short
```

Expected: both status outputs are identical and no generated artifact becomes stale.

## 5. Time the synthetic 2.x migration walkthrough

Give a reviewer only the README and migration guide, start a timer, and ask them to:

1. identify the default tool catalog and write mode;
2. choose the preferred version 3 catalog or the compatibility catalog;
3. write the required `NC_TOOLSETS` and `NC_WRITE_MODE` values for a synthetic 2.x deployment;
4. disposition `list_custom_psa_tickets` and identify the known-ID replacement; and
5. run `node --test test/contract/mcp/compatibility.contract.test.js`.

Expected: the walkthrough finishes in under 15 minutes, the compatibility contract passes, and no removed tool is advertised.

## 6. Run the production image smoke check

```bash
npm run test:container
```

Expected: the Node.js 24 Alpine image builds, reports the expected runtime, runs as a non-root user,
rejects invalid startup configuration, and passes its health/startup lifecycle assertions.

## 7. Verify the release is still withheld

```bash
git tag --list v3.0.0
gh release view v3.0.0
```

Expected before maintainer approval:

- The tag-list command prints nothing.
- The release lookup reports that no release exists.

Do not create the tag as part of this feature. After merge, the maintainer follows the
post-publication checks in [release-gates.md](contracts/release-gates.md) against the exact approved
revision.
