// src/screens/partner.tsx — the credit-repair firm's portal, built from the same parts as the lender
// portal (lender-app · lender-sidebar · lender-header · cx-hero · kpi-grid · borrower-table) so the two
// sides of the handoff look like one product.
//
// Three rules shape this surface and all three come from the law, not from taste:
//   1. The summary carries a stage and blockers — never a score, never the report.
//   2. The client consents to this specific share, and the consent is stamped and kept.
//   3. The operator may pick more than one loan officer, and nothing of value moves
//      in either direction. Flat pricing, never per referral.
import { useEffect, useState } from "react";
import { StagePill, StageTable, STAGE_LABEL, bucketOf, type Stage, type StageRow } from "./stage";
import { sendReferral, railLive, consentNow, precision, listReferrals, type Referral } from "../rail";

type PartnerPage = "cases" | "case" | "partners" | "log" | "company";

const FIRM = { name: "Brightpath Credit", initials: "BP", seats: 6, city: "Phoenix, AZ", owner: { name: "Dana Whitfield", initials: "DW", role: "Owner · Brightpath" } };

// `railId` is the same person in the rail's fixture world (server/state.js: Harbor Home Loans). When a
// rail is connected, the send flow posts against that record and the rail derives the summary itself —
// the browser never sends one.
type Case = {
  id: string; railId: string; name: string; initials: string; tone: string; stage: Stage;
  blocker: string; days: number; lo: string | null; loCompany: string;
  floors: string[]; dtiInRange: boolean | null; rentMonths: number;
  disputes: { open: number; resolved: number; withdrawn: number };
};

const CASES: Case[] = [
  { id: "aaron", railId: "priya", name: "Aaron Patel", initials: "AP", tone: "gold", stage: "ready_to_review", blocker: "Nothing open — cleared last round", days: 4, lo: "Jordan Lee", loCompany: "Summit Home Loans", floors: ["FHA", "Conventional"], dtiInRange: true, rentMonths: 24, disputes: { open: 0, resolved: 3, withdrawn: 0 } },
  { id: "derek", railId: "denise", name: "Derek Young", initials: "DY", tone: "lime", stage: "approaching", blocker: "Crossed the floor — inside the buffer", days: 9, lo: "Jordan Lee", loCompany: "Summit Home Loans", floors: ["FHA"], dtiInRange: true, rentMonths: 12, disputes: { open: 0, resolved: 2, withdrawn: 1 } },
  { id: "maya", railId: "maria", name: "Maya Collins", initials: "MC", tone: "mint", stage: "working", blocker: "Card at 41% — target is 30%", days: 22, lo: "Jordan Lee", loCompany: "Summit Home Loans", floors: [], dtiInRange: true, rentMonths: 0, disputes: { open: 1, resolved: 1, withdrawn: 0 } },
  { id: "sofia", railId: "sam", name: "Sofia Ramirez", initials: "SR", tone: "violet", stage: "working", blocker: "2 letters mailed — bureaus due Sep 8", days: 14, lo: null, loCompany: "walk-in", floors: [], dtiInRange: false, rentMonths: 0, disputes: { open: 2, resolved: 0, withdrawn: 0 } },
  { id: "nina", railId: "jordan", name: "Nina Brooks", initials: "NB", tone: "blue", stage: "not_ready", blocker: "Thin file — 19 months of rent to add", days: 3, lo: null, loCompany: "walk-in", floors: [], dtiInRange: null, rentMonths: 0, disputes: { open: 0, resolved: 0, withdrawn: 0 } },
];

type Lo = { id: string; name: string; initials: string; tone: string; company: string; branch: string; nmls: string; referred: number; sentBack: number; qualified: number; note: string };
const PARTNER_LOS: Lo[] = [
  { id: "jlee", name: "Jordan Lee", initials: "JL", tone: "mint", company: "Summit Home Loans", branch: "Scottsdale North", nmls: "1849201", referred: 3, sentBack: 2, qualified: 1, note: "Referred Maya, Derek and Aaron to you" },
  { id: "amorgan", name: "Alex Morgan", initials: "AM", tone: "gold", company: "Summit Home Loans", branch: "Phoenix Central", nmls: "2033117", referred: 0, sentBack: 0, qualified: 0, note: "Connected last week" },
  { id: "rkaur", name: "Priya Kaur", initials: "PK", tone: "purple", company: "Vantage Lending", branch: "Tempe", nmls: "1177420", referred: 0, sentBack: 1, qualified: 1, note: "Works FHA and down-payment assistance" },
];

