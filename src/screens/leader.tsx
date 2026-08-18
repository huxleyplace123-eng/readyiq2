// src/screens/leader.tsx — the "leader moves": Readiness Passport (+ verified-ready badge), soft tri-merge last mile,
// underwriter notes, down-payment-assistance match, lost-lead revival, and the Guide panel that explains each one.
import { useEffect, useState } from "react";
import { useLang } from "./lang";

/* ---------- 1. Readiness Passport ---------- */
const PASSPORT_ID = "RIQ-7F2A-MC";
export function PassportPage({ openReview }: { openReview: () => void }) {
  const [ready, setReady] = useState(false); const [share, setShare] = useState(false); const [shared, setShared] = useState<{ who: string; kind: string; when: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const link = `${location.origin}${location.pathname}?passport=${PASSPORT_ID}`;
  return <div className="dashboard-page cx-page">
    <div className="welcome-row"><div><span className="section-kicker">READINESS PASSPORT</span><h2>Your readiness, <em>in your hands.</em></h2><p>A portable status you control. Hand it to a realtor to strengthen an offer, or to a second lender — Jordan stays your loan officer of record either way. It never contains your score or your report.</p></div><button className="primary-dark" onClick={() => setShare(true)}>Share my passport</button></div>
    <div className="pp-grid">
      <PassportCard ready={ready} />
      <aside className="pp-side">
        <div className="pp-box"><span className="section-kicker">WHAT’S INSIDE</span><ul className="pp-list"><li>✓ Pathway and round</li><li>✓ Program floors met (FHA · conventional)</li><li>✓ DTI estimate — in range or not</li><li>✓ Verified rent months</li><li>✓ Disputes: sent · open</li><li>✓ Loan officer of record</li></ul><span className="section-kicker" style={{ marginTop: 14 }}>NEVER INSIDE</span><ul className="pp-list no"><li>✕ Your score</li><li>✕ Your report or tradelines</li><li>✕ SSN, DOB, address</li></ul></div>
        <div className="pp-box"><span className="section-kicker">VERIFIED READY BUYER</span><p className="pp-p">When program floors are met and your DTI is in range, the passport turns green and you get a badge you can add to an offer letter or share. It’s earned, not claimed — ReadyIQ verifies it against your live status.</p><label className="pp-switch"><input type="checkbox" checked={ready} onChange={(e) => setReady(e.target.checked)} /><span /><b>Preview as verified ready (demo)</b></label></div>
        <div className="pp-box"><span className="section-kicker">SHARED WITH</span>{shared.length === 0 ? <p className="pp-p">No one yet. Sharing is a link you can revoke any time.</p> : <ul className="pp-shared">{shared.map((s) => <li key={s.who}><div><strong>{s.who}</strong><small>{s.kind} · {s.when}</small></div><button onClick={() => setShared(shared.filter((x) => x.who !== s.who))}>Revoke</button></li>)}</ul>}<button className="outline-button" style={{ marginTop: 10 }} onClick={() => setShare(true)}>Share →</button></div>
        <div className="pp-box dark"><span className="section-kicker light">WHEN JORDAN SHOULD SEE MORE</span><p className="pp-p">The passport is status. When you want a real look, request a review — that packet is richer and includes consent for the hard pull when you talk.</p><button className="primary-lime dark-text" onClick={openReview}>Request lender review →</button></div>
      </aside>
    </div>
    {share && <div className="modal-backdrop" onMouseDown={(e) => e.currentTarget === e.target && setShare(false)}><div className="review-modal pp-modal"><button className="modal-close" onClick={() => setShare(false)}>×</button>
      <span className="section-kicker">SHARE YOUR PASSPORT</span><h2>Who should see your status?</h2><p>They see the passport exactly as it looks on the left — status only. Jordan Lee stays your loan officer of record on every copy.</p>
      <div className="pp-recipients">{[["Dana Kim", "Realtor · Desert Realty"], ["Another lender", "Second opinion — status only"], ["Family", "Co-borrower or co-signer"]].map(([who, kind]) => <button key={who} onClick={() => { setShared([...shared.filter((x) => x.who !== who), { who, kind, when: "just now" }]); }}>{who}<small>{kind}</small>{shared.some((x) => x.who === who) && <b>✓ shared</b>}</button>)}</div>
      <div className="invite-link-row" style={{ marginTop: 14 }}><span>PASSPORT LINK</span><div><code>{link}</code><button onClick={() => { try { navigator.clipboard?.writeText(link); } catch {} setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "✓ Copied" : "Copy"}</button></div><p>Anyone with the link sees status only. Revoke it from “Shared with.”</p></div>
      <button className="primary-dark wide" onClick={() => setShare(false)}>Done</button>
    </div></div>}
  </div>;
}

export function PassportCard({ ready, compact = false }: { ready: boolean; compact?: boolean }) {
  return <article className={`pp-card ${ready ? "ready" : ""} ${compact ? "compact" : ""}`}>
    <div className="pp-head"><div className="brand-mark inverse"><span className="brand-symbol"><i />R</span><span>Ready<span>IQ</span></span></div><span className="pp-status">{ready ? "✓ VERIFIED READY" : "● WORKING · ROUND 2 OF ~5"}</span></div>
    <div className="pp-name"><small>READINESS PASSPORT</small><strong>Maya Collins</strong><span>Scottsdale, AZ · {PASSPORT_ID} · updated today</span></div>
    <div className="pp-rows">
      <div><span>Pathway</span><strong>{ready ? "Ready now" : "Build mode"}</strong></div>
      <div><span>Program floors</span><strong>FHA ✓ · Conventional {ready ? "✓" : "—"}</strong></div>
      <div><span>DTI estimate</span><strong>11% · in range ✓</strong></div>
      <div><span>Rent history</span><strong>24 / 24 months ✓</strong></div>
      <div><span>Disputes</span><strong>{ready ? "0 open" : "1 sent · 1 to review"}</strong></div>
      <div><span>Protect Mode</span><strong>{ready ? "Ready" : "Off"}</strong></div>
    </div>
    <div className="pp-foot"><div><small>LOAN OFFICER OF RECORD</small><strong>Jordan Lee · Summit Home Loans</strong><span>NMLS 1849201 · (480) 555-0190</span></div><div className="pp-verify"><small>VERIFIED BY</small><strong>ReadyIQ</strong><span>MyScoreIQ + CreditBuilderIQ</span></div></div>
    {ready && <div className="pp-badge">✓ Verified ready buyer</div>}
  </article>;
}

export function PassportPublic({ getOwn }: { getOwn: () => void }) {
  return <div className="pp-public">
    <div className="pp-public-inner">
      <span className="section-kicker light">SHARED WITH YOU BY MAYA COLLINS</span>
      <h1>A readiness passport, <em>not a preapproval.</em></h1>
      <p>Maya chose to share her ReadyIQ status with you. It is verified against her live credit-building plan and contains no score and no report. Her loan officer of record is Jordan Lee at Summit Home Loans.</p>
      <PassportCard ready={false} />
      <div className="pp-public-actions"><a className="primary-lime dark-text" href="tel:+14805550190">Call Jordan Lee →</a><button className="outline-button light" onClick={getOwn}>Get your own readiness check</button></div>
      <small>Status only · consumer-controlled · revocable · not a mortgage approval or lending decision.</small>
    </div>
  </div>;
}

/* ---------- 3. Soft tri-merge — the last mile ---------- */
export function TriMerge() {
  const [state, setState] = useState<"idle" | "running" | "done">("idle"); const [ok, setOk] = useState(false);
  useEffect(() => { if (state === "running") { const id = setTimeout(() => setState("done"), 1400); return () => clearTimeout(id); } }, [state]);
  return <div className="tri">
    <div className="tri-head"><span className="section-kicker">THE LAST MILE · OPTIONAL</span><strong>Preview the scores lenders actually use — with a soft pull.</strong><p>Summit’s credit vendor can run a <b>soft</b> tri-merge with mortgage-model FICO® (2 · 4 · 5). No hard inquiry, no effect on your score. Jordan sees only “floors met” — never the numbers unless you share them.</p></div>
    {state === "idle" && <><label className="consent-check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /><span><strong>Run a soft tri-merge preview through Summit’s vendor (Xactus).</strong> Soft inquiry only — it does not affect my score and is not an application.</span></label><button disabled={!ok} className="outline-button" onClick={() => setState("running")}>Run soft preview →</button></>}
    {state === "running" && <div className="tri-running"><i /> Running soft tri-merge… no hard inquiry</div>}
    {state === "done" && <div className="tri-result">
      <div className="tri-scores"><div><small>EXPERIAN · FICO® 2</small><strong>618</strong></div><div className="mid"><small>TRANSUNION · FICO® 4</small><strong>611</strong><b>middle score</b></div><div><small>EQUIFAX · FICO® 5</small><strong>604</strong></div></div>
      <div className="tri-floors"><span>Summit FHA floor 600 · <b className="ok">met ✓</b></span><span>Conventional 620 · <b>9 to go</b></span></div>
      <small>Soft tri-merge via Xactus · mortgage-model scores · a preview, not a decision. Jordan’s packet reads “FHA floor met (soft)”.</small>
    </div>}
  </div>;
}

/* ---------- 4. The underwriter in your pocket ---------- */
export function UnderwriterNotes() {
  const [open, setOpen] = useState(0);
  const notes: [string, string, string][] = [
    ["Collections", "FHA: medical collections are excluded. Non-medical collections over $2,000 in aggregate need a payment plan or 5% of the balance counted in DTI. Conventional: automated underwriting decides — paid or unpaid varies.", "That is why Midland is sequenced first, and why paying it may not raise the FICO® you see."],
    ["Utilization", "No guideline threshold — but score tiers set pricing (loan-level price adjustments) on conventional loans. Under 30% is the fastest lever in most files.", "Summit Visa under 30% is today’s next action."],
    ["Rent history", "Fannie Mae’s DU can count 12 months of on-time rent of $300+ (with your consent) for borrowers with thin credit.", "Your 24 verified months are worth more than they look."],
    ["New debt during the loan", "Underwriters re-verify credit before closing (a “refresh”). A new card, car or inquiry can reopen the file.", "Protect Mode exists for exactly this window."],
  ];
  return <div className="uw-card">
    <span className="section-kicker">WHY EACH STEP MATTERS TO AN UNDERWRITER</span><h4>Guideline-aware, in plain words.</h4>
    <div className="uw-list">{notes.map(([t, g, w], i) => <div key={t} className={open === i ? "open" : ""}><button onClick={() => setOpen(open === i ? -1 : i)}><strong>{t}</strong><i>{open === i ? "−" : "+"}</i></button>{open === i && <div className="uw-body"><p>{g}</p><small>{w}</small></div>}</div>)}</div>
    <small className="uw-note">Public agency guidelines, summarized. Guidance, not a promise — programs and lender overlays vary. Ask ReadyIQ knows these too.</small>
  </div>;
}

/* ---------- 5. Down-payment assistance at readiness ---------- */
export function DpaCard() {
  const programs: [string, string, string][] = [["Home Plus", "Arizona IDA", "Up to 5% of the loan toward down payment or closing"], ["Home in Five Advantage", "Maricopa County", "Up to 5% · first-time and returning buyers"], ["Pima Tucson Homebuyer’s Solution", "Pima IDA", "Up to 5% · income limits apply"]];
  return <div className="dpa-card">
    <span className="section-kicker">DOWN-PAYMENT ASSISTANCE · ARIZONA</span><h4>3 programs you may qualify for.</h4>
    <div className="dpa-list">{programs.map(([n, a, d]) => <div key={n}><div><strong>{n}</strong><small>{a}</small></div><span>{d}</span></div>)}</div>
    <small className="dpa-note">Matched on county, income band and first-time status via Down Payment Resource. Your loan officer confirms eligibility — this is a match, not an award.</small>
    <button className="outline-button" onClick={() => alert("Drafted to Jordan: “Maya may qualify for Home Plus, Home in Five Advantage and Pima Tucson HBS — can we talk about which fits?”")}>Ask Jordan about these →</button>
  </div>;
}

/* ---------- 6. Lost-lead revival ---------- */
export function LostLeadRevival() {
  const [step, setStep] = useState(0);
  return <section className="llr">
    <div className="llr-copy"><span className="section-kicker">LOST-LEAD REVIVAL</span><h3>The leads you already paid for, <em>invited back.</em></h3><p>Sync the not-ready pile from your CRM (or drop a CSV). ReadyIQ de-dupes, keeps the original loan officer, and sends each person a personal invitation to their own front door. They consent themselves. You see status.</p>
      <div className="llr-steps"><div className={step >= 1 ? "done" : "now"}><span>{step >= 1 ? "✓" : "1"}</span><b>Sync or upload</b><small>Total Expert · Shape · Salesforce · CSV</small></div><div className={step >= 2 ? "done" : step === 1 ? "now" : ""}><span>{step >= 2 ? "✓" : "2"}</span><b>Match &amp; de-dupe</b><small>original LO and lead source preserved</small></div><div className={step >= 2 ? "now" : ""}><span>3</span><b>Send invitations</b><small>each to their own attributed front door</small></div></div>
    </div>
    <div className="llr-panel">
      {step === 0 && <><small className="llr-kicker">STEP 1</small><strong>Where is your not-ready pile?</strong><div className="llr-sources">{["Total Expert", "Shape", "Salesforce", "Upload CSV"].map((s) => <button key={s} onClick={() => setStep(1)}>{s}</button>)}</div><p>Read-only sync. Nothing is written back until you connect status events.</p></>}
      {step === 1 && <><small className="llr-kicker">STEP 2 · MATCHED</small><div className="llr-numbers"><div><strong>214</strong><small>not-ready leads · last 18 months</small></div><div><strong>41</strong><small>already invited</small></div><div><strong>173</strong><small>ready to invite</small></div></div><p>Attributed to 12 loan officers across 4 branches. Duplicates and do-not-contact removed.</p><button className="primary-lime dark-text" onClick={() => setStep(2)}>Send 173 personal invitations →</button></>}
      {step === 2 && <><small className="llr-kicker">DONE</small><strong>173 invitations queued.</strong><p>Each lands on the original loan officer’s front door, by text and email, spread over 3 days. Consumers who enroll appear in each LO’s status feed — never in a shared list.</p><div className="llr-numbers"><div><strong>12</strong><small>loan officers</small></div><div><strong>3 days</strong><small>send window</small></div><div><strong>0</strong><small>reports seen by anyone</small></div></div><button className="outline-button" onClick={() => setStep(0)}>Run another</button></>}
    </div>
  </section>;
}

/* ---------- 7. Property-manager channel: partner + door copy live in lo.tsx (Scottsdale Palms) ---------- */

/* ---------- The Guide: what makes it a leader, and where to click ---------- */
export type Go = (mode: "marketing" | "lender" | "consumer" | "integrations", page?: string, extra?: string) => void;
export function GuidePanel({ open, close, go }: { open: boolean; close: () => void; go: Go }) {
  const { es, setLang } = useLang();
  const items: [string, string, string, () => void][] = [
    ["Readiness Passport", "The consumer owns a portable, verified status — hand it to a realtor or a second lender. Jordan stays loan officer of record on every copy. Nobody neutral across lenders holds these rails.", "Consumer › Passport", () => go("consumer", "passport")],
    ["Renters start 12–24 months early", "Property managers get a partner link like realtors do. Renters begin reporting rent (Resident-Link rails) before a loan officer ever calls.", "Lender › Partners · Scottsdale Palms", () => go("lender", "partners")],
    ["The soft tri-merge last mile", "At readiness, Summit’s vendor runs a soft tri-merge with mortgage-model scores. Real numbers, no hard pull. Closes the “MyScoreIQ isn’t a mortgage score” gap honestly.", "Consumer › Request lender review", () => go("consumer", "result", "review")],
    ["The underwriter in your pocket", "Every plan step carries why it matters to an underwriter — collections rules, DTI, rent history, refresh before closing. Ask ReadyIQ knows the same guidelines.", "Consumer › My gameplan", () => go("consumer", "plan")],
    ["Down-payment assistance at readiness", "One card, three programs the consumer may qualify for (Down Payment Resource). Confirmed by the LO, never awarded by us.", "Consumer › My gameplan", () => go("consumer", "plan")],
    ["Lost-lead revival", "Sync the not-ready pile from the CRM; every lead gets a personal invitation to the original LO’s front door. The website headline, made literal.", "Lender › Journeys", () => go("lender", "campaigns")],
    ["Spanish, first-class", "One toggle. The front door, enrollment and overview switch to Spanish; the same honesty rules apply.", "Consumer › front door · ES", () => { setLang("es"); go("consumer", "welcome"); }],
    ["Verified ready buyer", "When floors are met and DTI is in range, the passport turns green and the consumer earns a badge for offer letters — earned against live status, never claimed.", "Consumer › Passport › preview", () => go("consumer", "passport")],
  ];
  if (!open) return null;
  return <div className="guide-backdrop" onMouseDown={(e) => e.currentTarget === e.target && close()}><aside className="guide">
    <div className="guide-head"><div><span className="section-kicker light">THE GUIDE</span><h2>What makes it a <em>leader.</em></h2><p>Eight moves only this combination of rails makes possible. Each is one card or one button on a screen that already exists.</p></div><button className="modal-close" onClick={close}>×</button></div>
    <ol className="guide-list">{items.map(([t, d, where, act], i) => <li key={t}><span className="guide-n">{String(i + 1).padStart(2, "0")}</span><div><strong>{t}</strong><p>{d}</p><button onClick={() => { act(); close(); }}>{where} →</button></div></li>)}</ol>
    <div className="guide-foot"><small>{es ? "Idioma: español activo." : "Language: English."} · Honesty rules everywhere: no promised deletions, points, approvals or timelines; the LO sees status, never the report.</small></div>
  </aside></div>;
}
