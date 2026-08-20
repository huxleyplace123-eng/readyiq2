// vault.js — per-tenant, per-connector encrypted credential storage.
//
// Five of the six platforms issue credentials scoped to (partner × lender), not
// to partner. Encompass says it outright: "An ISV partner who is engaged with
// multiple lenders will have separate API keys for each partner/lender pair."
// Total Expert's client-credentials flow is the same shape, and the Salesforce
// customer-owned Connected App path is too.
//
// So the unit of storage is (tenantId, connectorId) → secret bundle. There is
// no such thing as "the Encompass key" — only "Summit Home Loans' Encompass
// key". Building anything else means rewriting it at the second customer.
//
// AES-256-GCM with a per-record random IV. The master key comes from
// READYIQ_VAULT_KEY (64 hex chars). Values are never logged, never returned in
// list operations, and only leave through openCredentials().

import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

export class VaultKeyMissing extends Error {
  constructor() {
    super('READYIQ_VAULT_KEY is not set (expected 64 hex characters)');
    this.name = 'VaultKeyMissing';
  }
}

export class CredentialsNotFound extends Error {
  constructor(tenantId, connectorId) {
    super(`no credentials for ${connectorId} on tenant ${tenantId}`);
    this.name = 'CredentialsNotFound';
  }
}

function masterKey(env = process.env) {
  const hex = env.READYIQ_VAULT_KEY;
  if (typeof hex !== 'string' || !/^[0-9a-f]{64}$/i.test(hex)) throw new VaultKeyMissing();
  return Buffer.from(hex, 'hex');
}

/** Generate a master key. Operator runs this once and stores the output as a secret. */
export function generateVaultKey() {
  return randomBytes(KEY_BYTES).toString('hex');
}

export function seal(plainObject, env = process.env) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, masterKey(env), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(plainObject), 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), body.toString('base64')].join('.');
}

export function open(sealed, env = process.env) {
  if (typeof sealed !== 'string') throw new TypeError('sealed credential must be a string');
  const [ivB64, tagB64, bodyB64] = sealed.split('.');
  if (!ivB64 || !tagB64 || !bodyB64) throw new Error('malformed sealed credential');
  const decipher = createDecipheriv(ALGO, masterKey(env), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plain = Buffer.concat([decipher.update(Buffer.from(bodyB64, 'base64')), decipher.final()]);
  return JSON.parse(plain.toString('utf8'));
}

/**
 * An in-memory vault with the storage interface a real one must implement.
 *
 * Swap `store` for a database table with columns
 * (tenant_id, connector_id, sealed, hint, version, created_at, updated_at)
 * and nothing else in this file changes.
 */
export class CredentialVault {
  #store = new Map();
  #env;

  constructor({ env = process.env } = {}) {
    this.#env = env;
  }

  static #key(tenantId, connectorId) {
    return `${tenantId}::${connectorId}`;
  }

  /**
   * @param {string} tenantId
   * @param {string} connectorId
   * @param {object} secrets    e.g. { clientId, clientSecret } or { apiKey }
   * @param {object} [meta]     non-secret fields safe to display (instanceId, hostname)
   */
  put(tenantId, connectorId, secrets, meta = {}) {
    if (!tenantId || !connectorId) throw new TypeError('tenantId and connectorId required');
    if (!secrets || typeof secrets !== 'object') throw new TypeError('secrets object required');
    const key = CredentialVault.#key(tenantId, connectorId);
    const previous = this.#store.get(key);
    const record = {
      tenantId,
      connectorId,
      sealed: seal(secrets, this.#env),
      hint: hintFor(secrets),
      meta,
      version: (previous?.version ?? 0) + 1,
      createdAt: previous?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.#store.set(key, record);
    return this.describe(tenantId, connectorId);
  }

  /** The only path that yields plaintext. */
  openCredentials(tenantId, connectorId) {
    const record = this.#store.get(CredentialVault.#key(tenantId, connectorId));
    if (!record) throw new CredentialsNotFound(tenantId, connectorId);
    return open(record.sealed, this.#env);
  }

  has(tenantId, connectorId) {
    return this.#store.has(CredentialVault.#key(tenantId, connectorId));
  }

  /** Safe to render in a UI or a log line — never contains a secret. */
  describe(tenantId, connectorId) {
    const record = this.#store.get(CredentialVault.#key(tenantId, connectorId));
    if (!record) return null;
    const { sealed, ...safe } = record;
    return safe;
  }

  listForTenant(tenantId) {
    return [...this.#store.values()]
      .filter((r) => r.tenantId === tenantId)
      .map((r) => this.describe(r.tenantId, r.connectorId));
  }

  revoke(tenantId, connectorId) {
    return this.#store.delete(CredentialVault.#key(tenantId, connectorId));
  }
}

/** A displayable fingerprint: last four of the longest secret, nothing more. */
function hintFor(secrets) {
  const longest = Object.values(secrets)
    .filter((v) => typeof v === 'string')
    .sort((a, b) => b.length - a.length)[0];
  return longest ? `••••${longest.slice(-4)}` : '••••';
}

/** Constant-time compare for inbound webhook signature verification. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
