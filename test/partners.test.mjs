import test from 'node:test';
import assert from 'node:assert/strict';
import { PARTNER_PLATFORMS, PARTNER_IDS, getPartner, partnerLevel, partnersByLevel } from '../server/partners/registry.js';
import { normalizeUpdate, applyPartnerUpdate } from '../server/partners/normalize.js';
import { fixtures, getConsumer, stage } from '../src/state.js';
import { parseCsv, CSV_COLUMNS } from '../server/partners/csv.js';
import { verifyZapierToken, fromZapier } from '../server/partners/zapier.js';
import { verifyDisputeChat, fromDisputeChat } from '../server/partners/disputechat.js';
import { fromCreditRepairCloud, PartnerNotAvailable } from '../server/partners/credit-repair-cloud.js';
import { fromDisputeFox } from '../server/partners/disputefox.js';
import { signature } from '../server/dispatch.js';

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

test('L0: a CSV row becomes a partner_update; unknown columns and report data are rejected', () => {
  const text = [CSV_COLUMNS.join(','), 'c_sam,2026-09-03,0,2,yes,,collection|late_payment,"paid Midland"'].join('\n');
  const [u] = parseCsv(text);
  assert.equal(u.source, 'csv');
  assert.equal(u.consumer_ref, 'c_sam');
  assert.deepEqual(u.disputes, { open: 0, resolved: 2 });
  assert.equal(u.round_completed, true);
  assert.equal(u.rent_months_verified, null);
  assert.deepEqual(u.blockers_cleared, ['collection', 'late_payment']);
  assert.equal(u.note, 'paid Midland');
  assert.throws(() => parseCsv('consumer_ref,score\nc_sam,700'), /unknown column "score"/);
  assert.deepEqual(parseCsv(''), []);
});

test('L1: a Zap posts flat fields with a shared token', () => {
  assert.equal(verifyZapierToken({ 'x-readyiq-token': 'zap_abc' }, 'zap_abc'), true);
  assert.equal(verifyZapierToken({ 'x-readyiq-token': 'zap_abd' }, 'zap_abc'), false);
  assert.equal(verifyZapierToken({}, 'zap_abc'), false);
  const u = fromZapier({ consumer_ref: 'c_maria', disputes_resolved: '1', round_completed: 'true', blockers_cleared: 'utilization', occurred_at: '2026-09-04T10:00:00Z' });
  assert.equal(u.source, 'zapier');
  assert.deepEqual(u.disputes, { open: null, resolved: 1 });
  assert.equal(u.round_completed, true);
  assert.deepEqual(u.blockers_cleared, ['utilization']);
});

test('L2 (ours): DisputeChat signs with our scheme and maps its dispute-round shape', () => {
  const body = JSON.stringify({ clientId: 'sam', disputeRound: { n: 1, open: 0, resolved: 2 }, occurredAt: '2026-09-05T09:00:00Z' });
  const ts = Math.floor(Date.now() / 1000);
  const good = { 'x-readyiq-signature': signature('dc_secret', ts, body) };
  assert.equal(verifyDisputeChat(good, body, 'dc_secret'), true);
  assert.equal(verifyDisputeChat(good, body + ' ', 'dc_secret'), false);
  const u = fromDisputeChat(JSON.parse(body));
  assert.equal(u.source, 'disputechat');
  assert.equal(u.consumer_ref, 'c_sam');
  assert.deepEqual(u.disputes, { open: 0, resolved: 2 });
  assert.equal(u.round_completed, true);
});

test('L2 (theirs): CRC and DisputeFox fail loudly and point at Zapier', () => {
  for (const fn of [fromCreditRepairCloud, fromDisputeFox]) {
    assert.throws(() => fn({}), (e) => e instanceof PartnerNotAvailable && e.workaround === 'zapier' && /blocked on/.test(e.message));
  }
});
