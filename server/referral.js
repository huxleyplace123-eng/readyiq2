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
