import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  CONNECTORS, CONNECTOR_IDS, getConnector, buildableToday, rolloutOrder, missingFields,
} from '../server/connectors/registry.js';
import { mapToShapeFields, ShapeConnector, ShapeError } from '../server/connectors/shape.js';
import { TokenStore, TokenBudgetExhausted, surveyAnswers, INSIGHT_TYPES } from '../server/connectors/total-expert.js';
import { interpretNotification, verifyNotification, SUBSCRIBED_EVENTS } from '../server/connectors/encompass.js';
import { mapToSalesforceFields, DEFAULT_FIELD_MAP } from '../server/connectors/salesforce.js';
import { unavailableConnector, ConnectorNotAvailable } from '../server/connectors/unavailable.js';
import { GenericWebhookConnector, generateSigningSecret } from '../server/connectors/generic-webhook.js';
import { Dispatcher } from '../server/dispatch.js';
import { OUTBOUND_EVENTS, buildEvent } from '../server/events.js';
import { buildStatusObject, buildIdentity } from '../server/status-object.js';
import { fixtures } from '../src/state.js';

const consumer = fixtures().consumers[0];
const status = buildStatusObject(consumer, { occurredAt: '2026-08-20T12:00:00Z' });
const identity = buildIdentity(consumer);

test('exactly one connector is self-serve today', () => {
  assert.deepEqual(buildableToday().sort(), ['generic_webhook', 'shape']);
});

// The whole architecture rests on this: credentials are per lender, not per
// partner, so onboarding is a per-customer procedure on nearly every platform.
test('every real platform issues credentials per lender', () => {
  for (const id of CONNECTOR_IDS) {
    assert.equal(CONNECTORS[id].credentialScope, 'per_lender', id);
  }
});

test('the rollout order puts the unblocked connectors first', () => {
  const order = rolloutOrder();
  assert.ok(order.indexOf('shape') < order.indexOf('total_expert'));
  assert.ok(order.indexOf('total_expert') < order.indexOf('encompass'));
  assert.ok(order.indexOf('generic_webhook') < order.indexOf('blend'));
});

test('gatekept connectors record what they are blocked on', () => {
  for (const id of ['encompass', 'blend', 'lenderhomepage']) {
    assert.equal(CONNECTORS[id].accessModel, 'partner_agreement', id);
    assert.ok(CONNECTORS[id].blockedOn, `${id} should say what blocks it`);
  }
});

test('missing required credentials are reported by name', () => {
  assert.deepEqual(missingFields('encompass', { clientId: 'a' }).sort(), ['clientSecret', 'instanceId']);
  assert.deepEqual(missingFields('shape', { apiKey: 'k' }), []);
});

test('an unknown connector id throws instead of returning undefined', () => {
  assert.throws(() => getConnector('velocify'), RangeError);
});

// Total Expert rate-limits the token endpoint to 2 requests/hour BY SOURCE IP.
// Getting this wrong locks out every tenant sharing our egress address.
test('the Total Expert token budget refuses a third request in an hour', () => {
  let clock = 1_760_000_000_000;
  const store = new TokenStore({ now: () => clock });

  store.spend();
  store.spend();
  assert.equal(store.remaining(), 0);
  assert.throws(() => store.spend(), TokenBudgetExhausted);

  clock += 3_600_001;
  assert.equal(store.remaining(), 2);
  assert.doesNotThrow(() => store.spend());
});

test('a cached Total Expert token is reused until it is nearly expired', () => {
  let clock = 1_760_000_000_000;
  const store = new TokenStore({ now: () => clock });
  store.put('client_a', { accessToken: 'tok', refreshToken: 'ref', expiresInSec: 3600 });

  assert.equal(store.get('client_a').stale, undefined);
  clock += 3_400_000;                       // inside the 5-minute safety margin
  assert.equal(store.get('client_a').stale, true);
});

