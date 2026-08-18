# ReadyIQ 2 — product definition + prototype design

Date: 2026-08-18 · Owner: Adam · Status: draft for review
Lives outside `dchub` on purpose (same reason as ReadyIQ 1).

## 1. What ReadyIQ 2 is

A **multi-tenant credit-readiness platform** for the mortgage market. It owns
the consumer's journey from "can I qualify?" to "review me," runs the pathway /
plan / Protect engine on top of IDIQ's products, and emits status into whatever
the lender already uses. It never owns the lender's pipeline. Stripe/Plaid, not
Salesforce.

**Required engines — every tool surface names the one it runs on (small caption):**

| Engine | Powers |
|---|---|
| **MyScoreIQ** | the FICO® score (headline number), 3-bureau reports, daily monitoring + alerts, readiness trigger, Guardian alerts, identity protection, post-close Retain |
| **CreditBuilderIQ** | credit-report review (flagged items), plan/gameplan actions, Dispute Hub, rent + utility reporting (24-mo lookback, MX bank link), secured-card / builder-loan guidance |

**Honesty rules (non-negotiable copy):**
- One headline number: MyScoreIQ's FICO®. Label it "FICO® Score — not the
  mortgage-industry version lenders pull. A guide, not a preapproval."
  CBIQ's VantageScore never appears as a competing headline.
- Never promise deletions, points, approvals, or timelines. Trajectories are
  phrased "at your pace, about …" and dates as "earliest eligibility, subject
  to lender review."
- No score-lift marketing claims (no "+60 points", no "20 points in 30 days")
  anywhere in the lender-branded experience.
- Reg B: every consumer screen carries "You can apply for a mortgage at any
  time — this is not required." Nothing gates an application.
- Pricing is out of scope for this prototype (parked by owner).

## 2. Surfaces (three, and only three)

| Surface | Is | Is not |
|---|---|---|
| **Consumer journey** — hosted, lender-branded | front door → 3-screen enrollment → portal (number, path, one next action, tools, review, Guardian, Retain) | not the CBIQ homepage; not a generic app |
| **Integration layer** | link/QR per human, status card object, (later) API/webhooks/embed/Zapier | not an iframe of the whole thing |
| **Lender/LO admin** — thin | LO sign-up, personal link + QR + invite, read-only status feed, minimal settings | not a pipeline, tasks, notes, or campaigns |

Decision recorded: a lender with no CRM gets a **read-only status feed** (list +
review-requested queue + digests). No notes, no tasks, no stages.

## 3. Simplicity contract

- **LO: 60 seconds to a link.** Email + NMLS ID → we auto-fill name / company /
  licensed states → we pull the lender's logo + colors from their site → one
  screen: link, QR, "Text this to a client." No wizard.
- **Consumer: 3 screens, ~3 minutes.** (1) name, mobile, email, consents ·
  (2) identity verification (IDIQ) · (3) "Meet your loan officer" → confirm →
  *your path is ready.* No plan picker, no password (one-time code), no catalog.
- **Portal: one next action.** Number + Path + one Next-Action card. Request
  Review is always one tap. Ask ReadyIQ at the bottom. Guardian appears only
  when a file is active.
- **Links: one per human.** LO, agent, partner. Attribution baked in. Partners
  see coarse statuses only (never scores or report data).

## 4. Screens

Routes are static-hosting-safe (folders + `?c=` query, never dynamic path
segments) and use **relative** URLs so they work at `http://localhost:4620/`
and under a GitHub Pages sub-path.

### 4.1 Consumer (lender-branded — sample lender "Harbor Home Loans")

