// @ts-check
/** Deterministic toolset/write-mode vectors shared by catalog tests. */

export const TOOLSET_NAMES = Object.freeze([
  'core',
  'operations',
  'administration',
  'psa',
  'reporting',
  'compatibility',
]);

export const WRITE_MODES = Object.freeze(['read-only', 'write', 'full']);

export const validToolsetVectors = Object.freeze([
  { raw: undefined, expected: ['core'] },
  { raw: '', expected: ['core'] },
  { raw: '   ', expected: ['core'] },
  { raw: 'core', expected: ['core'] },
  { raw: 'CORE, core', expected: ['core'] },
  { raw: 'core,psa', expected: ['core', 'psa'] },
  { raw: ' reporting , operations ', expected: ['operations', 'reporting'] },
  { raw: 'compatibility', expected: ['compatibility'] },
]);

export const invalidToolsetVectors = Object.freeze([
  { raw: 'unknown', reason: 'unknown' },
  { raw: 'core,,psa', reason: 'malformed' },
  { raw: ',core', reason: 'malformed' },
  { raw: 'core,', reason: 'malformed' },
]);

export const writeModeVectors = Object.freeze([
  { mode: undefined, scopes: ['read'] },
  { mode: 'read-only', scopes: ['read'] },
  { mode: 'write', scopes: ['read', 'write'] },
  { mode: 'full', scopes: ['read', 'write', 'destructive'] },
]);
