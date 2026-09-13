# Updating the OpenAPI Baseline

`test/openapi-spec.json` is the authoritative repository snapshot. Do not replace it without also
recording its provenance and reconciling every operation disposition.

For each future import, record the exact source URL, UTC retrieval timestamp, and associated
N-central product version when it is known. Calculate the file's SHA-256 fingerprint after the
download and place those facts in the `source` object of
`test/contract/operation-coverage.json`. If a fact is genuinely unavailable, retain an explicit
`unavailable` status and reason rather than guessing or leaving it blank.

Then run:

```bash
node -e "const fs=require('node:fs'); JSON.parse(fs.readFileSync('test/openapi-spec.json','utf8'))"
npm run coverage:api
npm run release:readiness:generate
npm run release:check
```

Review added, removed, and changed operations before accepting regenerated Markdown. Update the
governing specification, operation tests, public capability mappings, limitations, and migration
guidance whenever the contract changes. A changed baseline invalidates the previous v3 readiness
decision until those checks reconcile again.

The current snapshot's source URL, retrieval timestamp, and product version were not supplied with
the file, so the coverage ledger records each as unavailable with a reason. Its repository receipt
date, OpenAPI version, operation count, path, and SHA-256 remain known.
