// src/screens/lo.tsx — loan-officer surfaces in the v11 look: 60-second sign-up, Your link (link · QR · text · invite),
// and the read-only status feed. Uses v11's own classes (lender-page, kpi-grid, org-card, borrower-table-card…) so it looks native.
import { useEffect, useState } from "react";
import { BureauScores, type BureauScoreSet } from "./bureaus";

const LO = { first: "Jordan", last: "Lee", nmls: "1849201", company: "Summit Home Loans", branch: "Scottsdale North", states: ["AZ", "CA", "NV"], mobile: "(480) 555-0190", email: "jordan@summithomeloans.com", code: "summit-jlee" };
const LINK = `ready.summithomeloans.com/${LO.code.split("-")[1]}`;
const SMS = `Hi — it's ${LO.first} at ${LO.company}. Here's a 3-minute credit readiness check (no application, soft pull) with a plan built for you: https://${LINK}`;

function copy(text: string, done: (v: boolean) => void) { try { navigator.clipboard?.writeText(text); } catch {} done(true); setTimeout(() => done(false), 1600); }

/* ---------- Your link ---------- */
export function YourLinkPage({ openInvite, openFeed, previewConsumer }: { openInvite: () => void; openFeed: () => void; previewConsumer: () => void }) {
  const [copied, setCopied] = useState(false);
  return <div className="lender-page lx-page">
    <section className="cx-hero lx-hero">
      <div className="cx-hero-copy">
        <span className="cx-pill"><i />YOUR LINK · NMLS {LO.nmls}</span>
        <h1>Text it, print it, <em>send it.</em></h1>
        <p>One link per human. Everyone who uses it stays attributed to you — branch, source and all. With permission, you see all three bureau scores and readiness status—never the full report.</p>
        <div className="cx-actions"><a className="lime" href={`sms:?&body=${encodeURIComponent(SMS)}`}>💬 Text this to a client <span>→</span></a><button className="ghost" onClick={openInvite}>✉ Send an invitation</button></div>
        <div className="cx-trust"><span>✓ Attribution baked in</span><span>✓ 3 scores, never the full report</span><span>✓ Not a CRM — it feeds yours</span></div>
      </div>
      <div className="cx-window">
        <div className="cx-chrome"><span><i />ready.summithomeloans.com/{LO.code.split("-")[1]}</span><span>Live</span></div>
        <div className="cx-window-body lx-body">
          <img src={`qr/${LO.code}.svg`} alt={`QR code for ${LINK}`} width={148} height={148} className="lx-qr" />
          <div>
            <div className="invite-link-row lx-link"><span>YOUR LINK</span><div><code>https://{LINK}</code><button onClick={() => copy(`https://${LINK}`, setCopied)}>{copied ? "✓ Copied" : "Copy"}</button></div></div>
            <div className="lx-share"><a href={`sms:?&body=${encodeURIComponent(SMS)}`}>💬 Text</a><a href={`mailto:?subject=${encodeURIComponent("Your readiness check from " + LO.first)}&body=${encodeURIComponent(SMS)}`}>✉ Email</a><button onClick={() => window.print()}>⎙ Print QR</button></div>
            <p className="lx-note">One tap on their phone. Attributed to you, branch and source included.</p>
          </div>
        </div>
        <div className="cx-window-foot"><span>Every scan and tap lands on your branded front door.</span><button className="cx-inline" onClick={previewConsumer}>Preview my front door →</button></div>
        <div className="cx-float br lime"><i>◈</i><div><small>THIS MONTH</small><strong>14 invited · 9 enrolled</strong></div></div>
      </div>
    </section>
    <section className="kpi-grid lx-kpis">
      <article><div><span>Invited this month</span><i className="kpi-icon mint">✉</i></div><strong>14</strong><p>by text and email</p></article>
      <article><div><span>Enrolled</span><i className="kpi-icon lime">✓</i></div><strong>9</strong><p>completed a check</p></article>
      <article><div><span>Working</span><i className="kpi-icon purple">↗</i></div><strong>7</strong><p>active in the last 30 days</p></article>
      <article className="dark-kpi" onClick={openFeed} style={{ cursor: "pointer" }}><div><span>Review requested</span><i className="kpi-icon dark">◈</i></div><strong>2</strong><p>waiting on you → open the feed</p></article>
    </section>
    <div className="overview-grid lx-grid">
      <section className="pipeline-card">
        <div className="card-title-row"><div><span className="section-kicker">WHERE IT LIVES</span><h3>Put the link everywhere you already are.</h3></div></div>
        <div className="lx-places">{[["✉", "Email signature", "One line under your name — every reply carries it."], ["⌂", "Open-house flyer", "Print the QR. Every scan is attributed to you."], ["◎", "Your website", "A button on your bio page. No install."], ["⇄", "Your CRM", "Zapier / connector drops the link into your sequences."]].map(([i, t, d]) => <div key={t}><i>{i}</i><div><strong>{t}</strong><small>{d}</small></div></div>)}</div>
      </section>
      <section className="attention-card">
        <div className="card-title-row"><div><span className="section-kicker">HOW IT WORKS</span><h3>Not a CRM, on purpose.</h3></div></div>
        <div className="journey-health"><div><span>What you see</span><strong>3 scores + status</strong></div><div><i style={{ width: "100%" }} /></div><small>Equifax · Experian · TransUnion · pathway · next milestone. Never account-level report details.</small></div>
        <div className="journey-health" style={{ marginTop: 14 }}><div><span>Where notes and tasks live</span><strong>your CRM</strong></div><div><i style={{ width: "100%", background: "#dfe6e2" }} /></div><small>ReadyIQ sends status through Zapier or a connector — Total Expert, Shape, Salesforce.</small></div>
        <button className="outline-button" style={{ marginTop: 16 }} onClick={openFeed}>Open the status feed →</button>
      </section>
    </div>
  </div>;
}

