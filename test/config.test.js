import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseConfiguredNumber } from '../src/config.js';

describe('bounded numeric configuration', () => {
  const options = { minimum: 1, maximum: 100, integer: true };

  it('accepts values inside the declared bounds', () => {
    assert.equal(parseConfiguredNumber('42', 10, options), 42);
  });

  it('rejects explicitly malformed, non-finite, fractional, or out-of-range values', () => {
    for (const value of ['nope', 'Infinity', '1.5', '-1', '101']) {
      assert.throws(
        () => parseConfiguredNumber(value, 10, { ...options, name: 'TEST_LIMIT' }),
        /Invalid TEST_LIMIT/,
        value,
      );
    }
  });

  it('uses the fallback only when a setting is absent or blank', () => {
    assert.equal(parseConfiguredNumber(undefined, 10, { ...options, name: 'TEST_LIMIT' }), 10);
    assert.equal(parseConfiguredNumber('  ', 10, { ...options, name: 'TEST_LIMIT' }), 10);
  });

  it('preserves an intentional zero when the lower bound permits it', () => {
    assert.equal(parseConfiguredNumber('0', 3, { name: 'ZERO_LIMIT', minimum: 0, integer: true }), 0);
  });
});
