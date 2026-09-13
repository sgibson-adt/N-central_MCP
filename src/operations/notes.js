// @ts-check
import { apiDelete, apiPost, apiPut, sanitizePathParam } from '../client.js';

function canonical(value, alias, name) {
  if (value != null && alias != null && value !== alias) throw new Error(`${name} conflicts with its deprecated alias`);
  const selected = value ?? alias;
  if (selected == null || selected === '') throw new Error(`${name} is required`);
  return selected;
}

export function addDeviceNote(args) {
  return apiPost(`/api/devices/${sanitizePathParam(args.deviceId)}/notes`, {
    userId: args.userId,
    note: canonical(args.note, args.text, 'note'),
    ...(args.insertionTime == null ? {} : { insertionTime: args.insertionTime }),
  });
}
export function addNotesBulk(args) {
  return apiPost('/api/devices/notes', {
    deviceIds: canonical(args.deviceIds, args.deviceIDs, 'deviceIds'),
    userId: args.userId,
    note: canonical(args.note, args.text, 'note'),
    ...(args.insertionTime == null ? {} : { insertionTime: args.insertionTime }),
  });
}
export function updateDeviceNote(args) {
  return apiPut(`/api/devices/${sanitizePathParam(args.deviceId)}/notes/${sanitizePathParam(args.noteId)}`, {
    note: canonical(args.note, args.text, 'note'),
  });
}
export const deleteDeviceNote = (deviceId, noteId) =>
  apiDelete(`/api/devices/${sanitizePathParam(deviceId)}/notes/${sanitizePathParam(noteId)}`);
export function deleteDeviceNotes(args) {
  if (!Array.isArray(args.noteIds) || args.noteIds.length === 0) throw new Error('noteIds must be a non-empty array');
  return apiDelete(`/api/devices/${sanitizePathParam(args.deviceId)}/notes`, {}, { noteIds: args.noteIds });
}
