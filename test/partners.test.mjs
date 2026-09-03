import test from 'node:test';
import assert from 'node:assert/strict';
import { PARTNER_PLATFORMS, PARTNER_IDS, getPartner, partnerLevel, partnersByLevel } from '../server/partners/registry.js';
import { normalizeUpdate, applyPartnerUpdate } from '../server/partners/normalize.js';
import { fixtures, getConsumer, stage } from '../src/state.js';

test('the ladder is L0 csv, L1 zapier, L2 natives — and only DisputeChat is buildable today', () => {
  assert.deepEqual(partnersByLevel(), { 0: ['csv'], 1: ['zapier'], 2: ['disputechat', 'credit_repair_cloud', 'disputefox'] });
  assert.equal(partnerLevel('zapier'), 1);
  assert.equal(getPartner('disputechat').accessModel, 'self_serve');
  for (const id of ['credit_repair_cloud', 'disputefox']) {
    assert.equal(getPartner(id).accessModel, 'developer_signup', id);
    assert.ok(getPartner(id).blockedOn, `${id} must say what it is blocked on`);
    assert.equal(getPartner(id).implemented, false);
  }
  assert.throws(() => getPartner('credit_karma'), /unknown partner/);
  assert.ok(PARTNER_IDS.includes('csv'));
  for (const id of PARTNER_IDS) assert.equal(PARTNER_PLATFORMS[id].kind, 'credit_repair', id);
});

test('normalizeUpdate fills defaults and refuses report data', () => {
  const u = normalizeUpdate({ source: 'csv', consumer_ref: 'c_sam', disputes: { resolved: 2 } });
  assert.equal(u.object, 'partner_update');
  assert.deepEqual(u.disputes, { open: null, resolved: 2 });
  assert.equal(u.round_completed, false);
  assert.match(u.occurred_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.throws(() => normalizeUpdate({ consumer_ref: 'c_sam' }), /source/);
  assert.throws(() => normalizeUpdate({ source: 'csv', consumer_ref: 'c_sam', score: 700 }), /report data/);
});

test('resolving the open disputes moves Sam from working to approaching and emits the events', () => {
  const s = fixtures();
  assert.equal(stage(getConsumer(s, 'sam'), s.lender), 'working');
  const out = applyPartnerUpdate(s, normalizeUpdate({ source: 'csv', consumer_ref: 'c_sam', disputes: { resolved: 2 }, round_completed: true }), { lender: s.lender });
  assert.equal(out.before, 'working');
  assert.equal(out.after, 'approaching');            // sam: 648, floor 640, buffer 20 → inside the band
  assert.deepEqual(out.events, ['round.completed', 'readiness.approaching']);
  assert.equal(getConsumer(s, 'sam').disputes.filter((d) => d.status === 'resolved').length, 2);
});

test('an update with nothing new emits nothing', () => {
  const s = fixtures();
  const out = applyPartnerUpdate(s, normalizeUpdate({ source: 'zapier', consumer_ref: 'c_maria' }), { lender: s.lender });
  assert.deepEqual(out.events, []);
  assert.equal(out.before, out.after);
  assert.throws(() => applyPartnerUpdate(s, normalizeUpdate({ source: 'csv', consumer_ref: 'c_nobody' }), { lender: s.lender }), /unknown consumer/);
});
