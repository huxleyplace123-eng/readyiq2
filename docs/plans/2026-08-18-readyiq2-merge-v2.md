# ReadyIQ 2 — Merge v2 (visual system + breadth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Executed inline by the author; this file records the decisions and the task list.

**Goal:** Take the Stage-1 static prototype and (1) replace the visual system with a stronger one, (2) consolidate the consumer portal to five tabs, (3) add the breadth the other agent's mockup had — marketing site, four-step Dispute Hub, invite flow, org settings, integrations page, demo switcher — while keeping ReadyIQ 2's spine: not a CRM, one next action, honest number, the Path, the mortgage layer, MyScoreIQ + CreditBuilderIQ named on every tool surface.

**Architecture:** Unchanged — multi-page static under `site/`, ESM modules, `state.js` fixtures + rules, `node --test`. New pages: `index.html` (marketing), `lo/start/`, `lo/`, `r/`, `p/`, `integrations/`. New modules: `portal-progress.js`, `page-lo.js`, `page-marketing.js`, `demo.js`.

**Tech Stack:** HTML/CSS/vanilla ESM, Node 20+, dev-time `qrcode` (npm) to pre-generate QR SVGs.

## Decisions (from the review of the other mockup)

- **Two brand layers, one system.** ReadyIQ layer (marketing, LO/org, integrations, demo chrome): paper `#F2F6F2` canvas, ink `#102226`, deep navy `#0D2024` / `#071418`, lime `#C8F36D` accent, mint/teal/purple/coral/gold as pathway tones, big radii (24/16), layered soft shadows, glow orbs, serif-italic emphasis in headlines. Consumer portal: **lender-branded light** (Harbor teal leads, ReadyIQ recessive "powered by") on the same paper canvas and components.
- **Font:** Geist stays for text/UI; serif italic (`Georgia`, system serif) for `em` in display headlines.
- **Consumer nav = five tabs:** Home · Plan · Disputes · Build · Progress. Ask ReadyIQ = floating button → sheet. Guardian = banner (+ `#guardian` reachable from it). Request review, Protected homebuying, Settings live under the avatar menu (review also on Home + Progress).
- **Home:** greeting + pathway badge + round chip → Number card (ring gauge + honest caption + bureaus) beside the Path card → Next Action → compact toolkit row (Plan / Disputes / Build / Progress with live status) → LO card ("Sarah is still with you" · Message · Request review) → Reg B.
- **Progress (new):** score history chart (SVG area/line, sample points), Path timeline, milestones list, "why it moved" deltas, review CTA. Absorbs `#number`.
- **Disputes:** per-item four-step flow — Review item → Reason → Letter preview → Track — with mortgage-priority ordering, "finish before review," and pause under Guardian preserved. Bureau checkboxes; letter preview text; response target date = sent + 33 days.
- **Build:** rent + utilities as before + guidance cards (secured card, builder loan, "ask before opening/closing"). No "Breeze Credit" anywhere — CreditBuilderIQ (Resident-Link underneath) is the engine.
- **Enrollment:** step 1 adds "What best describes you?" (buy now / 3–6 months / exploring) — stored as `timeline`; step 2 (IDIQ verify) = address · DOB · SSN last 4 · one-time code; step 3 unchanged. Three consents unchanged.
- **Front door:** two doors on one page — public "Check my readiness" and, when `?c=` resolves to an LO/agent link, a **personal invitation** state ("Personal invitation from Sarah Miller"). Richer hero: platform window (desktop-style card) + floating labels; phone kept for mobile.
- **No readiness percentage.** Progress shows rounds, milestones, plan completion — never "% ready" or "% to review."
- **Marketing site (`index.html`):** dark hero with the live platform window, trust strip (Total Expert · Blend · Encompass · Shape · Salesforce · LenderHomePage), problem statement, the loop (Capture · Check · Act · Return), product suite tabs with product windows (Dispute Hub · Rent & bills · Build · Track), modules grid, "your organization owns the program" (thin: link, routing, status feed, product configuration), consumer experience section, integrations teaser (event stream), final CTA, footer. **No invented statistics** — sample labels only. CTA "Get your link in 60 seconds" → `lo/start/`.
- **LO/org — still not a CRM:** `lo/start/` (email + NMLS autofill + brand pull), `lo/` (link · QR · "Text this to a client" · Invite modal with LO/branch/source/channel/message), `lo/#feed` (read-only Status Cards, review-requested pinned, pathway filters — no notes/tasks/messages/KPI dollars), `lo/#org` (brand preview, org invite link, default routing, product configuration toggles lender-sponsored/consumer-paid, consent copy, connections). A "this month" strip of counts only (invited · enrolled · review requested).
- **`integrations/`:** dark page — connection cards, architecture strip (Entry point → ReadyIQ → IDIQ engines → Return), the real event names (`consumer.enrolled`, `readiness.check_completed`, `progress.milestone_reached`, `review.requested`, `protect_mode.activated`), a Zapier row.
- **Demo switcher (`demo.js`):** small "ReadyIQ demo ▾" pill on every page → Website · Front door · Consumer (pick fixture) · Loan officer · Integrations · Reset. `?demo=0` hides it. Replaces the `?dev=1` panel.
- **QR:** `scripts/gen-qr.mjs` with `qrcode` → `site/assets/qr/<code>.svg`, committed.

## Tasks

- [ ] **A1** tokens/base/components v2 (two layers, ring gauge, orbs, dark sections, tabs, toggles, table-ish cards, demo pill) + gallery updated.
- [ ] **A2** Portal: five-tab nav, avatar menu, floating Ask (sheet), Home restyle, Progress page, Disputes four-step, Build guidance, `#number` → Progress redirect. Fixtures: `timeline`, dispute `bureaus`, `sentAt`/`responseDue`.
- [ ] **A3** Front door restyle + invitation state; enrollment step-1 question + step-2 identity fields.
- [ ] **B1** `index.html` marketing site + `page-marketing.js` (product-suite tabs, live window).
- [ ] **C1** `lo/start/`, `lo/` (link/QR/text/invite modal/feed/org), fixtures for invited consumers + org config; QR generation.
- [ ] **C2** `r/`, `p/` link + partner pages; `integrations/`.
- [ ] **C3** `demo.js` switcher on every page; remove `?dev=1` panel.
- [ ] **V** Verify every route at 375/768/1280, console clean, `npm test`, screenshots, README/spec/memory update, merge branch.
