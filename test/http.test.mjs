// test/http.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRailServer } from '../server/http.js';
import { ReferralLog } from '../server/referral.js';
import { fixtures } from '../src/state.js';

async function boot() {
  const state = fixtures(); const sent = [];
  const connections = { async broadcast(t, e) { sent.push(e); return { eventId: e.id, type: e.type, results: [] }; } };
  const server = createRailServer({ state, lender: state.lender, secretsFor: () => ({ zapierToken: 'zap_abc' }), connections, log: new ReferralLog() });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, sent, state, close: () => new Promise((r) => server.close(r)) };
}
const j = (r) => r.json();
const consent = { granted_at: '2026-09-02T15:00:00Z', scope: 'share_readiness_summary', text_version: 'v1' };

test('the loop over HTTP: zapier in → referral out → outcome → precision', async () => {
  const { base, sent, close } = await boot();
  try {
    const inb = await fetch(`${base}/v1/inbound/zapier?tenant=harbor`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-readyiq-token': 'zap_abc' }, body: JSON.stringify({ consumer_ref: 'c_sam', disputes_resolved: 2, round_completed: 'yes' }) });
    assert.equal(inb.status, 200);
    assert.deepEqual((await j(inb)).applied[0].events, ['round.completed', 'readiness.approaching']);

    const ref = await fetch(`${base}/v1/referrals?tenant=harbor`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ direction: 'cr_to_lo', from: { kind: 'credit_repair', id: 'brightpath' }, to: [{ kind: 'lo', id: 'sarah' }, { kind: 'lo', id: 'marcus' }], consumerId: 'sam', consent }) });
    assert.equal(ref.status, 201);
    const body = await j(ref);
    assert.equal(body.summary.stage, 'approaching');
    assert.equal(body.to.length, 2);
    assert.equal(sent.at(-1).type, 'referral.sent_to_lo');

    const out = await fetch(`${base}/v1/referrals/${body.id}/outcome?tenant=harbor`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ outcome: 'qualified', at: '2026-09-06' }) });
    assert.equal(out.status, 200);
    assert.equal(sent.at(-1).type, 'review.outcome_recorded');

    assert.deepEqual(await j(await fetch(`${base}/v1/precision?tenant=harbor`)), { flagged: 1, qualified: 1, short: 0, rate: 1 });
    assert.equal((await j(await fetch(`${base}/v1/referrals?tenant=harbor`))).length, 1);
  } finally { await close(); }
});

test('errors are JSON with the right status', async () => {
  const { base, close } = await boot();
  try {
    assert.equal((await fetch(`${base}/v1/nope`)).status, 404);
    assert.equal((await fetch(`${base}/v1/referrals?tenant=harbor`, { method: 'POST', body: '{not json' })).status, 400);
    assert.equal((await fetch(`${base}/v1/referrals?tenant=harbor`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ direction: 'cr_to_lo', from: { kind: 'credit_repair', id: 'x' }, to: [], consumerId: 'sam', consent }) })).status, 422);
    assert.equal((await fetch(`${base}/v1/inbound/zapier?tenant=harbor`, { method: 'POST', body: '{}' })).status, 401);
    assert.equal((await fetch(`${base}/v1/inbound/credit_repair_cloud?tenant=harbor`, { method: 'POST', body: '{}' })).status, 501);
  } finally { await close(); }
});

test('an oversized body gets a real 413, not a dropped connection', async () => {
  const { base, close } = await boot();
  try {
    const big = 'x'.repeat(300 * 1024);
    const r = await fetch(`${base}/v1/referrals?tenant=harbor`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: big });
    assert.equal(r.status, 413);
    assert.deepEqual(await r.json(), { error: 'body_too_large' });
  } finally { await close(); }
});

test('referrals, outcomes and precision are tenant-scoped', async () => {
  const { base, close } = await boot();
  try {
    const mk = (tenant) => fetch(`${base}/v1/referrals?tenant=${tenant}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ direction: 'cr_to_lo', from: { kind: 'credit_repair', id: 'brightpath' }, to: [{ kind: 'lo', id: 'sarah' }], consumerId: 'priya', consent }) });
    const harbor = await (await mk('harbor')).json();
    await mk('other');
    assert.equal((await fetch(`${base}/v1/referrals`)).status, 400);
    assert.equal((await fetch(`${base}/v1/precision`)).status, 400);
    assert.equal((await (await fetch(`${base}/v1/referrals?tenant=harbor`)).json()).length, 1);
    const wrong = await fetch(`${base}/v1/referrals/${harbor.id}/outcome?tenant=other`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ outcome: 'qualified' }) });
    assert.equal(wrong.status, 404);
    assert.equal((await fetch(`${base}/v1/referrals/${harbor.id}/outcome`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ outcome: 'qualified' }) })).status, 400);
    const right = await fetch(`${base}/v1/referrals/${harbor.id}/outcome?tenant=harbor`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ outcome: 'qualified' }) });
    assert.equal(right.status, 200);
    assert.deepEqual(await (await fetch(`${base}/v1/precision?tenant=other`)).json(), { flagged: 1, qualified: 0, short: 0, rate: null });
  } finally { await close(); }
});
