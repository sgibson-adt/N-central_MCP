import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PAGINATION_POLICIES, paginationArgs } from '../../../src/shared.js';
import { MAX_PAGES, MAX_RECORDS } from '../../../src/paginator.js';

describe('operation pagination policy', () => {
  it('accepts ordinary page sizes through the documented global maximum', () => {
    assert.equal(paginationArgs({ pageSize: 1000 }).pageSize, 1000);
    assert.equal(paginationArgs({ pageSize: 1001 }).pageSize, 1000);
  });

  it('passes -1 only for operations that document it', () => {
    assert.equal(paginationArgs({ pageSize: -1 }, PAGINATION_POLICIES.allowAll).pageSize, -1);
    assert.equal(paginationArgs({ pageSize: -1 }, PAGINATION_POLICIES.positiveOnly).pageSize, 1);
  });

  it('keeps active-issue paging positive-only', () => {
    assert.equal(PAGINATION_POLICIES.activeIssues.allowMinusOne, false);
    assert.equal(paginationArgs({ pageSize: -1 }, PAGINATION_POLICIES.activeIssues).pageSize, 1);
  });

  it('publishes the bounded automatic-pagination limits', () => {
    assert.equal(MAX_PAGES, 20);
    assert.equal(MAX_RECORDS, 10_000);
  });
});