test('every outbound event maps to a Total Expert insight type', () => {
  for (const type of Object.keys(OUTBOUND_EVENTS)) {
    assert.ok(INSIGHT_TYPES[type], `no insight type for ${type}`);
    assert.match(INSIGHT_TYPES[type], /^ReadyIQ: /, 'TE asks partners to prefix insight types');
  }
});

test('survey answers are flat strings and carry no report data', () => {
  const answers = surveyAnswers(status);
  assert.equal(answers.pathway, consumer.pathway);
  assert.equal(answers.loan_officer, consumer.attribution.lo);
  for (const value of Object.values(answers)) assert.equal(typeof value, 'string');
  assert.doesNotMatch(JSON.stringify(answers), /score|fico|balance/i);
});

test('Shape fields are namespaced and carry no report data', () => {
  const fields = mapToShapeFields(status, identity);
  assert.equal(fields.email, consumer.email);
  assert.equal(fields.readyiq_pathway, consumer.pathway);
  assert.equal(fields.readyiq_protect_mode, 'off');

  const readyiqKeys = Object.keys(fields).filter((k) => k.startsWith('readyiq_'));
  assert.ok(readyiqKeys.length >= 8);
  assert.doesNotMatch(JSON.stringify(fields), /score|fico|tradeline/i);
});

test('Shape maps its confusing status codes to a usable hint', () => {
  assert.match(new ShapeError(404, '').hint, /Authorization header/);
  assert.match(new ShapeError(401, '').hint, /key unknown/);
  assert.match(new ShapeError(429, '').hint, /allowance/);
});

test('Shape sends the raw key, not a Bearer token', async () => {
  const calls = [];
  const client = new ShapeConnector({
    apiKey: 'sk_test',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 200, text: async () => JSON.stringify([{ id: 1, name: 'Nurture' }]) };
    },
  });
  await client.listStatuses();

  assert.equal(calls[0].init.headers.Authorization, 'sk_test');
  assert.match(calls[0].url, /^https:\/\/secure-api\.setshape\.com\/api\/list-statuses/);
});

test('Shape resolves a pathway onto a status the tenant actually has', async () => {
  const client = new ShapeConnector({
    apiKey: 'k',
    fetch: async () => ({ ok: true, status: 200, text: async () => JSON.stringify([
      { id: 7, name: 'Long Term Nurture' }, { id: 9, name: 'Ready Now' },
    ]) }),
  });

  assert.equal(await client.resolveStatusId('ready_now'), 9);
  assert.equal(await client.resolveStatusId('build'), 7);
  // Nothing plausible → leave the record where it is rather than guess.
  assert.equal(await client.resolveStatusId('thin'), 7);
});

test('Salesforce writes to the configured custom fields', () => {
  const fields = mapToSalesforceFields(status, identity);
  assert.equal(fields.Email, consumer.email);
  assert.equal(fields[DEFAULT_FIELD_MAP.pathway], consumer.pathway);
  assert.equal(fields[DEFAULT_FIELD_MAP.review_requested], false);
  assert.doesNotMatch(JSON.stringify(fields), /score|fico/i);
});

// The reason Encompass is worth the partner agreement: it tells us when a loan
// starts, which is the real trigger Protect Mode has always been faking.
test('an Encompass loan-created notification turns Protect Mode on', () => {
  const intent = interpretNotification({ eventType: 'loan.created', resourceId: 'LN-991', eventTime: '2026-08-20T12:00:00Z' });
  assert.equal(intent.intent, 'protect_mode.activate');
  assert.equal(intent.loanId, 'LN-991');
});

test('a funded loan turns Protect Mode off, and unknown events are ignored', () => {
  assert.equal(interpretNotification({ eventType: 'loan.funded' }).intent, 'protect_mode.deactivate');
  assert.equal(interpretNotification({ eventType: 'document.ordered' }), null);
  assert.equal(interpretNotification({}), null);
  assert.equal(interpretNotification(null), null);
});

