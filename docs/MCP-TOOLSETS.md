# MCP Toolsets

Toolsets control relevance and discovery; write mode independently controls authority. Names are case-insensitive, comma-separated, de-duplicated, and advertised in deterministic order.

```dotenv
NC_TOOLSETS=core,reporting
NC_WRITE_MODE=read-only
```

Omitting both variables selects `core` and `read-only`. `NC_TOOLSETS=all` expands to the five preferred v3 catalogs (`core`, `operations`, `administration`, `psa`, and `reporting`) and intentionally excludes `compatibility`; use `all,compatibility` only for legacy-name migration. Valid write modes are `read-only`, `write`, and `full`; destructive tools appear only in `full`.

## `core` (12)

| Tool | Scope | Description |
|---|---|---|
| `get_server_status` | read | Check N-central service health and API version, optionally including the server clock. |
| `validate_session` | read | Confirm that the current authenticated N-central API session is valid without returning token material. |
| `get_current_user` | read | Return compact current-user identity and authorization context, or explicit full profile detail. |
| `search_organizations` | read | Find service organizations, customers, sites, or organization units by human name or bounded filtering and pagination. Customer-scoped site listing is PREVIEW and may change. |
| `get_organization_context` | read | Load compact organization details plus selected bounded children, limits, and custom-property context. Request full/all explicitly. |
| `search_devices` | read | Search the global or organization-scoped N-central device inventory by human name or bounded filters and pagination. |
| `get_device_context` | read | Load a device plus selected monitoring, asset, lifecycle, note, custom-property, and task context. |
| `list_active_issues` | read | List current active monitoring issues for a customer or site (service-org scope is unsupported), with bounded pagination and a compact default projection. Use detailLevel=full only when complete upstream records are required. |
| `list_device_scheduled_tasks` | read | List scheduled tasks associated with one N-central device. |
| `get_scheduled_task_context` | read | Load a scheduled-task definition and optionally its aggregate or per-device execution status. |
| `run_report` | read | Run one reviewed read-only report adapter; arbitrary REST methods or paths are not accepted. |
| `list_job_statuses` | read | List asynchronous N-central job statuses with local filtering, bounded pagination, and a compact default projection. |

## `operations` (21)

| Tool | Scope | Description |
|---|---|---|
| `create_device` | write | Create a managed N-central device from a validated device request. |
| `delete_device` | destructive | Permanently delete one managed device, optionally uninstalling its agents. |
| `update_device_lifecycle` | write | Replace all asset lifecycle and warranty fields for one device. |
| `patch_device_lifecycle` | write | Partially update asset lifecycle and warranty fields for one device. |
| `get_appliance_task` | read | Retrieve appliance-task status and details by task identifier. |
| `add_device_note` | write | Add canonical note content to one device. |
| `add_notes_bulk` | write | Add canonical note content to a non-empty list of devices. |
| `update_device_note` | write | Replace one existing device note using its note identifier. |
| `delete_device_note` | destructive | Permanently delete one explicitly identified device note. |
| `delete_device_notes` | destructive | Permanently delete a non-empty explicit set of note IDs from one device. |
| `create_scheduled_task` | destructive | Execute a direct Automation Policy, Script, or MacScript on a managed endpoint. |
| `create_maintenance_windows` | write | Create explicit patch-maintenance windows for selected devices. |
| `update_maintenance_windows` | write | Update maintenance windows identified by schedule IDs in their nested payloads. |
| `delete_maintenance_windows` | destructive | Permanently delete an explicit non-empty list of maintenance-window schedule IDs. |
| `perform_windows_service_action` | destructive | Start, stop, pause, resume, or restart named Windows services on a managed endpoint. |
| `get_remote_control_type` | read | Retrieve the configured remote-control technology for one device. |
| `create_remote_control_task` | destructive | Create a remote-control session task for one managed endpoint. |
| `get_device_activation_key` | read | Generate an activation key for one managed device. |
| `get_software_installers` | read | List software installers available to one customer. |
| `generate_software_download_link` | write | Generate a customer-scoped software installer download link. |
| `generate_patch_comparison_report` | write | Submit a patch-comparison report generation request. |

## `administration` (23)

