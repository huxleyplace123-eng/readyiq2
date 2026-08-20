// connections.js — one tenant's connections, and the state they are in.
//
// This is the object the "Connections" screen in the lender portal renders, and
// the reason that screen must exist: because credentials are issued per
// partner/lender pair on five of six platforms, connecting Encompass is not
// something ReadyIQ does once. It is something each lender does, with their own
// admin, on their own instance — and somebody has to be able to see whether it
// worked.
//
// State machine:
//   not_configured → pending → connected → degraded → connected
//                        ↓         ↓          ↓
//                      error ← ── ─┴──────────┘
//
// `pending` matters more here than in most integrations: with Encompass and
// Total Expert, credentials exist but are not yet usable until the far side
// finishes their half (an Encompass admin enabling the API user; TE promoting
// an integration out of the CT environment).

import { CredentialVault } from './vault.js';
import { CONNECTORS, getConnector, missingFields, rolloutOrder } from './connectors/registry.js';
import { ShapeConnector } from './connectors/shape.js';
import { TotalExpertConnector, TokenStore } from './connectors/total-expert.js';
import { EncompassConnector } from './connectors/encompass.js';
import { SalesforceConnector } from './connectors/salesforce.js';
import { GenericWebhookConnector } from './connectors/generic-webhook.js';
import { unavailableConnector } from './connectors/unavailable.js';

export const STATES = Object.freeze(['not_configured', 'pending', 'connected', 'degraded', 'error']);

export class ConnectionManager {
  #vault; #dispatcher; #state = new Map(); #tokenStore; #fetch; #environment;

  constructor({ vault, dispatcher, fetch: fetchImpl = globalThis.fetch, environment = 'sandbox' } = {}) {
    this.#vault = vault || new CredentialVault();
    this.#dispatcher = dispatcher;
    this.#fetch = fetchImpl;
    this.#environment = environment;
    this.#tokenStore = new TokenStore();   // shared: TE rate-limits by source IP
  }

  static #key(tenantId, connectorId) { return `${tenantId}::${connectorId}`; }

  #setState(tenantId, connectorId, state, detail = null) {
    if (!STATES.includes(state)) throw new RangeError(`unknown connection state "${state}"`);
    this.#state.set(ConnectionManager.#key(tenantId, connectorId), {
      state, detail, changedAt: new Date().toISOString(),
    });
    return state;
  }

  /**
   * Store credentials. Does not prove they work — `verify` does that.
   * A connector whose far side still owes us something lands in `pending`.
   */
  connect(tenantId, connectorId, credentials, meta = {}) {
    const def = getConnector(connectorId);
    const missing = missingFields(connectorId, credentials);
    if (missing.length) {
      this.#setState(tenantId, connectorId, 'error', { missing });
      return { ok: false, state: 'error', missing };
    }

    this.#vault.put(tenantId, connectorId, credentials, meta);
    const state = def.accessModel === 'partner_agreement' ? 'pending' : 'connected';
    this.#setState(tenantId, connectorId, state, def.blockedOn ? { blockedOn: def.blockedOn } : null);
    return { ok: true, state, describe: this.#vault.describe(tenantId, connectorId) };
  }

  disconnect(tenantId, connectorId) {
    this.#vault.revoke(tenantId, connectorId);
    this.#setState(tenantId, connectorId, 'not_configured');
    return { ok: true, state: 'not_configured' };
  }

  /** Instantiate the live adapter for a tenant. Throws if not configured. */
  client(tenantId, connectorId) {
    const credentials = this.#vault.openCredentials(tenantId, connectorId);
    switch (connectorId) {
      case 'shape':
        return new ShapeConnector({ apiKey: credentials.apiKey, fetch: this.#fetch });
      case 'total_expert':
        return new TotalExpertConnector({ credentials, environment: this.#environment, fetch: this.#fetch, tokenStore: this.#tokenStore });
      case 'encompass':
        return new EncompassConnector({ credentials, fetch: this.#fetch });
      case 'salesforce':
        return new SalesforceConnector({ credentials, fetch: this.#fetch });
      case 'generic_webhook':
        return new GenericWebhookConnector({ ...credentials, dispatcher: this.#dispatcher });
      default:
        return unavailableConnector(connectorId);
    }
  }

  /** Round-trip the credentials and record what happened. */
  async verify(tenantId, connectorId) {
    if (!this.#vault.has(tenantId, connectorId)) {
      return { ok: false, state: this.#setState(tenantId, connectorId, 'not_configured') };
    }
    try {
      const client = this.client(tenantId, connectorId);
      const result = typeof client.verify === 'function'
        ? await client.verify()
        : { ok: true, note: 'no verify implemented; credentials stored' };
      const state = result.ok ? 'connected' : 'pending';
      this.#setState(tenantId, connectorId, state, result);
      return { ok: result.ok, state, result };
    } catch (err) {
      const state = err?.status === 401 || err?.status === 403 ? 'error' : 'degraded';
      this.#setState(tenantId, connectorId, state, { message: err?.message, status: err?.status });
      return { ok: false, state, error: err?.message };
    }
  }

  status(tenantId, connectorId) {
    const stored = this.#state.get(ConnectionManager.#key(tenantId, connectorId));
    const def = CONNECTORS[connectorId];
    return {
      connectorId,
      displayName: def?.displayName ?? connectorId,
      accessModel: def?.accessModel ?? null,
      credentialScope: def?.credentialScope ?? null,
      blockedOn: def?.blockedOn ?? null,
      state: stored?.state ?? 'not_configured',
      detail: stored?.detail ?? null,
      changedAt: stored?.changedAt ?? null,
      credential: this.#vault.describe(tenantId, connectorId),
    };
  }

  /** Everything the Connections screen needs, in the order worth doing them. */
  overview(tenantId) {
    return rolloutOrder().map((id) => this.status(tenantId, id));
  }

  /**
   * Fan one event out to every connected connector for a tenant.
   * Failures are collected, never thrown — one broken CRM must not stop the rest.
   */
  async broadcast(tenantId, event, { identity } = {}) {
    const targets = this.overview(tenantId).filter((c) => c.state === 'connected' || c.state === 'degraded');
    const results = await Promise.all(targets.map(async (target) => {
      try {
        const client = this.client(tenantId, target.connectorId);
        if (typeof client.deliver === 'function') {
          return { connectorId: target.connectorId, ...(await client.deliver(event, { tenantId })) };
        }
        if (typeof client.syncStatus === 'function') {
          const out = await client.syncStatus({ status: event.data, identity });
          return { connectorId: target.connectorId, delivered: true, ...out };
        }
        return { connectorId: target.connectorId, delivered: false, error: 'no_delivery_method' };
      } catch (err) {
        return { connectorId: target.connectorId, delivered: false, error: err?.message ?? String(err) };
      }
    }));
    return { eventId: event.id, type: event.type, results };
  }
}
