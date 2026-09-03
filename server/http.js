// server/http.js — the rail's HTTP surface. node:http only; no framework, so it runs anywhere Node runs.
import { createServer } from 'node:http';
import { receiveInbound } from './inbound.js';
import { buildReferral, ReferralNotCompliant } from './referral.js';
import { buildEvent } from './events.js';
import { getConsumer, recordReviewOutcome } from '../src/state.js';

const MAX_BODY = 256 * 1024;
const HARD_CAP = 4 * 1024 * 1024; // beyond this, stop reading and drop the connection

export function createRailServer({ state, lender, secretsFor = () => ({}), connections, log }) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const tenantId = url.searchParams.get('tenant');
    const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };

    let rawBody = '';
    try { rawBody = await readBody(req); } catch { res.setHeader('connection', 'close'); return send(413, { error: 'body_too_large' }); }

    const m = (method, pattern) => req.method === method && url.pathname.match(pattern);
    let match;

    if ((match = m('POST', /^\/v1\/inbound\/([a-z_]+)$/))) {
      const out = await receiveInbound({ source: match[1], tenantId, headers: req.headers, rawBody, state, lender, secrets: secretsFor(tenantId), connections });
      return send(out.status, out);
    }

    if (m('POST', /^\/v1\/referrals$/)) {
      if (!tenantId) return send(400, { error: 'tenant_required' });
      let body; try { body = JSON.parse(rawBody || '{}'); } catch { return send(400, { error: 'bad_json' }); }
      const consumer = getConsumer(state, body.consumerId);
      if (!consumer) return send(404, { error: 'unknown_consumer' });
      let referral;
      try { referral = buildReferral({ direction: body.direction, from: body.from, to: body.to, consumer, lender, consent: body.consent }); }
      catch (err) { return send(err instanceof ReferralNotCompliant ? 422 : 400, { error: err.message }); }
      log.record(referral, { tenantId });
      const type = referral.direction === 'cr_to_lo' ? 'referral.sent_to_lo' : 'referral.sent_to_cr';
      await connections.broadcast(tenantId, buildEvent({ type, tenantId, status: referral.summary, occurredAt: referral.created_at }));
      return send(201, referral);
    }

    if (m('GET', /^\/v1\/referrals$/)) {
      if (!tenantId) return send(400, { error: 'tenant_required' });
      return send(200, log.list({ tenantId }).map((e) => ({ ...e.referral, outcome: e.outcome })));
    }

    if ((match = m('POST', /^\/v1\/referrals\/([\w-]+)\/outcome$/))) {
      if (!tenantId) return send(400, { error: 'tenant_required' });
      let body; try { body = JSON.parse(rawBody || '{}'); } catch { return send(400, { error: 'bad_json' }); }
      const existing = log.get(match[1]);
      if (!existing || existing.tenantId !== tenantId) return send(404, { error: 'not_found' });
      let entry; try { entry = log.setOutcome(match[1], body); } catch (err) { return send(/not found/.test(err.message) ? 404 : 422, { error: err.message }); }
      recordReviewOutcome(state, entry.referral.consumer_ref.replace(/^c_/, ''), body);
      await connections.broadcast(tenantId, buildEvent({ type: 'review.outcome_recorded', tenantId, status: entry.referral.summary }));
      return send(200, { ...entry.referral, outcome: entry.outcome });
    }

    if (m('GET', /^\/v1\/precision$/)) {
      if (!tenantId) return send(400, { error: 'tenant_required' });
      return send(200, log.precision(tenantId));
    }

    return send(404, { error: 'not_found' });
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''; let size = 0; let tooLarge = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > HARD_CAP) { req.destroy(); reject(new Error('too large')); return; }
      if (size > MAX_BODY) { tooLarge = true; return; }   // keep draining, stop keeping
      data += chunk;
    });
    req.on('end', () => (tooLarge ? reject(new Error('too large')) : resolve(data)));
    req.on('error', reject);
  });
}