| Route | Screen | Must contain |
|---|---|---|
| `check/` | **Front door** | lender logo/colors; headline "Check your homebuyer credit readiness — 3 minutes, no application"; assigned-LO chip (from attribution); primary CTA "Check my readiness"; secondary "See a sample path" (20-second animated Path demo in a modal); "You can apply any time" line; "Powered by ReadyIQ · IDIQ" footer |
| `enroll/` | **Step 1 — You** | first/last, mobile, email; three consent checkboxes with plain-English text (credit access for my own use · share my *status* (never my report) with my named LO · texts from my LO/ReadyIQ — TCPA); Path draws node 1 |
| `enroll/#verify` | **Step 2 — Verify** | IDIQ identity verification (prototype: OTP + 2 KBA-style questions, always passes on the sample data); "Powered by IDIQ"; Path draws node 2 |
| `enroll/#lo` | **Step 3 — Your loan officer** | LO card (photo, name, NMLS, company, "licensed in …"); confirm; if no attribution, pick from the lender's LO list; Path completes → "Your path is ready" reveal (number counts up, pathway named) |
| `portal/` | **Home** | the Number (FICO, model caption, "updated <date>", per-bureau strip expandable); the Path (rounds + milestones); **Next Action** card (one); Round chip ("Round 2 of ~5"); pathway badge; "Request review" button; Ask ReadyIQ bar; Guardian banner *only* when `status = protect` |
| `portal/#plan` | **Plan** | ordered actions grouped by lever (payment history · derogatories/collections · utilization · inquiries · DTI · thin-file); each action names the lever it moves and its engine (CBIQ / MyScoreIQ); DTI card ("your debts from the report: $X/mo; enter income → DTI"); The Clock card when a waiting-period record exists |
| `portal/#disputes` | **Disputes** | CBIQ Dispute Hub, mortgage-aware: priority list (wrong monthly payment amounts, duplicates, lates ≤24 mo, collections, wrong dates, not-mine); status per item (draft → sent → responded → resolved); "finish before review" note; paused state when Guardian on |
| `portal/#build` | **Build history** | CBIQ rent + utility reporting: link bank (MX), pick rent/utility transactions, 24-month backfill; DU rent-history evidence note (12 months, ≥ $300/mo) |
| `portal/#number` | **Why it moved** | reconciliation list: every point of the last delta to a cause ("+14 — utilization ↓, Capital One paid"; "−6 — new inquiry") |
| `portal/#review` | **Request review** | packet preview (pathway, thresholds met, DTI est., months of positive rent, disputes closed, self-reported income, consent for hard pull, scheduling link) → confirm → status `review_requested`; LO feed updates |
| `portal/#guardian` | **Guardian** (only when active file) | "Your loan file is active" · paused disputes · ask-before-you-act list (open / close / pay off / co-sign) · closing countdown checklist · recent alerts (MyScoreIQ) |
| `portal/#ask` | **Ask ReadyIQ** | scripted Q&A over the sample data (no live model); guardrail copy; can draft a letter of explanation from the consumer's own history |
| `portal/#protect` | **Protected homebuying** | MyScoreIQ identity protection summary; wire-fraud coaching card near closing |
| `portal/#settings` | **Settings** (minimal) | contact, LO, consents (revocable), "leave ReadyIQ" |

### 4.2 Loan officer

| Route | Screen | Must contain |
|---|---|---|
| `lo/start/` | **Sign up** | email + NMLS ID → autofill card (name, company, states) → "we found harborhomeloans.com — logo + colors" → done |
| `lo/` | **Your link** | personal link + QR + "Text this to a client" (sms: on mobile; message preview + copy on desktop) + "Email invite"; the message preview card is the pitch line |
| `lo/#clients` | **Status feed** (read-only) | list of the LO's consumers as **Status Cards**; filter chips by pathway/status; "Review requested" queue pinned on top; each card = name, pathway, round, last activity, next milestone, tiny Path sparkline, contact (tel/mailto). No notes, tasks, or stages. |
| `lo/#settings` | Settings | branding preview, LO list, thresholds (directional FICO floors per program), connectors (Zapier placeholder), consent copy |

### 4.3 Links & partners

| Route | Screen |
|---|---|
| `r/?c=<code>` | resolves code → stores attribution {lender, lo, source, campaign} in localStorage → redirects to `check/` |
| `p/?c=<code>` | partner (real-estate agent) page: their own link + QR + coarse statuses only (invited / enrolled / active / review requested) |

### 4.4 Marketing (stage 4)

`index.html` — ReadyIQ.com: hero; how it works (3 LO steps, 3 consumer steps);
signature features (Path, Number, Clock, Guardian, Status Card); integrations
row; "Powered by IDIQ — MyScoreIQ + CreditBuilderIQ"; CTA "Get your link in 60
seconds" → `lo/start/`. No pricing.

## 5. State machine (the status object every surface renders)

```
invited → consented → checked → pathway{ready_now | near_ready | build | thin | dispute | dti}
        → active → milestone* → review_requested → handed_off → {applied | funded | lost}
overlays: protect (during an active loan file) · retained (post-funding)
```

