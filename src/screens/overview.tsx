// src/screens/overview.tsx — the consumer Overview, rebuilt with the marketing site's devices: dark hero with grid + auras,
// a white "score window" with glass floats, the dark path frame (paper → mint → lime → dark), big toolkit tiles, lender band.
import type { ReactNode } from "react";

type Page = "welcome" | "consent" | "result" | "plan" | "disputes" | "reporting" | "progress" | "guardian";

export function Overview({ setPage, openReview }: { setPage: (p: Page) => void; openReview: () => void }) {
  return <div className="dashboard-page result-page cx-page">
    <section className="cx-hero">
      <div className="cx-hero-bg"><span className="cx-aura lime" /><span className="cx-aura violet" /></div>
      <div className="cx-hero-copy">
        <span className="cx-pill"><i />BUILD MODE · ROUND 2 OF ~5</span>
        <h1>Good morning, Maya. <em>You’re building toward mortgage readiness.</em></h1>
        <p>Your score is one part of the picture. Today there is exactly one next action — bring the Summit Visa under 30% — and every step you take stays connected to Jordan as status, never as your report.</p>
        <div className="cx-actions"><button className="lime" onClick={() => setPage("plan")}>Do today’s next action <span>→</span></button><button className="ghost" onClick={openReview}>Request lender review</button></div>
        <div className="cx-trust"><span>✓ Soft pull only</span><span>✓ Jordan sees status, never your report</span><span>✓ You can apply at any time — this is not required</span></div>
      </div>
      <div className="cx-window">
        <div className="cx-chrome"><span><i />Live · MyScoreIQ · refreshed today</span><span /></div>
        <div className="cx-window-body">
          <div className="cx-ring-col"><div className="cx-ring"><div><span>CONSUMER SCORE</span><strong>612</strong><small>FICO® · MyScoreIQ</small></div></div><span className="cx-delta">↗ +14 since last check</span></div>
          <div>
            <div className="cx-bureaus"><div><small>EXPERIAN</small><strong>615</strong></div><div><small>TRANSUNION</small><strong>612</strong></div><div><small>EQUIFAX</small><strong>608</strong></div></div>
            <div className="cx-progress"><div><span>Plan progress</span><span>2 of 7</span></div><div className="track"><i /></div><small>priority actions complete · next: utilization under 30%</small></div>
          </div>
        </div>
        <div className="cx-window-foot"><span>FICO® Score — not the version lenders pull. A guide, not a preapproval.</span><button className="cx-inline" onClick={() => setPage("progress")}>Score details →</button></div>
                <div className="cx-float br lime"><i>◈</i><div><small>NEXT MILESTONE</small><strong>Utilization under 30%</strong></div></div>
      </div>
    </section>

    <section className="cx-path">
      <div className="section-title"><div><span className="section-kicker">YOUR NEXT BEST MOVES</span><h3>Three actions. <em>One clear path.</em></h3></div><button className="link-button" onClick={() => setPage("plan")}>View complete plan →</button></div>
      <div className="cx-path-grid">
        <PathCard n="01" tone="paper" icon="≡" kick="HIGH IMPACT" title="Lower utilization" body="Bring two card balances below the recommended thresholds — the fastest lever in your file." foot="Current 64% → target 29%" note="Summit Visa · Desert Rewards" click={() => setPage("plan")} />
        <PathCard n="02" tone="mint" icon="◇" kick="DISPUTE · MORTGAGE PRIORITY" title="Review 2 flagged items" body="Verify the details, choose a reason and build the letter. Nothing is sent without you." foot="2 flagged · 1 draft" note="CreditBuilderIQ" click={() => setPage("disputes")} />
        <PathCard n="03" tone="lime" icon="+" kick="BUILD" title="Add positive history" body="CreditBuilderIQ found eligible rent and recurring payments — up to 24 months of history." foot="24 / 24 on-time rent months" note="Rent · electric · mobile" click={() => setPage("reporting")} />
        <PathCard n="04" tone="dark" icon="↗" kick="LENDER REVIEW" title="Return to Jordan" body="When program floors are met and DTI is in range, ReadyIQ asks you — never Jordan — whether to share a status packet." foot="Unlocks at ~640 · you decide" note="Status only, never the report" click={openReview} />
      </div>
    </section>

    <section className="cx-tools">
      <div className="section-title"><div><span className="section-kicker">YOUR READYIQ TOOLKIT</span><h3>Everything you can do <em>from here.</em></h3></div><span className="toolkit-powered">MyScoreIQ + CreditBuilderIQ</span></div>
      <div className="cx-tools-grid">
        <Tool icon="◇" tag="CREDITBUILDERIQ" title="Dispute Hub" status="2 flagged · 1 draft" body="Review, build letters, track bureau responses." click={() => setPage("disputes")} featured />
        <Tool icon="B" tag="CREDITBUILDERIQ" title="Build & report" status="3 eligible matches" body="Rent, utilities and non-traditional history to all three bureaus." click={() => setPage("reporting")} />
        <Tool icon="✓" tag="READYIQ" title="My gameplan" status="2 of 7 complete" body="Priority actions, DTI estimate and the eligibility clock." click={() => setPage("plan")} />
        <Tool icon="↗" tag="MYSCOREIQ" title="Score center" status="+28 since May" body="Three bureaus, why it moved, milestones." click={() => setPage("progress")} />
        <Tool icon="⛨" tag="READYIQ" title="Guardian" status="Ready when your loan is" body="Ask-before-you-act protection during the loan." click={() => setPage("guardian")} />
      </div>
    </section>

    <section className="cx-lender">
      <div className="cx-lender-left"><span className="lo-avatar large">JL</span><div><small>YOUR LENDER CONNECTION</small><h4>Jordan Lee is still with you.</h4><p>Your progress stays connected to your original Summit Home Loans team — as status, never your report.</p></div></div>
      <div className="cx-lender-actions"><button className="outline-button" onClick={() => setPage("guardian")}>Message Jordan</button><button className="primary-dark" onClick={openReview}>Request review</button></div>
    </section>
  </div>;
}

function PathCard({ n, tone, icon, kick, title, body, foot, note, click }: { n: string; tone: string; icon: string; kick: string; title: string; body: string; foot: string; note: string; click: () => void }) {
  return <article className={tone} onClick={click}><span className="num">{n}</span><span className="ico">{icon}</span><span className="kick">{kick}</span><h4>{title}</h4><p>{body}</p><div className="foot"><div><b>{foot}</b><small>{note}</small></div><span className="go">→</span></div></article>;
}

function Tool({ icon, tag, title, status, body, click, featured }: { icon: ReactNode; tag: string; title: string; status: string; body: string; click: () => void; featured?: boolean }) {
  return <button className={featured ? "featured" : ""} onClick={click}><i>{icon}</i><span className="tag">{tag}</span><strong>{title}</strong><small>{status}</small><p>{body}</p><b>Open →</b></button>;
}
