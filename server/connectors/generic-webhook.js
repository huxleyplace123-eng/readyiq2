// connectors/generic-webhook.js — Level 2, and the one that should ship first.
//
// A signed HTTPS POST to a URL the tenant supplies. It needs no partner
// agreement, no sandbox, no certification, and no one's permission — and it
// reaches Zapier, Make, n8n, and every platform on the roadmap, because all of
// them can receive an inbound hook. Native connectors buy polish; this buys
// capability. Build it first and it stays useful forever.

import { randomBytes } from 'node:crypto';
import { isSafeDeliveryUrl } from '../safe-url.js';
import { OUTBOUND_EVENTS } from '../events.js';

export class GenericWebhookConnector {
  #url; #secret; #events; #dispatcher; #allowLocalhost;

  /**
   * @param {object} args
   * @param {string} args.url
   * @param {string} args.secret
   * @param {string[]} [args.events]  subscription allowlist; defaults to all
   * @param {import('../dispatch.js').Dispatcher} args.dispatcher
   */
  constructor({ url, secret, events, dispatcher, allowLocalhost = false } = {}) {
    if (!isSafeDeliveryUrl(url, { allowLocalhost })) throw new TypeError(`unsafe or invalid endpoint URL: ${url}`);
    if (!secret) throw new TypeError('signing secret required');
    if (!dispatcher) throw new TypeError('dispatcher required');

    const unknown = (events ?? []).filter((e) => !OUTBOUND_EVENTS[e]);
    if (unknown.length) throw new RangeError(`unknown events: ${unknown.join(', ')}`);

    this.#url = url;
    this.#secret = secret;
    this.#events = events ?? Object.keys(OUTBOUND_EVENTS);
    this.#dispatcher = dispatcher;
    this.#allowLocalhost = allowLocalhost;
  }

  get subscribedEvents() { return [...this.#events]; }

  isSubscribed(type) { return this.#events.includes(type); }

  /** Deliver, unless the tenant unsubscribed from this event type. */
  async deliver(event, { tenantId }) {
    if (!this.isSubscribed(event.type)) return { delivered: false, attempts: 0, error: 'event_not_subscribed' };
    return this.#dispatcher.send(event, {
      url: this.#url,
      secret: this.#secret,
      tenantId,
      connectorId: 'generic_webhook',
      allowLocalhost: this.#allowLocalhost,
    });
  }

  /**
   * A "send test event" button is the difference between a tenant who finishes
   * setup and one who files a ticket. Bypasses the subscription allowlist.
   */
  async sendTest({ tenantId }) {
    return this.#dispatcher.send({
      id: `evt_test_${randomBytes(8).toString('hex')}`,
      object: 'event',
      version: 1,
      type: 'test',
      tenant_id: tenantId,
      consumer_ref: null,
      occurred_at: new Date().toISOString(),
      data: { object: 'readiness_status', version: 1, test: true },
    }, { url: this.#url, secret: this.#secret, tenantId, connectorId: 'generic_webhook', allowLocalhost: this.#allowLocalhost });
  }
}

/** Generate a signing secret to show the tenant exactly once. */
export function generateSigningSecret() {
  return 'whsec_' + randomBytes(24).toString('base64url');
}
