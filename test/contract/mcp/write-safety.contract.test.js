import { it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveToolConfiguration } from '../../../src/toolsets.js';

it('intersects selected toolsets with read-only/write/full and keeps destructive actions separate', () => {
  const read = resolveToolConfiguration({ rawToolsets: 'operations', rawWriteMode: 'read-only' }).tools;
  const write = resolveToolConfiguration({ rawToolsets: 'operations', rawWriteMode: 'write' }).tools;
  const full = resolveToolConfiguration({ rawToolsets: 'operations', rawWriteMode: 'full' }).tools;
  assert.ok(read.every((t) => t.writeScope === 'read'));
  assert.ok(write.every((t) => t.writeScope !== 'destructive'));
  for (const name of ['delete_device', 'perform_windows_service_action', 'create_remote_control_task']) {
    assert.equal(write.some((t) => t.name === name), false);
    assert.equal(full.some((t) => t.name === name), true);
  }
});
