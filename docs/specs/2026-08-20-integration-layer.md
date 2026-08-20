# ReadyIQ integration layer — spec

**Status:** design + scaffolding landed (`server/`), no live credentials anywhere.
**Date:** 2026-08-20. Vendor facts verified against public documentation that day; links inline.

---

## 0. The blocker that outranks everything below

ReadyIQ's status object is **derived** data — pathway, round, next milestone,
last activity — computed from MyScoreIQ and CreditBuilderIQ.

In DisputeChat's production code
(`dchub/artifacts/api-server/src/lib/credit-providers/registry.ts`), IdentityIQ
is registered with `supportedModes: []`, `reportPull: false`, `webhooks: false`,
and the comment:

> IdentityIQ has no organization API connection in this integration. The
> supported surfaces are sponsored enrollment links plus a per-client vault.

`routes/biz-identityiq.ts` confirms it: the integration is an encrypted vault of
the consumer's IDIQ username, password and SSN last-4, status
`saved_unverified` / `action_required`. Delegated credentials, not an API.

**If IDIQ cannot push enrollment, score-change and dispute-status events, there
is nothing for any connector below to carry.** Everything in this spec is
downstream plumbing that assumes an upstream feed exists. Getting a partner API
commitment from IDIQ is step zero and it is a commercial conversation, not code.

The work in `server/` is deliberately designed to be useful anyway: it is all
transport, storage, and contract, none of which changes based on how the
upstream feed eventually arrives.

---

## 1. The contract

One object crosses the wire. `server/status-object.js`.

```json
{
  "object": "readiness_status",
  "version": 1,
  "consumer_ref": "c_maya",
  "attribution": { "lo": "jlee", "branch": null, "partner": null, "source": "text-link" },
  "pathway": "build",
  "stage": "active",
  "round": { "n": 2, "of": 5 },
  "next_milestone": "utilization_under_30",
  "engines": { "check": "MyScoreIQ", "build": "CreditBuilderIQ", "dispute": "CreditBuilderIQ" },
  "flags": { "review_requested": false, "protect_mode": false, "eligibility_clock": null },
  "last_activity_at": "2026-08-20T12:00:00Z"
}
```

No score. No report. No tradelines. No letters. No balances. No income.

### Why that is a commercial feature, not modesty

Because no consumer report data crosses the wire, **the receiving CRM never
becomes a holder or user of a consumer report.** That keeps FCRA furnisher and
user obligations off every integration partner, which is what makes a lender's
security review survivable and what makes Level 2 (a plain signed webhook) a
legitimate integration rather than a shortcut.

It is enforced in code. `assertNoReportData()` walks the object at every depth
and throws `ReportDataLeak` on any forbidden key, and it runs on every status
object and every event envelope. A future field cannot quietly break the promise
the `/integrations/` page makes. Fifteen tests cover it.

### Identity travels beside it, never inside it

A CRM upsert needs a name and an email to match a contact. That is data the
lender already owns — they issued the invitation — so it is not a disclosure.
`buildIdentity()` returns it as a separate structure so the status object stays
auditable as "contains no consumer data" with no caveat attached.

---

## 2. The architectural consequence of how these platforms sell

**Five of the six platforms issue credentials scoped to (partner × lender), not
to partner.** Encompass says it outright:

> An ISV partner who is engaged with multiple lenders will have separate API
> keys for each partner/lender pair.

Total Expert's client-credentials flow is the same shape ("a set of credentials
for each Total Expert customer"). The Salesforce customer-owned Connected App
path is too.

So "integrating with Encompass" does not produce one integration shipped once.
It produces **an onboarding procedure run for every lender, forever.**

That is why `server/vault.js` is keyed on `(tenantId, connectorId)` and why
`server/connections.js` exists at all. A registry of six API clients would be
rewritten at the second customer.

---

## 3. Access tiers

| Platform | Access | Blocked on | Credential scope |
|---|---|---|---|
| Signed webhook | self-serve | — | per lender |
| **Shape** | **self-serve** | — | per lender |
| Total Expert | developer signup | partner application + CT validation | per lender |
| Salesforce | developer signup | — (customer-owned Connected App) | per lender |
| Encompass / ICE | partner agreement | ICE Partner Portal, then each lender's Encompass admin | per lender |
| Blend | partner agreement | partner enquiry; no public developer portal | per lender |
| LenderHomePage | partner agreement | business development; no public API docs at all | per lender |