// Names for the ids that travel on the rail, so the log reads like a log and not like a database.
const PARTY_NAMES: Record<string, string> = { jlee: "Jordan Lee", amorgan: "Alex Morgan", rkaur: "Priya Kaur", brightpath: "Brightpath Credit", "brightpath-credit": "Brightpath Credit", disputechat: "DisputeChat", "clearpath-repair": "Clearpath Repair" };
const nameOf = (id: string) => PARTY_NAMES[id] ?? CASES.find((c) => c.railId === id)?.name ?? id.replace(/^c_/, "").replace(/[-_]+/g, " ");
const first = (name: string) => name.split(" ")[0];
const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six"];

// The illustrative log: both directions, a consent stamp on every row, and what the formal pull found.
type LogRow = { id: string; when: string; client: string; direction: "cr_to_lo" | "lo_to_cr"; who: string; stage: Stage; disputes: string; consent: string; outcome: string | null };
const LOG_DEMO: LogRow[] = [
  { id: "ref_9c41…", when: "Aug 30", client: "Aaron Patel", direction: "cr_to_lo", who: "Jordan Lee", stage: "ready_to_review", disputes: "0 open · 3 resolved", consent: "Aug 30 · 9:14 AM · v1", outcome: "qualified" },
  { id: "ref_7d02…", when: "Aug 22", client: "Marcus Hale", direction: "cr_to_lo", who: "Priya Kaur", stage: "ready_to_review", disputes: "0 open · 2 resolved", consent: "Aug 22 · 4:41 PM · v1", outcome: "qualified" },
  { id: "ref_51ae…", when: "Aug 12", client: "Maya Collins", direction: "lo_to_cr", who: "Jordan Lee", stage: "not_ready", disputes: "2 open · 0 resolved", consent: "Aug 12 · 2:03 PM · v1", outcome: null },
  { id: "ref_3b77…", when: "Aug 4", client: "Derek Young", direction: "lo_to_cr", who: "Jordan Lee", stage: "not_ready", disputes: "3 open · 0 resolved", consent: "Aug 4 · 11:26 AM · v1", outcome: null },
  { id: "ref_2e90…", when: "Jul 29", client: "Aaron Patel", direction: "lo_to_cr", who: "Jordan Lee", stage: "working", disputes: "3 open · 0 resolved", consent: "Jul 29 · 10:02 AM · v1", outcome: null },
  { id: "ref_18f3…", when: "Jul 18", client: "Tasha Green", direction: "cr_to_lo", who: "Jordan Lee", stage: "approaching", disputes: "0 open · 1 resolved", consent: "Jul 18 · 3:15 PM · v1", outcome: "short" },
];