test('every subscribed Encompass event has a ReadyIQ intent', () => {
  for (const [event, intent] of Object.entries(SUBSCRIBED_EVENTS)) {
    assert.match(event, /^loan\./);
    assert.match(intent, /^protect_mode\./);
  }
});

test('an unsigned or wrongly signed Encompass notification is refused', () => {
  const body = JSON.stringify({ eventType: 'loan.created' });
  const good = createHmac('sha256', 'shared').update(body).digest('hex');

  assert.equal(verifyNotification({ body, signature: good, secret: 'shared' }), true);
  assert.equal(verifyNotification({ body, signature: `sha256=${good}`, secret: 'shared' }), true);
  assert.equal(verifyNotification({ body, signature: good, secret: 'wrong' }), false);
  assert.equal(verifyNotification({ body, signature: null, secret: 'shared' }), false);
});

test('Blend and LenderHomePage refuse to pretend they work', async () => {
  for (const id of ['blend', 'lenderhomepage']) {
    const client = unavailableConnector(id);
    const verified = await client.verify();
    assert.equal(verified.ok, false);
    assert.equal(verified.workaround, 'generic_webhook');
    assert.throws(() => client.syncStatus({}), ConnectorNotAvailable);
  }
});

test('the generic webhook refuses an unsafe endpoint at construction', () => {
  const dispatcher = new Dispatcher();
  assert.throws(() => new GenericWebhookConnector({ url: 'http://10.0.0.1/x', secret: 's', dispatcher }), TypeError);
  assert.throws(() => new GenericWebhookConnector({ url: 'https://ok.example.com/x', secret: '', dispatcher }), TypeError);
  assert.throws(() => new GenericWebhookConnector({
    url: 'https://ok.example.com/x', secret: 's', dispatcher, events: ['score.improved'],
  }), RangeError);
});

test('the generic webhook honours the tenant subscription list', async () => {
  const calls = [];
  const dispatcher = new Dispatcher({
    fetch: async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, headers: { get: () => null } }; },
    sleep: async () => {}, random: () => 0,
  });
  const client = new GenericWebhookConnector({
    url: 'https://hooks.example.com/x', secret: 'whsec', dispatcher, events: ['review.requested'],
  });

  const wanted = await client.deliver(buildEvent({ type: 'review.requested', tenantId: 't', status }), { tenantId: 't' });
  const unwanted = await client.deliver(buildEvent({ type: 'consumer.inactive', tenantId: 't', status }), { tenantId: 't' });

  assert.equal(wanted.delivered, true);
  assert.equal(unwanted.delivered, false);
  assert.equal(unwanted.error, 'event_not_subscribed');
  assert.equal(calls.length, 1);
});

test('a test event bypasses the subscription list so setup can be proven', async () => {
  const calls = [];
  const dispatcher = new Dispatcher({
    fetch: async (url, init) => { calls.push(init); return { ok: true, status: 200, headers: { get: () => null } }; },
    sleep: async () => {}, random: () => 0,
  });
  const client = new GenericWebhookConnector({ url: 'https://hooks.example.com/x', secret: 'whsec', dispatcher, events: [] });

  assert.equal((await client.sendTest({ tenantId: 't' })).delivered, true);
  assert.equal(calls[0].headers['X-ReadyIQ-Event'], 'test');
});

test('generated signing secrets are prefixed and unguessable', () => {
  const a = generateSigningSecret();
  assert.match(a, /^whsec_[A-Za-z0-9_-]{32,}$/);
  assert.notEqual(a, generateSigningSecret());
});

test('Shape and Salesforce carry the readiness stage', () => {
  const s = fixtures();
  const st = buildStatusObject(s.consumers.find((c) => c.id === 'denise'), { lender: s.lender });
  assert.equal(mapToShapeFields(st, identity).readyiq_readiness_stage, 'approaching');
  assert.equal(DEFAULT_FIELD_MAP.readiness_stage, 'ReadyIQ_Readiness_Stage__c');
});