/* ---------- 60-second sign-up ---------- */
export function LoStartPage({ done }: { done: () => void }) {
  const [step, setStep] = useState(1); const [email, setEmail] = useState(""); const [nmls, setNmls] = useState(""); const [t0] = useState(() => Date.now()); const [secs, setSecs] = useState(0);
  useEffect(() => { if (step === 3) return; const id = setInterval(() => setSecs(Math.round((Date.now() - t0) / 1000)), 500); return () => clearInterval(id); }, [step, t0]);
  const ok = email.includes("@") && nmls.trim().length >= 5;
  return <div className="consent-page"><div className="consent-shell">
    <div className="step-row">{[1, 2, 3].map((n) => <div key={n} className={step >= n ? "active" : ""}><span>{step > n ? "✓" : n}</span><small>{n === 1 ? "Email + NMLS" : n === 2 ? "We fill the rest" : "Your link"}</small></div>)}</div>
    {step === 1 && <div className="form-panel"><span className="section-kicker">60 SECONDS TO A LINK</span><h2>Get your ReadyIQ <em>link.</em></h2><p>Two fields. We fill in the rest from your NMLS ID and pull your company’s brand from its website.</p>
      <div className="form-grid"><label>Work email<input value={email} placeholder="jordan@summithomeloans.com" onChange={(e) => setEmail(e.target.value)} /></label><label>NMLS ID<input value={nmls} placeholder="1849201" onChange={(e) => setNmls(e.target.value)} /></label></div>
      <button className="link-button" onClick={() => { setEmail("jordan@summithomeloans.com"); setNmls("1849201"); }}>Demo: fill for me →</button>
      <button disabled={!ok} className="primary-dark wide" onClick={() => setStep(2)}>Continue <span>→</span></button></div>}
    {step === 2 && <div className="form-panel permission-panel"><span className="section-kicker">FOUND YOU</span><h2>Hi {LO.first}. We matched your NMLS ID.</h2><p>Confirm and we’ll pull your brand.</p>
      <div className="permission-list"><div><i>✓</i><p><strong>{LO.first} {LO.last} · NMLS {LO.nmls}</strong><span>{LO.company} · {LO.branch} · licensed in {LO.states.join(", ")}</span></p></div><div><i>⌁</i><p><strong>Brand pulled from summithomeloans.com</strong><span>Logo, colors and support contact — consumers see your company, not ours.</span></p></div><div><i>≠</i><p><strong>Three scores, never the full report</strong><span>You’ll see consumer-authorized Equifax, Experian and TransUnion scores, plus pathway, milestones and review requests.</span></p></div></div>
      <button className="primary-dark wide" onClick={() => setStep(3)}>That’s me — make my link <span>→</span></button></div>}
    {step === 3 && <div className="form-panel identity-panel"><span className="section-kicker">DONE IN {Math.max(secs, 1)} SECONDS</span><h2>Your link is <em>ready.</em></h2><p>One link per human. Every consumer who uses it stays attributed to you.</p>
      <div className="invite-link-row" style={{ marginTop: 6 }}><span>YOUR LINK</span><div><code>https://{LINK}</code><button onClick={done}>Open</button></div><p>Next: text it to a client, print the QR, or send an invitation.</p></div>
      <button className="primary-lime wide dark-text" onClick={done}>Open your link page <span>→</span></button></div>}
  </div></div>;
}

