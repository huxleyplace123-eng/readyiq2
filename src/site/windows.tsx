// src/site/windows.tsx — the "live windows" the website opens every page with: small, self-contained renderings of the real
// product screens (same classes/tokens as the portals), shown inside a device frame.
import { useState } from "react";
import { PassportCard } from "../screens/leader";
import { BureauScores, type BureauScoreSet } from "../screens/bureaus";

export function Frame({ label, children, dark = false }: { label: string; children: React.ReactNode; dark?: boolean }) {
  return <div className={`frame ${dark ? "dark" : ""}`}><div className="frame-bar"><i /><i /><i /><span>{label}</span></div><div className="frame-body">{children}</div></div>;
}

export function ScoreWindow() {
  return <div className="cx-window site-win">
    <div className="cx-chrome"><span><i />FICO® · 3 bureaus · MyScoreIQ</span><span>Maya C.</span></div>
    <div className="cx-window-body">
      <div className="cx-gauges">{[["eq", "Equifax", 608, "+9", 62], ["ex", "Experian", 615, "+14", 66], ["tu", "TransUnion", 612, "+12", 64]].map(([k, name, score, delta, pct]) => <div key={k as string} className={`cx-gauge ${k}`}><div className="cx-gauge-ring" style={{ background: `conic-gradient(var(--g) 0 ${pct}%, #e6ece8 ${pct}% 100%)` }}><div><strong>{score}</strong><small>{delta}</small></div></div><span><i />{name}</span></div>)}</div>
      <div className="cx-progress"><div><span>Plan progress</span><span>2 of 7</span></div><div className="track"><i /></div><small>next: get your card under 30% of its limit</small></div>
    </div>
    <div className="cx-window-foot"><span>FICO® — not the version lenders pull. A guide, not a preapproval.</span><a className="cx-inline" href="demo/?mode=consumer&cpage=result">Open the portal →</a></div>
  </div>;
}

export function LinkWindow() {
  const [copied, setCopied] = useState(false);
  return <div className="cx-window site-win">
    <div className="cx-chrome"><span><i />ready.summithomeloans.com/jlee</span><span>Live</span></div>
    <div className="cx-window-body lx-body">
      <img src="qr/summit-jlee.svg" alt="QR code" width={148} height={148} className="lx-qr" />
      <div>
        <div className="invite-link-row lx-link"><span>YOUR LINK</span><div><code>https://ready.summithomeloans.com/jlee</code><button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }}>{copied ? "✓ Copied" : "Copy"}</button></div></div>
        <div className="lx-share"><span>💬 Text</span><span>✉ Email</span><span>⎙ Print QR</span></div>
        <p className="lx-note">One tap on their phone. Attributed to Jordan, branch and source included.</p>
      </div>
    </div>
    <div className="cx-window-foot"><span>Every scan and tap lands on Summit's branded front door.</span><a className="cx-inline" href="demo/?mode=lender&lpage=link">Open the LO portal →</a></div>
  </div>;
}

const ITEMS = [
  { creditor: "Midland Credit Management", type: "Collection · $684", status: "Needs review", tone: "review", eq: false, ex: true, tu: true },
  { creditor: "Comenity / Store Card", type: "Late payment · $0", status: "Flagged", tone: "flag", eq: true, ex: false, tu: false },
  { creditor: "Capital One", type: "Revolving · $412", status: "Reviewed", tone: "done", eq: true, ex: true, tu: true },
];
export function BoardWindow() {
  const [sel, setSel] = useState(0);
  return <div className="site-win board-win">
    <div className="dh-panel" style={{ margin: 0, boxShadow: "none" }}>
      <div className="dh-panel-head"><h3>Your negative items, by bureau</h3><span className="dh-count">3 ITEMS · 2 TO REVIEW</span></div>
      <div className="dh-board">{([["eq", "Equifax"], ["ex", "Experian"], ["tu", "TransUnion"]] as const).map(([key, name]) => { const rows = ITEMS.map((it, i) => ({ it, i })).filter(({ it }) => (it as any)[key]); return <div key={key} className={`dh-col ${key}`}><div className="dh-col-head"><i />{name}<b>{rows.length}</b></div>{rows.map(({ it, i }) => <button key={it.creditor} className={`dh-item ${sel === i ? "sel" : ""} ${it.tone}`} onClick={() => setSel(i)}><span className="dh-nm">{it.creditor}</span><span className="dh-meta">{it.type}</span><span className={`dh-tag ${it.tone}`}>{it.status}</span></button>)}</div>; })}</div>
    </div>
    <div className="board-ask"><strong>Is this information right?</strong><span>{ITEMS[sel].creditor}</span><div><a className="primary-dark" href="demo/?mode=consumer&cpage=disputes">No — dispute it →</a><span className="outline-button">Yes, it’s correct</span></div></div>
  </div>;
}

