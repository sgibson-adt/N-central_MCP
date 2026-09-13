# Migrating to 3.0

Version 3.0 replaces the default endpoint-shaped catalog with twelve read-only, task-oriented tools. The 2.x names are available only through the opt-in `compatibility` toolset when their behavior remains safe.

## Default changes

- `NC_TOOLSETS` now defaults to `core`.
- `NC_WRITE_MODE` now defaults to `read-only`.
- Curated tools return `structuredContent` plus a readable text fallback.
- Automatic pagination is bounded to 20 pages and 10,000 records; results are bounded to 256 KiB.

To stage migration, set `NC_TOOLSETS=core,compatibility`. Write and destructive aliases still require `NC_WRITE_MODE=write` or `full`.

Removed names are never advertised in any write mode. `list_custom_psa_tickets` is removed because its upstream route is a navigation link index; use `get_psa_ticket` with a known identifier.

## Inventory

The reviewed 87-name inventory contains 53 retained, 31 consolidated/deprecated, and 3 removed names.

| 2.x name | Disposition | Preferred replacement | Compatibility name | Behavior change or rationale |
|---|---|---|---|---|
| `add_device_note` | retained | `add_device_note` | `add_device_note` | No contract change. |
| `add_notes_bulk` | retained | `add_notes_bulk` | `add_notes_bulk` | No contract change. |
| `clear_device_notes` | consolidated | `delete_device_notes` | `clear_device_notes` | Maps to delete_device_notes; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `create_access_group` | retained | `create_access_group` | `create_access_group` | No contract change. |
| `create_custom_psa_ticket` | consolidated | `create_psa_ticket` | `create_custom_psa_ticket` | Maps to create_psa_ticket; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `create_customer` | retained | `create_customer` | `create_customer` | No contract change. |
| `create_device` | retained | `create_device` | `create_device` | No contract change. |
| `create_device_access_group` | retained | `create_device_access_group` | `create_device_access_group` | No contract change. |
| `create_direct_scheduled_task` | consolidated | `create_scheduled_task` | `create_direct_scheduled_task` | Maps to create_scheduled_task; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `create_maintenance_windows` | retained | `create_maintenance_windows` | `create_maintenance_windows` | No contract change. |
| `create_service_org` | retained | `create_service_org` | `create_service_org` | No contract change. |
| `create_site` | retained | `create_site` | `create_site` | No contract change. |
| `create_user_role` | retained | `create_user_role` | `create_user_role` | No contract change. |
| `delete_device` | retained | `delete_device` | `delete_device` | No contract change. |
| `delete_device_note` | retained | `delete_device_note` | `delete_device_note` | No contract change. |
| `delete_maintenance_windows` | retained | `delete_maintenance_windows` | `delete_maintenance_windows` | No contract change. |
| `generate_patch_comparison_report` | retained | `generate_patch_comparison_report` | `generate_patch_comparison_report` | No contract change. |
| `generate_software_download_link` | retained | `generate_software_download_link` | `generate_software_download_link` | No contract change. |
| `get_access_group` | retained | `get_access_group` | `get_access_group` | No contract change. |
| `get_appliance_task` | retained | `get_appliance_task` | `get_appliance_task` | No contract change. |
| `get_current_user` | retained | `get_current_user` | `get_current_user` | No contract change. |
| `get_custom_psa_ticket_detail` | consolidated | `get_psa_ticket` | `get_custom_psa_ticket_detail` | Maps to get_psa_ticket; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_customer` | consolidated | `get_organization_context` | `get_customer` | Maps to get_organization_context; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_device` | consolidated | `get_device_context` | `get_device` | Maps to get_device_context; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_device_activation_key` | retained | `get_device_activation_key` | `get_device_activation_key` | No contract change. |
| `get_device_assets` | consolidated | `get_device_context` | `get_device_assets` | Maps to get_device_context; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_device_custom_property` | retained | `get_device_custom_property` | `get_device_custom_property` | No contract change. |
| `get_device_default_custom_property` | retained | `get_device_default_custom_property` | `get_device_default_custom_property` | No contract change. |
| `get_device_lifecycle` | consolidated | `get_device_context` | `get_device_lifecycle` | Maps to get_device_context; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_device_status` | consolidated | `get_device_context` | `get_device_status` | Maps to get_device_context; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_maintenance_windows` | consolidated | `get_device_context` | `get_maintenance_windows` | Maps to get_device_context; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_org_custom_property_default` | retained | `get_org_custom_property_default` | `get_org_custom_property_default` | No contract change. |
| `get_org_unit` | consolidated | `get_organization_context` | `get_org_unit` | Maps to get_organization_context; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_org_unit_limits` | retained | `get_org_unit_limits` | `get_org_unit_limits` | No contract change. |
| `get_org_unit_property` | retained | `get_org_unit_property` | `get_org_unit_property` | No contract change. |
| `get_psa_customer_mapping` | retained | `get_psa_customer_mapping` | `get_psa_customer_mapping` | No contract change. |
| `get_registration_token` | retained | `get_registration_token` | `get_registration_token` | No contract change. |
| `get_report` | consolidated | `run_report` | `get_report` | Maps to run_report; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_scheduled_task` | consolidated | `get_scheduled_task_context` | `get_scheduled_task` | Maps to get_scheduled_task_context; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_scheduled_task_status` | consolidated | `get_scheduled_task_context` | `get_scheduled_task_status` | Maps to get_scheduled_task_context; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_server_info` | consolidated | `get_server_status` | `get_server_info` | Maps to get_server_status; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_server_info_authenticated` | removed | — | — | No contract-accurate safe compatibility behavior is retained; use the documented curated catalogs. |
| `get_server_time` | consolidated | `get_server_status` | `get_server_time` | Maps to get_server_status; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_service_org` | consolidated | `get_organization_context` | `get_service_org` | Maps to get_organization_context; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_site` | consolidated | `get_organization_context` | `get_site` | Maps to get_organization_context; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `get_software_installers` | retained | `get_software_installers` | `get_software_installers` | No contract change. |
| `get_user_role` | retained | `get_user_role` | `get_user_role` | No contract change. |
| `list_access_groups` | retained | `list_access_groups` | `list_access_groups` | No contract change. |
| `list_active_issues` | retained | `list_active_issues` | `list_active_issues` | No contract change. |
| `list_all_users` | consolidated | `list_users` | `list_all_users` | Maps to list_users; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `list_custom_psa_tickets` | removed | — | — | The upstream route returns navigation links rather than a searchable ticket collection; use get_psa_ticket with a known ticket ID. |
| `list_customers` | consolidated | `search_organizations` | `list_customers` | Maps to search_organizations; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `list_device_custom_properties` | retained | `list_device_custom_properties` | `list_device_custom_properties` | No contract change. |
| `list_device_filters` | retained | `list_device_filters` | `list_device_filters` | No contract change. |
| `list_device_notes` | consolidated | `get_device_context` | `list_device_notes` | Maps to get_device_context; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `list_device_tasks` | consolidated | `list_device_scheduled_tasks` | `list_device_tasks` | Maps to list_device_scheduled_tasks; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `list_devices` | consolidated | `search_devices` | `list_devices` | Maps to search_devices; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `list_devices_by_org_unit` | consolidated | `search_devices` | `list_devices_by_org_unit` | Maps to search_devices; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `list_job_statuses` | retained | `list_job_statuses` | `list_job_statuses` | No contract change. |
| `list_org_custom_properties` | retained | `list_org_custom_properties` | `list_org_custom_properties` | No contract change. |
| `list_org_unit_children` | consolidated | `get_organization_context` | `list_org_unit_children` | Maps to get_organization_context; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `list_org_units` | consolidated | `search_organizations` | `list_org_units` | Maps to search_organizations; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `list_psa_companies` | retained | `list_psa_companies` | `list_psa_companies` | No contract change. |
| `list_psa_company_contacts` | retained | `list_psa_company_contacts` | `list_psa_company_contacts` | No contract change. |
| `list_psa_company_sites` | retained | `list_psa_company_sites` | `list_psa_company_sites` | No contract change. |
| `list_psa_customer_mappings` | retained | `list_psa_customer_mappings` | `list_psa_customer_mappings` | No contract change. |
| `list_scheduled_tasks` | consolidated | `list_device_scheduled_tasks` | `list_scheduled_tasks` | Maps to list_device_scheduled_tasks; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `list_service_orgs` | consolidated | `search_organizations` | `list_service_orgs` | Maps to search_organizations; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `list_sites` | consolidated | `search_organizations` | `list_sites` | Maps to search_organizations; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `list_user_roles` | retained | `list_user_roles` | `list_user_roles` | No contract change. |
| `list_users` | retained | `list_users` | `list_users` | No contract change. |
| `logout` | removed | — | — | No contract-accurate safe compatibility behavior is retained; use the documented curated catalogs. |
| `patch_device_lifecycle` | retained | `patch_device_lifecycle` | `patch_device_lifecycle` | No contract change. |
| `report_all_users_by_so` | consolidated | `report_all_users_by_service_org` | `report_all_users_by_so` | Maps to report_all_users_by_service_org; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `report_customer_site_summary` | retained | `report_customer_site_summary` | `report_customer_site_summary` | No contract change. |
| `report_devices_bulk` | retained | `report_devices_bulk` | `report_devices_bulk` | No contract change. |
| `report_devices_by_so` | consolidated | `report_devices_by_service_org` | `report_devices_by_so` | Maps to report_devices_by_service_org; reviewed compatibility inputs are accepted and results follow the curated contract. |
| `report_org_hierarchy` | retained | `report_org_hierarchy` | `report_org_hierarchy` | No contract change. |
| `update_device_custom_property` | retained | `update_device_custom_property` | `update_device_custom_property` | No contract change. |
| `update_device_lifecycle` | retained | `update_device_lifecycle` | `update_device_lifecycle` | No contract change. |
| `update_device_note` | retained | `update_device_note` | `update_device_note` | No contract change. |
| `update_maintenance_windows` | retained | `update_maintenance_windows` | `update_maintenance_windows` | No contract change. |
| `update_org_custom_property_default` | retained | `update_org_custom_property_default` | `update_org_custom_property_default` | No contract change. |
| `update_org_unit_custom_property` | retained | `update_org_unit_custom_property` | `update_org_unit_custom_property` | No contract change. |
| `update_org_unit_limits` | retained | `update_org_unit_limits` | `update_org_unit_limits` | No contract change. |
| `update_psa_customer_mappings` | retained | `update_psa_customer_mappings` | `update_psa_customer_mappings` | No contract change. |
| `validate_psa_credential` | retained | `validate_psa_credential` | `validate_psa_credential` | No contract change. |
