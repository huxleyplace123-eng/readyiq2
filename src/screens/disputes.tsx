// src/screens/disputes.tsx — the Dispute Hub, one thing at a time: pick an item, answer "is this right?", pick a reason,
// approve the letter, track it. Same data as v11's DisputeCenter; the list+detail split and the KPI tiles are gone.
import { useState } from "react";
import { MortgageWhy } from "./consumer";

const ITEMS = [
  { id: "M", creditor: "Midland Credit Management", type: "Collection account", bureau: "Experian · TransUnion", balance: "$684", opened: "Mar 2023", account: "•••• 6142", flag: "The reported balance and account dates may need verification.", status: "Needs review", cat: "collection" },
  { id: "C", creditor: "Comenity / Store Card", type: "Late payment · June 2024", bureau: "Equifax", balance: "$0", opened: "Nov 2021", account: "•••• 0918", flag: "You indicated the June 2024 payment may have been made on time.", status: "Flagged", cat: "late" },
  { id: "✓", creditor: "Capital One", type: "Revolving account", bureau: "All 3 bureaus", balance: "$412", opened: "Jan 2020", account: "•••• 4471", flag: "You reviewed this account and chose not to dispute it.", status: "Reviewed", cat: "payment_amount" },
];
const REASONS = ["The balance is wrong", "The dates are wrong", "This account isn’t mine", "The payment history is wrong", "It appears more than once"];

export function DisputeHub() {
  const [sel, setSel] = useState(0); const [step, setStep] = useState(1); const [reason, setReason] = useState(REASONS[0]);
  const item = ITEMS[sel]; const done = item.status === "Reviewed";
  const go = (i: number) => { setSel(i); setStep(1); };
  return <div className="dashboard-page dispute-page">
    <div className="welcome-row"><div><span className="section-kicker">READYIQ DISPUTE HUB</span><h2>Find it. Dispute it. <em>Track it.</em></h2><p>One item at a time. You decide what’s wrong; ReadyIQ writes the letter and keeps the clock. Nothing is sent without you.</p></div><span className="info-badge">2 flagged · {step >= 3 ? 1 : 0} draft</span></div>

    <div className="dh-items">{ITEMS.map((x, i) => <button key={x.creditor} className={`${sel === i ? "active" : ""} ${x.status === "Reviewed" ? "done" : ""}`} onClick={() => go(i)}><i>{x.id}</i><span><strong>{x.creditor}</strong><small>{x.status}</small></span></button>)}</div>

    <section className="dh-card">
      <div className="dh-head"><div className="dh-title"><span className="report-icon large">{item.id}</span><div><h3>{item.creditor}</h3><p>{item.type} · {item.bureau}</p></div></div>
        <div className="dh-steps">{[["Review", 1], ["Reason", 2], ["Letter", 3], ["Track", 4]].map(([l, n]) => <span key={l as string} className={step === n ? "now" : step > (n as number) ? "done" : ""}><i>{step > (n as number) ? "✓" : n}</i>{l}</span>)}</div></div>

      {step === 1 && <div className="dh-body">
        <div className="dh-facts"><div><small>REPORTED BALANCE</small><strong>{item.balance}</strong></div><div><small>OPENED</small><strong>{item.opened}</strong></div><div><small>ACCOUNT</small><strong>{item.account}</strong></div><div><small>REPORTED BY</small><strong>{item.bureau}</strong></div></div>
        <div className="dh-flag"><i>✦</i><p><b>CreditBuilderIQ flagged this.</b> {item.flag} Compare it with your own records — only dispute what you believe is wrong.</p></div>
        <MortgageWhy category={item.cat} />
        {!done ? <>
          <h4 className="dh-q">Is this information right?</h4>
          <div className="dh-choice"><button className="primary-dark" onClick={() => setStep(2)}>No — it’s wrong. Dispute it <span>→</span></button><button className="outline-button" onClick={() => go(Math.min(sel + 1, ITEMS.length - 1))}>Yes, it’s correct — skip</button></div>
          <div className="dh-links"><button onClick={() => alert("ReadyIQ explains each field: what a collection tradeline is, what ‘date opened’ means for aging, and why the balance matters for FHA’s $2,000 rule.")}>Explain this item</button><span>·</span><button onClick={() => alert("Add statements, receipts or letters — attached to the dispute if you send one.")}>Add my records</button></div>
        </> : <div className="dh-reviewed"><i>✓</i><p><b>Reviewed — nothing to dispute.</b> You looked at this account and chose to leave it. You can reopen it any time.</p><button className="outline-button" onClick={() => go(0)}>Back to flagged items</button></div>}
      </div>}

      {step === 2 && <div className="dh-body">
        <h4 className="dh-q">What’s wrong with it?</h4>
        <div className="reason-selector dh-reasons">{REASONS.map((x) => <button key={x} className={reason === x ? "selected" : ""} onClick={() => setReason(x)}><i>{reason === x ? "●" : "○"}</i>{x}</button>)}</div>
        <div className="bureau-select"><span>Send to</span><label><input type="checkbox" defaultChecked /> Experian</label><label><input type="checkbox" defaultChecked /> TransUnion</label></div>
        <div className="detail-actions"><button className="outline-button" onClick={() => setStep(1)}>Back</button><button className="primary-dark" onClick={() => setStep(3)}>Write my letter <span>→</span></button></div>
      </div>}

      {step === 3 && <div className="dh-body">
        <h4 className="dh-q">Your letter — read it, then approve.</h4>
        <div className="letter-paper dh-letter"><span>August 18, 2026</span><strong>Re: Request to investigate inaccurate account information</strong><p>To whom it may concern,</p><p>I am writing to dispute information appearing on my consumer credit report for the account listed below.</p><dl><div><dt>Creditor</dt><dd>{item.creditor}</dd></div><div><dt>Account</dt><dd>{item.account}</dd></div><div><dt>Reason</dt><dd>{reason}</dd></div></dl><p>Please investigate this information and correct or remove any information that cannot be verified as complete and accurate.</p><i>Letter shortened for this interactive concept.</i></div>
        <div className="letter-tools"><button onClick={() => alert("The letter editor would open here.")}>✎ Edit</button><button onClick={() => alert("Supporting records would be attached here.")}>＋ Attach records</button><button onClick={() => alert("A letter PDF would be prepared here.")}>↓ Download</button></div>
        <div className="detail-actions"><button className="outline-button" onClick={() => setStep(2)}>Back</button><button className="primary-dark" onClick={() => setStep(4)}>Approve &amp; send <span>→</span></button></div>
      </div>}

      {step === 4 && <div className="dh-body">
        <div className="dispute-sent dh-sent"><span>✓</span><small>SENT · TRACKING STARTED</small><h3>Done. Now we wait — and we keep the clock.</h3><p>Bureaus have 30 days (up to 45) to answer. ReadyIQ keeps the dates and the outcome here, and pauses new disputes automatically once your loan is in process.</p><div><article><small>SENT TO</small><strong>Experian + TransUnion</strong></article><article><small>SENT</small><strong>August 18, 2026</strong></article><article><small>ANSWER DUE</small><strong>September 20, 2026</strong></article></div><button className="primary-dark" onClick={() => go(1)}>Review the next flagged item <span>→</span></button></div>
      </div>}

      <div className="consumer-control-note">You approve every action. ReadyIQ does not claim that accurate information can be removed or guarantee any result.</div>
    </section>
  </div>;
}
