// connectors/registry.js — what each platform requires before a line of code runs.
//
// Every fact in this file came from the vendor's own public documentation on
// 2026-08-20; `docs` links the page it came from. `accessModel` is the field
// that should drive the roadmap: only Shape is self-serve, and five of six
// issue credentials per lender rather than per partner, which is why the vault
// is keyed on (tenantId, connectorId) and not on connectorId alone.

/**
 * @typedef {'self_serve'|'developer_signup'|'partner_agreement'} AccessModel
 *   self_serve         you can get a working key today with no one's permission
 *   developer_signup   free application, sandbox issued, no contract to sign
 *   partner_agreement  executed agreement and/or certification before production
 *
 * @typedef {'per_partner'|'per_lender'} CredentialScope
 *   per_lender means onboarding is a per-customer procedure, forever.
 */

export const CONNECTORS = Object.freeze({
  generic_webhook: {
    id: 'generic_webhook',
    displayName: 'Signed webhook',
    shortCode: 'WH',
    tier: 1,
    accessModel: /** @type {AccessModel} */ ('self_serve'),
    credentialScope: /** @type {CredentialScope} */ ('per_lender'),
    blockedOn: null,
    docs: null,
    hosts: null,
    // The tenant supplies their own endpoint. Reaches Zapier, Make, n8n, and any
    // CRM with an inbound hook — which is every platform on this list.
    credentialFields: [
      { key: 'url', label: 'Endpoint URL', type: 'url', required: true },
      { key: 'secret', label: 'Signing secret', type: 'password', required: true, generated: true },
    ],
    capabilities: { outboundEvents: true, inboundWebhooks: false, contactUpsert: false, statusSync: true },
  },

  shape: {
    id: 'shape',
    displayName: 'Shape',
    shortCode: 'SH',
    tier: 1,
    accessModel: 'self_serve',
    credentialScope: 'per_lender',
    blockedOn: null,
    docs: 'https://setshape.com/api-docs',
    hosts: { production: 'https://secure-api.setshape.com/api', sandbox: null },
    // "grab your key from the API Integrations page" — no partner program, no
    // sandbox to request, no certification. The only one buildable today.
    credentialFields: [
      { key: 'apiKey', label: 'Shape API key', type: 'password', required: true,
        helpText: 'Shape → API Integrations → Shape Open API. Treat it like a password.' },
    ],
    capabilities: { outboundEvents: true, inboundWebhooks: false, contactUpsert: true, statusSync: true },
    notes: 'Raw key in the Authorization header, no token exchange. 404 means the header is missing; 401 means the key is unknown or the company is inactive; 429 means the account allowance is spent. No documented webhook support, so status flows one way.',
  },

  total_expert: {
    id: 'total_expert',
    displayName: 'Total Expert',
    shortCode: 'TE',
    tier: 2,
    accessModel: 'developer_signup',
    credentialScope: 'per_lender',
    blockedOn: 'Technology partner application + CT environment validation',
    docs: 'https://developer.totalexpert.net/',
    hosts: {
      production: 'https://public.totalexpert.net',
      sandbox: 'https://public.vt.totalexpert.net',
    },
    credentialFields: [
      { key: 'clientId', label: 'TE client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'TE client secret', type: 'password', required: true },
      { key: 'redirectUri', label: 'Registered redirect URI', type: 'url', required: false,
        helpText: 'Authorization-code flow only. Must exactly match what TE has registered.' },
    ],
    capabilities: { outboundEvents: true, inboundWebhooks: false, contactUpsert: true, statusSync: true, marketingTriggers: true },
    limits: {
      // Both numbers come from the Getting Started guide and both matter.
      requestsPerMinute: 1000,
      tokenRequestsPerHour: 2,
      accessTokenTtlSec: 3600,
      refreshTokenTtlSec: 14 * 24 * 3600,
      // Rate limiting is by source IP, not by client. Every tenant we serve
      // shares one budget per egress IP — so token caching is mandatory, not
      // an optimisation, and egress may need to be sharded at scale.
      scopedBy: 'source_ip',
    },
    notes: 'Two auth flows. Authorization code = one credential set covering many customers, calls run "As User". Client credentials = one credential set per customer org, calls run "As Admin" and must name a contact owner. TE recommends authorization code; so do we.',
  },

  salesforce: {
    id: 'salesforce',
    displayName: 'Salesforce',
    shortCode: 'SF',
    tier: 2,
    accessModel: 'developer_signup',
    credentialScope: 'per_lender',
    blockedOn: null,
    docs: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/',
    hosts: { production: null, sandbox: null }, // per-org My Domain
    credentialFields: [
      { key: 'instanceUrl', label: 'My Domain URL', type: 'url', required: true },
      { key: 'clientId', label: 'Consumer key', type: 'text', required: true },
      { key: 'clientSecret', label: 'Consumer secret', type: 'password', required: true },
      { key: 'refreshToken', label: 'Refresh token', type: 'password', required: false },
    ],
    capabilities: { outboundEvents: true, inboundWebhooks: false, contactUpsert: true, statusSync: true },
    notes: 'Take the customer-owned Connected App path: the lender creates the app in their own org and hands over the keys. No ISV programme, no AppExchange security review ($999/submission, 6-9 weeks, roughly half fail first time), and Salesforce\'s May 2026 connected-app mandate does not apply when we do not own the consumer key. Revisit a managed package only when the volume justifies it.',
  },

  encompass: {
    id: 'encompass',
    displayName: 'Encompass (ICE Mortgage Technology)',
    shortCode: 'EN',
    tier: 3,
    accessModel: 'partner_agreement',
    credentialScope: 'per_lender',
    blockedOn: 'ICE Partner Portal agreement, then each lender\'s Encompass admin enabling the API user',
    docs: 'https://developer.icemortgagetechnology.com/developer-connect/docs/api-user-isv-partner',
    hosts: {
      production: 'https://api.elliemae.com',
      tokenPath: '/oauth2/v1/token',
      apiBase: '/encompass/v3',
      sandbox: null,
    },
    credentialFields: [
      { key: 'clientId', label: 'Partner API client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Partner API client secret', type: 'password', required: true },
      { key: 'instanceId', label: 'Lender Encompass instance ID', type: 'text', required: true },
    ],
    capabilities: { outboundEvents: true, inboundWebhooks: true, contactUpsert: false, statusSync: true, loanEvents: true },
    notes: 'The long pole, and the only one that pays us back with inbound data: Encompass supports signed webhook subscriptions for loan events, and "a new loan is created" is precisely the trigger Protect Mode needs. Separate API keys are issued per partner/lender pair, so every customer is its own onboarding.',
  },

  blend: {
    id: 'blend',
    displayName: 'Blend',
    shortCode: 'BL',
    tier: 3,
    accessModel: 'partner_agreement',
    blockedOn: 'Partner enquiry — no public self-serve developer portal',
    credentialScope: 'per_lender',
    docs: 'https://blend.com/partner-with-us/',
    hosts: null,
    credentialFields: [],
    capabilities: { outboundEvents: true, inboundWebhooks: true, contactUpsert: false, statusSync: true },
    notes: 'No public API reference. Credential shape is unknown until a partner conversation happens, so this adapter deliberately refuses to guess.',
  },

  lenderhomepage: {
    id: 'lenderhomepage',
    displayName: 'LenderHomePage',
    shortCode: 'LHP',
    tier: 3,
    accessModel: 'partner_agreement',
    blockedOn: 'Business development — no public developer documentation exists',
    credentialScope: 'per_lender',
    docs: 'https://lenderhomepage.com/',
    hosts: null,
    credentialFields: [],
    capabilities: { outboundEvents: true, inboundWebhooks: false, contactUpsert: false, statusSync: true },
    notes: 'Websites, Loanzify POS and app. No published API. Until a partner conversation defines one, LHP is reachable through the generic signed webhook like any other endpoint.',
  },
});

export const CONNECTOR_IDS = Object.freeze(Object.keys(CONNECTORS));

export function getConnector(id) {
  const def = CONNECTORS[id];
  if (!def) throw new RangeError(`unknown connector "${id}"`);
  return def;
}

/** Everything we can stand up without asking anyone's permission. */
export function buildableToday() {
  return CONNECTOR_IDS.filter((id) => CONNECTORS[id].accessModel === 'self_serve');
}

/** Ordered by how soon each can realistically carry live data. */
export function rolloutOrder() {
  const rank = { self_serve: 0, developer_signup: 1, partner_agreement: 2 };
  return [...CONNECTOR_IDS].sort((a, b) => {
    const byAccess = rank[CONNECTORS[a].accessModel] - rank[CONNECTORS[b].accessModel];
    return byAccess !== 0 ? byAccess : CONNECTORS[a].tier - CONNECTORS[b].tier;
  });
}

/** Which credential fields a tenant still owes us before this connector can run. */
export function missingFields(id, credentials = {}) {
  return getConnector(id).credentialFields
    .filter((f) => f.required && !credentials[f.key])
    .map((f) => f.key);
}
