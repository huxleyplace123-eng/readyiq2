// connectors/salesforce.js — Salesforce, via a CUSTOMER-OWNED Connected App.
//
// The path matters more than the code. Two ways to integrate:
//
//   Customer-owned Connected App  the lender creates the app in their own org
//                                 and hands us the consumer key/secret. No ISV
//                                 programme, no security review, no fee, and
//                                 Salesforce's May 2026 connected-app mandate
//                                 does not apply because we do not own the key.
//
//   Managed package on AppExchange  $999 per submission, 6-9 weeks for the
//                                 first pass, 2-3 weeks per resubmission, and
//                                 roughly half of first submissions fail.
//
// This adapter takes the first path. Revisit the second only when enough
// Salesforce lenders exist that per-org onboarding actually hurts.
//
// Every lender's org is customised, so field names are configured per tenant
// rather than hard-coded. `DEFAULT_FIELD_MAP` is a starting point that assumes
// custom fields named ReadyIQ_*__c; a tenant who names them differently edits
// the map instead of the code.

export const DEFAULT_FIELD_MAP = Object.freeze({
  consumer_ref: 'ReadyIQ_Consumer_Ref__c',
  pathway: 'ReadyIQ_Pathway__c',
  stage: 'ReadyIQ_Stage__c',
  round: 'ReadyIQ_Round__c',
  next_milestone: 'ReadyIQ_Next_Milestone__c',
  review_requested: 'ReadyIQ_Review_Requested__c',
  protect_mode: 'ReadyIQ_Protect_Mode__c',
  last_activity_at: 'ReadyIQ_Last_Activity__c',
  loan_officer: 'ReadyIQ_Loan_Officer__c',
});

export class SalesforceError extends Error {
  constructor(status, body) {
    super(`Salesforce API ${status}: ${typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)}`);
    this.name = 'SalesforceError';
    this.status = status;
    this.body = body;
    this.retryable = status === 429 || status >= 500;
  }
}

export class SalesforceConnector {
  #creds; #fetch; #fieldMap; #token = null; #now; #apiVersion;

  /**
   * @param {object} args
   * @param {{instanceUrl:string, clientId:string, clientSecret:string, refreshToken?:string}} args.credentials
   * @param {Record<string,string>} [args.fieldMap]
   */
  constructor({ credentials, fieldMap = DEFAULT_FIELD_MAP, apiVersion = 'v61.0', fetch: fetchImpl = globalThis.fetch, now = () => Date.now() } = {}) {
    for (const key of ['instanceUrl', 'clientId', 'clientSecret']) {
      if (!credentials?.[key]) throw new TypeError(`Salesforce ${key} required`);
    }
    this.#creds = credentials;
    this.#fetch = fetchImpl;
    this.#fieldMap = fieldMap;
    this.#apiVersion = apiVersion;
    this.#now = now;
  }

  async accessToken() {
    if (this.#token && this.#token.expiresAt > this.#now() + 60_000) return this.#token.value;
    if (!this.#creds.refreshToken) throw new Error('no refresh token — complete the OAuth consent for this org first');

    const res = await this.#fetch(`${this.#creds.instanceUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.#creds.clientId,
        client_secret: this.#creds.clientSecret,
        refresh_token: this.#creds.refreshToken,
      }).toString(),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new SalesforceError(res.status, body);

    // Salesforce refresh grants do not return expires_in; the session TTL is an
    // org setting. Two hours is a safe assumption, and a 401 re-auths anyway.
    this.#token = { value: body.access_token, expiresAt: this.#now() + 2 * 3600 * 1000 };
    return this.#token.value;
  }

  async #call(method, path, body) {
    const token = await this.accessToken();
    const res = await this.#fetch(`${this.#creds.instanceUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 204) return null;
    const parsed = await res.json().catch(() => null);
    if (!res.ok) throw new SalesforceError(res.status, parsed);
    return parsed;
  }

  /**
   * Upsert by external id — the idempotent write Salesforce is good at, and the
   * reason `consumer_ref` is worth registering as an External Id field.
   */
  upsertContact({ status, identity, sobject = 'Contact' }) {
    const externalIdField = this.#fieldMap.consumer_ref;
    return this.#call(
      'PATCH',
      `/services/data/${this.#apiVersion}/sobjects/${sobject}/${externalIdField}/${encodeURIComponent(status.consumer_ref)}`,
      mapToSalesforceFields(status, identity, this.#fieldMap),
    );
  }

  describe(sobject = 'Contact') {
    return this.#call('GET', `/services/data/${this.#apiVersion}/sobjects/${sobject}/describe`);
  }

  /** Confirm the tenant actually created the custom fields before we write. */
  async verifyFieldMap(sobject = 'Contact') {
    const described = await this.describe(sobject);
    const present = new Set((described?.fields ?? []).map((f) => f.name));
    const missing = Object.values(this.#fieldMap).filter((name) => !present.has(name));
    return { ok: missing.length === 0, missing };
  }
}

export function mapToSalesforceFields(status, identity = {}, fieldMap = DEFAULT_FIELD_MAP) {
  return {
    FirstName: identity.first_name ?? undefined,
    LastName: identity.last_name ?? undefined,
    Email: identity.email ?? undefined,
    MobilePhone: identity.mobile ?? undefined,

    [fieldMap.pathway]: status.pathway ?? null,
    [fieldMap.stage]: status.stage ?? null,
    [fieldMap.round]: status.round?.n != null ? `${status.round.n} of ~${status.round.of ?? '?'}` : null,
    [fieldMap.next_milestone]: status.next_milestone ?? null,
    [fieldMap.review_requested]: Boolean(status.flags?.review_requested),
    [fieldMap.protect_mode]: Boolean(status.flags?.protect_mode),
    [fieldMap.last_activity_at]: status.last_activity_at ?? null,
    [fieldMap.loan_officer]: status.attribution?.lo ?? null,
  };
}
