import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGINATION_POLICIES, paginationArgs } from '../src/shared.js';

test('pagination policies preserve valid integers and reject invalid values', () => {
  assert.deepEqual(
    paginationArgs({ pageNumber: 2, pageSize: -1 }, PAGINATION_POLICIES.allowAll),
    { pageNumber: 2, pageSize: -1, select: undefined, sortBy: undefined, sortOrder: undefined },
  );
  assert.throws(() => paginationArgs({ pageNumber: 0 }), /pageNumber/);
  assert.throws(() => paginationArgs({ pageSize: -1 }), /pageSize/);
  assert.throws(() => paginationArgs({ pageSize: 1001 }, PAGINATION_POLICIES.allowAll), /pageSize/);
  assert.throws(() => paginationArgs({ all: 'true' }), /all/);
});
