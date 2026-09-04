// test/persistence.test.mjs — the rail survives a restart, the L0 door takes a token once one is set,
// and a static site on another origin can talk to it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonStore } from '../server/store.js';
import { ReferralLog, buildReferral } from '../server/referral.js';
import { receiveInbound } from '../server/inbound.js';
import { createRailServer } from '../server/http.js';
import { fixtures, getConsumer } from '../src/state.js';

const consent = { granted_at: '2026-09-02T15:00:00Z', scope: 'share_readiness_summary', text_version: 'v1' };
const cr = { kind: 'credit_repair', id: 'brightpath' }, lo = { kind: 'lo', id: 'sarah' };
const tmp = () => mkdtempSync(join(tmpdir(), 'readyiq-'));

test('JsonStore writes atomically and reads back; a missing file yields the fallback', () => {
  const dir = tmp();
  try {
    const store = new JsonStore(join(dir, 'nested', 'x.json'));
    assert.deepEqual(store.load({ empty: true }), { empty: true });
    store.save({ a: 1 });
    assert.deepEqual(store.load(), { a: 1 });
    assert.ok(!existsSync(store.file + `.${process.pid}.tmp`), 'temp file is renamed away');
    assert.throws(() => new JsonStore(''), TypeError);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a ReferralLog rebuilt from its store still has every referral and outcome', () => {
  const dir = tmp();
  try {
    const s = fixtures();
    const store = new JsonStore(join(dir, 'referrals.json'));
    const log = new ReferralLog({ store });
    const mk = (id, who) => buildReferral({ direction: 'cr_to_lo', from: cr, to: [lo], consumer: getConsumer(s, who), lender: s.lender, consent, id });
    log.record(mk('ref_a', 'priya'), { tenantId: 'harbor' });
    log.record(mk('ref_b', 'tom'), { tenantId: 'harbor' });
    log.setOutcome('ref_a', { outcome: 'qualified', at: '2026-09-05' });

    const again = new ReferralLog({ store: new JsonStore(join(dir, 'referrals.json')) });
    assert.equal(again.list({ tenantId: 'harbor' }).length, 2);
    assert.deepEqual(again.get('ref_a').outcome, { outcome: 'qualified', at: '2026-09-05' });
    assert.deepEqual(again.precision('harbor'), { flagged: 2, qualified: 1, short: 0, rate: 1 });
    assert.throws(() => again.record(mk('ref_a', 'priya'), { tenantId: 'harbor' }), /already recorded/);
    assert.equal(JSON.parse(readFileSync(join(dir, 'referrals.json'), 'utf8')).length, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the CSV door is open with no token configured and locked once one is', async () => {
  const conn = { async broadcast(_t, e) { return { eventId: e.id, type: e.type, results: [] }; } };
  const csv = 'consumer_ref,disputes_resolved\nc_maria,1';
  const open = await receiveInbound({ source: 'csv', tenantId: 'harbor', headers: {}, rawBody: csv, state: fixtures(), lender: fixtures().lender, secrets: {}, connections: conn });
  assert.equal(open.status, 200);
  const locked = await receiveInbound({ source: 'csv', tenantId: 'harbor', headers: {}, rawBody: csv, state: fixtures(), lender: fixtures().lender, secrets: { csvToken: 'csv_abc' }, connections: conn });
  assert.deepEqual([locked.status, locked.error], [401, 'unauthorized']);
  const keyed = await receiveInbound({ source: 'csv', tenantId: 'harbor', headers: { 'x-readyiq-token': 'csv_abc' }, rawBody: csv, state: fixtures(), lender: fixtures().lender, secrets: { csvToken: 'csv_abc' }, connections: conn });
  assert.equal(keyed.status, 200);
});

test('the rail answers a cross-origin preflight, a health check, and persists state after an inbound update', async () => {
  const dir = tmp();
  const state = fixtures();
  const stateStore = new JsonStore(join(dir, 'state.json'));
  const connections = { async broadcast(_t, e) { return { eventId: e.id, type: e.type, results: [] }; } };
  const server = createRailServer({ state, lender: state.lender, secretsFor: () => ({ zapierToken: 'zap_abc' }), connections, log: new ReferralLog(), stateStore });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const pre = await fetch(`${base}/v1/referrals?tenant=harbor`, { method: 'OPTIONS', headers: { origin: 'https://huxleyplace123-eng.github.io' } });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-origin'), '*');
    assert.match(pre.headers.get('access-control-allow-headers'), /x-readyiq-token/);

    const health = await (await fetch(`${base}/v1/health`)).json();
    assert.deepEqual(health, { ok: true, service: 'readyiq-rail', tenant: 'harbor', referrals: 0 });

    assert.equal(existsSync(stateStore.file), false);
    const inb = await fetch(`${base}/v1/inbound/zapier?tenant=harbor`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-readyiq-token': 'zap_abc' }, body: JSON.stringify({ consumer_ref: 'c_sam', disputes_open: 0, disputes_resolved: 2, round_completed: 'yes' }) });
    assert.equal(inb.status, 200);
    const saved = JSON.parse(readFileSync(stateStore.file, 'utf8'));
    assert.equal(saved.consumers.find((c) => c.id === 'sam').disputes.filter((d) => d.status === 'resolved').length, 1, 'the mutated state was written to disk');
  } finally { await new Promise((r) => server.close(r)); rmSync(dir, { recursive: true, force: true }); }
});
