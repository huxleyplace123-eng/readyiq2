# ReadyIQ Referral Rail (two-way loop, Levels 0–2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ReadyIQ the rail between loan officers and credit-repair firms — a four-stage readiness model with a variance buffer, a compliant two-way referral object with a consent record and audit log, and an integration ladder (L0 CSV/manual → L1 Zapier/signed webhook → L2 native partner connectors) that is wired end to end today and fills in as partners come online.

**Architecture:** The stage model lives in `src/state.js` (pure, shared by browser and Node). The rail lives in `server/`: `referral.js` (summary + referral object + log + precision), `partners/` (per-source inbound adapters that all normalize to one `partner_update`), `inbound.js` (verify → normalize → apply → broadcast), and `http.js` (a dependency-free `node:http` surface so Zapier and partners have a URL). Outbound reuses the existing `events.js` → `Dispatcher` → `ConnectionManager` chain untouched. Persistence stays in-memory with a DB-shaped interface, matching the existing vault/connection design (spec §7).

**Tech Stack:** Node 22 ESM, `node --test` + `node:assert/strict`, `node:http`, `node:crypto`. No new dependencies. React 19 + esbuild for the one UI task.

## Level definitions used in this plan

| Level | Meaning | Delivered by |
|---|---|---|
| **L0** | Manual / CSV. An operator enters or uploads blocker-level facts. | `partners/csv.js`, runbook |
| **L1** | Zapier / Make / any signed webhook, both directions. | `partners/zapier.js` inbound + existing `generic_webhook` outbound |
| **L2** | Native partner connectors: DisputeChat (ours, real), Credit Repair Cloud and DisputeFox (registered, fail-loud stubs until vendor docs are confirmed). | `partners/disputechat.js`, `credit-repair-cloud.js`, `disputefox.js` |

The older integration spec (`docs/specs/2026-08-20-integration-layer.md`) numbers the *lender-side* connectors differently ("Level 2 generic webhook"). That numbering is unchanged; this plan's L0–L2 describe the *credit-repair-side* ladder.

## Outside the repo (do in parallel, none blocks Task 1)

- Scoped RESPA §8 opinion on the credit-repair → LO leg: flat per-seat pricing, no exclusivity, nothing of value between parties. Before lender #1 signs.
- Raise the use of any LenderHomePage LO list with Rocky, in writing, before touching it.
- Create developer/Zapier accounts: Credit Repair Cloud, DisputeFox. Record the actual inbound payload fields in `server/partners/registry.js` `notes` when known — the stubs stay fail-loud until then.
- dchub side: an outbound signed webhook from DisputeChat to `POST /v1/inbound/disputechat` using ReadyIQ's `signature()` scheme. Separate plan in the dchub repo.
- Pilot: two named LOs + one credit-repair firm run L0 by hand with the runbook in Task 9.

## Global Constraints

- Tests: `npm test` (= `node --test`), files `test/*.test.mjs`, `import test from 'node:test'`, `import assert from 'node:assert/strict'`.
- ESM everywhere; imports carry `.js` extensions; no new npm dependencies.
- Every payload that leaves ReadyIQ toward a partner passes `assertNoReportData` from `server/status-object.js`. No `score`, `income`, `dti` (as a key), `report`, `balance`, tradeline data — ever.
- A referral to an LO always allows **more than one** recipient; no `fee`, `compensation`, `bonus`, `rank`, `preferred` keys may exist anywhere in a referral (RESPA posture, enforced in code).
- A referral requires a consent record with `granted_at` before it can be sent.
- Buffer default is `20` points above the lender floor; lender-configurable via `lender.buffer`.
- Stage vocabulary is exactly: `not_ready · working · approaching · ready_to_review`. Borrower-facing surfaces never render the string "Not ready".
- `git fetch origin && git rebase origin/main` before the first commit; never commit `site/` build output on a feature branch.
- Any string added to `src/screens/lo.tsx` that has a Spanish sibling in `DOOR_ES` / `lang.tsx` gets its translation in the same commit (none are expected in this plan).

---

## File structure

| File | Responsibility |
|---|---|
| `src/state.js` (modify) | `STAGES`, `STAGE_LABELS`, `BUFFER_DEFAULT`, `stage()`, `stageReason()`, `recordReviewOutcome()`, `lender.buffer` fixture |
| `server/status-object.js` (modify) | add `readiness_stage`, `readiness_reason` to the status object |
| `server/connectors/shape.js`, `server/connectors/salesforce.js` (modify) | map the new field |
| `server/referral.js` (create) | `buildReadinessSummary`, `buildReferral`, `assertReferralCompliant`, `ReferralLog`, `precision` |
| `server/events.js` (modify) | new outbound events |
| `server/connectors/total-expert.js` (modify) | insight types for new events |
| `server/partners/registry.js` (create) | credit-repair platform registry with honest access models |
| `server/partners/normalize.js` (create) | the `partner_update` shape + `applyPartnerUpdate()` |
| `server/partners/csv.js` (create) | L0 CSV → `partner_update[]` |
| `server/partners/zapier.js` (create) | L1 token check + body → `partner_update` |
| `server/partners/disputechat.js` (create) | L2 (ours): signature check + body → `partner_update` |
| `server/partners/credit-repair-cloud.js`, `server/partners/disputefox.js` (create) | L2 fail-loud stubs |
| `server/inbound.js` (create) | `receiveInbound()` orchestration |
| `server/http.js` (create) | `createRailServer()` — `node:http` routes |
| `src/screens/lo.tsx` (modify) | three-bucket feed, `StagePill`, "Send to credit-repair partner" |
| `docs/runbooks/level-0-manual-loop.md`, `docs/runbooks/level-0-template.csv` (create) | the manual pilot procedure |

---

### Task 1: Four stages and the buffer in `src/state.js`

**Files:**
- Modify: `src/state.js` (after the `PATHWAY_BLURBS` block, ~line 15; and `FIXTURES.lender`, ~line 22)
- Test: `test/stage.test.mjs`

**Interfaces:**
- Produces: `STAGES: string[]`, `STAGE_LABELS: Record<string,string>`, `BUFFER_DEFAULT: number`, `stage(consumer, lender): 'not_ready'|'working'|'approaching'|'ready_to_review'`, `stageReason(consumer, lender): 'build'|'thin'|'dispute'|'dti'|'near_ready'|'ready_now'|null`, `lender.buffer: number` on the Harbor fixture.

- [ ] **Step 1: Write the failing test**

```js
// test/stage.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/state.js';

const base = () => { const s = S.fixtures(); return { s, c: S.getConsumer(s, 'priya') }; };
const withScore = (c, value) => ({ ...c, score: { ...c.score, value } });

test('stage vocabulary is exactly four values with labels', () => {
  assert.deepEqual(S.STAGES, ['not_ready', 'working', 'approaching', 'ready_to_review']);
  assert.equal(S.STAGE_LABELS.ready_to_review, 'Ready to review');
  assert.equal(S.BUFFER_DEFAULT, 20);
  assert.equal(S.fixtures().lender.buffer, 20);
});

test('every fixture lands on the expected stage', () => {
  const s = S.fixtures();
  const expected = { maria: 'working', jordan: 'not_ready', denise: 'approaching', sam: 'working', priya: 'ready_to_review', tom: 'ready_to_review', aisha: 'working' };
  for (const [id, want] of Object.entries(expected)) assert.equal(S.stage(S.getConsumer(s, id), s.lender), want, id);
});

test('buffer boundaries around a 640 floor', () => {
  const { s, c } = base();                     // priya: util .18, no derog, no disputes
  assert.equal(S.stage(withScore(c, 624), s.lender), 'working');       // floor - 16
  assert.equal(S.stage(withScore(c, 625), s.lender), 'approaching');   // floor - 15
  assert.equal(S.stage(withScore(c, 659), s.lender), 'approaching');   // floor + 19
  assert.equal(S.stage(withScore(c, 660), s.lender), 'ready_to_review'); // floor + 20
  assert.equal(S.stage(withScore(c, 660), { ...s.lender, buffer: 30 }), 'approaching'); // lender widened the buffer
});

test('ready_to_review needs more than the score', () => {
  const { s, c } = base();
  assert.equal(S.stage({ ...c, credit: { ...c.credit, utilization: 0.31 } }, s.lender), 'approaching');
  assert.equal(S.stage({ ...c, credit: { ...c.credit, derogLast12mo: true } }, s.lender), 'approaching');
  assert.equal(S.stage({ ...c, disputes: [{ status: 'sent' }] }, s.lender), 'working');
  assert.equal(S.stage({ ...c, score: { ...c.score, value: null } }, s.lender), 'not_ready');
  assert.equal(S.stage({ ...c, credit: { ...c.credit, tradelines: 2 } }, s.lender), 'not_ready');
});

test('stageReason keeps the pathway as the reason under Working', () => {
  const s = S.fixtures();
  assert.equal(S.stageReason(S.getConsumer(s, 'sam'), s.lender), 'dispute');
  assert.equal(S.stageReason(S.getConsumer(s, 'maria'), s.lender), 'build');
  assert.equal(S.stageReason(S.getConsumer(s, 'jordan'), s.lender), 'thin');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/stage.test.mjs`
Expected: FAIL — `S.STAGES is undefined` / `S.stage is not a function`

- [ ] **Step 3: Implement**

In `src/state.js`, directly after `PATHWAY_BLURBS`:

