import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
const image = `ncentral-mcp-smoke:${process.pid}`;
const dockerAvailable = process.env.RUN_CONTAINER_SMOKE === '1'
  && spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0;
let imageBuilt = false;

function docker(args, options = {}) {
  return spawnSync('docker', args, { encoding: 'utf8', timeout: 120_000, ...options });
}

after(() => {
  if (imageBuilt) docker(['image', 'rm', '--force', image], { stdio: 'ignore' });
});

describe('release container', () => {
  it('declares Node 24 Alpine, non-root execution, and a health probe', () => {
    assert.match(dockerfile, /^FROM node:24-alpine$/m);
    assert.match(dockerfile, /^USER (?!root$)\S+$/m);
    assert.match(dockerfile, /^HEALTHCHECK /m);
  });

  it('runs as Node 24/non-root, fails safely without credentials, and becomes healthy', async (t) => {
    if (!dockerAvailable) {
      t.skip('Set RUN_CONTAINER_SMOKE=1 with Docker available to run image lifecycle assertions');
      return;
    }
    const built = docker(['build', '--tag', image, '.']);
    assert.equal(built.status, 0, built.stderr);
    imageBuilt = true;

    const version = docker(['run', '--rm', '--entrypoint', 'node', image, '--version']);
    assert.equal(version.status, 0, version.stderr);
    assert.match(version.stdout.trim(), /^v24\./);
    const uid = docker(['run', '--rm', '--entrypoint', 'id', image, '-u']);
    assert.equal(uid.status, 0, uid.stderr);
    assert.notEqual(uid.stdout.trim(), '0');

    const missingCredentials = docker(['run', '--rm', image]);
    assert.equal(missingCredentials.status, 1);
    assert.match(missingCredentials.stderr, /NC_SERVER_URL and NC_JWT_TOKEN/);

    const started = docker([
      'run', '--detach', '--health-interval', '1s', '--health-start-period', '0s', '--health-retries', '10',
      '--env', 'NC_MULTI_TENANT=1', '--env', 'MCP_PORT=3100', '--env', 'MCP_API_KEY=smoke', image,
    ]);
    assert.equal(started.status, 0, started.stderr);
    const containerId = started.stdout.trim();
    try {
      let health = 'starting';
      for (let attempt = 0; attempt < 40 && health === 'starting'; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        health = docker(['inspect', '--format', '{{.State.Health.Status}}', containerId]).stdout.trim();
      }
      assert.equal(health, 'healthy');
    } finally {
      docker(['rm', '--force', containerId], { stdio: 'ignore' });
    }
  });
});
