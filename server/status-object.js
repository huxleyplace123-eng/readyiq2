// status-object.js — the canonical ReadyIQ readiness_status object.
//
// This is THE contract. It is the only thing ReadyIQ ever sends to a lender's
// systems. It carries derived status and nothing else: no score, no report, no
// tradelines, no dispute letters, no balances, no income.
//
// That is not a style preference. Because no consumer report data crosses the
// wire, the receiving CRM never becomes a holder or user of a consumer report,
// which keeps FCRA furnisher/user obligations off every integration partner.
// `assertNoReportData` enforces it in code so a future field can't quietly
// break the promise the /integrations/ page makes.

export const STATUS_OBJECT_VERSION = 1;

/** Pathways mirror src/state.js PATHWAYS. */
export const PATHWAYS = ['ready_now', 'near_ready', 'build', 'thin', 'dispute', 'dti'];

/** Engine attribution — IDIQ products only, never a third-party reporting brand. */
export const ENGINES = { check: 'MyScoreIQ', build: 'CreditBuilderIQ', dispute: 'CreditBuilderIQ' };

/**
 * Keys that may never appear anywhere in a status object, at any depth.
 * Checked against key names, not values, so pathway "dti" stays legal while a
 * `dti` field does not.
 */
const FORBIDDEN_KEYS = new Set([
  'score', 'scores', 'fico', 'bureau', 'bureaus', 'report', 'reports',
  'tradeline', 'tradelines', 'letter', 'letters', 'balance', 'balances',
  'utilization', 'collection', 'collections', 'derog', 'inquiries',
  'income', 'dti', 'ssn', 'dob', 'address', 'delta', 'deltas', 'history',
  'publicrecords', 'creditreport', 'accountnumber',
]);

export class ReportDataLeak extends Error {
  constructor(path) {
    super(`readiness_status may not contain consumer report data (found "${path}")`);
    this.name = 'ReportDataLeak';
    this.path = path;
  }
}

/** Throw if any forbidden key appears at any depth. Cycles are tolerated. */
export function assertNoReportData(value, path = 'readiness_status', seen = new Set()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoReportData(v, `${path}[${i}]`, seen));
    return value;
  }
  for (const [key, v] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) throw new ReportDataLeak(`${path}.${key}`);
    assertNoReportData(v, `${path}.${key}`, seen);
  }
  return value;
}

/**
 * Build a readiness_status from a ReadyIQ consumer record.
 *
 * @param {object} consumer  a src/state.js consumer
 * @param {object} [opts]
 * @param {string} [opts.consumerRef]  stable opaque id sent to the lender
 * @param {string} [opts.occurredAt]   ISO-8601 timestamp of last activity
 * @returns {object} readiness_status
 */
export function buildStatusObject(consumer, opts = {}) {
  if (!consumer || typeof consumer !== 'object') throw new TypeError('consumer required');
  const { id, pathway, status, round, roundsEstimated, attribution = {} } = consumer;
  if (pathway && !PATHWAYS.includes(pathway)) throw new RangeError(`unknown pathway "${pathway}"`);

  const upcoming = (consumer.milestones || []).find((m) => m.state === 'upcoming');

  const object = {
    object: 'readiness_status',
    version: STATUS_OBJECT_VERSION,
    consumer_ref: opts.consumerRef || `c_${id}`,
    attribution: {
      lo: attribution.lo ?? null,
      branch: attribution.branch ?? null,
      partner: attribution.partner ?? null,
      source: attribution.source ?? null,
    },
    pathway: pathway ?? null,
    stage: status ?? null,
    round: { n: round ?? null, of: roundsEstimated ?? null },
    next_milestone: upcoming ? slug(upcoming.label) : null,
    engines: { ...ENGINES },
    flags: {
      review_requested: Boolean(consumer.reviewRequestedAt),
      protect_mode: Boolean(consumer.guardian),
      eligibility_clock: opts.eligibilityClock ?? null,
    },
    last_activity_at: opts.occurredAt || nowIso(),
  };

  return assertNoReportData(object);
}

/**
 * Identity travels beside the status object, never inside it.
 *
 * A CRM upsert needs a name and an email to match a contact. That is data the
 * lender already owns — they issued the invitation — so it is not a disclosure.
 * Keeping it structurally separate means the status object stays auditable as
 * "contains no consumer data" without a caveat.
 */
export function buildIdentity(consumer) {
  if (!consumer || typeof consumer !== 'object') throw new TypeError('consumer required');
  return {
    consumer_ref: `c_${consumer.id}`,
    first_name: consumer.first ?? null,
    last_name: consumer.last ?? null,
    email: consumer.email ?? null,
    mobile: consumer.mobile ?? null,
  };
}

export function slug(label) {
  return String(label).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
