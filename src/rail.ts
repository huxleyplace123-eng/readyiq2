// src/rail.ts — the browser's one door to the referral rail (server/http.js).
//
// The tour runs as a static site, so the rail is optional: when a rail URL is known the
// send flows and the precision number are live; when it is not, the screens fall back to
// their fixtures and say so. Set it with ?rail=https://host (remembered), or
// window.__READYIQ_RAIL__, or the per-host default below once the rail is deployed.

export type Party = { kind: "lo" | "credit_repair"; id: string };
export type Consent = { granted_at: string; scope?: string; text_version?: string };
export type Referral = { id: string; direction: "lo_to_cr" | "cr_to_lo"; to: Party[]; summary: { stage: string; disputes: { open: number; resolved: number; withdrawn?: number } }; created_at: string };

const q = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
const HOST_DEFAULTS: Record<string, string> = {
  // filled in when the rail is deployed; localhost tours talk to `npm run rail`
  "localhost": "http://localhost:4630",
  "127.0.0.1": "http://localhost:4630",
};
function remember(url: string | null) { try { if (url) localStorage.setItem("readyiq:rail", url); } catch { /* private mode */ } }
function recall(): string | null { try { return localStorage.getItem("readyiq:rail"); } catch { return null; } }

const fromQuery = q.get("rail");
if (fromQuery) remember(fromQuery);
export const RAIL_URL: string | null = (fromQuery || (globalThis as any).__READYIQ_RAIL__ || recall() || (typeof location !== "undefined" ? HOST_DEFAULTS[location.hostname] : null) || null)?.replace(/\/$/, "") ?? null;
export const TENANT: string = q.get("tenant") || "harbor";
export const railLive = () => !!RAIL_URL;

type Result<T> = { ok: true; live: true; data: T } | { ok: false; live: boolean; error: string; status?: number };

async function call<T>(path: string, init?: RequestInit): Promise<Result<T>> {
  if (!RAIL_URL) return { ok: false, live: false, error: "no_rail" };
  try {
    const sep = path.includes("?") ? "&" : "?";
    const r = await fetch(`${RAIL_URL}${path}${sep}tenant=${encodeURIComponent(TENANT)}`, { ...init, headers: { "content-type": "application/json", ...(init?.headers || {}) } });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, live: true, error: body.error || `http_${r.status}`, status: r.status };
    return { ok: true, live: true, data: body as T };
  } catch (e) {
    return { ok: false, live: true, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Both directions. The rail derives the summary itself — the browser never sends one. */
export function sendReferral(args: { direction: "lo_to_cr" | "cr_to_lo"; from: Party; to: Party[]; consumerId: string; consent: Consent }) {
  return call<Referral>("/v1/referrals", { method: "POST", body: JSON.stringify(args) });
}
export function recordOutcome(referralId: string, outcome: "qualified" | "short" | "declined_review") {
  return call<Referral & { outcome: { outcome: string; at: string } }>(`/v1/referrals/${encodeURIComponent(referralId)}/outcome`, { method: "POST", body: JSON.stringify({ outcome }) });
}
export function precision() {
  return call<{ flagged: number; qualified: number; short: number; rate: number | null }>("/v1/precision");
}
export function listReferrals() { return call<Referral[]>("/v1/referrals"); }
export const consentNow = (): Consent => ({ granted_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), scope: "share_readiness_summary", text_version: "v1" });
