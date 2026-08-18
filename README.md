# ReadyIQ 2 — prototype

A **multi-tenant credit-readiness platform** for the mortgage market: it owns
the consumer's journey from "can I qualify?" to "review me," runs the pathway /
plan / Protect engine on top of IDIQ's products (MyScoreIQ + CreditBuilderIQ),
and emits status into whatever the lender already uses. Not a CRM.

Kept outside the `dchub` repo on purpose (same reason as ReadyIQ 1).

## Run

\
> build
> node build.mjs


> test
> node --test

✔ fixtures: seven consumers, one per pathway story, all well-formed (2.9673ms)
✔ store: fixtures() returns fresh copies; loadState falls back to fixtures without localStorage (1.3286ms)
✔ assignPathway agrees with every fixture and applies rules in the documented order (0.4963ms)
✔ eligibilityDates: Chapter 7 → FHA +2y, conventional +4y (0.2808ms)
✔ dti and readinessTrigger (1.2874ms)
✔ links and query (1.6776ms)
✔ enrollConsumer, requestReview, setGuardian, statusCard, packet (0.7827ms)
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 128.4387

> qr
> node scripts/gen-qr.mjs
Registered in  as  for the preview tooling.

## Layout

\
## Design constraints

- **The v11 look is the system**: near-black green , paper , lime , mint/purple/coral/gold tags; heavy Inter headlines with one italic serif phrase per section; dark frames around light content; alternating bands; white portal sidebars with a dark loan-officer card. Inter is embedded (latin, OFL).
- Honesty rules: MyScoreIQ FICO® labeled “not the mortgage-industry version lenders pull”, three bureaus, no readiness percentage (plan progress instead), no promised deletions/points/approvals/timelines, Reg B line on consumer screens, engine tags (MyScoreIQ / CreditBuilderIQ) — no third-party reporting brand.
- The loan officer sees status, never the report.

## What's built (v2 — merged)

| Route | What it is |
|---|---|
| `index.html` | ReadyIQ website — dark hero with a live platform window, the loop, product-suite tabs, modules, org section, consumer section, integrations teaser |
| `check/` | Lender-branded front door — public door, or a **personal invitation** when `?c=` resolves (`?c=harbor-smiller`, `?c=harbor-dkim`) |
| `enroll/` | Three screens (you + timeline · identity + one-time code · your loan officer) → "Your path is ready" |
| `portal/` | Five tabs: Home (ring gauge · path · one next action · toolkit · LO card) · Plan (levers, the Clock, DTI) · Disputes (four-step hub) · Build · Progress (chart, milestones, why it moved). Ask floats; Guardian is a banner; Review / Protect / Settings under the avatar |
| `lo/start/` · `lo/` | Loan officer: 60-second sign-up (NMLS autofill, brand pull) → link · QR · text · invite modal · read-only status feed · organization settings. Not a CRM |
| `r/?c=` · `p/?c=` | Link resolver (attribution) · partner (agent) page with coarse statuses only |
| `integrations/` | Status object, architecture, connections, API actions, webhook events, three integration levels |
| `dev/` | Components gallery |

A "ReadyIQ demo ▾" pill on every page switches surfaces and fixture consumers.
Logic lives in `site/assets/js/state.js` and is covered by `npm test`; a
`FIXTURE_VERSION` constant resets stale `localStorage` when fixtures change shape.

## Photo credit

Hero portrait: Pexels photo 864994 by Andrea Piacquadio (Pexels license — free to use). `site/assets/img/hero-person.jpg`.