Status Card fields: `name, pathway, status, round, roundsEstimated, lastActivity,
nextMilestone, reviewRequestedAt, eligibilityDate?, guardian:boolean, attribution`.
Small, stable, versioned (`v1`).

## 6. Prototype rules the engines follow

- **Pathway assignment** (rules, transparent, no prohibited-basis inputs):
  ready_now = FICO ≥ lender floor & no open disputes & no derogatory ≤ 12 mo;
  near_ready = within 30 pts of floor or utilization > 30% only;
  build = derogatories/lates ≤ 24 mo or utilization > 50%; thin = < 3 tradelines
  or no score; dispute = flagged inaccuracies present; dti = debt/income > 45%.
  First matching rule wins in this order: dispute → thin → dti → build →
  near_ready → ready_now.
- **The Clock** (prototype waiting periods; copy says "verify with your lender"):
  Ch. 7 discharge → FHA 2 y, conventional 4 y · foreclosure → FHA 3 y, conv 7 y ·
  short sale / deed-in-lieu → FHA 3 y, conv 4 y. Seasoning: "12 clean months →
  <date>".
- **DTI**: sum of report monthly obligations ÷ self-reported gross monthly
  income; shown as an estimate.
- **Readiness trigger**: FICO ≥ floor & no open disputes & no new derogatory &
  utilization ≤ target, or an eligibility date arriving.
- **Guardian**: when `status.protect` — dispute suggestions hidden, disputes
  paused, alerts surfaced.

## 7. Sample data (deterministic fixtures)

Lender: **Harbor Home Loans** (teal brand). LOs: Sarah Miller (NMLS 1234567,
CA/AZ/NV), Marcus Webb. Partner: agent Dana Kim (`p/?c=harbor-dkim`).

| Consumer | Pathway / status | Notable |
|---|---|---|
| Maria Delgado | build · round 2 of ~5 | FICO 611 → 625; utilization 68% → 41%; two lates 14 mo ago |
| Jordan Lee | thin · round 1 | no score; 2 tradelines; 19 months of rent in bank data |
| Denise Alvarez | near_ready · round 3 | FICO 634, floor 640; utilization 34% |
| Sam Okafor | dispute · round 1 | wrong $412 student-loan payment (actual $0, in deferment) inflating DTI; duplicate collection |
| Priya Nair | ready_now · review_requested | FICO 702; packet ready |
| Tom Reyes | active + protect | file active; new inquiry alert yesterday |
| Aisha Bell | build · clock | Ch. 7 discharged 2025-03-12 → FHA 2027-03-12, conv 2029-03-12 |

Prototype "today" = 2026-08-18. Data lives in `localStorage["readyiq2:v1"]`;
`?reset=1` restores fixtures. Role switch (consumer ↔ LO ↔ partner) via a small
dev menu (`?dev=1`) so one browser can demo the whole loop.

## 8. Design system

- **Light only.** Two brand layers:
  - Consumer portal wears the **lender's brand** (Harbor: ink `#0F1B26`, brand
    teal `#0F766E`, teal-soft `#E6F4F1`, surface `#FFFFFF`, canvas `#F6F8F9`).
  - ReadyIQ layer (marketing site, "powered by", LO admin chrome) uses **IDIQ**
    tokens: navy `#12384F`, orange `#F27124`, off-white `#F1F4F6`, grey `#9BA6AD`.
  - Semantic: success `#1B7F4C`, warn `#B7791F`, danger `#B42318`, info `#1D4ED8`.
