// test/lo-buckets.test.mjs — the LO feed is three buckets, one blocker per row, scores out of the row.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lo = readFileSync(new URL('../src/screens/lo.tsx', import.meta.url), 'utf8');
const stage = readFileSync(new URL('../src/screens/stage.tsx', import.meta.url), 'utf8');

test('three buckets, four stages, one action per row', () => {
  for (const label of ['Not ready', 'Progressing', 'Ready to review']) assert.ok(stage.includes(`'${label}'`), label);
  assert.ok(stage.includes("approaching") && stage.includes("ready_to_review"));
  assert.ok(lo.includes('bucketOf('), 'feed groups rows with bucketOf');
  assert.ok(lo.includes('Send to credit-repair partner'), 'the LO can send a borrower out');
  assert.ok(lo.includes('Request soft pull'), 'approaching rows carry the soft-pull action');
  assert.ok(!lo.includes('<th>All 3 bureau scores</th>'), 'scores leave the row');
  assert.ok(lo.includes('Ready-to-review precision'), 'precision stat is on the feed');
});