/* ---------- read-only status feed ---------- */
const FEED = [
  { name: "Aaron Patel", initials: "AP", tone: "gold", pathway: "Ready Now", status: "Review requested", round: "2 of ~2", next: "Lender review", last: "2 days ago", review: true, scores: { equifax: 688, experian: 696, transunion: 691, deltas: { equifax: "+8", experian: "+11", transunion: "+9" } } as BureauScoreSet },
  { name: "Derek Young", initials: "DY", tone: "lime", pathway: "Near Ready", status: "Threshold reached", round: "3 of ~3", next: "Cross 640", last: "1 hr ago", review: false, scores: { equifax: 654, experian: 662, transunion: 658, deltas: { equifax: "+7", experian: "+12", transunion: "+9" } } as BureauScoreSet },
  { name: "Maya Collins", initials: "MC", tone: "mint", pathway: "Build Mode", status: "Active", round: "2 of ~5", next: "Utilization under 30%", last: "12 min ago", review: false, scores: { equifax: 608, experian: 615, transunion: 612, deltas: { equifax: "+9", experian: "+14", transunion: "+12" } } as BureauScoreSet },
  { name: "Sofia Ramirez", initials: "SR", tone: "violet", pathway: "Dispute Mode", status: "Disputes sent", round: "1 of ~4", next: "Bureau responses · due Sep 8", last: "Yesterday", review: false, scores: { equifax: 579, experian: 587, transunion: 584, deltas: { equifax: "+3", experian: "+6", transunion: "+5" } } as BureauScoreSet },
  { name: "Nina Brooks", initials: "NB", tone: "blue", pathway: "Thin Credit", status: "Active", round: "1 of ~4", next: "Report 19 months of rent", last: "3 days ago", review: false, scores: { equifax: 599, experian: 606, transunion: 603, deltas: { equifax: "+4", experian: "+6", transunion: "+5" } } as BureauScoreSet },
];
export function StatusFeedPage({ openInvite, onSelect }: { openInvite: () => void; onSelect: () => void }) {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Ready Now", "Near Ready", "Build Mode", "Thin Credit", "Dispute Mode"];
  const rows = FEED.filter((r) => filter === "All" || r.pathway === filter);
  const pinned = rows.filter((r) => r.review), rest = rows.filter((r) => !r.review);
  const Row = ({ r }: { r: typeof FEED[number] }) => <tr onClick={onSelect}><td data-label="Consumer"><span className={`person-avatar ${r.tone}`}>{r.initials}</span><div><strong>{r.name}</strong><small>Assigned to Jordan Lee · {r.status}</small></div></td><td data-label="Pathway"><span className={`status-cell ${r.tone}`}>● {r.pathway}</span></td><td data-label="All 3 bureau scores"><BureauScores scores={r.scores} compact showNotice={false} /></td><td data-label="Round"><strong>{r.round}</strong><small>round</small></td><td data-label="Next milestone">{r.next}</td><td data-label="Last activity">{r.last}</td><td className="pipeline-row-action"><button onClick={(e) => { e.stopPropagation(); alert(`Calling ${r.name.split(" ")[0]}…`); }}>Call</button></td></tr>;
  return <div className="lender-page">
    <div className="lender-page-title"><div><span className="section-kicker">READINESS PIPELINE · READ-ONLY</span><h1>Where your people <em>are.</em></h1><p>All three bureau scores, pathway, milestones and review requests in one scan. Account details and the full credit report stay private.</p></div><button className="primary-lime dark-text" onClick={openInvite}>＋ Invite consumer</button></div>
    <div className="filter-bar"><div className="filter-tabs">{filters.map((x) => <button key={x} className={filter === x ? "active" : ""} onClick={() => setFilter(x)}>{x}{x === "All" && <b>{FEED.length}</b>}</button>)}</div><span className="info-badge">{pinned.length} review requested</span></div>
    {pinned.length > 0 && <section className="borrower-table-card pipeline-table"><div className="card-title-row"><div><span className="section-kicker">REVIEW REQUESTED</span><h3>Waiting on you</h3></div></div><div className="table-wrap"><table className="borrower-table bureau-pipeline-table"><thead><tr><th>Consumer</th><th>Pathway</th><th>All 3 bureau scores</th><th>Round</th><th>Next milestone</th><th>Last activity</th><th /></tr></thead><tbody>{pinned.map((r) => <Row key={r.name} r={r} />)}</tbody></table></div><ScoreNotice /></section>}
    <section className="borrower-table-card pipeline-table"><div className="card-title-row"><div><span className="section-kicker">WORKING</span><h3>{rest.length} consumers</h3></div></div><div className="table-wrap"><table className="borrower-table bureau-pipeline-table"><thead><tr><th>Consumer</th><th>Pathway</th><th>All 3 bureau scores</th><th>Round</th><th>Next milestone</th><th>Last activity</th><th /></tr></thead><tbody>{rest.map((r) => <Row key={r.name} r={r} />)}</tbody></table></div><ScoreNotice /></section>
    <div className="sharing-card" style={{ marginTop: 16 }}><span>⌁</span><div><strong>Consumers control what you see.</strong><p>The pipeline shows the consumer-authorized three-bureau score summary and readiness status—not account details or the full report.</p></div></div>
  </div>;
}

