import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkVersionConsistency } from '../scripts/check-version-consistency.js';

const temporaryRoots = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture({ packageVersion = '2.1.0', lockVersion = packageVersion, rootLockVersion = lockVersion, serverVersion = packageVersion, malformedPackage = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ncentral-version-'));
  temporaryRoots.push(root);
  writeFileSync(join(root, 'package.json'), malformedPackage ? '{' : JSON.stringify({ version: packageVersion }));
  writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ version: lockVersion, packages: { '': { version: rootLockVersion } } }));
  writeFileSync(join(root, 'src-mcp-server.js'), `const server = { version: '${serverVersion}' };\n`);
  return root;
}

describe('version consistency checker', () => {
  it('accepts matching package, lockfile, lock root, and server metadata without writing', () => {
    const root = fixture();
    const before = ['package.json', 'package-lock.json', 'src-mcp-server.js'].map((file) => readFileSync(join(root, file), 'utf8'));
    const result = checkVersionConsistency({ root, serverMetadataPath: 'src-mcp-server.js' });
    assert.deepEqual(result, { ok: true, version: '2.1.0', errors: [] });
    assert.deepEqual(['package.json', 'package-lock.json', 'src-mcp-server.js'].map((file) => readFileSync(join(root, file), 'utf8')), before);
  });

  it('reports every mismatched metadata location', () => {
    const result = checkVersionConsistency({ root: fixture({ lockVersion: '2.2.0', rootLockVersion: '2.3.0', serverVersion: '2.4.0' }), serverMetadataPath: 'src-mcp-server.js' });
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /package-lock\.json version.*2\.2\.0/);
    assert.match(result.errors.join('\n'), /package-lock\.json root package version.*2\.3\.0/);
    assert.match(result.errors.join('\n'), /src-mcp-server\.js server version.*2\.4\.0/);
  });

  it('returns a useful failure for malformed metadata', () => {
    const result = checkVersionConsistency({ root: fixture({ malformedPackage: true }), serverMetadataPath: 'src-mcp-server.js' });
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /package\.json.*valid JSON/i);
  });

  it('enforces an optional expected target version', () => {
    const result = checkVersionConsistency({ root: fixture(), serverMetadataPath: 'src-mcp-server.js', expectedVersion: '3.0.0' });
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /expected 3\.0\.0.*found 2\.1\.0/i);
  });
});
