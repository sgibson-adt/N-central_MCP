# N-central MCP Server

> A [Model Context Protocol](https://modelcontextprotocol.io/) server for **N-able N-central** — exposing the N-central REST API as AI-native tools, resources, and prompts for use with Claude, Antigravity, and any MCP-compatible client.

---

## Features at a Glance

- **55 tools** covering devices, organizations, users, custom properties, scheduled tasks, and reporting
- **Auto-paginated bulk reports** in CSV or JSON (page size 200, 5 concurrent API calls)
- **MCP Resources** for live org-hierarchy context without tool calls
- **MCP Prompts** for common audit and reporting workflows
- **Three transport modes**: Streamable HTTP, stdio (Claude Desktop), Docker
- **Production-grade auth**: JWT + Access Token auto-refresh, API key protection for the MCP endpoint, CORS support

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Get your N-central JWT token

In the N-central UI: **Administration → User Management → Users → [user] → API Access → Generate JSON Web Token**

> **Best practice:** Use a dedicated API-only user with least-privilege roles. The API user password expires every 90 days — reset it proactively to avoid auth failures.

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Required | Description |
|---|---|---|
| `NC_SERVER_URL` | ✅ | Your N-central server URL (e.g. `https://ncentral.example.com`) |
| `NC_JWT_TOKEN` | ✅ | User-API JWT from the N-central UI |
| `MCP_API_KEY` | Recommended | Bearer token to protect the MCP HTTP endpoint |
| `MCP_PORT` | Optional | HTTP port (default: `3100`) |
| `MCP_BIND_ADDRESS` | Optional | Bind address (default: `127.0.0.1`, use `0.0.0.0` for Docker) |
| `MCP_CORS_ORIGIN` | Optional | Allowed CORS origin (e.g. `http://localhost:3000`) |

### 4. Start the server

**Option A — Streamable HTTP** *(recommended for Antigravity, MCP Inspector, REST clients)*

```bash
npm start
# Server available at http://localhost:3100/mcp
```

**Option B — stdio** *(for Claude Desktop)*

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ncentral": {
      "command": "node",
      "args": ["/path/to/N-central_MCP/index.js"],
      "env": {
        "NC_SERVER_URL": "https://your-ncentral-server.com",
        "NC_JWT_TOKEN": "your-jwt-token-here"
      }
    }
  }
}
```

**Option C — Docker**

```bash
docker compose up -d
```

---

## Tools

### Devices (8)

| Tool | Description |
|------|-------------|
| `list_devices` | List all devices with pagination, sorting, and filter support |
| `list_devices_by_org_unit` | List devices under a specific org unit |
| `get_device` | Get a device by ID |
| `get_device_status` | Get service monitoring status for a device |
| `get_device_assets` | Get hardware/software asset info for a device |
| `get_device_lifecycle` | Get warranty/lifecycle info for a device |
| `get_device_activation_key` | Generate an agent activation key |
| `get_maintenance_windows` | Get all maintenance windows for a device |

### Organizations (11)

| Tool | Description |
|------|-------------|
| `list_service_orgs` | List all service organizations |
| `get_service_org` | Get a specific service org by ID |
| `list_customers` | List customers (all or filtered by SO) |
| `get_customer` | Get a specific customer by ID |
| `list_sites` | List sites (all or filtered by customer) |
| `get_site` | Get a specific site by ID |
| `list_org_units` | List all organization units |
| `get_org_unit` | Get a specific org unit by ID |
| `list_org_unit_children` | List child org units for a parent |
| `get_psa_customer_mapping` | Get PSA customer mapping for a customer |
| `get_registration_token` | Get agent registration token for a site/customer |

### Scheduled Tasks (5)

| Tool | Description |
|------|-------------|
| `get_scheduled_task` | Get general info for a scheduled task |
| `get_scheduled_task_status` | Get aggregated or per-device task status |
| `list_device_tasks` | List all scheduled tasks for a device |
| `get_appliance_task` | Get appliance task info by task ID |
| `get_report` | Get a report by ID |

### Custom Properties (6)

| Tool | Description |
|------|-------------|
| `list_device_custom_properties` | List all custom properties for a device |
| `get_device_custom_property` | Get a specific device custom property |
| `get_device_default_custom_property` | Get default custom property for an org unit |
| `list_org_custom_properties` | List custom properties for an org unit |
| `get_org_unit_property` | Get a specific org unit custom property |
| `get_org_custom_property_default` | Get default value for an org unit custom property |

### Users & Access (7)

| Tool | Description |
|------|-------------|
| `list_users` | List users for an org unit |
| `list_user_roles` | List user roles for an org unit |
| `get_user_role` | Get a specific user role |
| `list_access_groups` | List access groups for an org unit |
| `get_access_group` | Get a specific access group by ID |
| `get_software_installers` | Get agent installer download URLs for a customer |
| `get_registration_token` | Get registration token for entity onboarding |

### Misc (3)

| Tool | Description |
|------|-------------|
| `get_server_info` | Server/API version info, health, or extended system details |
| `list_device_filters` | List all device filters |
| `validate_token` | Validate the current API access token |

### Reports (15)

All report tools auto-paginate and return **CSV** (default) or **JSON**. Bulk reports use **5 concurrent** API calls for speed.

| Tool | Description |
|------|-------------|
| `report_all_devices` | Full device inventory across the entire estate |
| `report_devices_by_org_unit` | All devices under a specific org unit |
| `report_devices_by_so` | All devices under a service org |
| `report_all_users` | All users for an org unit (auto-paginated) |
| `report_all_users_by_so` | Deduplicated users across an SO and all its customers |
| `report_customer_site_summary` | Customers with sites, device counts, and active issue counts |
| `report_org_hierarchy` | Full SO → Customer → Site hierarchy flat table |
| `report_org_entities` | Paginated list of customers, sites, or org units |
| `report_active_issues` | All active issues for an org unit |
| `report_job_statuses` | All job statuses for an org unit |
| `report_org_custom_properties` | All custom properties for an org unit |
| `report_device_custom_properties` | All custom properties for a device |
| `report_all_custom_properties_bulk` | Custom properties across ALL devices in an org unit |
| `report_device_assets_bulk` | Hardware/asset info for all devices in an org unit |
| `report_device_status_bulk` | Service monitoring status for all devices in an org unit |
| `report_device_tasks` | All scheduled tasks for a device |

---

## Resources

Resources provide live context to the AI without requiring explicit tool calls.

| URI | Description |
|-----|-------------|
| `ncentral://org-tree` | Full SO → Customer → Site hierarchy with IDs and names |
| `ncentral://customers` | Flat list of all customers (auto-paginated) |
| `ncentral://sites` | Flat list of all sites (auto-paginated) |
| `ncentral://status` | Server health + version snapshot |

