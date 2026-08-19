// src/screens/overview.tsx — the consumer Overview, rebuilt with the marketing site's devices: dark hero with grid + auras,
// a white "score window" with glass floats, the dark path frame (paper → mint → lime → dark), big toolkit tiles, lender band.
import type { ReactNode } from "react";
import { useLang } from "./lang";
import { BureauScores, MAYA_BUREAU_SCORES } from "./bureaus";

type Page = "welcome" | "consent" | "result" | "plan" | "disputes" | "reporting" | "progress" | "guardian" | "passport";

export function Overview({ setPage, openReview }: { setPage: (p: Page) => void; openReview: () => void }) {
  const { es } = useLang();
  return <div className="dashboard-page result-page cx-page">
    <section className="cx-hero">
      <div className="cx-hero-bg"><span className="cx-aura lime" /><span className="cx-aura violet" /></div>
      <div className="cx-hero-copy">
        <span className="cx-pill"><i />{es ? "TRABAJANDO EN TU PLAN · PASO 2 DE ~5" : "WORKING ON YOUR PLAN · STEP 2 OF ~5"}</span>
        <h1>{es ? <>Buenos días, Maya. <em>Estás avanzando hacia tu próxima conversación hipotecaria.</em></> : <>Good morning, Maya. <em>You’re making progress toward your next mortgage conversation.</em></>}</h1>
        <p>{es ? "Tus tres puntajes son solo una parte. Hoy tienes una acción clara: bajar el saldo de Summit Visa a menos del 30% de su límite. Con tu permiso, Jordan ve los tres puntajes y tu progreso, pero nunca tus cuentas ni tu reporte completo." : "Your three scores are only one part of the picture. Today you have one clear action: bring the Summit Visa balance below 30% of its limit. With your permission, Jordan sees all three scores and your progress—never your accounts or full report."}</p>
        <div className="cx-actions"><button className="lime" onClick={() => setPage("plan")}>{es ? "Ver la acción de hoy" : "See today’s action"} <span>→</span></button><button className="ghost" onClick={openReview}>{es ? "Pedir hablar con mi prestamista" : "Ask to speak with my lender"}</button></div>
        <div className="cx-trust"><span>✓ {es ? "Revisarlo no baja tu puntaje" : "Checking this does not hurt your score"}</span><span>✓ {es ? "Jordan ve los 3 puntajes y progreso" : "Jordan sees 3 scores + progress"}</span><span>✓ {es ? "Puedes solicitar cuando quieras" : "You can apply whenever you choose"}</span></div>
      </div>
      <div className="cx-window">
        <div className="cx-chrome"><span><i />{es ? "FICO® · 3 burós · MyScoreIQ" : "FICO® · 3 bureaus · MyScoreIQ"}</span><span /></div>
        <div className="cx-window-body">
          <BureauScores scores={MAYA_BUREAU_SCORES} showNotice={false} />
          <div className="cx-progress"><div><span>{es ? "Progreso del plan" : "Plan progress"}</span><span>2 {es ? "de" : "of"} 7</span></div><div className="track"><i /></div><small>{es ? "siguiente: utilización bajo 30%" : "next: utilization under 30%"}</small></div>
        </div>
        <div className="cx-window-foot"><span>{es ? "Tres puntajes FICO® de MyScoreIQ — pueden diferir de los puntajes hipotecarios. No es una preaprobación." : "Three MyScoreIQ FICO® scores — they may differ from the mortgage scores a lender pulls. Not a preapproval."}</span><button className="cx-inline" onClick={() => setPage("progress")}>{es ? "Detalles →" : "Score details →"}</button></div>
                <div className="cx-float br lime"><i>◈</i><div><small>NEXT GOAL</small><strong>Card balance below 30%</strong></div></div>
      </div>
    </section>

    <section className="cx-steps-wrap">
      <div className="section-title"><div><span className="section-kicker">WHAT TO DO NEXT</span><h3>Three actions. <em>One clear path.</em></h3></div><button className="link-button" onClick={() => setPage("plan")}>See my full plan →</button></div>
      <div className="cx-steps">
        <div className="cx-rail"><i style={{ width: "0%" }} /></div>
        <Step n="01" state="now" title="Lower your card balance" detail="Summit Visa: 64% of limit → below 30%" link="See the target →" click={() => setPage("plan")} />
        <Step n="02" state="next" title="Review 2 flagged items" detail="Midland · Comenity · 1 draft ready" link="Open Dispute Hub →" click={() => setPage("disputes")} />
        <Step n="03" state="then" title="Add rent history" detail="24 on-time months found" link="Verify rent →" click={() => setPage("reporting")} />
        <Step n="04" state="review" title="Talk with Jordan again" detail="You decide when to ask for a review" link="See how it works →" click={openReview} />
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