Encoded in `server/connectors/registry.js`; `rolloutOrder()` returns this order.

### Shape — the only one buildable today

Base `https://secure-api.setshape.com/api`. Raw key in the `Authorization`
header, no `Bearer`, no token exchange, no scopes, no expiry. Key comes from
Shape → API Integrations. Documented status codes are unusually load-bearing:
**404 means the Authorization header never arrived**, 401 means the key is
unknown or the company is inactive, 429 means the account allowance is spent.

Field names are *not* hard-coded. Shape lets each company define its own statuses
and record types, so `ShapeConnector` calls `/list-statuses` at connect time and
maps ReadyIQ pathways onto whatever that tenant actually uses, returning `null`
rather than moving a record into a status that does not exist.

### Total Expert — the rate limit is a correctness constraint

- OAuth 2.0. `/v1/authorize` and `/v1/token` on `public.totalexpert.net`
  (prod) / `public.vt.totalexpert.net` (CT sandbox).
- Token requests use `Authorization: Basic base64(clientId:clientSecret)`.
- Access token 1 hour. Refresh token up to 2 weeks.
- **1000 requests/minute, and 2 TOKEN REQUESTS PER HOUR — enforced by source IP,
  not by client.**

That last line is the one that breaks naive implementations. A multi-tenant
server fetching a token per tenant locks out every tenant sharing its egress IP
within minutes. `TokenStore` caches per client, refuses to spend a third token
in a rolling hour (`TokenBudgetExhausted`), and is shared process-wide by
`ConnectionManager` because the limit is shared too. At scale, egress may need
sharding across IPs.

Two auth flows, and the choice matters:

| | Authorization code | Client credentials |
|---|---|---|
| Credentials | one set, many customers | one set **per customer org** |
| Calls run as | "As User" | "As Admin" |
| Contact owner | implicit | must be specified |

TE recommends authorization code. So do we — it is the only flow that avoids a
new credential per customer.

**Mapping in TE's own vocabulary:**

- **Contact** — the consumer. Owner set via `owner.external_id` = the ReadyIQ LO
  id, which is what keeps ReadyIQ's attribution promise intact inside the
  lender's CRM. Deduplication is per-user, not org-wide.
- **Survey** — a status snapshot. Chosen over custom fields deliberately: TE has
  to create custom fields by hand per customer ("can lead to delays"), whereas
  surveys are self-service, repeatable, append rather than overwrite, and are
  usable as Journey conditions. The survey history becomes the journey audit
  trail. Definition ships as `READYIQ_SURVEY_DEFINITION`.
- **Insight** — a milestone event. **This is why the integration is worth
  building**: an insight fires a Journey, which is exactly ReadyIQ's "reconnect
  when they're ready" promise, executed inside the lender's own marketing
  automation. TE asks partners to prefix insight types with the partner name, so
  every one of ours is `ReadyIQ: …`. Insight types must be created by
  coordinating with TE's team — include the list in the onboarding packet.

### Encompass — the only one that pays us back with inbound data

- Token `https://api.elliemae.com/oauth2/v1/token`, base
  `https://api.elliemae.com/encompass/v3`.
- `grant_type=client_credentials`, `scope=pc pcapi`.
- Keys are per partner/lender pair; `instanceId` is a required credential.

Encompass supports **signed webhook subscriptions on loan events**, discoverable
via Get Resources, delivered as signed JSON POSTs. And:

> **"a new loan is created"** — which is precisely the trigger Protect Mode has
> always needed.

Today `/demo/?mode=consumer&cpage=guardian` fakes it with a "Simulate a loan in
process (demo)" button. `loan.created` is the real thing:

| Encompass event | ReadyIQ intent |
|---|---|
| `loan.created` | `protect_mode.activate` |
| `loan.funded` | `protect_mode.deactivate` |
| `loan.enhancedFieldChange` | `protect_mode.evaluate` |

The exact signature header name and canonical string are published in the
partner portal rather than the public docs, so `verifyNotification()` takes both
as parameters instead of guessing.

### Salesforce — take the cheap path

