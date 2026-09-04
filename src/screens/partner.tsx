// src/screens/partner.tsx — the credit-repair firm's surface: their cases, and the moment
// that matters, handing a client back to a loan officer.
//
// Three rules shape this screen and all three come from the law, not from taste:
//   1. The summary carries a stage and blockers — never a score, never the report.
//   2. The client consents to this specific share, and the consent is stamped and kept.
//   3. The operator may pick more than one loan officer, and nothing of value moves
//      in either direction. Flat pricing, never per referral.
import { useState } from "react";
import { StagePill, BUCKETS, bucketOf, type Stage } from "./stage";
import { sendReferral, railLive, consentNow } from "../rail";

const FIRM = { name: "Brightpath Credit", initials: "BP", seats: 6 };

// `railId` is the same person in the rail's fixture world (server/state.js: Harbor Home
// Loans). When a rail is connected, the send flow posts against that record and the rail
// derives the summary itself — the browser never sends one.
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

const PARTNER_LOS = [
  { id: "jlee", name: "Jordan Lee", company: "Summit Home Loans", note: "Referred Maya and Derek to you" },
  { id: "amorgan", name: "Alex Morgan", company: "Summit Home Loans", note: "Phoenix Central" },
  { id: "rkaur", name: "Priya Kaur", company: "Vantage Lending", note: "Works FHA and down-payment assistance" },
];

export function PartnerApp() {
  const [openCase, setOpenCase] = useState<string | null>(null);
  const c = CASES.find((x) => x.id === openCase) ?? null;
  return <div className="lender-app partner-app">
    <aside className="lender-sidebar">
      <div className="lender-sidebar-logo"><span className="partner-mark">{FIRM.initials}</span><span>CREDIT REPAIR</span></div>
      <div className="company-switch"><div className="mini-summit inverse"><b>{FIRM.initials}</b><span>{FIRM.name}<small>{FIRM.seats} seats</small></span></div></div>
      <nav>
        <span className="nav-label">YOUR FIRM</span>
        <button className="active"><i>♙</i>Cases<b>{CASES.length}</b></button>
        <button onClick={() => alert("Loan officers who refer to you, and who you send to. A list — never a ranking.")}><i>⚭</i>Partners<b>{PARTNER_LOS.length}</b></button>
        <button onClick={() => alert("Every send, both directions, with its consent record and what was in the summary.")}><i>▥</i>Referral log</button>
      </nav>
      <div className="sidebar-note">Brightpath does the credit work. ReadyIQ carries the handoff — a stage and the blockers, never the report.</div>
    </aside>
    <div className="lender-main">
      {c ? <CaseView c={c} back={() => setOpenCase(null)} /> : <CaseList open={setOpenCase} />}
    </div>
  </div>;
}

function CaseList({ open }: { open: (id: string) => void }) {
  return <div className="lender-page">
    <div className="lender-page-title"><div><span className="section-kicker">{FIRM.name.toUpperCase()} · {CASES.length} ACTIVE CASES</span><h1>Who's ready to <em>hand back.</em></h1><p>The same three groups the loan officer sees, so both sides are talking about the same thing.</p></div></div>
    <div className="partner-buckets">
      {BUCKETS.map(([key, label]) => {
        const rows = CASES.filter((x) => bucketOf(x.stage) === key);
        return <section key={key} className="borrower-table-card pipeline-table">
          <div className="card-title-row"><div><span className="section-kicker">{label.toUpperCase()}</span><h3>{rows.length}</h3></div></div>
          {rows.map((x) => <button key={x.id} className="partner-row" onClick={() => open(x.id)}>
            <span className={`person-avatar ${x.tone}`}>{x.initials}</span>
            <div><strong>{x.name}</strong><small>{x.blocker}</small></div>
            <StagePill stage={x.stage} />
            <small className="partner-days">{x.days}d in stage</small>
            <small className="partner-lo">{x.lo ? `from ${x.lo}` : "walk-in"}</small>
            <b>{bucketOf(x.stage) === "ready" ? "Send →" : "Open →"}</b>
          </button>)}
        </section>;
      })}
    </div>
  </div>;
}

