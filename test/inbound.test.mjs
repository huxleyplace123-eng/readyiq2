import test from 'node:test';
import assert from 'node:assert/strict';
import { receiveInbound } from '../server/inbound.js';
import { signature } from '../server/dispatch.js';
import { fixtures, getConsumer } from '../src/state.js';

const fakeConnections = () => { const sent = []; return { sent, async broadcast(tenantId, event) { sent.push(event); return { eventId: event.id, type: event.type, results: [] }; } }; };

test('a signed DisputeChat hook moves Sam and broadcasts round.completed + readiness.approaching', async () => {
  const state = fixtures(); const conn = fakeConnections();
  const rawBody = JSON.stringify({ clientId: 'sam', disputeRound: { n: 1, open: 0, resolved: 2 }, occurredAt: '2026-09-05T09:00:00Z' });
  const headers = { 'x-readyiq-signature': signature('dc_secret', Math.floor(Date.now() / 1000), rawBody) };
  const res = await receiveInbound({ source: 'disputechat', tenantId: 'harbor', headers, rawBody, state, lender: state.lender, secrets: { disputechatSecret: 'dc_secret' }, connections: conn });
  assert.equal(res.ok, true); assert.equal(res.status, 200);
  assert.deepEqual(res.applied.map((a) => [a.before, a.after]), [['working', 'approaching']]);
  assert.deepEqual(conn.sent.map((e) => e.type), ['round.completed', 'readiness.approaching']);
  assert.equal(conn.sent[1].data.readiness_stage, 'approaching');
  assert.equal(getConsumer(state, 'sam').lastPartnerUpdate.source, 'disputechat');
});

test('a bad token is 401 and applies nothing', async () => {
  const state = fixtures(); const conn = fakeConnections();
  const res = await receiveInbound({ source: 'zapier', tenantId: 'harbor', headers: { 'x-readyiq-token': 'nope' }, rawBody: JSON.stringify({ consumer_ref: 'c_maria' }), state, lender: state.lender, secrets: { zapierToken: 'zap_abc' }, connections: conn });
  assert.deepEqual([res.ok, res.status, res.error], [false, 401, 'unauthorized']);
  assert.equal(conn.sent.length, 0);
});

test('CSV applies many rows; an unknown source is 404; a stub partner is 501', async () => {
  const state = fixtures(); const conn = fakeConnections();
  const csv = 'consumer_ref,disputes_resolved,round_completed\nc_sam,2,yes\nc_maria,,no';
  const res = await receiveInbound({ source: 'csv', tenantId: 'harbor', headers: {}, rawBody: csv, state, lender: state.lender, secrets: {}, connections: conn });
  assert.equal(res.applied.length, 2);
  assert.equal((await receiveInbound({ source: 'credit_karma', tenantId: 'harbor', headers: {}, rawBody: '{}', state, lender: state.lender, secrets: {}, connections: conn })).status, 404);
  assert.equal((await receiveInbound({ source: 'credit_repair_cloud', tenantId: 'harbor', headers: {}, rawBody: '{}', state, lender: state.lender, secrets: {}, connections: conn })).status, 501);
});
