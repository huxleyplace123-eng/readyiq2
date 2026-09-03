import test from 'node:test';
import assert from 'node:assert/strict';
import { PARTNER_PLATFORMS, PARTNER_IDS, getPartner, partnerLevel, partnersByLevel } from '../server/partners/registry.js';

test('the ladder is L0 csv, L1 zapier, L2 natives — and only DisputeChat is buildable today', () => {
  assert.deepEqual(partnersByLevel(), { 0: ['csv'], 1: ['zapier'], 2: ['disputechat', 'credit_repair_cloud', 'disputefox'] });
  assert.equal(partnerLevel('zapier'), 1);
  assert.equal(getPartner('disputechat').accessModel, 'self_serve');
  for (const id of ['credit_repair_cloud', 'disputefox']) {
    assert.equal(getPartner(id).accessModel, 'developer_signup', id);
    assert.ok(getPartner(id).blockedOn, `${id} must say what it is blocked on`);
    assert.equal(getPartner(id).implemented, false);
  }
  assert.throws(() => getPartner('credit_karma'), /unknown partner/);
  assert.ok(PARTNER_IDS.includes('csv'));
  for (const id of PARTNER_IDS) assert.equal(PARTNER_PLATFORMS[id].kind, 'credit_repair', id);
});