- **Type:** Geist variable (300–700) embedded as a data-URI `@font-face`
  copied from v1 (`assets/fonts/geist.css`); system-ui fallback. Base 15px
  (owner's display is 1.25 DPR — author sizes accordingly). Scale: 12 / 13 / 15
  / 17 / 20 / 24 / 32 / 44 / 64.
- **Space:** 4-pt grid; radii 10 / 14 / 20; shadows soft and rare; borders
  `1px` at 8–10% ink.
- **Motion:** purposeful only — Path draws (stroke-dashoffset, 600–900 ms,
  ease-out), Number counts up, cards settle (translateY 6px → 0, 200 ms).
  `prefers-reduced-motion` respected.
- **Components:** `Path` (SVG, nodes: done/current/upcoming; sizes: hero /
  timeline / sparkline), `Number` (headline + caption + bureau strip),
  `StatusCard`, `NextAction`, `ClockRing`, `RoundChip`, `PathwayBadge`,
  buttons (primary/secondary/ghost), inputs, checkbox-consent, sheet/modal,
  banner (Guardian), toast.
- **Responsive:** 375 / 768 / 1280 verified; portal is mobile-first; LO link
  screen must be perfect on a phone.
- **A11y:** semantic landmarks, focus rings, 4.5:1 text contrast, no info by
  color alone (pathway badges carry text).

## 9. Architecture

Multi-page static site — no framework, no build step for the pages.

```
readyiq2/
  README.md · serve.mjs (static server, port 4620) · package.json (dev only)
  docs/specs/2026-08-18-readyiq2-design.md
  scripts/gen-qr.mjs        (dev-time: writes assets/qr/<code>.svg with `qrcode`)
  test/*.test.mjs           (node:test over pure functions in state.js)
  site/
    index.html              (marketing — stage 4)
    check/  enroll/  portal/  lo/  lo/start/  r/  p/     (index.html each)
    assets/css/tokens.css  base.css  components.css  brand-harbor.css  brand-idiq.css
    assets/js/state.js (store + fixtures + state machine + attribution + clock/DTI math)
             path.js (Path component)  ui.js (shared widgets)  page-*.js
    assets/fonts/geist.css · assets/qr/*.svg · assets/img/*
```

- Pure logic (state machine transitions, pathway rules, attribution parsing,
  eligibility-date + DTI math, reconciliation formatting) lives in `state.js`
  as exported functions and is unit-tested with `node --test`.
- Publish path: `site/` is the Pages root (same GitHub Actions pattern as v1),
  set up when the owner asks.

## 10. Stages + acceptance

1. **Consumer** — `check/`, `enroll/`, `portal/` (all sections above) on Harbor
   brand; fixtures; Path/Number/NextAction/Clock/Guardian components; tests for
   state.js. Done when: every route renders with no console errors at 375/768/
   1280, enrollment completes in 3 screens and lands on a populated portal,
   Request Review flips the fixture's status, Guardian appears only for Tom.
2. **LO** — `lo/start/`, `lo/`, `lo/#clients`, real scannable QR SVGs, sms:
   link + preview. Done when: sign-up → link screen in ≤ 3 interactions;
   Priya's review request is pinned in the feed.
3. **Links & partners** — `r/`, `p/`; attribution survives enrollment; partner
   sees coarse statuses only.
4. **Marketing** — `index.html`; CTA lands on `lo/start/`.

Each stage is previewed in the browser and screenshotted before it's called done.

## 11. Out of scope

Backend, real IDIQ/MyScoreIQ/CBIQ APIs, real identity verification, CRM
connectors beyond the Status Card object and a Zapier placeholder, payments and
pricing, dark theme, native apps.

## 12. Decisions made (so nobody re-litigates)

- Multi-page static over single-file or React (iteration speed, real URLs,
  publishable, no build).
- Geist (v1 already embeds it as a 39 KB variable woff2; more "next-gen" than Manrope).
- Sample lender brand is teal so white-labeling is visibly not IDIQ orange.
- QR codes are pre-generated SVGs (real, scannable) — no runtime QR library.
- Consumer scores shown are MyScoreIQ FICO; CBIQ VantageScore never headlines.


## 13. Amendments — 2026-08-18 (merge v2)

After reviewing a second mockup (Next/React, single file) the owner chose to keep this
static codebase and merge: a stronger visual system (ReadyIQ layer = paper canvas, deep
navy, lime accent, pathway tones; consumer portal = lender-branded light), a
five-tab consumer nav (Home · Plan · Disputes · Build · Progress; Ask floats; Guardian is
a banner; Review/Protect/Settings under the avatar), a four-step Dispute Hub, a
Progress page (absorbs Why-it-moved), a personal-invitation state on the front door,
the marketing site, thin LO/org screens (invite modal, link/QR, read-only feed, org
settings — still not a CRM), an integrations page, and a demo switcher. No readiness
percentage anywhere. No third-party reporting brand — CreditBuilderIQ (Resident-Link
underneath) is the engine. Details: docs/plans/2026-08-18-readyiq2-merge-v2.md.