function ScoreNotice() {
  return <div className="pipeline-score-notice"><i>i</i><span><strong>MyScoreIQ FICO® scores</strong> · Equifax, Experian and TransUnion are always shown together. These consumer scores may differ from mortgage scores and are not a preapproval.</span></div>;
}

/* ---------- link resolver: one link per human, attribution baked in ---------- */
export type Door = { kind: "invite" | "lo" | "partner" | "pm" | "public"; code: string; navPill: string; navCta: string; initials: string; fromLabel: string; from: string; sub: string; eyebrow: string; lede: string; cta: string; trust: string; ticketKicker: string; greeting: string; loInitials: string; lo: string; loMeta: string; footer: string };
const LO_JORDAN = { initials: "JL", name: "Jordan Lee", meta: "NMLS #1849201 · Scottsdale North" };
const HUMANS: Record<string, { kind: "lo" | "partner" | "pm"; initials: string; name: string; company: string; meta: string; lo: typeof LO_JORDAN }> = {
  "summit-jlee": { kind: "lo", initials: "JL", name: "Jordan Lee", company: "Summit Home Loans", meta: "NMLS #1849201", lo: LO_JORDAN },
  "summit-amorgan": { kind: "lo", initials: "AM", name: "Alex Morgan", company: "Summit Home Loans", meta: "NMLS #2033117", lo: { initials: "AM", name: "Alex Morgan", meta: "NMLS #2033117 · Phoenix Central" } },
  "summit-dkim": { kind: "partner", initials: "DK", name: "Dana Kim", company: "Desert Realty", meta: "Real-estate partner", lo: LO_JORDAN },
  "summit-palms": { kind: "pm", initials: "SP", name: "Scottsdale Palms", company: "Property manager · 312 units", meta: "Rent reporting partner", lo: LO_JORDAN },
};
export function resolveLink(code: string, lang: "en" | "es" = "en"): Door {
  const d = resolveLinkEn(code); return lang === "es" ? { ...d, ...DOOR_ES[d.kind] } : d;
}
const DOOR_ES: Record<Door["kind"], Partial<Door>> = {
  invite: { navPill: "Invitación segura", navCta: "Aceptar invitación", fromLabel: "INVITACIÓN PERSONAL DE", eyebrow: "Tu invitación de Summit", lede: "Jordan te invitó a ReadyIQ para que veas dónde está tu crédito, recibas un plan hecho para ti y sigas conectada con Summit — sin solicitar una hipoteca hoy.", cta: "Aceptar y revisar mi crédito", trust: "Jordan sigue contigo", ticketKicker: "TU INVITACIÓN READYIQ", greeting: "Hola Maya, construyamos tu siguiente paso.", footer: "Enviado por tu compañía hipotecaria." },
  lo: { navPill: "El enlace de Jordan", sub: "NMLS #1849201 · sigues asignado a Jordan", trust: "Jordan sigue contigo", navCta: "Empezar mi revisión", fromLabel: "TU OFICIAL DE PRÉSTAMOS", eyebrow: "Una revisión, no una solicitud", lede: "Este enlace te da una revisión privada de tu crédito y un plan hecho para ti. Sin solicitud de hipoteca hoy — puedes solicitar cuando quieras; no es obligatorio.", cta: "Revisar mi crédito", ticketKicker: "TU REVISIÓN", greeting: "Hola — construyamos tu siguiente paso.", footer: "Compartido por tu oficial de préstamos." },
  partner: { navCta: "Empezar mi revisión", fromLabel: "REFERIDO POR", sub: "Tu oficial de préstamos será Jordan Lee, Summit Home Loans", lede: "Dana trabaja con Summit Home Loans. Este enlace te da una revisión privada y un plan — Dana solo ve que estás trabajando, nunca tu crédito.", trust: "Dana solo ve tu estatus", eyebrow: "Una revisión, no una solicitud", cta: "Revisar mi crédito", ticketKicker: "TU REVISIÓN", greeting: "Hola — construyamos tu siguiente paso.", footer: "Referido por tu agente de bienes raíces." },
  pm: { from: "Scottsdale Palms · Administración · 312 unidades", sub: "Reporte de renta vía CreditBuilderIQ · un oficial de Summit cuando estés listo", navPill: "El enlace de tu edificio", navCta: "Reportar mi renta", fromLabel: "TU EDIFICIO", eyebrow: "Empieza con tu renta, no con una solicitud", lede: "Scottsdale Palms reporta tu renta puntual a los tres burós a través de ReadyIQ. Empieza a construir 12–24 meses de historial hoy; cuando quieras comprar, un oficial de Summit Home Loans ya estará conectado — solo con tu estatus, nunca tu reporte.", cta: "Empezar a reportar mi renta", trust: "Tu edificio solo ve “inscrito”", ticketKicker: "TU RENTA CUENTA", greeting: "Hola vecino — hagamos que tu renta cuente.", footer: "Ofrecido por tu edificio con Summit Home Loans." },
  public: { navPill: "Revisión gratuita", navCta: "Empezar mi revisión", fromLabel: "SUMMIT HOME LOANS", from: "Preparación hipotecaria, con ReadyIQ", sub: "Te conectaremos con un oficial de Summit", eyebrow: "Una revisión, no una solicitud", lede: "Mira dónde está tu crédito y recibe un plan hecho para ti — revisar, construir, disputar — mucho antes de solicitar. Puedes solicitar una hipoteca cuando quieras; no es obligatorio.", cta: "Revisar mi crédito", trust: "Un oficial de Summit sigue contigo", ticketKicker: "TU REVISIÓN", greeting: "Hola — construyamos tu siguiente paso.", footer: "Ofrecido por tu compañía hipotecaria." },
};
function resolveLinkEn(code: string): Door {
  const base = { loInitials: LO_JORDAN.initials, lo: LO_JORDAN.name, loMeta: LO_JORDAN.meta };
  if (code === "invite") return { ...base, kind: "invite", code, navPill: "Secure invitation", navCta: "Accept invitation", initials: "JL", fromLabel: "PERSONAL INVITATION FROM", from: "Jordan Lee · Summit Home Loans", sub: "Sent to maya.collins@example.com", eyebrow: "Your Summit readiness invitation", lede: "Jordan invited you to ReadyIQ so you can understand where your consumer credit stands, get a personalized plan and stay connected to Summit—without applying for a mortgage today.", cta: "Accept invitation & check readiness", trust: "Jordan stays connected", ticketKicker: "YOUR READYIQ INVITATION", greeting: "Hi Maya, let’s build your next step together.", footer: "Sent by your mortgage company." };
  const h = HUMANS[code];
  if (h && h.kind === "lo") return { ...base, kind: "lo", code, loInitials: h.lo.initials, lo: h.lo.name, loMeta: h.lo.meta, navPill: `${h.name.split(" ")[0]}’s link`, navCta: "Start my check", initials: h.initials, fromLabel: "YOUR LOAN OFFICER", from: `${h.name} · ${h.company}`, sub: `${h.meta} · you stay attributed to ${h.name.split(" ")[0]}`, eyebrow: "A readiness check, not an application", lede: `${h.name.split(" ")[0]} shared this link so you can see where your consumer credit stands and get a plan built for you. No mortgage application today — you can apply at any time; this is not required.`, cta: "Check my readiness", trust: `${h.name.split(" ")[0]} stays connected`, ticketKicker: "YOUR READINESS CHECK", greeting: "Hi there — let’s build your next step together.", footer: "Shared by your loan officer." };
  if (h && h.kind === "pm") return { ...base, kind: "pm", code, navPill: "Your building’s link", navCta: "Start reporting my rent", initials: h.initials, fromLabel: "YOUR BUILDING", from: `${h.name} · ${h.company}`, sub: "Rent reporting via CreditBuilderIQ · a Summit loan officer when you’re ready", eyebrow: "Start with your rent, not an application", lede: `${h.name} reports on-time rent to all three bureaus through ReadyIQ. Start building 12–24 months of history now; when you’re ready to buy, a Summit Home Loans loan officer is already connected — status only, never your report.`, cta: "Start reporting my rent", trust: "Your building sees nothing but “enrolled”", ticketKicker: "YOUR RENT COUNTS", greeting: "Hi neighbor — let’s make your rent count.", footer: "Offered by your building with Summit Home Loans." };
  if (h && h.kind === "partner") return { ...base, kind: "partner", code, navPill: `Referred by ${h.name.split(" ")[0]}`, navCta: "Start my check", initials: h.initials, fromLabel: "REFERRED BY", from: `${h.name} · ${h.company}`, sub: `Your loan officer will be ${h.lo.name}, Summit Home Loans`, eyebrow: "A readiness check, not an application", lede: `${h.name.split(" ")[0]} works with Summit Home Loans. This link gets you a private readiness check and a plan — ${h.name.split(" ")[0]} only ever sees that you’re working, never your credit.`, cta: "Check my readiness", trust: `${h.name.split(" ")[0]} sees status only`, ticketKicker: "YOUR READINESS CHECK", greeting: "Hi there — let’s build your next step together.", footer: "Referred by your real-estate partner." };
  return { ...base, loInitials: "S", lo: "A Summit loan officer", loMeta: "matched after your check", kind: "public", code: "public", navPill: "Free readiness check", navCta: "Start my check", initials: "S", fromLabel: "SUMMIT HOME LOANS", from: "Mortgage readiness, powered by ReadyIQ", sub: "You’ll be matched with a Summit loan officer", eyebrow: "A readiness check, not an application", lede: "See where your consumer credit stands and get a plan built for you — check, build, dispute — long before you apply. You can apply for a mortgage at any time; this is not required.", cta: "Check my readiness", trust: "A Summit loan officer stays connected", ticketKicker: "YOUR READINESS CHECK", greeting: "Hi there — let’s build your next step together.", footer: "Offered by your mortgage company." };
}

