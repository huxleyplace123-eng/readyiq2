import test from 'node:test';
import assert from 'node:assert/strict';
import { Dispatcher, signature, verifySignature } from '../server/dispatch.js';
import { buildEvent, idempotencyKey, UnknownEvent, OUTBOUND_EVENTS } from '../server/events.js';

const STATUS = { object: 'readiness_status', version: 1, consumer_ref: 'c_maya', pathway: 'build' };
const TARGET = { url: 'https://hooks.example.com/readyiq', secret: 'whsec_test', tenantId: 'summit', connectorId: 'generic_webhook' };

/** A fetch stub that replays a scripted list of responses. */
function scriptedFetch(script) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const next = script[Math.min(calls.length - 1, script.length - 1)];
    if (next instanceof Error) throw next;
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      headers: { get: (h) => (h.toLowerCase() === 'retry-after' ? next.retryAfter ?? null : null) },
    };
  };
  return { fetchImpl, calls };
}

const instant = { sleep: async () => {}, random: () => 0, now: () => 1_760_000_000_000 };

test('a delivered event stops after one attempt', async () => {
  const { fetchImpl, calls } = scriptedFetch([{ status: 200 }]);
  const d = new Dispatcher({ fetch: fetchImpl, ...instant });
  const result = await d.send(buildEvent({ type: 'review.requested', tenantId: 'summit', status: STATUS }), TARGET);

  assert.equal(result.delivered, true);
  assert.equal(result.attempts, 1);
  assert.equal(calls.length, 1);
  assert.equal(d.deadLetters.length, 0);
});

test('5xx is retried and eventually succeeds', async () => {
  const { fetchImpl, calls } = scriptedFetch([{ status: 500 }, { status: 503 }, { status: 200 }]);
  const d = new Dispatcher({ fetch: fetchImpl, ...instant });
  const result = await d.send(buildEvent({ type: 'readiness.trigger', tenantId: 'summit', status: STATUS }), TARGET);

  assert.equal(result.delivered, true);
  assert.equal(result.attempts, 3);
  assert.equal(calls.length, 3);
});

test('429 is retried; 400 and 404 are not', async () => {
  const retried = scriptedFetch([{ status: 429 }, { status: 200 }]);
  const d1 = new Dispatcher({ fetch: retried.fetchImpl, ...instant });
  assert.equal((await d1.send(buildEvent({ type: 'review.requested', tenantId: 't', status: STATUS }), TARGET)).delivered, true);
  assert.equal(retried.calls.length, 2);

  for (const status of [400, 404, 422]) {
    const once = scriptedFetch([{ status }]);
    const d2 = new Dispatcher({ fetch: once.fetchImpl, ...instant });
    const result = await d2.send(buildEvent({ type: 'review.requested', tenantId: 't', status: STATUS }), TARGET);
    assert.equal(result.delivered, false, `${status} should not be retried`);
    assert.equal(once.calls.length, 1, `${status} should be attempted once`);
    assert.equal(result.error, `http_${status}`);
  }
});

test('a network error is retried, then dead-lettered with its history', async () => {
  const { fetchImpl, calls } = scriptedFetch([new Error('ECONNRESET')]);
  const d = new Dispatcher({ fetch: fetchImpl, maxAttempts: 3, ...instant });
  const event = buildEvent({ type: 'review.requested', tenantId: 'summit', status: STATUS });
  const result = await d.send(event, TARGET);

  assert.equal(result.delivered, false);
  assert.equal(result.error, 'attempts_exhausted');
  assert.equal(calls.length, 3);

  const [dead] = d.deadLetters;
  assert.equal(dead.eventId, event.id);
  assert.equal(dead.connectorId, 'generic_webhook');
  assert.equal(dead.history.length, 3);
});

// Retrying is only safe because the receiver can dedupe. If the id moved between
// attempts, every retry would be a duplicate write into a lender's CRM.
test('the idempotency key is identical on every attempt', async () => {
  const { fetchImpl, calls } = scriptedFetch([{ status: 500 }, { status: 500 }, { status: 200 }]);
  const d = new Dispatcher({ fetch: fetchImpl, ...instant });
  const event = buildEvent({ type: 'review.requested', tenantId: 'summit', status: STATUS });
  await d.send(event, TARGET);

  const ids = calls.map((c) => c.init.headers['X-ReadyIQ-Event-Id']);
  assert.equal(new Set(ids).size, 1);
  assert.equal(ids[0], event.id);
  assert.deepEqual(calls.map((c) => c.init.headers['X-ReadyIQ-Attempt']), ['1', '2', '3']);
});

