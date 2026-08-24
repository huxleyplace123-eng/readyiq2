// connectors/encompass.js — Encompass / ICE Mortgage Technology.
//
// Unlike every other connector here, this one is worth building for what it
// SENDS US, not what we send it. Encompass supports signed webhook
// subscriptions on loan events, and "a new loan is created" is the exact
// trigger Protect Mode has always needed:
//
//     "Protect Mode turns on the day your loan starts."
//
// Today the consumer portal fakes that with a "Simulate a loan in process
// (demo)" button. The Encompass loan-created webhook is the real thing.
//
// Access is gated: an ICE Partner Portal agreement, then the lender's own
// Encompass administrator enabling the API user on their instance. Keys are
// issued per partner/lender pair, so `instanceId` is a required credential and
// every customer is a separate onboarding.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { getConnector } from './registry.js';

const DEF = getConnector('encompass');
const TOKEN_URL = DEF.hosts.production + DEF.hosts.tokenPath;   // /oauth2/v1/token
const API_BASE = DEF.hosts.production + DEF.hosts.apiBase;      // /encompass/v3

/** Loan events worth subscribing to, and what each one means for ReadyIQ. */
export const SUBSCRIBED_EVENTS = Object.freeze({
  'loan.created': 'protect_mode.activate',
  'loan.funded': 'protect_mode.deactivate',
  'loan.enhancedFieldChange': 'protect_mode.evaluate',
});

export class EncompassError extends Error {
  constructor(status, body) {
    super(`Encompass API ${status}: ${typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)}`);
    this.name = 'EncompassError';
    this.status = status;
    this.body = body;
    this.retryable = status === 429 || status >= 500;
  }
}

export class EncompassConnector {
  #creds; #fetch; #token = null; #now;

  /** @param {{clientId:string, clientSecret:string, instanceId:string}} credentials */
  constructor({ credentials, fetch: fetchImpl = globalThis.fetch, now = () => Date.now() } = {}) {
    for (const key of ['clientId', 'clientSecret', 'instanceId']) {
      if (!credentials?.[key]) throw new TypeError(`Encompass ${key} required`);
    }
    this.#creds = credentials;
    this.#fetch = fetchImpl;
    this.#now = now;
  }

  /**
   * Client-credentials grant. ICE issues partner keys scoped to one lender
   * instance, so there is no tenant selection here — the credentials ARE the
   * tenant selection.
   */
  async accessToken() {
    if (this.#token && this.#token.expiresAt > this.#now() + 60_000) return this.#token.value;

    const res = await this.#fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${this.#creds.clientId}:${this.#creds.clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'pc pcapi' }).toString(),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new EncompassError(res.status, body);

    this.#token = { value: body.access_token, expiresAt: this.#now() + (body.expires_in ?? 3600) * 1000 };
    return this.#token.value;
  }

  async #call(method, path, body) {
    const token = await this.accessToken();
    const res = await this.#fetch(API_BASE + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const parsed = await res.json().catch(() => null);
    if (!res.ok) throw new EncompassError(res.status, parsed);
    return parsed;
  }

  /** Discover what this instance actually exposes before subscribing to it. */
  getResources() { return this.#call('GET', '/webhook/resources'); }

  listSubscriptions() { return this.#call('GET', '/webhook/subscriptions'); }

  /**
   * @param {object} args
   * @param {string} args.endpoint  our HTTPS receiver
   * @param {string} args.resource  e.g. "Loan"
   * @param {string[]} args.events
   */
  createSubscription({ endpoint, resource, events }) {
    return this.#call('POST', '/webhook/subscriptions', { endpoint, resource, events });
  }

  deleteSubscription(id) { return this.#call('DELETE', `/webhook/subscriptions/${id}`); }

  /** Pipeline query — used to reconcile if we ever miss a webhook. */
  searchPipeline(filter) { return this.#call('POST', '/loanPipeline', filter); }
}

/**
 * Verify a notification actually came from Encompass.
 *
 * ICE signs notifications so the receiver can confirm sender identity and
 * message integrity. The exact header name and canonical string are published
 * in the partner portal, not on the public docs, so both are injected here
 * rather than guessed — supply them from the onboarding packet.
 */
export function verifyNotification({ body, signature, secret, algorithm = 'sha256' }) {
  if (!signature || !secret) return false;
  const expected = createHmac(algorithm, secret).update(body).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature).replace(/^sha256=/i, ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Translate an inbound Encompass notification into a ReadyIQ intent.
 *
 * Returns null for anything we did not subscribe to, so an unexpected event
 * is ignored rather than acted on.
 */
export function interpretNotification(notification) {
  const eventType = notification?.eventType ?? notification?.event ?? null;
  const key = eventType && (SUBSCRIBED_EVENTS[eventType] ? eventType : `loan.${eventType}`);
  const intent = key ? SUBSCRIBED_EVENTS[key] : null;
  if (!intent) return null;

  return {
    intent,
    loanId: notification?.resourceId ?? notification?.loanId ?? null,
    instanceId: notification?.instanceId ?? null,
    occurredAt: notification?.eventTime ?? notification?.timestamp ?? new Date().toISOString(),
  };
}