| Tool | Scope | Description |
|---|---|---|
| `get_org_unit_limits` | read | Retrieve licensing and usage limits for one organization unit. |
| `update_org_unit_limits` | write | Patch selected licensing and usage limits for one organization unit. |
| `create_service_org` | write | Create a service organization with its required contact details. |
| `create_customer` | write | Create a customer beneath an explicitly identified service organization. |
| `create_site` | write | PREVIEW: Create a site through the customer-site API; its contract may change. |
| `list_device_custom_properties` | read | List custom-property values assigned to one device. |
| `get_device_custom_property` | read | Retrieve one custom property assigned to one device. |
| `list_org_custom_properties` | read | List organization custom properties with bounded pagination. |
| `get_org_unit_property` | read | Retrieve one organization-unit custom property. |
| `get_org_custom_property_default` | read | Retrieve one organization custom-property default. |
| `get_device_default_custom_property` | read | Retrieve one inherited device custom-property default. |
| `update_device_custom_property` | write | Update one device custom-property value using its existing schema fields. |
| `update_org_unit_custom_property` | write | Update one organization-unit custom-property value. |
| `update_org_custom_property_default` | write | Update and optionally propagate an organization custom-property default. |
| `list_users` | read | List users visible beneath one organization unit. |
| `list_user_roles` | read | PREVIEW: List user roles for one organization unit; this contract may change. |
| `get_user_role` | read | PREVIEW: Retrieve one user role by organization and role IDs; this contract may change. |
| `list_access_groups` | read | List access groups assigned beneath one organization unit. |
| `get_access_group` | read | Retrieve one access group by its identifier. |
| `create_user_role` | write | PREVIEW: Create a user role beneath one organization unit; this contract may change. |
| `create_access_group` | write | Create an organization-unit access group. |
| `create_device_access_group` | write | Create a device-scoped access group beneath one organization unit. |
| `get_registration_token` | read | Retrieve a sensitive registration token. The site and customer variants are PREVIEW and may change; the organization-unit variant is stable. |

## `psa` (11)

| Tool | Scope | Description |
|---|---|---|
| `get_psa_customer_mapping` | read | Retrieve the canonical Standard PSA mapping for one customer. |
| `validate_psa_credential` | write | Validate sensitive Standard PSA credentials for a named PSA type. |
| `get_psa_ticket` | read | Retrieve one Custom PSA ticket, optionally using supplied PSA credentials. |
| `create_psa_ticket` | write | Create a Custom PSA ticket from its required external ticket fields. |
| `resolve_psa_ticket` | write | Resolve one explicitly identified Custom PSA ticket. |
| `reopen_psa_ticket` | write | Reopen one explicitly identified Custom PSA ticket. |
| `list_psa_customer_mappings` | read | List Standard PSA mappings for one customer. |
| `update_psa_customer_mappings` | write | Replace Standard PSA mappings for one customer. |
| `list_psa_companies` | read | List Standard PSA companies for one customer. Returns integrationStatus=unavailable with an empty list when N-central reports the integration unavailable. |
| `list_psa_company_contacts` | read | List contacts for one Standard PSA company and customer. |
| `list_psa_company_sites` | read | List sites for one Standard PSA company and customer. |

## `reporting` (6)

| Tool | Scope | Description |
|---|---|---|
| `report_devices_bulk` | read | Retrieve one selected data class across a bounded organization device page. Compact output and 25 devices are the defaults; request all/full explicitly. |
| `report_all_users_by_service_org` | read | Build a deduplicated user view beneath one service organization. Compact output and 25 users are the defaults. |
| `report_devices_by_service_org` | read | Build a bounded device inventory grouped beneath one service organization. |
| `report_customer_site_summary` | read | Summarize customers and their sites with bounded fan-out. Customer-scoped site listing is PREVIEW and may change. |
| `report_org_hierarchy` | read | Build a bounded service-organization and customer hierarchy report. |
| `list_device_filters` | read | List N-central device filters with bounded pagination. |

## `compatibility` (84)

