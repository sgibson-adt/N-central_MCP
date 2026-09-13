# Dependency and Dependabot Review

Review snapshot: 2026-09-13. This document records repository-local evidence only. No pull request
was merged, closed, rebased, or commented on during this review.

## Pre-update baseline

Environment: macOS 26.6.2 arm64, Node 24.13.0, npm 11.8.0.

| Gate | Result | Evidence |
|---|---|---|
| Mandatory tests | pass | 149 tests; 3.33 seconds wall time |
| ESLint | pass | `npm run lint` |
| TypeScript check | pass | `npm run type-check` |
| Production audit | fail | 6 packages: 3 high, 2 moderate, 1 low, 0 critical |
| Full audit | fail | 7 packages: 4 high, 2 moderate, 1 low, 0 critical |

The production findings are in `fast-uri`, `hono`, `ip-address`, `@hono/node-server`, `qs`, and
`body-parser`. The additional development finding is `brace-expansion`. All report a fix available;
the combined candidate must verify that they clear without forcing an unrelated major update.

## Proposal dispositions

All five proposals were open and GitHub reported them mergeable with successful Node 22/24 CI at
the initial review time. Their approved intent was reproduced in one combined candidate instead of
merging bot branches independently. At the final 2026-09-13 check, GitHub reported no open pull
requests. The five remote Dependabot branch refs still existed; they are stale branch cleanup, not
unmerged release content.

| PR | Proposal | Current change | Disposition | Rationale | Final validation |
|---:|---|---|---|---|---|
| [#39](https://github.com/theonlytruebigmac/n-central-rest-api-mcp/pull/39) | Dev dependency group | ESLint 10.4.0→10.8.0, eslint-plugin-n 18.0.1→18.2.2, globals 17.6.0→17.8.0 | include | Compatible minor updates; apply after the pre-update lint baseline. | included as ESLint 10.10.0, plugin 18.3.0, globals 17.12.0; lint passes on Node 22/24 |
| [#41](https://github.com/theonlytruebigmac/n-central-rest-api-mcp/pull/41) | `actions/checkout` | v4→v7 | include | v7 is the current proposal and uses the Node 24 action runtime. | included; Node 22/24 matrix retained |
| [#42](https://github.com/theonlytruebigmac/n-central-rest-api-mcp/pull/42) | MCP TypeScript SDK | 1.29.0→1.30.0 | include | Requested minor SDK update; guarded by real stdio/HTTP transport and structured-result regressions. | included at 1.30.0; stdio/HTTP/session/shutdown suites pass |
| [#43](https://github.com/theonlytruebigmac/n-central-rest-api-mcp/pull/43) | `actions/setup-node` | v4→v7 | include | Inputs used here remain supported; v7 moves the action runtime forward without changing the 22/24 test matrix. | included; explicit npm cache and Node matrix preserved |
| [#44](https://github.com/theonlytruebigmac/n-central-rest-api-mcp/pull/44) | Container Node | 22 Alpine→25 Alpine | reject / supersede | Node 25 reached end of life on 2026-03-31. Use Node 24 Alpine, the supported LTS line, instead. | superseded by Node 24 Alpine; non-root/startup/health smoke passes |

## Compatibility constraints

- Keep application CI on Node 22 and Node 24 until a separately reviewed support-policy change.
- Use Node 24 Alpine for the production container; do not adopt the EOL Node 25 image.
- Preserve non-root container execution and health/startup failure behavior.
- Do not weaken tests, lint, type-check, generated-document checks, or the high-severity audit gate.
- Apply the SDK update only with real stdio and Streamable HTTP discovery/call coverage, structured
  output validation, session handling, and clean shutdown evidence.

Primary upstream references: [Node.js release status](https://nodejs.org/en/about/previous-releases),
[`actions/checkout` changelog](https://github.com/actions/checkout/blob/main/CHANGELOG.md), and
[`actions/setup-node` v7 guidance](https://github.com/actions/setup-node).

## Audit remediation

After the SDK and lint-stack updates, `npm audit fix` was run without `--force`. It updated compatible
locked transitive packages, including `hono` 4.13.7, `@hono/node-server` 2.1.1, `fast-uri` 3.1.7,
`ip-address` 10.7.0, `qs` 6.16.0, `body-parser` 2.3.0, and `brace-expansion` 5.0.9. Both the
production-only and full-tree audits now report zero vulnerabilities. No direct dependency was
forced across an unreviewed major version.

## Final combined-candidate evidence

The combined dependency candidate passed mandatory tests, coverage, migration, toolset, evaluation,
lint, type-check, and the blocking high-severity audit on Node 22.23.2 and Node 24.21.0. The explicit
Node 24 image lifecycle smoke also passed. Both production and full audits report zero findings.

No external pull-request state, branch state, or comments were changed by this review.
