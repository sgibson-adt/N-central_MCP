import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { coreTools, CORE_TOOL_NAMES } from '../../../src/tools/core.js';

const expected = [
  'get_server_status', 'validate_session', 'get_current_user', 'search_organizations',
  'get_organization_context', 'search_devices', 'get_device_context', 'list_active_issues',
  'list_device_scheduled_tasks', 'get_scheduled_task_context', 'run_report', 'list_job_statuses',
];

describe('core MCP catalog', () => {
  it('contains the exact twelve names in deterministic order and stays under the cap', () => {
    assert.deepEqual(CORE_TOOL_NAMES, expected);
    assert.deepEqual(coreTools.map(({ name }) => name), expected);
    assert.equal(coreTools.length, 12);
    assert.ok(coreTools.length <= 20);
  });

  it('declares distinct descriptions, read scopes, schemas, mappings, and memberships', () => {
    assert.equal(new Set(coreTools.map(({ description }) => description)).size, coreTools.length);
    for (const tool of coreTools) {
      assert.equal(tool.writeScope, 'read', tool.name);
      assert.equal(tool.inputSchema.type, 'object', tool.name);
      assert.equal(tool.inputSchema.additionalProperties, false, tool.name);
      assert.equal(tool.outputSchema.type, 'object', tool.name);
      assert.ok(tool.operations.length > 0, tool.name);
      assert.deepEqual(tool.toolsets, ['core'], tool.name);
      assert.equal(typeof tool.handler, 'function', tool.name);
    }
  });

  it('requires active-issue scope and advertises only implemented inputs', () => {
    const activeIssues = coreTools.find(({ name }) => name === 'list_active_issues');
    assert.ok(activeIssues.inputSchema.required.includes('orgUnitId'));
    assert.equal(activeIssues.inputSchema.properties.severity, undefined);
  });
});
