# MCP Toolset Contract

## Configuration

`NC_TOOLSETS` is a comma-separated list of case-insensitive toolset names. Surrounding whitespace is
ignored, repeated names are de-duplicated, and advertised tools always use deterministic name order.

| Input | Result |
|---|---|
| Variable omitted or blank | Select `core` |
| `core,psa` | Select the union of `core` and `psa` |
| `CORE, core` | Select `core` once |
| Unknown name | Startup fails with the unknown name and allowed values |
| Empty interior item such as `core,,psa` | Startup fails as malformed |

`NC_WRITE_MODE` defaults to `read-only` in 3.0. Toolset membership is intersected with the active
write mode after the selected union is built:

| Write mode | Visible member scopes |
|---|---|
| `read-only` | read |
| `write` | read, write |
| `full` | read, write, destructive |

Toolsets determine relevance and visibility. They never bypass write scope, sensitive-call auditing,
tenant isolation, or transport authentication.

## `core` — Default

Purpose: common read-oriented N-central tasks with the smallest portable discovery surface.

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

All core tools are read scope. The core catalog may grow only through reviewed specification and
selection evidence and may never exceed 20 tools in the 3.x line.

## `operations` — Opt In

Purpose: device lifecycle, notes, scheduled work, maintenance, software delivery, service control,
and remote-control workflows.

- `create_device`
- `delete_device`
- `update_device_lifecycle`
- `patch_device_lifecycle`
- `get_appliance_task`
- `add_device_note`
- `add_notes_bulk`
- `update_device_note`
- `delete_device_note`
- `delete_device_notes`
- `create_scheduled_task`
- `create_maintenance_windows`
- `update_maintenance_windows`
- `delete_maintenance_windows`
- `perform_windows_service_action`
- `get_remote_control_type`
- `create_remote_control_task`
- `get_device_activation_key`
- `get_software_installers`
- `generate_software_download_link`
- `generate_patch_comparison_report`

Deletes, service actions, direct task execution, and remote-control setup are destructive. The
remaining mutations are write scope; status/type/installers may remain read scope despite belonging
to this workflow group.

## `administration` — Opt In

Purpose: organization lifecycle, limits, custom properties, users, roles, access groups, and
registration credentials.

- `get_org_unit_limits`
- `update_org_unit_limits`
- `create_service_org`
- `create_customer`
- `create_site`
- `list_device_custom_properties`
- `get_device_custom_property`
- `list_org_custom_properties`
- `get_org_unit_property`
- `get_org_custom_property_default`
- `get_device_default_custom_property`
- `update_device_custom_property`
- `update_org_unit_custom_property`
- `update_org_custom_property_default`
- `list_users`
- `list_user_roles`
- `get_user_role`
- `list_access_groups`
- `get_access_group`
- `create_user_role`
- `create_access_group`
- `create_device_access_group`
- `get_registration_token`

Registration and user/access data are sensitive even where read-scoped and retain redacted audit
coverage.

## `psa` — Opt In

Purpose: PSA discovery, mappings, credential validation, and custom ticket workflows.

- `get_psa_customer_mapping`
- `validate_psa_credential`
- `search_psa_tickets`
- `get_psa_ticket`
- `create_psa_ticket`
- `resolve_psa_ticket`
- `reopen_psa_ticket`
- `list_psa_customer_mappings`
- `update_psa_customer_mappings`
- `list_psa_companies`
- `list_psa_company_contacts`
- `list_psa_company_sites`

Credential inputs and results must be redacted from audit logs and errors regardless of write scope.

## `reporting` — Opt In

Purpose: specialized, multi-operation reporting beyond the bounded core `run_report` choices.

- `report_devices_bulk`
- `report_all_users_by_service_org`
- `report_devices_by_service_org`
- `report_customer_site_summary`
- `report_org_hierarchy`
- `list_device_filters`

All reporting members are read scope. Patch-comparison generation is an ordinary write in
`operations`; retrieving its finished report may remain read-only in `reporting` or the bounded core
`run_report` contract.

## `compatibility` — Opt In and Deprecated

Purpose: recreate the safely supportable 2.x catalog for migration. Membership is the deterministic
set of retained, consolidated, or deprecated records whose mapping has a non-null
`compatibilityTool`. Retained names reference the same preferred definitions and are not deprecated;
displaced aliases use compatibility adapters. Membership is derived from the reviewed 87-record
migration inventory, not inferred from whatever source files happen to export.

Rules:

- Selecting `compatibility` alone does not implicitly select `core`.
- Names shared with another selected toolset are registered once.
- Every consolidated/deprecated alias description begins with a deprecation notice and names the
  preferred replacement; retained member descriptions remain preferred and non-deprecated.
- Compatibility members delegate to shared operation adapters or curated capabilities.
- A removed mapping is never registered.
- Compatibility membership is frozen for 3.0 except for safety fixes; future removal requires a
  separately approved major release.
