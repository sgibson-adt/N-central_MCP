import { it } from 'node:test';
import assert from 'node:assert/strict';
import { coreTools } from '../../../src/tools/core.js';

const bytes = (value) => Buffer.byteLength(JSON.stringify(value), 'utf8');
it('keeps default discovery <=20 tools and at least 60% below the reviewed comparable baseline', () => {
  const comparable = coreTools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
  const advertised = coreTools.map(({ handler, ...definition }) => definition);
  assert.ok(coreTools.length <= 20);
  assert.ok(bytes(comparable) <= 55_858 * 0.4, `${bytes(comparable)} comparable bytes`);
  assert.ok(bytes(advertised) >= bytes(comparable));
});
