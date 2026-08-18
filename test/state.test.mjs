// test/state.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../site/assets/js/state.js';

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
