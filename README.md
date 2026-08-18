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
