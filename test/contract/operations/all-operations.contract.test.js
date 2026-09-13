import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { it } from 'node:test';
import assert from 'node:assert/strict';

const manifest = JSON.parse(readFileSync(new URL('../operation-coverage.json', import.meta.url)));
it('gives every supported operation verified evidence and every exclusion reviewed rationale', () => {
  for (const operation of manifest.operations) {
    if (operation.status !== 'not-implemented') {
      assert.equal(operation.verificationStatus, 'verified', operation.operationKey);
      assert.ok(operation.testEvidence.length > 0, operation.operationKey);
      for (const evidence of operation.testEvidence) {
        assert.equal(existsSync(evidence.split('#')[0]), true, `${operation.operationKey}: ${evidence}`);
      }
    }
    if (operation.exposure === 'excluded') {
      assert.equal(operation.verificationStatus, 'excluded', operation.operationKey);
      assert.ok(operation.rationale?.length > 20, operation.operationKey);
    }
  }
});
