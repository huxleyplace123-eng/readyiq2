# ReadyIQ 2 — prototype

A **multi-tenant credit-readiness platform** for the mortgage market: it owns
the consumer's journey from "can I qualify?" to "review me," runs the pathway /
plan / Protect engine on top of IDIQ's products (MyScoreIQ + CreditBuilderIQ),
and emits status into whatever the lender already uses. Not a CRM.

Kept outside the `dchub` repo on purpose (same reason as ReadyIQ 1).

## Run

```
npm run build         # esbuild → site/ (static: index.html, app.js, app.css, brands/, qr/, img/)
node serve.mjs        # http://localhost:4620
npm test              # node --test over src/state.js
npm run qr            # regenerate QR SVGs into site/qr/
```

Deep links (the demo toolbar sets the same params):

```
?mode=marketing
?mode=consumer&cpage=welcome|consent|checking|result|plan|disputes|guardian|…
?mode=lender&lpage=start|link|borrowers|overview|campaigns|organization|integrations
?mode=integrations
```

Registered in `dchub/.claude/launch.json` as `readyiq2` for the preview tooling.

## Layout

```
src/v11-page.tsx          the v11 look — marketing site, org portal, consumer portal, integration hub (React; one file, being split)
src/screens/lo.tsx        loan officer: 60-second sign-up · Your link (link · QR · text · invite) · read-only status feed
src/screens/overview.tsx  consumer Overview: dark hero + score window, path stepper, toolkit bento
src/screens/consumer.tsx  three consents · honest 3-bureau strip · DTI + clock · mortgage-why · why-it-moved · Guardian · review packet · Ask ReadyIQ
src/state.js              fixtures + rules (tests in test/)
src/styles/               v11.css (the system, type rescaled by scripts/rescale-type.py) · consumer-v2.css (consumer portal, marketing-grade) · additions.css · inter.css (Inter embedded, OFL)
build.mjs · serve.mjs · scripts/gen-qr.mjs · scripts/shots.sh
site/                     build output — a plain static site, publish anywhere
site-legacy/              the earlier static prototype (kept for reference)
docs/                     specs, plans, shots
```

## Design constraints

- **The v11 look is the system**: near-black green `#0d2024`, paper `#f2f6f2`, lime `#c8f36d`, mint / purple / coral / gold tags; heavy Inter headlines with one italic serif phrase per section; dark frames around light content; alternating bands; white portal sidebars with a dark loan-officer card.
- Honesty rules: MyScoreIQ FICO® labeled "not the mortgage-industry version lenders pull", three bureaus, no readiness percentage (plan progress instead), no promised deletions / points / approvals / timelines, Reg B line on consumer screens, engine tags (MyScoreIQ / CreditBuilderIQ) — no third-party reporting brand.
- The loan officer sees status, never the report.

## What's built

| Surface | What it is |
|---|---|
| Website (`?mode=marketing`) | v11 hero with a live platform window, the loop, product suite, org section, consumer section, integrations teaser; "Get your link in 60 seconds" opens the LO sign-up |
| Consumer (`?mode=consumer`) | Personal invitation → three consents (own use · status-not-report to the LO · texts) → checking → overview (3-bureau strip, plan progress, one next action) → plan (DTI, the Clock) → disputes with mortgage-why → why-it-moved → Guardian → review packet with hard-pull consent → Ask ReadyIQ |
| Loan officer (`?mode=lender`) | 60-second sign-up (email + NMLS → found you → your link) · Your link (copy · QR · text this to a client · invite · preview) · read-only status feed · overview · journeys · organization · integrations |
| Integrations (`?mode=integrations`) | Status object, connections, API actions, webhook events, integration levels |

Logic lives in `src/state.js` and is covered by `npm test`; a
`FIXTURE_VERSION` constant resets stale `localStorage` when fixtures change shape.

## Photo credit

Hero portrait (legacy site): Pexels photo 864994 by Andrea Piacquadio (Pexels license — free to use). `site/img/hero-person.jpg`.