const fmtStamp = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`; };
const fromRail = (r: Referral): LogRow => ({
  id: r.id, when: new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }), client: nameOf((r.consumer_ref ?? "").replace(/^c_/, "")),
  direction: r.direction, who: r.to.map((p) => nameOf(p.id)).join(", "), stage: (r.summary.stage as Stage) ?? "working",
  disputes: `${r.summary.disputes.open} open · ${r.summary.disputes.resolved} resolved${r.summary.disputes.withdrawn ? ` · ${r.summary.disputes.withdrawn} withdrawn` : ""}`,
  consent: r.consent ? `${fmtStamp(r.consent.granted_at)} · ${r.consent.text_version ?? "v1"}` : "—", outcome: r.outcome?.outcome ?? null,
});

/** Live from the rail when one is connected; the illustrative figure otherwise, and it says which. */
function usePrecision() {
  const [p, setP] = useState<{ flagged: number; qualified: number; short: number; rate: number | null } | null>(null);
  useEffect(() => { if (railLive()) precision().then((r) => { if (r.ok) setP(r.data); }); }, []);
  const live = !!p; const flagged = p?.flagged ?? 3; const q = p?.qualified ?? 2, s = p?.short ?? 1; const decided = q + s; const rate = p ? p.rate : 2 / 3;
  const pct = rate == null ? "—" : `${Math.round(rate * 100)}%`;
  const verdicts = decided ? `${q} of ${decided} qualified on formal pull` : `${flagged} sent back · no formal pulls yet`;
  return { live, flagged, qualified: q, decided, rate, pct, verdicts, text: `${decided ? pct : "not yet measured"} · ${verdicts} · ${live ? "live" : "illustrative"}` };
}
function useReferrals() {
  const [rows, setRows] = useState<Referral[] | null>(null);
  useEffect(() => { if (railLive()) listReferrals().then((r) => { if (r.ok) setRows(r.data); }); }, []);
  return rows;
}

const Brand = () => <div className="brand-mark inverse"><span className="brand-symbol"><i />R</span><span>Ready<span>IQ</span></span></div>;

// Deep links, the same way the lender portal takes ?lpage=: ?mode=partner&ppage=log · &ppage=case&pcase=aaron
const PAGES: PartnerPage[] = ["cases", "case", "partners", "log", "company"];
const q = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
const initialPage = PAGES.includes(q.get("ppage") as PartnerPage) ? (q.get("ppage") as PartnerPage) : "cases";
const initialCase = CASES.some((x) => x.id === q.get("pcase")) ? q.get("pcase") : null;

export function PartnerApp({ openIntegrations }: { openIntegrations?: () => void }) {
  const [page, setPage] = useState<PartnerPage>(initialPage === "case" && !initialCase ? "cases" : initialPage);
  const [openCase, setOpenCase] = useState<string | null>(initialPage === "case" ? initialCase : null);
  const [sendId, setSendId] = useState<string | null>(null);
  const c = CASES.find((x) => x.id === openCase) ?? null;
  const go = (p: PartnerPage) => { setOpenCase(null); setPage(p); };
  const open = (id: string) => { setOpenCase(id); setPage("case"); };
  const nav: [PartnerPage | "connections", string, string, string?][] = [["cases", "♙", "Cases", String(CASES.length)], ["partners", "⚭", "Loan officers", String(PARTNER_LOS.length)], ["log", "▥", "Referral log"], ["company", "◎", "Your firm"], ["connections", "⌘", "Connections"]];
  return <div className="lender-app partner-app">
    <aside className="lender-sidebar">
      <div className="lender-sidebar-logo"><Brand /><span>FOR CREDIT REPAIR</span></div>
      <div className="company-switch"><div className="mini-summit inverse"><b>B</b><span>{FIRM.name}<small>Firm portal · {FIRM.seats} seats</small></span></div><i>⌄</i></div>
      <nav>
        <span className="nav-label">YOUR FIRM</span>
        {nav.map(([id, icon, label, badge]) => <button key={id} className={page === id || (id === "cases" && page === "case") ? "active" : ""} onClick={() => id === "connections" ? openIntegrations?.() : go(id)}><i>{icon}</i>{label}{badge && <b>{badge}</b>}</button>)}
        <span className="nav-label lower">INSIGHTS</span>
        <button onClick={() => go("log")}><i>↗</i>Precision</button>
      </nav>
      <div className="sidebar-support"><span>?</span><div><strong>Partner success</strong><button onClick={() => go("company")}>Get help →</button></div></div>
    </aside>
    <div className="lender-main">
      <header className="lender-header">
        <div className="header-search"><span>⌕</span><input aria-label="Search" placeholder="Search clients, loan officers, referrals..." /></div>
        <div className="header-right"><button className="icon-button" aria-label="2 clients ready to hand back" onClick={() => go("cases")}>♢<b>2</b></button><button className="user-menu" onClick={() => go("company")}><span>{FIRM.owner.initials}</span><div><strong>{FIRM.owner.name}</strong><small>{FIRM.owner.role}</small></div><i>⌄</i></button></div>
      </header>
      {page === "case" && c ? <CaseView c={c} back={() => go("cases")} send={() => setSendId(c.id)} /> :
        page === "partners" ? <LoanOfficersPage go={go} send={(id) => setSendId(id)} /> :
        page === "log" ? <ReferralLogPage /> :
        page === "company" ? <CompanyPage /> :
        <CasesPage open={open} go={go} send={(id) => setSendId(id)} />}
    </div>
    {sendId && <SendModal c={CASES.find((x) => x.id === sendId)!} close={() => setSendId(null)} />}
  </div>;
}

/* ---------- Cases: the home page, in the lender portal's shape ---------- */
function CasesPage({ open, go, send }: { open: (id: string) => void; go: (p: PartnerPage) => void; send: (id: string) => void }) {
  const ready = CASES.filter((x) => bucketOf(x.stage) === "ready");
  const referred = CASES.filter((x) => x.lo).length;
  const due = CASES.find((x) => x.id === "sofia")!;
  const p = usePrecision();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).replace(",", " ·").toUpperCase();
  const rows: StageRow[] = CASES.map((x) => ({
    key: x.id, name: x.name, initials: x.initials, tone: x.tone, sub: x.lo ? x.loCompany : "Walk-in client", stage: x.stage, blocker: x.blocker,
    when: `${x.days} days`, source: x.lo ?? "Walk-in", onOpen: () => open(x.id),
    action: bucketOf(x.stage) === "ready" ? { label: "Send with consent →", run: () => send(x.id) } : { label: "Open case →", run: () => open(x.id) },
  }));
  return <div className="lender-page lx-page">
    <section className="cx-hero lx-hero">
      <div className="cx-hero-copy">
        <span className="cx-pill"><i />{today} · {FIRM.name.toUpperCase()}</span>
        <h1>{WORDS[ready.length] ?? ready.length} {ready.length === 1 ? "client is" : "clients are"} ready to <em>hand back.</em></h1>
        <p>{ready.map((x) => first(x.name)).join(" and ")} cleared their rounds and sit inside the lender's buffer. Send them with consent, and the loan officer sees a stage and the blockers — never the score, never the report.</p>
        <div className="cx-actions"><button className="lime" onClick={() => send(ready[0].id)}>Send {first(ready[0].name)} with consent <span>→</span></button><button className="ghost" onClick={() => go("log")}>Open the referral log</button></div>
        <div className="cx-trust"><span>✓ {CASES.length} active clients</span><span>✓ Consent stamped on every send</span><span>✓ Never the report</span></div>
      </div>
      <div className="cx-window">
        <div className="cx-chrome"><span><i />Ready to hand back · today</span><button className="cx-inline" onClick={() => go("partners")}>Loan officers →</button></div>
        <div className="lx-attn">
          {ready.map((x) => <button key={x.id} onClick={() => send(x.id)}><span className={`person-avatar ${x.tone}`}>{x.initials}</span><div><strong>{x.name}</strong><small>{STAGE_LABEL[x.stage]} · {x.blocker}</small></div><b>Send →</b></button>)}
          <button onClick={() => open(due.id)}><span className={`person-avatar ${due.tone}`}>{due.initials}</span><div><strong>{due.name}</strong><small>Working · {due.blocker}</small></div><b>Open →</b></button>
        </div>
        <div className="cx-window-foot"><span>Ready-to-review precision {p.decided ? <><b>{p.pct}</b> · </> : null}{p.verdicts} · {p.live ? "live" : "illustrative"}</span><button className="cx-inline" onClick={() => go("log")}>Referral log →</button></div>
        <div className="cx-float br lime"><i>◈</i><div><small>SENT BACK THIS QUARTER</small><strong>{p.flagged} {p.flagged === 1 ? "referral" : "referrals"} · {p.qualified} qualified</strong></div></div>
      </div>
    </section>
    <section className="kpi-grid lx-kpis">
      <article><div><span>Active clients</span><i className="kpi-icon mint">♙</i></div><strong>{CASES.length}</strong><p>{referred} referred by loan officers</p></article>
      <article><div><span>Ready to hand back</span><i className="kpi-icon lime">✓</i></div><strong>{ready.length}</strong><p>inside the lender's buffer</p></article>
      <article><div><span>Referred to you</span><i className="kpi-icon purple">↙</i></div><strong>{referred}</strong><p>this quarter, from Summit Home Loans</p></article>
      <article className="dark-kpi" onClick={() => go("log")} style={{ cursor: "pointer" }}><div><span>Sent back</span><i className="kpi-icon dark">◈</i></div><strong>{p.flagged}</strong><p>{p.verdicts} → log</p></article>
    </section>
    <StageTable kicker="ALL CASES" title="Where every client stands" columns={{ who: "Client", when: "In stage", source: "Referred by" }} rows={rows}
      foot={<div className="pipeline-score-notice"><i>i</i><span><strong>What the loan officer receives</strong> · a stage and the blockers, after the client consents. Never the score, never the report, never income — the summary is derived on the rail, not typed here.</span></div>} />
  </div>;
}

/* ---------- One case ---------- */
type Event = [string, string, string, string];
function CaseView({ c, back, send }: { c: Case; back: () => void; send: () => void }) {
  const canSend = c.stage === "approaching" || c.stage === "ready_to_review";
  const history: Event[] = [
    c.lo ? ["↙", "purple", `Referred by ${c.lo}`, `${c.loCompany} · with consent`] : ["⌁", "blue", "Walked in", "No referring loan officer — you can still hand back"],
    ...(c.disputes.open ? [["✉", "violet", `${c.disputes.open} letters in flight`, "Bureaus have 30 days to answer"] as Event] : []),
    ...(c.disputes.resolved ? [["✓", "mint", `Round closed · ${c.disputes.resolved} resolved`, c.disputes.withdrawn ? `${c.disputes.withdrawn} withdrawn` : "Nothing withdrawn"] as Event] : []),
    ...(c.rentMonths ? [["⌂", "gold", `Rent reporting · ${c.rentMonths} months`, "Verified and reporting to all three bureaus"] as Event] : []),
    ["●", "lime", `Entered “${STAGE_LABEL[c.stage]}”`, `${c.days} days ago`],
  ];
  return <div className="lender-page borrower-detail-page">
    <button className="back-link lender-back" onClick={back}>← Back to cases</button>
    <div className="borrower-hero">
      <div className="borrower-identity"><span className={`person-avatar ${c.tone} xl`}>{c.initials}</span><div><div className="identity-title"><h1>{c.name}</h1><StagePill stage={c.stage} /></div><p>{c.lo ? `Referred by ${c.lo} · ${c.loCompany}` : "Walk-in client · no referring loan officer"} · {c.days} days in this stage</p></div></div>
      <div className="borrower-actions"><button className="outline-button" onClick={back}>All cases</button><button className="primary-lime dark-text" disabled={!canSend} onClick={send}>Send to mortgage partner</button></div>
    </div>
    {!canSend && <div className="protect-banner"><span>⌁</span><div><strong>Not ready to hand back yet.</strong><p>{first(c.name)} reaches “approaching ready” once the open work clears and the score is within the lender's buffer. Sending early is what makes a loan officer stop trusting the signal.</p></div></div>}
    <div className="partner-case-grid">
      <section className="pipeline-card">
        <div className="card-title-row"><div><span className="section-kicker">WHAT THE LOAN OFFICER WOULD SEE</span><h3>The readiness summary</h3></div></div>
        <Summary c={c} />
      </section>
      <section className="blockers-card">
        <div className="card-title-row"><div><span className="section-kicker">YOUR WORK</span><h3>What Brightpath is doing</h3></div></div>
        <div className="blocker-row"><span className="number purple">◇</span><div><strong>Dispute letters</strong><p>{c.disputes.resolved} resolved · {c.disputes.open} still open{c.disputes.withdrawn ? ` · ${c.disputes.withdrawn} withdrawn` : ""}</p></div><span className="factor-status">{c.disputes.open === 0 ? "Closed" : "In flight"}</span><b>{c.disputes.open === 0 ? "✓" : `${c.disputes.open} open`}</b></div>
        <div className="blocker-row"><span className="number mint">⌂</span><div><strong>Rent history</strong><p>{c.rentMonths ? `${c.rentMonths} months verified and reporting` : "Not started"}</p></div><span className="factor-status">{c.rentMonths ? "Reporting" : "—"}</span><b>{c.rentMonths ? `${c.rentMonths} mo` : "0 mo"}</b></div>
        <div className="blocker-row"><span className="number coral">↗</span><div><strong>Balances</strong><p>{c.blocker}</p></div><span className="factor-status">{c.stage === "working" ? "Working" : "Clear"}</span><b>{c.dtiInRange == null ? "—" : c.dtiInRange ? "DTI ok" : "DTI high"}</b></div>
        <div className="card-title-row" style={{ marginTop: 18 }}><div><span className="section-kicker">HISTORY</span></div></div>
        {history.map(([icon, tone, title, sub]) => <div key={title} className="blocker-row"><span className={`number ${tone}`}>{icon}</span><div><strong>{title}</strong><p>{sub}</p></div><span /><span /></div>)}
      </section>
    </div>
  </div>;
}

/** The readiness summary, rendered exactly as the loan officer receives it. */
function Summary({ c }: { c: Case }) {
  const rows: [string, string][] = [
    ["Stage", STAGE_LABEL[c.stage]],
    ["Lender floors met", c.floors.length ? c.floors.join(" · ") : "None yet"],
    ["Debt-to-income", c.dtiInRange == null ? "Unknown" : c.dtiInRange ? "In range" : "Above range"],
    ["Verified rent", c.rentMonths ? `${c.rentMonths} months` : "None"],
    ["Disputes", `${c.disputes.open} open · ${c.disputes.resolved} resolved${c.disputes.withdrawn ? ` · ${c.disputes.withdrawn} withdrawn` : ""}`],
    ["Loan officer of record", c.lo ?? "None"],
  ];
  return <div className="partner-summary">
    <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{k === "Stage" ? <StagePill stage={c.stage} /> : v}</dd></div>)}</dl>
    <div className="partner-never"><strong>Never included</strong><span>Credit score</span><span>The credit report</span><span>Account balances</span><span>Income</span><span>SSN or date of birth</span></div>
  </div>;
}

/* ---------- Loan officers: who sends to you, who you send back to ---------- */
function LoanOfficersPage({ go, send }: { go: (p: PartnerPage) => void; send: (id: string) => void }) {
  const [sel, setSel] = useState(0); const l = PARTNER_LOS[sel];
  const p = usePrecision();
  const clients = CASES.filter((x) => x.lo === l.name);
  const readyForThem = clients.find((x) => bucketOf(x.stage) === "ready") ?? CASES.find((x) => bucketOf(x.stage) === "ready")!;
  const rate = l.sentBack ? Math.round((l.qualified / l.sentBack) * 100) : null;
  return <div className="lender-page">
    <div className="lender-page-title"><div><span className="section-kicker">LOAN OFFICERS · {PARTNER_LOS.length} CONNECTED</span><h1>Who sends to you, and who you <em>send back to.</em></h1><p>Every loan officer who refers a client to Brightpath, and every one you can hand a client back to. A list, never a ranking — nothing of value moves in either direction.</p></div><button className="primary-lime dark-text" onClick={() => go("company")}>＋ Connect a loan officer</button></div>
    <div className="overview-grid">
      <section className="pipeline-card">
        <div className="card-title-row"><div><span className="section-kicker">CONNECTED</span><h3>{PARTNER_LOS.length} loan officers · 2 lenders</h3></div></div>
        <div className="attention-list">{PARTNER_LOS.map((x, i) => <button key={x.id} className={i === sel ? "active" : ""} onClick={() => setSel(i)}><span className={`person-avatar ${x.tone}`}>{x.initials}</span><div><strong>{x.name}</strong><small>{x.company} · {x.branch}</small></div><span className="attention-tag neutral">{x.referred ? `${x.referred} referred →` : x.sentBack ? `${x.sentBack} sent back →` : "New →"}</span></button>)}</div>
        <div className="conversion-note"><span>≠</span><p><strong>What a loan officer sees</strong><small>A stage and the blockers, after the client consents. Never the score, never the report, never your letters.</small></p></div>
        <div className="conversion-note" style={{ marginTop: 8 }}><span>⌁</span><p><strong>Why the list is not a ranking</strong><small>RESPA §8: no referral fees, no exclusivity, no steering. The client picks; you may send to more than one.</small></p></div>
      </section>
      <section className="attention-card">
        <div className="card-title-row"><div><span className="section-kicker">{l.name.toUpperCase()} · {l.company.toUpperCase()}</span><h3>{l.branch} · NMLS {l.nmls}</h3></div></div>
        <div className="kpi-grid partner-kpis" style={{ marginTop: 14 }}>
          <article><div><span>Referred to you</span></div><strong>{l.referred}</strong></article>
          <article><div><span>Sent back</span></div><strong>{l.sentBack}</strong></article>
          <article className="dark-kpi"><div><span>Qualified</span></div><strong>{l.qualified}</strong></article>
        </div>
        <div className="journey-health" style={{ marginTop: 14 }}><div><span>Precision with {first(l.name)}</span><strong>{rate == null ? "—" : `${rate}%`}</strong></div><div><i style={{ width: `${rate ?? 0}%` }} /></div><small>{l.sentBack ? `${l.qualified} of ${l.sentBack} clients you marked ready qualified on ${first(l.name)}'s formal pull.` : `Nothing sent back to ${first(l.name)} yet.`} Firm-wide: {p.text}.</small></div>
        <div className="journey-health" style={{ marginTop: 14 }}><div><span>{first(l.name)}'s clients with you now</span><strong>{clients.length}</strong></div><div><i style={{ width: `${(clients.length / CASES.length) * 100}%`, background: "#c8b8ff" }} /></div><small>{clients.length ? clients.map((x) => `${first(x.name)} · ${STAGE_LABEL[x.stage].toLowerCase()}`).join(" · ") : `${first(l.name)} has not referred anyone yet. ${l.note}.`}</small></div>
        <div className="detail-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap", gap: 10, marginTop: 16 }}><button className="outline-button" onClick={() => send(readyForThem.id)}>Send {first(readyForThem.name)} to {first(l.name)} →</button><button className="outline-button" onClick={() => go("cases")}>See all cases</button></div>
      </section>
    </div>
  </div>;
}