| Tool | Scope | Description |
|---|---|---|
| `add_device_note` | write | Add canonical note content to one device. |
| `add_notes_bulk` | write | Add canonical note content to a non-empty list of devices. |
| `clear_device_notes` | destructive | DEPRECATED: use delete_device_notes. Permanently delete a non-empty explicit set of note IDs from one device. |
| `create_access_group` | write | Create an organization-unit access group. |
| `create_custom_psa_ticket` | write | DEPRECATED: use create_psa_ticket. Create a Custom PSA ticket from its required external ticket fields. |
| `create_customer` | write | Create a customer beneath an explicitly identified service organization. |
| `create_device` | write | Create a managed N-central device from a validated device request. |
| `create_device_access_group` | write | Create a device-scoped access group beneath one organization unit. |
| `create_direct_scheduled_task` | destructive | DEPRECATED: use create_scheduled_task. Execute a direct Automation Policy, Script, or MacScript on a managed endpoint. |
| `create_maintenance_windows` | write | Create explicit patch-maintenance windows for selected devices. |
| `create_service_org` | write | Create a service organization with its required contact details. |
| `create_site` | write | PREVIEW: Create a site through the customer-site API; its contract may change. |
| `create_user_role` | write | PREVIEW: Create a user role beneath one organization unit; this contract may change. |
| `delete_device` | destructive | Permanently delete one managed device, optionally uninstalling its agents. |
| `delete_device_note` | destructive | Permanently delete one explicitly identified device note. |
| `delete_maintenance_windows` | destructive | Permanently delete an explicit non-empty list of maintenance-window schedule IDs. |
| `generate_patch_comparison_report` | write | Submit a patch-comparison report generation request. |
| `generate_software_download_link` | write | Generate a customer-scoped software installer download link. |
| `get_access_group` | read | Retrieve one access group by its identifier. |
| `get_appliance_task` | read | Retrieve appliance-task status and details by task identifier. |
| `get_current_user` | read | Return compact current-user identity and authorization context, or explicit full profile detail. |
| `get_custom_psa_ticket_detail` | write | DEPRECATED: use get_psa_ticket. Retrieve one Custom PSA ticket, optionally using supplied PSA credentials. |
| `get_customer` | read | DEPRECATED: use get_organization_context. Load compact organization details plus selected bounded children, limits, and custom-property context. Request full/all explicitly. |
| `get_device` | read | DEPRECATED: use get_device_context. Load a device plus selected monitoring, asset, lifecycle, note, custom-property, and task context. |
| `get_device_activation_key` | read | Generate an activation key for one managed device. |
| `get_device_assets` | read | DEPRECATED: use get_device_context. Load a device plus selected monitoring, asset, lifecycle, note, custom-property, and task context. |
| `get_device_custom_property` | read | Retrieve one custom property assigned to one device. |
| `get_device_default_custom_property` | read | Retrieve one inherited device custom-property default. |
| `get_device_lifecycle` | read | DEPRECATED: use get_device_context. Load a device plus selected monitoring, asset, lifecycle, note, custom-property, and task context. |
| `get_device_status` | read | DEPRECATED: use get_device_context. Load a device plus selected monitoring, asset, lifecycle, note, custom-property, and task context. |
| `get_maintenance_windows` | read | DEPRECATED: use get_device_context. Load a device plus selected monitoring, asset, lifecycle, note, custom-property, and task context. |
| `get_org_custom_property_default` | read | Retrieve one organization custom-property default. |
| `get_org_unit` | read | DEPRECATED: use get_organization_context. Load compact organization details plus selected bounded children, limits, and custom-property context. Request full/all explicitly. |
| `get_org_unit_limits` | read | Retrieve licensing and usage limits for one organization unit. |
| `get_org_unit_property` | read | Retrieve one organization-unit custom property. |
| `get_psa_customer_mapping` | read | Retrieve the canonical Standard PSA mapping for one customer. |
| `get_registration_token` | read | Retrieve a sensitive registration token. The site and customer variants are PREVIEW and may change; the organization-unit variant is stable. |
| `get_report` | read | DEPRECATED: use run_report. Run one reviewed read-only report adapter; arbitrary REST methods or paths are not accepted. |
| `get_scheduled_task` | read | DEPRECATED: use get_scheduled_task_context. Load a scheduled-task definition and optionally its aggregate or per-device execution status. |
| `get_scheduled_task_status` | read | DEPRECATED: use get_scheduled_task_context. Load a scheduled-task definition and optionally its aggregate or per-device execution status. |
| `get_server_info` | read | DEPRECATED: use get_server_status. Check N-central service health and API version, optionally including the server clock. |
| `get_server_time` | read | DEPRECATED: use get_server_status. Check N-central service health and API version, optionally including the server clock. |
| `get_service_org` | read | DEPRECATED: use get_organization_context. Load compact organization details plus selected bounded children, limits, and custom-property context. Request full/all explicitly. |
| `get_site` | read | DEPRECATED: use get_organization_context. Load compact organization details plus selected bounded children, limits, and custom-property context. Request full/all explicitly. |
| `get_software_installers` | read | List software installers available to one customer. |
| `get_user_role` | read | PREVIEW: Retrieve one user role by organization and role IDs; this contract may change. |
| `list_access_groups` | read | List access groups assigned beneath one organization unit. |
| `list_active_issues` | read | List current active monitoring issues for a customer or site (service-org scope is unsupported), with bounded pagination and a compact default projection. Use detailLevel=full only when complete upstream records are required. |
| `list_all_users` | read | DEPRECATED: use list_users. List users visible beneath one organization unit. |
| `list_customers` | read | DEPRECATED: use search_organizations. Find service organizations, customers, sites, or organization units by human name or bounded filtering and pagination. Customer-scoped site listing is PREVIEW and may change. |
| `list_device_custom_properties` | read | List custom-property values assigned to one device. |
| `list_device_filters` | read | List N-central device filters with bounded pagination. |
| `list_device_notes` | read | DEPRECATED: use get_device_context. Load a device plus selected monitoring, asset, lifecycle, note, custom-property, and task context. |
| `list_device_tasks` | read | DEPRECATED: use list_device_scheduled_tasks. List scheduled tasks associated with one N-central device. |
| `list_devices` | read | DEPRECATED: use search_devices. Search the global or organization-scoped N-central device inventory by human name or bounded filters and pagination. |
| `list_devices_by_org_unit` | read | DEPRECATED: use search_devices. Search the global or organization-scoped N-central device inventory by human name or bounded filters and pagination. |
| `list_job_statuses` | read | List asynchronous N-central job statuses with local filtering, bounded pagination, and a compact default projection. |
| `list_org_custom_properties` | read | List organization custom properties with bounded pagination. |
| `list_org_unit_children` | read | DEPRECATED: use get_organization_context. Load compact organization details plus selected bounded children, limits, and custom-property context. Request full/all explicitly. |
| `list_org_units` | read | DEPRECATED: use search_organizations. Find service organizations, customers, sites, or organization units by human name or bounded filtering and pagination. Customer-scoped site listing is PREVIEW and may change. |
| `list_psa_companies` | read | List Standard PSA companies for one customer. Returns integrationStatus=unavailable with an empty list when N-central reports the integration unavailable. |
| `list_psa_company_contacts` | read | List contacts for one Standard PSA company and customer. |
| `list_psa_company_sites` | read | List sites for one Standard PSA company and customer. |
| `list_psa_customer_mappings` | read | List Standard PSA mappings for one customer. |
| `list_scheduled_tasks` | read | DEPRECATED: use list_device_scheduled_tasks. List scheduled tasks associated with one N-central device. |
| `list_service_orgs` | read | DEPRECATED: use search_organizations. Find service organizations, customers, sites, or organization units by human name or bounded filtering and pagination. Customer-scoped site listing is PREVIEW and may change. |
| `list_sites` | read | DEPRECATED: use search_organizations. Find service organizations, customers, sites, or organization units by human name or bounded filtering and pagination. Customer-scoped site listing is PREVIEW and may change. |
| `list_user_roles` | read | PREVIEW: List user roles for one organization unit; this contract may change. |
| `list_users` | read | List users visible beneath one organization unit. |
| `patch_device_lifecycle` | write | Partially update asset lifecycle and warranty fields for one device. |
| `report_all_users_by_so` | read | DEPRECATED: use report_all_users_by_service_org. Build a deduplicated user view beneath one service organization. Compact output and 25 users are the defaults. |
| `report_customer_site_summary` | read | Summarize customers and their sites with bounded fan-out. Customer-scoped site listing is PREVIEW and may change. |
| `report_devices_bulk` | read | Retrieve one selected data class across a bounded organization device page. Compact output and 25 devices are the defaults; request all/full explicitly. |
| `report_devices_by_so` | read | DEPRECATED: use report_devices_by_service_org. Build a bounded device inventory grouped beneath one service organization. |
| `report_org_hierarchy` | read | Build a bounded service-organization and customer hierarchy report. |
| `update_device_custom_property` | write | Update one device custom-property value using its existing schema fields. |
| `update_device_lifecycle` | write | Replace all asset lifecycle and warranty fields for one device. |
| `update_device_note` | write | Replace one existing device note using its note identifier. |
| `update_maintenance_windows` | write | Update maintenance windows identified by schedule IDs in their nested payloads. |
| `update_org_custom_property_default` | write | Update and optionally propagate an organization custom-property default. |
| `update_org_unit_custom_property` | write | Update one organization-unit custom-property value. |
| `update_org_unit_limits` | write | Patch selected licensing and usage limits for one organization unit. |
| `update_psa_customer_mappings` | write | Replace Standard PSA mappings for one customer. |
| `validate_psa_credential` | write | Validate sensitive Standard PSA credentials for a named PSA type. |
