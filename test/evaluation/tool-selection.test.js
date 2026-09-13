import { readFileSync } from 'node:fs';
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSelectionCases } from '../../scripts/evaluate-tool-selection.js';
import { coreTools } from '../../src/tools/core.js';
import { operationTools } from '../../src/tools/operations.js';

const cases = JSON.parse(readFileSync(new URL('./tool-selection-cases.json', import.meta.url)));
it('meets the reviewed fixture distribution and destructive coverage', () => {
  assert.ok(cases.length >= 40);
  const counts = Object.groupBy(cases, (c) => c.caseType);
  assert.ok(cases.filter((c) => c.enabledToolsets.includes('core')).length >= 20);
  assert.ok((counts.ambiguous?.length || 0) >= 8);
  assert.ok((counts['invalid-input']?.length || 0) >= 4);
  assert.ok((counts.permission?.length || 0) >= 4);
  assert.ok((counts['destructive-negative']?.length || 0) >= 4);
  for (const tool of coreTools) assert.ok(cases.filter((c) => c.expectedTools.includes(tool.name)).length >= 2, tool.name);
  for (const tool of operationTools.filter((t) => t.writeScope === 'destructive')) {
    assert.ok(cases.some((c) => c.prohibitedTools.includes(tool.name)), tool.name);
  }
});
it('achieves >=95% top-three with no prohibited or hidden accepted candidates', () => {
  const metrics = evaluateSelectionCases(cases);
  assert.ok(metrics.topThreeRate >= 0.95, JSON.stringify(metrics));
  assert.equal(metrics.prohibitedAccepted, 0);
  assert.equal(metrics.hiddenCandidates, 0);
});
