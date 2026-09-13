import { it } from 'node:test';
import assert from 'node:assert/strict';
import { parseToolsets, resolveToolConfiguration } from '../../../src/toolsets.js';

it('normalizes unions, de-duplicates overlap, and rejects malformed/unknown toolsets', () => {
  assert.deepEqual(parseToolsets(' CORE, psa,core '), ['core', 'psa']);
  assert.throws(() => parseToolsets('core,,psa'), /malformed/);
  assert.throws(() => parseToolsets('unknown'), /Unknown/);
  const selected = resolveToolConfiguration({ rawToolsets: 'core,reporting', rawWriteMode: 'read-only' });
  assert.equal(new Set(selected.tools.map((t) => t.name)).size, selected.tools.length);
  assert.ok(selected.tools.some((t) => t.name === 'report_devices_bulk'));
});
