// site/assets/js/state.js — pure, runs in Node (tests) and the browser (pages).
export const TODAY = '2026-08-18';
export const STORE_KEY = 'readyiq2:v1';
export const FIXTURE_VERSION = 4; // bump when fixture shape changes — stale localStorage resets itself
export const PATHWAYS = ['ready_now', 'near_ready', 'build', 'thin', 'dispute', 'dti'];
export const PATHWAY_LABELS = { ready_now: 'Ready Now', near_ready: 'Near Ready', build: 'Build Mode', thin: 'Thin Credit', dispute: 'Dispute Mode', dti: 'Debt Mode' };
export const PATHWAY_BLURBS = {
  ready_now: 'No obvious credit barrier — Sarah can review you now.',
  near_ready: 'A small balance move away from your lender’s floor.',
  build: 'Utilization first, then history — round by round.',
  thin: 'Not enough history yet. We build the file, starting with rent.',
  dispute: 'Something on the report looks wrong. Fix it before you apply.',
  dti: 'Debt load is the obstacle — a plan for the payments, not the score.',
};
export const STAGES = ['not_ready', 'working', 'approaching', 'ready_to_review'];
export const STAGE_LABELS = { not_ready: 'Not ready', working: 'Working', approaching: 'Approaching ready', ready_to_review: 'Ready to review' };
/** Borrower-facing: same state, different words. Never "Not ready". */
export const STAGE_STEPS = { not_ready: 'Step 1 of 4 — getting your picture', working: 'Step 2 of 4 — clearing the blockers', approaching: 'Step 3 of 4 — almost there', ready_to_review: 'Step 4 of 4 — your loan officer has your summary' };
/** Consumer FICO 8/9 and mortgage FICO 2/4/5 routinely differ by 15–30 points; the buffer is the band where ReadyIQ stops asserting and hands off to a real pull. */
export const BUFFER_DEFAULT = 20;
export const APPROACH_BAND = 15;
export const STATUS_LABELS = { invited: 'Invited', consented: 'Consented', checked: 'Checked', active: 'Active', review_requested: 'Review requested', handed_off: 'With your lender', applied: 'Application in progress', funded: 'Funded', lost: 'Closed' };

const M = (label, date, state) => ({ label, date, state });

