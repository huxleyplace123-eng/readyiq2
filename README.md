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
```

Registered in `dchub/.claude/launch.json` as `readyiq2` for the preview tooling.

## Layout

```
docs/specs/   product definition + prototype design
docs/plans/   staged implementation plans
site/         the static site (Pages root later)
  check/  enroll/  portal/      consumer experience (stage 1)
  lo/  r/  p/                   loan officer, links, partners (stages 2–3)
  index.html                    marketing (stage 4)
  assets/css  assets/js  assets/fonts
  dev/                          components gallery (dev aid)
test/         node:test
```

## Design constraints

- Light theme only. Consumer pages wear the lender's brand (`data-brand="harbor"`
  in the demo); ReadyIQ chrome uses IDIQ tokens (navy `#12384F`, orange `#F27124`).
- Geist variable font embedded as a data URI (`site/assets/fonts/geist.css`).
- Base font size 15px (owner's display is 1.25 DPR).
- Relative URLs only — must work locally and under a Pages sub-path.
- Prototype "today" is 2026-08-18. `?reset=1` restores fixtures, `?dev=1` shows the switcher.

## What's built (v2 — merged)

| Route | What it is |
|---|---|
|  | ReadyIQ website — dark hero with a live platform window, the loop, product-suite tabs, modules, org section, consumer section, integrations teaser |
|  | Lender-branded front door — public door, or a **personal invitation** when  resolves (, ) |
|  | Three screens (you + timeline · identity + one-time code · your loan officer) → “Your path is ready” |
|  | Five tabs: Home (ring gauge · path · one next action · toolkit · LO card) · Plan (levers, the Clock, DTI) · Disputes (four-step hub) · Build · Progress (chart, milestones, why it moved). Ask floats; Guardian is a banner; Review / Protect / Settings under the avatar |
|  ·  | Loan officer: 60-second sign-up (NMLS autofill, brand pull) → link · QR · text · invite modal · read-only status feed · organization settings. Not a CRM |
|  ·  | Link resolver (attribution) · partner (agent) page with coarse statuses only |
|  | Status object, architecture, connections, API actions, webhook events, three integration levels |
|  | Components gallery |

A “ReadyIQ demo ▾” pill on every page switches surfaces and fixture consumers ( hides it;  restores fixtures).
Logic lives in  (Unknown command: "test"


Did you mean this?
  npm test # Test a package
To see a list of supported npm commands, run:
  npm help). QR SVGs: .
