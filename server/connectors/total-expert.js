// connectors/total-expert.js — Total Expert.
//
// The single most important operational fact about this API, straight from the
// Getting Started guide: the token endpoint is limited to TWO REQUESTS PER HOUR
// and the limit is enforced per source IP, not per client. A multi-tenant server
// that fetches a token per tenant will lock out every tenant sharing that egress
// IP within minutes. Token caching here is a correctness requirement.
//
// Access tokens live 1 hour, refresh tokens up to 2 weeks, so the steady state
// is: one authorization-code grant, then refresh forever, never touching
// /v1/authorize again.
//
// Mapping, in TE's own vocabulary:
//   Contact   the consumer                     (owner = the originating LO)
//   Survey    a readiness_status snapshot      (repeatable, never overwrites)
//   Insight   a milestone event                (triggers marketing automation)
//
// Insights are the reason this integration is worth building: an insight fires
// a Journey, which is exactly ReadyIQ's "reconnect when they're ready" promise.

import { getConnector } from './registry.js';

const DEF = getConnector('total_expert');
const TOKEN_SAFETY_MARGIN_SEC = 300;

/** TE asks partners to prefix insight types with the partner name. */
export const INSIGHT_TYPES = Object.freeze({
  'consumer.enrolled': 'ReadyIQ: Consumer enrolled',
  'consumer.checked': 'ReadyIQ: Readiness check completed',
  'pathway.changed': 'ReadyIQ: Pathway changed',
  'progress.milestone_reached': 'ReadyIQ: Milestone reached',
  'round.completed': 'ReadyIQ: Round completed',
  'readiness.trigger': 'ReadyIQ: Readiness threshold crossed',
  'review.requested': 'ReadyIQ: Lender review requested',
  'protect_mode.activated': 'ReadyIQ: Protect Mode activated',
  'protect_mode.alert': 'ReadyIQ: Protect Mode alert',
  'consumer.inactive': 'ReadyIQ: Consumer inactive',
});

export class TotalExpertError extends Error {
  constructor(status, body) {
    super(`Total Expert API ${status}: ${typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)}`);
    this.name = 'TotalExpertError';
    this.status = status;
    this.body = body;
    this.retryable = status === 429 || status >= 500;
  }
}

export class TokenBudgetExhausted extends Error {
  constructor() {
    super('Total Expert allows 2 token requests per hour per source IP — refusing to spend another');
    this.name = 'TokenBudgetExhausted';
  }
}

/**
 * Token cache shared across every tenant on this process, because the rate
 * limit is shared too. Keyed by clientId.
 */
export class TokenStore {
  #tokens = new Map();
  #requests = [];
  #now;

  constructor({ now = () => Date.now(), budgetPerHour = DEF.limits.tokenRequestsPerHour } = {}) {
    this.#now = now;
    this.budgetPerHour = budgetPerHour;
  }

  get(clientId) {
    const entry = this.#tokens.get(clientId);
    if (!entry) return null;
    if (entry.expiresAt - TOKEN_SAFETY_MARGIN_SEC * 1000 <= this.#now()) return { ...entry, stale: true };
    return entry;
  }

  put(clientId, { accessToken, refreshToken, expiresInSec, scope }) {
    const entry = {
      accessToken,
      refreshToken,
      scope,
      expiresAt: this.#now() + expiresInSec * 1000,
      refreshExpiresAt: this.#now() + DEF.limits.refreshTokenTtlSec * 1000,
    };
    this.#tokens.set(clientId, entry);
    return entry;
  }

  /** Throws rather than silently burning the hour's budget. */
  spend() {
    const cutoff = this.#now() - 3_600_000;
    this.#requests = this.#requests.filter((t) => t > cutoff);
    if (this.#requests.length >= this.budgetPerHour) throw new TokenBudgetExhausted();
    this.#requests.push(this.#now());
  }

  remaining() {
    const cutoff = this.#now() - 3_600_000;
    return this.budgetPerHour - this.#requests.filter((t) => t > cutoff).length;
  }
}

export class TotalExpertConnector {
  #creds; #fetch; #host; #tokens;

  /**
   * @param {object} args
   * @param {{clientId:string, clientSecret:string, redirectUri?:string, refreshToken?:string}} args.credentials
   * @param {'production'|'sandbox'} [args.environment]
   */
  constructor({ credentials, environment = 'sandbox', fetch: fetchImpl = globalThis.fetch, tokenStore } = {}) {
    if (!credentials?.clientId || !credentials?.clientSecret) throw new TypeError('clientId and clientSecret required');
    this.#creds = credentials;
    this.#fetch = fetchImpl;
    this.#host = environment === 'production' ? DEF.hosts.production : DEF.hosts.sandbox;
    this.#tokens = tokenStore || new TokenStore();
    this.environment = environment;
  }

  /** Step 1 of the authorization-code flow — the URL the LO gets redirected to. */
  authorizeUrl({ scope = 'crm', state }) {
    const url = new URL(`${this.#host}/v1/authorize`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.#creds.clientId);
    url.searchParams.set('scope', scope);
    url.searchParams.set('state', state);
    if (this.#creds.redirectUri) url.searchParams.set('redirect_uri', this.#creds.redirectUri);
    return url.toString();
  }

  #basicAuth() {
    return 'Basic ' + Buffer.from(`${this.#creds.clientId}:${this.#creds.clientSecret}`).toString('base64');
  }

  async #requestToken(form) {
    this.#tokens.spend();
    const res = await this.#fetch(`${this.#host}/v1/token`, {
      method: 'POST',
      headers: { Authorization: this.#basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new TotalExpertError(res.status, body);
    return this.#tokens.put(this.#creds.clientId, {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresInSec: body.expires_in ?? DEF.limits.accessTokenTtlSec,
      scope: body.scope,
    });
  }

  /** Exchange the ?code= from the redirect callback. Called once per tenant. */
  exchangeCode(code) {
    return this.#requestToken({ grant_type: 'authorization_code', code });
  }

  /** Cached token, refreshed only when actually stale. */
  async accessToken() {
    const cached = this.#tokens.get(this.#creds.clientId);
    if (cached && !cached.stale) return cached.accessToken;

    const refreshToken = cached?.refreshToken ?? this.#creds.refreshToken;
    if (refreshToken) {
      const fresh = await this.#requestToken({ grant_type: 'refresh_token', refresh_token: refreshToken });
      return fresh.accessToken;
    }
    // Client-credentials tenants have no refresh token; TE issues one credential
    // set per customer org for this flow and calls run "As Admin".
    const fresh = await this.#requestToken({ grant_type: 'client_credentials' });
    return fresh.accessToken;
  }

  async #call(method, path, body) {
    const token = await this.accessToken();
    const res = await this.#fetch(`${this.#host}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const parsed = await res.json().catch(() => null);
    if (!res.ok) throw new TotalExpertError(res.status, parsed);
    return parsed;
  }