| | Customer-owned Connected App | Managed package |
|---|---|---|
| Cost | $0 | $999 per submission |
| Time | immediate | 6–9 weeks, +2–3 per resubmission |
| Risk | none | ~half of first submissions fail |
| May 2026 connected-app mandate | does not apply (we don't own the key) | applies |

Take the first. Revisit the second only when per-org onboarding actually hurts.
Every lender's org is customised, so `DEFAULT_FIELD_MAP` is a starting point a
tenant edits, and `verifyFieldMap()` checks the fields exist via `describe`
before we write to them.

### Blend and LenderHomePage — no adapter on purpose

Neither publishes an API reference. `unavailable.js` fails loudly rather than
shipping a plausible client built on guessed endpoints — a connector that
compiles against an imaginary API is worse than none, because it looks finished
on a roadmap. Both remain reachable through the generic signed webhook.

---

## 4. Delivery

`server/dispatch.js`. The `/integrations/` page promises events are "delivered
signed, retried, idempotent". dchub's `outbound-webhooks.ts` does one of three —
it signs, fires a single `fetch`, and drops the result. This keeps all three.

- **Signed** — `X-ReadyIQ-Signature: t=<unix>,v1=<hmac>` over `"<t>.<body>"`,
  Stripe-style, so a captured payload cannot be replayed at a later timestamp.
  300-second tolerance. `verifySignature()` is exported as the reference
  implementation to hand receivers.
- **Retried** — up to 6 attempts, exponential backoff with full jitter, capped
  at 60s, honouring `Retry-After`. Retries 408/425/429/5xx and network errors;
  **never** retries other 4xx.
- **Idempotent** — every attempt carries the same `X-ReadyIQ-Event-Id`. That is
  the only reason retrying is safe: without it, every retry is a duplicate write
  into a lender's CRM. A test asserts the id is identical across attempts.
- **Dead-lettered** — exhausted deliveries land in the DLQ with full attempt
  history, which is what makes an audit-log screen possible. `replay()` re-drives.
- **SSRF-guarded** — `safe-url.js` rejects http, credentials-in-URL, loopback,
  link-local (`169.254.169.254`), RFC1918, CGNAT, `.internal`, and IPv4-mapped
  IPv6. `redirect: 'manual'` so a 302 cannot walk into internal infrastructure.

---

## 5. Events

`server/events.js`.

**Outbound:** `consumer.enrolled`, `consumer.checked`, `pathway.changed`,
`progress.milestone_reached`, `round.completed`, `readiness.trigger`,
`review.requested`, `protect_mode.activated`, `protect_mode.alert`,
`consumer.inactive`.

**Inbound (from an LOS/POS):** `loan.application_created`,
`loan.application_paused`, `loan.funded`.

Every outbound event maps to a Total Expert insight type; a test enforces that
the two lists cannot drift apart.

---

## 6. Roadmap

1. **IDIQ partner API.** Commercial. Blocking. Nothing below carries real data
   without it.
2. **Generic signed webhook + a Zapier/Make app.** Zero partnerships. Reaches
   all six platforms and everything else. Ship first; it stays useful forever.
3. **Shape.** Self-serve. The one connector that can be genuinely live rather
   than mocked, this week, with only a Shape account.
4. **LenderHomePage.** No public API, but the warmest available door.
5. **Total Expert.** Free developer signup, real sandbox, good docs, and
   Insights → Journeys is the best product fit of the six.
6. **Salesforce**, customer-owned Connected App.
7. **Encompass**, then **Blend** — only when a paying lender asks by name and
   will co-sponsor the enablement with their own admin.

Native connectors buy polish. The webhook buys capability. Do not invert them.

---

## 7. Not built here

Persistence (the vault and connection state are in-memory with a
database-shaped interface), an HTTP surface, the OAuth callback routes, the
pathway engine that computes a status object from live credit events, and a
Connections screen in the lender portal. The `/integrations/` page's "Connected"
badges remain fixtures.

## 8. One thing to fix on the site regardless

`/integrations/` currently shows six logos with green **Connected** badges and a
live event stream reporting `Delivered` to Total Expert and Encompass. None of
it exists. For a product selling to regulated lenders, relabel to "planned" or
move behind a roadmap framing until at least one connector is real.
