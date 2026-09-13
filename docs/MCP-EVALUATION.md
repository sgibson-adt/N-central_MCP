# MCP Tool Selection Evaluation

## Offline deterministic results

- Cases: 40
- Ordinary/ambiguous cases: 24
- Top-one success: 83.3%
- Top-three success: 100.0%
- Prohibited accepted choices: 0
- Hidden candidates: 0
- Evaluator: local weighted lexical ranking (no model API or network)

## Performance budget observation

Measured 2026-09-13 on macOS 26.6.2 arm64 with Node 24.13.0 and npm 11.8.0.

| Gate | Budget | Observed wall time | Result |
|---|---:|---:|---|
| `npm run coverage:api:check` | <5 seconds | 0.24 seconds | pass |
| `npm test` | <60 seconds | 3.33 seconds | pass |

## Optional client smoke matrix

| Client | Status |
|---|---|
| Codex | not run |
| GitHub Copilot | not run |
| Claude | not run |
