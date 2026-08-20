import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CredentialVault, generateVaultKey, seal, open, safeEqual, VaultKeyMissing, CredentialsNotFound,
} from '../server/vault.js';
import { isSafeDeliveryUrl } from '../server/safe-url.js';

const env = { READYIQ_VAULT_KEY: generateVaultKey() };

test('a sealed bundle round-trips', () => {
  const secrets = { clientId: 'abc', clientSecret: 'shhh', instanceId: 'BE11223344' };
  assert.deepEqual(open(seal(secrets, env), env), secrets);
});

test('sealing twice produces different ciphertext', () => {
  const secrets = { apiKey: 'k' };
  assert.notEqual(seal(secrets, env), seal(secrets, env));
});

test('a tampered ciphertext fails the auth tag rather than decrypting', () => {
  const sealed = seal({ apiKey: 'k' }, env);
  const [iv, tag, body] = sealed.split('.');
  const flipped = Buffer.from(body, 'base64');
  flipped[0] ^= 0xff;
  assert.throws(() => open([iv, tag, flipped.toString('base64')].join('.'), env));
});

test('a different master key cannot open the bundle', () => {
  const sealed = seal({ apiKey: 'k' }, env);
  assert.throws(() => open(sealed, { READYIQ_VAULT_KEY: generateVaultKey() }));
});

test('a missing or malformed master key is a loud failure', () => {
  assert.throws(() => seal({ a: 1 }, {}), VaultKeyMissing);
  assert.throws(() => seal({ a: 1 }, { READYIQ_VAULT_KEY: 'too-short' }), VaultKeyMissing);
});

// Five of six platforms issue credentials per partner/lender pair. If the vault
// were keyed on connector alone, the second customer would overwrite the first.
test('credentials are isolated per tenant for the same connector', () => {
  const vault = new CredentialVault({ env });
  vault.put('summit', 'encompass', { clientId: 'a', clientSecret: 's1', instanceId: 'BE1' });
  vault.put('harbor', 'encompass', { clientId: 'b', clientSecret: 's2', instanceId: 'BE2' });

  assert.equal(vault.openCredentials('summit', 'encompass').instanceId, 'BE1');
  assert.equal(vault.openCredentials('harbor', 'encompass').instanceId, 'BE2');
});

test('describe is safe to render and log — it never contains a secret', () => {
  const vault = new CredentialVault({ env });
  vault.put('summit', 'shape', { apiKey: 'sk_live_supersecret_1234' });

  const described = vault.describe('summit', 'shape');
  const serialised = JSON.stringify(described);
  assert.doesNotMatch(serialised, /supersecret/);
  assert.doesNotMatch(serialised, /sealed/);
  assert.equal(described.hint, '••••1234');
  assert.equal(described.version, 1);
});

test('re-putting bumps the version and keeps the original creation time', () => {
  const vault = new CredentialVault({ env });
  vault.put('summit', 'shape', { apiKey: 'one' });
  const first = vault.describe('summit', 'shape');
  const second = vault.put('summit', 'shape', { apiKey: 'two' });

  assert.equal(second.version, 2);
  assert.equal(second.createdAt, first.createdAt);
  assert.equal(vault.openCredentials('summit', 'shape').apiKey, 'two');
});

test('revoking makes the credentials unopenable', () => {
  const vault = new CredentialVault({ env });
  vault.put('summit', 'shape', { apiKey: 'k' });
  assert.equal(vault.revoke('summit', 'shape'), true);
  assert.throws(() => vault.openCredentials('summit', 'shape'), CredentialsNotFound);
});

test('safeEqual compares without leaking length-independent timing', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
});

test('delivery URLs reject the SSRF classics', () => {
  const blocked = [
    'http://hooks.example.com/x',           // plain http
    'https://localhost/x',
    'https://127.0.0.1/x',
    'https://[::1]/x',
    'https://169.254.169.254/latest/meta-data',  // cloud metadata
    'https://10.0.0.5/x',
    'https://172.16.4.4/x',
    'https://192.168.1.10/x',
    'https://100.64.0.1/x',                 // CGNAT
    'https://user:pass@hooks.example.com/x',
    'https://::ffff:127.0.0.1/x',
    'https://vault.internal/x',
    'not-a-url',
    '',
  ];
  for (const url of blocked) assert.equal(isSafeDeliveryUrl(url), false, url);
});

test('a normal HTTPS endpoint is allowed', () => {
  for (const url of ['https://hooks.zapier.com/hooks/catch/123/abc', 'https://crm.summithomeloans.com/readyiq']) {
    assert.equal(isSafeDeliveryUrl(url), true, url);
  }
});

test('localhost is allowed only when a caller explicitly opts in', () => {
  assert.equal(isSafeDeliveryUrl('http://localhost:4620/hook'), false);
  assert.equal(isSafeDeliveryUrl('http://localhost:4620/hook', { allowLocalhost: true }), true);
});
