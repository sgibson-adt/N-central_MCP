import { it } from 'node:test';
import assert from 'node:assert/strict';
import { parseToolsets, resolveToolConfiguration } from '../../../src/toolsets.js';

it('normalizes unions, de-duplicates overlap, and rejects malformed/unknown toolsets', () => {
  assert.deepEqual(parseToolsets(' CORE, psa,core '), ['core', 'psa']);
  assert.deepEqual(
    parseToolsets(' ALL '),
    ['core', 'operations', 'administration', 'psa', 'reporting'],
  );
  assert.deepEqual(
    parseToolsets('all, compatibility, core'),
    ['core', 'operations', 'administration', 'psa', 'reporting', 'compatibility'],
  );
  assert.throws(() => parseToolsets('core,,psa'), /malformed/);
  assert.throws(() => parseToolsets('unknown'), /Unknown/);
  const selected = resolveToolConfiguration({ rawToolsets: 'core,reporting', rawWriteMode: 'read-only' });
  assert.equal(new Set(selected.tools.map((t) => t.name)).size, selected.tools.length);
  assert.ok(selected.tools.some((t) => t.name === 'report_devices_bulk'));
});

it('expands all to preferred v3 catalogs without implicitly enabling compatibility', () => {
  const all = resolveToolConfiguration({ rawToolsets: 'all', rawWriteMode: 'full' });
  const explicit = resolveToolConfiguration({
    rawToolsets: 'core,operations,administration,psa,reporting',
    rawWriteMode: 'full',
  });
  assert.deepEqual(all.toolsets, explicit.toolsets);
  assert.deepEqual(all.tools.map(({ name }) => name), explicit.tools.map(({ name }) => name));
  assert.equal(all.toolsets.includes('compatibility'), false);
});
