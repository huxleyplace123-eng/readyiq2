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
