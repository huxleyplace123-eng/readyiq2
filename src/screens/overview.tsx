// src/screens/overview.tsx — the consumer Overview, rebuilt with the marketing site's devices: dark hero with grid + auras,
// a white "score window" with glass floats, the dark path frame (paper → mint → lime → dark), big toolkit tiles, lender band.
import type { ReactNode } from "react";
import { useLang } from "./lang";

type Page = "welcome" | "consent" | "result" | "plan" | "disputes" | "reporting" | "progress" | "guardian" | "passport";

export function Overview({ setPage, openReview }: { setPage: (p: Page) => void; openReview: () => void }) {
  const { es } = useLang();
  return <div className="dashboard-page result-page cx-page">
    <section className="cx-hero">
      <div className="cx-hero-bg"><span className="cx-aura lime" /><span className="cx-aura violet" /></div>
      <div className="cx-hero-copy">
        <span className="cx-pill"><i />{es ? "MODO CONSTRUIR · RONDA 2 DE ~5" : "BUILD MODE · ROUND 2 OF ~5"}</span>
        <h1>{es ? <>Buenos días, Maya. <em>Estás construyendo tu preparación hipotecaria.</em></> : <>Good morning, Maya. <em>You’re building toward mortgage readiness.</em></>}</h1>
        <p>{es ? "Tu puntaje es solo una parte. Hoy hay exactamente una acción — bajar la Summit Visa a menos del 30% — y cada paso queda conectado con Jordan como estatus, nunca como tu reporte." : "Your score is one part of the picture. Today there is exactly one next action — bring the Summit Visa under 30% — and every step you take stays connected to Jordan as status, never as your report."}</p>
        <div className="cx-actions"><button className="lime" onClick={() => setPage("plan")}>{es ? "Hacer la acción de hoy" : "Do today’s next action"} <span>→</span></button><button className="ghost" onClick={openReview}>{es ? "Pedir revisión del prestamista" : "Request lender review"}</button></div>
        <div className="cx-trust"><span>✓ {es ? "Solo consulta suave" : "Soft pull only"}</span><span>✓ {es ? "Jordan ve tu estatus, nunca tu reporte" : "Jordan sees status, never your report"}</span><span>✓ {es ? "Puedes solicitar cuando quieras — no es obligatorio" : "You can apply at any time — this is not required"}</span></div>
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
        <div className="cx-window-foot"><span>FICO® Score — not the version lenders pull. A guide, not a preapproval.</span><span><button className="cx-inline" onClick={() => setPage("progress")}>{es ? "Detalles →" : "Score details →"}</button> · <button className="cx-inline" onClick={() => setPage("passport")}>{es ? "Pasaporte →" : "Passport →"}</button></span></div>
                <div className="cx-float br lime"><i>◈</i><div><small>NEXT MILESTONE</small><strong>Utilization under 30%</strong></div></div>
      </div>
    </section>

    <section className="cx-steps-wrap">
      <div className="section-title"><div><span className="section-kicker">YOUR NEXT BEST MOVES</span><h3>Three actions. <em>One clear path.</em></h3></div><button className="link-button" onClick={() => setPage("plan")}>View complete plan →</button></div>
      <div className="cx-steps">
        <div className="cx-rail"><i style={{ width: "0%" }} /></div>
        <Step n="01" state="now" title="Lower utilization" detail="Summit Visa 64% → under 30%" link="Do it →" click={() => setPage("plan")} />
        <Step n="02" state="next" title="Review 2 flagged items" detail="Midland · Comenity · 1 draft ready" link="Open Dispute Hub →" click={() => setPage("disputes")} />
        <Step n="03" state="then" title="Add rent history" detail="24 on-time months found" link="Verify rent →" click={() => setPage("reporting")} />
        <Step n="04" state="review" title="Return to Jordan" detail="Unlocks at ~640 · you decide" link="How it works →" click={openReview} />
      </div>
    </section>

    <section className="cx-tools">
      <div className="section-title"><div><span className="section-kicker">YOUR TOOLKIT</span><h3>Everything you can do <em>from here.</em></h3></div><span className="toolkit-powered">MyScoreIQ + CreditBuilderIQ</span></div>
      <div className="cx-bento">
        <button className="feat" onClick={() => setPage("disputes")}>
          <div className="feat-top"><i>◇</i><span className="feat-count"><strong>2</strong><small>flagged</small></span></div>
          <strong className="feat-title">Dispute Hub</strong>
          <ul><li><span>Midland Credit Management</span><em>needs review</em></li><li><span>Comenity / Store Card</span><em>letter drafted</em></li></ul>
          <b>Open →</b>
        </button>
        <Tile icon="B" title="Build & report" metric="3 eligible matches" click={() => setPage("reporting")} />
        <Tile icon="✓" title="My gameplan" metric="2 of 7 complete" click={() => setPage("plan")} />
        <Tile icon="↗" title="Score center" metric="+28 since May" click={() => setPage("progress")} />
        <Tile icon="⛨" title="Protect Mode" metric="On when your loan starts" click={() => setPage("guardian")} />
      </div>
    </section>

    <section className="cx-lender">
      <div className="cx-lender-left"><span className="lo-avatar large">JL</span><div><small>YOUR LENDER CONNECTION</small><h4>Jordan Lee is still with you.</h4><p>Your progress stays connected to your original Summit Home Loans team — as status, never your report.</p></div></div>
      <div className="cx-lender-actions"><button className="outline-button" onClick={() => setPage("guardian")}>Message Jordan</button><button className="primary-dark" onClick={openReview}>Request review</button></div>
    </section>
  </div>;
}

function Step({ n, state, title, detail, link, click }: { n: string; state: string; title: string; detail: string; link: string; click: () => void }) {
  const label = state === "now" ? "NOW" : state === "next" ? "NEXT" : state === "then" ? "THEN" : "LENDER REVIEW";
  return <div className={`cx-step ${state}`} onClick={click}><span className="node" /><small>{n} · {label}</small><strong>{title}</strong><p>{detail}</p><b>{link}</b></div>;
}

function Tile({ icon, title, metric, click }: { icon: ReactNode; title: string; metric: string; click: () => void }) {
  return <button onClick={click}><i>{icon}</i><span><strong>{title}</strong><small>{metric}</small></span><b>→</b></button>;
}