const FIXTURES = {
  lender: {
    id: 'harbor', name: 'Harbor Home Loans', site: 'harborhomeloans.com', nmls: '1809922',
    brand: { primary: '#FF7A1A', secondary: '#FFA640', soft: '#FFEFDF', ink: '#B34700' },
    floors: { fha: 620, conventional: 640, dpa: 660 }, floorDefault: 640, buffer: 20,
    programs: [{ id: 'fha', name: 'FHA', floor: 620 }, { id: 'conventional', name: 'Conventional', floor: 640 }, { id: 'dpa', name: 'Harbor Down-Payment Assist', floor: 660 }],
  },
  los: [
    { id: 'sarah', first: 'Sarah', last: 'Miller', nmls: '1234567', states: ['CA', 'AZ', 'NV'], email: 'sarah@harborhomeloans.com', mobile: '(415) 555-0142', code: 'harbor-smiller' },
    { id: 'marcus', first: 'Marcus', last: 'Webb', nmls: '2345678', states: ['CA', 'OR'], email: 'marcus@harborhomeloans.com', mobile: '(415) 555-0177', code: 'harbor-mwebb' },
  ],
  partners: [{ id: 'dana', first: 'Dana', last: 'Kim', kind: 'agent', company: 'Bayline Realty', loId: 'sarah', code: 'harbor-dkim' }],
  links: {
    'harbor-smiller': { lender: 'harbor', lo: 'sarah', source: 'lo', partner: null, campaign: null },
    'harbor-mwebb': { lender: 'harbor', lo: 'marcus', source: 'lo', partner: null, campaign: null },
    'harbor-dkim': { lender: 'harbor', lo: 'sarah', source: 'agent', partner: 'dana', campaign: null },
    'harbor-spring': { lender: 'harbor', lo: 'sarah', source: 'campaign', partner: null, campaign: 'spring-reactivation' },
  },
  consumers: [
    { id: 'maria', first: 'Maria', last: 'Delgado', email: 'maria.d@example.com', mobile: '(510) 555-0119', loId: 'sarah',
      attribution: { lender: 'harbor', lo: 'sarah', source: 'lo', partner: null, campaign: null },
      status: 'active', pathway: 'build', round: 2, roundsEstimated: 5, guardian: false, reviewRequestedAt: null, enrolledAt: '2026-06-20',
      history: [["2026-05-20",596],["2026-06-20",604],["2026-07-14",611],["2026-08-14",625]], timeline: "3-6", score: { value: 625, prev: 611, updated: '2026-08-14', bureaus: { experian: 628, transunion: 625, equifax: 619 } },
      credit: { utilization: 0.41, prevUtilization: 0.68, tradelines: 6, latesLast24mo: 2, lastLateMonthsAgo: 14, derogLast12mo: false, inquiriesLast6mo: 1,
        monthlyDebts: [{ name: 'Capital One', payment: 45 }, { name: 'Honda Financial', payment: 389 }, { name: 'Discover', payment: 60 }], collections: [] },
      publicRecords: [], disputes: [],
      rentReporting: { linked: false, monthsAvailable: 24, backfilled: false }, income: null,
      deltas: [{ points: 14, cause: 'Utilization down — Capital One paid to $210' }, { points: 6, cause: 'Lates aging — now 14 months old' }, { points: -6, cause: 'New inquiry — Honda Financial' }],
      milestones: [M('Enrolled', '2026-06-20', 'done'), M('Round 1 complete', '2026-07-20', 'done'), M('Utilization under 50%', '2026-08-02', 'done'), M('Round 2', null, 'current'), M('Utilization under 30%', null, 'upcoming'), M('12 clean months', '2026-10-15', 'upcoming'), M('Request review', null, 'upcoming')],
      nextAction: { title: 'Pay Capital One below 30% before the 22nd', detail: 'Your statement closes on the 22nd. Paying $95 more moves the whole card under 30% — the fastest lever you have this round.', lever: 'utilization', engine: 'CreditBuilderIQ', href: '#plan' },
      alerts: [], loanFile: null },
    { id: 'jordan', first: 'Jordan', last: 'Lee', email: 'jordan.lee@example.com', mobile: '(628) 555-0133', loId: 'sarah',
      attribution: { lender: 'harbor', lo: 'sarah', source: 'agent', partner: 'dana', campaign: null },
      status: 'active', pathway: 'thin', round: 1, roundsEstimated: 4, guardian: false, reviewRequestedAt: null, enrolledAt: '2026-08-05',
      history: [], timeline: "exploring", score: { value: null, prev: null, updated: '2026-08-05', bureaus: { experian: null, transunion: null, equifax: null } },
      credit: { utilization: 0.12, prevUtilization: 0.12, tradelines: 2, latesLast24mo: 0, lastLateMonthsAgo: null, derogLast12mo: false, inquiriesLast6mo: 0,
        monthlyDebts: [{ name: 'Chime Credit Builder', payment: 0 }, { name: 'Verizon', payment: 85 }], collections: [] },
      publicRecords: [], disputes: [],
      rentReporting: { linked: true, monthsAvailable: 19, backfilled: false }, income: 5200,
      deltas: [],
      milestones: [M('Enrolled', '2026-08-05', 'done'), M('Bank linked', '2026-08-06', 'done'), M('Report 19 months of rent', null, 'current'), M('Add utilities', null, 'upcoming'), M('First score', null, 'upcoming'), M('Request review', null, 'upcoming')],
      nextAction: { title: 'Report your 19 months of rent', detail: 'We found 19 on-time rent payments in your linked bank account. Reporting them adds history to all three bureaus and builds the 12-month rent record lenders can use.', lever: 'thin-file', engine: 'CreditBuilderIQ', href: '#build' },
      alerts: [], loanFile: null },
    { id: 'denise', first: 'Denise', last: 'Alvarez', email: 'denise.a@example.com', mobile: '(925) 555-0161', loId: 'marcus',
      attribution: { lender: 'harbor', lo: 'marcus', source: 'lo', partner: null, campaign: null },
      status: 'active', pathway: 'near_ready', round: 3, roundsEstimated: 3, guardian: false, reviewRequestedAt: null, enrolledAt: '2026-05-28',
      history: [["2026-05-28",598],["2026-06-28",609],["2026-07-28",621],["2026-08-12",634]], timeline: "3-6", score: { value: 634, prev: 621, updated: '2026-08-12', bureaus: { experian: 634, transunion: 638, equifax: 629 } },
      credit: { utilization: 0.34, prevUtilization: 0.52, tradelines: 8, latesLast24mo: 0, lastLateMonthsAgo: 31, derogLast12mo: false, inquiriesLast6mo: 0,
        monthlyDebts: [{ name: 'Discover', payment: 110 }, { name: 'Toyota Financial', payment: 412 }, { name: 'Navient', payment: 180 }], collections: [] },
      publicRecords: [], disputes: [],
      rentReporting: { linked: true, monthsAvailable: 24, backfilled: true }, income: 6900,
      deltas: [{ points: 13, cause: 'Utilization down — Discover paid from 52% to 34%' }],
      milestones: [M('Enrolled', '2026-05-28', 'done'), M('Round 1 complete', '2026-06-28', 'done'), M('Round 2 complete', '2026-07-28', 'done'), M('Round 3', null, 'current'), M('Cross 640', null, 'upcoming'), M('Request review', null, 'upcoming')],
      nextAction: { title: 'Take Discover from 34% to under 30%', detail: 'You are 6 points from Harbor’s conventional floor. About $190 before the 22nd statement date is the shortest path.', lever: 'utilization', engine: 'CreditBuilderIQ', href: '#plan' },
      alerts: [], loanFile: null },
    { id: 'sam', first: 'Sam', last: 'Okafor', email: 'sam.okafor@example.com', mobile: '(510) 555-0184', loId: 'sarah',
      attribution: { lender: 'harbor', lo: 'sarah', source: 'campaign', partner: null, campaign: 'spring-reactivation' },
      status: 'active', pathway: 'dispute', round: 1, roundsEstimated: 4, guardian: false, reviewRequestedAt: null, enrolledAt: '2026-08-01',
      history: [["2026-08-01",648]], timeline: "3-6", score: { value: 648, prev: 648, updated: '2026-08-01', bureaus: { experian: 651, transunion: 648, equifax: 644 } },
      credit: { utilization: 0.22, prevUtilization: 0.22, tradelines: 7, latesLast24mo: 0, lastLateMonthsAgo: null, derogLast12mo: false, inquiriesLast6mo: 1,
        monthlyDebts: [{ name: 'Navient (reported)', payment: 412 }, { name: 'Chase Sapphire', payment: 95 }, { name: 'Ally Auto', payment: 366 }],
        collections: [{ name: 'Midland Credit Mgmt (Comenity)', amount: 612, paid: false }] },
      publicRecords: [],
      disputes: [
        { id: 'd1', item: 'Navient shows $412/mo payment — loan is in in-school deferment, actual payment $0', category: 'payment_amount', status: 'sent', sentAt: '2026-08-06', responseDue: '2026-09-08', bureaus: ['Experian','TransUnion','Equifax'], reason: 'The reported monthly payment is incorrect', dtiImpact: 412 },
        { id: 'd2', item: 'Midland collection duplicates the original Comenity account balance', category: 'duplicate', status: 'draft', sentAt: null, responseDue: null, bureaus: ['Experian','TransUnion'], reason: null, dtiImpact: null },
      ],
      rentReporting: { linked: false, monthsAvailable: 24, backfilled: false }, income: 7100,
      deltas: [],
      milestones: [M('Enrolled', '2026-08-01', 'done'), M('Disputes sent', '2026-08-06', 'current'), M('Bureau responses', null, 'upcoming'), M('Disputes resolved', null, 'upcoming'), M('Request review', null, 'upcoming')],
      nextAction: { title: 'Send the duplicate-collection dispute', detail: 'The Midland collection repeats a balance already on your Comenity account. Sending it now keeps both disputes on the same 30-day clock so they finish before your review.', lever: 'derogatories', engine: 'CreditBuilderIQ', href: '#disputes' },
      alerts: [], loanFile: null },
    { id: 'priya', first: 'Priya', last: 'Nair', email: 'priya.nair@example.com', mobile: '(650) 555-0107', loId: 'sarah',
      attribution: { lender: 'harbor', lo: 'sarah', source: 'lo', partner: null, campaign: null },
      status: 'review_requested', pathway: 'ready_now', round: 2, roundsEstimated: 2, guardian: false, reviewRequestedAt: '2026-08-17', enrolledAt: '2026-06-02',
      history: [["2026-06-02",664],["2026-07-02",681],["2026-07-30",688],["2026-08-10",702]], timeline: "now", score: { value: 702, prev: 688, updated: '2026-08-10', bureaus: { experian: 706, transunion: 702, equifax: 699 } },
      credit: { utilization: 0.18, prevUtilization: 0.29, tradelines: 9, latesLast24mo: 0, lastLateMonthsAgo: null, derogLast12mo: false, inquiriesLast6mo: 0,
        monthlyDebts: [{ name: 'Amex', payment: 120 }, { name: 'SoFi student loan', payment: 240 }], collections: [] },
      publicRecords: [], disputes: [],
      rentReporting: { linked: true, monthsAvailable: 24, backfilled: true }, income: 8400,
      deltas: [{ points: 14, cause: 'Utilization down — Amex paid from 29% to 18%' }],
      milestones: [M('Enrolled', '2026-06-02', 'done'), M('Round 1 complete', '2026-07-02', 'done'), M('Crossed 640', '2026-07-30', 'done'), M('Review requested', '2026-08-17', 'current'), M('Lender review', null, 'upcoming')],
      nextAction: { title: 'Sarah has your packet', detail: 'You requested a review on Aug 17. Sarah Miller has been notified and will reach out to schedule. Keep balances where they are until you talk.', lever: 'review', engine: 'MyScoreIQ', href: '#review' },
      alerts: [], loanFile: null },
    { id: 'tom', first: 'Tom', last: 'Reyes', email: 'tom.reyes@example.com', mobile: '(408) 555-0122', loId: 'marcus',
      attribution: { lender: 'harbor', lo: 'marcus', source: 'lo', partner: null, campaign: null },
      status: 'applied', pathway: 'ready_now', round: 3, roundsEstimated: 3, guardian: true, reviewRequestedAt: '2026-07-20', enrolledAt: '2026-04-15',
      history: [["2026-04-15",652],["2026-05-15",661],["2026-06-15",668],["2026-07-20",674],["2026-08-16",671]], timeline: "3-6", score: { value: 671, prev: 674, updated: '2026-08-16', bureaus: { experian: 671, transunion: 675, equifax: 668 } },
      credit: { utilization: 0.24, prevUtilization: 0.21, tradelines: 10, latesLast24mo: 0, lastLateMonthsAgo: null, derogLast12mo: false, inquiriesLast6mo: 1,
        monthlyDebts: [{ name: 'Chase Freedom', payment: 80 }, { name: 'Wells Fargo Auto', payment: 455 }], collections: [] },
      publicRecords: [], disputes: [],
      rentReporting: { linked: false, monthsAvailable: 24, backfilled: false }, income: 9100,
      deltas: [{ points: -3, cause: 'New hard inquiry — CarMax Auto Finance' }],
      milestones: [M('Enrolled', '2026-04-15', 'done'), M('Review requested', '2026-07-20', 'done'), M('Application started', '2026-07-28', 'done'), M('Guardian on', '2026-07-28', 'current'), M('Closing', '2026-09-24', 'upcoming')],
      nextAction: { title: 'Ask Marcus before you act on the CarMax inquiry', detail: 'A new hard inquiry appeared yesterday. If you are shopping for a car, tell Marcus first — a new loan before closing can change your approval.', lever: 'guardian', engine: 'MyScoreIQ', href: '#guardian' },
      alerts: [{ type: 'inquiry', text: 'New hard inquiry — CarMax Auto Finance', date: '2026-08-17' }, { type: 'balance', text: 'Chase Freedom balance up $640', date: '2026-08-12' }],
      loanFile: { active: true, closingDate: '2026-09-24' } },
    { id: 'aisha', first: 'Aisha', last: 'Bell', email: 'aisha.bell@example.com', mobile: '(916) 555-0148', loId: 'sarah',
      attribution: { lender: 'harbor', lo: 'sarah', source: 'lo', partner: null, campaign: null },
      status: 'active', pathway: 'build', round: 1, roundsEstimated: 6, guardian: false, reviewRequestedAt: null, enrolledAt: '2026-08-10',
      history: [["2026-08-10",588]], timeline: "3-6", score: { value: 588, prev: 588, updated: '2026-08-10', bureaus: { experian: 590, transunion: 588, equifax: 583 } },
      credit: { utilization: 0.55, prevUtilization: 0.55, tradelines: 4, latesLast24mo: 0, lastLateMonthsAgo: 19, derogLast12mo: false, inquiriesLast6mo: 0,
        monthlyDebts: [{ name: 'Capital One Secured', payment: 25 }, { name: 'Self Credit Builder', payment: 48 }], collections: [] },
      publicRecords: [{ type: 'chapter7', date: '2025-03-12' }], disputes: [],
      rentReporting: { linked: false, monthsAvailable: 24, backfilled: false }, income: 4800,
      deltas: [],
      milestones: [M('Enrolled', '2026-08-10', 'done'), M('Round 1', null, 'current'), M('Utilization under 30%', null, 'upcoming'), M('Rent history reported', null, 'upcoming'), M('FHA eligibility date', '2027-03-12', 'upcoming'), M('Request review', null, 'upcoming')],
      nextAction: { title: 'Bring the secured card under 30%', detail: 'Your Chapter 7 waiting period runs until March 12, 2027 for FHA. Every month until then is building time — utilization first, then rent history.', lever: 'utilization', engine: 'CreditBuilderIQ', href: '#plan' },
      alerts: [], loanFile: null },
  ],
  invites: [
    { id: 'i1', first: 'Luis', last: 'Herrera', email: 'luis.h@example.com', mobile: '(510) 555-0171', loId: 'sarah', branch: 'Oakland', source: 'Website', channel: 'Email + text', invitedAt: '2026-08-16', status: 'invited' },
    { id: 'i2', first: 'Kim', last: 'Nakamura', email: 'kim.n@example.com', mobile: '(415) 555-0128', loId: 'sarah', branch: 'Oakland', source: 'Agent · Dana Kim', channel: 'Text', invitedAt: '2026-08-17', status: 'consented' },
  ],
  org: {
    branches: ['Oakland', 'Walnut Creek'],
    invitesThisMonth: 14, enrolledThisMonth: 9, reviewsThisMonth: 2,
    products: [
      { id: 'check', name: 'Readiness check', desc: 'Soft pull, FICO® Score, pathway', engine: 'MyScoreIQ', mode: 'lender', on: true },
      { id: 'dispute', name: 'Dispute Hub', desc: 'Guided letters, tracking', engine: 'CreditBuilderIQ', mode: 'lender', on: true },
      { id: 'rent', name: 'Rent & utility reporting', desc: '24-month history to 3 bureaus', engine: 'CreditBuilderIQ', mode: 'consumer', on: true },
      { id: 'plan', name: 'Personalized plan', desc: 'Underwriting order, the clock, DTI', engine: 'CreditBuilderIQ', mode: 'lender', on: true },
      { id: 'monitor', name: 'Score center & monitoring', desc: 'Daily alerts, why it moved', engine: 'MyScoreIQ', mode: 'lender', on: true },
      { id: 'protect', name: 'Protected homebuying', desc: 'Identity protection, restoration', engine: 'MyScoreIQ', mode: 'consumer', on: false },
    ],
    connectors: [{ id: 'zapier', name: 'Zapier', status: 'connected' }, { id: 'shape', name: 'Shape', status: 'available' }, { id: 'te', name: 'Total Expert', status: 'available' }, { id: 'encompass', name: 'Encompass', status: 'available' }],
  },
  session: { role: 'consumer', consumerId: 'maria', loId: 'sarah', partnerId: null, attribution: null },
  v: 4,
};