/* ---------- Referral log: both directions, consent on every row ---------- */
function ReferralLogPage() {
  const live = useReferrals();
  const rows: LogRow[] = live ? live.map(fromRail).sort((a, b) => (a.id < b.id ? 1 : -1)) : LOG_DEMO;
  const p = usePrecision();
  const outcomeCell = (o: string | null) => o === "qualified" ? <span className="status-cell lime">● Qualified on formal pull</span> : o === "short" ? <span className="status-cell gold">● Short on formal pull</span> : o === "declined_review" ? <span className="status-cell blue">● Declined review</span> : <span className="log-pending">Waiting on the loan officer</span>;
  return <div className="lender-page">
    <div className="lender-page-title"><div><span className="section-kicker">REFERRAL LOG · {live ? "LIVE FROM THE RAIL" : "ILLUSTRATIVE"}</span><h1>Every handoff, <em>both directions.</em></h1><p>Each send with its consent stamp, what the summary contained, and what the loan officer found on the formal pull. This is the record a regulator would ask to see.</p></div><span className="info-badge">Ready-to-review precision {p.text}</span></div>
    <section className="borrower-table-card pipeline-table stage-card">
      <div className="card-title-row"><div><span className="section-kicker">{rows.length} {rows.length === 1 ? "REFERRAL" : "REFERRALS"}</span><h3>Sent and received</h3></div></div>
      <div className="table-wrap"><table className="borrower-table stage-table log-table">
        <thead><tr><th>Client</th><th>Direction</th><th>Summary sent</th><th>Consent</th><th>Outcome</th><th>Reference</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} style={{ cursor: "default" }}>
          <td data-label="Client"><span className={`person-avatar ${r.direction === "cr_to_lo" ? "lime" : "purple"}`}>{r.client.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span><div><strong>{r.client}</strong><small>{r.when}</small></div></td>
          <td data-label="Direction">{r.direction === "cr_to_lo" ? <span className="status-cell lime">↗ To {r.who}</span> : <span className="status-cell purple">↙ From {r.who}</span>}</td>
          <td data-label="Summary sent"><div className="log-summary"><StagePill stage={r.stage} /><small>{r.disputes}</small></div></td>
          <td data-label="Consent">{r.consent}</td>
          <td data-label="Outcome">{r.direction === "cr_to_lo" ? outcomeCell(r.outcome) : <span className="log-pending">Now with Brightpath</span>}</td>
          <td data-label="Reference"><code className="log-ref">{r.id.length > 16 ? `${r.id.slice(0, 12)}…` : r.id}</code></td>
        </tr>)}</tbody>
      </table></div>
      {rows.length === 0 && <p className="stage-empty">No referrals on the rail yet.</p>}
      <div className="pipeline-score-notice"><i>i</i><span><strong>Nothing of value changes hands.</strong> Brightpath is billed per seat, never per referral or closed loan. The consent text version travels with each row; the report never does.</span></div>
    </section>
  </div>;
}

