# ReadyIQ 2 — Stage 1 (Consumer Experience) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the lender-branded consumer experience of the ReadyIQ 2 prototype — front door (`check/`), 3-screen enrollment (`enroll/`), and the client portal (`portal/`) — as a multi-page static site with tested pure logic and deterministic fixtures.

**Architecture:** Static multi-page site under `site/` (no framework, no build). Pure logic (fixtures, state machine, pathway rules, clock/DTI math, attribution) lives in `site/assets/js/state.js` as ESM exports that run in both Node (tests) and the browser (pages). Pages are `index.html` files that import small `page-*.js` modules; shared visuals come from a token-driven CSS design system and two components (`path.js`, `ui.js`). Persistent demo state sits in `localStorage["readyiq2:v1"]`.

**Tech Stack:** HTML, CSS (custom properties), vanilla ES modules, Node 20+ (`node --test`, static server). No runtime dependencies.

## Global Constraints

- Lives at `C:/Users/adamn/readyiq2/` — its own git repo, **outside dchub**. Never write into dchub except the `.claude/launch.json` preview entry.
- **Light theme only.** Consumer pages wear the lender brand (`data-brand="harbor"`); ReadyIQ chrome uses IDIQ tokens (navy `#12384F`, orange `#F27124`, off-white `#F1F4F6`, grey `#9BA6AD`).
- **Font:** Geist variable (300–700) embedded as data-URI `@font-face` extracted from `C:/Users/adamn/readyiq/readyiq.html`. Base font size 15px (owner's display is 1.25 DPR).
- **Routes are static-hosting-safe:** folders + `?c=` query + `#hash` sections; **relative URLs only** (`../portal/`, `../assets/...`).
- **Honesty copy (verbatim where quoted):** headline number is MyScoreIQ FICO® with caption `FICO® Score — not the mortgage-industry version lenders pull. A guide, not a preapproval.` Every consumer screen carries `You can apply for a mortgage at any time — this is not required.` No score-lift claims. No promises of deletions/points/approvals/timelines. No pricing anywhere.
- **Every tool surface names its engine** with a small caption: `Powered by MyScoreIQ` or `Powered by CreditBuilderIQ` (identity verification: `Powered by IDIQ`).
- Prototype "today" is `2026-08-18`. `?reset=1` restores fixtures; `?dev=1` shows the role/consumer switcher.
- Verify visually at 375 / 768 / 1280 with the Browser preview tools; console must be clean.
- Commit after every task with a conventional message.

---

## File structure

```
readyiq2/
  .gitattributes                      text=auto eol=lf
  package.json                        {type:module, scripts: test/serve}
  serve.mjs                           static server → ./site on :4620 (dir → index.html)
  README.md
  docs/specs/2026-08-18-readyiq2-design.md   (exists)
  docs/plans/2026-08-18-readyiq2-stage1-consumer.md (this)
  test/state.test.mjs                 node:test over state.js
  site/
    assets/fonts/geist.css            @font-face (data URI) — extracted from v1
    assets/css/tokens.css             all custom properties + brand scopes
    assets/css/base.css               reset, type, layout primitives, utilities
    assets/css/components.css         buttons, inputs, cards, chips, badges, banner, sheet, toast, number, status card, next action, clock ring, path
    assets/js/state.js                fixtures + store + rules + transitions (pure, testable)
    assets/js/path.js                 renderPath()
    assets/js/ui.js                   el(), applyBrand(), countUp(), sheet(), toast(), engineTag(), initDev(), fmt helpers
    assets/js/page-check.js
    assets/js/page-enroll.js
    assets/js/page-portal.js
    dev/index.html                    components gallery (dev aid, not linked)
    check/index.html
    enroll/index.html
    portal/index.html
```

---

### Task 1: Scaffold repo, server, fonts, preview entry

**Files:**
- Create: `readyiq2/.gitattributes`, `readyiq2/package.json`, `readyiq2/serve.mjs`, `readyiq2/README.md`, `readyiq2/site/assets/fonts/geist.css`, `readyiq2/site/index.html` (temporary placeholder linking to `check/`)
- Modify: `readyiq2/docs/specs/2026-08-18-readyiq2-design.md` (font decision: Manrope → Geist)
- Modify: `C:/Users/adamn/dchub/.claude/launch.json` (add `readyiq2` entry)

**Interfaces:**
- Produces: `node serve.mjs` serving `site/` at `http://localhost:4620/`; `assets/fonts/geist.css` defining `font-family:"Geist"`.

- [ ] **Step 1: Write `.gitattributes`, `package.json`, `serve.mjs`**

```
* text=auto eol=lf
```

```json
{
  "name": "readyiq2",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/",
    "serve": "node serve.mjs"
  }
}
```

```js
// serve.mjs — tiny static server for ./site (no deps). Directory → index.html.
import http from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'site');
const PORT = Number(process.env.PORT || 4620);
const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.woff2':'font/woff2' };

http.createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path.endsWith('/')) path += 'index.html';
  let file = join(ROOT, path);
  if (existsSync(file) && statSync(file).isDirectory()) { res.writeHead(301, { Location: path + '/' }); return res.end(); }
  if (!existsSync(file)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found: ' + path); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`ReadyIQ 2 → http://localhost:${PORT}/`));
```

- [ ] **Step 2: Extract Geist from v1 into `site/assets/fonts/geist.css`**

Run (from `readyiq2/`):
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('C:/Users/adamn/readyiq/readyiq.html','utf8');const i=s.indexOf('@font-face');const j=s.indexOf('}',i);fs.mkdirSync('site/assets/fonts',{recursive:true});fs.writeFileSync('site/assets/fonts/geist.css',s.slice(i,j+1)+'\n');console.log(fs.statSync('site/assets/fonts/geist.css').size)"
```
Expected: prints ~39400.

- [ ] **Step 3: Placeholder `site/index.html`, README, spec correction, launch entry**

`site/index.html` (replaced in Stage 4):
```html
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ReadyIQ 2 — prototype</title><link rel="stylesheet" href="assets/fonts/geist.css"><style>body{font:15px/1.5 Geist,system-ui,sans-serif;margin:3rem auto;max-width:40rem;padding:0 1rem;color:#12384F}a{color:#0F766E}</style></head><body><h1>ReadyIQ 2 — prototype</h1><ul><li><a href="check/">Consumer front door (Harbor Home Loans)</a></li><li><a href="portal/">Client portal</a></li><li><a href="dev/">Components gallery</a></li></ul></body></html>
```

`README.md`: title, one-paragraph description (from spec §1), Run (`node serve.mjs` → http://localhost:4620), Test (`npm test`), Layout (the file tree above), Design constraints (light only; two brand layers; Geist; base 15px; relative URLs).

Spec edit: in §8 replace `Manrope (400/500/600/700/800) embedded as a data-URI @font-face copied from v1 (assets/fonts/manrope.css)` with `Geist variable (300–700) embedded as a data-URI @font-face copied from v1 (assets/fonts/geist.css)`; in §12 replace `Manrope stays (continuity with v1; already embedded).` with `Geist (v1 already embeds it as a 39 KB variable woff2; more "next-gen" than Manrope).`

`dchub/.claude/launch.json` — add to `configurations`:
```json
{ "name": "readyiq2", "runtimeExecutable": "node", "runtimeArgs": ["C:/Users/adamn/readyiq2/serve.mjs"], "port": 4620 }
```

- [ ] **Step 4: Verify server**

Run: `node serve.mjs &` then `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4620/` → `200`; `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4620/assets/fonts/geist.css` → `200`. Stop the background server afterwards (the preview tool will run it from now on).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold static site, server, Geist font, preview entry"
```

---

### Task 2: `state.js` — fixtures + store

**Files:**
- Create: `site/assets/js/state.js`
- Test: `test/state.test.mjs`

**Interfaces:**
- Produces (ESM exports): `TODAY`, `STORE_KEY`, `PATHWAYS`, `PATHWAY_LABELS`, `fixtures()`, `loadState()`, `saveState(state)`, `resetState()`, `getConsumer(state, id)`, `getLO(state, id)`, `getLender(state)`.
- Consumer shape (used by every later task):
  ```
  { id, first, last, email, mobile, loId, attribution:{lender,lo,source,partner,campaign},
    status, pathway, round, roundsEstimated, guardian, reviewRequestedAt, enrolledAt,
    score:{ value|null, prev|null, updated, bureaus:{experian,transunion,equifax} },
    credit:{ utilization, prevUtilization, tradelines, latesLast24mo, lastLateMonthsAgo|null,
             derogLast12mo, inquiriesLast6mo, monthlyDebts:[{name,payment}], collections:[{name,amount,paid}] },
    publicRecords:[{type:'chapter7'|'foreclosure'|'short_sale', date}],
    disputes:[{id,item,category,status,sentAt|null,dtiImpact|null}],
    rentReporting:{ linked, monthsAvailable, backfilled },
    income:number|null,
    deltas:[{points,cause}],           // sums to score.value - score.prev
    milestones:[{label,date|null,state:'done'|'current'|'upcoming'}],
    nextAction:{title,detail,lever,engine,href},
    alerts:[{type,text,date}],
    loanFile:{active,closingDate}|null }
  ```

- [ ] **Step 1: Write failing tests for fixtures + store**

```js
// test/state.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../site/assets/js/state.js';

test('fixtures: seven consumers, one per pathway story, all well-formed', () => {
  const f = S.fixtures();
  assert.equal(f.consumers.length, 7);
  for (const c of f.consumers) {
    for (const k of ['id','first','last','loId','status','pathway','round','roundsEstimated','score','credit','disputes','rentReporting','deltas','milestones','nextAction'])
      assert.ok(k in c, `${c.id} missing ${k}`);
    assert.ok(S.PATHWAYS.includes(c.pathway), `${c.id} bad pathway ${c.pathway}`);
    if (c.score.value != null && c.score.prev != null) {
      const sum = c.deltas.reduce((a, d) => a + d.points, 0);
      assert.equal(sum, c.score.value - c.score.prev, `${c.id} deltas must reconcile`);
    }
    assert.equal(c.milestones.filter(m => m.state === 'current').length, 1, `${c.id} exactly one current milestone`);
  }
  assert.ok(f.lender.floors.conventional === 640);
  assert.equal(f.session.role, 'consumer');
});

test('store: fixtures() returns fresh copies; loadState falls back to fixtures without localStorage', () => {
  const a = S.fixtures(), b = S.fixtures();
  a.consumers[0].first = 'Changed';
  assert.notEqual(b.consumers[0].first, 'Changed');
  const s = S.loadState();
  assert.equal(s.consumers.length, 7);
  assert.equal(S.getConsumer(s, 'maria').last, 'Delgado');
  assert.equal(S.getLO(s, 'sarah').nmls, '1234567');
  assert.equal(S.getLender(s).id, 'harbor');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` → FAIL (`Cannot find module .../state.js`).

- [ ] **Step 3: Write `state.js` — constants, fixtures, store**

```js
// site/assets/js/state.js — pure, runs in Node and the browser.
export const TODAY = '2026-08-18';
export const STORE_KEY = 'readyiq2:v1';
export const PATHWAYS = ['ready_now', 'near_ready', 'build', 'thin', 'dispute', 'dti'];
export const PATHWAY_LABELS = { ready_now: 'Ready Now', near_ready: 'Near Ready', build: 'Build Mode', thin: 'Thin Credit', dispute: 'Dispute Mode', dti: 'Debt Mode' };
export const STATUS_LABELS = { invited: 'Invited', consented: 'Consented', checked: 'Checked', active: 'Active', review_requested: 'Review requested', handed_off: 'With your lender', applied: 'Application in progress', funded: 'Funded', lost: 'Closed' };

const M = (label, date, state) => ({ label, date, state });

const FIXTURES = {
  lender: {
    id: 'harbor', name: 'Harbor Home Loans', site: 'harborhomeloans.com',
    brand: { primary: '#0F766E', soft: '#E6F4F1', ink: '#0F1B26' },
    floors: { fha: 620, conventional: 640, dpa: 660 }, floorDefault: 640,
    programs: [{ id: 'fha', name: 'FHA', floor: 620 }, { id: 'conventional', name: 'Conventional', floor: 640 }, { id: 'dpa', name: 'Harbor Down-Payment Assist', floor: 660 }],
  },
  los: [
    { id: 'sarah', first: 'Sarah', last: 'Miller', nmls: '1234567', states: ['CA', 'AZ', 'NV'], email: 'sarah@harborhomeloans.com', mobile: '(415) 555-0142', code: 'harbor-smiller' },
    { id: 'marcus', first: 'Marcus', last: 'Webb', nmls: '2345678', states: ['CA', 'OR'], email: 'marcus@harborhomeloans.com', mobile: '(415) 555-0177', code: 'harbor-mwebb' },
  ],
  partners: [{ id: 'dana', first: 'Dana', last: 'Kim', kind: 'agent', company: 'Bayline Realty', loId: 'sarah', code: 'harbor-dkim' }],
  links: {
    'harbor-smiller': { lender: 'harbor', lo: 'sarah', source: 'lo', partner: null, campaign: null },
    'harbor-mwebb': { lender: 'harbor', lo: 'marcus', source: 'lo', partner: null, campaign: null },
    'harbor-dkim': { lender: 'harbor', lo: 'sarah', source: 'agent', partner: 'dana', campaign: null },
    'harbor-spring': { lender: 'harbor', lo: 'sarah', source: 'campaign', partner: null, campaign: 'spring-reactivation' },
  },
  consumers: [
    { id: 'maria', first: 'Maria', last: 'Delgado', email: 'maria.d@example.com', mobile: '(510) 555-0119', loId: 'sarah',
      attribution: { lender: 'harbor', lo: 'sarah', source: 'lo', partner: null, campaign: null },
      status: 'active', pathway: 'build', round: 2, roundsEstimated: 5, guardian: false, reviewRequestedAt: null, enrolledAt: '2026-06-20',
      score: { value: 625, prev: 611, updated: '2026-08-14', bureaus: { experian: 628, transunion: 625, equifax: 619 } },
      credit: { utilization: 0.41, prevUtilization: 0.68, tradelines: 6, latesLast24mo: 2, lastLateMonthsAgo: 14, derogLast12mo: false, inquiriesLast6mo: 1,
        monthlyDebts: [{ name: 'Capital One', payment: 45 }, { name: 'Honda Financial', payment: 389 }, { name: 'Discover', payment: 60 }], collections: [] },
      publicRecords: [], disputes: [],
      rentReporting: { linked: false, monthsAvailable: 24, backfilled: false }, income: null,
      deltas: [{ points: 14, cause: 'Utilization down — Capital One paid to $210' }, { points: 6, cause: 'Lates aging — now 14 months old' }, { points: -6, cause: 'New inquiry — Honda Financial' }],
      milestones: [M('Enrolled', '2026-06-20', 'done'), M('Round 1 complete', '2026-07-20', 'done'), M('Utilization under 50%', '2026-08-02', 'done'), M('Round 2', null, 'current'), M('Utilization under 30%', null, 'upcoming'), M('12 clean months', '2026-10-15', 'upcoming'), M('Request review', null, 'upcoming')],
      nextAction: { title: 'Pay Capital One below 30% before the 22nd', detail: 'Your statement closes on the 22nd. Paying $95 more moves the whole card under 30% — the fastest lever you have this round.', lever: 'utilization', engine: 'CreditBuilderIQ', href: '#plan' },
      alerts: [], loanFile: null },
    { id: 'jordan', first: 'Jordan', last: 'Lee', email: 'jordan.lee@example.com', mobile: '(628) 555-0133', loId: 'sarah',
      attribution: { lender: 'harbor', lo: 'sarah', source: 'agent', partner: 'dana', campaign: null },
      status: 'active', pathway: 'thin', round: 1, roundsEstimated: 4, guardian: false, reviewRequestedAt: null, enrolledAt: '2026-08-05',
      score: { value: null, prev: null, updated: '2026-08-05', bureaus: { experian: null, transunion: null, equifax: null } },
      credit: { utilization: 0.12, prevUtilization: 0.12, tradelines: 2, latesLast24mo: 0, lastLateMonthsAgo: null, derogLast12mo: false, inquiriesLast6mo: 0,
        monthlyDebts: [{ name: 'Chime Credit Builder', payment: 0 }, { name: 'Verizon', payment: 85 }], collections: [] },
      publicRecords: [], disputes: [],
      rentReporting: { linked: true, monthsAvailable: 19, backfilled: false }, income: 5200,
      deltas: [],
      milestones: [M('Enrolled', '2026-08-05', 'done'), M('Bank linked', '2026-08-06', 'done'), M('Report 19 months of rent', null, 'current'), M('Add utilities', null, 'upcoming'), M('First score', null, 'upcoming'), M('Request review', null, 'upcoming')],
      nextAction: { title: 'Report your 19 months of rent', detail: 'We found 19 on-time rent payments in your linked bank account. Reporting them adds history to all three bureaus and builds the 12-month rent record lenders can use.', lever: 'thin-file', engine: 'CreditBuilderIQ', href: '#build' },
      alerts: [], loanFile: null },
    { id: 'denise', first: 'Denise', last: 'Alvarez', email: 'denise.a@example.com', mobile: '(925) 555-0161', loId: 'marcus',
      attribution: { lender: 'harbor', lo: 'marcus', source: 'lo', partner: null, campaign: null },
      status: 'active', pathway: 'near_ready', round: 3, roundsEstimated: 3, guardian: false, reviewRequestedAt: null, enrolledAt: '2026-05-28',
      score: { value: 634, prev: 621, updated: '2026-08-12', bureaus: { experian: 634, transunion: 638, equifax: 629 } },
      credit: { utilization: 0.34, prevUtilization: 0.52, tradelines: 8, latesLast24mo: 0, lastLateMonthsAgo: 31, derogLast12mo: false, inquiriesLast6mo: 0,
        monthlyDebts: [{ name: 'Discover', payment: 110 }, { name: 'Toyota Financial', payment: 412 }, { name: 'Navient', payment: 180 }], collections: [] },
      publicRecords: [], disputes: [],
      rentReporting: { linked: true, monthsAvailable: 24, backfilled: true }, income: 6900,
      deltas: [{ points: 13, cause: 'Utilization down — Discover paid from 52% to 34%' }],
      milestones: [M('Enrolled', '2026-05-28', 'done'), M('Round 1 complete', '2026-06-28', 'done'), M('Round 2 complete', '2026-07-28', 'done'), M('Round 3', null, 'current'), M('Cross 640', null, 'upcoming'), M('Request review', null, 'upcoming')],
      nextAction: { title: 'Take Discover from 34% to under 30%', detail: 'You are 6 points from Harbor\u2019s conventional floor. About $190 before the 22nd statement date is the shortest path.', lever: 'utilization', engine: 'CreditBuilderIQ', href: '#plan' },
      alerts: [], loanFile: null },
    { id: 'sam', first: 'Sam', last: 'Okafor', email: 'sam.okafor@example.com', mobile: '(510) 555-0184', loId: 'sarah',
      attribution: { lender: 'harbor', lo: 'sarah', source: 'campaign', partner: null, campaign: 'spring-reactivation' },
      status: 'active', pathway: 'dispute', round: 1, roundsEstimated: 4, guardian: false, reviewRequestedAt: null, enrolledAt: '2026-08-01',
      score: { value: 648, prev: 648, updated: '2026-08-01', bureaus: { experian: 651, transunion: 648, equifax: 644 } },
      credit: { utilization: 0.22, prevUtilization: 0.22, tradelines: 7, latesLast24mo: 0, lastLateMonthsAgo: null, derogLast12mo: false, inquiriesLast6mo: 1,
        monthlyDebts: [{ name: 'Navient (reported)', payment: 412 }, { name: 'Chase Sapphire', payment: 95 }, { name: 'Ally Auto', payment: 366 }],
        collections: [{ name: 'Midland Credit Mgmt (Comenity)', amount: 612, paid: false }] },
      publicRecords: [],
      disputes: [
        { id: 'd1', item: 'Navient shows $412/mo payment — loan is in in-school deferment, actual payment $0', category: 'payment_amount', status: 'sent', sentAt: '2026-08-06', dtiImpact: 412 },
        { id: 'd2', item: 'Midland collection duplicates the original Comenity account balance', category: 'duplicate', status: 'draft', sentAt: null, dtiImpact: null },
      ],
      rentReporting: { linked: false, monthsAvailable: 24, backfilled: false }, income: 7100,
      deltas: [],
      milestones: [M('Enrolled', '2026-08-01', 'done'), M('Disputes sent', '2026-08-06', 'current'), M('Bureau responses', null, 'upcoming'), M('Disputes resolved', null, 'upcoming'), M('Request review', null, 'upcoming')],
      nextAction: { title: 'Send the duplicate-collection dispute', detail: 'The Midland collection repeats a balance already on your Comenity account. Sending it now keeps both disputes on the same 30-day clock so they finish before your review.', lever: 'derogatories', engine: 'CreditBuilderIQ', href: '#disputes' },
      alerts: [], loanFile: null },
    { id: 'priya', first: 'Priya', last: 'Nair', email: 'priya.nair@example.com', mobile: '(650) 555-0107', loId: 'sarah',
      attribution: { lender: 'harbor', lo: 'sarah', source: 'lo', partner: null, campaign: null },
      status: 'review_requested', pathway: 'ready_now', round: 2, roundsEstimated: 2, guardian: false, reviewRequestedAt: '2026-08-17', enrolledAt: '2026-06-02',
      score: { value: 702, prev: 688, updated: '2026-08-10', bureaus: { experian: 706, transunion: 702, equifax: 699 } },
      credit: { utilization: 0.18, prevUtilization: 0.29, tradelines: 9, latesLast24mo: 0, lastLateMonthsAgo: null, derogLast12mo: false, inquiriesLast6mo: 0,
        monthlyDebts: [{ name: 'Amex', payment: 120 }, { name: 'SoFi student loan', payment: 240 }], collections: [] },
      publicRecords: [], disputes: [],
      rentReporting: { linked: true, monthsAvailable: 24, backfilled: true }, income: 8400,
      deltas: [{ points: 14, cause: 'Utilization down — Amex paid from 29% to 18%' }],
      milestones: [M('Enrolled', '2026-06-02', 'done'), M('Round 1 complete', '2026-07-02', 'done'), M('Crossed 640', '2026-07-30', 'done'), M('Review requested', '2026-08-17', 'current'), M('Lender review', null, 'upcoming')],
      nextAction: { title: 'Sarah has your packet', detail: 'You requested a review on Aug 17. Sarah Miller has been notified and will reach out to schedule. Keep balances where they are until you talk.', lever: 'review', engine: 'MyScoreIQ', href: '#review' },
      alerts: [], loanFile: null },
    { id: 'tom', first: 'Tom', last: 'Reyes', email: 'tom.reyes@example.com', mobile: '(408) 555-0122', loId: 'marcus',
      attribution: { lender: 'harbor', lo: 'marcus', source: 'lo', partner: null, campaign: null },
      status: 'applied', pathway: 'ready_now', round: 3, roundsEstimated: 3, guardian: true, reviewRequestedAt: '2026-07-20', enrolledAt: '2026-04-15',
      score: { value: 671, prev: 674, updated: '2026-08-16', bureaus: { experian: 671, transunion: 675, equifax: 668 } },
      credit: { utilization: 0.24, prevUtilization: 0.21, tradelines: 10, latesLast24mo: 0, lastLateMonthsAgo: null, derogLast12mo: false, inquiriesLast6mo: 1,
        monthlyDebts: [{ name: 'Chase Freedom', payment: 80 }, { name: 'Wells Fargo Auto', payment: 455 }], collections: [] },
      publicRecords: [], disputes: [],
      rentReporting: { linked: false, monthsAvailable: 24, backfilled: false }, income: 9100,
      deltas: [{ points: -3, cause: 'New hard inquiry — CarMax Auto Finance' }],
      milestones: [M('Enrolled', '2026-04-15', 'done'), M('Review requested', '2026-07-20', 'done'), M('Application started', '2026-07-28', 'done'), M('Guardian on', '2026-07-28', 'current'), M('Closing', '2026-09-24', 'upcoming')],
      nextAction: { title: 'Ask Marcus before you act on the CarMax inquiry', detail: 'A new hard inquiry appeared yesterday. If you are shopping for a car, tell Marcus first — a new loan before closing can change your approval.', lever: 'guardian', engine: 'MyScoreIQ', href: '#guardian' },
      alerts: [{ type: 'inquiry', text: 'New hard inquiry — CarMax Auto Finance', date: '2026-08-17' }, { type: 'balance', text: 'Chase Freedom balance up $640', date: '2026-08-12' }],
      loanFile: { active: true, closingDate: '2026-09-24' } },
    { id: 'aisha', first: 'Aisha', last: 'Bell', email: 'aisha.bell@example.com', mobile: '(916) 555-0148', loId: 'sarah',
      attribution: { lender: 'harbor', lo: 'sarah', source: 'lo', partner: null, campaign: null },
      status: 'active', pathway: 'build', round: 1, roundsEstimated: 6, guardian: false, reviewRequestedAt: null, enrolledAt: '2026-08-10',
      score: { value: 588, prev: 588, updated: '2026-08-10', bureaus: { experian: 590, transunion: 588, equifax: 583 } },
      credit: { utilization: 0.55, prevUtilization: 0.55, tradelines: 4, latesLast24mo: 0, lastLateMonthsAgo: 19, derogLast12mo: false, inquiriesLast6mo: 0,
        monthlyDebts: [{ name: 'Capital One Secured', payment: 25 }, { name: 'Self Credit Builder', payment: 48 }], collections: [] },
      publicRecords: [{ type: 'chapter7', date: '2025-03-12' }], disputes: [],
      rentReporting: { linked: false, monthsAvailable: 24, backfilled: false }, income: 4800,
      deltas: [],
      milestones: [M('Enrolled', '2026-08-10', 'done'), M('Round 1', null, 'current'), M('Utilization under 30%', null, 'upcoming'), M('Rent history reported', null, 'upcoming'), M('FHA eligibility date', '2027-03-12', 'upcoming'), M('Request review', null, 'upcoming')],
      nextAction: { title: 'Bring the secured card under 30%', detail: 'Your Chapter 7 waiting period runs until March 12, 2027 for FHA. Every month until then is building time — utilization first, then rent history.', lever: 'utilization', engine: 'CreditBuilderIQ', href: '#plan' },
      alerts: [], loanFile: null },
  ],
  session: { role: 'consumer', consumerId: 'maria', loId: 'sarah', partnerId: null, attribution: null },
};

const clone = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
export function fixtures() { return clone(FIXTURES); }

const storage = () => (typeof localStorage !== 'undefined' ? localStorage : null);
export function loadState() {
  const ls = storage();
  if (ls) { try { const raw = ls.getItem(STORE_KEY); if (raw) return JSON.parse(raw); } catch {} }
  return fixtures();
}
export function saveState(state) { const ls = storage(); if (ls) ls.setItem(STORE_KEY, JSON.stringify(state)); return state; }
export function resetState() { const s = fixtures(); saveState(s); return s; }
export const getConsumer = (s, id) => s.consumers.find((c) => c.id === id) || null;
export const getLO = (s, id) => s.los.find((l) => l.id === id) || null;
export const getLender = (s) => s.lender;
```

- [ ] **Step 4: Run tests → PASS.** `npm test` → 2 passing.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(state): fixtures and store for the ReadyIQ 2 prototype"`

---

### Task 3: `state.js` — rules + transitions

**Files:**
- Modify: `site/assets/js/state.js` (append)
- Test: `test/state.test.mjs` (append)

**Interfaces (exports):**
- `assignPathway(consumer, lender) → pathway`
- `addYears(iso, n) → iso`, `daysBetween(a, b) → int`, `fmtDate(iso, {long}) → string` (e.g. `Mar 12, 2027`)
- `eligibilityDates(publicRecords) → [{type, label, event, fha, conventional}]`
- `dti(monthlyDebts, income) → number|null` (ratio, e.g. 0.31)
- `readinessTrigger(consumer, lender) → boolean`
- `resolveLink(state, code) → attribution|null`, `parseQuery(search) → {c,reset,dev,as}`
- `enrollConsumer(state, {first,last,email,mobile}, attribution|null) → consumer` (creates id `you` from Maria's profile as template, status `active`, round 1, `enrolledAt: TODAY`, `milestones` reset to `[Enrolled(done), Round 1(current), Utilization under 30%(upcoming), 12 clean months(upcoming), Request review(upcoming)]`, sets `session.consumerId='you'`)
- `requestReview(state, consumerId, {income}) → consumer` (status → `review_requested`, `reviewRequestedAt = TODAY`, marks current milestone done and inserts `Review requested (current)`)
- `setGuardian(state, consumerId, on) → consumer`
- `statusCard(state, consumerId) → {version:1, name, pathway, status, round, roundsEstimated, lastActivity, nextMilestone, reviewRequestedAt, eligibilityDate, guardian, attribution}`
- `packet(state, consumerId) → {pathway, floorsMet:[names], dtiEstimate, rentMonths, disputesOpen, disputesResolved, income}`

- [ ] **Step 1: Write failing tests**

```js
test('assignPathway agrees with every fixture and applies rules in the documented order', () => {
  const s = S.fixtures();
  for (const c of s.consumers) if (c.status === 'active' || c.status === 'review_requested') assert.equal(S.assignPathway(c, s.lender), c.pathway, c.id);
  const base = S.getConsumer(s, 'priya');
  assert.equal(S.assignPathway({ ...base, disputes: [{ status: 'sent' }] }, s.lender), 'dispute');
  assert.equal(S.assignPathway({ ...base, credit: { ...base.credit, tradelines: 2 } }, s.lender), 'thin');
  assert.equal(S.assignPathway({ ...base, income: 1000 }, s.lender), 'dti');
  assert.equal(S.assignPathway({ ...base, credit: { ...base.credit, utilization: 0.61 } }, s.lender), 'build');
  assert.equal(S.assignPathway({ ...base, score: { ...base.score, value: 615 } }, s.lender), 'near_ready');
});

test('eligibilityDates: Chapter 7 → FHA +2y, conventional +4y', () => {
  const d = S.eligibilityDates([{ type: 'chapter7', date: '2025-03-12' }]);
  assert.equal(d[0].fha, '2027-03-12');
  assert.equal(d[0].conventional, '2029-03-12');
  assert.equal(S.eligibilityDates([]).length, 0);
  assert.equal(S.fmtDate('2027-03-12'), 'Mar 12, 2027');
});

test('dti and readinessTrigger', () => {
  assert.equal(S.dti([{ payment: 400 }, { payment: 100 }], 2000), 0.25);
  assert.equal(S.dti([{ payment: 400 }], null), null);
  const s = S.fixtures();
  assert.equal(S.readinessTrigger(S.getConsumer(s, 'priya'), s.lender), true);
  assert.equal(S.readinessTrigger(S.getConsumer(s, 'denise'), s.lender), false);
});

test('links and query', () => {
  const s = S.fixtures();
  assert.deepEqual(S.resolveLink(s, 'harbor-dkim'), { code: 'harbor-dkim', lender: 'harbor', lo: 'sarah', source: 'agent', partner: 'dana', campaign: null });
  assert.equal(S.resolveLink(s, 'nope'), null);
  assert.deepEqual(S.parseQuery('?c=harbor-smiller&dev=1'), { c: 'harbor-smiller', reset: false, dev: true, as: null });
});

test('enrollConsumer, requestReview, setGuardian, statusCard, packet', () => {
  const s = S.fixtures();
  const you = S.enrollConsumer(s, { first: 'Alex', last: 'Kim', email: 'a@x.com', mobile: '555' }, S.resolveLink(s, 'harbor-smiller'));
  assert.equal(you.id, 'you'); assert.equal(you.status, 'active'); assert.equal(you.round, 1); assert.equal(s.session.consumerId, 'you');
  assert.equal(you.pathway, 'build');
  const c = S.requestReview(s, 'you', { income: 6000 });
  assert.equal(c.status, 'review_requested'); assert.equal(c.reviewRequestedAt, S.TODAY); assert.equal(c.income, 6000);
  assert.equal(c.milestones.find((m) => m.state === 'current').label, 'Review requested');
  assert.equal(S.setGuardian(s, 'you', true).guardian, true);
  const card = S.statusCard(s, 'aisha');
  assert.equal(card.version, 1); assert.equal(card.eligibilityDate, '2027-03-12'); assert.equal(card.nextMilestone, 'Utilization under 30%');
  const p = S.packet(s, 'sam');
  assert.equal(p.disputesOpen, 2); assert.equal(p.dtiEstimate, S.dti(S.getConsumer(s, 'sam').credit.monthlyDebts, 7100));
});
```

- [ ] **Step 2: Run → FAIL** (`S.assignPathway is not a function`).

- [ ] **Step 3: Implement (append to `state.js`)**

```js
// ---------- rules ----------
export function assignPathway(c, lender) {
  const floor = lender.floorDefault;
  const cr = c.credit, score = c.score?.value ?? null;
  const openDisputes = (c.disputes || []).some((d) => d.status !== 'resolved');
  if (openDisputes) return 'dispute';
  if (score == null || cr.tradelines < 3) return 'thin';
  const r = dti(cr.monthlyDebts, c.income);
  if (r != null && r > 0.45) return 'dti';
  const recentDerog = (cr.latesLast24mo > 0) || (c.publicRecords || []).some((p) => monthsSince(p.date) <= 24);
  if (recentDerog || cr.utilization > 0.5) return 'build';
  if (score < floor - 30) return 'build';
  if (score < floor || cr.utilization > 0.3) return 'near_ready';
  return 'ready_now';
}
export function monthsSince(iso, today = TODAY) {
  const a = new Date(iso + 'T00:00:00Z'), b = new Date(today + 'T00:00:00Z');
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}
export function addYears(iso, n) { const [y, m, d] = iso.split('-').map(Number); return `${String(y + n).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
export function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function fmtDate(iso, { long = false } = {}) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const mon = long ? ['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1] : MONTHS[m - 1];
  return `${mon} ${d}, ${y}`;
}
const WAITING = { chapter7: { label: 'Chapter 7 bankruptcy', fha: 2, conventional: 4 }, foreclosure: { label: 'Foreclosure', fha: 3, conventional: 7 }, short_sale: { label: 'Short sale / deed-in-lieu', fha: 3, conventional: 4 } };
export function eligibilityDates(publicRecords = []) {
  return publicRecords.filter((p) => WAITING[p.type]).map((p) => ({ type: p.type, label: WAITING[p.type].label, event: p.date, fha: addYears(p.date, WAITING[p.type].fha), conventional: addYears(p.date, WAITING[p.type].conventional) }));
}
export function dti(monthlyDebts = [], income) { if (!income) return null; const debt = monthlyDebts.reduce((a, d) => a + (d.payment || 0), 0); return Math.round((debt / income) * 100) / 100; }
export function readinessTrigger(c, lender) {
  const score = c.score?.value; if (score == null) return false;
  const openDisputes = (c.disputes || []).some((d) => d.status !== 'resolved');
  return score >= lender.floorDefault && !openDisputes && !c.credit.derogLast12mo && c.credit.utilization <= 0.3;
}
// ---------- links / query ----------
export function resolveLink(state, code) { const l = state.links?.[code]; return l ? { code, ...l } : null; }
export function parseQuery(search = '') { const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search); return { c: q.get('c'), reset: q.get('reset') === '1', dev: q.get('dev') === '1', as: q.get('as') }; }
// ---------- transitions ----------
export function enrollConsumer(state, { first, last, email, mobile }, attribution) {
  const tpl = clone(state.consumers.find((c) => c.id === 'maria'));
  const loId = attribution?.lo || state.lender.programs && state.los[0].id;
  const you = { ...tpl, id: 'you', first, last, email, mobile, loId, attribution: attribution || { lender: state.lender.id, lo: loId, source: 'direct', partner: null, campaign: null },
    status: 'active', round: 1, guardian: false, reviewRequestedAt: null, enrolledAt: TODAY,
    milestones: [M('Enrolled', TODAY, 'done'), M('Round 1', null, 'current'), M('Utilization under 30%', null, 'upcoming'), M('12 clean months', null, 'upcoming'), M('Request review', null, 'upcoming')] };
  you.pathway = assignPathway(you, state.lender);
  state.consumers = state.consumers.filter((c) => c.id !== 'you').concat(you);
  state.session.consumerId = 'you'; state.session.role = 'consumer';
  return you;
}
export function requestReview(state, id, { income } = {}) {
  const c = getConsumer(state, id); if (!c) return null;
  if (income) c.income = income;
  c.status = 'review_requested'; c.reviewRequestedAt = TODAY;
  c.milestones.forEach((m) => { if (m.state === 'current') { m.state = 'done'; m.date = m.date || TODAY; } });
  const i = c.milestones.findIndex((m) => m.state === 'upcoming');
  c.milestones.splice(i < 0 ? c.milestones.length : i, 0, M('Review requested', TODAY, 'current'));
  c.nextAction = { title: `${getLO(state, c.loId)?.first || 'Your loan officer'} has your packet`, detail: 'Your loan officer has been notified and will reach out to schedule. Keep balances where they are until you talk.', lever: 'review', engine: 'MyScoreIQ', href: '#review' };
  return c;
}
export function setGuardian(state, id, on) { const c = getConsumer(state, id); if (c) c.guardian = !!on; return c; }
export function statusCard(state, id) {
  const c = getConsumer(state, id); if (!c) return null;
  const elig = eligibilityDates(c.publicRecords)[0] || null;
  const upcoming = c.milestones.find((m) => m.state === 'upcoming');
  const lastDone = [...c.milestones].reverse().find((m) => m.state === 'done');
  return { version: 1, name: `${c.first} ${c.last}`, pathway: c.pathway, status: c.status, round: c.round, roundsEstimated: c.roundsEstimated,
    lastActivity: c.score?.updated || lastDone?.date || c.enrolledAt, nextMilestone: upcoming ? upcoming.label : null, reviewRequestedAt: c.reviewRequestedAt,
    eligibilityDate: elig ? elig.fha : null, guardian: !!c.guardian, attribution: c.attribution };
}
export function packet(state, id) {
  const c = getConsumer(state, id); if (!c) return null;
  const score = c.score?.value;
  return { pathway: c.pathway, floorsMet: state.lender.programs.filter((p) => score != null && score >= p.floor).map((p) => p.name),
    dtiEstimate: dti(c.credit.monthlyDebts, c.income), rentMonths: c.rentReporting.backfilled ? c.rentReporting.monthsAvailable : (c.rentReporting.linked ? c.rentReporting.monthsAvailable : 0),
    disputesOpen: c.disputes.filter((d) => d.status !== 'resolved').length, disputesResolved: c.disputes.filter((d) => d.status === 'resolved').length, income: c.income };
}
```
(Fix the `loId` line to simply `const loId = attribution?.lo || state.los[0].id;` — the `programs &&` fragment is a typo; the tests will catch it if left in.)

- [ ] **Step 4: Run → PASS** (`npm test` → 7 passing). If `assignPathway` disagrees with a fixture, fix the **fixture** only if the rules in the spec are being applied correctly; otherwise fix the rule.

- [ ] **Step 5: Commit** — `git commit -am "feat(state): pathway rules, eligibility clock, DTI, links, transitions, status card"`

---

### Task 4: Design system CSS + components gallery

**Files:**
- Create: `site/assets/css/tokens.css`, `site/assets/css/base.css`, `site/assets/css/components.css`, `site/dev/index.html`

**Interfaces:**
- Produces class names used by every page: `.btn .btn-primary .btn-secondary .btn-ghost .btn-lg`, `.input .field .label .help`, `.consent` (checkbox row), `.card .card-pad`, `.chip .chip-round`, `.badge .badge-<pathway>`, `.banner .banner-guardian`, `.sheet .sheet-backdrop`, `.toast`, `.number .number-value .number-caption .number-bureaus`, `.status-card`, `.next-action`, `.clock`, `.path .path-node .path-label`, `.engine-tag`, `.topbar`, `.bottomnav`, `.container`, `.stack-*`, `.row`, `.grid-2`, `.eyebrow`, `.h1 .h2 .h3`, `.muted`, `.reg-b`.

- [ ] **Step 1: `tokens.css`** (complete)

```css
:root{
  /* IDIQ / ReadyIQ layer (default) */
  --navy:#12384F; --orange:#F27124; --offwhite:#F1F4F6; --grey:#9BA6AD;
  --brand:var(--navy); --brand-soft:#E4ECF1; --brand-ink:#0B2333; --accent:var(--orange);
  --ink:#0F1B26; --ink-2:#3B4A57; --ink-3:#6B7A87; --line:rgba(15,27,38,.10); --line-2:rgba(15,27,38,.06);
  --canvas:#F6F8F9; --surface:#FFFFFF; --surface-2:#FBFCFC;
  --success:#1B7F4C; --success-soft:#E6F4EC; --warn:#B7791F; --warn-soft:#FBF3E4; --danger:#B42318; --danger-soft:#FBEAE8; --info:#1D4ED8; --info-soft:#E8EEFC;
  --font:"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,Roboto,sans-serif;
  --fs-12:12px; --fs-13:13px; --fs-15:15px; --fs-17:17px; --fs-20:20px; --fs-24:24px; --fs-32:32px; --fs-44:44px; --fs-64:64px;
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:20px; --sp-6:24px; --sp-8:32px; --sp-10:40px; --sp-12:48px; --sp-16:64px;
  --r-1:10px; --r-2:14px; --r-3:20px; --r-pill:999px;
  --sh-1:0 1px 2px rgba(15,27,38,.06); --sh-2:0 6px 24px -8px rgba(15,27,38,.14); --sh-3:0 20px 50px -20px rgba(15,27,38,.22);
  --ease:cubic-bezier(.2,.7,.2,1); --dur-1:160ms; --dur-2:260ms; --dur-3:700ms;
  --container:1120px; --portal:760px;
}
[data-brand="harbor"]{ --brand:#0F766E; --brand-soft:#E6F4F1; --brand-ink:#0B3F3A; --accent:#0F766E; --ink:#0F1B26; }
@media (prefers-reduced-motion: reduce){ :root{ --dur-1:0ms; --dur-2:0ms; --dur-3:0ms; } }
```

- [ ] **Step 2: `base.css`** — reset (`*{box-sizing:border-box}`, `body{margin:0;font:var(--fs-15)/1.5 var(--font);color:var(--ink);background:var(--canvas);-webkit-font-smoothing:antialiased}`), headings (`.h1{font-size:var(--fs-44);line-height:1.05;letter-spacing:-.02em;font-weight:650}` `.h2{font-size:var(--fs-32)...}` `.h3{font-size:var(--fs-20);font-weight:600}` `.eyebrow{font-size:var(--fs-12);letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);font-weight:600}` `.muted{color:var(--ink-3)}`), layout (`.container{max-width:var(--container);margin:0 auto;padding:0 var(--sp-6)}` `.portal-wrap{max-width:var(--portal);margin:0 auto;padding:0 var(--sp-4)}` `.stack-2/3/4/6/8{display:grid;gap:var(--sp-N)}` `.row{display:flex;align-items:center;gap:var(--sp-3)}` `.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-6)}` collapsing at 768), focus ring (`:focus-visible{outline:2px solid var(--brand);outline-offset:2px;border-radius:6px}`), `.reg-b{font-size:var(--fs-13);color:var(--ink-3)}`, `.sr-only`, mobile `.h1{font-size:var(--fs-32)}` at ≤ 768.

- [ ] **Step 3: `components.css`** — one block per component, complete rules:
  - `.btn` (inline-flex, height 44px, padding 0 18px, radius var(--r-pill), font-weight 600, transition transform var(--dur-1)) `.btn-primary{background:var(--brand);color:#fff}` hover `filter:brightness(1.05)`, active `transform:translateY(1px)`; `.btn-secondary{background:var(--brand-soft);color:var(--brand-ink)}`; `.btn-ghost{background:transparent;color:var(--brand)}`; `.btn-lg{height:52px;font-size:var(--fs-17);padding:0 24px}`; `.btn-block{width:100%}`.
  - `.field{display:grid;gap:6px}` `.label{font-size:var(--fs-13);font-weight:600;color:var(--ink-2)}` `.input{height:48px;border:1px solid var(--line);border-radius:var(--r-1);padding:0 14px;font:inherit;background:var(--surface)}` focus `border-color:var(--brand);box-shadow:0 0 0 4px var(--brand-soft)`; `.help{font-size:var(--fs-13);color:var(--ink-3)}`.
  - `.consent{display:grid;grid-template-columns:22px 1fr;gap:12px;padding:14px;border:1px solid var(--line);border-radius:var(--r-2);background:var(--surface)}` with `input[type=checkbox]{width:22px;height:22px;accent-color:var(--brand)}` and `.consent b{display:block}`.
  - `.card{background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-3);box-shadow:var(--sh-1)}` `.card-pad{padding:var(--sp-6)}` `.card-enter{animation:settle var(--dur-2) var(--ease) both}` `@keyframes settle{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`.
  - `.chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:var(--r-pill);background:var(--offwhite);color:var(--ink-2);font-size:var(--fs-13);font-weight:600}` `.chip-round{background:var(--brand-soft);color:var(--brand-ink)}`.
  - `.badge` same shape, colored by pathway: `.badge-ready_now{background:var(--success-soft);color:var(--success)}` `.badge-near_ready{background:var(--info-soft);color:var(--info)}` `.badge-build{background:var(--brand-soft);color:var(--brand-ink)}` `.badge-thin{background:var(--warn-soft);color:var(--warn)}` `.badge-dispute{background:var(--danger-soft);color:var(--danger)}` `.badge-dti{background:var(--offwhite);color:var(--ink-2)}` — text always present.
  - `.engine-tag{display:inline-flex;align-items:center;gap:6px;font-size:var(--fs-12);color:var(--ink-3)}` with a 6px dot in `var(--brand)`.
  - `.banner{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:14px 16px;border-radius:var(--r-2)}` `.banner-guardian{background:var(--brand-ink);color:#fff}`.
  - `.sheet-backdrop{position:fixed;inset:0;background:rgba(15,27,38,.35);backdrop-filter:blur(2px);display:grid;place-items:end center;z-index:50}` `.sheet{width:min(100%,640px);max-height:88vh;overflow:auto;background:var(--surface);border-radius:var(--r-3) var(--r-3) 0 0;padding:var(--sp-6);animation:up var(--dur-2) var(--ease)}` (`@keyframes up{from{transform:translateY(24px);opacity:0}}`); at ≥ 768 place-items:center and radius all corners.
  - `.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--ink);color:#fff;padding:12px 16px;border-radius:var(--r-pill);box-shadow:var(--sh-2);z-index:60}`.
  - `.number{display:grid;gap:4px}` `.number-value{font-size:var(--fs-64);line-height:1;font-weight:650;letter-spacing:-.03em;font-variant-numeric:tabular-nums}` `.number-delta{font-size:var(--fs-15);font-weight:600}` `.number-delta.up{color:var(--success)}` `.number-delta.down{color:var(--danger)}` `.number-caption{font-size:var(--fs-13);color:var(--ink-3);max-width:34ch}` `.number-bureaus{display:flex;gap:16px;font-size:var(--fs-13)}` `.number-bureaus b{font-variant-numeric:tabular-nums}`.
  - `.next-action{border-left:4px solid var(--brand)}` `.next-action .h3{margin:0}`.
  - `.status-card{display:grid;grid-template-columns:1fr auto;gap:8px 12px;padding:14px 16px}`.
  - `.clock{display:grid;grid-template-columns:96px 1fr;gap:16px;align-items:center}` `.clock svg circle.track{stroke:var(--line)}` `.clock svg circle.fill{stroke:var(--brand);stroke-linecap:round;transition:stroke-dashoffset var(--dur-3) var(--ease)}`.
  - `.path svg{width:100%;height:auto;overflow:visible}` `.path .track{stroke:var(--line);stroke-width:3;fill:none;stroke-dasharray:1 8;stroke-linecap:round}` `.path .drawn{stroke:var(--brand);stroke-width:3;fill:none;stroke-linecap:round}` `.path .node{fill:var(--surface);stroke:var(--line);stroke-width:2}` `.path .node.done{fill:var(--brand);stroke:var(--brand)}` `.path .node.current{fill:var(--surface);stroke:var(--brand);stroke-width:3}` `.path .pulse{fill:none;stroke:var(--brand);opacity:.35;animation:pulse 1.8s ease-out infinite}` `@keyframes pulse{from{r:8;opacity:.45}to{r:18;opacity:0}}` `.path-label{font-size:var(--fs-12);fill:var(--ink-3);text-anchor:middle}` `.path-label.current{fill:var(--brand-ink);font-weight:600}` `.path.sparkline .path-label{display:none}`.
  - `.topbar{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.85);backdrop-filter:saturate(180%) blur(12px);border-bottom:1px solid var(--line-2)}` inner `.row` height 60px; `.brand-mark{width:32px;height:32px;border-radius:9px;background:var(--brand);color:#fff;display:grid;place-items:center;font-weight:700}`.
  - `.bottomnav{position:fixed;bottom:0;left:0;right:0;display:none;grid-template-columns:repeat(5,1fr);background:var(--surface);border-top:1px solid var(--line-2);padding:6px 0 max(6px,env(safe-area-inset-bottom))}` `.bottomnav a{display:grid;justify-items:center;gap:2px;font-size:11px;color:var(--ink-3);text-decoration:none}` `.bottomnav a.active{color:var(--brand)}`; shown (`display:grid`) at ≤ 768 and body gets `padding-bottom:72px`.
  - Sample-path modal reuses `.sheet`.

- [ ] **Step 4: `site/dev/index.html`** — page with `data-brand="harbor"` toggle button (switches attribute on `<html>`), sections showing each component with fixture-like content (buttons, inputs, consent, chips + all six badges, banner-guardian, number (625 · +14), next-action card, status-card, clock (Aisha), and a placeholder `<div id="path-demo">` for Task 5). Loads `../assets/fonts/geist.css` + the three CSS files.

- [ ] **Step 5: Verify** — start `readyiq2` preview; open `/dev/`; screenshot at 1280 and 375; check console clean; confirm brand toggle recolors buttons/badges; text contrast visibly fine.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(design): tokens, base, components CSS + dev gallery"`

---

### Task 5: `path.js` — the Path component

**Files:**
- Create: `site/assets/js/path.js`
- Modify: `site/dev/index.html` (mount three demos: hero 3 nodes, timeline 7 nodes, sparkline)

**Interfaces:**
- `renderPath(target: Element, opts: { nodes: [{label, state:'done'|'current'|'upcoming'}], variant?: 'hero'|'timeline'|'sparkline', animate?: boolean, height?: number }) → SVGElement`
- Re-render by calling again on the same target (replaces content).

- [ ] **Step 1: Implement**

```js
// site/assets/js/path.js
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

export function renderPath(target, { nodes, variant = 'timeline', animate = true, height } = {}) {
  const n = nodes.length;
  const H = height || (variant === 'hero' ? 96 : variant === 'sparkline' ? 28 : 84);
  const W = variant === 'sparkline' ? 120 : 640;
  const padX = variant === 'sparkline' ? 6 : 28;
  const r = variant === 'sparkline' ? 3 : variant === 'hero' ? 9 : 7;
  const y = variant === 'hero' ? H - 34 : H / 2 - (variant === 'timeline' ? 12 : 0);
  const xs = nodes.map((_, i) => (n === 1 ? W / 2 : padX + (i * (W - padX * 2)) / (n - 1)));
  // gentle wave so it reads as a path, not a progress bar
  const ys = xs.map((_, i) => y + (variant === 'sparkline' ? 0 : Math.sin(i * 1.7) * 6));
  const d = xs.map((x, i) => {
    if (i === 0) return `M${x},${ys[i]}`;
    const px = xs[i - 1], py = ys[i - 1], cx = (px + x) / 2;
    return `C${cx},${py} ${cx},${ys[i]} ${x},${ys[i]}`;
  }).join(' ');
  const currentIdx = Math.max(0, nodes.findIndex((m) => m.state === 'current'));
  const doneUpTo = nodes.some((m) => m.state === 'current') ? currentIdx : nodes.filter((m) => m.state === 'done').length - 1;

  target.classList.add('path', variant);
  target.innerHTML = '';
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Path: ${nodes.map((m) => m.label).join(' → ')}` });
  svg.appendChild(svgEl('path', { class: 'track', d }));
  const drawn = svgEl('path', { class: 'drawn', d });
  svg.appendChild(drawn);
  nodes.forEach((m, i) => {
    if (m.state === 'current') svg.appendChild(svgEl('circle', { class: 'pulse', cx: xs[i], cy: ys[i], r }));
    svg.appendChild(svgEl('circle', { class: `node ${m.state}`, cx: xs[i], cy: ys[i], r }));
    if (variant !== 'sparkline') {
      const t = svgEl('text', { class: `path-label ${m.state}`, x: xs[i], y: variant === 'hero' ? ys[i] - 22 : ys[i] + 26 });
      t.textContent = m.label; svg.appendChild(t);
    }
  });
  target.appendChild(svg);
  // draw the "done" portion up to the current node
  requestAnimationFrame(() => {
    const total = drawn.getTotalLength();
    const frac = n > 1 ? Math.max(0, doneUpTo) / (n - 1) : 1;
    drawn.style.strokeDasharray = `${total}`;
    drawn.style.strokeDashoffset = `${total}`;
    drawn.style.transition = animate ? 'stroke-dashoffset var(--dur-3) var(--ease)' : 'none';
    requestAnimationFrame(() => { drawn.style.strokeDashoffset = `${total * (1 - frac)}`; });
  });
  return svg;
}
```

- [ ] **Step 2: Wire the three demos in `dev/index.html`** — `<script type="module">import{renderPath}from'../assets/js/path.js'; renderPath(document.querySelector('#path-hero'),{variant:'hero',nodes:[{label:'You',state:'done'},{label:'Verify',state:'current'},{label:'Your loan officer',state:'upcoming'}]}); renderPath(document.querySelector('#path-timeline'),{nodes:[...Maria's 7 milestones]}); renderPath(document.querySelector('#path-spark'),{variant:'sparkline',nodes:[...same]});</script>`

- [ ] **Step 3: Verify** in preview: line draws to the current node in ~0.7s, current node pulses, labels legible at 375. Screenshot.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(path): Path component (hero / timeline / sparkline) with draw animation"`

---

### Task 6: `ui.js` — shared helpers

**Files:**
- Create: `site/assets/js/ui.js`

**Interfaces (exports):**
- `el(tag, attrs?, ...children)` — attrs: `class`, `html`, `on*` handlers, `dataset`, else attributes; children: nodes/strings/arrays.
- `qs(sel, root=document)`, `qsa`.
- `applyBrand(lender)` — sets `document.documentElement.dataset.brand = lender.id`, injects CSS vars `--brand/--brand-soft/--brand-ink` from `lender.brand`, fills `[data-lender-name]` and `[data-lender-mark]` (initials) elements.
- `countUp(node, from, to, ms=900)` — tabular count with ease-out; respects reduced motion (jump).
- `sheet({title, body: Node|string, actions:[{label, kind:'primary'|'secondary'|'ghost', onClick, close?:true}], onClose}) → {close()}` — renders `.sheet-backdrop > .sheet`, closes on backdrop click / Esc.
- `toast(msg, ms=2400)`.
- `engineTag(name)` → `.engine-tag` node reading `Powered by ${name}`.
- `regB()` → `<p class="reg-b">You can apply for a mortgage at any time — this is not required.</p>`.
- `initDev(state, {onChange})` — handles `?reset=1` (resetState + strip param + reload) and `?dev=1` (fixed bottom-left panel: consumer `<select>` of fixture ids incl. `you` if present, "Reset fixtures" button, links to `../lo/` and `../check/`); persists `session.consumerId`.
- `initials(name)`, `fmtMoney(n)`, `pct(x)` (0.41 → `41%`).

- [ ] **Step 1: Implement `ui.js`** with the signatures above (≈120 lines). `sheet` must trap Esc and remove itself; `countUp` uses `performance.now()` loop with `1-(1-t)^3` easing; `applyBrand` sets `style.setProperty` on `documentElement`.

- [ ] **Step 2: Smoke-test in `dev/index.html`**: add buttons "Open sheet", "Toast", "Count 588→625" wired to ui.js; verify each in preview.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat(ui): shared element/brand/sheet/toast/countUp helpers + dev switcher"`

---

### Task 7: Front door — `check/`

**Files:**
- Create: `site/check/index.html`, `site/assets/js/page-check.js`

**Interfaces:**
- Consumes: `state.js` (`loadState, saveState, resolveLink, parseQuery, getLO, getLender`), `ui.js` (`applyBrand, el, sheet, engineTag, regB, initDev`), `path.js` (`renderPath`).
- Produces: link `../enroll/` (attribution already saved in `state.session.attribution` when arriving via `?c=`).

- [ ] **Step 1: Markup** — `<html lang="en" data-brand="harbor">`; head loads `../assets/fonts/geist.css`, `tokens.css`, `base.css`, `components.css`; `<title>Check your homebuyer credit readiness — Harbor Home Loans</title>`; `<meta property="og:title" content="Check your homebuyer credit readiness — 3 minutes, no application">`.
  Body:
  ```html
  <header class="topbar"><div class="container row"><span class="brand-mark" data-lender-mark>H</span><b data-lender-name>Harbor Home Loans</b><span class="muted" style="margin-left:auto">Powered by ReadyIQ</span></div></header>
  <main class="container">
    <section class="hero stack-6" style="padding:64px 0 32px;max-width:720px">
      <div class="chip" id="lo-chip">Your loan officer: Sarah Miller · NMLS 1234567</div>
      <h1 class="h1">Check your homebuyer credit readiness.</h1>
      <p style="font-size:var(--fs-20);color:var(--ink-2)">3 minutes. No application. See where you stand and get a plan that moves you toward a mortgage — with Sarah on your side the whole way.</p>
      <div class="row" style="flex-wrap:wrap"><a class="btn btn-primary btn-lg" href="../enroll/">Check my readiness</a><button class="btn btn-secondary btn-lg" id="sample">See a sample path</button></div>
      <p class="reg-b">You can apply for a mortgage at any time — this is not required.</p>
    </section>
    <section class="grid-2" style="grid-template-columns:repeat(3,1fr)" id="how"><!-- three .card.card-pad: 01 Check (MyScoreIQ) · 02 Plan (CreditBuilderIQ) · 03 Review (Sarah) --></section>
    <section class="card card-pad stack-3" style="margin:48px 0"><p class="eyebrow">What you'll see</p><div id="path-preview" class="path"></div><p class="muted">The number, honestly labeled. One next action at a time. A path with dates on it — and your loan officer told the day you're ready.</p></section>
  </main>
  <footer class="container muted" style="padding:32px 0;font-size:var(--fs-13)">Harbor Home Loans · NMLS #000000 · Equal Housing Lender · Powered by ReadyIQ · IDIQ (MyScoreIQ + CreditBuilderIQ). ReadyIQ shows a FICO® Score — not the mortgage-industry version lenders pull. A guide, not a preapproval.</footer>
  <script type="module" src="../assets/js/page-check.js"></script>
  ```
- [ ] **Step 2: `page-check.js`** — on load: `state=loadState()`; `q=parseQuery(location.search)`; if `q.c` → `attr=resolveLink(state,q.c)`; if found `state.session.attribution=attr; saveState(state)`; LO chip text from `attr?.lo || state.session.attribution?.lo || 'sarah'`; `applyBrand(getLender(state))`; `renderPath('#path-preview', {nodes: Maria's milestones})`; `#sample` opens a `sheet` titled "A sample path" whose body contains a `.path` element and a caption; on open run a 5-step scripted animation: nodes progress every 4s through captions [`Check — 3 minutes, no application`, `Plan — one next action at a time`, `Build — utilization first, then history`, `Trigger — Sarah is told the day you're ready`, `Review — you request it, she pulls the real report`], re-rendering the Path with the current index each tick; clear the interval on close. `initDev(state)`.
- [ ] **Step 3: Verify** at 375/768/1280: hero legible, CTA prominent, sample sheet animates, `?c=harbor-dkim` changes the LO chip to Sarah (via Dana) and stores attribution; console clean. Screenshot 1280 + 375.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(check): lender-branded front door with sample path"`

---

### Task 8: Enrollment — `enroll/`

**Files:**
- Create: `site/enroll/index.html`, `site/assets/js/page-enroll.js`

**Interfaces:**
- Consumes: `state.js` (`loadState, saveState, enrollConsumer, getLO, getLender, resolveLink`), `ui.js`, `path.js`.
- Produces: `state.consumers` gains `you`; `session.consumerId='you'`; navigates to `../portal/`.

- [ ] **Step 1: Markup** — same head/topbar. `<main class="portal-wrap stack-6">` with `<div id="path-hero" class="path"></div>` at top and three `<section data-step>` panels + `<section data-step="done">`:
  - **Step 1 `#you`**: eyebrow `Step 1 of 3`, h2 `Let's start with you`, fields first/last (grid-2), mobile, email; three `.consent` rows:
    1. `<b>Let ReadyIQ pull my credit for my own review.</b> MyScoreIQ and CreditBuilderIQ obtain my reports and FICO® Score for me. This is a soft check — it does not affect my score.`
    2. `<b>Share my status — never my report — with my loan officer.</b> Sarah sees where I am on the path (like "Round 2, utilization goal met"). She never sees my credit report or score details unless I request a review.`
    3. `<b>Text me.</b> ReadyIQ and Sarah may text me about my path. Message rates may apply; reply STOP any time.`
    Button `Continue` (disabled until all three checked and fields non-empty). `regB()`.
  - **Step 2 `#verify`**: eyebrow `Step 2 of 3`, h2 `Verify it's you`, `engineTag('IDIQ')`; six OTP boxes with a "Demo: tap to fill" helper that fills `4 8 1 2 0 6`; two KBA-style radio questions with obviously-demo options (`Which of these streets have you lived on?` / `Which of these was your first car loan?`), any answer accepted; button `Verify`.
  - **Step 3 `#lo`**: eyebrow `Step 3 of 3`, h2 `Meet your loan officer`, LO card (initials mark, name, NMLS, company, `Licensed in CA · AZ · NV`, mobile); if no attribution show a `<select>` of both LOs; button `That's my loan officer`.
  - **Done**: h1 `Your path is ready.`; `.number` block that counts up to your score; pathway badge; one line "You're in **Build Mode** — utilization first, then history. Sarah can see you enrolled." ; button `Open my portal` → `../portal/`.
- [ ] **Step 2: `page-enroll.js`** — hash router (`#you` default, `#verify`, `#lo`, `#done`); `renderPath('#path-hero',{variant:'hero',nodes:[You,Verify,Your loan officer]})` with `state` derived from current step; step transitions update the path; on Step 3 confirm: `you = enrollConsumer(state, form, state.session.attribution)`; `saveState`; render Done with `countUp(number, 500, you.score.value)` and badge `PATHWAY_LABELS[you.pathway]`. Keep form values in memory across steps. Any direct load of `#done` without form → redirect to `#you`.
- [ ] **Step 3: Verify**: full run in ≤ 3 screens ends on the portal with the entered name in the topbar; path draws each step; consents required; mobile layout clean. Screenshots.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(enroll): three-screen enrollment with consent, IDIQ verify, LO confirm, reveal"`

---

### Task 9: Portal shell + Home

**Files:**
- Create: `site/portal/index.html`, `site/assets/js/page-portal.js`

**Interfaces:**
- Consumes: everything above; renders the `session.consumerId` consumer (fallback `maria`).
- Produces: hash sections `#home #plan #disputes #build #number #review #guardian #ask #protect #settings`; `render()` re-renders the active section from state; `state` saved on every transition.

- [ ] **Step 1: Shell markup** — topbar (brand mark, lender name, right: consumer initials avatar linking `#settings`); `<main class="portal-wrap" id="view"></main>`; `<nav class="bottomnav">` Home/Plan/Disputes/Build/Ask; desktop side nav (`≥768`: left rail with the same links + Review/Guardian/Protect/Settings). `data-brand="harbor"`.
- [ ] **Step 2: Home render** (`renderHome(c)`), in order:
  1. Guardian banner **only if** `c.guardian` — `.banner-guardian`: 🛡 `Your loan file is active — Guardian is on.` link `#guardian`.
  2. Greeting eyebrow `Good morning, {first}` + pathway badge + `.chip-round` `Round {round} of ~{roundsEstimated}`.
  3. `.card.card-pad .number`: if `score.value` — value counts up on first render, delta chip (`+14 since Jul 14`, class up/down, link `#number`), caption verbatim `FICO® Score — not the mortgage-industry version lenders pull. A guide, not a preapproval.`, `Updated {fmtDate}` + `engineTag('MyScoreIQ')`, expandable bureau strip (`Experian 628 · TransUnion 625 · Equifax 619`); if null — `No score yet` big text with caption `Here's how we build one — starting with 19 months of rent.` and engineTag('CreditBuilderIQ').
  4. `.card.card-pad` with `renderPath` timeline over `c.milestones` and eyebrow `Your path`.
  5. `.card.card-pad.next-action.card-enter`: eyebrow `Next action`, h3 title, detail, row: `engineTag(engine)` + link button `Open` → `nextAction.href`.
  6. Row: `btn-primary btn-block` `Request review` → `#review` (label `Review requested — {date}` and secondary style if status is `review_requested`); under it `regB()`.
  7. Ask bar: `.card` input placeholder `Ask ReadyIQ — "why did my score move?"` → focusing navigates to `#ask` with the text.
- [ ] **Step 3: Router** — `location.hash` → section renderer map; unknown → home; on `hashchange` re-render and set active nav; `initDev(state,{onChange:render})`; `applyBrand`.
- [ ] **Step 4: Verify** — Maria (default), then via `?dev=1` switch to Jordan (No score state), Tom (banner present), Priya (review-requested state). 375 + 1280 screenshots; console clean.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(portal): shell, router, home (number, path, next action, review, ask)"`

---

### Task 10: Portal — Plan (+Clock, +DTI), Disputes, Build, Why-it-moved

**Files:**
- Modify: `site/assets/js/page-portal.js` (add `renderPlan, renderDisputes, renderBuild, renderNumber`)

**Interfaces:** consumes `eligibilityDates, dti, fmtDate, daysBetween, pct, fmtMoney`.

- [ ] **Step 1: `renderPlan(c)`** — eyebrow `Your plan`, h2 `In the order underwriting cares`. Cards per lever, only levers relevant to `c`: `Payment history` (if `latesLast24mo>0`: "Your last late is {n} months old. Twelve clean months lands {date}." — date = 12 months after last late, computed via `addYears`/month math; else "No lates in 24 months — keep it that way."), `Derogatories & collections` (list `credit.collections` with note `Paying a collection doesn't raise the FICO® you see here — removing an inaccurate one can. Ask Sarah what Harbor requires for your program.`), `Utilization` (`{pct} now → target under 30%`, dollar hint if debts present), `Inquiries` (`{n} in 6 months — pause new applications`), `DTI` card: `Your monthly debts from the report: {fmtMoney(sum)}` + income input (prefilled `c.income`) → live `DTI ≈ {pct}` + note `Estimate. Lenders compute DTI from the tri-merge and verified income.`; saving income → `saveState`. `Thin file` card only for `thin`. Each card ends with `engineTag('CreditBuilderIQ')`. **Clock card** if `eligibilityDates(c.publicRecords).length`: `.clock` with SVG ring (progress = elapsed/total between event and FHA date), big `FHA · {fmtDate(fha)}`, `Conventional · {fmtDate(conventional)}`, `{days} days` chip, note `Earliest eligibility, subject to lender review — waiting periods and overlays vary.`
- [ ] **Step 2: `renderDisputes(c)`** — eyebrow `Disputes` + `engineTag('CreditBuilderIQ')`; if `c.guardian`: banner `Disputes are paused while your loan file is active.`; else list `c.disputes` sorted `payment_amount, duplicate, late, collection, date, not_mine` with category label chips (`Wrong payment amount — inflates DTI by {fmtMoney}` etc.), status pill (`draft/sent/responded/resolved`), buttons `Send` (draft→sent, `sentAt=TODAY`) / `Mark responded` / `Resolved`; empty state: `Nothing flagged. We check every refresh — once a month.`; note card `We sequence disputes to finish before your review — lenders don't like open disputes.`
- [ ] **Step 3: `renderBuild(c)`** — eyebrow `Build history` + `engineTag('CreditBuilderIQ')`; card `Rent`: if `!linked` → button `Link bank (MX)` (sets `linked=true`, `monthsAvailable=24`), else show `{months} on-time rent payments found` + button `Report {months} months` (sets `backfilled=true`, adds milestone done `Rent history reported`, toast); note `Reported rent adds history to all three bureaus. Twelve months of on-time rent in your bank data can also count directly with your lender (DU rent history, payments of $300 or more).`; card `Utilities`: chips `Gas · Electric · Water · Phone` with `Add` (toggle state in a `utilities:[]` field on the consumer; create if missing).
- [ ] **Step 4: `renderNumber(c)`** — eyebrow `Why it moved`, big `{prev} → {value}` with signed total, list of `deltas` rows (`+14  Utilization down — Capital One paid to $210`), footer `Every point of the change, tied to a cause. Updated {date}.` + `engineTag('MyScoreIQ')`; for `null` score → thin-file explainer.
- [ ] **Step 5: Verify** — Maria plan shows 4 levers + DTI; Aisha shows the Clock with `Mar 12, 2027`; Sam disputes list with the DTI-impact chip and Send works; Jordan Build shows 19 months + Report button flow; screenshots.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(portal): plan with clock + DTI, mortgage-aware disputes, build history, why-it-moved"`

---

### Task 11: Portal — Review, Guardian, Ask, Protect, Settings

**Files:**
- Modify: `site/assets/js/page-portal.js` (add `renderReview, renderGuardian, renderAsk, renderProtect, renderSettings`)

- [ ] **Step 1: `renderReview(c)`** — eyebrow `Request review`; packet card from `packet(state,c.id)`: rows `Pathway`, `Harbor floors met` (list or `none yet`), `DTI estimate` (or income input if missing), `Rent history` (`{n} months`), `Disputes` (`{open} open · {resolved} resolved` — if open > 0 show warn note `Open disputes usually need to finish first — ask Sarah`), `Consent for a hard pull` checkbox (`Sarah may pull my mortgage credit report when we talk`), button `Send to Sarah` → `requestReview` → `saveState` → toast `Sarah has been notified` → `#home`. If already requested: state card `Requested {date}. Sarah has your packet.` + `Schedule a call` (tel: link).
- [ ] **Step 2: `renderGuardian(c)`** — if `!c.guardian`: explainer card `Guardian turns on when your loan file is active…` + demo button `Simulate active file` (dev only, `setGuardian` on) ; else: hero banner, `Closing {fmtDate(loanFile.closingDate)} · {days} days`, list `Ask Marcus before you: open a new account · close an account · pay off a loan · co-sign · move large money`, `Recent alerts` from `c.alerts` with `engineTag('MyScoreIQ')`, `Paused: dispute suggestions` note, closing checklist (`Respond to any letter-of-explanation requests within 24h`, `Keep balances where they are`, `Don't change jobs without a call`), button `Turn Guardian off (demo)`.
- [ ] **Step 3: `renderAsk(c)`** — chat-style list + input; scripted intents (case-insensitive substring): `why|moved|drop` → deltas summary; `next|do|should` → nextAction; `apply|ready|qualify` → `You can apply any time — this isn't required. Right now you're in {pathway}; {floorsMet or 'no Harbor floors met yet'} — Sarah can tell you what that means for a specific program.`; `letter|explanation|loe` → drafts an LOE from `latesLast24mo`/`inquiries` facts in first person with a `Copy` button; `dispute` → dispute status; default → `I can explain your number, your plan, and what happens next. I don't predict scores or approvals — Sarah does the qualifying.` Footer verbatim: `ReadyIQ explains and organizes. It never promises deletions, points, or approvals.` + engineTag('CreditBuilderIQ').
- [ ] **Step 4: `renderProtect(c)`** — eyebrow `Protected homebuying` + `engineTag('MyScoreIQ')`; cards: `Dark web & SSN monitoring — on`, `Address-change alerts — on`, `Identity theft insurance & U.S.-based restoration — included with MyScoreIQ`, `Wire-fraud coaching` (`Before you wire closing funds, call your title company at a number you already have — never one from an email.`).
- [ ] **Step 5: `renderSettings(c)`** — contact rows, LO card, three consent toggles (turning off #2 shows note `Sarah will stop receiving your status`), `Reset demo data` (resetState) and `Leave ReadyIQ` (confirm sheet → resetState).
- [ ] **Step 6: Verify** — Priya's review state, Sam's open-dispute warning, Tom's Guardian, Ask answers for `why did my score move` and `letter of explanation`; screenshots.
- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(portal): review packet, guardian, ask, protect, settings"`

---

### Task 12: Stage-1 verification pass + docs

**Files:**
- Modify: `README.md` (add "What's built" + routes), memory file update outside repo.

- [ ] **Step 1: Acceptance run** — for each route (`check/`, `enroll/` all steps, `portal/` every hash) at 375 / 768 / 1280: no console errors (`read_console_messages`), no horizontal scroll, all `engineTag`s present on tool surfaces, honesty caption + Reg B line present on consumer screens, Guardian banner only for Tom, `?reset=1` restores fixtures, enrollment ends on a populated portal.
- [ ] **Step 2: `npm test`** → all passing.
- [ ] **Step 3: Screenshots** of check/enroll-done/portal-home (Maria) at 1280 and 375; send to owner.
- [ ] **Step 4: README + commit** — `git add -A && git commit -m "docs: stage 1 complete — consumer experience"`. Update `readyiq-mortgage-mockup` memory: v2 folder, font is Geist, Stage 1 done.

---

## Self-review (done while writing)

- **Spec coverage:** §3 simplicity → Tasks 7–9; §4.1 every route → Tasks 7–11 (check ✓, enroll 3 steps + reveal ✓, portal home/plan/disputes/build/number/review/guardian/ask/protect/settings ✓); §5 state machine + Status Card → Task 3 (`statusCard`); §6 rules → Task 3; §7 fixtures → Task 2; §8 design system → Tasks 4–5; §9 architecture → Task 1; §10 stage-1 acceptance → Task 12. LO/links/marketing are Stages 2–4 (separate plans).
- **Placeholders:** none; the one intentional trap (`programs &&` typo) is called out with its fix.
- **Type consistency:** `renderPath(target, {nodes, variant, animate, height})` used identically in Tasks 5, 7, 8, 9; `enrollConsumer(state, form, attribution)` in Tasks 3 and 8; `packet/requestReview/setGuardian/statusCard` names match between Task 3 and Task 11; milestone shape `{label,date,state}` everywhere.
