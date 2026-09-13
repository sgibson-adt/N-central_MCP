import { it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installContractFetch, syntheticTenant, withSyntheticTenant } from '../fixtures.js';
import {
  addDeviceNote, addNotesBulk, deleteDeviceNote, deleteDeviceNotes, updateDeviceNote,
} from '../../../src/operations/notes.js';

let boundary; afterEach(() => boundary?.restore());
it('normalizes canonical note fields and rejects aliases/conflicts/no-body batch deletes locally', async () => {
  boundary = installContractFetch();
  await withSyntheticTenant(syntheticTenant('notes'), async () => {
    await addDeviceNote({ deviceId: '1', userId: 7, note: 'hello', insertionTime: '2026-01-01T00:00:00Z' });
    await addNotesBulk({ deviceIds: [1, 2], userId: 7, note: 'bulk' });
    await updateDeviceNote({ deviceId: '1', noteId: '9', note: 'updated' });
    await deleteDeviceNotes({ deviceId: '1', noteIds: ['9'] });
    await deleteDeviceNote('1', '9');
    assert.throws(() => deleteDeviceNotes({ deviceId: '1', noteIds: [] }), /noteIds/);
    assert.throws(() => addDeviceNote({ deviceId: '1', note: 'a', text: 'b' }), /conflict/i);
  });
  const calls = boundary.calls.slice(1);
  assert.deepEqual(calls.slice(0, 4).map((c) => c.body), [
    { userId: 7, note: 'hello', insertionTime: '2026-01-01T00:00:00Z' },
    { deviceIds: [1, 2], userId: 7, note: 'bulk' },
    { note: 'updated' },
    { noteIds: ['9'] },
  ]);
  assert.deepEqual(calls.slice(-2).map((c) => `${c.method} ${c.path}`), [
    'DELETE /api/devices/1/notes', 'DELETE /api/devices/1/notes/9',
  ]);
});