const clone = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
export function fixtures() { return clone(FIXTURES); }

const storage = () => (typeof localStorage !== 'undefined' ? localStorage : null);
export function loadState() {
  const ls = storage();
  if (ls) { try { const raw = ls.getItem(STORE_KEY); if (raw) { const st = JSON.parse(raw); if (st.v === FIXTURE_VERSION) return st; } } catch { /* fall through */ } }
  return fixtures();
}
export function saveState(state) { const ls = storage(); if (ls) ls.setItem(STORE_KEY, JSON.stringify(state)); return state; }
export function resetState() { const s = fixtures(); saveState(s); return s; }
export const getConsumer = (s, id) => s.consumers.find((c) => c.id === id) || null;
export const getLO = (s, id) => s.los.find((l) => l.id === id) || null;
export const getLender = (s) => s.lender;

// ---------- rules ----------
export function monthsSince(iso, today = TODAY) {
  const a = new Date(iso + 'T00:00:00Z'), b = new Date(today + 'T00:00:00Z');
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}
export function assignPathway(c, lender) {
  const floor = lender.floorDefault;
  const cr = c.credit, score = c.score?.value ?? null;
  const openDisputes = (c.disputes || []).some((d) => d.status !== 'resolved');
  if (openDisputes) return 'dispute';
  if (score == null || cr.tradelines < 3) return 'thin';
  const r = dti(cr.monthlyDebts, c.income);
  if (r != null && r > 0.45) return 'dti';
  const recentDerog = cr.latesLast24mo > 0 || (c.publicRecords || []).some((p) => monthsSince(p.date) <= 24);
  if (recentDerog || cr.utilization > 0.5) return 'build';
  if (score < floor - 30) return 'build';
  if (score < floor || cr.utilization > 0.3) return 'near_ready';
  return 'ready_now';
}
export function stage(c, lender) {
  const floor = lender.floorDefault, buf = lender.buffer ?? BUFFER_DEFAULT;
  const score = c.score?.value ?? null, cr = c.credit;
  if (score == null || cr.tradelines < 3) return 'not_ready';
  const openDisputes = (c.disputes || []).some((d) => d.status !== 'resolved');
  const r = dti(cr.monthlyDebts, c.income);
  const derog24 = cr.latesLast24mo > 0 || (c.publicRecords || []).some((p) => monthsSince(p.date) <= 24);
  if (openDisputes || derog24 || cr.utilization > 0.5 || (r != null && r > 0.45) || score < floor - APPROACH_BAND) return 'working';
  if (score < floor + buf) return 'approaching';
  return cr.utilization <= 0.3 && !cr.derogLast12mo ? 'ready_to_review' : 'approaching';
}
/** The pathway survives as the reason shown under a stage. */
export function stageReason(c, lender) { return assignPathway(c, lender); }
export function addYears(iso, n) { const [y, m, d] = iso.split('-').map(Number); return `${String(y + n).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
export function addMonths(iso, n) { const [y, m, d] = iso.split('-').map(Number); const t = (y * 12 + (m - 1)) + n; return `${String(Math.floor(t / 12)).padStart(4, '0')}-${String((t % 12) + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
export function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function fmtDate(iso, { long = false } = {}) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${(long ? MON_LONG : MON)[m - 1]} ${d}, ${y}`;
}
const WAITING = {
  chapter7: { label: 'Chapter 7 bankruptcy', fha: 2, conventional: 4 },
  foreclosure: { label: 'Foreclosure', fha: 3, conventional: 7 },
  short_sale: { label: 'Short sale / deed-in-lieu', fha: 3, conventional: 4 },
};
export function eligibilityDates(publicRecords = []) {
  return publicRecords.filter((p) => WAITING[p.type]).map((p) => ({
    type: p.type, label: WAITING[p.type].label, event: p.date,
    fha: addYears(p.date, WAITING[p.type].fha), conventional: addYears(p.date, WAITING[p.type].conventional),
  }));
}
export function dti(monthlyDebts = [], income) {
  if (!income) return null;
  const debt = monthlyDebts.reduce((a, d) => a + (d.payment || 0), 0);
  return Math.round((debt / income) * 100) / 100;
}
export function readinessTrigger(c, lender) {
  const score = c.score?.value; if (score == null) return false;
  const openDisputes = (c.disputes || []).some((d) => d.status !== 'resolved');
  return score >= lender.floorDefault && !openDisputes && !c.credit.derogLast12mo && c.credit.utilization <= 0.3;
}

// ---------- links / query ----------
export function resolveLink(state, code) { const l = state.links?.[code]; return l ? { code, ...l } : null; }
export function parseQuery(search = '') {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return { c: q.get('c'), reset: q.get('reset') === '1', dev: q.get('dev') === '1', as: q.get('as') };
}

// ---------- transitions ----------
export function enrollConsumer(state, { first, last, email, mobile, timeline = '3-6' }, attribution) {
  const tpl = clone(state.consumers.find((c) => c.id === 'maria'));
  const loId = attribution?.lo || state.los[0].id;
  const you = {
    ...tpl, id: 'you', first, last, email, mobile, loId, timeline,
    attribution: attribution || { lender: state.lender.id, lo: loId, source: 'direct', partner: null, campaign: null },
    status: 'active', round: 1, guardian: false, reviewRequestedAt: null, enrolledAt: TODAY,
    milestones: [M('Enrolled', TODAY, 'done'), M('Round 1', null, 'current'), M('Utilization under 30%', null, 'upcoming'), M('12 clean months', null, 'upcoming'), M('Request review', null, 'upcoming')],
  };
  you.pathway = assignPathway(you, state.lender);
  state.consumers = state.consumers.filter((c) => c.id !== 'you').concat(you);
  state.session.consumerId = 'you'; state.session.role = 'consumer';
  return you;
}
export function requestReview(state, id, { income } = {}) {
  const c = getConsumer(state, id); if (!c) return null;
  if (income) c.income = income;
  c.status = 'review_requested'; c.reviewRequestedAt = TODAY;
  c.milestones.forEach((m) => { if (m.state === 'current') { m.state = 'done'; m.date = m.date || TODAY; } });
  const i = c.milestones.findIndex((m) => m.state === 'upcoming');
  c.milestones.splice(i < 0 ? c.milestones.length : i, 0, M('Review requested', TODAY, 'current'));
  const lo = getLO(state, c.loId);
  c.nextAction = { title: `${lo ? lo.first : 'Your loan officer'} has your packet`, detail: 'Your loan officer has been notified and will reach out to schedule. Keep balances where they are until you talk.', lever: 'review', engine: 'MyScoreIQ', href: '#review' };
  return c;
}
export function setGuardian(state, id, on) { const c = getConsumer(state, id); if (c) c.guardian = !!on; return c; }
export function statusCard(state, id) {
  const c = getConsumer(state, id); if (!c) return null;
  const elig = eligibilityDates(c.publicRecords)[0] || null;
  const upcoming = c.milestones.find((m) => m.state === 'upcoming');
  const lastDone = [...c.milestones].reverse().find((m) => m.state === 'done');
  return {
    version: 1, name: `${c.first} ${c.last}`, pathway: c.pathway, status: c.status, round: c.round, roundsEstimated: c.roundsEstimated,
    lastActivity: c.score?.updated || lastDone?.date || c.enrolledAt, nextMilestone: upcoming ? upcoming.label : null, reviewRequestedAt: c.reviewRequestedAt,
    eligibilityDate: elig ? elig.fha : null, guardian: !!c.guardian, attribution: c.attribution,
  };
}
export function packet(state, id) {
  const c = getConsumer(state, id); if (!c) return null;
  const score = c.score?.value;
  return {
    pathway: c.pathway,
    floorsMet: state.lender.programs.filter((p) => score != null && score >= p.floor).map((p) => p.name),
    dtiEstimate: dti(c.credit.monthlyDebts, c.income),
    rentMonths: c.rentReporting.linked ? c.rentReporting.monthsAvailable : 0,
    disputesOpen: c.disputes.filter((d) => d.status !== 'resolved').length,
    disputesResolved: c.disputes.filter((d) => d.status === 'resolved').length,
    income: c.income,
  };
}
export function addDays(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

export const findLOByNmls = (state, nmls) => state.los.find((l) => l.nmls === String(nmls).trim()) || null;
export function addInvite(state, { first, last, email, mobile, loId, branch, source, channel, message }) {
  const inv = { id: 'i' + (state.invites.length + 1) + Date.now().toString(36), first, last, email, mobile, loId, branch, source, channel, message, invitedAt: TODAY, status: 'invited' };
  state.invites.unshift(inv); state.org.invitesThisMonth += 1; return inv;
}
export const consumersForLO = (state, loId) => state.consumers.filter((c) => c.loId === loId && c.id !== 'you' || (c.id === 'you' && c.loId === loId));
