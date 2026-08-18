// src/screens/lo.tsx — loan-officer surfaces in the v11 look: 60-second sign-up, Your link (link · QR · text · invite),
// and the read-only status feed. Uses v11's own classes (lender-page, kpi-grid, org-card, borrower-table-card…) so it looks native.
import { useEffect, useState } from "react";

const LO = { first: "Jordan", last: "Lee", nmls: "1849201", company: "Summit Home Loans", branch: "Scottsdale North", states: ["AZ", "CA", "NV"], mobile: "(480) 555-0190", email: "jordan@summithomeloans.com", code: "summit-jlee" };
const LINK = `ready.summithomeloans.com/${LO.code.split("-")[1]}`;
const SMS = `Hi — it's ${LO.first} at ${LO.company}. Here's a 3-minute credit readiness check (no application, soft pull) with a plan built for you: https://${LINK}`;

function copy(text: string, done: (v: boolean) => void) { try { navigator.clipboard?.writeText(text); } catch {} done(true); setTimeout(() => done(false), 1600); }

/* ---------- Your link ---------- */
export function YourLinkPage({ openInvite, openFeed, previewConsumer }: { openInvite: () => void; openFeed: () => void; previewConsumer: () => void }) {
  const [copied, setCopied] = useState(false);
  return <div className="lender-page">
    <div className="lender-page-title"><div><span className="section-kicker">YOUR LINK · NMLS {LO.nmls}</span><h1>Text it, print it, send it.</h1><p>Everyone who uses it stays attributed to you — branch, source and all. You see status, never their report.</p></div><button className="primary-lime dark-text" onClick={openInvite}>＋ Invite consumer</button></div>
    <section className="kpi-grid">
      <article><div><span>Invited this month</span><i className="kpi-icon mint">✉</i></div><strong>14</strong><p>by text and email</p></article>
      <article><div><span>Enrolled</span><i className="kpi-icon lime">✓</i></div><strong>9</strong><p>completed a check</p></article>
      <article><div><span>Working</span><i className="kpi-icon purple">↗</i></div><strong>7</strong><p>active in the last 30 days</p></article>
      <article className="dark-kpi"><div><span>Review requested</span><i className="kpi-icon dark">◈</i></div><strong>2</strong><p>waiting on you</p></article>
    </section>
    <div className="overview-grid">
      <section className="pipeline-card">
        <div className="card-title-row"><div><span className="section-kicker">YOUR PERSONAL LINK</span><h3>One link per human. Attribution baked in.</h3></div></div>
        <div className="invite-link-row"><span>YOUR LINK</span><div><code>https://{LINK}</code><button onClick={() => copy(`https://${LINK}`, setCopied)}>{copied ? "✓ Copied" : "Copy link"}</button></div><p>Dynamic links preserve loan officer, branch, campaign and lead-source attribution.</p></div>
        <div className="detail-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <a className="primary-dark" href={`sms:?&body=${encodeURIComponent(SMS)}`}>💬 Text this to a client</a>
          <button className="outline-button" onClick={openInvite}>✉ Send an invitation</button>
          <button className="outline-button" onClick={previewConsumer}>Preview my front door →</button>
        </div>
        <div className="conversion-note"><span>💬</span><p><strong>What the text looks like</strong><small>{SMS}</small></p></div>
      </section>
      <section className="attention-card">
        <div className="card-title-row"><div><span className="section-kicker">YOUR QR CODE</span><h3>Scannable, print-ready</h3></div></div>
        <div style={{ display: "grid", placeItems: "center", gap: 10, padding: "8px 0 4px" }}>
          <img src={`qr/${LO.code}.svg`} alt={`QR code for ${LINK}`} width={196} height={196} style={{ borderRadius: 14, border: "1px solid var(--line)", background: "#fff", padding: 8 }} />
          <strong>{LINK}</strong>
          <small style={{ color: "var(--muted)", textAlign: "center" }}>Put it on a card, an open-house flyer, a slide. Every scan lands on your branded front door.</small>
        </div>
        <div className="journey-health"><div><span>Not a CRM, on purpose</span><strong>status only</strong></div><div><i style={{ width: "100%" }} /></div><small>Notes, tasks and pipeline stay in the CRM you already run — ReadyIQ sends status through Zapier or a connector.</small></div>
        <button className="outline-button" style={{ marginTop: 12 }} onClick={openFeed}>Open the status feed →</button>
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
    {step === 1 && <div className="form-panel"><span className="section-kicker">60 SECONDS TO A LINK</span><h2>Get your ReadyIQ link.</h2><p>Two fields. We fill in the rest from your NMLS ID and pull your company’s brand from its website.</p>
      <div className="form-grid"><label>Work email<input value={email} placeholder="jordan@summithomeloans.com" onChange={(e) => setEmail(e.target.value)} /></label><label>NMLS ID<input value={nmls} placeholder="1849201" onChange={(e) => setNmls(e.target.value)} /></label></div>
      <button className="link-button" onClick={() => { setEmail("jordan@summithomeloans.com"); setNmls("1849201"); }}>Demo: fill for me →</button>
      <button disabled={!ok} className="primary-dark wide" onClick={() => setStep(2)}>Continue <span>→</span></button></div>}
    {step === 2 && <div className="form-panel permission-panel"><span className="section-kicker">FOUND YOU</span><h2>Hi {LO.first}. We matched your NMLS ID.</h2><p>Confirm and we’ll pull your brand.</p>
      <div className="permission-list"><div><i>✓</i><p><strong>{LO.first} {LO.last} · NMLS {LO.nmls}</strong><span>{LO.company} · {LO.branch} · licensed in {LO.states.join(", ")}</span></p></div><div><i>⌁</i><p><strong>Brand pulled from summithomeloans.com</strong><span>Logo, colors and support contact — consumers see your company, not ours.</span></p></div><div><i>≠</i><p><strong>Status, never reports</strong><span>You’ll see pathway, round, milestones and review requests. Never the credit report.</span></p></div></div>
      <button className="primary-dark wide" onClick={() => setStep(3)}>That’s me — make my link <span>→</span></button></div>}
    {step === 3 && <div className="form-panel identity-panel"><span className="section-kicker">DONE IN {Math.max(secs, 1)} SECONDS</span><h2>Your link is ready.</h2><p>One link per human. Every consumer who uses it stays attributed to you.</p>
      <div className="invite-link-row" style={{ marginTop: 6 }}><span>YOUR LINK</span><div><code>https://{LINK}</code><button onClick={done}>Open</button></div><p>Next: text it to a client, print the QR, or send an invitation.</p></div>
      <button className="primary-lime wide dark-text" onClick={done}>Open your link page <span>→</span></button></div>}
  </div></div>;
}

