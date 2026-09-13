# MCP Version 3 Contract

## Default discovery

With toolset and write-mode configuration omitted, `tools/list` returns exactly these names in order:

1. `get_server_status`
2. `validate_session`
3. `get_current_user`
4. `search_organizations`
5. `get_organization_context`
6. `search_devices`
7. `get_device_context`
8. `list_active_issues`
9. `list_device_scheduled_tasks`
10. `get_scheduled_task_context`
11. `run_report`
12. `list_job_statuses`

All twelve are read-only. No default tool is destructive, mutating, or an unrestricted REST request
dispatcher. Optional toolsets and write modes retain the deterministic intersection defined by the
existing version 3 contract.

## Preview lifecycle discovery

- A tool mapped only to preview operations has `PREVIEW` in its description.
- A tool mapped to both stable and preview operations names the preview variant in its description.
- Lifecycle is asserted against operation metadata for every public tool, including compatibility
  aliases.
- Standard safety annotations remain unchanged; lifecycle disclosure does not overload
  `readOnlyHint`, `destructiveHint`, `idempotentHint`, or `openWorldHint`.

At minimum, discovery must disclose preview behavior for customer/site registration tokens,
customer-scoped site listing, user-role listing/detail/creation, and site creation.

## Pagination inputs

Public page inputs follow these rules:

| Input | Accepted | Rejected |
|---|---|---|
| `pageNumber` | Integer starting at 1 | Zero, negative, fractional, non-numeric, or non-finite values |
| `pageSize` on allow-all routes | `-1` or integers from 1 through 1,000 | Zero, less than `-1`, fractional, non-numeric, non-finite, or over 1,000 |
| `pageSize` on positive-only routes | Integers from 1 through 1,000 | `-1`, zero, negative, fractional, non-numeric, non-finite, or over 1,000 |
| `all` | Boolean | Non-boolean values |

Invalid pagination fails before an upstream request and reports the field plus accepted range.
Valid explicit inputs are forwarded unchanged. Automatic pagination remains bounded to 20 pages
and 10,000 records.

`get_device_context` adds an optional `noteOptions` object:

```json
{
  "pageNumber": 1,
  "pageSize": 100,
  "all": false
}
```

The object rejects unknown properties, is used only when `notes` is selected, and follows the
allow-all page-size policy. The `list_device_notes` compatibility transform maps compatible page
inputs into `noteOptions`.

## Custom PSA correction

- `search_psa_tickets` is absent from all toolsets.
- `list_custom_psa_tickets` is absent from compatibility discovery.
- `GET /api/custom-psa/tickets` is absent from all public operation mappings.
- `get_psa_ticket` remains available for a known ticket ID.
- The migration inventory marks `list_custom_psa_tickets` removed and explains that the upstream
  contract exposes only navigation links.

## Compatibility inventory

All 87 legacy names retain one final disposition:

| Disposition | Count |
|---|---:|
| Retained | 53 |
| Consolidated | 31 |
| Removed | 3 |

Every non-null compatibility name resolves to exactly one callable tool. Removed names resolve to no
tool. The correction above does not weaken write-mode filtering or restore the two previously
removed unsafe/inaccurate names.

## Result and safety invariants

- Curated tools return structured content plus readable text and retain operation provenance.
- Result payloads remain within the 256 KiB serialized ceiling.
- Optional component failures remain explicit and redacted.
- Registration-token tools remain classified as sensitive even though the upstream call is read-only.
- Toolset selection cannot elevate write authority.
- Stdio and Streamable HTTP return equivalent selected discovery and call contracts except for their
  documented authentication/session differences.
