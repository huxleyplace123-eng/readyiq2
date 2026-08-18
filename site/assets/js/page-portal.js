// site/assets/js/page-portal.js — portal shell, router, nav. Sections live in portal-*.js.
import { loadState, saveState, getConsumer, getLO, getLender } from './state.js';
import { applyBrand, el, mount, qs, initials, initDev } from './ui.js';
import { renderHome } from './portal-home.js';
import { renderPlan, renderDisputes, renderBuild, renderNumber } from './portal-tools.js';
import { renderReview, renderGuardian, renderAsk, renderProtect, renderSettings } from './portal-more.js';

const state = loadState();
const lender = getLender(state);
applyBrand(lender);

const ICONS = {
  home: 'M3 11.5 12 4l9 7.5M5 10v10h14V10',
  plan: 'M4 6h16M4 12h10M4 18h7',
  disputes: 'M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3zM9 12l2 2 4-4',
  build: 'M4 17l6-6 4 4 6-7M14 8h6v6',
  ask: 'M4 5h16v11H9l-5 4V5z',
  number: 'M4 19V9M10 19V5M16 19v-8M22 19H2',
  review: 'M6 3h9l5 5v13H6zM14 3v6h6M9 14h6M9 17h4',
  guardian: 'M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z',
  protect: 'M12 2a5 5 0 0 1 5 5v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5zm-3 8h6V7a3 3 0 0 0-6 0v3z',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 4l2 1-1 3-2-.5-1.5 1.5.5 2-3 1-1-2h-2l-1 2-3-1 .5-2L6 15.5 4 16l-1-3 2-1v-2l-2-1 1-3 2 .5L7.5 5 7 3l3-1 1 2h2l1-2 3 1-.5 2 1.5 1.5 2-.5 1 3-2 1z',
};
const icon = (k) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', ICONS[k]); s.append(p); return s; };

const SECTIONS = {
  home: { label: 'Home', render: renderHome },
  plan: { label: 'Plan', render: renderPlan },
  disputes: { label: 'Disputes', render: renderDisputes },
  build: { label: 'Build', render: renderBuild },
  number: { label: 'Why it moved', render: renderNumber },
  review: { label: 'Request review', render: renderReview },
  guardian: { label: 'Guardian', render: renderGuardian },
  ask: { label: 'Ask ReadyIQ', render: renderAsk },
  protect: { label: 'Protected homebuying', render: renderProtect },
  settings: { label: 'Settings', render: renderSettings },
};
const RAIL = [['home', 'plan', 'disputes', 'build', 'number'], ['review', 'guardian', 'ask', 'protect', 'settings']];
const BOTTOM = ['home', 'plan', 'disputes', 'build', 'ask'];

function current() {
  const key = (location.hash || '#home').slice(1).split('?')[0];
  return SECTIONS[key] ? key : 'home';
}
function consumer() {
  return getConsumer(state, state.session.consumerId) || getConsumer(state, 'maria');
}
const ctx = {
  state, lender,
  get c() { return consumer(); },
  get lo() { return getLO(state, consumer().loId) || state.los[0]; },
  save: () => saveState(state),
  go: (hash) => { location.hash = hash; },
  rerender: () => render(),
};

function nav() {
  const key = current();
  mount('#rail', RAIL.map((group, gi) => el('div', { class: 'stack-1', style: gi ? { marginTop: '12px' } : {} },
    group.filter((k) => k !== 'guardian' || ctx.c.guardian).map((k) => el('a', { href: `#${k}`, class: k === key ? 'active' : '' }, icon(k), SECTIONS[k].label)))));
  mount('#bottomnav', BOTTOM.map((k) => el('a', { href: `#${k}`, class: k === key ? 'active' : '' }, icon(k), SECTIONS[k].label.replace('Ask ReadyIQ', 'Ask'))));
  qs('#avatar').textContent = initials(`${ctx.c.first} ${ctx.c.last}`);
}
function render() {
  const key = current();
  nav();
  document.title = `${SECTIONS[key].label === 'Home' ? 'Your path' : SECTIONS[key].label} — ${lender.name}`;
  mount('#view', el('div', { class: 'view' }, SECTIONS[key].render(ctx)));
  window.scrollTo({ top: 0 });
}
addEventListener('hashchange', render);
render();
initDev(state, { onChange: render });