/* ---------- partners: agents get a link too; they see coarse status only ---------- */
const PARTNERS = [
  { code: "summit-palms", initials: "SP", name: "Scottsdale Palms", company: "312 units · Old Town", kind: "Property manager", lo: "Jordan Lee", link: "ready.summithomeloans.com/palms", sent: 86, working: 31, review: 0, tone: "gold" },
  { code: "summit-dkim", initials: "DK", name: "Dana Kim", company: "Desert Realty", kind: "Real-estate agent", lo: "Jordan Lee", link: "ready.summithomeloans.com/dkim", sent: 11, working: 6, review: 1, tone: "purple" },
  { code: "summit-amorgan", initials: "AM", name: "Alex Morgan", company: "Summit Home Loans", kind: "Loan officer · Phoenix Central", lo: "Alex Morgan", link: "ready.summithomeloans.com/amorgan", sent: 23, working: 12, review: 3, tone: "mint" },
];
export function PartnersPage({ previewDoor }: { previewDoor: (code: string) => void }) {
  const [sel, setSel] = useState(0); const [copied, setCopied] = useState(false); const p = PARTNERS[sel];
  return <div className="lender-page">
    <div className="lender-page-title"><div><span className="section-kicker">PARTNERS · ONE LINK PER HUMAN</span><h1>Agents and buildings send people <em>too.</em></h1><p>Every partner gets their own link and QR — realtors, and now property managers, whose renters start reporting rent 12–24 months before they ever call a lender. Everyone they send stays attributed to them and to you. Partners see coarse status — working, review requested — never a score or a report.</p></div><button className="primary-lime dark-text" onClick={() => alert("Add-partner would open here: name, company, kind, assigned loan officer → link + QR in seconds.")}>＋ Add partner</button></div>
    <div className="overview-grid">
      <section className="pipeline-card">
        <div className="card-title-row"><div><span className="section-kicker">YOUR PARTNERS</span><h3>{PARTNERS.length} links</h3></div></div>
        <div className="attention-list">{PARTNERS.map((x, i) => <button key={x.code} className={i === sel ? "active" : ""} onClick={() => setSel(i)}><span className={`person-avatar ${x.tone}`}>{x.initials}</span><div><strong>{x.name}</strong><small>{x.kind} · {x.company}</small></div><span className="attention-tag neutral">{x.working} working →</span></button>)}</div>
        <div className="conversion-note"><span>≠</span><p><strong>What a partner sees</strong><small>Sent · working · review requested. Never the score, never the report, never the plan.</small></p></div><div className="conversion-note" style={{ marginTop: 8 }}><span>⌂</span><p><strong>Why buildings matter</strong><small>IDIQ already runs rent reporting for property managers. A building’s link starts renters on 12–24 months of history — Fannie Mae’s DU counts it — before there is a loan officer in the picture.</small></p></div>
      </section>
      <section className="attention-card">
        <div className="card-title-row"><div><span className="section-kicker">{p.name.toUpperCase()} · {p.kind.toUpperCase()}</span><h3>{p.link}</h3></div></div>
        <div className="partner-detail-grid">
          <img src={`qr/${p.code}.svg`} alt={`QR code for ${p.link}`} width={148} height={148} style={{ borderRadius: 14, border: "1px solid var(--line)", background: "#fff", padding: 6 }} />
          <div className="kpi-grid partner-kpis">
            <article><div><span>Sent</span></div><strong>{p.sent}</strong></article>
            <article><div><span>Working</span></div><strong>{p.working}</strong></article>
            <article className="dark-kpi"><div><span>Review</span></div><strong>{p.review}</strong></article>
          </div>
        </div>
        <div className="invite-link-row" style={{ marginTop: 12 }}><span>PARTNER LINK</span><div><code>https://{p.link}</code><button onClick={() => copy(`https://${p.link}`, setCopied)}>{copied ? "✓ Copied" : "Copy"}</button></div><p>Consumers land on Summit’s front door with “Referred by {p.name}” and are routed to {p.lo}.</p></div>
        <div className="detail-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap", gap: 10, marginTop: 12 }}><button className="outline-button" onClick={() => previewDoor(p.code)}>Preview {p.name.split(" ")[0]}’s front door →</button><a className="outline-button" href={`sms:?&body=${encodeURIComponent(`Hi ${p.name.split(" ")[0]} — here’s your ReadyIQ link to share with clients: https://${p.link}`)}`}>💬 Text the link to {p.name.split(" ")[0]}</a></div>
      </section>
    </div>
  </div>;
}
