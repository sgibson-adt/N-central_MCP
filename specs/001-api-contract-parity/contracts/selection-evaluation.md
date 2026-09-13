# Tool Selection Evaluation Contract

## Purpose

The evaluation checks whether curated names and descriptions make the intended capability easy to
find while preventing unsafe choices. It supplements protocol and handler tests; it does not claim to
measure every model or MCP client.

## Fixture Contract

`test/evaluation/tool-selection-cases.json` contains synthetic cases with:

- `id`: unique stable identifier.
- `prompt`: representative user wording with no tenant data.
- `enabledToolsets`: valid toolset selection.
- `writeMode`: `read-only`, `write`, or `full`.
- `caseType`: `ordinary`, `ambiguous`, `invalid-input`, `permission`, or
  `destructive-negative`.
- `expectedTools`: one or more intended candidates for ordinary/ambiguous cases.
- `allowedAlternatives`: acceptable secondary choices.
- `prohibitedTools`: choices that must not be accepted.
- `argumentExpectations`: required concepts and explicitly forbidden values/fields.

The initial suite contains at least 40 cases:

- At least 20 common core goals.
- At least 8 plausible-confusion cases involving similar domains.
- At least 4 invalid-input cases.
- At least 4 insufficient-permission cases.
- At least 4 destructive-negative cases.

Every core tool appears as an expected tool in at least two cases. Every destructive tool appears in
at least one prohibited or permission case.

## Deterministic Ranking

The local evaluator normalizes lowercase words from the prompt and each advertised tool's name,
description, and parameter names/descriptions. It scores exact name terms, description terms, and
parameter terms using one documented weight table and deterministic tie-breaking by tool name. Terms
listed as negative for a capability subtract from its score. The implementation may improve the
formula only when the baseline and all fixture expectations are reviewed together.

Pass conditions:

- An expected tool ranks within the top three in at least 95% of ordinary and ambiguous cases.
- A prohibited tool is never reported as an accepted match.
- No tool hidden by the selected toolsets or write mode appears among candidates.
- Invalid-input cases identify the expected missing/conflicting argument rule.
- The command exits non-zero on threshold, safety, catalog, or fixture-schema failure.

The report records case counts, top-one and top-three rates, prohibited-choice count, serialized
catalog sizes, and duration. The comparable catalog-size projection is the UTF-8 byte length of
`JSON.stringify` over the ordered `{name, description, inputSchema}` fields; handlers and internal
scope metadata are excluded from both the 55,858-byte baseline and the new measurement. Full
advertised definition bytes, including output schemas and annotations, are reported separately but
do not replace that stable comparison. Mandatory evaluation must complete without a model API or
network.
The evaluator owns a clearly delimited offline-results block in `docs/MCP-EVALUATION.md`; generation
updates only that block and `--check` compares it deterministically. The optional client-smoke section
is preserved outside the generated block and is not treated as generated CI evidence.

## Optional Client Smoke Matrix

`docs/MCP-EVALUATION.md` may record observed smoke runs for Codex, GitHub Copilot, and Claude. Each
entry includes client/version, selected toolsets, write mode, prompt case IDs, selected tools,
argument validity, result, and date. Missing client software is recorded as not run, not fabricated
or treated as a CI failure.

At minimum, a completed client smoke run exercises:

1. One device search/context workflow.
2. One organization search/context workflow.
3. One monitoring or report workflow.
4. One hidden write capability in read-only mode.
5. One explicitly approved write or destructive capability when a safe synthetic transport is used.
