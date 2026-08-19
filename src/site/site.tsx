// src/site/site.tsx — the real website: one shell (nav · footer · CTA band · honesty strip), one page anatomy, and a page per topic.
// Every page opens with a live window of the product (see windows.tsx). Links are relative to <base href> so clean URLs work on Pages.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ReadyIQWebsite, IntegrationHub } from "../v11-page";
import { ConsentBlock } from "../screens/consumer";
import { ScoreWindow, LinkWindow, BoardWindow, FeedWindow, EventsWindow, PassportWindow, DoorWindow, AskWindow, ProtectWindow, BuildWindow, TriWindow, Frame } from "./windows";

type Route = string;
const DEMO = "demo/";

/* ---------- shell ---------- */
function Brand() { return <a className="brand-mark site-brand" href="./"><span className="brand-symbol"><i />R</span><span>Ready<span>IQ</span></span></a>; }

export function SiteNav({ route }: { route: Route }) {
  const [open, setOpen] = useState(false); const [dd, setDd] = useState<string | null>(null); const closeT = useRef<number | null>(null);
  const show = (k: string) => { if (closeT.current) { clearTimeout(closeT.current); closeT.current = null; } setDd(k); };
  const hideSoon = () => { if (closeT.current) clearTimeout(closeT.current); closeT.current = window.setTimeout(() => setDd(null), 450); };
  useEffect(() => { const onDoc = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest(".dd")) setDd(null); }; document.addEventListener("click", onDoc); return () => document.removeEventListener("click", onDoc); }, []);
  const is = (r: string) => route === r || route.startsWith(r + "/");
  const products: [string, string][] = [["products/check/", "Check — three bureaus, honest FICO®"], ["products/dispute-hub/", "Dispute Hub — by bureau, one item at a time"], ["products/build-report/", "Build & report — rent and everyday bills"], ["products/protect-mode/", "Protect Mode — during the loan"], ["products/passport/", "Readiness Passport — a status you own"], ["products/ask/", "Ask ReadyIQ — the underwriter in your pocket"]];
  const who: [string, string][] = [["loan-officers/", "Loan officers — one link, status only"], ["consumers/", "Consumers — check, build, dispute"], ["partners/", "Partners — realtors and buildings"]];
  return <header className={`site-nav ${open ? "open" : ""}`}>
    <div className="site-nav-inner">
      <Brand />
      <nav className="site-links">
        <a href="platform/" className={is("platform") ? "on" : ""}>Platform</a>
        <div className={`dd ${dd === "p" ? "show" : ""}`} onMouseEnter={() => show("p")} onMouseLeave={hideSoon}><button className={is("products") ? "on" : ""} onClick={() => (dd === "p" ? setDd(null) : show("p"))}>Products ▾</button><div className="dd-menu"><div className="dd-box">{products.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</div></div></div>
        <div className={`dd ${dd === "w" ? "show" : ""}`} onMouseEnter={() => show("w")} onMouseLeave={hideSoon}><button className={is("loan-officers") || is("consumers") || is("partners") ? "on" : ""} onClick={() => (dd === "w" ? setDd(null) : show("w"))}>Who it’s for ▾</button><div className="dd-menu"><div className="dd-box">{who.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</div></div></div>
        <a href="integrations/" className={is("integrations") ? "on" : ""}>Integrations</a>
        <a href="trust/" className={is("trust") ? "on" : ""}>Trust</a>
        <a href="resources/" className={is("resources") ? "on" : ""}>Resources</a>
      </nav>
      <div className="site-actions"><a className="site-try" href={DEMO + "?mode=consumer&cpage=result"}>Try the live demo</a><a className="site-signin" href="sign-in/">Sign in</a><a className="site-demo" href="book-a-demo/">Book a demo <span>↗</span></a><button className="site-burger" onClick={() => setOpen(!open)} aria-label="Menu">☰</button></div>
    </div>
    {open && <div className="site-mobile"><a href="platform/">Platform</a>{products.map(([h, l]) => <a key={h} href={h}>{l.split(" — ")[0]}</a>)}{who.map(([h, l]) => <a key={h} href={h}>{l.split(" — ")[0]}</a>)}<a href="integrations/">Integrations</a><a href="trust/">Trust</a><a href="resources/">Resources</a><a href="sign-in/">Sign in</a><a href="book-a-demo/">Book a demo</a><a href={DEMO + "?mode=consumer&cpage=result"}>Try the live demo</a></div>}
  </header>;
}

export function HonestyStrip() {
  return <div className="honesty"><span>✓ Status, never reports</span><span>✓ No promised deletions, points or approvals</span><span>✓ Soft pull only — apply at any time, never required</span><span>✓ MyScoreIQ + CreditBuilderIQ, named on every screen</span></div>;
}

export function CtaBand({ title = <>Give every “not yet” a <em>path back to you.</em></>, sub = "One link per loan officer. A front door for every consumer. Status into the CRM you already run." }: { title?: ReactNode; sub?: string }) {
  return <section className="cta-band"><div><span className="section-kicker light">READY WHEN YOU ARE</span><h2>{title}</h2><p>{sub}</p></div><div className="cta-band-actions"><a className="b2b-primary" href={DEMO + "?mode=lender&lpage=start"}>Get your link in 60 seconds →</a><a className="cta-ghost" href="book-a-demo/">Book a demo</a></div></section>;
}

export function SiteFooter() {
  const col = (t: string, links: [string, string][]) => <div><strong>{t}</strong>{links.map(([h, l]) => <a key={h} href={h}>{l}</a>)}</div>;
  return <footer className="site-footer">
    <div className="site-footer-inner">
      <div className="site-footer-brand"><Brand /><p>A lender-owned credit-readiness platform on IDIQ’s MyScoreIQ and CreditBuilderIQ. Not a CRM, on purpose.</p><small>Consumer credit tools — not a mortgage approval or lending decision. You can apply for a mortgage at any time; this is not required.</small></div>
      {col("Platform", [["platform/", "How it works"], ["integrations/", "Integrations"], ["trust/", "Trust & compliance"], [DEMO + "?guide=1", "The eight leader moves"]])}
      {col("Products", [["products/check/", "Check"], ["products/dispute-hub/", "Dispute Hub"], ["products/build-report/", "Build & report"], ["products/protect-mode/", "Protect Mode"], ["products/passport/", "Readiness Passport"], ["products/ask/", "Ask ReadyIQ"]])}
      {col("Who it’s for", [["loan-officers/", "Loan officers"], ["consumers/", "Consumers"], ["partners/", "Partners"], ["resources/", "Resources & FAQ"], ["book-a-demo/", "Book a demo"], ["sign-in/", "Sign in"]])}
    </div>
    <div className="site-footer-legal"><span>© 2026 ReadyIQ · a product of IDIQ</span><span>MyScoreIQ® · CreditBuilderIQ® · FICO® is a registered trademark of Fair Isaac Corporation</span><span>English · Español</span></div>
  </footer>;
}

/* ---------- page anatomy ---------- */
type Layout = "split" | "rev" | "center" | "narrow" | "band" | "grid";
type Section = { kicker: string; title: ReactNode; body: ReactNode; aside?: ReactNode; dark?: boolean; bullets?: string[]; layout?: Layout };
type PageDef = { kicker: string; title: ReactNode; lede: string; accent?: string; heroLayout?: "split" | "rev" | "stacked"; window: ReactNode; windowLabel: string; primary?: [string, string]; secondary?: [string, string]; sections: Section[]; faq?: [string, string][]; cta?: { title: ReactNode; sub: string } };

function Hero({ p }: { p: PageDef }) {
  return <section className={`site-hero cx-hero accent-${p.accent || "lime"} hero-${p.heroLayout || "split"}`}>
    <div className="cx-hero-copy"><span className="cx-pill"><i />{p.kicker}</span><h1>{p.title}</h1><p>{p.lede}</p>
      <div className="cx-actions">{p.primary && <a className="lime" href={p.primary[1]}>{p.primary[0]} <span>→</span></a>}{p.secondary && <a className="ghost" href={p.secondary[1]}>{p.secondary[0]}</a>}</div></div>
    <div className="site-hero-window"><Frame label={p.windowLabel}>{p.window}</Frame></div>
  </section>;
}

function Sections({ list }: { list: Section[] }) {
  let splitCount = 0;
  return <>{list.map((s, i) => {
    let layout: Layout = s.layout || (s.aside ? (splitCount++ % 2 ? "rev" : "split") : "narrow");
    const copy = <div className="site-copy"><span className={`section-kicker ${s.dark ? "light" : ""}`}>{s.kicker}</span><h2>{s.title}</h2><div className="site-body">{s.body}</div>{s.bullets && <ul className="site-bullets">{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}</div>;
    const aside = s.aside ? <div className="site-aside">{s.aside}</div> : null;
    return <section key={i} className={`site-section lay-${layout} ${s.dark ? "dark" : ""} ${i % 2 ? "alt" : ""}`}>
      <div className={`site-section-inner ${layout === "split" || layout === "rev" ? "" : "one"}`}>{layout === "rev" ? <>{aside}{copy}</> : <>{copy}{aside}</>}</div>
    </section>;
  })}</>;
}

function Faq({ items }: { items: [string, string][] }) {
  return <section className="site-section faq"><div className="site-section-inner one"><span className="section-kicker">QUESTIONS</span><h2>Straight answers.</h2><div className="faq-list">{items.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>;
}

function Page({ p }: { p: PageDef }) {
  return <><Hero p={p} /><HonestyStrip /><Sections list={p.sections} />{p.faq && <Faq items={p.faq} />}<CtaBand {...(p.cta || {})} /></>;
}

/* ---------- small reusable asides ---------- */
const Stat = ({ n, l }: { n: string; l: string }) => <div className="stat"><strong>{n}</strong><small>{l}</small></div>;
const Cards = ({ items }: { items: [string, string, string?][] }) => <div className="mini-cards">{items.map(([t, d, h]) => h ? <a key={t} href={h} className="mini-card"><strong>{t}</strong><p>{d}</p><b>Learn more →</b></a> : <div key={t} className="mini-card"><strong>{t}</strong><p>{d}</p></div>)}</div>;
const Loop = () => <div className="loop-cards">{[["01", "Invite", "The loan officer sends one personal ReadyIQ link. The consumer stays connected to that loan officer.", "paper"], ["02", "Check", "With permission, the consumer sees information from all three bureaus through a soft credit check.", "mint"], ["03", "Build and dispute", "The consumer follows a plan, reviews possible errors, creates letters, and adds eligible rent or bills.", "lime"], ["04", "Reconnect", "When the consumer is ready, they can ask the original loan officer for the next mortgage conversation.", "dark"]].map(([n, t, d, tone]) => <article key={n} className={tone}><span>{n}</span><strong>{t}</strong><p>{d}</p></article>)}</div>;

/* ---------- pages ---------- */
const PAGES: Record<string, PageDef> = {
  "platform": { heroLayout: "stacked", kicker: "PLATFORM · WHAT READYIQ DOES", title: <>Credit tools for consumers. <em>Progress for loan officers.</em></>, lede: "Consumers get a private place to check all three bureaus, review possible errors, create dispute letters, add eligible rent and bills, and follow a personalized plan. Loan officers see approved progress—not the private credit report—and reconnect when the consumer is ready for a mortgage conversation.", accent: "teal", window: <FeedWindow />, windowLabel: "The progress updates a loan officer sees", primary: ["See the consumer tools", DEMO + "?mode=consumer&cpage=result"], secondary: ["See the loan officer view", DEMO + "?mode=lender&lpage=link"],
    sections: [
      { kicker: "HOW IT WORKS", title: <>The loan officer invites. The consumer takes action. <em>ReadyIQ keeps both connected.</em></>, body: <p>The loan officer sends one link. The consumer checks their credit, follows a plan, uses dispute and credit-building tools, and decides when to reconnect. ReadyIQ keeps every approved progress update attached to the original loan officer.</p>, aside: <Loop />, layout: "center" },
      { kicker: "WHAT THE LOAN OFFICER SEES", title: <>Progress updates. <em>Never the private credit report.</em></>, body: <p>The loan officer can see where the consumer is in the journey, what milestone comes next, and whether the consumer has asked to talk again. Scores, accounts, dispute reasons, evidence and letters stay private unless the consumer chooses to share them.</p>, bullets: ["Current stage and next milestone", "A clear consumer-requested review signal", "The original loan officer, branch and source stay attached"], aside: <Frame label="Loan officer progress feed"><EventsWindow /></Frame>, dark: true, layout: "rev" },
      { kicker: "WORKS WITH YOUR CURRENT TOOLS", title: <>No extra system <em>to manage.</em></>, body: <p>Notes, tasks and pipeline stay in your current mortgage system. ReadyIQ sends the approved progress updates your team needs, so loan officers get one link and one clear feed instead of another daily queue.</p>, aside: <div className="stat-grid four"><Stat n="1" l="consumer link" /><Stat n="1" l="clear next action" /><Stat n="0" l="private reports shown" /><Stat n="3" l="bureaus in the consumer view" /></div>, layout: "band" },
      { kicker: "WHAT CONSUMERS CAN USE", title: <>Check, dispute, build and prepare—<em>in one place.</em></>, body: <p>ReadyIQ brings together a three-bureau credit view, guided error review, dispute-letter tools, eligible rent and bill reporting, a personalized action plan and a simple way to ask the loan officer for the next mortgage conversation.</p>, aside: <Cards items={[["Review possible errors", "Work through each item and create a dispute letter when appropriate.", "products/dispute-hub/"], ["Add eligible payment history", "See whether rent and everyday bills can help add positive history.", "products/build-report/"], ["Share progress when ready", "The consumer decides when to ask the loan officer for another conversation.", "products/passport/"]]} />, layout: "grid" },
    ],
    faq: [["What does the consumer do in ReadyIQ?", "They can check information from three bureaus, follow a personalized plan, review possible errors, create dispute letters, add eligible rent or bills, and track progress."], ["What does the loan officer see?", "Approved progress updates, the current stage, the next milestone and a request to reconnect. The private credit report and dispute work stay private unless the consumer chooses to share them."], ["Is ReadyIQ a mortgage application?", "No. It helps the consumer work toward a future mortgage conversation. The consumer can apply whenever they choose, and the lender makes every lending decision."]] },

  "loan-officers": { kicker: "FOR LOAN OFFICERS", title: <>One link. <em>Zero busywork.</em></>, lede: "In about a minute, you get a personal link you can text, print, or email. Every consumer stays connected to you. You see simple progress updates—not their credit report—and ReadyIQ brings them back when they are ready for another conversation.", accent: "teal", window: <LinkWindow />, windowLabel: "Your personal ReadyIQ link", primary: ["Get your link in 60 seconds", DEMO + "?mode=lender&lpage=start"], secondary: ["See consumer progress", DEMO + "?mode=lender&lpage=borrowers"],
    sections: [
      { kicker: "60 SECONDS", title: <>Email and NMLS. <em>That’s the setup.</em></>, body: <p>We fill the rest from your NMLS ID and pull your company’s brand from its website. You get a link, a QR and a text you can send from your phone. No install, no training, no new queue.</p>, bullets: ["Text this to a client — one tap, attributed to you", "Print the QR on a card or an open-house flyer", "Invite by email with the same attribution"], aside: <Frame label="Status feed"><FeedWindow /></Frame> },
      { kicker: "THE LEADS YOU ALREADY PAID FOR", title: <>Lost-lead revival, <em>one button.</em></>, body: <p>Sync the not-ready pile from your CRM or drop a CSV. ReadyIQ de-dupes, keeps the original loan officer, and sends each person a personal invitation to their own front door. They consent themselves. You see status.</p>, aside: <div className="stat-grid four"><Stat n="214" l="not-ready leads matched" /><Stat n="173" l="personal invitations" /><Stat n="12" l="loan officers, attribution intact" /><Stat n="0" l="reports seen by anyone" /></div>, dark: true, layout: "band" },
      { kicker: "THE LAST MILE", title: <>Real mortgage scores — <em>soft.</em></>, body: <p>At readiness, your credit vendor can run a soft tri-merge with mortgage-model FICO® (2 · 4 · 5). The consumer sees the real numbers, you see “floors met,” and nobody’s credit takes a hard inquiry before you talk.</p>, aside: <Frame label="Review packet · soft tri-merge"><TriWindow /></Frame> },
    ],
    faq: [["What do I actually see?", "Pathway, round, next milestone, review requests, Protect Mode status. Never a score or a report unless the consumer shares it."], ["Where do my notes go?", "Your CRM. ReadyIQ sends status events through Zapier or a connector; it never asks you to work in a second system."], ["Can partners use it?", "Yes — realtors and property managers get their own links and QR; they see coarse status only."]] },

  "consumers": { heroLayout: "rev", kicker: "FOR CONSUMERS", title: <>Understand your credit. Take the <em>next right step.</em></>, lede: "See information from all three credit bureaus, follow a plan made for you, review anything that looks wrong, and add eligible rent or bill payments. Your loan officer sees your progress—not your private credit report. You can apply for a mortgage whenever you choose.", accent: "mint", window: <ScoreWindow />, windowLabel: "Your private ReadyIQ home", primary: ["See the consumer portal", DEMO + "?mode=consumer&cpage=result"], secondary: ["Have a link from your lender? Start here", DEMO + "?c=summit-jlee"],
    sections: [
      { kicker: "THREE BUREAUS, HONESTLY", title: <>Always three scores, <em>never a promise.</em></>, body: <p>Equifax, Experian, TransUnion — FICO® via MyScoreIQ, labeled as not the version lenders pull. Every point that moves is tied to a cause. Nobody promises deletions, points or approvals.</p>, aside: <Frame label="Why it moved"><ScoreWindow /></Frame> },
      { kicker: "ONE CLEAR PATH", title: <>One next action, <em>every day.</em></>, body: <p>Utilization first, then the two flagged items, then 24 months of rent history — in the order an underwriter would care. Each step says why it matters for a mortgage. Ask ReadyIQ answers in plain words and never predicts an approval.</p>, aside: <Frame label="Ask ReadyIQ"><AskWindow /></Frame>, dark: true, layout: "center" },
      { kicker: "YOUR PASSPORT", title: <>A status you <em>own.</em></>, body: <p>Hand your readiness to a realtor or a second lender — your loan officer of record stays on every copy. It never contains your score or your report, and you can revoke it any time.</p>, aside: <Frame label="Readiness Passport"><PassportWindow /></Frame> },
    ],
    faq: [["Will this hurt my credit?", "No. The readiness check is a soft pull. A hard pull only happens when you request a review and say yes, when you talk to your loan officer."], ["Who sees what?", "Your loan officer sees status — pathway, round, milestones. Never your report or score details unless you request a review. Partners see even less."], ["¿Está en español?", "Sí — el portal, la puerta de entrada y el registro cambian a español con un toque."]] },

  "partners": { kicker: "FOR REALTORS AND PROPERTY TEAMS", title: <>Help more people become <em>ready to buy.</em></>, lede: "Every partner gets a link and QR code. Realtors can help future buyers who need more time. Property teams can help renters add eligible rent history months before they speak with a lender. Partners only see a simple progress stage—never a credit score or report.", accent: "gold", window: <DoorWindow />, windowLabel: "A partner-branded starting page", primary: ["See the partner experience", DEMO + "?mode=lender&lpage=partners"], secondary: ["View it in Spanish", DEMO + "?c=summit-palms&lang=es"],
    sections: [
      { kicker: "REALTORS", title: <>A stronger buyer, <em>months earlier.</em></>, body: <p>Your not-ready client gets a private plan and a loan officer who stays connected. You see “working” and “review requested” — never a score. When floors are met, the Readiness Passport is something they can bring to an offer.</p>, aside: <Frame label="Readiness Passport"><PassportWindow ready /></Frame> },
      { kicker: "PROPERTY MANAGERS", title: <>Rent that <em>counts.</em></>, body: <p>IDIQ already runs rent reporting for buildings. A building’s link starts residents reporting on-time rent to all three bureaus through CreditBuilderIQ — Fannie Mae’s DU counts it — and a lender is already connected when they’re ready to buy. The building sees nothing but “enrolled.”</p>, aside: <Frame label="Rent history"><BuildWindow /></Frame>, dark: true, layout: "center" },
    ],
    faq: [["What does a partner see?", "Sent · working · review requested. Never the score, never the report, never the plan."], ["Who is the loan officer of record?", "The lender who issued the partner link. Attribution is locked when the consumer enrolls."]] },

  "products/check": { kicker: "PRODUCT · CREDIT CHECK", title: <>See all three bureaus. <em>Know where you stand.</em></>, lede: "With your permission, ReadyIQ shows FICO® scores and credit information from Equifax, Experian, and TransUnion through MyScoreIQ. It is a soft credit check, so viewing it does not hurt your score. We clearly explain that mortgage lenders may use different score versions.", accent: "mint", window: <ScoreWindow />, windowLabel: "Your three-bureau credit view", primary: ["See it in the portal", DEMO + "?mode=consumer&cpage=result"],
    sections: [{ kicker: "PATHWAYS", title: <>Ready now · near ready · build · thin · <em>dispute.</em></>, body: <p>The check assigns a pathway in plain words and a round count (“round 2 of ~5”), not a readiness percentage. Program floors and an eligibility clock (Chapter 7, foreclosure, short sale) set honest expectations.</p>, aside: <div className="stat-grid four"><Stat n="3" l="bureaus, every time" /><Stat n="0" l="hard inquiries" /><Stat n="5" l="pathways" /><Stat n="1" l="next action" /></div>, layout: "band" }, { kicker: "WHY IT MOVED", title: <>Every point, <em>tied to a cause.</em></>, body: <p>+14 utilization down, +6 lates aging, −6 a new inquiry. Consumers stop guessing and loan officers stop explaining.</p>, dark: true }],
    faq: [["Is this a mortgage score?", "No, and the screen says so. At readiness a soft tri-merge through the lender’s vendor shows mortgage-model numbers without a hard pull."]] },

  "products/dispute-hub": { kicker: "PRODUCT · DISPUTE HUB", title: <>See what looks wrong. <em>Fix it step by step.</em></>, lede: "ReadyIQ organizes items from Equifax, Experian, and TransUnion in one place. You review one item at a time, explain what you believe is wrong, create your letter, and track the response. Nothing is sent unless you approve it.", accent: "violet", window: <BoardWindow />, windowLabel: "Items that may need your review", primary: ["Open the Dispute Hub", DEMO + "?mode=consumer&cpage=disputes"],
    sections: [{ kicker: "ONE ITEM AT A TIME", title: <>Is this information <em>right?</em></>, body: <p>Each item shows the facts, why CreditBuilderIQ flagged it, and why it matters for a mortgage — then one question. Say no and the letter writes itself; you read it and approve. Nothing is sent without you.</p>, bullets: ["Sequenced for a mortgage: collections that block programs first", "Letters only to the bureaus that actually report the item", "30-day clock kept for you; responses logged"] }, { kicker: "HONESTY", title: <>No promised <em>deletions.</em></>, body: <p>ReadyIQ does not claim accurate information can be removed or guarantee any result. Consumers dispute only what they believe is wrong — and the guideline notes explain when paying a collection does and doesn’t change the picture.</p>, dark: true }],
    faq: [["Does someone dispute for me?", "No — you drive. ReadyIQ writes the letter from your answers; you approve and it goes."], ["What happens during my loan?", "Protect Mode pauses new disputes so nothing changes on the report mid-underwriting."]] },

  "products/build-report": { kicker: "PRODUCT · RENT AND BILLS", title: <>Make the payments you already make <em>count.</em></>, lede: "CreditBuilderIQ can help verify eligible rent, electric, mobile, and other recurring payments and add them to your credit history. You choose what to connect and what to report. Results vary, and a score increase is never promised.", accent: "lime", window: <BuildWindow />, windowLabel: "Eligible rent history found", primary: ["See rent and bill reporting", DEMO + "?mode=consumer&cpage=reporting"],
    sections: [{ kicker: "RENT", title: <>24 months, <em>verified.</em></>, body: <p>CreditBuilderIQ matches the landlord, verifies the history and enrolls what the consumer chooses. Property-manager partners can start this a year before anyone talks to a lender.</p> }, { kicker: "EVERYDAY BILLS", title: <>Electric, mobile, <em>recurring.</em></>, body: <p>Eligible payments are matched, confirmed and added — no new traditional debt opened. Guidance on secured cards and credit-builder loans stays honest: check with your loan officer before opening or closing anything.</p>, dark: true }],
    faq: [["Is rent reporting guaranteed to raise my score?", "No. Results vary by product and scoring model; the screen says so. What it does is make verified history visible where it wasn’t."]] },

  "products/protect-mode": { kicker: "PRODUCT · PROTECT MODE", title: <>Protect your progress <em>until closing day.</em></>, lede: "Once your loan begins, Protect Mode pauses new dispute suggestions and reminds you to call your loan officer before opening an account, closing a card, moving money, or making a large payoff. ReadyIQ watches for important changes and shares only a simple alert with your loan officer.", accent: "teal", window: <ProtectWindow />, windowLabel: "Your closing protection checklist", primary: ["See Protect Mode", DEMO + "?mode=consumer&cpage=guardian"],
    sections: [{ kicker: "WHAT CHANGES", title: <>Nothing — <em>on purpose.</em></>, body: <p>No new accounts, no big payoffs, no surprise inquiries. MyScoreIQ monitoring flags anything new the same day; the loan officer receives a status, not a report. Closing-fund wire reminders included.</p>, bullets: ["Disputes paused automatically", "Daily report watch via MyScoreIQ", "LOS milestone (Encompass) can switch it on"] }],
    faq: [["Does the loan officer get the alerts?", "As status — “new inquiry detected” — never the report."]] },

  "products/passport": { heroLayout: "rev", kicker: "PRODUCT · READINESS PASSPORT", title: <>Share your progress—<em>not your private report.</em></>, lede: "The ReadyIQ Passport is a progress summary you control. It can show that lender targets are met, your debt level is in range, rent history is verified, and open disputes are resolved. It never includes your credit score or full report, and you can stop sharing at any time.", accent: "lime", window: <PassportWindow ready />, windowLabel: "A progress summary you control", primary: ["See the Passport", DEMO + "?mode=consumer&cpage=passport"], secondary: ["View a shared passport", DEMO + "?passport=RIQ-7F2A-MC"],
    sections: [{ kicker: "NETWORK EFFECT", title: <>The credential the whole transaction <em>trusts.</em></>, body: <p>Realtors strengthen offers with it; second lenders see status only; family can follow along. Attribution to the originating loan officer never moves. Only a platform neutral across lenders — and holding the credit-building rails — can issue it.</p> }, { kicker: "EARNED, NOT CLAIMED", title: <>Verified against <em>live status.</em></>, body: <p>The badge appears when program floors are met and DTI is in range, and disappears if they aren’t. Revocable by the consumer at any time.</p>, dark: true }],
    faq: [["Is the Passport a preapproval?", "No. It is status — verified by ReadyIQ, never a lending decision."]] },

  "products/ask": { kicker: "PRODUCT · ASK READYIQ", title: <>Mortgage guidance <em>in plain English.</em></>, lede: "Ask ReadyIQ explains common FHA, Fannie Mae, and Freddie Mac guidelines in everyday words. It can help you understand collections, debt-to-income, rent history, and what to avoid before closing. It can also help draft a letter of explanation. Your lender still makes every lending decision.", accent: "mint", window: <AskWindow />, windowLabel: "Ask a mortgage-readiness question", primary: ["Try it in the portal", DEMO + "?mode=consumer&cpage=plan"],
    sections: [{ kicker: "GUIDELINE-AWARE", title: <>Why each step matters to an <em>underwriter.</em></>, body: <p>Every plan step carries a note: FHA’s $2,000 non-medical collections rule, pricing tiers for utilization, DU’s 12-month rent history, the credit refresh before closing. Guidance, not a promise — programs and overlays vary, and the loan officer has the final word.</p> }],
    faq: [["Does it give legal or lending advice?", "No. It summarizes public agency guidelines and drafts documents the consumer edits. Approvals are the lender’s call."]] },

  "integrations": { kicker: "INTEGRATIONS", title: <>ReadyIQ progress, <em>inside the tools you already use.</em></>, lede: "Connect ReadyIQ with Total Expert, Blend, Encompass, Shape, Salesforce, or LenderHomePage. Start with a simple link, send progress updates into your CRM, or place the full consumer starting experience inside your existing website or loan application flow.", accent: "teal", window: <EventsWindow />, windowLabel: "Progress updates moving between systems", primary: ["Open the integration hub", DEMO + "?mode=integrations"],
    sections: [{ kicker: "START SIMPLE. GROW WHEN READY.", title: <>A link · progress updates · <em>fully built in.</em></>, body: <p>Start by adding a ReadyIQ link or QR code anywhere your team already works. Next, send clear progress updates into your CRM. When you are ready, place the full ReadyIQ starting experience inside your website or loan application system.</p>, aside: <Cards items={[["Simple progress update", "Current step · next goal · review request · original loan officer", undefined], ["Automatic updates", "Send important ReadyIQ milestones into the systems your team uses", undefined], ["Developer connection", "Create invitations, read progress, and manage approved connections", undefined]]} />, layout: "grid" }],
    faq: [["Does ReadyIQ write into my CRM?", "Only status events you subscribe to. It never reads notes or tasks back."]] },

  "trust": { heroLayout: "stacked", kicker: "TRUST & PRIVACY", title: <>Clear permission. <em>Protected information.</em></>, lede: "Consumers approve every credit check and every share. The lender receives simple progress updates—not the credit report. ReadyIQ does not promise score increases, deletions, or approvals. Consumers can stop sharing whenever they choose.", accent: "teal", window: <FeedWindow />, windowLabel: "Exactly what a loan officer can see",
    sections: [
      { kicker: "YOUR PERMISSION", title: <>Three clear choices, <em>before anything happens.</em></>, body: <p>Before checking credit, ReadyIQ asks the consumer to approve three things separately: view my credit for my own review, share simple progress with my loan officer, and send me text updates. A separate permission is required before a lender checks mortgage credit.</p>, aside: <Frame label="The choices exactly as the consumer sees them"><div className="consent-demo"><ConsentBlock onChange={() => {}} /></div></Frame>, layout: "rev" },
      { kicker: "WHAT STAYS PRIVATE", title: <>Your score, report, account details, and SSN <em>stay private.</em></>, body: <p>Loan officers and partners receive simple progress updates. The ReadyIQ Passport never contains a credit score. A dispute letter is sent only after the consumer approves it, and only to the credit bureau showing the item. A consumer can stop sharing at any time.</p>, dark: true, bullets: ["Every consumer screen says clearly: you can apply for a mortgage at any time", "No promised deletions, score increases, approvals, or timelines", "MyScoreIQ and CreditBuilderIQ are named wherever their tools appear"], aside: <div className="stat-grid four"><Stat n="0" l="credit scores shared with a lender" /><Stat n="0" l="credit reports shared" /><Stat n="3" l="clear choices before the check" /><Stat n="1" l="tap to stop sharing" /></div>, layout: "band" },
      { kicker: "HOW INFORMATION IS PROTECTED", title: <>Encrypted, limited by role, <em>recorded every time.</em></>, body: <p>Personal information is encrypted while it is sent and while it is stored. It is used only for the credit check the consumer approved. A lender never receives the full Social Security number. Each team member sees only what their role allows, and every share or stop-sharing action is recorded.</p>, aside: <Cards items={[["Encrypted", "Protected while information is sent and stored", undefined], ["Limited access", "Loan officers, branches, companies, and partners see different information", undefined], ["Activity record", "Every approved share and stop-sharing action is recorded", undefined]]} />, layout: "grid" },
    ],
    faq: [["Is ReadyIQ a credit repair organization?", "The consumer drives every dispute and approves every letter; ReadyIQ provides tools and guidance and makes no outcome claims. Program terms are reviewed with counsel for each market."], ["How is the texting compliant?", "Opt-in with express consent language, message rates disclosure and STOP handling on the consent itself."]] },

  "resources": { kicker: "RESOURCES", title: <>Plain answers, <em>in one place.</em></>, lede: "The guide to what makes ReadyIQ a leader, the explainer loan officers send consumers about consumer scores vs. mortgage scores, and the questions we hear most.", accent: "mint", window: <AskWindow />, windowLabel: "Ask ReadyIQ", primary: ["Open the Guide", "resources/guide/"],
    sections: [{ kicker: "A COMMON QUESTION", title: <>Why your ReadyIQ score may differ from your <em>mortgage score.</em></>, body: <p>MyScoreIQ shows FICO® scores from all three credit bureaus. These are useful for understanding and improving your credit, but a mortgage lender may use different FICO® score versions. When you are ready to speak with your lender again, the lender can check the mortgage versions without a hard inquiry if its credit provider supports that option.</p>, aside: <Frame label="Three-bureau mortgage score check"><TriWindow /></Frame> }, { kicker: "THE GUIDE", title: <>Eight practical ways ReadyIQ <em>helps people move forward.</em></>, body: <p>Share progress without sharing a report · start rent history early · see mortgage score versions before a hard inquiry · get simple mortgage guidance · find possible down-payment help · reconnect old leads · use ReadyIQ in Spanish · show verified progress.</p>, aside: <Cards items={[["The Guide", "See each idea, where it appears, and why it helps.", "resources/guide/"], ["Try the live demo", "Explore the website, lender portal, consumer portal, and connections.", DEMO + "?mode=consumer&cpage=result"], ["Privacy and trust", "See what is shared, what stays private, and how permission works.", "trust/"]]} />, dark: true, layout: "grid" }],
    faq: [["Can I get a walkthrough?", "Yes — book a demo, or open the Guide and click through it yourself."]] },
};

/* ---------- special pages ---------- */
function GuidePage() {
  const items: [string, string, string][] = [
    ["Shareable progress summary", "The consumer can share a simple progress summary with a realtor or another lender. The original loan officer stays connected.", DEMO + "?mode=consumer&cpage=passport"],
    ["Start while there is time", "Renters can begin building payment history well before they plan to apply for a home loan.", DEMO + "?mode=lender&lpage=partners"],
    ["A mortgage-focused credit check", "When the time is right, the consumer can see scores commonly used in mortgage lending without a hard credit check.", DEMO + "?mode=consumer&cpage=result"],
    ["Every step explains why", "The plan explains why each action may matter, in language a first-time homebuyer can understand.", DEMO + "?mode=consumer&cpage=plan"],
    ["Possible help with a down payment", "ReadyIQ can show programs that may fit. A loan officer confirms what is truly available.", DEMO + "?mode=consumer&cpage=plan"],
    ["Reconnect with earlier leads", "Invite people who were not ready before and keep each person connected to the original loan officer.", DEMO + "?mode=lender&lpage=campaigns"],
    ["A Spanish experience", "Switch the welcome, sign-up, and overview screens to Spanish while keeping the same clear explanations.", DEMO + "?c=summit-jlee&lang=es"],
    ["A clear ready-to-review moment", "When the consumer reaches the agreed goals, they can ask their loan officer to review the next step.", DEMO + "?mode=consumer&cpage=passport"]
  ];
  return <><section className="site-hero cx-hero accent-lime"><div className="cx-hero-copy"><span className="cx-pill"><i />RESOURCES · THE GUIDE</span><h1>Eight ways ReadyIQ <em>makes the next step easier.</em></h1><p>Each example is already part of the live product tour. Choose one to see exactly how it works.</p><div className="cx-actions"><a className="lime" href={DEMO + "?guide=1"}>Open the full product tour <span>→</span></a></div></div><div className="site-hero-window"><Frame label="Progress summary"><PassportWindow ready /></Frame></div></section>
    <HonestyStrip /><section className="site-section"><div className="site-section-inner one"><ol className="guide-grid">{items.map(([t, d, h], i) => <li key={t}><span>{String(i + 1).padStart(2, "0")}</span><strong>{t}</strong><p>{d}</p><a href={h}>Open in the demo →</a></li>)}</ol></div></section><CtaBand /></>;
}

function BookDemoPage() {
  const [sent, setSent] = useState(false);
  return <>
    <section className="site-hero cx-hero accent-teal">
      <div className="cx-hero-copy">
        <span className="cx-pill"><i />BOOK A DEMO</span>
        <h1>See ReadyIQ with <em>your leads and tools.</em></h1>
        <p>In 30 minutes, we’ll show how a person moves from “not yet” to ready—and how your team stays connected along the way.</p>
        <div className="cx-actions"><a className="ghost" href={DEMO + "?mode=consumer&cpage=result"}>Try the live demo first</a></div>
      </div>
      <div className="site-hero-window">
        <div className="demo-form">
          {!sent ? <>
            <span className="section-kicker">PLAN MY WALKTHROUGH</span>
            <div className="form-panel" style={{ padding: 0 }}>
              <div className="form-grid">
                <label>Your name<input defaultValue="" placeholder="Your name" /></label>
                <label>Work email<input placeholder="you@company.com" /></label>
                <label>Company<input placeholder="Your company" /></label>
                <label>Your role<select defaultValue="lo"><option value="lo">Loan officer</option><option>Branch manager</option><option>Marketing or growth</option><option>Privacy or compliance</option><option>Technology</option></select></label>
              </div>
              <label className="full-field">What matters most to you?<select defaultValue="all"><option value="all">See the whole experience</option><option>My link and progress updates</option><option>The consumer experience</option><option>Connections to my current tools</option><option>Privacy and permissions</option></select></label>
              <button className="primary-lime wide dark-text" onClick={() => setSent(true)}>Request my demo <span>→</span></button>
              <small>We’ll use these details only to plan your walkthrough. No spam.</small>
            </div>
          </> : <div className="demo-sent">
            <span>✓</span>
            <h3>You’re all set—we’ll reach out within one business day.</h3>
            <p>You can explore the loan officer, consumer, and connected-tools views right now.</p>
            <a className="primary-dark" href={DEMO + "?mode=lender&lpage=link"}>Open the live demo →</a>
          </div>}
        </div>
      </div>
    </section>
    <HonestyStrip />
    <CtaBand title={<>Prefer to <em>click first?</em></>} sub="Explore the website, loan officer view, consumer experience, and connected-tools view." />
  </>;
}

function SignInPage() {
  return <><section className="site-hero cx-hero accent-mint"><div className="cx-hero-copy"><span className="cx-pill"><i />SIGN IN</span><h1>Who’s <em>signing in?</em></h1><p>Loan officers and organizations sign in here. Consumers don’t need an account to start — use the link your loan officer sent you.</p></div><div className="site-hero-window"><div className="signin-cards"><a className="signin-card" href={DEMO + "?mode=lender&lpage=link"}><span className="section-kicker">LOAN OFFICER · ORGANIZATION</span><strong>Open the organization portal</strong><p>Your link, status feed, partners, journeys, integrations.</p><b>Sign in →</b></a><a className="signin-card" href={DEMO + "?c=summit-jlee"}><span className="section-kicker">CONSUMER</span><strong>Use the link your loan officer sent</strong><p>Or tap the QR on their card. Your front door is already branded and attributed.</p><b>Open my front door →</b></a><a className="signin-card ghost" href={DEMO + "?mode=lender&lpage=start"}><span className="section-kicker">NEW HERE?</span><strong>Get your link in 60 seconds</strong><p>Email and NMLS. We fill in the rest.</p><b>Start →</b></a></div></div></section><HonestyStrip /><SiteFooterSpacer /></>;
}
function SiteFooterSpacer() { return <div style={{ height: 24 }} />; }

function TestimonialSection() {
  const testimonials = [
    {
      quote: "I can give a not-ready buyer something genuinely helpful without losing the relationship we already built.",
      role: "Loan officer perspective",
      detail: "A useful next step after ‘not yet’",
      tone: "lime"
    },
    {
      quote: "I know what to work on next, and I decide when I’m ready to talk with my lender again.",
      role: "Consumer perspective",
      detail: "Clear, private and encouraging",
      tone: "mint"
    },
    {
      quote: "The team gets meaningful progress updates without opening the consumer’s private credit report.",
      role: "Privacy perspective",
      detail: "Useful visibility with clear limits",
      tone: "violet"
    }
  ];

  return <section className="site-section testimonial-section" aria-labelledby="testimonial-title">
    <div className="site-section-inner one">
      <div className="testimonial-heading">
        <div><span className="section-kicker light">THE EXPERIENCE IN THEIR WORDS</span><h2 id="testimonial-title">People keep moving. <em>Relationships stay intact.</em></h2></div>
        <p>ReadyIQ is designed to make the next step feel clear for the consumer and useful for the mortgage team.</p>
      </div>
      <div className="testimonial-grid">
        {testimonials.map((item, index) => <article className={`testimonial-card ${index === 0 ? "featured" : ""}`} key={item.role}>
          <div className="testimonial-card-top"><span className={`testimonial-mark ${item.tone}`}>“</span><small>ILLUSTRATIVE</small></div>
          <blockquote>{item.quote}</blockquote>
          <footer><span className={`testimonial-avatar ${item.tone}`}>{index === 0 ? "LO" : index === 1 ? "C" : "P"}</span><div><strong>{item.role}</strong><small>{item.detail}</small></div></footer>
        </article>)}
      </div>
      <p className="testimonial-disclosure">Illustrative prototype perspectives—not verified customer endorsements. Replace with approved pilot quotes, names and organizations when available.</p>
    </div>
  </section>;
}

function ProductFilmSection() {
  return <section className="product-film-section" aria-labelledby="product-film-title">
    <div className="product-film-inner">
      <div className="product-film-heading">
        <div><span className="section-kicker light">THE COMPLETE READYIQ JOURNEY · 1:27</span><h2 id="product-film-title">See the lender portal and consumer experience <em>work together.</em></h2></div>
        <div className="product-film-summary"><p>From the loan officer’s personal link to the consumer’s private credit tools—and the approved progress that comes back.</p><div><span>Loan officer portal</span><i>→</i><span>Consumer portal</span><i>→</i><span>Ready to reconnect</span></div></div>
      </div>
      <div className="product-film-frame">
        <video controls playsInline preload="metadata" poster="media/readyiq-product-film-poster.jpg" aria-label="ReadyIQ lender and consumer portal product tour">
          <source src="media/readyiq-product-film.mp4" type="video/mp4" />
          <track kind="captions" src="media/readyiq-product-film.vtt" srcLang="en" label="English" default />
          Your browser does not support the ReadyIQ product film.
        </video>
      </div>
      <div className="product-film-footer"><span><i />Real prototype screens</span><span>Plain-English narration</span><span>Captions included</span><a href={DEMO + "?mode=lender&lpage=link"}>Explore the live portals →</a></div>
    </div>
  </section>;
}

function HomePage() {
  const to = (href: string) => () => { location.href = href; };
  return <div className="site-home"><ReadyIQWebsite openOrganization={to(DEMO + "?mode=lender&lpage=link")} openStart={to(DEMO + "?mode=lender&lpage=start")} openConsumer={(page = "welcome") => { location.href = page === "welcome" ? DEMO + "?mode=consumer" : DEMO + "?mode=consumer&cpage=" + page; }} openIntegrations={to("integrations/")} />
    <ProductFilmSection />
    <TestimonialSection />
    <section className="site-section"><div className="site-section-inner one"><span className="section-kicker">CHOOSE YOUR VIEW</span><h2>See the part that matters <em>to you.</em></h2><div className="mini-cards four">{([["How ReadyIQ works", "See the simple path from first invitation to lender review.", "platform/"], ["For loan officers", "Get one link and clear progress updates—without another system to manage.", "loan-officers/"], ["For consumers", "Understand your credit and take one clear step at a time.", "consumers/"], ["Privacy and trust", "See what is shared, what stays private, and who stays in control.", "trust/"]] as [string, string, string][]).map(([t, d, h]) => <a key={t} href={h} className="mini-card"><strong>{t}</strong><p>{d}</p><b>Explore →</b></a>)}</div></div></section>
    <CtaBand title={<>Keep the consumer. <em>Build the relationship.</em></>} sub="Give every not-ready lead a clear next step and an easy path back to the original loan officer." />
  </div>;
}

export function Site({ route }: { route: Route }) {
  const key = route.replace(/\/$/, "");
  let body: ReactNode;
  if (key === "") body = <HomePage />;
  else if (key === "resources/guide") body = <GuidePage />;
  else if (key === "book-a-demo") body = <BookDemoPage />;
  else if (key === "sign-in") body = <SignInPage />;
  else if (key === "integrations") body = <><Page p={PAGES.integrations} /><div className="site-hub"><IntegrationHub setMode={() => { location.href = DEMO + "?mode=lender&lpage=link"; }} /></div></>;
  else if (PAGES[key]) body = <Page p={PAGES[key]} />;
  else body = <section className="site-section"><div className="site-section-inner one"><h2>Page not found.</h2><p><a href="./">Back to the start →</a></p></div></section>;
  return <div className="site"><SiteNav route={key} /><main>{body}</main><SiteFooter /></div>;
}