const FEED: [string, string, string, string, string, BureauScoreSet][] = [
  ["AP", "Aaron Patel", "Ready Now", "Review requested", "gold", { equifax: 688, experian: 696, transunion: 691 }],
  ["DY", "Derek Young", "Near Ready", "Threshold reached", "lime", { equifax: 654, experian: 662, transunion: 658 }],
  ["MC", "Maya Collins", "Build Mode", "Round 2 of ~5", "mint", { equifax: 608, experian: 615, transunion: 612 }],
  ["SR", "Sofia Ramirez", "Dispute Mode", "Disputes sent", "violet", { equifax: 579, experian: 587, transunion: 584 }],
];
export function FeedWindow() {
  return <div className="cx-window site-win">
    <div className="cx-chrome"><span><i />Readiness pipeline · 3 bureau scores</span><span>Jordan Lee</span></div>
    <div className="lx-attn site-score-feed" style={{ padding: "12px 12px 6px" }}>{FEED.map(([ini, name, path, st, tone, scores]) => <button key={name}><span className={`person-avatar ${tone}`}>{ini}</span><div><strong>{name}</strong><small>{path} · {st}</small><BureauScores scores={scores} compact showNotice={false} /></div><b>{st === "Review requested" ? "Review →" : "Open"}</b></button>)}</div>
    <div className="cx-window-foot"><span>MyScoreIQ FICO® scores · May differ from mortgage scores · Never the full report.</span><a className="cx-inline" href="demo/?mode=lender&lpage=borrowers">Open the pipeline →</a></div>
  </div>;
}

const EVENTS = [["10:44:02", "readiness.trigger", "Total Expert"], ["10:42:18", "review.requested", "Total Expert"], ["10:40:31", "protect_mode.activated", "Encompass"], ["10:38:05", "progress.milestone_reached", "Shape"]];
export function EventsWindow() {
  return <div className="cx-window site-win dark-win">
    <div className="cx-chrome"><span><i />Live event stream</span><span>Listening</span></div>
    <div className="ev-list">{EVENTS.map(([t, e, d]) => <div key={e}><span>{t}</span><code>{e}</code><b>→ {d}</b><i>✓</i></div>)}</div>
    <div className="cx-window-foot"><span>One status object. Never a report.</span><a className="cx-inline" href="integrations/">See the contract →</a></div>
  </div>;
}

export function PassportWindow({ ready = false }: { ready?: boolean }) { return <div className="site-win"><PassportCard ready={ready} compact /></div>; }

export function DoorWindow() {
  return <div className="cx-window site-win">
    <div className="cx-chrome"><span><i />ready.summithomeloans.com/dkim</span><span>Referred by Dana</span></div>
    <div className="door-win"><div className="door-win-lo"><span className="lo-avatar">DK</span><div><small>REFERRED BY</small><strong>Dana Kim · Desert Realty</strong><span>Your loan officer will be Jordan Lee, Summit Home Loans</span></div></div><h4>Hi there — let’s build your next step together.</h4><div className="door-win-steps"><span>1 Permission</span><i>→</i><span>2 Readiness check</span><i>→</i><span>3 Your plan</span></div><span className="primary-lime dark-text">Check my readiness →</span></div>
    <div className="cx-window-foot"><span>Dana sees status only — never a score or a report.</span><a className="cx-inline" href="demo/?c=summit-dkim">Open this door →</a></div>
  </div>;
}