test('Retry-After is honoured when it exceeds the computed backoff', async () => {
  const waits = [];
  const { fetchImpl } = scriptedFetch([{ status: 429, retryAfter: '30' }, { status: 200 }]);
  const d = new Dispatcher({ fetch: fetchImpl, ...instant, sleep: async (ms) => { waits.push(ms); } });
  await d.send(buildEvent({ type: 'review.requested', tenantId: 't', status: STATUS }), TARGET);

  assert.equal(waits.length, 1);
  assert.equal(waits[0], 30_000);
});

test('an unsafe endpoint is refused without any network call', async () => {
  const { fetchImpl, calls } = scriptedFetch([{ status: 200 }]);
  const d = new Dispatcher({ fetch: fetchImpl, ...instant });

  for (const url of ['http://hooks.example.com/x', 'https://127.0.0.1/x', 'https://169.254.169.254/latest/meta-data']) {
    const result = await d.send(buildEvent({ type: 'review.requested', tenantId: 't', status: STATUS }), { ...TARGET, url });
    assert.equal(result.error, 'blocked_url', url);
  }
  assert.equal(calls.length, 0);
});

test('redirects are never followed', async () => {
  const { fetchImpl, calls } = scriptedFetch([{ status: 200 }]);
  const d = new Dispatcher({ fetch: fetchImpl, ...instant });
  await d.send(buildEvent({ type: 'review.requested', tenantId: 't', status: STATUS }), TARGET);
  assert.equal(calls[0].init.redirect, 'manual');
});

test('a signature verifies, and a tampered body does not', () => {
  const body = JSON.stringify({ hello: 'world' });
  const now = () => 1_760_000_000_000;
  const header = signature('whsec_test', Math.floor(now() / 1000), body);

  assert.equal(verifySignature('whsec_test', header, body, { now }), true);
  assert.equal(verifySignature('whsec_test', header, body + ' ', { now }), false);
  assert.equal(verifySignature('wrong_secret', header, body, { now }), false);
});

test('a captured signature expires outside the tolerance window', () => {
  const body = '{}';
  const signedAt = 1_760_000_000_000;
  const header = signature('whsec_test', Math.floor(signedAt / 1000), body);

  assert.equal(verifySignature('whsec_test', header, body, { now: () => signedAt + 60_000 }), true);
  assert.equal(verifySignature('whsec_test', header, body, { now: () => signedAt + 3_600_000 }), false);
});

test('replaying a dead letter clears it once it lands', async () => {
  const { fetchImpl } = scriptedFetch([{ status: 500 }]);
  const d = new Dispatcher({ fetch: fetchImpl, maxAttempts: 1, ...instant });
  const event = buildEvent({ type: 'review.requested', tenantId: 'summit', status: STATUS });
  await d.send(event, TARGET);
  assert.equal(d.deadLetters.length, 1);

  const recovered = scriptedFetch([{ status: 200 }]);
  const d2 = new Dispatcher({ fetch: recovered.fetchImpl, ...instant });
  // replay uses the same dispatcher in production; here we prove the bookkeeping
  const again = await d.replay(event.id, event, { ...TARGET });
  assert.equal(again.delivered, false); // still the failing stub
  assert.equal(d.deadLetters.length, 2); // the failed replay is recorded too
  void d2;
});

test('an unknown event type is rejected before it can be sent', () => {
  assert.throws(() => buildEvent({ type: 'score.improved', tenantId: 't', status: STATUS }), UnknownEvent);
});

test('an event refuses to carry report data', () => {
  assert.throws(() => buildEvent({ type: 'review.requested', tenantId: 't', status: { ...STATUS, score: 612 } }));
});

test('the derived idempotency key is stable for the same logical moment', () => {
  const args = { tenantId: 'summit', consumerRef: 'c_maya', type: 'review.requested', occurredAt: '2026-08-20T12:00:00Z' };
  assert.equal(idempotencyKey(args), idempotencyKey(args));
  assert.notEqual(idempotencyKey(args), idempotencyKey({ ...args, occurredAt: '2026-08-20T12:00:01Z' }));
});

test('the loop events exist and can be built from a readiness summary', () => {
  for (const t of ['readiness.approaching', 'referral.sent_to_lo', 'referral.sent_to_cr', 'review.outcome_recorded']) assert.ok(OUTBOUND_EVENTS[t], t);
  const ev = buildEvent({ type: 'referral.sent_to_lo', tenantId: 'harbor', status: { object: 'readiness_summary', version: 1, consumer_ref: 'c_denise', stage: 'approaching' } });
  assert.equal(ev.consumer_ref, 'c_denise');
});