/* ---------- Your firm ---------- */
function CompanyPage() {
  const team = [["DW", "Dana Whitfield", "Owner · sends referrals", "mint"], ["RM", "Rosa Martínez", "Case manager · disputes", "purple"], ["TB", "Theo Banks", "Case manager · rent reporting", "gold"], ["KO", "Kemi Okafor", "Intake · consent", "blue"]];
  const posture: [string, string, string, string][] = [["CROA", "The consumer is never billed by ReadyIQ", "Brightpath's own agreement with the client is the only one that charges them.", "mint"], ["RESPA §8", "Nothing of value per referral", "Flat per-seat pricing. No exclusivity, no steering, more than one loan officer allowed.", "lime"], ["FCRA", "No report data crosses the seam", "The rail rejects a referral that carries a score, a tradeline, or income.", "purple"], ["Consent", "Stamped, versioned, kept", "Every send records when the client agreed and to which text.", "gold"]];
  return <div className="lender-page org-page">
    <div className="lender-page-title"><div><span className="section-kicker">YOUR FIRM · {FIRM.city.toUpperCase()}</span><h1>Brightpath <em>Credit.</em></h1><p>How Brightpath appears to loan officers, who holds a seat, and how ReadyIQ bills — flat, per seat, never per referral.</p></div><button className="primary-lime dark-text" onClick={() => alert("Seat invitation would open here: name, email, role → a seat in seconds.")}>＋ Add a seat</button></div>
    <section className="org-stats"><article><span>SEATS</span><strong>{FIRM.seats}</strong><small>{team.length} in use · {FIRM.seats - team.length} open</small></article><article><span>LOAN OFFICERS</span><strong>{PARTNER_LOS.length}</strong><small>2 lenders</small></article><article><span>ACTIVE CLIENTS</span><strong>{CASES.length}</strong><small>2 ready to hand back</small></article><article><span>BILLING</span><strong>Flat</strong><small>per seat · never per referral</small></article></section>
    <div className="overview-grid">
      <section className="pipeline-card">
        <div className="card-title-row"><div><span className="section-kicker">TEAM</span><h3>{team.length} people on {FIRM.seats} seats</h3></div></div>
        <div className="attention-list">{team.map(([ini, name, role, tone]) => <button key={name}><span className={`person-avatar ${tone}`}>{ini}</span><div><strong>{name}</strong><small>{role}</small></div><span className="attention-tag neutral">Active</span></button>)}</div>
      </section>
      <section className="attention-card">
        <div className="card-title-row"><div><span className="section-kicker">COMPLIANCE POSTURE</span><h3>Built into the rail, not a policy</h3></div></div>
        {posture.map(([law, title, body, tone]) => <div key={law} className="blocker-row"><span className={`number ${tone}`}>✓</span><div><strong>{title}</strong><p>{body}</p></div><span className="factor-status">{law}</span><span /></div>)}
      </section>
    </div>
  </div>;
}

