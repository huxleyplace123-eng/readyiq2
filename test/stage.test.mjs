// test/stage.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/state.js';

const base = () => { const s = S.fixtures(); return { s, c: S.getConsumer(s, 'priya') }; };
const withScore = (c, value) => ({ ...c, score: { ...c.score, value } });

test('stage vocabulary is exactly four values with labels', () => {
  assert.deepEqual(S.STAGES, ['not_ready', 'working', 'approaching', 'ready_to_review']);
  assert.equal(S.STAGE_LABELS.ready_to_review, 'Ready to review');
  assert.equal(S.BUFFER_DEFAULT, 20);
  assert.equal(S.fixtures().lender.buffer, 20);
});

test('every fixture lands on the expected stage', () => {
  const s = S.fixtures();
  const expected = { maria: 'working', jordan: 'not_ready', denise: 'approaching', sam: 'working', priya: 'ready_to_review', tom: 'ready_to_review', aisha: 'working' };
  for (const [id, want] of Object.entries(expected)) assert.equal(S.stage(S.getConsumer(s, id), s.lender), want, id);
});

test('buffer boundaries around a 640 floor', () => {
  const { s, c } = base();                     // priya: util .18, no derog, no disputes
  assert.equal(S.stage(withScore(c, 624), s.lender), 'working');       // floor - 16
  assert.equal(S.stage(withScore(c, 625), s.lender), 'approaching');   // floor - 15
  assert.equal(S.stage(withScore(c, 659), s.lender), 'approaching');   // floor + 19
  assert.equal(S.stage(withScore(c, 660), s.lender), 'ready_to_review'); // floor + 20
  assert.equal(S.stage(withScore(c, 660), { ...s.lender, buffer: 30 }), 'approaching'); // lender widened the buffer
});

test('ready_to_review needs more than the score', () => {
  const { s, c } = base();
  assert.equal(S.stage({ ...c, credit: { ...c.credit, utilization: 0.31 } }, s.lender), 'approaching');
  assert.equal(S.stage({ ...c, credit: { ...c.credit, derogLast12mo: true } }, s.lender), 'approaching');
  assert.equal(S.stage({ ...c, disputes: [{ status: 'sent' }] }, s.lender), 'working');
  assert.equal(S.stage({ ...c, score: { ...c.score, value: null } }, s.lender), 'not_ready');
  assert.equal(S.stage({ ...c, credit: { ...c.credit, tradelines: 2 } }, s.lender), 'not_ready');
});

test('stageReason keeps the pathway as the reason under Working', () => {
  const s = S.fixtures();
  assert.equal(S.stageReason(S.getConsumer(s, 'sam'), s.lender), 'dispute');
  assert.equal(S.stageReason(S.getConsumer(s, 'maria'), s.lender), 'build');
  assert.equal(S.stageReason(S.getConsumer(s, 'jordan'), s.lender), 'thin');
});

test('recordReviewOutcome stores the formal-pull result on the consumer', () => {
  const s = S.fixtures();
  const c = S.recordReviewOutcome(s, 'priya', { outcome: 'qualified', at: '2026-09-03' });
  assert.deepEqual(c.reviewOutcome, { outcome: 'qualified', at: '2026-09-03' });
  assert.throws(() => S.recordReviewOutcome(s, 'priya', { outcome: 'maybe' }), /unknown outcome/);
  assert.equal(S.recordReviewOutcome(s, 'nobody', { outcome: 'short' }), null);
});

test('RISK names every threshold once and riskSignals reads a real file correctly', () => {
  assert.deepEqual(S.RISK, { utilizationHigh: 0.5, utilizationTarget: 0.3, dtiMax: 0.45, derogWindowMonths: 24 });
  const s = S.fixtures();
  const sam = S.riskSignals(S.getConsumer(s, 'sam'));       // 2 unresolved disputes, util .22, dti .12
  assert.equal(sam.openDisputes, true);
  assert.equal(sam.dtiRatio, 0.12);
  assert.equal(sam.dtiOverMax, false);
  assert.equal(sam.utilizationHigh, false);
  assert.equal(sam.utilizationOverTarget, false);
  const maria = S.riskSignals(S.getConsumer(s, 'maria'));   // 2 lates in 24mo, util .41
  assert.equal(maria.derogRecent, true);
  assert.equal(maria.utilizationOverTarget, true);
  assert.equal(maria.utilizationHigh, false);
  assert.equal(S.riskSignals({ ...S.getConsumer(s, 'maria'), income: null }).dtiRatio, null);
});

test('the pathway and the stage never disagree about what counts as risk', () => {
  const s = S.fixtures();
  for (const c of s.consumers) {
    const risk = S.riskSignals(c);
    const path = S.assignPathway(c, s.lender), st = S.stage(c, s.lender);
    if (risk.openDisputes || risk.derogRecent || risk.utilizationHigh || risk.dtiOverMax) {
      assert.notEqual(st, 'ready_to_review', `${c.id}: carries risk but the stage says ready_to_review`);
      assert.ok(['dispute', 'dti', 'build', 'thin'].includes(path), `${c.id}: carries risk but the pathway is ${path}`);
    }
    if (st === 'ready_to_review') assert.equal(path, 'ready_now', `${c.id}: ready_to_review must imply the ready_now pathway`);
  }
});
