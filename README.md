# ReadyIQ 2 — prototype

A **multi-tenant credit-readiness platform** for the mortgage market: it owns
the consumer's journey from "can I qualify?" to "review me," runs the pathway /
plan / Protect engine on top of IDIQ's products (MyScoreIQ + CreditBuilderIQ),
and emits status into whatever the lender already uses. Not a CRM.

Kept outside the `dchub` repo on purpose (same reason as ReadyIQ 1).

## Run

```
node serve.mjs        # http://localhost:4620
npm test              # node --test (test/*.test.mjs)
npm run qr            # regenerate site/assets/qr/*.svg (dev-time, uses qrcode)
```

Registered in `dchub/.claude/launch.json` as `readyiq2` for the preview tooling.

## Layout

```
docs/specs/   product definition + prototype design (+ amendments)
docs/plans/   staged implementation plans (stage 1, merge v2)
scripts/      gen-qr.mjs
site/         the static site (Pages root later)
  index.html                    ReadyIQ website
  check/  enroll/  portal/      consumer experience (lender-branded)
  lo/  lo/start/                loan officer surface (thin — not a CRM)
  r/  p/                        link resolver, partner page
  integrations/                 the platform page
  dev/                          components gallery (dev aid)
  assets/css  assets/js  assets/fonts  assets/qr
test/         node:test
```

## Design constraints

- Light only. Two brand layers on one system: the **ReadyIQ layer** (website, LO/org,
  integrations, demo chrome) is paper `#F2F6F2` + navy `#0D2024` + lime `#C8F36D`
  with serif-italic emphasis in display headlines; the **consumer portal wears the
  lender's brand** (`data-brand="harbor"` in the demo) with ReadyIQ recessive.
- Geist variable font embedded as a data URI (`site/assets/fonts/geist.css`).
- Base font size 15px (owner's display is 1.25 DPR).
- Relative URLs only — must work locally and under a Pages sub-path.
- Prototype "today" is 2026-08-18. `?reset=1` restores fixtures; `?demo=0` hides the switcher.
- Honesty rules: one headline number (MyScoreIQ FICO®, labeled "not the mortgage-industry
  version"), no promised deletions/points/approvals/timelines, no readiness percentage,
  Reg B line on every consumer screen, every tool surface names its engine.

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
