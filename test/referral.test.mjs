import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReadinessSummary, buildReferral, assertReferralCompliant, ReferralNotCompliant, REFERRAL_DIRECTIONS } from '../server/referral.js';
import { assertNoReportData } from '../server/status-object.js';
import { fixtures, getConsumer } from '../src/state.js';

const s = fixtures();
const consent = { granted_at: '2026-09-02T15:00:00Z', scope: 'share_readiness_summary', text_version: 'v1' };
const cr = { kind: 'credit_repair', id: 'brightpath' };
const lo = { kind: 'lo', id: 'sarah' };

test('a readiness summary is derived status only and never carries report data', () => {
  const sum = buildReadinessSummary(getConsumer(s, 'sam'), s.lender);
  assert.equal(sum.object, 'readiness_summary');
  assert.equal(sum.stage, 'working');
  assert.equal(sum.reason, 'dispute');
  assert.deepEqual(sum.disputes, { open: 2, resolved: 0 });
  assert.equal(sum.dti_in_range, true);          // 873 / 7100 = 0.12
  assert.equal(sum.rent_months_verified, 0);
  assert.equal(sum.lo_of_record, 'sarah');
  assert.equal(sum.buffer_applied, 20);
  assert.ok(!('income' in sum) && !('score' in sum));
  assertNoReportData(sum);
});

test('floors_met and dti_in_range come from the lender programs and the 45% line', () => {
  const sum = buildReadinessSummary(getConsumer(s, 'priya'), s.lender);
  assert.deepEqual(sum.floors_met, ['FHA', 'Conventional', 'Harbor Down-Payment Assist']);
  assert.equal(buildReadinessSummary(getConsumer(s, 'jordan'), s.lender).dti_in_range, true);  // income 5200, debts 85 → 0.02
  assert.equal(buildReadinessSummary({ ...getConsumer(s, 'maria'), income: null }, s.lender).dti_in_range, null); // no income → unknown, not false
});

test('a referral needs a direction, a consent, and at least one recipient', () => {
  const r = buildReferral({ direction: 'cr_to_lo', from: cr, to: [lo], consumer: getConsumer(s, 'denise'), lender: s.lender, consent, id: 'ref_1', createdAt: '2026-09-02T15:01:00Z' });
  assert.equal(r.object, 'referral');
  assert.equal(r.direction, 'cr_to_lo');
  assert.deepEqual(r.to, [lo]);
  assert.equal(r.summary.stage, 'approaching');
  assert.equal(r.status, 'sent');
  assert.deepEqual(REFERRAL_DIRECTIONS, ['lo_to_cr', 'cr_to_lo']);
  assert.throws(() => buildReferral({ direction: 'cr_to_lo', from: cr, to: [], consumer: getConsumer(s, 'denise'), lender: s.lender, consent }), ReferralNotCompliant);
  assert.throws(() => buildReferral({ direction: 'cr_to_lo', from: cr, to: [lo], consumer: getConsumer(s, 'denise'), lender: s.lender, consent: { scope: 'x' } }), /consent/);
  assert.throws(() => buildReferral({ direction: 'sideways', from: cr, to: [lo], consumer: getConsumer(s, 'denise'), lender: s.lender, consent }), /direction/);
});

test('nothing of value may ride on a referral, at any depth', () => {
  const r = buildReferral({ direction: 'cr_to_lo', from: cr, to: [lo, { kind: 'lo', id: 'marcus' }], consumer: getConsumer(s, 'denise'), lender: s.lender, consent });
  assertReferralCompliant(r);                              // multi-LO is fine
  for (const bad of ['fee', 'compensation', 'bonus', 'rank', 'preferred', 'commission']) {
    assert.throws(() => assertReferralCompliant({ ...r, extra: { [bad]: 1 } }), ReferralNotCompliant, bad);
  }
  assert.throws(() => assertReferralCompliant({ ...r, summary: { ...r.summary, score: 700 } }), /report data/);
});