function CaseView({ c, back }: { c: Case; back: () => void }) {
  const [sending, setSending] = useState(false);
  const canSend = c.stage === "approaching" || c.stage === "ready_to_review";
  return <div className="lender-page">
    <button className="back-link lender-back" onClick={back}>← Back to cases</button>
    <div className="borrower-hero">
      <div className="borrower-identity"><span className={`person-avatar ${c.tone} xl`}>{c.initials}</span><div><div className="identity-title"><h1>{c.name}</h1><StagePill stage={c.stage} /></div><p>{c.lo ? `Referred by ${c.lo} · ${c.loCompany}` : "Walk-in client · no referring loan officer"} · {c.days} days in this stage</p></div></div>
      <div className="borrower-actions"><button className="primary-lime dark-text" disabled={!canSend} onClick={() => setSending(true)}>Send to mortgage partner</button></div>
    </div>
    {!canSend && <div className="protect-banner"><span>⌁</span><div><strong>Not ready to hand back yet.</strong><p>{c.name.split(" ")[0]} reaches “approaching ready” once the open work clears and the score is within the lender's buffer. Sending early is what makes a loan officer stop trusting the signal.</p></div></div>}
    <div className="partner-case-grid">
      <section className="borrower-overview-card">
        <span className="section-kicker">WHAT THE LOAN OFFICER WOULD SEE</span>
        <Summary c={c} />
      </section>
      <section className="blockers-card">
        <div className="card-title-row"><div><span className="section-kicker">YOUR WORK</span><h3>What Brightpath is doing</h3></div></div>
        <div className="blocker-row"><span className="number purple">◇</span><div><strong>Dispute letters</strong><p>{c.disputes.resolved} resolved · {c.disputes.open} still open{c.disputes.withdrawn ? ` · ${c.disputes.withdrawn} withdrawn` : ""}</p></div><b>{c.disputes.open === 0 ? "Round closed" : "In flight"}</b></div>
        <div className="blocker-row"><span className="number mint">⌂</span><div><strong>Rent history</strong><p>{c.rentMonths ? `${c.rentMonths} months verified and reporting` : "Not started"}</p></div><b>{c.rentMonths ? "Reporting" : "—"}</b></div>
        <div className="blocker-row"><span className="number coral">↗</span><div><strong>Balances</strong><p>{c.blocker}</p></div><b>{c.stage === "working" ? "Working" : "Clear"}</b></div>
      </section>
    </div>
    {sending && <SendModal c={c} close={() => setSending(false)} />}
  </div>;
}

/** The readiness summary, rendered exactly as the loan officer receives it. */
function Summary({ c }: { c: Case }) {
  const rows: [string, string][] = [
    ["Stage", c.stage === "ready_to_review" ? "Ready to review" : c.stage === "approaching" ? "Approaching ready" : "Working"],
    ["Lender floors met", c.floors.length ? c.floors.join(" · ") : "None yet"],
    ["Debt-to-income", c.dtiInRange == null ? "Unknown" : c.dtiInRange ? "In range" : "Above range"],
    ["Verified rent", c.rentMonths ? `${c.rentMonths} months` : "None"],
    ["Disputes", `${c.disputes.open} open · ${c.disputes.resolved} resolved${c.disputes.withdrawn ? ` · ${c.disputes.withdrawn} withdrawn` : ""}`],
    ["Loan officer of record", c.lo ?? "None"],
  ];
  return <div className="partner-summary">
    <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    <div className="partner-never"><strong>Never included</strong><span>Credit score</span><span>The credit report</span><span>Account balances</span><span>Income</span><span>SSN or date of birth</span></div>
  </div>;
}

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
        <header><div><span className="section-kicker">SEND TO MORTGAGE PARTNER</span><h2>{c.name}</h2><p>Three things happen here, in this order: the loan officer sees a summary, {c.name.split(" ")[0]} approves it, and you choose who receives it.</p></div><button onClick={close}>×</button></header>
        <div className="invite-form partner-form">
          <div className="partner-step"><span className="partner-step-n">1</span><div><strong>What they'll see</strong><p>A stage and the blockers. Nothing from the report itself.</p></div></div>
          <Summary c={c} />

          <div className="partner-step"><span className="partner-step-n">2</span><div><strong>{c.name.split(" ")[0]}'s permission</strong><p>Required before anything is sent, and kept with the referral.</p></div></div>
          <label className="consent-check partner-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span><strong>{c.name} agrees to share this summary with the loan officers selected below.</strong> They can see exactly what is above, and nothing else. {c.name.split(" ")[0]} can withdraw this at any time, and may still apply anywhere they choose.</span></label>

          <div className="partner-step"><span className="partner-step-n">3</span><div><strong>Who receives it</strong><p>Choose one or more. Never just one by default.</p></div></div>
          <div className="partner-lo-list">{PARTNER_LOS.map((l) => <label key={l.id} className={`partner-lo-pick ${picked.includes(l.id) ? "on" : ""}`}>
            <input type="checkbox" checked={picked.includes(l.id)} onChange={() => toggle(l.id)} />
            <span className="lo-avatar">{l.name.split(" ").map((w) => w[0]).join("")}</span>
            <div><strong>{l.name}</strong><small>{l.company} · {l.note}</small></div>
          </label>)}</div>

          <div className="partner-fine"><span>⌁</span><p><strong>Nothing of value changes hands for this referral.</strong> Brightpath is not paid to send it and the loan officer is not paid to receive it. ReadyIQ is billed per seat — never per referral, never per closed loan.</p></div>
        </div>
        <footer><button className="outline-button" onClick={close}>Cancel</button><button className="primary-lime dark-text" disabled={!ready} onClick={send}>{busy ? "Sending…" : picked.length > 1 ? `Send to ${picked.length} loan officers` : "Send with consent"} <span>→</span></button></footer>
      </> : "error" in sent ? <div className="invite-success">
        <span>!</span><small>THE RAIL REFUSED IT</small>
        <h2>Nothing was sent.</h2>
        <p>{sent.error === "unknown_consumer" ? `${c.name.split(" ")[0]} isn't on the connected rail yet.` : sent.error.replace(/_/g, " ")}</p>
        <button className="primary-lime dark-text" onClick={close}>Back to {c.name.split(" ")[0]}'s case</button>
      </div> : <div className="invite-success">
        <span>✓</span><small>{sent.live ? `SENT · LIVE · ${sent.id}` : `SENT ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase()} · DEMO`}</small>
        <h2>{names.join(" and ")} {names.length > 1 ? "have" : "has"} {c.name.split(" ")[0]}'s summary.</h2>
        <p>{sent.live ? `The rail derived the summary from ${c.name.split(" ")[0]}'s record (stage: ${sent.stage.replace(/_/g, " ")}), stamped the consent at ${sent.at}, and logged the referral.` : `It arrived in their Ready-to-review list. ${c.name.split(" ")[0]}'s consent is stamped and stored with the referral, and this send is in your referral log.`}</p>
        <p className="partner-next">The next move is theirs: a soft credit pull to confirm the real mortgage scores before anyone's credit is touched.</p>
        <button className="primary-lime dark-text" onClick={close}>Back to {c.name.split(" ")[0]}'s case</button>
      </div>}
    </section>
  </div>;
}
