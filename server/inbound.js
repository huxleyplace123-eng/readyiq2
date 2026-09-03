// server/inbound.js — one entry point for every credit-repair-side source: verify → normalize → apply → broadcast.
import { buildStatusObject, buildIdentity } from './status-object.js';
import { buildEvent } from './events.js';
import { PARTNER_PLATFORMS } from './partners/registry.js';
import { applyPartnerUpdate } from './partners/normalize.js';
import { parseCsv } from './partners/csv.js';
import { verifyZapierToken, fromZapier } from './partners/zapier.js';
import { verifyDisputeChat, fromDisputeChat } from './partners/disputechat.js';
import { fromCreditRepairCloud, PartnerNotAvailable } from './partners/credit-repair-cloud.js';
import { fromDisputeFox } from './partners/disputefox.js';

export async function receiveInbound({ source, tenantId, headers = {}, rawBody = '', state, lender, secrets = {}, connections }) {
  const def = PARTNER_PLATFORMS[source];
  if (!def) return { ok: false, status: 404, error: 'unknown_source' };
  if (!tenantId) return { ok: false, status: 400, error: 'tenant_required' };

  let updates;
  try {
    switch (source) {
      case 'csv':
        updates = parseCsv(rawBody); break;
      case 'zapier':
        if (!verifyZapierToken(headers, secrets.zapierToken)) return { ok: false, status: 401, error: 'unauthorized' };
        updates = [fromZapier(JSON.parse(rawBody || '{}'))]; break;
      case 'disputechat':
        if (!verifyDisputeChat(headers, rawBody, secrets.disputechatSecret)) return { ok: false, status: 401, error: 'unauthorized' };
        updates = [fromDisputeChat(JSON.parse(rawBody || '{}'))]; break;
      case 'credit_repair_cloud':
        updates = [fromCreditRepairCloud(JSON.parse(rawBody || '{}'))]; break;
      case 'disputefox':
        updates = [fromDisputeFox(JSON.parse(rawBody || '{}'))]; break;
      default:
        return { ok: false, status: 404, error: 'unknown_source' };
    }
  } catch (err) {
    if (err instanceof PartnerNotAvailable) return { ok: false, status: 501, error: 'not_implemented', blockedOn: err.blockedOn, workaround: err.workaround };
    return { ok: false, status: 400, error: err?.message ?? String(err) };
  }

  const applied = [];
  const delivered = [];
  for (const update of updates) {
    let out;
    try { out = applyPartnerUpdate(state, update, { lender }); }
    catch (err) { applied.push({ consumer_ref: update.consumer_ref, error: err.message }); continue; }
    applied.push({ consumer_ref: update.consumer_ref, before: out.before, after: out.after, events: out.events });
    for (const type of out.events) {
      const status = buildStatusObject(out.consumer, { lender, occurredAt: update.occurred_at });
      const event = buildEvent({ type, tenantId, status, occurredAt: update.occurred_at });
      delivered.push(await connections.broadcast(tenantId, event, { identity: buildIdentity(out.consumer) }));
    }
  }
  return { ok: true, status: 200, applied, delivered };
}
