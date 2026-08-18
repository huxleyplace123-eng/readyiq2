// site/assets/js/page-check.js — the lender-branded front door.
import { loadState, saveState, resolveLink, parseQuery, getLO, getLender } from './state.js';
import { applyBrand, qs, qsa, sheet, el, initDev, countUp } from './ui.js';
import { renderPath } from './path.js';

const state = loadState();
const q = parseQuery(location.search);
if (q.c) {
  const attr = resolveLink(state, q.c);
  if (attr) { state.session.attribution = attr; saveState(state); }
}
const lender = getLender(state);
applyBrand(lender);

const loId = state.session.attribution?.lo || 'sarah';
const lo = getLO(state, loId) || state.los[0];
qs('#lo-chip-text').textContent = `Your loan officer: ${lo.first} ${lo.last} · NMLS ${lo.nmls}`;
qsa('[data-lo-first]').forEach((n) => (n.textContent = lo.first));
if (state.session.attribution?.partner) {
  const p = state.partners.find((x) => x.id === state.session.attribution.partner);
  if (p) qs('#lo-chip-text').textContent += ` · via ${p.first} ${p.last}, ${p.company}`;
}

const MARIA = state.consumers.find((c) => c.id === 'maria').milestones;
renderPath('#path-preview', { nodes: MARIA });
renderPath('#phone-path', { nodes: MARIA.slice(0, 5) });
setTimeout(() => countUp(qs('#phone-num'), 611, 625, 1200), 600);

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
  const dots = el('div', { class: 'row', style: { gap: '6px' } }, STEPS.map((_, k) => el('i', { class: 'progress', style: { width: '36px', display: 'block' } }, el('i', { style: { width: '0%' } }))));
  const draw = () => {
    renderPath(pathEl, { nodes: STEPS.map((s, k) => ({ label: s.label, state: k < i ? 'done' : k === i ? 'current' : 'upcoming' })) });
    cap.textContent = STEPS[i].cap;
    qsa('.progress > i', dots).forEach((b, k) => (b.style.width = k < i ? '100%' : k === i ? '100%' : '0%'));
  };
  const s = sheet({
    title: 'A sample path',
    body: el('div', { class: 'stack-4' }, pathEl, cap, dots, el('p', { class: 'reg-b' }, 'Sample data. Your path is built from your own report — and you can apply for a mortgage at any time.')),
    actions: [{ label: 'Check my readiness', kind: 'primary', onClick: () => { location.href = '../enroll/'; return false; } }, { label: 'Close', kind: 'ghost' }],
    onClose: () => clearInterval(timer),
  });
  draw();
  timer = setInterval(() => { i = (i + 1) % STEPS.length; draw(); }, 4000);
});

initDev(state);
