// events.js — the ReadyIQ event catalog and delivery envelope.
//
// Outbound events are what a lender's system subscribes to. Every one of them
// carries a readiness_status and nothing more. Inbound events are the ones we
// consume from an LOS/POS — notably Encompass `loan created`, which is the real
// trigger for Protect Mode ("turns on the day your loan starts").

import { randomUUID, createHash } from 'node:crypto';
import { assertNoReportData } from './status-object.js';

/** Events ReadyIQ emits. Keep in sync with the /integrations/ page. */
export const OUTBOUND_EVENTS = Object.freeze({
  'consumer.enrolled': 'Consumer accepted the invitation and completed the three consents.',
  'consumer.checked': 'The soft three-bureau check completed and a pathway was assigned.',
  'pathway.changed': 'The consumer moved to a different pathway.',
  'progress.milestone_reached': 'A plan milestone was completed.',
  'round.completed': 'A dispute or build round closed.',
  'readiness.trigger': 'The consumer crossed the lender-configured readiness threshold.',
  'review.requested': 'The consumer asked to talk to their loan officer.',
  'protect_mode.activated': 'Protect Mode turned on for a consumer with a loan in process.',
  'protect_mode.alert': 'Protect Mode saw something that could jeopardise a file in process.',
  'consumer.inactive': 'No consumer activity for the lender-configured window.',
});

/** Events ReadyIQ consumes from an LOS/POS. */
export const INBOUND_EVENTS = Object.freeze({
  'loan.application_created': 'A loan application was created — turn Protect Mode on.',
  'loan.application_paused': 'An application stalled — the consumer is a ReadyIQ candidate.',
  'loan.funded': 'The loan funded — turn Protect Mode off and close the journey.',
});

export const EVENT_ENVELOPE_VERSION = 1;

export class UnknownEvent extends Error {
  constructor(type) {
    super(`unknown outbound event "${type}"`);
    this.name = 'UnknownEvent';
    this.type = type;
  }
}

/**
 * Wrap a status object in a delivery envelope.
 *
 * `id` is the idempotency key. A receiver that has already processed this id
 * must treat a redelivery as a no-op — which is what makes retrying safe.
 *
 * @param {object} args
 * @param {string} args.type          key of OUTBOUND_EVENTS
 * @param {string} args.tenantId      the ReadyIQ organization
 * @param {object} args.status        a readiness_status
 * @param {string} [args.id]          supply to make construction deterministic
 * @param {string} [args.occurredAt]  ISO-8601
 */
export function buildEvent({ type, tenantId, status, id, occurredAt }) {
  if (!OUTBOUND_EVENTS[type]) throw new UnknownEvent(type);
  if (!tenantId) throw new TypeError('tenantId required');
  assertNoReportData(status, 'event.data');

  return {
    id: id || `evt_${randomUUID()}`,
    object: 'event',
    version: EVENT_ENVELOPE_VERSION,
    type,
    tenant_id: tenantId,
    consumer_ref: status?.consumer_ref ?? null,
    occurred_at: occurredAt || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    data: status,
  };
}

/**
 * A stable idempotency key for (tenant, consumer, event, logical moment).
 *
 * Used when the same state change can be recomputed — a replay must produce the
 * same key so a receiver dedupes it rather than double-processing.
 */
export function idempotencyKey({ tenantId, consumerRef, type, occurredAt }) {
  return 'idem_' + createHash('sha256')
    .update([tenantId, consumerRef, type, occurredAt].join('|'))
    .digest('hex')
    .slice(0, 32);
}
