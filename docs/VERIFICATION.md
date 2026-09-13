# Verification Policy

The mandatory release gate is deterministic and uses synthetic fixtures:

```bash
npm run release:check
npm run test:container
```

It never requires an N-central tenant. In addition, a code change that can alter N-central request
construction, authentication/session behavior, response handling, composition, or public MCP
execution requires a one-off live check before merge.

## Credential-backed check

1. A maintainer supplies a temporary test token at verification time. Keep it outside source
   control and CI in the ignored `.env.live-test` file.
2. Start with `NC_WRITE_MODE=read-only`; do not place `RUN_LIVE_TESTS` in the file.
3. Run `npm run test:live:read-only`. The command opts in explicitly and performs four GET requests:
   health, session validation, server information, and one bounded service-organization page.
4. Retain only the emitted pass/fail names and response types. Never retain URLs, credentials,
   identifiers, record counts, names, response bodies, or arbitrary upstream error text.
5. Remove or rotate the temporary token after verification.

The script rejects execution unless the opt-in flag is set, the write mode is exactly `read-only`,
and both credential variables are present. A mutating scenario needs an explicitly approved
disposable fixture. A destructive scenario requires separate maintainer approval and is never part
of this smoke command.

## Current v3 evidence boundary

The release tasks contain redacted results from deterministic, container, and one-off live passes.
Write/destructive paths, credential-bearing Custom PSA behavior, and known-ID scheduled-task detail
remain deterministic-only where no approved disposable fixture or required integration credential
was available. These are disclosed limitations, not claims of live coverage.
