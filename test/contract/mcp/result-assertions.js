// @ts-check
/** Assertions shared by MCP structured-result contract tests. */

import assert from 'node:assert/strict';

/** @param {unknown} value */
export function serializedBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

/** @param {(value: unknown) => boolean} validate @param {unknown} value */
export function assertSchemaValid(validate, value) {
  assert.equal(validate(value), true, JSON.stringify(validate.errors || [], null, 2));
}

/** @param {unknown} result */
export function assertStructuredResult(result) {
  assert.ok(result && typeof result === 'object', 'result must be an object');
  assert.ok(result.structuredContent, 'result must include structuredContent');
  assert.ok(Array.isArray(result.content), 'result must include readable content');
  assert.ok(result.content.some((item) => item?.type === 'text'), 'result must include text fallback');
  const structured = result.structuredContent;
  assert.ok(Object.hasOwn(structured, 'data'), 'structuredContent.data is required');
  assert.ok(structured.meta && typeof structured.meta === 'object', 'structuredContent.meta is required');
  assert.ok(Array.isArray(structured.meta.operations), 'meta.operations must be an array');
  assert.equal(typeof structured.meta.partial, 'boolean');
  assert.ok(Array.isArray(structured.meta.errors), 'meta.errors must be an array');
  assert.equal(typeof structured.meta.truncated, 'boolean');
}

/** @param {unknown} value @param {number} maximum */
export function assertSerializedSize(value, maximum) {
  const bytes = serializedBytes(value);
  assert.ok(bytes <= maximum, `serialized result is ${bytes} bytes; maximum is ${maximum}`);
}

/** @param {unknown} result @param {string[]} forbidden */
export function assertRedacted(result, forbidden) {
  const text = JSON.stringify(result);
  for (const secret of forbidden) assert.equal(text.includes(secret), false, `secret leaked: ${secret}`);
}
