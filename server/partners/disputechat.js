// Level 2, ours. DisputeChat (dchub) signs outbound hooks with ReadyIQ's own scheme.
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
