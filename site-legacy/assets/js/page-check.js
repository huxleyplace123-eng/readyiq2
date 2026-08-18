// site/assets/js/page-check.js — the lender-branded front door: two doors on one page
// (public "check my readiness" and a personal invitation when a link resolves to an LO or agent).
import { loadState, saveState, resolveLink, parseQuery, getLO, getLender } from './state.js';
import { applyBrand, qs, qsa, sheet, el, initDev, ringGauge, countUp } from './ui.js';
import { renderPath } from './path.js';

const state = loadState();
const q = parseQuery(location.search);
if (q.c) {
  const attr = resolveLink(state, q.c);
  if (attr) { state.session.attribution = attr; saveState(state); }
}
const lender = getLender(state);
applyBrand(lender);

const attr = state.session.attribution;
const lo = getLO(state, attr?.lo || 'sarah') || state.los[0];
const partner = attr?.partner ? state.partners.find((p) => p.id === attr.partner) : null;
qsa('[data-lo-first]').forEach((n) => (n.textContent = lo.first));

// the door: public chip vs personal invitation
const door = qs('#door');
if (attr && (attr.source === 'lo' || attr.source === 'agent' || attr.source === 'campaign')) {
  door.append(el('div', { class: 'invite card-enter' },
    el('span', { class: 'avatar avatar-lg' }, lo.first[0] + lo.last[0]),
    el('div', {}, el('small', {}, partner ? `Personal invitation · via ${partner.first} ${partner.last}, ${partner.company}` : attr.source === 'campaign' ? 'A personal invitation from your lender' : 'Personal invitation'),
      el('b', {}, `${lo.first} ${lo.last} · ${lender.name}`), el('div', { class: 'small muted' }, `NMLS ${lo.nmls} · Licensed in ${lo.states.join(', ')}`))));
  qs('#headline').replaceChildren(`${lo.first} invited you to check your `, el('em', {}, 'credit readiness.'));
  qs('#sub').textContent = `See where your credit stands, get a plan that moves you toward a mortgage, and stay connected to ${lo.first} — without applying for anything today.`;
  qs('#cta').firstChild.textContent = 'Accept invitation & check my readiness ';
} else {
  door.append(el('div', { class: 'chip' }, el('span', { class: 'dot' }), `Your loan officer: ${lo.first} ${lo.last} · NMLS ${lo.nmls}`));
}

// the platform window
const MARIA = state.consumers.find((c) => c.id === 'maria').milestones;
qs('#mini-ring').append(ringGauge({ value: 611, label: 'FICO® Score', size: 104, stroke: 8 }));
setTimeout(() => countUp(qs('#mini-ring b'), 611, 625, 1200), 700);
renderPath('#platform-path', { nodes: MARIA.slice(0, 5) });
renderPath('#path-preview', { nodes: MARIA });

// "See a sample path" — a 20-second scripted tour of the journey
const STEPS = [
  { label: 'Check', cap: 'Check — 3 minutes, no application. A soft pull, a FICO® Score labeled honestly, a clear read on where you stand.' },
  { label: 'Plan', cap: 'Plan — one next action at a time, in the order underwriting cares.' },
  { label: 'Build', cap: 'Build — utilization first, then history. Rounds you can feel: “Round 2 of ~5.”' },
  { label: 'Trigger', cap: `Trigger — ${lo.first} is told the day you're ready. Never your report.` },
  { label: 'Review', cap: `Review — you request it. ${lo.first} pulls the real mortgage report and takes it from there.` },
];
qs('#sample').addEventListener('click', () => {
  let i = 0, timer;
  const pathEl = el('div');
  const cap = el('p', { class: 'lead', style: { minHeight: '3.2em' } });
  const dots = el('div', { class: 'row', style: { gap: '6px' } }, STEPS.map(() => el('i', { class: 'progress', style: { width: '36px', display: 'block' } }, el('i', { style: { width: '0%' } }))));
  const draw = () => {
    renderPath(pathEl, { nodes: STEPS.map((s, k) => ({ label: s.label, state: k < i ? 'done' : k === i ? 'current' : 'upcoming' })) });
    cap.textContent = STEPS[i].cap;
    qsa('.progress > i', dots).forEach((b, k) => (b.style.width = k <= i ? '100%' : '0%'));
  };
  sheet({
    title: 'A sample path',
    body: el('div', { class: 'stack-4' }, pathEl, cap, dots, el('p', { class: 'reg-b' }, 'Sample data. Your path is built from your own report — and you can apply for a mortgage at any time.')),
    actions: [{ label: 'Check my readiness', kind: 'primary', onClick: () => { location.href = '../enroll/'; return false; } }, { label: 'Close', kind: 'ghost' }],
    onClose: () => clearInterval(timer),
  });
  draw();
  timer = setInterval(() => { i = (i + 1) % STEPS.length; draw(); }, 4000);
});

initDev(state);
