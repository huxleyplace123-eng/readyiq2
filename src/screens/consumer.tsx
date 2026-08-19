import { TriMerge } from "./leader";
import { useLang } from "./lang";
// src/screens/consumer.tsx — ReadyIQ 2 consumer features in the v11 look: three consents, honest number strip,
// DTI + eligibility clock, mortgage-priority dispute notes, Guardian, review packet, Ask ReadyIQ.
import { useState } from "react";

export const REGB = "You can apply for a mortgage at any time — this is not required.";

/* three plain-English consents (credit for my own use · status-not-report to my LO · texts) */
export function ConsentBlock({ onChange }: { onChange: (ok: boolean) => void }) {
  const [c, setC] = useState({ credit: false, status: false, text: false }); const { es } = useLang();
  const set = (k: keyof typeof c) => (e: React.ChangeEvent<HTMLInputElement>) => { const n = { ...c, [k]: e.target.checked }; setC(n); onChange(n.credit && n.status && n.text); };
  return <div className="permission-list" style={{ marginTop: 6 }}>
    <label className="consent-check"><input type="checkbox" checked={c.credit} onChange={set("credit")} /><span>{es ? <><strong>Permito que ReadyIQ consulte mi crédito para mi propia revisión.</strong> MyScoreIQ y CreditBuilderIQ obtienen mis reportes y mi FICO® Score para mí. Es una consulta suave — no afecta mi puntaje.</> : <><strong>Let ReadyIQ pull my credit for my own review.</strong> MyScoreIQ and CreditBuilderIQ obtain my reports and FICO® Score for me. This is a soft check — it does not affect my score.</>}</span></label>
    <label className="consent-check"><input type="checkbox" checked={c.status} onChange={set("status")} /><span>{es ? <><strong>Compartir mi estatus — nunca mi reporte — con mi oficial de préstamos.</strong> Jordan ve dónde voy en el camino (como “Ronda 2, meta de utilización cumplida”). Jordan nunca ve mi reporte ni mi puntaje a menos que yo pida una revisión.</> : <><strong>Share my status — never my report — with my loan officer.</strong> Jordan sees where I am on the path (like “Round 2, utilization goal met”). Jordan never sees my credit report or score details unless I request a review.</>}</span></label>
    <label className="consent-check"><input type="checkbox" checked={c.text} onChange={set("text")} /><span>{es ? <><strong>Envíenme mensajes de texto.</strong> ReadyIQ y Jordan pueden escribirme sobre mi camino. Pueden aplicar tarifas; responde STOP para cancelar.</> : <><strong>Text me.</strong> ReadyIQ and Jordan may text me about my path. Message rates may apply; reply STOP any time.</>}</span></label>
    <small style={{ color: "var(--muted)" }}>{es ? "Puedes solicitar una hipoteca cuando quieras — esto no es obligatorio." : REGB}</small>
  </div>;
}

/* three-bureau strip + honest caption, under the score ring */
export function NumberStrip() {
  return <div className="detail-stats" style={{ marginTop: 10 }}>
    <p><span>Experian</span><strong>615</strong></p><p><span>TransUnion</span><strong>612</strong></p><p><span>Equifax</span><strong>608</strong></p>
    <p style={{ gridColumn: "1 / -1" }}><span>Powered by MyScoreIQ</span><strong style={{ fontWeight: 500, color: "var(--muted)" }}>FICO® Score — not the mortgage-industry version lenders pull. A guide, not a preapproval.</strong></p>
  </div>;
}

/* DTI from the report + one income field */
export function DtiCard() {
  const [income, setIncome] = useState<number | null>(6500);
  const debts = [["Summit Visa", 95], ["Desert Rewards", 60], ["Toyota Financial", 389], ["Navient", 180]] as const;
  const total = debts.reduce((a, d) => a + d[1], 0);
  const r = income ? Math.round((total / income) * 100) : null;
  return <div className="target-card"><span className="section-kicker">DEBT-TO-INCOME · ESTIMATE</span><h3>{r == null ? "—" : `${r}%`} <small style={{ fontWeight: 500, color: "var(--muted)" }}>{r == null ? "enter income" : r > 45 ? "above where most programs want it" : r > 36 ? "workable — the housing payment decides it" : "healthy"}</small></h3>
    <div className="target-bars">{debts.map(([n, p]) => <div key={n}><span>{n}</span><div><i style={{ width: `${Math.min(100, (p / total) * 100)}%` }} /></div><b>${p}/mo</b></div>)}</div>
    <label className="full-field" style={{ marginTop: 8 }}>Your gross monthly income<input type="number" value={income ?? ""} onChange={(e) => setIncome(Number(e.target.value) || null)} placeholder="6,500" /></label>
    <small>Debts on the report: ${total}/mo. Lenders compute DTI from the tri-merge and verified income, plus the new housing payment.</small></div>;
}

