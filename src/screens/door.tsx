// src/screens/door.tsx — the front door and enrollment as ONE scrolling page: invitation hero on top, then three cards
// (About you · Permission · Secure check) with a sticky rail. Nothing is pulled until the last card says so.
import { useEffect, useRef, useState } from "react";
import { ConsentBlock, REGB } from "./consumer";

export function EnrollSections({ onComplete, autoScroll }: { onComplete: () => void; autoScroll?: boolean }) {
  const [first, setFirst] = useState("Maya"); const [email, setEmail] = useState("maya.collins@example.com");
  const [accepted, setAccepted] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { if (autoScroll) { const id = setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); return () => clearTimeout(id); } }, [autoScroll]);
  const done1 = first.trim().length > 0 && email.includes("@");
  return <section className="door-flow" id="start" ref={ref}>
    <div className="door-head"><span className="section-kicker">THREE SHORT CARDS · ABOUT FIVE MINUTES · NO EFFECT ON YOUR SCORE</span><h2>Start your <em>readiness check.</em></h2><p>Fill in the three cards below. Nothing is pulled until you say so on the last one — and Summit sees status, never your report.</p></div>
    <div className="door-grid">
      <aside className="door-rail">
        <div className={done1 ? "done" : "active"}><span>{done1 ? "✓" : "1"}</span><div><strong>About you</strong><small>Name, contact, timeline</small></div></div>
        <div className={accepted ? "done" : done1 ? "active" : ""}><span>{accepted ? "✓" : "2"}</span><div><strong>Permission</strong><small>Three consents, in plain words</small></div></div>
        <div className={accepted ? "active" : ""}><span>3</span><div><strong>Secure check</strong><small>Identity · soft pull only</small></div></div>
        <p className="door-rail-note">{REGB}</p>
      </aside>
      <div className="door-cards">
        <article className="form-panel door-card" id="s1">
          <span className="step-tag">STEP 1 OF 3</span><h2>Let’s personalize your <em>path.</em></h2><p>About five minutes, start to finish. It will not affect your credit score.</p>
          <div className="form-grid"><label>First name<input value={first} onChange={(e) => setFirst(e.target.value)} /></label><label>Last name<input defaultValue="Collins" /></label><label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Mobile number<input defaultValue="(480) 555-0147" /></label></div>
          <label className="full-field">What best describes you?<select defaultValue="planning"><option value="planning">I’m planning to buy in 3–6 months</option><option>I’m ready to buy now</option><option>I’m exploring my options</option></select></label>
        </article>
        <article className="form-panel permission-panel door-card" id="s2">
          <span className="step-tag">STEP 2 OF 3</span><h2>You stay in <em>control.</em></h2><p>ReadyIQ needs your permission to securely access consumer credit information and build your readiness plan.</p>
          <div className="permission-list"><div><i>✓</i><p><strong>This is a soft credit check</strong><span>Checking your readiness will not lower your score.</span></p></div><div><i>⌁</i><p><strong>Your information stays protected</strong><span>Summit receives permitted milestones — not unrestricted report access.</span></p></div><div><i>≠</i><p><strong>This is not a mortgage preapproval</strong><span>Your lender uses a separate mortgage report when you request review.</span></p></div></div>
          <ConsentBlock onChange={setAccepted} />
        </article>
        <article className={`form-panel identity-panel door-card ${accepted ? "" : "locked"}`} id="s3">
          <span className="step-tag">STEP 3 OF 3</span><h2>Confirm your <em>identity.</em></h2><p>Encrypted and used only to complete your authorized soft check.</p>
          <label className="full-field">Home address<input defaultValue="7041 E. Palo Verde Drive" /></label>
          <div className="form-grid three"><label>City<input defaultValue="Scottsdale" /></label><label>State<select defaultValue="AZ"><option>AZ</option></select></label><label>ZIP<input defaultValue="85250" /></label></div>
          <div className="form-grid"><label>Date of birth<input defaultValue="08 / 14 / 1989" /></label><label>Social Security number<input type="password" defaultValue="123456789" /></label></div>
          <div className="encryption-note"><span>⌁</span><p><strong>Bank-level encryption</strong><small>Your full SSN is never shared with Summit Home Loans.</small></p></div>
          <button disabled={!accepted} className="primary-lime wide dark-text" onClick={onComplete}>Complete my readiness check <span>→</span></button>
          {!accepted && <small className="door-lock-note">Accept the three permissions in step 2 to unlock this.</small>}
        </article>
      </div>
    </div>
  </section>;
}
