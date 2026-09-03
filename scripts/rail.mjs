// scripts/rail.mjs — run the referral rail locally: node scripts/rail.mjs  (PORT=4630)
import { createRailServer } from '../server/http.js';
import { ReferralLog } from '../server/referral.js';
import { ConnectionManager } from '../server/connections.js';
import { Dispatcher } from '../server/dispatch.js';
import { fixtures } from '../src/state.js';

const state = fixtures();
const connections = new ConnectionManager({ dispatcher: new Dispatcher() });
const secrets = { zapierToken: process.env.READYIQ_ZAPIER_TOKEN, disputechatSecret: process.env.READYIQ_DISPUTECHAT_SECRET };
const server = createRailServer({ state, lender: state.lender, secretsFor: () => secrets, connections, log: new ReferralLog() });
const port = Number(process.env.PORT || 4630);
server.listen(port, () => console.log(`ReadyIQ rail on http://localhost:${port}  (tenant=${state.lender.id})`));
