// src/screens/overview.tsx — "Today": the one screen a borrower opens. Their stage, the single
// action that matters right now, the ordered path behind it, and their loan officer. Everything
// else lives one tab away — the toolkit grid that used to sit here just repeated the nav.
import { useLang } from "./lang";
import { BureauScores, MAYA_BUREAU_SCORES } from "./bureaus";

type Page = "welcome" | "consent" | "result" | "plan" | "disputes" | "reporting" | "progress" | "guardian" | "passport";

export function Overview({ setPage, openReview }: { setPage: (p: Page) => void; openReview: () => void }) {
  const { es } = useLang();
  // One denominator everywhere: the plan has 7 steps and Maya has done 2. The old header said
  // "step 2 of ~5" while the bar underneath said "2 of 7" — two totals for the same journey.
  const steps: { state: string; title: string; detail: string; link: string; click: () => void }[] = [
    { state: "now", title: es ? "Baja el saldo de tu tarjeta" : "Lower your card balance", detail: es ? "Summit Visa: 64% del límite → menos del 30%" : "Summit Visa: 64% of its limit → under 30%", link: es ? "Ver la meta →" : "See the target →", click: () => setPage("plan") },
    { state: "next", title: es ? "Corrige 2 posibles errores" : "Fix 2 possible mistakes", detail: es ? "Midland · Comenity · 1 carta lista" : "Midland · Comenity · 1 letter ready", link: es ? "Buscar errores →" : "Check for mistakes →", click: () => setPage("disputes") },
    { state: "then", title: es ? "Agrega tu historial de renta" : "Add your rent history", detail: es ? "24 meses puntuales encontrados" : "24 on-time months found", link: es ? "Agregar renta →" : "Add rent →", click: () => setPage("reporting") },
    { state: "review", title: es ? "Habla con Jordan otra vez" : "Talk with Jordan again", detail: es ? "Tú decides cuándo pedirlo" : "You decide when to ask", link: es ? "Cómo funciona →" : "See how it works →", click: openReview },
  ];
  return <div className="dashboard-page result-page cx-page">
    <section className="cx-hero">
      <div className="cx-hero-bg"><span className="cx-aura lime" /><span className="cx-aura violet" /></div>
      <div className="cx-hero-copy">
        <span className="cx-pill"><i />{es ? "TU PLAN · PASO 2 DE 7" : "YOUR PLAN · STEP 2 OF 7"}</span>
        <h1>{es ? <>Buenos días, Maya. <em>Estás avanzando hacia tu próxima conversación hipotecaria.</em></> : <>Good morning, Maya. <em>You’re making progress toward your next mortgage conversation.</em></>}</h1>
        <p>{es ? "Hoy tienes una sola cosa que hacer: bajar el saldo de tu Summit Visa a menos del 30% de su límite. Con tu permiso, Jordan ve tus tres puntajes y tu progreso — nunca tus cuentas ni tu reporte completo." : "Today you have one thing to do: bring your Summit Visa balance under 30% of its limit. With your permission, Jordan sees your three scores and your progress — never your accounts or full report."}</p>
        <div className="cx-actions"><button className="lime" onClick={() => setPage("plan")}>{es ? "Ver la acción de hoy" : "See today’s action"} <span>→</span></button><button className="ghost" onClick={openReview}>{es ? "Pedir hablar con mi prestamista" : "Ask to speak with my lender"}</button></div>
        <div className="cx-trust"><span>✓ {es ? "Revisarlo no baja tu puntaje" : "Checking this does not hurt your score"}</span><span>✓ {es ? "Jordan ve los 3 puntajes y progreso" : "Jordan sees 3 scores + progress"}</span><span>✓ {es ? "Puedes solicitar cuando quieras" : "You can apply whenever you choose"}</span></div>
      </div>
      <div className="cx-window">
        <div className="cx-chrome"><span><i />{es ? "FICO® · 3 burós · MyScoreIQ" : "FICO® · 3 bureaus · MyScoreIQ"}</span><span /></div>
        <div className="cx-window-body">
          <BureauScores scores={MAYA_BUREAU_SCORES} showNotice={false} />
          <div className="cx-progress"><div><span>{es ? "Tu plan" : "Your plan"}</span><span>2 {es ? "de" : "of"} 7</span></div><div className="track"><i /></div><small>{es ? "siguiente: baja tu tarjeta a menos del 30% de su límite" : "next: get your card under 30% of its limit"}</small></div>
        </div>
        <div className="cx-window-foot"><span>{es ? "Tres puntajes FICO® de MyScoreIQ — pueden diferir de los puntajes hipotecarios. No es una preaprobación." : "Three MyScoreIQ FICO® scores — they may differ from the mortgage scores a lender pulls. Not a preapproval."}</span><button className="cx-inline" onClick={() => setPage("progress")}>{es ? "Detalles →" : "Score details →"}</button></div>
        <div className="cx-float br lime"><i>◈</i><div><small>{es ? "PRÓXIMA META" : "NEXT GOAL"}</small><strong>{es ? "Tarjeta bajo el 30%" : "Card balance under 30%"}</strong></div></div>
      </div>
    </section>

    <section className="cx-steps-wrap">
      <div className="section-title"><div><span className="section-kicker">{es ? "QUÉ SIGUE" : "WHAT TO DO NEXT"}</span><h3>{es ? <>Una cosa <em>a la vez.</em></> : <>One thing <em>at a time.</em></>}</h3></div><button className="link-button" onClick={() => setPage("plan")}>{es ? "Ver mi plan completo →" : "See my full plan →"}</button></div>
      <div className="cx-steps">
        <div className="cx-rail"><i style={{ width: "0%" }} /></div>
        {steps.map((s, i) => <Step key={s.title} n={String(i + 1).padStart(2, "0")} {...s} />)}
      </div>
    </section>

    <section className="cx-lender">
      <div className="cx-lender-left"><span className="lo-avatar large">JL</span><div><small>{es ? "TU OFICIAL DE PRÉSTAMOS" : "YOUR LOAN OFFICER"}</small><h4>{es ? "Jordan Lee sigue contigo." : "Jordan Lee is still with you."}</h4><p>{es ? "Tu progreso sigue conectado con tu equipo original de Summit Home Loans — como estatus, nunca tu reporte." : "Your progress stays connected to your original Summit Home Loans team — as status, never your report."}</p></div></div>
      <div className="cx-lender-actions"><button className="outline-button" onClick={() => alert(es ? "Mensaje para Jordan Lee." : "Message drafted to Jordan Lee.")}>{es ? "Escribir a Jordan" : "Message Jordan"}</button><button className="primary-dark" onClick={openReview}>{es ? "Pedir revisión" : "Request review"}</button></div>
    </section>
  </div>;
}

function Step({ n, state, title, detail, link, click }: { n: string; state: string; title: string; detail: string; link: string; click: () => void }) {
  const { es } = useLang();
  const labels: Record<string, [string, string]> = { now: ["NOW", "AHORA"], next: ["NEXT", "SIGUIENTE"], then: ["THEN", "DESPUÉS"], review: ["LENDER REVIEW", "REVISIÓN"] };
  const label = (labels[state] ?? labels.review)[es ? 1 : 0];
  return <div className={`cx-step ${state}`} onClick={click}><span className="node" /><small>{n} · {label}</small><strong>{title}</strong><p>{detail}</p><b>{link}</b></div>;
}