export function AskWindow() {
  return <div className="cx-window site-win">
    <div className="cx-chrome"><span><i />Ask ReadyIQ</span><span>guidance, not a promise</span></div>
    <div className="ask-win"><div className="me">Do I have to pay the Midland collection before I apply?</div><div className="bot">Guideline, not a promise: FHA excludes medical collections and lets non-medical collections under $2,000 in aggregate ride; above that, a payment plan or 5% of the balance counts in your DTI. That’s why Midland is sequenced first — and why paying it may not raise the FICO® you see here. Jordan confirms what Summit requires.</div><div className="me">Can my parents gift the down payment?</div><div className="bot">Yes on FHA and conventional, with a gift letter and a paper trail. Separately, you may qualify for 3 Arizona assistance programs — a match, not an award.</div></div>
    <div className="cx-window-foot"><span>Knows FHA / Fannie / Freddie guidelines. Never predicts approvals.</span><a className="cx-inline" href="demo/?mode=consumer&cpage=plan">Try it →</a></div>
  </div>;
}

export function ProtectWindow() {
  return <div className="cx-window site-win">
    <div className="cx-chrome"><span><i />Protect Mode · on</span><span>loan in process</span></div>
    <div className="pm-win">{[["Answer any letter-of-explanation request within 24 hours", "Underwriters ask; the file waits until you answer."], ["Keep balances where they are", "No new credit, no new debt, no big payoffs without a call."], ["Before you wire closing funds, call the title company", "At a number you already have — never one from an email."]].map(([t, d], i) => <div key={t}><i>0{i + 1}</i><div><strong>{t}</strong><small>{d}</small></div></div>)}</div>
    <div className="cx-window-foot"><span>Disputes paused · report watched daily · Jordan alerted as status.</span><a className="cx-inline" href="demo/?mode=consumer&cpage=guardian">See Protect Mode →</a></div>
  </div>;
}

export function BuildWindow() {
  const bars = [34, 40, 48, 60, 72, 86];
  return <div className="cx-window site-win">
    <div className="cx-chrome"><span><i />Rent history found · CreditBuilderIQ</span><span>Scottsdale Palms</span></div>
    <div className="build-win"><div className="build-bars">{bars.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div><div className="build-nums"><strong>24 / 24</strong><small>on-time rent months detected · $1,840 / mo</small></div><div className="build-rows"><span>✓ Rent reporting — likely eligible</span><span>✓ Electric + mobile — 2 matches</span><span>✓ Reported to all three bureaus</span></div></div>
    <div className="cx-window-foot"><span>Fannie Mae’s DU counts 12 months of on-time rent ≥ $300 — with consent.</span><a className="cx-inline" href="demo/?mode=consumer&cpage=reporting">Verify rent →</a></div>
  </div>;
}

export function TriWindow() {
  return <div className="cx-window site-win">
    <div className="cx-chrome"><span><i />Soft tri-merge · Xactus</span><span>no hard inquiry</span></div>
    <div className="tri-result" style={{ padding: "16px 18px 6px" }}><div className="tri-scores"><div><small>EXPERIAN · FICO® 2</small><strong>618</strong></div><div className="mid"><small>TRANSUNION · FICO® 4</small><strong>611</strong><b>middle score</b></div><div><small>EQUIFAX · FICO® 5</small><strong>604</strong></div></div><div className="tri-floors"><span>Summit FHA floor 600 · <b className="ok">met ✓</b></span><span>Conventional 620 · <b>9 to go</b></span></div></div>
    <div className="cx-window-foot"><span>Jordan’s packet reads “FHA floor met (soft)”. Never the numbers unless Maya shares.</span><a className="cx-inline" href="demo/?mode=consumer&cpage=result">See the review packet →</a></div>
  </div>;
}
