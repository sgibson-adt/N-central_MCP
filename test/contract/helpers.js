// @ts-check
/** OpenAPI inventory, local-reference, and coverage-manifest helpers. */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const OPENAPI_PATH = path.join(ROOT, 'test/openapi-spec.json');
export const COVERAGE_SCHEMA_PATH = path.join(
  ROOT,
  'specs/001-api-contract-parity/contracts/coverage-record.schema.json',
);

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete']);

/** @param {string} filePath */
export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function loadOpenApi() {
  return readJson(OPENAPI_PATH);
}

/** @param {string} method @param {string} apiPath */
export function operationKey(method, apiPath) {
  return `${method.toUpperCase()} ${apiPath}`;
}

/** @param {string} pointer */
function decodePointer(pointer) {
  return pointer.split('/').slice(1).map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/** @param {unknown} document @param {string} ref */
export function resolveLocalRef(document, ref) {
  if (!ref.startsWith('#/')) throw new Error(`Only local OpenAPI references are supported: ${ref}`);
  return decodePointer(ref).reduce((value, key) => value?.[key], document);
}

/**
 * Recursively replace local `$ref` objects while retaining sibling keys.
 * Cycles are left as their original `$ref` object so traversal stays bounded.
 * @param {unknown} value
 * @param {unknown} document
 * @param {Set<string>} [stack]
 * @returns {unknown}
 */
export function dereferenceLocal(value, document, stack = new Set()) {
  if (Array.isArray(value)) return value.map((item) => dereferenceLocal(item, document, stack));
  if (!value || typeof value !== 'object') return value;
  const object = /** @type {Record<string, unknown>} */ (value);
  if (typeof object.$ref === 'string') {
    if (stack.has(object.$ref)) return { ...object };
    const target = resolveLocalRef(document, object.$ref);
    if (target === undefined) throw new Error(`Unresolved OpenAPI reference: ${object.$ref}`);
    const nextStack = new Set(stack).add(object.$ref);
    const siblings = Object.fromEntries(Object.entries(object).filter(([key]) => key !== '$ref'));
    return {
      .../** @type {Record<string, unknown>} */ (dereferenceLocal(target, document, nextStack)),
      .../** @type {Record<string, unknown>} */ (dereferenceLocal(siblings, document, nextStack)),
    };
  }
  return Object.fromEntries(
    Object.entries(object).map(([key, item]) => [key, dereferenceLocal(item, document, stack)]),
  );
}

/** @param {ReturnType<typeof loadOpenApi>} document */
export function enumerateOperations(document) {
  const operations = [];
  for (const [apiPath, pathItem] of Object.entries(document.paths || {})) {
    const sharedParameters = pathItem.parameters || [];
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method)) continue;
      operations.push({
        key: operationKey(method, apiPath),
        method: method.toUpperCase(),
        path: apiPath,
        operation,
        parameters: [...sharedParameters, ...(operation.parameters || [])],
      });
    }
  }
  return operations.sort((a, b) => a.key.localeCompare(b.key));
}

/** @param {ReturnType<typeof enumerateOperations>[number]} entry @param {unknown} document */
export function pathParameterErrors(entry, document) {
  const declared = new Set(
    entry.parameters
      .map((parameter) => dereferenceLocal(parameter, document))
      .filter((parameter) => parameter?.in === 'path')
      .map((parameter) => parameter.name),
  );
  const templated = new Set([...entry.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]));
  return [
    ...[...templated].filter((name) => !declared.has(name)).map((name) => `missing declaration: ${name}`),
    ...[...declared].filter((name) => !templated.has(name)).map((name) => `unused declaration: ${name}`),
  ];
}

export function createCoverageValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false });
  addFormats(ajv);
  return ajv.compile(readJson(COVERAGE_SCHEMA_PATH));
}
