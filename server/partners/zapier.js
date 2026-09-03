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
