import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStatusObject, buildIdentity, assertNoReportData, ReportDataLeak, PATHWAYS, slug,
} from '../server/status-object.js';
import { fixtures } from '../src/state.js';

const consumer = fixtures().consumers[0];

test('a status object carries derived status and an attribution trail', () => {
  const status = buildStatusObject(consumer, { occurredAt: '2026-08-20T12:00:00Z' });

  assert.equal(status.object, 'readiness_status');
  assert.equal(status.version, 1);
  assert.equal(status.consumer_ref, `c_${consumer.id}`);
  assert.equal(status.pathway, consumer.pathway);
  assert.equal(status.round.n, consumer.round);
  assert.equal(status.round.of, consumer.roundsEstimated);
  assert.equal(status.attribution.lo, consumer.attribution.lo);
  assert.equal(status.last_activity_at, '2026-08-20T12:00:00Z');
  assert.equal(status.engines.check, 'MyScoreIQ');
});

test('the next milestone is the first upcoming one, slugged', () => {
  const status = buildStatusObject(consumer);
  const upcoming = consumer.milestones.find((m) => m.state === 'upcoming');
  assert.equal(status.next_milestone, slug(upcoming.label));
  // "Utilization under 30%" must not slug to a trailing separator.
  assert.equal(slug('Utilization under 30%'), 'utilization_under_30');
  assert.doesNotMatch(status.next_milestone, /^_|_$/);
});

test('every real consumer fixture produces a legal status object', () => {
  for (const c of fixtures().consumers) {
    const status = buildStatusObject(c);
    assert.ok(PATHWAYS.includes(status.pathway), `${c.id} has pathway ${status.pathway}`);
    assert.doesNotThrow(() => assertNoReportData(status));
  }
});

test('an unknown pathway is refused rather than forwarded to a CRM', () => {
  assert.throws(() => buildStatusObject({ ...consumer, pathway: 'excellent' }), RangeError);
});

// The whole FCRA argument for these integrations rests on this guard.
test('report data can never reach a status object, at any depth', () => {
  const leaks = [
    { score: 612 },
    { flags: { fico: 612 } },
    { nested: [{ deep: { tradelines: 6 } }] },
    { bureaus: { experian: 628 } },
    { attribution: { ssn: '1234' } },
    { data: { income: 90000 } },
    { letters: ['midland.pdf'] },
    { utilization: 0.41 },
  ];
  for (const leak of leaks) {
    assert.throws(() => assertNoReportData(leak), ReportDataLeak, JSON.stringify(leak));
  }
});

test('the pathway value "dti" is legal even though a dti field is not', () => {
  assert.doesNotThrow(() => assertNoReportData({ pathway: 'dti' }));
  assert.throws(() => assertNoReportData({ dti: 0.41 }), ReportDataLeak);
});

test('the guard survives a cyclic object instead of hanging', () => {
  const cyclic = { pathway: 'build' };
  cyclic.self = cyclic;
  assert.doesNotThrow(() => assertNoReportData(cyclic));
});

test('identity travels beside the status object, never inside it', () => {
  const status = buildStatusObject(consumer);
  const identity = buildIdentity(consumer);

  assert.equal(identity.email, consumer.email);
  assert.equal(identity.first_name, consumer.first);
  // The status object itself knows no name, no email, no phone.
  const serialised = JSON.stringify(status);
  assert.doesNotMatch(serialised, new RegExp(consumer.email, 'i'));
  assert.doesNotMatch(serialised, new RegExp(consumer.last, 'i'));
});

import { fixtures as fx } from '../src/state.js';
test('the status object carries the four-state readiness stage when a lender is supplied', () => {
  const s = fx();
  const priya = s.consumers.find((c) => c.id === 'priya');
  const status = buildStatusObject(priya, { lender: s.lender });
  assert.equal(status.readiness_stage, 'ready_to_review');
  assert.equal(status.readiness_reason, 'ready_now');
  assert.equal(buildStatusObject(priya).readiness_stage, null);
  assertNoReportData(status);
});