---

## Prompts

| Name | Description |
|------|-------------|
| `full-customer-report` | Comprehensive customer/site report with org custom properties |
| `device-health-audit` | Active issues and monitoring status across the environment |
| `agent-deployment-status` | Find sites with missing or low device counts |
| `custom-property-audit` | Audit custom property consistency across all customers |

---

## Resilience

| Concern | Behavior |
|---------|----------|
| Rate limits | Auto-retry on 429 with exponential backoff (up to 3 attempts) |
| Token expiry | Access tokens (1hr) and refresh tokens (25hr) auto-refreshed; concurrent refreshes coalesced |
| Transient errors | Auto-retry on 500/503 with exponential backoff |
| Request timeouts | 30s on API calls, 15s on auth calls |
| N-central reboots | Re-authenticates from JWT automatically on 401 |
| Stale HTTP sessions | Cleaned up after 30 minutes of inactivity |

---

## Known API Quirks

- **Probe assets:** Return 404 — probes don't have asset records (expected behavior, skipped in bulk reports)
- **Active issues:** `deviceClassValue` and `deviceClassLabel` are always `null` (known N-central API bug)
- **`get_device` by ID:** `lastLoggedInUser` and `stillLoggedIn` may return `null` — use `list_devices` instead for these fields
- **Active issues at SO level:** The `/active-issues` endpoint only supports customer/site org unit types, not service org

---

## Project Structure

```
├── index.js                  # Entry point — transport selection (stdio / HTTP)
├── src/
│   ├── auth.js               # JWT → Access Token auth, auto-refresh logic
│   ├── client.js             # HTTP client with retry, timeout, and rate-limit handling
│   ├── logging.js            # Structured logger
│   ├── paginator.js          # Auto-pagination helper
│   ├── prompts.js            # MCP Prompts definitions
│   ├── resources.js          # MCP Resources definitions
│   ├── shared.js             # Shared pagination schema helpers
│   └── tools/
│       ├── custom-properties.js
│       ├── devices.js
│       ├── misc.js
│       ├── organizations.js
│       ├── reports.js
│       ├── scheduled-tasks.js
│       └── users.js
├── test/
│   └── utils.test.js
├── .env.example
├── Dockerfile
└── docker-compose.yml
```

---

## License

MIT
