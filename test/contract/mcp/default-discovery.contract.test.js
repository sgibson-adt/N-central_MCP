import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CORE_TOOL_NAMES } from '../../../src/tools/core.js';
import { resolveToolConfiguration } from '../../../src/toolsets.js';
import { RESOURCE_COUNT, RESOURCE_OPERATION_REFERENCES } from '../../../src/resources.js';
import { PROMPT_COUNT, PROMPT_TOOL_REFERENCES } from '../../../src/prompts.js';

describe('omitted-configuration discovery', () => {
  it('selects the same core/read-only catalog for stdio and HTTP', () => {
    for (const transport of ['stdio', 'http']) {
      const config = resolveToolConfiguration({ transport });
      assert.equal(config.writeMode, 'read-only');
      assert.deepEqual(config.toolsets, ['core']);
      assert.deepEqual(config.tools.map(({ name }) => name), CORE_TOOL_NAMES);
    }
  });

  it('keeps resources and prompts registered against preferred operations/tools', () => {
    assert.equal(RESOURCE_COUNT, 5);
    assert.equal(PROMPT_COUNT, 4);
    assert.ok(RESOURCE_OPERATION_REFERENCES.includes('GET /api/devices/{deviceId}'));
    assert.ok(PROMPT_TOOL_REFERENCES.includes('search_devices'));
    assert.equal(PROMPT_TOOL_REFERENCES.includes('list_devices'), false);
  });
});