/* eligibility clock — a date, not a score (waiting periods after Ch. 7 / foreclosure / short sale) */
export function ClockCard({ event = "Chapter 7 discharge", date = "March 12, 2025", fha = "March 12, 2027", conventional = "March 12, 2029", days = 206 }) {
  return <div className="target-card" style={{ background: "var(--navy)", color: "#fff" }}><span className="section-kicker" style={{ color: "var(--lime)" }}>THE CLOCK</span><h3 style={{ color: "#fff" }}>FHA · {fha}</h3><p style={{ color: "rgba(255,255,255,.7)", fontSize: 13 }}>Conventional · {conventional}</p>
    <div className="target-bars"><div><span style={{ color: "rgba(255,255,255,.8)" }}>{days} days to go</span><div><i style={{ width: "72%", background: "var(--lime)" }} /></div><b style={{ color: "#fff" }}>72%</b></div></div>
    <small style={{ color: "rgba(255,255,255,.65)" }}>{event} on {date}. Earliest eligibility, subject to lender review — waiting periods and overlays vary. Every month until then is building time.</small></div>;
}

/* why the number moved — every point tied to a cause */
export function WhyItMoved() {
  const rows = [["+14", "Utilization down — Summit Visa paid to $870"], ["+6", "Lates aging — now 14 months old"], ["−6", "New inquiry — Honda Financial"]];
  return <section className="milestone-section"><div className="section-title"><div><span className="section-kicker">WHY IT MOVED</span><h3>Every point, tied to a cause</h3></div><span className="live-indicator">● Powered by MyScoreIQ</span></div>
    <div className="timeline">{rows.map(([pts, cause]) => <article key={cause} className="complete"><i>{pts.startsWith("+") ? "↑" : "↓"}</i><div><small>SINCE LAST CHECK</small><h4>{cause}</h4></div><b>{pts}</b></article>)}</div></section>;
}

/* mortgage-priority note for a dispute item */
export function MortgageWhy({ category }: { category: "collection" | "late" | "payment_amount" | "duplicate" }) {
  const map = {
    collection: "Derogatory — some programs require it resolved. Paying it doesn’t raise the FICO® you see here; removing an inaccurate one can. Ask Jordan what Summit requires before you pay.",
    late: "Inside the 24 months underwriting weighs most. If it was on time, disputing it is the single biggest lever on this report.",
    payment_amount: "A wrong monthly payment inflates your DTI — this one can decide whether you qualify.",
    duplicate: "Counts one debt twice — inflates balances and DTI.",
  };
  return <div className="conversion-note" style={{ marginTop: 10 }}><span>◈</span><p><strong>Why it matters for a mortgage</strong><small>{map[category]}</small></p></div>;
}