  /**
   * Upsert the consumer as a Contact.
   *
   * When running "As Admin" (client-credentials), TE requires an owner. We use
   * the ReadyIQ LO id as TE's `owner.external_id`, which is exactly the field
   * that keeps ReadyIQ's attribution promise intact inside the lender's CRM.
   * Deduplication in TE is per-user, not org-wide.
   */
  upsertContact({ identity, status, requiredGroups = [] }) {
    return this.#call('POST', '/v1/contacts', {
      first_name: identity.first_name,
      last_name: identity.last_name,
      email: identity.email,
      mobile: identity.mobile,
      external_id: status.consumer_ref,
      owner: status.attribution?.lo ? { external_id: status.attribution.lo } : undefined,
      groups: requiredGroups.length ? requiredGroups : undefined,
    });
  }

  /**
   * Record a readiness_status as a survey response.
   *
   * Surveys are the right home for this rather than custom fields: TE has to
   * create custom fields by hand for each customer, whereas surveys are
   * self-service, repeatable, and usable as Journey conditions. Each submission
   * appends instead of overwriting, so the survey history becomes the audit
   * trail of the consumer's journey.
   */
  submitStatusSurvey({ contactId, surveyId, questionIds, status }) {
    const answers = Object.entries(surveyAnswers(status))
      .filter(([key]) => questionIds[key])
      .map(([key, value]) => ({ question_id: questionIds[key], answer: value }));
    return this.#call('POST', `/v1/surveys/${surveyId}/responses`, { contact_id: contactId, answers });
  }

  /** Fire the insight that drives the lender's Journey. */
  createInsight({ contactId, eventType, description }) {
    const type = INSIGHT_TYPES[eventType];
    if (!type) throw new RangeError(`no Total Expert insight type mapped for "${eventType}"`);
    return this.#call('POST', '/v1/insights', {
      contact_id: contactId,
      insight_type: type,
      description: description ?? '',
    });
  }
}

/** readiness_status → flat survey answers. */
export function surveyAnswers(status) {
  return {
    pathway: status.pathway ?? '',
    stage: status.stage ?? '',
    round: status.round?.n != null ? `${status.round.n} of ~${status.round.of ?? '?'}` : '',
    next_milestone: status.next_milestone ?? '',
    review_requested: status.flags?.review_requested ? 'Yes' : 'No',
    protect_mode: status.flags?.protect_mode ? 'On' : 'Off',
    loan_officer: status.attribution?.lo ?? '',
    source: status.attribution?.source ?? '',
    last_activity: status.last_activity_at ?? '',
  };
}

/**
 * The survey ReadyIQ asks TE to create once per customer org.
 * Ship this as the definition in the partner onboarding packet.
 */
export const READYIQ_SURVEY_DEFINITION = Object.freeze({
  name: 'ReadyIQ Readiness Status',
  description: 'Credit-readiness status from ReadyIQ. Status only — never a credit report.',
  questions: [
    { key: 'pathway', label: 'Pathway', type: 'text' },
    { key: 'stage', label: 'Stage', type: 'text' },
    { key: 'round', label: 'Round', type: 'text' },
    { key: 'next_milestone', label: 'Next milestone', type: 'text' },
    { key: 'review_requested', label: 'Review requested', type: 'text' },
    { key: 'protect_mode', label: 'Protect Mode', type: 'text' },
    { key: 'loan_officer', label: 'Originating loan officer', type: 'text' },
    { key: 'source', label: 'Source', type: 'text' },
    { key: 'last_activity', label: 'Last activity', type: 'text' },
  ],
});
