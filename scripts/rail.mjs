// scripts/rail.mjs — run the referral rail locally: node scripts/rail.mjs  (PORT=4630)
import { createRailServer } from '../server/http.js';
import { ReferralLog } from '../server/referral.js';
import { ConnectionManager } from '../server/connections.js';
import { Dispatcher } from '../server/dispatch.js';
import { fixtures } from '../src/state.js';
import { JsonStore } from '../server/store.js';
import { join } from 'node:path';

const DATA = process.env.READYIQ_DATA_DIR || join(process.cwd(), 'data');
const stateStore = new JsonStore(join(DATA, 'state.json'));
const state = stateStore.load(null) ?? fixtures();
const connections = new ConnectionManager({ dispatcher: new Dispatcher() });
const secrets = { zapierToken: process.env.READYIQ_ZAPIER_TOKEN, csvToken: process.env.READYIQ_CSV_TOKEN, disputechatSecret: process.env.READYIQ_DISPUTECHAT_SECRET };
const server = createRailServer({ state, lender: state.lender, secretsFor: () => secrets, connections, log: new ReferralLog({ store: new JsonStore(join(DATA, 'referrals.json')) }), stateStore });
const port = Number(process.env.PORT || 4630);
server.listen(port, () => console.log(`ReadyIQ rail on http://localhost:${port}  (tenant=${state.lender.id}, data=${DATA})`));
