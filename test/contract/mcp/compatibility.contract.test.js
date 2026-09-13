import { readFileSync } from 'node:fs';
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { compatibilityTools } from '../../../src/tools/compatibility.js';

const mappings = JSON.parse(readFileSync(new URL('./legacy-tool-mappings.json', import.meta.url)));
it('reconciles all 87 legacy names with reviewed dispositions and shared delegation', () => {
  assert.equal(mappings.records.length, 87);
  assert.equal(mappings.records.some((m) => m.disposition === null), false);
  for (const mapping of mappings.records.filter((m) => m.compatibilityTool)) {
    assert.ok(compatibilityTools.some((t) => t.name === mapping.compatibilityTool), mapping.legacyName);
  }
  for (const tool of compatibilityTools) assert.equal(typeof tool.handler, 'function');
});
