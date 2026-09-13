import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('repository release-quality contracts', () => {
  it('keeps examples read-only and Docker publication localhost-only by default', () => {
    const example = read('.env.example');
    assert.match(example, /^NC_WRITE_MODE=read-only$/m);
    assert.doesNotMatch(example, /^MCP_PORT=/m);
    assert.match(example, /^# MCP_PORT=3100$/m);
    assert.doesNotMatch(example, /read-only\s*[—-]\s*only GET endpoints/i);
    assert.match(read('docker-compose.yml'), /"127\.0\.0\.1:3100:3100"/);
    assert.doesNotMatch(read('docker-compose.yml'), /"0\.0\.0\.0:3100:3100"/);
    assert.match(read('README.md'), /stdio mode.*default.*MCP_PORT.*set/is);
  });

  it('runs explicit readiness and enforced coverage floors in the aggregate gate', () => {
    const pkg = JSON.parse(read('package.json'));
    assert.equal(pkg.scripts['test:coverage'], 'node scripts/check-critical-coverage.js');
    const coverageGate = read('scripts/check-critical-coverage.js');
    assert.match(coverageGate, /--test-coverage-lines=85/);
    assert.match(coverageGate, /--test-coverage-branches=70/);
    assert.match(coverageGate, /--test-coverage-functions=70/);
    assert.match(coverageGate, /CRITICAL_COVERAGE_FLOORS/);
    assert.match(pkg.scripts['release:check'], /npm run test:coverage/);
    assert.match(pkg.scripts['release:check'], /npm run release:readiness:check/);
  });

  it('excludes common secret and non-runtime files from Git and image contexts', () => {
    const gitignore = read('.gitignore');
    for (const pattern of ['*.p12', '*.pfx', '*.crt', '.codex/']) assert.ok(gitignore.includes(pattern), pattern);

    const dockerignore = read('.dockerignore');
    for (const pattern of ['*.p12', '*.pfx', '*.crt', '.agents/', '.specify/', 'specs/', 'scripts/']) {
      assert.ok(dockerignore.includes(pattern), pattern);
    }
  });

  it('documents metrics authentication, URL validation, and the complete maintenance surface', () => {
    const setup = read('docs/SETUP-GUIDE.md');
    assert.match(setup, /metrics.*open by default.*MCP_METRICS_REQUIRE_AUTH=1/is);
    assert.match(setup, /server URL.*validated at startup/is);

    const readme = read('README.md');
    for (const path of ['config.js', 'http-runtime.js', 'mcp-server.js', 'ARCHITECTURE.md', 'DEPENDENCY-REVIEW.md', 'MCP-EVALUATION.md', 'OPENAPI-UPDATE.md', 'RELEASE-READINESS.md', 'VERIFICATION.md']) {
      assert.ok(readme.includes(path), path);
    }
  });

  it('lists the hardening scripts and tests in the README project inventory', () => {
    const readme = read('README.md');
    for (const path of [
      'check-critical-coverage.js', 'live-readonly-smoke.js', 'config.test.js',
      'critical-coverage.test.js', 'repository-quality.test.js', 'server-runtime.test.js',
    ]) assert.ok(readme.includes(path), path);
  });

  it('provides a guarded read-only live verification path with no retained tenant output', () => {
    const pkg = JSON.parse(read('package.json'));
    assert.match(pkg.scripts['test:live:read-only'], /RUN_LIVE_TESTS=1/);
    assert.match(pkg.scripts['test:live:read-only'], /NC_WRITE_MODE=read-only/);
    const smoke = read('scripts/live-readonly-smoke.js');
    assert.match(smoke, /RUN_LIVE_TESTS/);
    assert.doesNotMatch(smoke, /apiPost|apiPatch|apiPut|apiDelete/);
    assert.doesNotMatch(smoke, /JSON\.stringify\([^\n]*(response|data)/);
    assert.match(read('docs/VERIFICATION.md'), /temporary.*token.*outside\s+source\s+control/is);
    assert.match(read('docs/OPENAPI-UPDATE.md'), /source URL.*retrieval.*product version.*SHA-256/is);
  });

  it('states the process-local deployment boundary without claiming horizontal scaling', () => {
    const architecture = read('docs/ARCHITECTURE.md');
    assert.match(architecture, /sessions.*rate-limit.*process-local/is);
    assert.match(architecture, /one server process|session affinity/is);
    assert.match(architecture, /round-robin.*unsupported/is);
    assert.match(architecture, /after\s+3\.0/is);
    assert.match(read('docs/SETUP-GUIDE.md'), /session affinity.*round-robin.*unsupported/is);
  });

  it('does not retain unsafe numeric coercion or raw session/request error logging', () => {
    const runtime = [read('index.js'), read('src/auth.js'), read('src/client.js'), read('src/resources.js')].join('\n');
    assert.doesNotMatch(runtime, /(?:^|[^A-Za-z])Number\(process\.env\./m);
    assert.doesNotMatch(read('index.js'), /Cleaning stale session|POST \/mcp error/);
  });
});
