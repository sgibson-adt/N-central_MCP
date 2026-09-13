#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function readJson(root, name, errors) {
  try {
    return JSON.parse(readFileSync(resolve(root, name), 'utf8'));
  } catch {
    errors.push(`${name} must contain valid JSON`);
    return null;
  }
}

export function checkVersionConsistency({ root = process.cwd(), expectedVersion } = {}) {
  const errors = [];
  const pkg = readJson(root, 'package.json', errors);
  const lock = readJson(root, 'package-lock.json', errors);
  let index = '';
  try { index = readFileSync(resolve(root, 'index.js'), 'utf8'); }
  catch { errors.push('index.js must be readable'); }

  const version = typeof pkg?.version === 'string' ? pkg.version : null;
  if (pkg && !version) errors.push('package.json version must be a string');
  if (version && !SEMVER.test(version)) errors.push(`package.json version is not valid semver: ${version}`);

  const locations = [
    ['package-lock.json version', lock?.version],
    ['package-lock.json root package version', lock?.packages?.['']?.version],
    ['index.js server version', /\bversion\s*:\s*['"]([^'"]+)['"]/.exec(index)?.[1]],
  ];
  if (version) {
    for (const [label, found] of locations) {
      if (found !== version) errors.push(`${label} must match package.json ${version}; found ${found ?? 'missing'}`);
    }
    if (expectedVersion && version !== expectedVersion) {
      errors.push(`expected ${expectedVersion} but found ${version} in package.json`);
    }
  }
  return { ok: errors.length === 0, version, errors };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const result = checkVersionConsistency({ expectedVersion: process.argv[2] });
  if (!result.ok) {
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Version metadata is consistent: ${result.version}`);
  }
}
