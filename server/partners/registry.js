// server/partners/registry.js — the credit-repair side of the loop: what each source is, and how far it is from real.
//
// Mirrors connectors/registry.js for the lender side. `implemented: false`
// entries exist so a roadmap can show them without a single guessed endpoint
// being written; their adapters fail loudly until vendor docs are confirmed.

export const PARTNER_PLATFORMS = Object.freeze({
  csv: {
    id: 'csv', displayName: 'CSV / manual entry', kind: 'credit_repair', level: 0,
    accessModel: 'self_serve', blockedOn: null, implemented: true, docs: 'docs/runbooks/level-0-manual-loop.md',
    notes: 'The operator already pulls the report monthly. They type or upload blocker-level facts; no report data is ever entered.',
  },
  zapier: {
    id: 'zapier', displayName: 'Zapier / Make / any webhook', kind: 'credit_repair', level: 1,
    accessModel: 'self_serve', blockedOn: null, implemented: true, docs: 'https://zapier.com/apps/webhook/integrations',
    notes: 'Inbound: a Zap posts to /v1/inbound/zapier with a shared token. Outbound: the existing generic signed webhook to a Zapier catch hook.',
  },
  disputechat: {
    id: 'disputechat', displayName: 'DisputeChat', kind: 'credit_repair', level: 2,
    accessModel: 'self_serve', blockedOn: null, implemented: true, docs: null,
    notes: 'Ours. Signs with ReadyIQ\'s own signature scheme; dchub gains an outbound hook in a separate plan.',
  },
  credit_repair_cloud: {
    id: 'credit_repair_cloud', displayName: 'Credit Repair Cloud', kind: 'credit_repair', level: 2,
    accessModel: 'developer_signup', blockedOn: 'Confirm inbound payload fields from the CRC API/Zapier docs with a developer account', implemented: false, docs: 'https://www.creditrepaircloud.com/',
    notes: 'Dominant CRM in the market and the distribution prize. Reachable today via zapier.',
  },
  disputefox: {
    id: 'disputefox', displayName: 'DisputeFox', kind: 'credit_repair', level: 2,
    accessModel: 'developer_signup', blockedOn: 'Confirm inbound payload fields from the DisputeFox API/Zapier docs with a developer account', implemented: false, docs: 'https://disputefox.com/',
    notes: 'Second platform to cover. Reachable today via zapier.',
  },
});

export const PARTNER_IDS = Object.freeze(Object.keys(PARTNER_PLATFORMS));

export function getPartner(id) {
  const def = PARTNER_PLATFORMS[id];
  if (!def) throw new RangeError(`unknown partner "${id}"`);
  return def;
}
export function partnerLevel(id) { return getPartner(id).level; }
export function partnersByLevel() {
  const out = { 0: [], 1: [], 2: [] };
  for (const id of PARTNER_IDS) out[PARTNER_PLATFORMS[id].level].push(id);
  return out;
}