```js
export const STAGES = ['not_ready', 'working', 'approaching', 'ready_to_review'];
export const STAGE_LABELS = { not_ready: 'Not ready', working: 'Working', approaching: 'Approaching ready', ready_to_review: 'Ready to review' };
/** Borrower-facing: same state, different words. Never "Not ready". */
export const STAGE_STEPS = { not_ready: 'Step 1 of 4 — getting your picture', working: 'Step 2 of 4 — clearing the blockers', approaching: 'Step 3 of 4 — almost there', ready_to_review: 'Step 4 of 4 — your loan officer has your summary' };
/** Consumer FICO 8/9 and mortgage FICO 2/4/5 routinely differ by 15–30 points; the buffer is the band where ReadyIQ stops asserting and hands off to a real pull. */
export const BUFFER_DEFAULT = 20;
export const APPROACH_BAND = 15;
```

In `FIXTURES.lender`, add `buffer: 20,` after `floorDefault: 640,`.

After `assignPathway` (rules section):

```js
export function stage(c, lender) {
  const floor = lender.floorDefault, buf = lender.buffer ?? BUFFER_DEFAULT;
  const score = c.score?.value ?? null, cr = c.credit;
  if (score == null || cr.tradelines < 3) return 'not_ready';
  const openDisputes = (c.disputes || []).some((d) => d.status !== 'resolved');
  const r = dti(cr.monthlyDebts, c.income);
  const derog24 = cr.latesLast24mo > 0 || (c.publicRecords || []).some((p) => monthsSince(p.date) <= 24);
  if (openDisputes || derog24 || cr.utilization > 0.5 || (r != null && r > 0.45) || score < floor - APPROACH_BAND) return 'working';
  if (score < floor + buf) return 'approaching';
  return cr.utilization <= 0.3 && !cr.derogLast12mo ? 'ready_to_review' : 'approaching';
}
/** The pathway survives as the reason shown under a stage. */
export function stageReason(c, lender) { return assignPathway(c, lender); }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all pass, including the new file (the existing `readinessTrigger` test still passes — it is not removed in this task).

- [ ] **Step 5: Commit**

```bash
git add src/state.js test/stage.test.mjs
git commit -m "feat(state): four readiness stages with a variance buffer above the lender floor"
```

---

### Task 2: Review outcome — the precision number's raw material

**Files:**
- Modify: `src/state.js` (transitions section, after `requestReview`)
- Test: `test/stage.test.mjs` (append)

**Interfaces:**
- Produces: `recordReviewOutcome(state, consumerId, { outcome: 'qualified'|'short'|'declined_review', at?: string }) → consumer`, field `consumer.reviewOutcome: { outcome, at } | null`.

- [ ] **Step 1: Write the failing test**

Append to `test/stage.test.mjs`:

```js
test('recordReviewOutcome stores the formal-pull result on the consumer', () => {
  const s = S.fixtures();
  const c = S.recordReviewOutcome(s, 'priya', { outcome: 'qualified', at: '2026-09-03' });
  assert.deepEqual(c.reviewOutcome, { outcome: 'qualified', at: '2026-09-03' });
  assert.throws(() => S.recordReviewOutcome(s, 'priya', { outcome: 'maybe' }), /unknown outcome/);
  assert.equal(S.recordReviewOutcome(s, 'nobody', { outcome: 'short' }), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/stage.test.mjs`
Expected: FAIL — `S.recordReviewOutcome is not a function`

- [ ] **Step 3: Implement**

In `src/state.js` after `requestReview`:

```js
export const REVIEW_OUTCOMES = ['qualified', 'short', 'declined_review'];
export function recordReviewOutcome(state, id, { outcome, at = TODAY } = {}) {
  const c = getConsumer(state, id); if (!c) return null;
  if (!REVIEW_OUTCOMES.includes(outcome)) throw new RangeError(`unknown outcome "${outcome}"`);
  c.reviewOutcome = { outcome, at };
  return c;
}
```

Also add `reviewOutcome: null,` to every consumer in `FIXTURES.consumers` (7 entries — place it after `loanFile:`), so the shape is uniform.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/state.js test/stage.test.mjs
git commit -m "feat(state): record the formal-pull outcome per consumer"
```

---

### Task 3: The status object carries the stage

**Files:**
- Modify: `server/status-object.js:66-95` (`buildStatusObject`)
- Modify: `server/connectors/shape.js:146-160` (`mapToShapeFields`)
- Modify: `server/connectors/salesforce.js:23-33` (`DEFAULT_FIELD_MAP`)
- Test: `test/status-object.test.mjs` (append), `test/connectors.test.mjs` (append)

**Interfaces:**
- Consumes: `stage`, `stageReason` from `src/state.js` (Task 1). `buildStatusObject(consumer, opts)` gains `opts.lender` (required to compute the stage; when absent, `readiness_stage` is `null`).
- Produces: `status.readiness_stage`, `status.readiness_reason`; Shape field `readyiq_readiness_stage`; Salesforce map key `readiness_stage → 'ReadyIQ_Readiness_Stage__c'`.

- [ ] **Step 1: Write the failing tests**

Append to `test/status-object.test.mjs`:

```js
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
```

Append to `test/connectors.test.mjs`:

```js
test('Shape and Salesforce carry the readiness stage', () => {
  const s = fixtures();
  const st = buildStatusObject(s.consumers.find((c) => c.id === 'denise'), { lender: s.lender });
  assert.equal(mapToShapeFields(st, identity).readyiq_readiness_stage, 'approaching');
  assert.equal(DEFAULT_FIELD_MAP.readiness_stage, 'ReadyIQ_Readiness_Stage__c');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/status-object.test.mjs test/connectors.test.mjs`
Expected: FAIL — `readiness_stage` is `undefined`

- [ ] **Step 3: Implement**

`server/status-object.js` — add the import at the top and two fields in the object:

```js
import { stage as computeStage, stageReason } from '../src/state.js';
```

Inside `buildStatusObject`, after `stage: status ?? null,`:

```js
    readiness_stage: opts.lender ? computeStage(consumer, opts.lender) : null,
    readiness_reason: opts.lender ? stageReason(consumer, opts.lender) : null,
```

`server/connectors/shape.js` — in `mapToShapeFields`, after `readyiq_stage: status.stage,`:

```js
    readyiq_readiness_stage: status.readiness_stage ?? undefined,
```

`server/connectors/salesforce.js` — in `DEFAULT_FIELD_MAP`, after `stage: 'ReadyIQ_Stage__c',`:

```js
  readiness_stage: 'ReadyIQ_Readiness_Stage__c',
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS. (Note `test/connectors.test.mjs:104` only checks keys *starting* with `readyiq_`, so the new key is allowed.)

- [ ] **Step 5: Commit**

```bash
git add server/status-object.js server/connectors/shape.js server/connectors/salesforce.js test/status-object.test.mjs test/connectors.test.mjs
git commit -m "feat(status): readiness_stage and readiness_reason on the status object and CRM field maps"
```

---

### Task 4: The referral object — summary, consent, compliance guard

**Files:**
- Create: `server/referral.js`
- Test: `test/referral.test.mjs`

**Interfaces:**
- Consumes: `packet`, `stage`, `stageReason` from `src/state.js`; `assertNoReportData`, `slug` from `server/status-object.js`.
- Produces:
  - `buildReadinessSummary(consumer, lender) → { object:'readiness_summary', version:1, consumer_ref, stage, reason, floors_met:string[], dti_in_range:boolean|null, rent_months_verified:number, disputes:{open,resolved}, lo_of_record:string|null, buffer_applied:number }`
  - `buildReferral({ direction:'lo_to_cr'|'cr_to_lo', from:{kind,id}, to:{kind,id}[], consumer, lender, consent:{granted_at, scope, text_version}, id?, createdAt? }) → referral`
  - `assertReferralCompliant(referral)` — throws `ReferralNotCompliant`
  - `REFERRAL_DIRECTIONS`, `ReferralNotCompliant`

- [ ] **Step 1: Write the failing tests**

```js
// test/referral.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReadinessSummary, buildReferral, assertReferralCompliant, ReferralNotCompliant, REFERRAL_DIRECTIONS } from '../server/referral.js';
import { assertNoReportData } from '../server/status-object.js';
import { fixtures, getConsumer } from '../src/state.js';

const s = fixtures();
const consent = { granted_at: '2026-09-02T15:00:00Z', scope: 'share_readiness_summary', text_version: 'v1' };
const cr = { kind: 'credit_repair', id: 'brightpath' };
const lo = { kind: 'lo', id: 'sarah' };

test('a readiness summary is derived status only and never carries report data', () => {
  const sum = buildReadinessSummary(getConsumer(s, 'sam'), s.lender);
  assert.equal(sum.object, 'readiness_summary');
  assert.equal(sum.stage, 'working');
  assert.equal(sum.reason, 'dispute');
  assert.deepEqual(sum.disputes, { open: 2, resolved: 0 });
  assert.equal(sum.dti_in_range, true);          // 873 / 7100 = 0.12
  assert.equal(sum.rent_months_verified, 0);
  assert.equal(sum.lo_of_record, 'sarah');
  assert.equal(sum.buffer_applied, 20);
  assert.ok(!('income' in sum) && !('score' in sum));
  assertNoReportData(sum);
});

test('floors_met and dti_in_range come from the lender programs and the 45% line', () => {
  const sum = buildReadinessSummary(getConsumer(s, 'priya'), s.lender);
  assert.deepEqual(sum.floors_met, ['FHA', 'Conventional', 'Harbor Down-Payment Assist']);
  assert.equal(buildReadinessSummary(getConsumer(s, 'jordan'), s.lender).dti_in_range, true);  // income 5200, debts 85 → 0.02
  assert.equal(buildReadinessSummary({ ...getConsumer(s, 'maria'), income: null }, s.lender).dti_in_range, null); // no income → unknown, not false
});

test('a referral needs a direction, a consent, and at least one recipient', () => {
  const r = buildReferral({ direction: 'cr_to_lo', from: cr, to: [lo], consumer: getConsumer(s, 'denise'), lender: s.lender, consent, id: 'ref_1', createdAt: '2026-09-02T15:01:00Z' });
  assert.equal(r.object, 'referral');
  assert.equal(r.direction, 'cr_to_lo');
  assert.deepEqual(r.to, [lo]);
  assert.equal(r.summary.stage, 'approaching');
  assert.equal(r.status, 'sent');
  assert.deepEqual(REFERRAL_DIRECTIONS, ['lo_to_cr', 'cr_to_lo']);
  assert.throws(() => buildReferral({ direction: 'cr_to_lo', from: cr, to: [], consumer: getConsumer(s, 'denise'), lender: s.lender, consent }), ReferralNotCompliant);
  assert.throws(() => buildReferral({ direction: 'cr_to_lo', from: cr, to: [lo], consumer: getConsumer(s, 'denise'), lender: s.lender, consent: { scope: 'x' } }), /consent/);
  assert.throws(() => buildReferral({ direction: 'sideways', from: cr, to: [lo], consumer: getConsumer(s, 'denise'), lender: s.lender, consent }), /direction/);
});

test('nothing of value may ride on a referral, at any depth', () => {
  const r = buildReferral({ direction: 'cr_to_lo', from: cr, to: [lo, { kind: 'lo', id: 'marcus' }], consumer: getConsumer(s, 'denise'), lender: s.lender, consent });
  assertReferralCompliant(r);                              // multi-LO is fine
  for (const bad of ['fee', 'compensation', 'bonus', 'rank', 'preferred', 'commission']) {
    assert.throws(() => assertReferralCompliant({ ...r, extra: { [bad]: 1 } }), ReferralNotCompliant, bad);
  }
  assert.throws(() => assertReferralCompliant({ ...r, summary: { ...r.summary, score: 700 } }), /report data/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/referral.test.mjs`
Expected: FAIL — cannot find module `../server/referral.js`

- [ ] **Step 3: Implement**

```js
// server/referral.js — the handoff object between a loan officer and a credit-repair firm.
//
// This is the second contract next to readiness_status. It carries a
// readiness_summary (derived status, never report data) plus the consent that
// authorised the share and the parties on each side. Two things are enforced
// in code because they are the RESPA §8 posture, not a style choice:
//   - a referral to an LO may name several LOs (no exclusivity), and
//   - nothing of value may ride on it (no fee/compensation/rank keys anywhere).

import { randomUUID } from 'node:crypto';
import { assertNoReportData } from './status-object.js';
import { stage, stageReason, dti, BUFFER_DEFAULT } from '../src/state.js';

export const REFERRAL_VERSION = 1;
export const REFERRAL_DIRECTIONS = ['lo_to_cr', 'cr_to_lo'];
export const PARTY_KINDS = ['lo', 'credit_repair'];

const VALUE_KEYS = new Set(['fee', 'fees', 'compensation', 'bonus', 'rank', 'ranking', 'preferred', 'commission', 'payout', 'revenue_share', 'revshare']);

export class ReferralNotCompliant extends Error {
  constructor(msg) { super(msg); this.name = 'ReferralNotCompliant'; }
}

export function buildReadinessSummary(consumer, lender) {
  if (!consumer || !lender) throw new TypeError('consumer and lender required');
  const score = consumer.score?.value ?? null;
  const r = dti(consumer.credit?.monthlyDebts, consumer.income);
  const summary = {
    object: 'readiness_summary',
    version: REFERRAL_VERSION,
    consumer_ref: `c_${consumer.id}`,
    stage: stage(consumer, lender),
    reason: stageReason(consumer, lender),
    floors_met: (lender.programs || []).filter((p) => score != null && score >= p.floor).map((p) => p.name),
    dti_in_range: r == null ? null : r <= 0.45,
    rent_months_verified: consumer.rentReporting?.linked ? consumer.rentReporting.monthsAvailable : 0,
    disputes: {
      open: (consumer.disputes || []).filter((d) => d.status !== 'resolved').length,
      resolved: (consumer.disputes || []).filter((d) => d.status === 'resolved').length,
    },
    lo_of_record: consumer.attribution?.lo ?? consumer.loId ?? null,
    buffer_applied: lender.buffer ?? BUFFER_DEFAULT,
  };
  return assertNoReportData(summary, 'readiness_summary');
}

export function buildReferral({ direction, from, to, consumer, lender, consent, id, createdAt } = {}) {
  if (!REFERRAL_DIRECTIONS.includes(direction)) throw new ReferralNotCompliant(`unknown direction "${direction}"`);
  if (!consent || !consent.granted_at) throw new ReferralNotCompliant('consent with granted_at is required before a referral can be sent');
  const referral = {
    object: 'referral',
    version: REFERRAL_VERSION,
    id: id || `ref_${randomUUID()}`,
    direction,
    from: { kind: from?.kind ?? null, id: from?.id ?? null },
    to: Array.isArray(to) ? to.map((p) => ({ kind: p.kind, id: p.id })) : [],
    consumer_ref: `c_${consumer.id}`,
    summary: buildReadinessSummary(consumer, lender),
    consent: { granted_at: consent.granted_at, scope: consent.scope ?? 'share_readiness_summary', text_version: consent.text_version ?? 'v1' },
    status: 'sent',
    created_at: createdAt || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
  return assertReferralCompliant(referral);
}

export function assertReferralCompliant(referral) {
  if (!referral || referral.object !== 'referral') throw new ReferralNotCompliant('not a referral');
  if (!REFERRAL_DIRECTIONS.includes(referral.direction)) throw new ReferralNotCompliant(`unknown direction "${referral.direction}"`);
  if (!Array.isArray(referral.to) || referral.to.length < 1) throw new ReferralNotCompliant('a referral needs at least one recipient');
  for (const p of referral.to) if (!PARTY_KINDS.includes(p.kind)) throw new ReferralNotCompliant(`unknown party kind "${p.kind}"`);
  if (!referral.consent?.granted_at) throw new ReferralNotCompliant('consent.granted_at missing');
  walk(referral, 'referral');
  assertNoReportData(referral.summary, 'referral.summary');
  return referral;
}

function walk(value, path, seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) { value.forEach((v, i) => walk(v, `${path}[${i}]`, seen)); return; }
  for (const [k, v] of Object.entries(value)) {
    if (VALUE_KEYS.has(k.toLowerCase())) throw new ReferralNotCompliant(`a referral may not carry a thing of value (found "${path}.${k}")`);
    walk(v, `${path}.${k}`, seen);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/referral.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/referral.js test/referral.test.mjs
git commit -m "feat(referral): readiness summary + referral object with consent and a RESPA guard"
```

---

### Task 5: The referral log and the precision number

**Files:**
- Modify: `server/referral.js` (append)
- Test: `test/referral.test.mjs` (append)

**Interfaces:**
- Produces: `class ReferralLog { record(referral) → referral; get(id); list({ tenantId?, direction?, consumerRef? }); setOutcome(id, { outcome, at }) → entry; precision(tenantId) → { flagged, qualified, short, rate:number|null } }`. Entries are `{ tenantId, referral, outcome:null|{outcome,at}, recordedAt }`.

- [ ] **Step 1: Write the failing tests**

Append to `test/referral.test.mjs`:

```js
import { ReferralLog } from '../server/referral.js';

test('the log is append-only and the precision number is qualified over flagged', () => {
  const log = new ReferralLog();
  const mk = (id, who) => buildReferral({ direction: 'cr_to_lo', from: cr, to: [lo], consumer: getConsumer(s, who), lender: s.lender, consent, id });
  log.record(mk('ref_a', 'priya'), { tenantId: 'harbor' });
  log.record(mk('ref_b', 'tom'), { tenantId: 'harbor' });
  log.record(mk('ref_c', 'denise'), { tenantId: 'harbor' });
  log.record(mk('ref_d', 'priya'), { tenantId: 'other' });

  assert.equal(log.list({ tenantId: 'harbor' }).length, 3);
  assert.equal(log.list({ tenantId: 'harbor', consumerRef: 'c_priya' }).length, 1);
  assert.deepEqual(log.precision('harbor'), { flagged: 3, qualified: 0, short: 0, rate: null });

  log.setOutcome('ref_a', { outcome: 'qualified', at: '2026-09-05' });
  log.setOutcome('ref_b', { outcome: 'short', at: '2026-09-06' });
  assert.deepEqual(log.precision('harbor'), { flagged: 3, qualified: 1, short: 1, rate: 0.5 });
  assert.throws(() => log.setOutcome('ref_zzz', { outcome: 'qualified' }), /not found/);
  assert.throws(() => log.setOutcome('ref_c', { outcome: 'maybe' }), /unknown outcome/);
  assert.throws(() => log.record(mk('ref_a', 'priya'), { tenantId: 'harbor' }), /already recorded/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/referral.test.mjs`
Expected: FAIL — `ReferralLog` is not exported

- [ ] **Step 3: Implement**

Append to `server/referral.js`:

```js
import { REVIEW_OUTCOMES } from '../src/state.js';

/** Append-only, in-memory, database-shaped. The audit trail a RESPA reviewer asks for. */
export class ReferralLog {
  #entries = new Map();

  record(referral, { tenantId } = {}) {
    assertReferralCompliant(referral);
    if (!tenantId) throw new TypeError('tenantId required');
    if (this.#entries.has(referral.id)) throw new Error(`referral ${referral.id} already recorded`);
    this.#entries.set(referral.id, { tenantId, referral, outcome: null, recordedAt: new Date().toISOString() });
    return referral;
  }

  get(id) { return this.#entries.get(id) ?? null; }

  list({ tenantId, direction, consumerRef } = {}) {
    return [...this.#entries.values()].filter((e) =>
      (!tenantId || e.tenantId === tenantId) &&
      (!direction || e.referral.direction === direction) &&
      (!consumerRef || e.referral.consumer_ref === consumerRef));
  }

  /** Set by the LO after the formal pull. `rate` is qualified ÷ (qualified + short). */
  setOutcome(id, { outcome, at = new Date().toISOString().slice(0, 10) } = {}) {
    const entry = this.#entries.get(id);
    if (!entry) throw new Error(`referral ${id} not found`);
    if (!REVIEW_OUTCOMES.includes(outcome)) throw new RangeError(`unknown outcome "${outcome}"`);
    entry.outcome = { outcome, at };
    return entry;
  }

  precision(tenantId) {
    const sent = this.list({ tenantId, direction: 'cr_to_lo' });
    const qualified = sent.filter((e) => e.outcome?.outcome === 'qualified').length;
    const short = sent.filter((e) => e.outcome?.outcome === 'short').length;
    const decided = qualified + short;
    return { flagged: sent.length, qualified, short, rate: decided ? Math.round((qualified / decided) * 100) / 100 : null };
  }
}
```

(Move the `REVIEW_OUTCOMES` import up to the existing `../src/state.js` import line.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/referral.js test/referral.test.mjs
git commit -m "feat(referral): append-only referral log with the ready-to-review precision number"
```

---

### Task 6: New outbound events for the loop

**Files:**
- Modify: `server/events.js:12-24` (`OUTBOUND_EVENTS`)
- Modify: `server/connectors/total-expert.js:27-38` (`INSIGHT_TYPES`)
- Test: `test/dispatch.test.mjs` (append)

**Interfaces:**
- Produces event types: `readiness.approaching`, `referral.sent_to_lo`, `referral.sent_to_cr`, `review.outcome_recorded`. `buildEvent` is unchanged; its `status` argument may now be a `readiness_summary` (it only requires no report data).

- [ ] **Step 1: Write the failing test**

Append to `test/dispatch.test.mjs`:

```js
test('the loop events exist and can be built from a readiness summary', () => {
  for (const t of ['readiness.approaching', 'referral.sent_to_lo', 'referral.sent_to_cr', 'review.outcome_recorded']) assert.ok(OUTBOUND_EVENTS[t], t);
  const ev = buildEvent({ type: 'referral.sent_to_lo', tenantId: 'harbor', status: { object: 'readiness_summary', version: 1, consumer_ref: 'c_denise', stage: 'approaching' } });
  assert.equal(ev.consumer_ref, 'c_denise');
});
```

(Add `OUTBOUND_EVENTS` to the existing import from `../server/events.js` at the top of the file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/dispatch.test.mjs test/connectors.test.mjs`
Expected: FAIL — `readiness.approaching` undefined. (`connectors.test.mjs` "every outbound event maps to a Total Expert insight type" will also fail once events are added and before insight types are — do both in Step 3.)

- [ ] **Step 3: Implement**

`server/events.js` — add inside `OUTBOUND_EVENTS` after `'readiness.trigger'`:

```js
  'readiness.approaching': 'The consumer entered the buffer band below/around the floor — recommend a soft tri-merge through the lender\'s normal vendor.',
  'referral.sent_to_lo': 'A credit-repair partner sent a readiness summary to one or more loan officers.',
  'referral.sent_to_cr': 'A loan officer sent a not-ready borrower to one or more credit-repair partners.',
  'review.outcome_recorded': 'The loan officer recorded the result of the formal pull (qualified / short).',
```

`server/connectors/total-expert.js` — add inside `INSIGHT_TYPES`:

```js
  'readiness.approaching': 'ReadyIQ: Approaching ready — soft pull recommended',
  'referral.sent_to_lo': 'ReadyIQ: Readiness summary received from credit-repair partner',
  'referral.sent_to_cr': 'ReadyIQ: Borrower sent to credit-repair partner',
  'review.outcome_recorded': 'ReadyIQ: Formal pull outcome recorded',
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/events.js server/connectors/total-expert.js test/dispatch.test.mjs
git commit -m "feat(events): approaching, referral, and review-outcome events with TE insight types"
```

---

### Task 7: Credit-repair platform registry (honest access models)

**Files:**
- Create: `server/partners/registry.js`
- Test: `test/partners.test.mjs`

**Interfaces:**
- Produces: `PARTNER_PLATFORMS` (frozen), `PARTNER_IDS`, `getPartner(id)`, `partnerLevel(id) → 0|1|2`, `partnersByLevel()`.
  Entries: `csv` (L0), `zapier` (L1), `disputechat` (L2, `accessModel:'self_serve'`), `credit_repair_cloud` (L2, `developer_signup`, blockedOn set), `disputefox` (L2, `developer_signup`, blockedOn set).

- [ ] **Step 1: Write the failing test**

```js
// test/partners.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { PARTNER_PLATFORMS, PARTNER_IDS, getPartner, partnerLevel, partnersByLevel } from '../server/partners/registry.js';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/partners.test.mjs`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement**

```js
// server/partners/registry.js — the credit-repair side of the loop: what each source is, and how far it is from real.
//
// Mirrors connectors/registry.js for the lender side. `implemented: false`
// entries exist so a roadmap can show them without a single guessed endpoint
// being written; their adapters fail loudly until vendor docs are confirmed.

export const PARTNER_PLATFORMS = Object.freeze({
  csv: {
    id: 'csv', displayName: 'CSV / manual entry', kind: 'credit_repair', level: 0,
    accessModel: 'self_serve', blockedOn: null, implemented: true, docs: 'docs/runbooks/level-0-manual-loop.md',
    notes: 'The operator already pulls the report monthly. They type or upload blocker-level facts; no report data is ever entered.',
  },
  zapier: {
    id: 'zapier', displayName: 'Zapier / Make / any webhook', kind: 'credit_repair', level: 1,
    accessModel: 'self_serve', blockedOn: null, implemented: true, docs: 'https://zapier.com/apps/webhook/integrations',
    notes: 'Inbound: a Zap posts to /v1/inbound/zapier with a shared token. Outbound: the existing generic signed webhook to a Zapier catch hook.',
  },
  disputechat: {
    id: 'disputechat', displayName: 'DisputeChat', kind: 'credit_repair', level: 2,
    accessModel: 'self_serve', blockedOn: null, implemented: true, docs: null,
    notes: 'Ours. Signs with ReadyIQ\'s own signature scheme; dchub gains an outbound hook in a separate plan.',
  },
  credit_repair_cloud: {
    id: 'credit_repair_cloud', displayName: 'Credit Repair Cloud', kind: 'credit_repair', level: 2,
    accessModel: 'developer_signup', blockedOn: 'Confirm inbound payload fields from the CRC API/Zapier docs with a developer account', implemented: false, docs: 'https://www.creditrepaircloud.com/',
    notes: 'Dominant CRM in the market and the distribution prize. Reachable today via zapier.',
  },
  disputefox: {
    id: 'disputefox', displayName: 'DisputeFox', kind: 'credit_repair', level: 2,
    accessModel: 'developer_signup', blockedOn: 'Confirm inbound payload fields from the DisputeFox API/Zapier docs with a developer account', implemented: false, docs: 'https://disputefox.com/',
    notes: 'Second platform to cover. Reachable today via zapier.',
  },
});

export const PARTNER_IDS = Object.freeze(Object.keys(PARTNER_PLATFORMS));

export function getPartner(id) {
  const def = PARTNER_PLATFORMS[id];
  if (!def) throw new RangeError(`unknown partner "${id}"`);
  return def;
}
export function partnerLevel(id) { return getPartner(id).level; }
export function partnersByLevel() {
  const out = { 0: [], 1: [], 2: [] };
  for (const id of PARTNER_IDS) out[PARTNER_PLATFORMS[id].level].push(id);
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/partners.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/partners/registry.js test/partners.test.mjs
git commit -m "feat(partners): credit-repair platform registry with honest access models per level"
```

---

### Task 8: One normalized `partner_update` and how it moves a consumer

**Files:**
- Create: `server/partners/normalize.js`
- Test: `test/partners.test.mjs` (append)

**Interfaces:**
- Produces:
  - `PARTNER_UPDATE_VERSION = 1`
  - `normalizeUpdate(raw) → partner_update` — validates and fills defaults. Shape: `{ object:'partner_update', version:1, source, consumer_ref, occurred_at, disputes:{open:number|null, resolved:number|null}, round_completed:boolean, rent_months_verified:number|null, blockers_cleared:string[], note:string|null }`. Throws `TypeError` on missing `source`/`consumer_ref`. Rejects any forbidden report key (reuses `assertNoReportData`).
  - `applyPartnerUpdate(state, update, { lender }) → { consumer, before, after, events:string[] }` — mutates the consumer's `disputes` counts (marks that many `sent` disputes `resolved`), `rentReporting`, `round`; recomputes stage; returns event types to emit (`round.completed`, `readiness.approaching`, `readiness.trigger`).

- [ ] **Step 1: Write the failing tests**

Append to `test/partners.test.mjs`:

```js
import { normalizeUpdate, applyPartnerUpdate } from '../server/partners/normalize.js';
import { fixtures, getConsumer, stage } from '../src/state.js';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/partners.test.mjs`
Expected: FAIL — cannot find module `normalize.js`

- [ ] **Step 3: Implement**

```js
// server/partners/normalize.js — every source (CSV, Zapier, DisputeChat, CRC…) becomes one partner_update,
// and one function decides what that update does to a consumer's stage.

import { assertNoReportData } from '../status-object.js';
import { getConsumer, stage, TODAY } from '../../src/state.js';
import { PARTNER_IDS } from './registry.js';

export const PARTNER_UPDATE_VERSION = 1;

export function normalizeUpdate(raw = {}) {
  if (!raw.source || !PARTNER_IDS.includes(raw.source)) throw new TypeError(`source required, one of ${PARTNER_IDS.join(', ')}`);
  if (!raw.consumer_ref) throw new TypeError('consumer_ref required');
  assertNoReportData(raw, 'partner_update');
  const num = (v) => (v == null || v === '' ? null : Number(v));
  return {
    object: 'partner_update',
    version: PARTNER_UPDATE_VERSION,
    source: raw.source,
    consumer_ref: String(raw.consumer_ref),
    occurred_at: raw.occurred_at || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    disputes: { open: num(raw.disputes?.open), resolved: num(raw.disputes?.resolved) },
    round_completed: Boolean(raw.round_completed),
    rent_months_verified: num(raw.rent_months_verified),
    blockers_cleared: Array.isArray(raw.blockers_cleared) ? raw.blockers_cleared.map(String) : [],
    note: raw.note ? String(raw.note).slice(0, 500) : null,
  };
}

export function applyPartnerUpdate(state, update, { lender } = {}) {
  const id = update.consumer_ref.replace(/^c_/, '');
  const c = getConsumer(state, id);
  if (!c) throw new Error(`unknown consumer ${update.consumer_ref}`);
  const before = stage(c, lender);
  const events = [];

  if (update.disputes.resolved != null) {
    let toResolve = update.disputes.resolved - c.disputes.filter((d) => d.status === 'resolved').length;
    for (const d of c.disputes) if (toResolve > 0 && d.status !== 'resolved') { d.status = 'resolved'; d.resolvedAt = update.occurred_at.slice(0, 10); toResolve--; }
  }
  if (update.rent_months_verified != null) {
    c.rentReporting = { ...c.rentReporting, linked: true, monthsAvailable: update.rent_months_verified };
  }
  if (update.round_completed) { c.round = (c.round ?? 0) + 1; events.push('round.completed'); }

  const after = stage(c, lender);
  if (after !== before) {
    if (after === 'approaching') events.push('readiness.approaching');
    if (after === 'ready_to_review') events.push('readiness.trigger');
  }
  c.lastPartnerUpdate = { source: update.source, at: update.occurred_at.slice(0, 10) || TODAY };
  return { consumer: c, before, after, events };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/partners/normalize.js test/partners.test.mjs
git commit -m "feat(partners): one partner_update shape and the stage transition it drives"
```

---

### Task 9: Level 0 — CSV import and the manual runbook

**Files:**
- Create: `server/partners/csv.js`
- Create: `docs/runbooks/level-0-manual-loop.md`, `docs/runbooks/level-0-template.csv`
- Test: `test/partners.test.mjs` (append)

**Interfaces:**
- Produces: `parseCsv(text) → partner_update[]`; `CSV_COLUMNS` (ordered). Columns: `consumer_ref,occurred_at,disputes_open,disputes_resolved,round_completed,rent_months_verified,blockers_cleared,note`. `blockers_cleared` is `|`-separated. `round_completed` accepts `yes/no/true/false/1/0`.

- [ ] **Step 1: Write the failing test**

Append to `test/partners.test.mjs`:

```js
import { parseCsv, CSV_COLUMNS } from '../server/partners/csv.js';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/partners.test.mjs`
Expected: FAIL — cannot find module `csv.js`

- [ ] **Step 3: Implement**

```js
// server/partners/csv.js — Level 0. The operator already pulls the report; they type blocker-level facts, never the report.
import { normalizeUpdate } from './normalize.js';

export const CSV_COLUMNS = ['consumer_ref', 'occurred_at', 'disputes_open', 'disputes_resolved', 'round_completed', 'rent_months_verified', 'blockers_cleared', 'note'];
const TRUTHY = new Set(['yes', 'true', '1', 'y']);

export function parseCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const header = splitRow(lines[0]);
  for (const h of header) if (!CSV_COLUMNS.includes(h)) throw new RangeError(`unknown column "${h}"`);
  return lines.slice(1).map((line) => {
    const cells = splitRow(line);
    const row = Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']));
    return normalizeUpdate({
      source: 'csv',
      consumer_ref: row.consumer_ref,
      occurred_at: row.occurred_at ? `${row.occurred_at}T00:00:00Z` : undefined,
      disputes: { open: row.disputes_open, resolved: row.disputes_resolved },
      round_completed: TRUTHY.has(String(row.round_completed).trim().toLowerCase()),
      rent_months_verified: row.rent_months_verified,
      blockers_cleared: row.blockers_cleared ? row.blockers_cleared.split('|').map((s) => s.trim()).filter(Boolean) : [],
      note: row.note || null,
    });
  });
}

/** Minimal RFC-4180 split: commas, double quotes, doubled quotes inside quotes. */
function splitRow(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
```

`docs/runbooks/level-0-template.csv`:

```csv
consumer_ref,occurred_at,disputes_open,disputes_resolved,round_completed,rent_months_verified,blockers_cleared,note
c_sam,2026-09-03,0,2,yes,,collection|late_payment,"paid Midland; Navient corrected"
```

`docs/runbooks/level-0-manual-loop.md`:

```markdown
# Level 0 — running the loop by hand

Who: one credit-repair operator, one or two loan officers, one ReadyIQ operator (you).
Goal: prove that an LO acts on a readiness summary. No portal needed.

## Weekly cadence (operator, 15 minutes)
1. Open your own monitoring dashboard (you already pull this monthly). For each ReadyIQ client, note ONLY:
   disputes open / resolved, whether a round finished, verified rent months, which blockers cleared.
   Never enter a score, a balance, or anything from the report itself — the importer rejects those columns.
2. Fill one row per client in `level-0-template.csv` (consumer_ref is the `c_<id>` ReadyIQ gave you).
3. Send the CSV to ReadyIQ as the raw request body: `curl --data-binary @level-0.csv -H "content-type: text/csv" "http://<rail>/v1/inbound/csv?tenant=<tenant>"` (or hand the file to the ReadyIQ operator, who runs the same command against the local rail started with `npm run rail`).
4. ReadyIQ recomputes each client's stage. Anyone who crosses into **Approaching ready** triggers a
   "recommend soft tri-merge" event to the LO of record.

## When a client is approaching ready
5. Operator presses **Send to mortgage partner** (or, at L0, asks ReadyIQ to `POST /v1/referrals`).
   Client consent is captured first — the checkbox text is `consent.text_version v1`.
   Pick one or MORE loan officers. Never one by default.
6. The LO receives the readiness summary (stage, floors met, DTI in range, rent months, disputes) — no score, no report.
7. The LO requests the formal pull through their normal vendor and records the result:
   `POST /v1/referrals/<id>/outcome?tenant=<tenant> {"outcome":"qualified"|"short"}`.

## What we measure
- Precision: qualified ÷ (qualified + short) from `GET /v1/precision?tenant=<tenant>`. Below ~0.7, widen the buffer.
- Recovered opportunities: referrals with outcome `qualified`. Not logins.

## What we never do at any level
- Pay or receive anything for a referral. Pricing is flat per seat.
- Send a score, a report, income, or account data across the seam.
- Route to a single "preferred" LO.
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/partners/csv.js docs/runbooks/level-0-manual-loop.md docs/runbooks/level-0-template.csv test/partners.test.mjs
git commit -m "feat(partners): Level 0 CSV import and the manual-loop runbook"
```

---

### Task 10: Level 1 — Zapier inbound with a shared token

**Files:**
- Create: `server/partners/zapier.js`
- Test: `test/partners.test.mjs` (append)

**Interfaces:**
- Produces: `verifyZapierToken(headers, expected) → boolean` (constant-time; header `x-readyiq-token`), `fromZapier(body) → partner_update` (accepts the flat field names a Zap can map: `consumer_ref, disputes_open, disputes_resolved, round_completed, rent_months_verified, blockers_cleared (array or "a|b"), note, occurred_at`).
- Consumes: `safeEqual` from `server/vault.js`, `normalizeUpdate` (Task 8).

- [ ] **Step 1: Write the failing test**

Append to `test/partners.test.mjs`:

```js
import { verifyZapierToken, fromZapier } from '../server/partners/zapier.js';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/partners.test.mjs`
Expected: FAIL — cannot find module `zapier.js`

- [ ] **Step 3: Implement**

```js
// server/partners/zapier.js — Level 1 inbound. A Zap maps its trigger's fields onto our flat names and POSTs with a shared token.
import { safeEqual } from '../vault.js';
import { normalizeUpdate } from './normalize.js';

const TRUTHY = new Set(['yes', 'true', '1', 'y']);

export function verifyZapierToken(headers = {}, expected) {
  const given = headers['x-readyiq-token'] ?? headers['X-ReadyIQ-Token'];
  if (!given || !expected) return false;
  return safeEqual(String(given), String(expected));
}

export function fromZapier(body = {}) {
  const list = (v) => Array.isArray(v) ? v : (v ? String(v).split('|') : []);
  return normalizeUpdate({
    source: 'zapier',
    consumer_ref: body.consumer_ref,
    occurred_at: body.occurred_at,
    disputes: { open: body.disputes_open, resolved: body.disputes_resolved },
    round_completed: TRUTHY.has(String(body.round_completed ?? '').trim().toLowerCase()),
    rent_months_verified: body.rent_months_verified,
    blockers_cleared: list(body.blockers_cleared),
    note: body.note,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/partners/zapier.js test/partners.test.mjs
git commit -m "feat(partners): Level 1 Zapier inbound with a shared token"
```

---

### Task 11: Level 2 — DisputeChat (real) and CRC / DisputeFox (fail-loud)

**Files:**
- Create: `server/partners/disputechat.js`, `server/partners/credit-repair-cloud.js`, `server/partners/disputefox.js`
- Test: `test/partners.test.mjs` (append)

**Interfaces:**
- `disputechat.js`: `verifyDisputeChat(headers, rawBody, secret, opts) → boolean` (uses `verifySignature` from `server/dispatch.js`, header `x-readyiq-signature`), `fromDisputeChat(body) → partner_update`. Expected dchub body: `{ clientId, disputeRound:{ n, open, resolved }, rentMonths?, blockersCleared?:string[], occurredAt }`.
- `credit-repair-cloud.js` / `disputefox.js`: `export function fromCreditRepairCloud() { throw new PartnerNotAvailable(...) }` etc., plus `export class PartnerNotAvailable extends Error` in `credit-repair-cloud.js` re-exported by `disputefox.js`.

- [ ] **Step 1: Write the failing tests**

Append to `test/partners.test.mjs`:

```js
import { verifyDisputeChat, fromDisputeChat } from '../server/partners/disputechat.js';
import { fromCreditRepairCloud, PartnerNotAvailable } from '../server/partners/credit-repair-cloud.js';
import { fromDisputeFox } from '../server/partners/disputefox.js';
import { signature } from '../server/dispatch.js';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/partners.test.mjs`
Expected: FAIL — cannot find module `disputechat.js`

- [ ] **Step 3: Implement**

```js
// server/partners/disputechat.js — Level 2, ours. DisputeChat (dchub) signs outbound hooks with ReadyIQ's own scheme.
import { verifySignature } from '../dispatch.js';
import { normalizeUpdate } from './normalize.js';

export function verifyDisputeChat(headers = {}, rawBody, secret, opts) {
  const header = headers['x-readyiq-signature'] ?? headers['X-ReadyIQ-Signature'];
  return verifySignature(secret, header, rawBody, opts);
}

export function fromDisputeChat(body = {}) {
  const round = body.disputeRound || {};
  return normalizeUpdate({
    source: 'disputechat',
    consumer_ref: body.clientId ? `c_${body.clientId}` : body.consumer_ref,
    occurred_at: body.occurredAt,
    disputes: { open: round.open, resolved: round.resolved },
    round_completed: round.open === 0 && (round.resolved ?? 0) > 0,
    rent_months_verified: body.rentMonths,
    blockers_cleared: body.blockersCleared || [],
    note: body.note,
  });
}
```

```js
// server/partners/credit-repair-cloud.js — Level 2, registered, not implemented. See partners/registry.js `blockedOn`.
import { getPartner } from './registry.js';

export class PartnerNotAvailable extends Error {
  constructor(id) {
    const def = getPartner(id);
    super(`the ${id} adapter is not implemented yet — blocked on: ${def.blockedOn}`);
    this.name = 'PartnerNotAvailable';
    this.partnerId = id;
    this.blockedOn = def.blockedOn;
    this.workaround = 'zapier';
  }
}

export function fromCreditRepairCloud() { throw new PartnerNotAvailable('credit_repair_cloud'); }
```

```js
// server/partners/disputefox.js — Level 2, registered, not implemented. See partners/registry.js `blockedOn`.
import { PartnerNotAvailable } from './credit-repair-cloud.js';
export { PartnerNotAvailable };
export function fromDisputeFox() { throw new PartnerNotAvailable('disputefox'); }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/partners/disputechat.js server/partners/credit-repair-cloud.js server/partners/disputefox.js test/partners.test.mjs
git commit -m "feat(partners): Level 2 DisputeChat adapter; CRC and DisputeFox registered as fail-loud stubs"
```

---

### Task 12: `receiveInbound` — verify → normalize → apply → broadcast

**Files:**
- Create: `server/inbound.js`
- Test: `test/inbound.test.mjs`

**Interfaces:**
- Produces: `receiveInbound({ source, tenantId, headers, rawBody, state, lender, secrets, connections, log? }) → Promise<{ ok, status:number, error?, applied?: {before,after,events}, delivered?: object[] }>`.
  - `secrets` = `{ zapierToken?, disputechatSecret? }` for the tenant.
  - `connections` = anything with `broadcast(tenantId, event, { identity })` (a `ConnectionManager` or a fake).
  - For each event type returned by `applyPartnerUpdate`, builds a `readiness_status` via `buildStatusObject(consumer, { lender })`, wraps with `buildEvent`, and broadcasts.
  - `csv` source: `rawBody` is CSV text, may yield many updates.

- [ ] **Step 1: Write the failing tests**

```js
// test/inbound.test.mjs
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/inbound.test.mjs`
Expected: FAIL — cannot find module `inbound.js`

- [ ] **Step 3: Implement**

```js
// server/inbound.js — one entry point for every credit-repair-side source: verify → normalize → apply → broadcast.
import { buildStatusObject, buildIdentity } from './status-object.js';
import { buildEvent } from './events.js';
import { PARTNER_PLATFORMS } from './partners/registry.js';
import { applyPartnerUpdate } from './partners/normalize.js';
import { parseCsv } from './partners/csv.js';
import { verifyZapierToken, fromZapier } from './partners/zapier.js';
import { verifyDisputeChat, fromDisputeChat } from './partners/disputechat.js';
import { fromCreditRepairCloud, PartnerNotAvailable } from './partners/credit-repair-cloud.js';
import { fromDisputeFox } from './partners/disputefox.js';

export async function receiveInbound({ source, tenantId, headers = {}, rawBody = '', state, lender, secrets = {}, connections }) {
  const def = PARTNER_PLATFORMS[source];
  if (!def) return { ok: false, status: 404, error: 'unknown_source' };
  if (!tenantId) return { ok: false, status: 400, error: 'tenant_required' };

  let updates;
  try {
    switch (source) {
      case 'csv':
        updates = parseCsv(rawBody); break;
      case 'zapier':
        if (!verifyZapierToken(headers, secrets.zapierToken)) return { ok: false, status: 401, error: 'unauthorized' };
        updates = [fromZapier(JSON.parse(rawBody || '{}'))]; break;
      case 'disputechat':
        if (!verifyDisputeChat(headers, rawBody, secrets.disputechatSecret)) return { ok: false, status: 401, error: 'unauthorized' };
        updates = [fromDisputeChat(JSON.parse(rawBody || '{}'))]; break;
      case 'credit_repair_cloud':
        updates = [fromCreditRepairCloud(JSON.parse(rawBody || '{}'))]; break;
      case 'disputefox':
        updates = [fromDisputeFox(JSON.parse(rawBody || '{}'))]; break;
      default:
        return { ok: false, status: 404, error: 'unknown_source' };
    }
  } catch (err) {
    if (err instanceof PartnerNotAvailable) return { ok: false, status: 501, error: 'not_implemented', blockedOn: err.blockedOn, workaround: err.workaround };
    return { ok: false, status: 400, error: err?.message ?? String(err) };
  }

  const applied = [];
  const delivered = [];
  for (const update of updates) {
    let out;
    try { out = applyPartnerUpdate(state, update, { lender }); }
    catch (err) { applied.push({ consumer_ref: update.consumer_ref, error: err.message }); continue; }
    applied.push({ consumer_ref: update.consumer_ref, before: out.before, after: out.after, events: out.events });
    for (const type of out.events) {
      const status = buildStatusObject(out.consumer, { lender, occurredAt: update.occurred_at });
      const event = buildEvent({ type, tenantId, status, occurredAt: update.occurred_at });
      delivered.push(await connections.broadcast(tenantId, event, { identity: buildIdentity(out.consumer) }));
    }
  }
  return { ok: true, status: 200, applied, delivered };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/inbound.js test/inbound.test.mjs
git commit -m "feat(inbound): verify, normalize, apply, and broadcast for every credit-repair source"
```

---

### Task 13: The HTTP surface — a URL for Zapier and partners

**Files:**
- Create: `server/http.js`
- Create: `scripts/rail.mjs` (runs it locally)
- Test: `test/http.test.mjs`

**Interfaces:**
- Produces: `createRailServer({ state, lender, secretsFor(tenantId), connections, log }) → http.Server` with routes:
  - `POST /v1/inbound/:source?tenant=<id>` → `receiveInbound`; responds with its `status` and JSON body.
  - `POST /v1/referrals?tenant=<id>` body `{ direction, from, to, consumerId, consent }` → builds, logs, broadcasts `referral.sent_to_lo` / `referral.sent_to_cr`; 201 with the referral.
  - `GET /v1/referrals?tenant=<id>` → `log.list`.
  - `POST /v1/referrals/:id/outcome?tenant=<id>` body `{ outcome, at? }` → `log.setOutcome` + `recordReviewOutcome` + broadcast `review.outcome_recorded`; 200.
  - `GET /v1/precision?tenant=<id>` → `log.precision`.
  - Anything else → 404 JSON. Body limit 256 KB → 413. Bad JSON → 400.
- `scripts/rail.mjs`: `node scripts/rail.mjs` listens on `PORT` (default 4630) with fixtures, a `ConnectionManager` wired to a `Dispatcher`, and secrets from env `READYIQ_ZAPIER_TOKEN`, `READYIQ_DISPUTECHAT_SECRET`.

- [ ] **Step 1: Write the failing tests**

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/http.test.mjs`
Expected: FAIL — cannot find module `http.js`

- [ ] **Step 3: Implement**

```js
// server/http.js — the rail's HTTP surface. node:http only; no framework, so it runs anywhere Node runs.
import { createServer } from 'node:http';
import { receiveInbound } from './inbound.js';
import { buildReferral, ReferralNotCompliant } from './referral.js';
import { buildEvent } from './events.js';
import { getConsumer, recordReviewOutcome } from '../src/state.js';

const MAX_BODY = 256 * 1024;

export function createRailServer({ state, lender, secretsFor = () => ({}), connections, log }) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const tenantId = url.searchParams.get('tenant');
    const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };

    let rawBody = '';
    try { rawBody = await readBody(req); } catch { return send(413, { error: 'body_too_large' }); }

    const m = (method, pattern) => req.method === method && url.pathname.match(pattern);
    let match;

    if ((match = m('POST', /^\/v1\/inbound\/([a-z_]+)$/))) {
      const out = await receiveInbound({ source: match[1], tenantId, headers: req.headers, rawBody, state, lender, secrets: secretsFor(tenantId), connections });
      return send(out.status, out);
    }

    if (m('POST', /^\/v1\/referrals$/)) {
      if (!tenantId) return send(400, { error: 'tenant_required' });
      let body; try { body = JSON.parse(rawBody || '{}'); } catch { return send(400, { error: 'bad_json' }); }
      const consumer = getConsumer(state, body.consumerId);
      if (!consumer) return send(404, { error: 'unknown_consumer' });
      let referral;
      try { referral = buildReferral({ direction: body.direction, from: body.from, to: body.to, consumer, lender, consent: body.consent }); }
      catch (err) { return send(err instanceof ReferralNotCompliant ? 422 : 400, { error: err.message }); }
      log.record(referral, { tenantId });
      const type = referral.direction === 'cr_to_lo' ? 'referral.sent_to_lo' : 'referral.sent_to_cr';
      await connections.broadcast(tenantId, buildEvent({ type, tenantId, status: referral.summary, occurredAt: referral.created_at }));
      return send(201, referral);
    }

    if (m('GET', /^\/v1\/referrals$/)) return send(200, log.list({ tenantId }).map((e) => ({ ...e.referral, outcome: e.outcome })));

    if ((match = m('POST', /^\/v1\/referrals\/([\w-]+)\/outcome$/))) {
      let body; try { body = JSON.parse(rawBody || '{}'); } catch { return send(400, { error: 'bad_json' }); }
      let entry; try { entry = log.setOutcome(match[1], body); } catch (err) { return send(/not found/.test(err.message) ? 404 : 422, { error: err.message }); }
      recordReviewOutcome(state, entry.referral.consumer_ref.replace(/^c_/, ''), body);
      await connections.broadcast(tenantId, buildEvent({ type: 'review.outcome_recorded', tenantId, status: entry.referral.summary }));
      return send(200, { ...entry.referral, outcome: entry.outcome });
    }

    if (m('GET', /^\/v1\/precision$/)) return send(200, log.precision(tenantId));

    return send(404, { error: 'not_found' });
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''; let size = 0;
    req.on('data', (chunk) => { size += chunk.length; if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return; } data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
```

```js
// scripts/rail.mjs — run the referral rail locally: node scripts/rail.mjs  (PORT=4630)
import { createRailServer } from '../server/http.js';
import { ReferralLog } from '../server/referral.js';
import { ConnectionManager } from '../server/connections.js';
import { Dispatcher } from '../server/dispatch.js';
import { fixtures } from '../src/state.js';

const state = fixtures();
const connections = new ConnectionManager({ dispatcher: new Dispatcher() });
const secrets = { zapierToken: process.env.READYIQ_ZAPIER_TOKEN, disputechatSecret: process.env.READYIQ_DISPUTECHAT_SECRET };
const server = createRailServer({ state, lender: state.lender, secretsFor: () => secrets, connections, log: new ReferralLog() });
const port = Number(process.env.PORT || 4630);
server.listen(port, () => console.log(`ReadyIQ rail on http://localhost:${port}  (tenant=${state.lender.id})`));
```

Add to `package.json` scripts: `"rail": "node scripts/rail.mjs"`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS. Then smoke: `npm run rail` in one terminal, and in another:
`curl -s "http://localhost:4630/v1/precision?tenant=harbor"` → `{"flagged":0,"qualified":0,"short":0,"rate":null}`

- [ ] **Step 5: Commit**

```bash
git add server/http.js scripts/rail.mjs package.json test/http.test.mjs
git commit -m "feat(http): referral rail HTTP surface — inbound, referrals, outcomes, precision"
```

---

### Task 14: The LO feed becomes three buckets with "Send to credit-repair partner"

**Files:**
- Modify: `src/screens/lo.tsx` (FEED constant ~line 95; `StatusFeedPage` ~line 103-117)
- Create: `src/screens/stage.tsx`
- Test: `test/lo-buckets.test.mjs` (source-level, same pattern as `test/hero-copy.test.mjs`)

**Interfaces:**
- `src/screens/stage.tsx` exports `StagePill({ stage })`, `BUCKETS = [['not_ready','Not ready'],['working','Progressing'],['ready','Ready to review']]`, `bucketOf(stage) → 'not_ready'|'working'|'ready'` (approaching and ready_to_review both bucket to `ready`), `STAGE_TONE = { not_ready:'muted', working:'teal', approaching:'gold', ready_to_review:'lime' }`.
- `FEED` rows gain `stage` and `blocker` (one line) and `partner?: string`.

- [ ] **Step 1: Write the failing test**

```js
// test/lo-buckets.test.mjs — the LO feed is three buckets, one blocker per row, scores out of the row.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lo = readFileSync(new URL('../src/screens/lo.tsx', import.meta.url), 'utf8');
const stage = readFileSync(new URL('../src/screens/stage.tsx', import.meta.url), 'utf8');

test('three buckets, four stages, one action per row', () => {
  for (const label of ['Not ready', 'Progressing', 'Ready to review']) assert.ok(stage.includes(`'${label}'`), label);
  assert.ok(stage.includes("approaching") && stage.includes("ready_to_review"));
  assert.ok(lo.includes('bucketOf('), 'feed groups rows with bucketOf');
  assert.ok(lo.includes('Send to credit-repair partner'), 'the LO can send a borrower out');
  assert.ok(lo.includes('Request soft pull'), 'approaching rows carry the soft-pull action');
  assert.ok(!lo.includes('<th>All 3 bureau scores</th>'), 'scores leave the row');
  assert.ok(lo.includes('Ready-to-review precision'), 'precision stat is on the feed');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/lo-buckets.test.mjs`
Expected: FAIL — `stage.tsx` missing / labels missing

- [ ] **Step 3: Implement**

```tsx
// src/screens/stage.tsx — the four-stage vocabulary, once, for every LO/CR surface.
export type Stage = 'not_ready' | 'working' | 'approaching' | 'ready_to_review';
export const STAGE_LABEL: Record<Stage, string> = { not_ready: 'Not ready', working: 'Working', approaching: 'Approaching ready', ready_to_review: 'Ready to review' };
export const STAGE_TONE: Record<Stage, string> = { not_ready: 'muted', working: 'teal', approaching: 'gold', ready_to_review: 'lime' };
export const BUCKETS: [string, string][] = [['not_ready', 'Not ready'], ['working', 'Progressing'], ['ready', 'Ready to review']];
export function bucketOf(s: Stage): 'not_ready' | 'working' | 'ready' { return s === 'not_ready' ? 'not_ready' : s === 'working' ? 'working' : 'ready'; }
export function StagePill({ stage }: { stage: Stage }) { return <span className={`status-cell ${STAGE_TONE[stage]}`}>● {STAGE_LABEL[stage]}</span>; }
```

In `src/screens/lo.tsx`:

1. Add the import: `import { StagePill, BUCKETS, bucketOf, type Stage } from "./stage";`
2. Replace the `FEED` constant with:

```tsx
const FEED: { name: string; initials: string; tone: string; stage: Stage; blocker: string; partner?: string; last: string; scores: BureauScoreSet }[] = [
  { name: "Aaron Patel", initials: "AP", tone: "gold", stage: "ready_to_review", blocker: "Summary from Brightpath · Aug 30", partner: "Brightpath", last: "2 days ago", scores: { equifax: 688, experian: 696, transunion: 691 } },
  { name: "Derek Young", initials: "DY", tone: "lime", stage: "approaching", blocker: "Crossed floor · inside buffer", last: "1 hr ago", scores: { equifax: 654, experian: 662, transunion: 658 } },
  { name: "Maya Collins", initials: "MC", tone: "mint", stage: "working", blocker: "Utilization 41% → target 30%", partner: "Brightpath", last: "12 min ago", scores: { equifax: 608, experian: 615, transunion: 612 } },
  { name: "Sofia Ramirez", initials: "SR", tone: "violet", stage: "working", blocker: "2 disputes sent · responses due Sep 8", last: "Yesterday", scores: { equifax: 579, experian: 587, transunion: 584 } },
  { name: "Nina Brooks", initials: "NB", tone: "blue", stage: "not_ready", blocker: "Thin file · reporting 19 mo of rent", last: "3 days ago", scores: { equifax: 599, experian: 606, transunion: 603 } },
];
```

3. Replace `StatusFeedPage` with:

```tsx
export function StatusFeedPage({ openInvite, onSelect }: { openInvite: () => void; onSelect: () => void }) {
  const [sending, setSending] = useState<string | null>(null);
  const [partners, setPartners] = useState<string[]>([]);
  const action = (r: typeof FEED[number]) => r.stage === "ready_to_review" ? "Request formal pull →" : r.stage === "approaching" ? "Request soft pull →" : r.stage === "working" ? "View →" : "Nudge →";
  const Row = ({ r }: { r: typeof FEED[number] }) => <div className="lx-row" onClick={onSelect}><span className={`person-avatar ${r.tone}`}>{r.initials}</span><div><strong>{r.name}</strong><small>{r.blocker}{r.partner ? ` · CR partner: ${r.partner}` : ""}</small></div><StagePill stage={r.stage} /><small>{r.last}</small><button className="cx-inline" onClick={(e) => { e.stopPropagation(); alert(`${action(r).replace(" →", "")} for ${r.name}`); }}>{action(r)}</button>{r.stage !== "ready_to_review" && !r.partner && <button className="outline-button" onClick={(e) => { e.stopPropagation(); setSending(r.name); setPartners([]); }}>Send to credit-repair partner</button>}</div>;
  return <div className="lender-page">
    <div className="lender-page-title"><div><span className="section-kicker">READINESS PIPELINE · READ-ONLY</span><h1>Where your people <em>are.</em></h1><p>Who’s not ready, who’s progressing, who’s ready to review. One blocker per person. Scores live on the detail page, with permission — never here.</p></div><button className="primary-lime dark-text" onClick={openInvite}>＋ Invite consumer</button></div>
    <div className="filter-bar"><span className="info-badge">Ready-to-review precision <b>71%</b> · 5 of 7 qualified on formal pull</span></div>
    <div className="lx-buckets">{BUCKETS.map(([key, label]) => { const rows = FEED.filter((r) => bucketOf(r.stage) === key); return <section key={key} className="borrower-table-card pipeline-table"><div className="card-title-row"><div><span className="section-kicker">{label.toUpperCase()}</span><h3>{rows.length}</h3></div></div>{rows.map((r) => <Row key={r.name} r={r} />)}</section>; })}</div>
    {sending && <div className="invite-modal-overlay" onMouseDown={(e) => e.currentTarget === e.target && setSending(null)}><section className="invite-modal"><header><div><span className="section-kicker">SEND TO CREDIT-REPAIR PARTNER</span><h2>{sending}</h2><p>Pick one or more partners. {sending.split(" ")[0]} will be asked to consent before anything is shared. No score, no report — a stage and the blockers.</p></div><button onClick={() => setSending(null)}>×</button></header><div className="invite-form">{["Brightpath Credit", "DisputeChat", "Clearpath Repair"].map((p) => <label key={p} className="full-field"><input type="checkbox" checked={partners.includes(p)} onChange={() => setPartners(partners.includes(p) ? partners.filter((x) => x !== p) : [...partners, p])} /> {p}</label>)}<small>Nothing of value changes hands for this referral. Flat pricing — never per referral.</small></div><footer><button className="outline-button" onClick={() => setSending(null)}>Cancel</button><button className="primary-lime dark-text" disabled={partners.length === 0} onClick={() => { alert(`Referral to ${partners.join(", ")} drafted — ${sending.split(" ")[0]} will be asked to consent.`); setSending(null); }}>Send with consent <span>→</span></button></footer></section></div>}
    <div className="sharing-card" style={{ marginTop: 16 }}><span>⌁</span><div><strong>Consumers control what you see.</strong><p>The pipeline shows a stage and one blocker. Account details, scores and the full report stay private.</p></div></div>
  </div>;
}
```

4. Delete the now-unused `ScoreNotice` function and the `BureauScores` import if nothing else in the file uses it (`YourLinkPage` does not; keep the `BureauScoreSet` type import).

5. Append to `src/styles/additions.css`:

```css
.lx-buckets{display:grid;gap:14px}
.lx-row{display:grid;grid-template-columns:36px minmax(0,1fr) auto auto auto auto;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--line);cursor:pointer}
.lx-row small{color:var(--muted)}
.status-cell.muted{background:#eef1ef;color:#5f6d68}.status-cell.teal{background:#dff4e8;color:#1f5c4a}
@media(max-width:760px){.lx-row{grid-template-columns:36px minmax(0,1fr);row-gap:6px}}
```

- [ ] **Step 4: Run tests and verify in the browser**

Run: `npm test` → PASS.
Run: `node build.mjs` then `node serve.mjs`; open `http://localhost:4620/demo/?mode=lender&lpage=borrowers`. Expect three sections — Not ready (1), Progressing (2), Ready to review (2) — Derek's row reads "Approaching ready" with "Request soft pull →", Maya's row shows "CR partner: Brightpath", Nina's row has a "Send to credit-repair partner" button that opens the multi-select modal with the flat-pricing line. No bureau-score columns anywhere on the page. Check at 375 px wide via the iframe trick from the Aug notes.

- [ ] **Step 5: Commit**

```bash
git add src/screens/stage.tsx src/screens/lo.tsx src/styles/additions.css test/lo-buckets.test.mjs
git commit -m "feat(lo): three-bucket readiness feed with stage pills and send-to-credit-repair"
```

---

### Task 15: Final gate

- [ ] **Step 1: Full test run**

Run: `npm test`
Expected: every file passes, including the pre-existing `readinessTrigger` test (it still describes the old threshold; it is superseded but not removed — remove it and `readinessTrigger` itself only after the site copy no longer references "readiness threshold").

- [ ] **Step 2: Build and route check**

Run: `node build.mjs`. Expected: `site/` rebuilt with one `index.html` per route, no errors. Do **not** stage `site/`.

- [ ] **Step 3: Rebase and open the PR**

```bash
git fetch origin && git rebase origin/main
git push -u origin HEAD
gh pr create --title "Referral rail: four stages + buffer, two-way referrals, L0–L2 partner ladder" --body "$(cat <<'EOF'
Implements docs/plans/2026-09-02-readyiq2-referral-rail.md.

- Four readiness stages with a +20 buffer above the lender floor (state.js); readiness_stage on the status object and CRM maps
- Referral object + readiness summary + consent + append-only log + precision number, with the RESPA guard enforced in code
- Partner ladder: L0 CSV/manual (+ runbook), L1 Zapier (shared token), L2 DisputeChat (real, our signature) / CRC + DisputeFox (registered, fail-loud)
- node:http rail: /v1/inbound/:source, /v1/referrals, /outcome, /precision — `npm run rail`
- LO feed: three buckets, one blocker per row, send-to-credit-repair with multi-select

Not in this PR: site copy (see docs/specs/2026-09-02-readyiq2-gtm-redesign.html), the credit-repair admin portal, dchub's outbound hook.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

**Spec coverage.** Two-way loop → Tasks 4, 5, 13 (both directions, multi-recipient, consent, log). Stages + buffer + "never ready on a consumer score" → Tasks 1, 3. Recommended re-pull at approaching → Task 8 (`readiness.approaching`) + Task 6 (event) + Task 14 (action label). L0 → Task 9. L1 → Task 10, 12, 13. L2 → Task 11 (DisputeChat real; CRC/DisputeFox registered honestly). Precision metric → Tasks 2, 5, 13, 14. RESPA/CROA posture in code → Task 4 `VALUE_KEYS`, multi-`to`, consent required; L0 runbook says it in words. Not building a CR CRM → nothing in this plan stores case data; only `partner_update`. **Gap, deliberate:** the credit-repair admin portal UI and the site copy are separate plans (brief already written); dchub's outbound hook is a dchub-repo plan.

**Placeholder scan.** No TBD/TODO. Every code step is complete. The CRC/DisputeFox adapters are intentionally fail-loud rather than guessed — that is a design decision recorded in `registry.js`, not a placeholder.

**Type consistency.** `stage()`/`stageReason()` (T1) used in T3, T4, T8. `REVIEW_OUTCOMES`/`recordReviewOutcome` (T2) used in T5, T13. `normalizeUpdate`/`applyPartnerUpdate` (T8) used in T9–T12. `receiveInbound` signature (T12) matches T13's call. `ReferralLog.list/setOutcome/precision` (T5) match T13. `PartnerNotAvailable.workaround === 'zapier'` (T11) matches T12's 501 branch. `Stage` type in T14 mirrors `STAGES` in T1.
