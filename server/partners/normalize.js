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
