// src/screens/integrations.tsx — the status object (what actually flows to CRMs), API actions and webhook events, in the hub's dark look.
import { useState } from "react";

const STATUS = `{
  "object": "readiness_status",
  "version": 1,
  "consumer_ref": "c_8f2a…",           // your id, not ours
  "attribution": { "lo": "jlee", "branch": "scottsdale-north", "partner": null, "source": "text-link" },
  "pathway": "build",                  // ready_now | near_ready | build | thin | dispute
  "round": { "n": 2, "of": 5 },
  "next_milestone": "utilization_under_30",
  "engines": { "check": "MyScoreIQ", "build": "CreditBuilderIQ", "dispute": "CreditBuilderIQ" },
  "flags": { "review_requested": false, "protect_mode": false, "eligibility_clock": "2027-03-12" },
  "last_activity_at": "2026-08-18T17:12:00Z"
  // never: score, report, tradelines, dispute letters
}`;

const EVENTS = [
  ["consumer.enrolled", "consents recorded; attribution locked to the human whose link was used"],
  ["pathway.assigned", "ready_now · near_ready · build · thin · dispute"],
  ["progress.milestone_reached", "a plan step closed — utilization, rent months, dispute round"],
  ["readiness.trigger", "program floors met + DTI in range → the consumer is asked, not you"],
  ["review.requested", "status packet shared with the LO; hard-pull consent captured for the call"],
  ["protect_mode.activated", "loan in process — Guardian on, no new accounts, alerts to the LO as status"],
  ["consumer.paused", "consumer stopped sharing; you get a paused status, nothing else"],
];

const ACTIONS = [
  ["POST /v1/invitations", "create an invitation for a consumer (email · text) attributed to an LO or partner"],
  ["GET  /v1/links/{code}", "resolve a link → LO / partner / branch / brand for a front door"],
  ["GET  /v1/consumers/{ref}/status", "the status object above — status only, never a report"],
  ["POST /v1/webhooks", "subscribe to events; delivered signed, retried, idempotent"],
  ["POST /v1/protect-mode", "flip Protect Mode on when a loan starts (LOS milestone)"],
];

const LEVELS = [
  ["Level 1 · Link", "Paste one link or QR anywhere — website, email signature, open-house flyer. Nothing to install."],
  ["Level 2 · Status feed", "Zapier / Make / native connectors push the status object into your CRM as fields and events."],
  ["Level 3 · Embedded", "Front door + consent inside your site or POS; SSO for LOs; white-label end to end."],
];

export function StatusObjectSection() {
  const [tab, setTab] = useState<"status" | "events" | "api">("status");
  return <section className="status-object-section">
    <div className="integration-section-title"><div><span className="section-kicker light">THE CONTRACT</span><h2>One status object. Never a report.</h2></div><div className="so-tabs">{(["status", "events", "api"] as const).map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t === "status" ? "Status object" : t === "events" ? "Webhook events" : "API actions"}</button>)}</div></div>
    <div className="so-grid">
      <div className="so-code">
        {tab === "status" && <pre>{STATUS}</pre>}
        {tab === "events" && <div className="so-list">{EVENTS.map(([k, v]) => <div key={k}><code>{k}</code><span>{v}</span></div>)}</div>}
        {tab === "api" && <div className="so-list">{ACTIONS.map(([k, v]) => <div key={k}><code>{k}</code><span>{v}</span></div>)}</div>}
      </div>
      <div className="so-levels">
        <span className="section-kicker light">THREE WAYS IN</span>
        {LEVELS.map(([t, d], i) => <div key={t} className={i === 1 ? "current" : ""}><strong>{t}</strong><small>{d}</small></div>)}
        <p>Whatever the level, the CRM stays the system of record. ReadyIQ owns the consumer journey and sends status — that is the whole integration surface.</p>
      </div>
    </div>
  </section>;
}
