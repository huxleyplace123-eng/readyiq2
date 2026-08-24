// dispatch.js — signed, retried, idempotent outbound delivery.
//
// The /integrations/ page promises events are "delivered signed, retried,
// idempotent". The dchub api-server today does one of those three: it signs,
// then fires a single fetch and drops the result on the floor. This is the
// version that keeps the promise.
//
//   signed      HMAC-SHA256 over "<timestamp>.<body>", Stripe-style, so a
//               captured payload can't be replayed at a later timestamp.
//   retried     exponential backoff with full jitter, honouring Retry-After,
//               retrying 429/5xx/network and never retrying 4xx.
//   idempotent  every attempt carries the same X-ReadyIQ-Event-Id, so a
//               receiver that already processed it can no-op.
//
// Anything that exhausts its attempts lands in the dead-letter queue with the
// full attempt history, which is what makes an "audit log" screen possible.

import { createHmac } from 'node:crypto';
import { isSafeDeliveryUrl } from './safe-url.js';
import { safeEqual } from './vault.js';

export const DEFAULTS = Object.freeze({
  maxAttempts: 6,
  baseDelayMs: 1_000,
  maxDelayMs: 60_000,
  timeoutMs: 10_000,
  signatureToleranceSec: 300,
});

export class Dispatcher {
  #fetch; #sleep; #now; #random; #opts; #dlq = []; #log = [];

  constructor({
    fetch: fetchImpl = globalThis.fetch,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    now = () => Date.now(),
    random = Math.random,
    ...opts
  } = {}) {
    this.#fetch = fetchImpl;
    this.#sleep = sleep;
    this.#now = now;
    this.#random = random;
    this.#opts = { ...DEFAULTS, ...opts };
  }

  get deadLetters() { return [...this.#dlq]; }
  get attempts() { return [...this.#log]; }

  /**
   * Deliver one event to one target, retrying until it sticks or runs out.
   *
   * @param {object} event   an envelope from events.js
   * @param {object} target  { url, secret, tenantId, connectorId, allowLocalhost }
   * @returns {Promise<{delivered:boolean, status?:number, attempts:number, error?:string}>}
   */
  async send(event, target) {
    const { url, secret, tenantId, connectorId, allowLocalhost = false } = target || {};
    if (!isSafeDeliveryUrl(url, { allowLocalhost })) {
      return this.#fail(event, target, [], 'blocked_url');
    }

    const body = JSON.stringify(event);
    const history = [];

    for (let attempt = 1; attempt <= this.#opts.maxAttempts; attempt++) {
      const timestamp = Math.floor(this.#now() / 1000);
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'ReadyIQ-Webhooks/1',
        'X-ReadyIQ-Event': event.type,
        'X-ReadyIQ-Event-Id': event.id,
        'X-ReadyIQ-Attempt': String(attempt),
        'X-ReadyIQ-Signature': signature(secret, timestamp, body),
      };

      let outcome;
      try {
        const res = await this.#fetch(url, {
          method: 'POST',
          headers,
          body,
          redirect: 'manual',            // a 302 into internal infra is an SSRF
          signal: AbortSignal.timeout(this.#opts.timeoutMs),
        });
        outcome = { attempt, status: res.status, ok: res.ok, retryAfter: retryAfterMs(res) };
      } catch (err) {
        outcome = { attempt, error: err?.name === 'TimeoutError' ? 'timeout' : String(err?.message || err) };
      }

      history.push(outcome);
      this.#log.push({ eventId: event.id, tenantId, connectorId, ...outcome });

      if (outcome.ok) return { delivered: true, status: outcome.status, attempts: attempt };
      if (outcome.status !== undefined && !isRetryable(outcome.status)) {
        return this.#fail(event, target, history, `http_${outcome.status}`);
      }
      if (attempt < this.#opts.maxAttempts) await this.#sleep(this.#backoff(attempt, outcome.retryAfter));
    }

    return this.#fail(event, target, history, 'attempts_exhausted');
  }

  /** Full jitter: random in [0, min(max, base * 2^(n-1))]. Retry-After wins if larger. */
  #backoff(attempt, retryAfterMs) {
    const ceiling = Math.min(this.#opts.maxDelayMs, this.#opts.baseDelayMs * 2 ** (attempt - 1));
    const jittered = Math.floor(this.#random() * ceiling);
    return Math.max(jittered, retryAfterMs ?? 0);
  }

  #fail(event, target, history, error) {
    this.#dlq.push({
      eventId: event.id,
      type: event.type,
      tenantId: target?.tenantId ?? null,
      connectorId: target?.connectorId ?? null,
      url: target?.url ?? null,
      error,
      history,
      failedAt: new Date(this.#now()).toISOString(),
    });
    return { delivered: false, attempts: history.length, error };
  }

  /** Operator action: re-drive one dead letter with the original event. */
  async replay(eventId, event, target) {
    const index = this.#dlq.findIndex((d) => d.eventId === eventId);
    if (index === -1) return { delivered: false, error: 'not_in_dead_letters', attempts: 0 };
    const result = await this.send(event, target);
    if (result.delivered) this.#dlq.splice(index, 1);
    return result;
  }
}

/** `t=<unix>,v1=<hex>` over `<t>.<body>`. */
export function signature(secret, timestamp, body) {
  const mac = createHmac('sha256', String(secret ?? '')).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${mac}`;
}

/**
 * Verify an inbound ReadyIQ signature. Exported so the docs can point receivers
 * at a reference implementation instead of prose.
 */
export function verifySignature(secret, header, body, { toleranceSec = DEFAULTS.signatureToleranceSec, now = Date.now } = {}) {
  const parts = Object.fromEntries(String(header || '').split(',').map((p) => p.split('=').map((s) => s.trim())));
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || !parts.v1) return false;
  if (Math.abs(Math.floor(now() / 1000) - timestamp) > toleranceSec) return false;
  const expected = createHmac('sha256', String(secret ?? '')).update(`${timestamp}.${body}`).digest('hex');
  return safeEqual(expected, parts.v1);
}

function isRetryable(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function retryAfterMs(res) {
  const raw = res?.headers?.get?.('retry-after');
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(raw);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : undefined;
}
