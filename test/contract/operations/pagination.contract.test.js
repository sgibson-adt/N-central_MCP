import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PAGINATION_POLICIES, paginationArgs } from '../../../src/shared.js';
import { MAX_PAGES, MAX_RECORDS } from '../../../src/paginator.js';

describe('operation pagination policy', () => {
  it('accepts integer page values through the documented global maximum unchanged', () => {
    assert.equal(paginationArgs({ pageNumber: 1 }).pageNumber, 1);
    assert.equal(paginationArgs({ pageNumber: 23 }).pageNumber, 23);
    assert.equal(paginationArgs({ pageSize: 1000 }).pageSize, 1000);
  });

  it('passes -1 only for operations that document it', () => {
    assert.equal(paginationArgs({ pageSize: -1 }, PAGINATION_POLICIES.allowAll).pageSize, -1);
    assert.throws(
      () => paginationArgs({ pageSize: -1 }, PAGINATION_POLICIES.positiveOnly),
      /pageSize.*1.*1000/,
    );
  });

  it('keeps active-issue paging positive-only', () => {
    assert.equal(PAGINATION_POLICIES.activeIssues.allowMinusOne, false);
    assert.throws(
      () => paginationArgs({ pageSize: -1 }, PAGINATION_POLICIES.activeIssues),
      /pageSize.*1.*1000/,
    );
  });

  it('rejects invalid values instead of silently normalizing them', () => {
    for (const value of [0, -1, 1.5, '2', Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.throws(() => paginationArgs({ pageNumber: value }), /pageNumber.*integer.*1/);
    }
    for (const value of [0, -2, 1.5, '2', 1001, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.throws(
        () => paginationArgs({ pageSize: value }, PAGINATION_POLICIES.allowAll),
        /pageSize.*-1.*1.*1000/,
      );
    }
    for (const value of [-1, 0, -2, 1.5, '2', 1001, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.throws(
        () => paginationArgs({ pageSize: value }, PAGINATION_POLICIES.positiveOnly),
        /pageSize.*1.*1000/,
      );
    }
    for (const value of [0, 1, 'true', null]) {
      assert.throws(() => paginationArgs({ all: value }), /all.*boolean/);
    }
  });

  it('publishes the bounded automatic-pagination limits', () => {
    assert.equal(MAX_PAGES, 20);
    assert.equal(MAX_RECORDS, 10_000);
  });
});
