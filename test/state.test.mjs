// test/state.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/state.js';

test('fixtures: seven consumers, one per pathway story, all well-formed', () => {
  const f = S.fixtures();
  assert.equal(f.consumers.length, 7);
  for (const c of f.consumers) {
    for (const k of ['id', 'first', 'last', 'loId', 'status', 'pathway', 'round', 'roundsEstimated', 'score', 'credit', 'disputes', 'rentReporting', 'deltas', 'milestones', 'nextAction'])
      assert.ok(k in c, `${c.id} missing ${k}`);
    assert.ok(S.PATHWAYS.includes(c.pathway), `${c.id} bad pathway ${c.pathway}`);
    if (c.score.value != null && c.score.prev != null) {
      const sum = c.deltas.reduce((a, d) => a + d.points, 0);
      assert.equal(sum, c.score.value - c.score.prev, `${c.id} deltas must reconcile`);
    }
    assert.equal(c.milestones.filter((m) => m.state === 'current').length, 1, `${c.id} exactly one current milestone`);
  }
  assert.ok(f.lender.floors.conventional === 640);
  assert.equal(f.session.role, 'consumer');
});

test('store: fixtures() returns fresh copies; loadState falls back to fixtures without localStorage', () => {
  const a = S.fixtures(), b = S.fixtures();
  a.consumers[0].first = 'Changed';
  assert.notEqual(b.consumers[0].first, 'Changed');
  const s = S.loadState();
  assert.equal(s.consumers.length, 7);
  assert.equal(S.getConsumer(s, 'maria').last, 'Delgado');
  assert.equal(S.getLO(s, 'sarah').nmls, '1234567');
  assert.equal(S.getLender(s).id, 'harbor');
});

test('assignPathway agrees with every fixture and applies rules in the documented order', () => {
  const s = S.fixtures();
  for (const c of s.consumers) if (c.status === 'active' || c.status === 'review_requested') assert.equal(S.assignPathway(c, s.lender), c.pathway, c.id);
  const base = S.getConsumer(s, 'priya');
  assert.equal(S.assignPathway({ ...base, disputes: [{ status: 'sent' }] }, s.lender), 'dispute');
  assert.equal(S.assignPathway({ ...base, credit: { ...base.credit, tradelines: 2 } }, s.lender), 'thin');
  assert.equal(S.assignPathway({ ...base, income: 700 }, s.lender), 'dti'); // 360/700 = 0.51
  assert.equal(S.assignPathway({ ...base, credit: { ...base.credit, utilization: 0.61 } }, s.lender), 'build');
  assert.equal(S.assignPathway({ ...base, score: { ...base.score, value: 615 } }, s.lender), 'near_ready');
});

test('eligibilityDates: Chapter 7 → FHA +2y, conventional +4y', () => {
  const d = S.eligibilityDates([{ type: 'chapter7', date: '2025-03-12' }]);
  assert.equal(d[0].fha, '2027-03-12');
  assert.equal(d[0].conventional, '2029-03-12');
  assert.equal(S.eligibilityDates([]).length, 0);
  assert.equal(S.fmtDate('2027-03-12'), 'Mar 12, 2027');
});

test('dti and readinessTrigger', () => {
  assert.equal(S.dti([{ payment: 400 }, { payment: 100 }], 2000), 0.25);
  assert.equal(S.dti([{ payment: 400 }], null), null);
  const s = S.fixtures();
  assert.equal(S.readinessTrigger(S.getConsumer(s, 'priya'), s.lender), true);
  assert.equal(S.readinessTrigger(S.getConsumer(s, 'denise'), s.lender), false);
});

test('links and query', () => {
  const s = S.fixtures();
  assert.deepEqual(S.resolveLink(s, 'harbor-dkim'), { code: 'harbor-dkim', lender: 'harbor', lo: 'sarah', source: 'agent', partner: 'dana', campaign: null });
  assert.equal(S.resolveLink(s, 'nope'), null);
  assert.deepEqual(S.parseQuery('?c=harbor-smiller&dev=1'), { c: 'harbor-smiller', reset: false, dev: true, as: null });
});

test('enrollConsumer, requestReview, setGuardian, statusCard, packet', () => {
  const s = S.fixtures();
  const you = S.enrollConsumer(s, { first: 'Alex', last: 'Kim', email: 'a@x.com', mobile: '555' }, S.resolveLink(s, 'harbor-smiller'));
  assert.equal(you.id, 'you'); assert.equal(you.status, 'active'); assert.equal(you.round, 1); assert.equal(s.session.consumerId, 'you');
  assert.equal(you.pathway, 'build');
  const c = S.requestReview(s, 'you', { income: 6000 });
  assert.equal(c.status, 'review_requested'); assert.equal(c.reviewRequestedAt, S.TODAY); assert.equal(c.income, 6000);
  assert.equal(c.milestones.find((m) => m.state === 'current').label, 'Review requested');
  assert.equal(S.setGuardian(s, 'you', true).guardian, true);
  const card = S.statusCard(s, 'aisha');
  assert.equal(card.version, 1); assert.equal(card.eligibilityDate, '2027-03-12'); assert.equal(card.nextMilestone, 'Utilization under 30%');
  const p = S.packet(s, 'sam');
  assert.equal(p.disputesOpen, 2); assert.equal(p.dtiEstimate, S.dti(S.getConsumer(s, 'sam').credit.monthlyDebts, 7100));
});
