// connectors/unavailable.js — Blend and LenderHomePage.
//
// Neither vendor publishes an API reference, so neither adapter can be written
// yet. This file exists to make that state explicit and to fail loudly rather
// than to ship a plausible-looking client built on guessed endpoints — a
// connector that compiles against an imaginary API is worse than no connector,
// because it looks finished on a roadmap.
//
// Both platforms are still reachable today through the generic signed webhook,
// which is what the tenant should be pointed at in the meantime.

import { getConnector } from './registry.js';

export class ConnectorNotAvailable extends Error {
  constructor(id, blockedOn) {
    super(`the ${id} connector is not implemented yet — blocked on: ${blockedOn}`);
    this.name = 'ConnectorNotAvailable';
    this.connectorId = id;
    this.blockedOn = blockedOn;
    this.workaround = 'point this tenant at the generic signed webhook until a partner API is documented';
  }
}

/** Placeholder honouring the connector interface: verify() explains, everything else throws. */
export function unavailableConnector(id) {
  const def = getConnector(id);
  const fail = () => { throw new ConnectorNotAvailable(id, def.blockedOn); };
  return {
    id,
    available: false,
    blockedOn: def.blockedOn,
    async verify() {
      return { ok: false, reason: 'not_implemented', blockedOn: def.blockedOn, workaround: 'generic_webhook' };
    },
    syncStatus: fail,
    upsertContact: fail,
    deliver: fail,
  };
}
