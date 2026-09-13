# Quickstart: Validate API Coverage and the Curated MCP

This is the expected validation flow after implementation. Mandatory commands never call a live
N-central tenant or a model API.

## Prerequisites

- A supported Node.js release (22.13+ or 24.x)
- npm
- Docker for the optional container smoke test
- No `.env`, N-central JWT, reachable N-central server, Codex, Copilot, or Claude installation is
  required for mandatory checks

## 1. Install Locked Dependencies

```bash
npm ci
```

Expected: installation completes without changing `package-lock.json`; Ajv and `ajv-formats` are
available only through development dependencies.

## 2. Validate the OpenAPI Inventory and Coverage Report

```bash
npm run coverage:api:check
```

Expected:

- `test/openapi-spec.json` parses as OpenAPI 3.0.1.
- Exactly 104 unique method/path operations are found.
- Every operation has one coverage status and one primary exposure disposition.
- Public mappings, exclusions, rationales, and evidence satisfy the coverage schema.
- `docs/API-COVERAGE.md` matches deterministic generated output.

To intentionally refresh reviewed output:

```bash
npm run coverage:api
git diff -- docs/API-COVERAGE.md test/contract/operation-coverage.json
```

## 3. Verify the Internal Operation Layer

```bash
npm run test:operations
```

Expected: every supported operation's accepted inputs, captured HTTP method/path/query/body, result,
error, retry classification, and exposure disposition pass using synthetic fixtures. Excluded
operations are reconciled but never called.

## 4. Verify MCP Catalogs and Calls

```bash
npm run test:mcp
```

Expected:

- Default discovery returns the twelve reviewed core tools and no write/destructive tool.
- Input/output schemas, structured results, readable content, annotations, mappings, and composition
  limits pass.
- Valid toolset unions are deterministic and de-duplicated.
- Unknown/malformed toolsets fail closed.
- Write-mode filtering never expands toolset membership or authority.
- Stdio and Streamable HTTP behavior agree where transport semantics permit.

Focused toolset cases can be run with:

```bash
NC_TOOLSETS=core NC_WRITE_MODE=read-only npm run test:mcp
NC_TOOLSETS=core,psa NC_WRITE_MODE=read-only npm run test:mcp
NC_TOOLSETS=operations NC_WRITE_MODE=write npm run test:mcp
NC_TOOLSETS=operations NC_WRITE_MODE=full npm run test:mcp
NC_TOOLSETS=compatibility NC_WRITE_MODE=read-only npm run test:mcp
```

## 5. Run Tool Selection and Safety Evaluation

```bash
npm run test:evaluation
npm run evaluation:check
```

Expected:

- At least 40 reviewed cases run.
- Expected tools rank within the top three for at least 95% of ordinary/ambiguous cases.
- No prohibited destructive tool is accepted.
- Hidden tools never appear as candidates.
- Default tool-definition bytes are at least 60% below the 55,858-byte baseline.
- `docs/MCP-EVALUATION.md` matches the generated offline results.

## 6. Run All Mandatory Quality Gates

```bash
npm test
npm run lint
npm run type-check
npm audit --audit-level=high
```

Expected: every command exits zero on Node 22 and Node 24. Behavioral tests make no external network
requests; installation and audit may use the configured npm registry.

## 7. Measure Performance Budgets

```bash
/usr/bin/time -p npm run coverage:api:check
/usr/bin/time -p npm test
```

Expected on the reference CI runner:

- Coverage check completes in under 5 seconds.
- Complete mandatory test suite completes in under 60 seconds.

Record the observed environment and durations in `docs/MCP-EVALUATION.md`; do not weaken thresholds
to hide a regression.

Reference observation on 2026-09-13: macOS 26.6.2 arm64, Node 24.13.0, npm 11.8.0;
`coverage:api:check` completed in 0.24 seconds and `npm test` completed in 3.33 seconds.

## 8. Verify Migration Evidence

```bash
npm run migration:check
```

Expected: every one of the 87 current tool names has exactly one migration record. Retained names
appear in preferred toolsets, displaced aliases delegate through the compatibility layer, deprecated
descriptions identify the preferred replacement, and removed entries have explicit rationale.

## 9. Optional Container Smoke Test

```bash
docker build -t ncentral-mcp:3.0-candidate .
docker run --rm ncentral-mcp:3.0-candidate node --version
```

Expected: the image builds from Node 24 Alpine, reports Node 24, runs as non-root, and passes the
documented health smoke test.

## 10. Optional Client Smoke Matrix

When Codex, GitHub Copilot, or Claude is available, connect with `core`/`read-only` and run the five
scenario groups in `contracts/selection-evaluation.md`. Record only observed client/version,
selected tool, argument validity, and outcome in `docs/MCP-EVALUATION.md`. Missing clients are marked
not run and do not block release.

## 11. Release Review

Before changing version metadata, confirm:

- Coverage reads 104 operations with no unapproved gaps or exclusions.
- Core contains at most 20 tools and all catalog/evaluation thresholds pass.
- All 87 legacy tools have migration dispositions.
- All Dependabot proposals have reviewed repository-local dispositions; no external PR was changed
  without explicit maintainer approval.
- README, setup, coverage, toolset, migration, and evaluation documentation agree.
- Spec Kit analysis reports no CRITICAL/HIGH finding and convergence finds no required work.
- The package, lockfile, server, and release guidance are updated to 3.0.0 only after all prior gates.

After applying the final metadata change, run the non-writing consistency check:

```bash
npm run version:check -- 3.0.0
```

Expected: package, lockfile, and server metadata all report 3.0.0 and the command does not modify files.