/* Protect Mode — on when a loan is in process */
export function GuardianPage({ on, setOn }: { on: boolean; setOn: (v: boolean) => void }) {
  return <div className="dashboard-page progress-page">
    <div className="welcome-row"><div><span className="section-kicker">PROTECT MODE</span><h2>{on ? <>Your loan is in process. <em>Protect Mode is on.</em></> : <>Protect Mode turns on the day your loan <em>starts.</em></>}</h2><p>{on ? "Nothing changes on your report without Jordan knowing — and nothing should change on purpose without asking first." : "From application to closing, Protect Mode pauses dispute suggestions, watches your report daily and reminds you to ask Jordan before you open, close or pay off anything."}</p></div><button className={on ? "outline-button" : "primary-dark"} onClick={() => setOn(!on)}>{on ? "Turn Protect Mode off (demo)" : "Simulate a loan in process (demo)"}</button></div>
    {on && <section className="result-hero-card"><div className="result-summary"><span className="mode-pill">CLOSING SEP 24 · 37 DAYS</span><h3>Ask Jordan before you…</h3><div className="permission-list">{["open a new account or card", "close an account", "pay off a loan or collection", "co-sign for anyone", "move or deposit large sums", "change jobs"].map((t) => <div key={t}><i>!</i><p><strong>{t}</strong></p></div>)}</div></div>
      <div className="result-score-column" style={{ borderLeft: "1px solid rgba(255,255,255,.12)", paddingLeft: 24 }}><span className="section-kicker" style={{ color: "var(--lime)" }}>RECENT ALERTS · MYSCOREIQ</span><div className="permission-list"><div><i>↗</i><p><strong>New hard inquiry — CarMax Auto Finance</strong><span>Aug 17 · tell Jordan if this wasn’t you — or if it was.</span></p></div><div><i>$</i><p><strong>Chase Freedom balance up $640</strong><span>Aug 12</span></p></div></div><p style={{ marginTop: 12, fontSize: 13, color: "rgba(255,255,255,.7)" }}>Paused: dispute suggestions. Disputes filed during underwriting can stall a file — anything worth disputing waits until after closing, or goes through Jordan.</p></div></section>}
    <section className="priority-section"><div className="section-title"><div><span className="section-kicker">CLOSING CHECKLIST</span><h3>The handful of things that blow up files</h3></div></div><div className="priority-grid">
      {[["01", "Answer any letter-of-explanation request within 24 hours", "Underwriters ask; the file waits until you answer."], ["02", "Keep balances where they are", "No new credit, no new debt, no big payoffs without a call."], ["03", "Before you wire closing funds, call the title company", "At a number you already have — never one from an email. Jordan will never change wiring instructions by email."]].map(([n, t, b]) => <article key={n}><div className="priority-head"><span className="number mint">{n}</span><span className="impact">PROTECT MODE</span></div><h4>{t}</h4><p>{b}</p></article>)}
    </div></section>
    <p style={{ color: "var(--muted)", fontSize: 13 }}>{REGB}</p>
  </div>;
}

/* the review packet — status, never the report — with consent for the hard pull */
export function ReviewPacket({ close }: { close: () => void }) {
  const [sent, setSent] = useState(false); const [consent, setConsent] = useState(false);
  return <div className="modal-backdrop"><div className="review-modal"><button className="modal-close" onClick={close}>×</button>{!sent ? <><span className="review-modal-icon">↗</span><span className="section-kicker">REQUEST REVIEW</span><h2>Ready for Jordan to take a real look?</h2><p>Jordan gets a consumer-authorized packet — your status, never your report — and pulls the real mortgage credit report when you talk.</p>
    <div className="review-summary"><div><span>Pathway</span><strong>Build Mode · Round 2 of ~5</strong></div><div><span>Summit floors met</span><strong>FHA</strong></div><div><span>DTI estimate</span><strong>11%</strong></div><div><span>Rent history</span><strong>24 months</strong></div><div><span>Disputes</span><strong>1 sent · 0 open drafts</strong></div><div><span>Loan officer</span><strong>Jordan Lee</strong></div></div>
    <TriMerge /><label className="consent-check" style={{ marginTop: 10 }}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span><strong>Jordan may pull my mortgage credit report when we talk.</strong> That’s a hard inquiry, done by Summit Home Loans with my permission — it’s how the real qualification starts. Nothing is pulled until we speak.</span></label>
    <button disabled={!consent} className="primary-lime wide dark-text" onClick={() => setSent(true)}>Send to Jordan →</button><small style={{ color: "var(--muted)" }}>{REGB}</small></> : <div className="modal-success"><span>✓</span><h2>Jordan has your packet.</h2><p>Jordan received a ReadyIQ alert and will reach out to schedule. Keep balances where they are until you talk.</p><button className="primary-dark" onClick={close}>Back to my path</button></div>}</div></div>;
}