/* ---------- read-only status feed ---------- */
const FEED = [
  { name: "Aaron Patel", initials: "AP", tone: "gold", pathway: "Ready Now", status: "Review requested", round: "2 of ~2", next: "Lender review", last: "2 days ago", review: true },
  { name: "Derek Young", initials: "DY", tone: "lime", pathway: "Near Ready", status: "Threshold reached", round: "3 of ~3", next: "Cross 640", last: "1 hr ago", review: false },
  { name: "Maya Collins", initials: "MC", tone: "mint", pathway: "Build Mode", status: "Active", round: "2 of ~5", next: "Utilization under 30%", last: "12 min ago", review: false },
  { name: "Sofia Ramirez", initials: "SR", tone: "violet", pathway: "Dispute Mode", status: "Disputes sent", round: "1 of ~4", next: "Bureau responses · due Sep 8", last: "Yesterday", review: false },
  { name: "Nina Brooks", initials: "NB", tone: "blue", pathway: "Thin Credit", status: "Active", round: "1 of ~4", next: "Report 19 months of rent", last: "3 days ago", review: false },
];
export function StatusFeedPage({ openInvite, onSelect }: { openInvite: () => void; onSelect: () => void }) {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Ready Now", "Near Ready", "Build Mode", "Thin Credit", "Dispute Mode"];
  const rows = FEED.filter((r) => filter === "All" || r.pathway === filter);
  const pinned = rows.filter((r) => r.review), rest = rows.filter((r) => !r.review);
  const Row = ({ r }: { r: typeof FEED[number] }) => <tr onClick={onSelect}><td><span className={`person-avatar ${r.tone}`}>{r.initials}</span><div><strong>{r.name}</strong><small>Assigned to Jordan Lee · {r.status}</small></div></td><td><span className={`status-cell ${r.tone}`}>● {r.pathway}</span></td><td><strong>{r.round}</strong><small>round</small></td><td>{r.next}</td><td>{r.last}</td><td><button onClick={(e) => { e.stopPropagation(); alert(`Calling ${r.name.split(" ")[0]}…`); }}>Call</button></td></tr>;
  return <div className="lender-page">
    <div className="lender-page-title"><div><span className="section-kicker">STATUS FEED · READ-ONLY</span><h1>Where your people are.</h1><p>Pathway, round, milestones, review requests. Never the report. Notes and tasks belong in your CRM.</p></div><button className="primary-lime dark-text" onClick={openInvite}>＋ Invite consumer</button></div>
    <div className="filter-bar"><div className="filter-tabs">{filters.map((x) => <button key={x} className={filter === x ? "active" : ""} onClick={() => setFilter(x)}>{x}{x === "All" && <b>{FEED.length}</b>}</button>)}</div><span className="info-badge">{pinned.length} review requested</span></div>
    {pinned.length > 0 && <section className="borrower-table-card pipeline-table"><div className="card-title-row"><div><span className="section-kicker">REVIEW REQUESTED</span><h3>Waiting on you</h3></div></div><div className="table-wrap"><table className="borrower-table"><thead><tr><th>Consumer</th><th>Pathway</th><th>Round</th><th>Next milestone</th><th>Last activity</th><th /></tr></thead><tbody>{pinned.map((r) => <Row key={r.name} r={r} />)}</tbody></table></div></section>}
    <section className="borrower-table-card pipeline-table"><div className="card-title-row"><div><span className="section-kicker">WORKING</span><h3>{rest.length} consumers</h3></div></div><div className="table-wrap"><table className="borrower-table"><thead><tr><th>Consumer</th><th>Pathway</th><th>Round</th><th>Next milestone</th><th>Last activity</th><th /></tr></thead><tbody>{rest.map((r) => <Row key={r.name} r={r} />)}</tbody></table></div></section>
    <div className="sharing-card" style={{ marginTop: 16 }}><span>⌁</span><div><strong>Consumers control what you see.</strong><p>A review request shares a status packet — pathway, floors met, DTI estimate, rent months, disputes closed — with consent for the hard pull when you talk.</p></div></div>
  </div>;
}
