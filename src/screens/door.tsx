// src/screens/door.tsx — the front door and enrollment as ONE scrolling page: invitation hero on top, then three cards
// (About you · Permission · Secure check) with a sticky rail. Nothing is pulled until the last card says so.
import { useEffect, useRef, useState } from "react";
import { ConsentBlock, REGB } from "./consumer";
import { useLang } from "./lang";

export function EnrollSections({ onComplete, autoScroll }: { onComplete: () => void; autoScroll?: boolean }) {
  const [first, setFirst] = useState("Maya"); const [email, setEmail] = useState("maya.collins@example.com");
  const [accepted, setAccepted] = useState(false); const { es } = useLang();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (autoScroll) { const id = setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); return () => clearTimeout(id); } }, [autoScroll]);
  const done1 = first.trim().length > 0 && email.includes("@");
  return <section className="door-flow" id="start" ref={ref}>
    <div className="door-head"><span className="section-kicker">{es ? "TRES TARJETAS · UNOS CINCO MINUTOS · NO AFECTA TU PUNTAJE" : "THREE SHORT CARDS · ABOUT FIVE MINUTES · NO EFFECT ON YOUR SCORE"}</span><h2>{es ? <>Empieza tu <em>revisión.</em></> : <>Start your <em>readiness check.</em></>}</h2><p>{es ? "Llena las tres tarjetas. No se consulta nada hasta que tú lo digas en la última. Con tu permiso, Summit ve juntos tus puntajes de Equifax, Experian y TransUnion y tu progreso—nunca tus cuentas ni tu reporte completo." : "Fill in the three cards below. Nothing is pulled until you say so on the last one. With your permission, Summit sees your Equifax, Experian and TransUnion scores together with your progress—never your accounts or full report."}</p></div>
    <div className="door-grid">
      <aside className="door-rail">
        <div className={done1 ? "done" : "active"}><span>{done1 ? "✓" : "1"}</span><div><strong>{es ? "Sobre ti" : "About you"}</strong><small>{es ? "Nombre, contacto, plazo" : "Name, contact, timeline"}</small></div></div>
        <div className={accepted ? "done" : done1 ? "active" : ""}><span>{accepted ? "✓" : "2"}</span><div><strong>{es ? "Permiso" : "Permission"}</strong><small>{es ? "Tres consentimientos, en palabras claras" : "Three consents, in plain words"}</small></div></div>
        <div className={accepted ? "active" : ""}><span>3</span><div><strong>{es ? "Revisión segura" : "Secure check"}</strong><small>{es ? "Identidad · consulta suave" : "Identity · soft pull only"}</small></div></div>
        <p className="door-rail-note">{es ? "Puedes solicitar una hipoteca cuando quieras — esto no es obligatorio." : REGB}</p>
      </aside>
      <div className="door-cards">
        <article className="form-panel door-card" id="s1">
          <span className="step-tag">{es ? "PASO 1 DE 3" : "STEP 1 OF 3"}</span><h2>{es ? <>Personalicemos tu <em>camino.</em></> : <>Let’s personalize your <em>path.</em></>}</h2><p>{es ? "Unos cinco minutos. No afecta tu puntaje de crédito." : "About five minutes, start to finish. It will not affect your credit score."}</p>
          <div className="form-grid"><label>{es ? "Nombre" : "First name"}<input value={first} onChange={(e) => setFirst(e.target.value)} /></label><label>{es ? "Apellido" : "Last name"}<input defaultValue="Collins" /></label><label>{es ? "Correo" : "Email"}<input value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>{es ? "Celular" : "Mobile number"}<input defaultValue="(480) 555-0147" /></label></div>
          <label className="full-field">{es ? "¿Qué te describe mejor?" : "What best describes you?"}<select defaultValue="planning"><option value="planning">{es ? "Planeo comprar en 3–6 meses" : "I’m planning to buy in 3–6 months"}</option><option>{es ? "Estoy listo para comprar ahora" : "I’m ready to buy now"}</option><option>{es ? "Estoy explorando opciones" : "I’m exploring my options"}</option></select></label>
        </article>
        <article className="form-panel permission-panel door-card" id="s2">
          <span className="step-tag">{es ? "PASO 2 DE 3" : "STEP 2 OF 3"}</span><h2>{es ? <>Tú tienes el <em>control.</em></> : <>You stay in <em>control.</em></>}</h2><p>{es ? "ReadyIQ necesita tu permiso para acceder de forma segura a tu información de crédito y construir tu plan." : "ReadyIQ needs your permission to securely access consumer credit information and build your readiness plan."}</p>
          <div className="permission-list"><div><i>✓</i><p><strong>{es ? "Es una consulta suave" : "This is a soft credit check"}</strong><span>{es ? "Revisar tu preparación no baja tu puntaje." : "Checking your readiness will not lower your score."}</span></p></div><div><i>⌁</i><p><strong>{es ? "Tú eliges qué compartir" : "You choose what to share"}</strong><span>{es ? "Summit ve tus tres puntajes y progreso autorizados—no tus cuentas ni tu reporte completo." : "Summit sees your authorized three-score summary and progress—not your accounts or full report."}</span></p></div><div><i>≠</i><p><strong>{es ? "No es una preaprobación" : "This is not a mortgage preapproval"}</strong><span>{es ? "Estos puntajes del consumidor pueden ser diferentes de los puntajes hipotecarios que usa tu prestamista." : "These consumer scores may differ from the mortgage scores your lender uses."}</span></p></div></div>
          <ConsentBlock onChange={setAccepted} />
        </article>
        <article className={`form-panel identity-panel door-card ${accepted ? "" : "locked"}`} id="s3">
          <span className="step-tag">{es ? "PASO 3 DE 3" : "STEP 3 OF 3"}</span><h2>{es ? <>Confirma tu <em>identidad.</em></> : <>Confirm your <em>identity.</em></>}</h2><p>{es ? "Cifrado y usado solo para completar tu consulta suave autorizada." : "Encrypted and used only to complete your authorized soft check."}</p>
          <label className="full-field">{es ? "Dirección" : "Home address"}<input defaultValue="7041 E. Palo Verde Drive" /></label>
          <div className="form-grid three"><label>{es ? "Ciudad" : "City"}<input defaultValue="Scottsdale" /></label><label>{es ? "Estado" : "State"}<select defaultValue="AZ"><option>AZ</option></select></label><label>{es ? "Código postal" : "ZIP"}<input defaultValue="85250" /></label></div>
          <div className="form-grid"><label>{es ? "Fecha de nacimiento" : "Date of birth"}<input defaultValue="08 / 14 / 1989" /></label><label>{es ? "Número de Seguro Social" : "Social Security number"}<input type="password" defaultValue="123456789" /></label></div>
          <div className="encryption-note"><span>⌁</span><p><strong>{es ? "Cifrado de nivel bancario" : "Bank-level encryption"}</strong><small>{es ? "Tu SSN completo nunca se comparte con Summit Home Loans." : "Your full SSN is never shared with Summit Home Loans."}</small></p></div>
          <button disabled={!accepted} className="primary-lime wide dark-text" onClick={onComplete}>{es ? "Completar mi revisión" : "Complete my readiness check"} <span>→</span></button>
          {!accepted && <small className="door-lock-note">{es ? "Acepta los tres permisos del paso 2 para desbloquear esto." : "Accept the three permissions in step 2 to unlock this."}</small>}
        </article>
      </div>
    </div>
  </section>;
}