/* ---------- The send: what they'll see → consent → who receives it ---------- */
function SendModal({ c, close }: { c: Case; close: () => void }) {
  const [consent, setConsent] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [sent, setSent] = useState<null | { live: false } | { live: true; id: string; stage: string; at: string } | { live: true; error: string }>(null);
  const [busy, setBusy] = useState(false);
  const toggle = (id: string) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const ready = consent && picked.length > 0 && !busy;
  const names = PARTNER_LOS.filter((l) => picked.includes(l.id)).map((l) => l.name);
  // The rail derives the summary from the client's record and stamps the consent; the
  // browser only says who, to whom, and that consent was given just now.
  const send = async () => {
    if (!railLive()) { setSent({ live: false }); return; }
    setBusy(true);
    const r = await sendReferral({ direction: "cr_to_lo", from: { kind: "credit_repair", id: "brightpath" }, to: picked.map((id) => ({ kind: "lo", id })), consumerId: c.railId, consent: consentNow() });
    setBusy(false);
    setSent(r.ok ? { live: true, id: r.data.id, stage: r.data.summary.stage, at: r.data.created_at } : { live: true, error: r.error });
  };
  return <div className="invite-modal-overlay" onMouseDown={(e) => e.currentTarget === e.target && close()}>
    <section className="invite-modal partner-modal">
      {!sent ? <>
        <header><div><span className="section-kicker">SEND TO MORTGAGE PARTNER</span><h2>{c.name}</h2><p>Three things happen here, in this order: you see what the loan officer will see, {first(c.name)} approves it, and you choose who receives it.</p></div><button onClick={close}>×</button></header>
        <div className="invite-form partner-form">
          <div className="partner-step"><span className="partner-step-n">1</span><div><strong>What they'll see</strong><p>A stage and the blockers. Nothing from the report itself.</p></div></div>
          <Summary c={c} />

          <div className="partner-step"><span className="partner-step-n">2</span><div><strong>{first(c.name)}'s permission</strong><p>Required before anything is sent, and kept with the referral.</p></div></div>
          <label className="consent-check partner-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span><strong>{c.name} agrees to share this summary with the loan officers selected below.</strong> They can see exactly what is above, and nothing else. {first(c.name)} can withdraw this at any time, and may still apply anywhere they choose.</span></label>

          <div className="partner-step"><span className="partner-step-n">3</span><div><strong>Who receives it</strong><p>Choose one or more. Never just one by default.</p></div></div>
          <div className="partner-lo-list">{PARTNER_LOS.map((l) => <label key={l.id} className={`partner-lo-pick ${picked.includes(l.id) ? "on" : ""}`}>
            <input type="checkbox" checked={picked.includes(l.id)} onChange={() => toggle(l.id)} />
            <span className={`person-avatar ${l.tone}`}>{l.initials}</span>
            <div><strong>{l.name}</strong><small>{l.company} · {l.branch} · {l.note}</small></div>
          </label>)}</div>

          <div className="partner-fine"><span>⌁</span><p><strong>Nothing of value changes hands for this referral.</strong> Brightpath is not paid to send it and the loan officer is not paid to receive it. ReadyIQ is billed per seat — never per referral, never per closed loan.</p></div>
        </div>
        <footer><button className="outline-button" onClick={close}>Cancel</button><button className="primary-lime dark-text" disabled={!ready} onClick={send}>{busy ? "Sending…" : picked.length > 1 ? `Send to ${picked.length} loan officers` : "Send with consent"} <span>→</span></button></footer>
      </> : "error" in sent ? <div className="invite-success">
        <span>!</span><small>THE RAIL REFUSED IT</small>
        <h2>Nothing was sent.</h2>
        <p>{sent.error === "unknown_consumer" ? `${first(c.name)} isn't on the connected rail yet.` : sent.error.replace(/_/g, " ")}</p>
        <button className="primary-lime dark-text" onClick={close}>Back to {first(c.name)}'s case</button>
      </div> : <div className="invite-success">
        <span>✓</span><small>{sent.live ? `SENT · LIVE · ${sent.id}` : `SENT ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase()} · DEMO`}</small>
        <h2>{names.join(" and ")} {names.length > 1 ? "have" : "has"} {first(c.name)}'s summary.</h2>
        <p>{sent.live ? `The rail derived the summary from ${first(c.name)}'s record (stage: ${sent.stage.replace(/_/g, " ")}), stamped the consent at ${fmtStamp(sent.at)}, and logged the referral.` : `It arrived in their Ready-to-review list. ${first(c.name)}'s consent is stamped and stored with the referral, and this send is in your referral log.`}</p>
        <p className="partner-next">The next move is theirs: a soft credit pull to confirm the real mortgage scores before anyone's credit is touched.</p>
        <button className="primary-lime dark-text" onClick={close}>Back to {first(c.name)}'s case</button>
      </div>}
    </section>
  </div>;
}
