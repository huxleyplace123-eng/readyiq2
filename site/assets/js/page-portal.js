// site/assets/js/page-portal.js — portal shell v2: five tabs, avatar menu, floating Ask, router.
import { loadState, saveState, getConsumer, getLO, getLender } from './state.js';
import { applyBrand, el, mount, qs, qsa, initials, initDev, sheet } from './ui.js';
import { renderHome } from './portal-home.js';
import { renderPlan, renderBuild } from './portal-tools.js';
import { renderDisputes } from './portal-disputes.js';
import { renderProgress } from './portal-progress.js';
import { renderReview, renderGuardian, renderAsk, renderProtect, renderSettings } from './portal-more.js';

const state = loadState();
const lender = getLender(state);
applyBrand(lender);

const ICONS = {
  home: 'M3 11.5 12 4l9 7.5M5 10v10h14V10',
  plan: 'M4 6h16M4 12h10M4 18h7',
  disputes: 'M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3zM9 12l2 2 4-4',
  build: 'M4 17l6-6 4 4 6-7M14 8h6v6',
  progress: 'M4 19V9M10 19V5M16 19v-8M22 19H2',
  review: 'M6 3h9l5 5v13H6zM14 3v6h6M9 14h6M9 17h4',
  guardian: 'M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z',
  protect: 'M12 2a5 5 0 0 1 5 5v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5zm-3 8h6V7a3 3 0 0 0-6 0v3z',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 4l2 1-1 3-2-.5-1.5 1.5.5 2-3 1-1-2h-2l-1 2-3-1 .5-2L6 15.5 4 16l-1-3 2-1v-2l-2-1 1-3 2 .5L7.5 5 7 3l3-1 1 2h2l1-2 3 1-.5 2 1.5 1.5 2-.5 1 3-2 1z',
  ask: 'M4 5h16v11H9l-5 4V5z',
};
const icon = (k) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', ICONS[k]); s.append(p); return s; };

const SECTIONS = {
  home: { label: 'Home', render: renderHome, nav: true },
  plan: { label: 'Plan', render: renderPlan, nav: true },
  disputes: { label: 'Disputes', render: renderDisputes, nav: true },
  build: { label: 'Build', render: renderBuild, nav: true },
  progress: { label: 'Progress', render: renderProgress, nav: true },
  review: { label: 'Request review', render: renderReview },
  guardian: { label: 'Guardian', render: renderGuardian },
  ask: { label: 'Ask ReadyIQ', render: renderAsk },
  protect: { label: 'Protected homebuying', render: renderProtect },
  settings: { label: 'Settings', render: renderSettings },
};
const NAV = ['home', 'plan', 'disputes', 'build', 'progress'];

function current() {
  let key = (location.hash || '#home').slice(1).split('?')[0];
  if (key === 'number') key = 'progress';
  return SECTIONS[key] ? key : 'home';
}
function consumer() { return getConsumer(state, state.session.consumerId) || getConsumer(state, 'maria'); }
const ctx = {
  state, lender,
  get c() { return consumer(); },
  get lo() { return getLO(state, consumer().loId) || state.los[0]; },
  save: () => saveState(state),
  go: (hash) => { location.hash = hash; },
  rerender: () => render(),
  openAsk: (draft) => openAsk(draft),
};

let menuEl = null;
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
function toggleMenu() {
  if (menuEl) return closeMenu();
  const c = ctx.c, lo = ctx.lo;
  menuEl = el('div', { class: 'menu', role: 'menu' },
    el('div', { class: 'menu-head' }, `${c.first} ${c.last}`),
    el('a', { href: '#review', onclick: closeMenu }, icon('review'), 'Request review'),
    c.guardian ? el('a', { href: '#guardian', onclick: closeMenu }, icon('guardian'), 'Guardian') : null,
    el('a', { href: '#protect', onclick: closeMenu }, icon('protect'), 'Protected homebuying'),
    el('a', { href: '#settings', onclick: closeMenu }, icon('settings'), 'Settings'),
    el('div', { class: 'divider', style: { margin: '6px 0' } }),
    el('div', { class: 'menu-head' }, 'Your loan officer'),
    el('a', { href: `tel:${lo.mobile.replace(/\D/g, '')}` }, `📞 ${lo.first} ${lo.last}`),
    el('a', { href: '../check/', onclick: closeMenu }, '⌂ Lender front door'));
  qs('#avatar-wrap').append(menuEl);
  setTimeout(() => document.addEventListener('click', (e) => { if (menuEl && !qs('#avatar-wrap').contains(e.target)) closeMenu(); }, { once: true }), 0);
}

function openAsk(draft) {
  const body = renderAsk(ctx, { compact: true, draft });
  sheet({ title: 'Ask ReadyIQ', body });
}

function nav() {
  const key = current();
  const lo = ctx.lo, c = ctx.c;
  mount('#rail',
    NAV.map((k) => el('a', { href: `#${k}`, class: k === key ? 'active' : '' }, icon(k), SECTIONS[k].label)),
    c.guardian ? el('a', { href: '#guardian', class: key === 'guardian' ? 'active' : '' }, icon('guardian'), 'Guardian') : null,
    el('div', { class: 'rail-lo' },
      el('div', { class: 'row' }, el('span', { class: 'avatar' }, lo.first[0] + lo.last[0]), el('div', {}, el('div', { class: 'small muted' }, 'Your loan officer'), el('b', {}, `${lo.first} ${lo.last}`))),
      el('a', { class: 'btn btn-secondary btn-sm', href: '#review' }, c.status === 'review_requested' ? 'Review requested ✓' : 'Request review')));
  mount('#bottomnav', NAV.map((k) => el('a', { href: `#${k}`, class: k === key ? 'active' : '' }, icon(k), SECTIONS[k].label)));
  qs('#avatar').textContent = initials(`${c.first} ${c.last}`);
}
function render() {
  const key = current();
  closeMenu();
  nav();
  document.title = `${SECTIONS[key].label === 'Home' ? 'Your path' : SECTIONS[key].label} — ${lender.name}`;
  mount('#view', el('div', { class: 'view' }, SECTIONS[key].render(ctx)));
  window.scrollTo({ top: 0 });
}
qs('#avatar').addEventListener('click', (e) => { e.preventDefault(); toggleMenu(); });
document.body.append(el('button', { class: 'fab', onclick: () => openAsk() }, el('i', {}, '✦'), 'Ask ReadyIQ'));
addEventListener('hashchange', render);
render();
initDev(state, { onChange: render });