/* Ask ReadyIQ — floating, scripted, guardrailed */
const ANSWERS: [RegExp, string][] = [
  [/collection|midland|pay.*off/i, "Guideline, not a promise: FHA excludes medical collections and lets non-medical collections under $2,000 in aggregate ride; above that, a payment plan or 5% of the balance counts in your DTI. Conventional lets automated underwriting decide. That’s why Midland is sequenced first — and why paying it may not raise the FICO® you see here."],
  [/dti|debt.to.income|income/i, "Your DTI estimate is 11% on $6,500 gross income and $724 of monthly debt on the report. Most FHA files close under 43–50%, conventional under ~45%, plus the new housing payment — Jordan computes the real number from the tri-merge and verified income. Right now you have room."],
  [/gift|parents|down ?payment|assistance|dpa/i, "Gifts from family are allowed on FHA and conventional with a gift letter and a paper trail. Separately, you may qualify for 3 Arizona assistance programs (Home Plus, Home in Five Advantage, Pima Tucson HBS) — matched via Down Payment Resource, confirmed by Jordan. It’s a match, not an award."],
  [/passport|share|realtor|agent/i, "Your Readiness Passport is a status you own: pathway, floors met, DTI in range, rent months, disputes — never your score or report. Share it with a realtor or a second lender from the Passport page; Jordan stays your loan officer of record on every copy, and you can revoke any time."],
  [/tri.?merge|mortgage score|real score|lenders use/i, "MyScoreIQ shows FICO® 8. Lenders pull FICO® 2/4/5 on a tri-merge. When you request a review, you can let Summit’s vendor run a soft tri-merge first — real mortgage-model numbers, no hard inquiry — and Jordan sees only ‘floors met’ unless you share more."],
  [/why|moved|drop|change/i, "Your FICO® moved up 14 since your last check. Every point has a cause: +14 utilization down (Summit Visa paid to $870), +6 lates aging (now 14 months old), −6 new inquiry (Honda Financial). The full list is under Score center."],
  [/next|should|do now|first/i, "One thing: pay Summit Visa below 30% before the 22nd. Your statement closes on the 22nd — paying $95 more moves the whole card under 30%. It’s the fastest lever you have this round."],
  [/apply|ready|qualify|approve/i, "You can apply for a mortgage at any time — this isn’t required. Right now you’re in Build Mode; your FICO® meets Summit’s directional floor for FHA. What that means for a specific program is Jordan’s call — I don’t predict approvals."],
  [/letter|explanation|loe/i, "Here’s a truthful first draft in your own words — edit anything that isn’t exactly right:\n\nTo whom it may concern,\n\nIn 2025 I was late on two payments during a stretch when my hours were cut. I brought the accounts current within 60 days and have paid every account on time since — 14 months and counting. The recent inquiry was for an auto loan I did not take.\n\nSincerely,\nMaya Collins"],
  [/dispute/i, "You have 1 letter sent (Midland Credit) and 1 item still to review. Letters run on a 30-day clock and we sequence them to finish before your review — and pause them entirely while a loan file is active."],
];
export function AskFab() {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(""); const [log, setLog] = useState<{ who: "you" | "riq"; text: string }[]>([{ who: "riq", text: "Hi Maya. I explain and organize — I never promise deletions, points or approvals. What would you like to know?" }]);
  const ask = (text: string) => { if (!text.trim()) return; const a = ANSWERS.find(([re]) => re.test(text))?.[1] || "I can explain your number, your plan and what happens next — and help you draft a letter of explanation. I don’t predict scores or approvals; Jordan does the qualifying. Try “why did my score move?”, “what should I do next?”, or “can I apply?”"; setLog((l) => [...l, { who: "you", text }, { who: "riq", text: a }]); setQ(""); };
  return <>
    <button className="ask-fab" onClick={() => setOpen(!open)}><i>✦</i>Ask ReadyIQ</button>
    {open && <div className="ask-panel"><div className="ask-head"><span className="section-kicker">ASK READYIQ</span><button onClick={() => setOpen(false)}>×</button></div>
      <div className="ask-chips">{["Why did my score move?", "What should I do next?", "Can I apply?", "Draft a letter of explanation"].map((c) => <button key={c} onClick={() => ask(c)}>{c}</button>)}</div>
      <div className="ask-log">{log.map((m, i) => <div key={i} className={`ask-msg ${m.who}`}>{m.text}</div>)}</div>
      <form className="ask-form" onSubmit={(e) => { e.preventDefault(); ask(q); }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about your number, your plan, or what’s next…" /><button type="submit">Ask</button></form>
      <small>ReadyIQ explains and organizes. It never promises deletions, points, or approvals.</small></div>}
  </>;
}
