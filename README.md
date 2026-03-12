# N-central MCP Server (v2.0.0)

An MCP (Model Context Protocol) server that exposes N-central REST API **GET** endpoints as tools, plus MCP Resources for org hierarchy context and Prompts for common workflows.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get your JWT token

In N-central UI: **Administration → User Management → Users → [user] → API Access → Generate JSON Web Token**

> **Tip**: Use a dedicated API-only user with least-privilege roles. The API user password expires every 90 days — reset it proactively to avoid 500 errors.

### 3. Configure environment

Copy and edit the example config:

```bash
cp .env.example .env
# Edit .env with your NC_SERVER_URL, NC_JWT_TOKEN, and MCP_PORT
```

### 4. Configure your MCP client

**Option A — Streamable HTTP (recommended for Antigravity/MCP Inspector)**

Start the server:
```bash
MCP_PORT=3100 npm start
```

Then point your MCP client at `http://<host>:3100/mcp`

**Option B — Node.js stdio (for Claude Desktop)**

```json
{
  "mcpServers": {
    "ncentral": {
      "command": "node",
      "args": ["/path/to/nc_mcp/index.js"],
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

## Features

### Tools

| Category | Count | Examples |
|---|---|---|
| **Devices** | 7 | `list_devices`, `get_device`, `get_device_status`, `get_device_assets` |
| **Organizations** | 11 | `list_org_units`, `list_customers`, `list_sites`, `get_service_org` |
| **Scheduled Tasks** | 4 | `get_scheduled_task`, `get_scheduled_task_status`, `list_device_tasks` |
| **Custom Properties** | 6 | `list_device_custom_properties`, `get_org_unit_property` |
| **Users & Access** | 5 | `list_users`, `list_user_roles`, `get_access_group` |
| **Misc** | 11 | `list_device_filters`, `list_active_issues`, `get_server_health`, `validate_token` |
| **Reports** | 15 | `report_all_devices`, `report_customer_site_summary`, `report_org_hierarchy` |

> **Report tools** auto-paginate through all results (page size 200) and return **CSV** (default) or JSON. Bulk reports use concurrent API calls (5 parallel) for speed.

### Resources

| URI | Description |
|-----|-------------|
| `ncentral://org-tree` | Full SO → Customer → Site hierarchy with IDs and names |
| `ncentral://customers` | Flat list of all customers (auto-paginated) |
| `ncentral://sites` | Flat list of all sites (auto-paginated) |
| `ncentral://status` | Server health + version snapshot |

### Prompts

| Name | Description |
|------|-------------|
| `full-customer-report` | Comprehensive customer/site report with org custom properties |
| `device-health-audit` | Active issues and monitoring status across the environment |
| `agent-deployment-status` | Find sites with missing or low device counts |
| `custom-property-audit` | Audit custom property consistency across all customers |

## Resilience

- **Rate limits**: Auto-retries on 429 with exponential backoff (up to 3 attempts)
- **Token lifecycle**: Access tokens (1hr) and refresh tokens (25hr) auto-refreshed; concurrent refresh requests coalesced
- **Request timeouts**: 30s timeout on API calls, 15s on auth calls
- **Transient errors**: Auto-retries on 500/503 with exponential backoff
- **N-central reboots**: Server re-authenticates automatically from JWT on 401
- **Stale sessions**: Cleaned up automatically after 30 minutes of inactivity

## Known API Quirks

- **Probe assets**: Return 404 (expected — probes have no assets)
- **Active issues**: `deviceClassValue` and `deviceClassLabel` are always null (known N-central bug)
- **Device by ID**: `lastLoggedInUser` and `stillLoggedIn` may be null; use `list_devices` instead
