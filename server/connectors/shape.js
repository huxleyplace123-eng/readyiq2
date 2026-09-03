// connectors/shape.js — Shape CRM. The only connector buildable today.
//
// Auth is a raw key in the Authorization header, no token exchange, no scopes,
// no expiry. Base URL https://secure-api.setshape.com/api.
//
// Field names are deliberately NOT hard-coded. Shape lets each company define
// its own statuses and record types, so this adapter discovers the tenant's
// vocabulary at connect time via /list-statuses and /list-record-types, then
// maps ReadyIQ pathways onto whatever that tenant actually uses. Guessing field
// names would produce a connector that works in one account and breaks in the
// next one.

import { getConnector } from './registry.js';

const BASE = getConnector('shape').hosts.production;

/** ReadyIQ pathway → the Shape status we would like, best-effort by name. */
export const PATHWAY_STATUS_HINTS = Object.freeze({
  ready_now: ['ready now', 'ready', 'qualified', 'hot'],
  near_ready: ['near ready', 'nurture', 'warm'],
  build: ['credit repair', 'building', 'long term', 'nurture'],
  thin: ['thin file', 'nurture', 'long term'],
  dispute: ['credit repair', 'dispute', 'nurture'],
  dti: ['nurture', 'long term'],
});

export class ShapeError extends Error {
  constructor(status, body) {
    super(`Shape API ${status}: ${typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)}`);
    this.name = 'ShapeError';
    this.status = status;
    this.body = body;
    // 404 here almost always means the Authorization header never arrived —
    // Shape documents that specifically, and it is otherwise very confusing.
    this.hint = status === 404 ? 'missing Authorization header'
      : status === 401 ? 'key unknown, unlinked to a company, or company inactive'
      : status === 429 ? 'account Open API allowance exceeded'
      : undefined;
  }
}

export class ShapeConnector {
  #apiKey; #fetch; #base; #statusCache = null;

  constructor({ apiKey, fetch: fetchImpl = globalThis.fetch, base = BASE } = {}) {
    if (!apiKey) throw new TypeError('Shape apiKey required');
    this.#apiKey = apiKey;
    this.#fetch = fetchImpl;
    this.#base = base;
  }

  async #call(method, path, { query, body } = {}) {
    const url = new URL(this.#base + path);
    if (query) for (const [k, v] of Object.entries(query)) if (v != null) url.searchParams.set(k, String(v));

    const res = await this.#fetch(url.toString(), {
      method,
      headers: {
        Authorization: this.#apiKey,          // raw key, not "Bearer"
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    const text = await res.text();
    let parsed;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
    if (!res.ok) throw new ShapeError(res.status, parsed);
    return parsed;
  }

  /** Cheapest authenticated call — used as the connection health check. */
  async verify() {
    const statuses = await this.listStatuses();
    return { ok: true, statusCount: Array.isArray(statuses) ? statuses.length : 0 };
  }

  async listStatuses() {
    if (this.#statusCache) return this.#statusCache;
    this.#statusCache = await this.#call('GET', '/list-statuses');
    return this.#statusCache;
  }

  listRecordTypes() { return this.#call('GET', '/list-record-types'); }
  listUsers() { return this.#call('GET', '/list-users'); }

  searchRecords(query) { return this.#call('GET', '/search-records', { query }); }

  createLead(fields) { return this.#call('POST', '/add/new/lead', { body: fields }); }
  updateRecord(fields) { return this.#call('POST', '/update/a/record', { body: fields }); }
  changeStatus(body) { return this.#call('POST', '/change-status', { body }); }
  assignUser(body) { return this.#call('POST', '/assign-a-user', { body }); }

  /**
   * Resolve a ReadyIQ pathway to a status id that exists in THIS tenant.
   * Returns null when nothing matches rather than inventing one — the caller
   * then leaves the status alone instead of moving a record somewhere wrong.
   */
  async resolveStatusId(pathway) {
    const hints = PATHWAY_STATUS_HINTS[pathway] || [];
    const statuses = await this.listStatuses();
    const rows = Array.isArray(statuses) ? statuses : statuses?.data ?? statuses?.statuses ?? [];
    for (const hint of hints) {
      const hit = rows.find((s) => String(s?.name ?? s?.status ?? s).toLowerCase().includes(hint));
      if (hit) return hit.id ?? hit.status_id ?? hit.value ?? null;
    }
    return null;
  }

  /**
   * Push one readiness_status into Shape.
   *
   * Upsert by email: search first, update if found, create if not. Status is
   * only moved when the tenant has a status that plausibly corresponds.
   */
  async syncStatus({ status, identity, dryRun = false }) {
    const fields = mapToShapeFields(status, identity);
    if (dryRun) return { dryRun: true, fields };

    const found = identity?.email ? await this.searchRecords(identity.email).catch(() => null) : null;
    const existingId = firstRecordId(found);

    const record = existingId
      ? await this.updateRecord({ ...fields, id: existingId })
      : await this.createLead(fields);

    const statusId = await this.resolveStatusId(status.pathway).catch(() => null);
    const recordId = existingId ?? firstRecordId(record);
    if (statusId && recordId) {
      await this.changeStatus({ id: recordId, status_id: statusId }).catch(() => {});
    }

    return { recordId, created: !existingId, statusApplied: Boolean(statusId) };
  }
}

/**
 * readiness_status + identity → a flat Shape record.
 *
 * Everything ReadyIQ-specific is namespaced `readyiq_` so it is obvious in the
 * lender's CRM where it came from, and so a tenant can map it to custom fields
 * without collisions.
 */
export function mapToShapeFields(status, identity = {}) {
  return {
    first_name: identity.first_name ?? undefined,
    last_name: identity.last_name ?? undefined,
    email: identity.email ?? undefined,
    phone: identity.mobile ?? undefined,

    readyiq_consumer_ref: status.consumer_ref,
    readyiq_pathway: status.pathway,
    readyiq_stage: status.stage,
    readyiq_readiness_stage: status.readiness_stage ?? undefined,
    readyiq_round: status.round?.n != null ? `${status.round.n} of ~${status.round.of ?? '?'}` : undefined,
    readyiq_next_milestone: status.next_milestone ?? undefined,
    readyiq_review_requested: status.flags?.review_requested ? 'yes' : 'no',
    readyiq_protect_mode: status.flags?.protect_mode ? 'on' : 'off',
    readyiq_last_activity: status.last_activity_at,
    readyiq_lo: status.attribution?.lo ?? undefined,
    readyiq_source: status.attribution?.source ?? undefined,
  };
}

function firstRecordId(payload) {
  if (!payload) return null;
  const rows = Array.isArray(payload) ? payload : payload.data ?? payload.records ?? payload.results ?? [];
  const row = Array.isArray(rows) ? rows[0] : rows;
  return row?.id ?? row?.record_id ?? row?.lead_id ?? null;
}
