# `server/` — the ReadyIQ integration layer

Transport, storage and contract for pushing readiness status into the systems a
lender already runs. Zero runtime dependencies; Node built-ins only, matching the
rest of the repo. Tests via `npm test` (`node --test`).

Full design, vendor facts and roadmap: [`docs/specs/2026-08-20-integration-layer.md`](../docs/specs/2026-08-20-integration-layer.md).
Partner application drafts: [`docs/partner-applications.md`](../docs/partner-applications.md).

> **Nothing here has live credentials, and nothing is wired into the prototype.**
> The `/integrations/` page's "Connected" badges are still fixtures.

## Read this first

ReadyIQ's status object is derived from MyScoreIQ and CreditBuilderIQ. Per
DisputeChat's own production registry, IdentityIQ exposes no organization API,
no report pull and no webhooks — only sponsored enrollment links and a per-client
credential vault. **Until IDIQ commits to a partner API, none of these connectors
have anything real to carry.** Everything here is deliberately upstream-agnostic
so it survives whatever that feed turns out to look like.

## Files

| | |
|---|---|
| `status-object.js` | The contract. Builds `readiness_status`, and `assertNoReportData()` makes it structurally impossible to leak a score, report, tradeline, balance or income at any depth. |
| `events.js` | Outbound/inbound event catalog, delivery envelope, idempotency keys. |
| `dispatch.js` | Signed (HMAC, Stripe-style `t=…,v1=…`), retried (jittered backoff, honours `Retry-After`), idempotent delivery, with a dead-letter queue and replay. |
| `safe-url.js` | SSRF guard for tenant-supplied endpoints. |
| `vault.js` | AES-256-GCM credential storage keyed on `(tenantId, connectorId)`. |
| `connections.js` | Per-tenant connection state machine, health checks, event fan-out. |
| `connectors/registry.js` | What each platform actually requires. Every fact sourced from vendor docs on 2026-08-20. |
| `connectors/*.js` | Shape, Total Expert, Encompass, Salesforce, generic webhook, and honest placeholders for Blend and LenderHomePage. |

## The two decisions worth knowing

**Credentials are keyed per tenant, not per connector.** Five of six platforms
issue keys scoped to (partner × lender). Encompass states it plainly: *"An ISV
partner who is engaged with multiple lenders will have separate API keys for each
partner/lender pair."* So connecting Encompass is not something ReadyIQ does
once — it is something each lender does, with their own admin. A registry of six
API clients would need rewriting at the second customer.

**No consumer report data crosses the wire, and that is enforced in code.**
Because of it, the receiving CRM never becomes a holder or user of a consumer
report, which keeps FCRA obligations off every integration partner and makes a
plain signed webhook a legitimate integration rather than a shortcut.

## Setup

```bash
node -e "import('./server/vault.js').then(v => console.log(v.generateVaultKey()))"
```

Store the output as `READYIQ_VAULT_KEY` (64 hex chars). Without it the vault
throws `VaultKeyMissing` rather than storing anything in plaintext.

## Usage

```js
import { buildStatusObject, buildIdentity } from './server/status-object.js';
import { buildEvent } from './server/events.js';
import { Dispatcher } from './server/dispatch.js';
import { CredentialVault } from './server/vault.js';
import { ConnectionManager } from './server/connections.js';

const manager = new ConnectionManager({
  vault: new CredentialVault(),
  dispatcher: new Dispatcher(),
});

manager.connect('summit', 'shape', { apiKey: process.env.SHAPE_API_KEY });
await manager.verify('summit', 'shape');

const status = buildStatusObject(consumer);
const event = buildEvent({ type: 'review.requested', tenantId: 'summit', status });

await manager.broadcast('summit', event, { identity: buildIdentity(consumer) });
```

`manager.overview('summit')` returns every connector in rollout order with its
state, what it is blocked on, and a non-secret credential fingerprint — which is
the data a Connections screen in the lender portal needs.

## Not built

Persistence (the vault and connection state are in-memory behind a
database-shaped interface), an HTTP surface, OAuth callback routes, the pathway
engine that computes a status object from live credit events, and the
Connections screen itself.
