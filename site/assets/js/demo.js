// site/assets/js/demo.js — the demo switcher pill shown on every page (hide with ?demo=0).
import { loadState, saveState, resetState, fixtures } from './state.js';
import { el, qs } from './ui.js';

const ROOT = () => {
  // relative root: pages live at depth 1 (check/, portal/, lo/, r/, p/, integrations/, dev/) or depth 2 (lo/start/) or root (index.html)
  const parts = location.pathname.replace(/\/[^/]*$/, '').split('/').filter(Boolean);
  const site = parts.indexOf('site');
  const depth = site >= 0 ? parts.length - site - 1 : (location.hostname.endsWith('github.io') ? Math.max(0, parts.length - 1) : parts.length);
  return depth ? '../'.repeat(depth) : './';
};

export function initDemo({ onConsumerChange } = {}) {
  const q = new URLSearchParams(location.search);
  if (q.get('reset') === '1') { resetState(); q.delete('reset'); location.replace(location.pathname + (q.toString() ? '?' + q : '') + location.hash); return; }
  if (q.get('demo') === '0' || sessionStorage.getItem('readyiq2:demo') === 'off') return;
  const state = loadState();
  const root = ROOT();
  let open = false, menu = null;
  const pill = el('button', { class: 'demo-pill', 'aria-haspopup': 'true', 'aria-expanded': 'false', onclick: () => toggle() }, el('i', {}, 'R'), 'ReadyIQ demo', el('span', { style: { opacity: .6 } }, '▾'));
  const consumers = fixtures().consumers.map((c) => c.id).concat(state.consumers.some((c) => c.id === 'you') ? ['you'] : []);
  const consumerName = (id) => { const c = state.consumers.find((x) => x.id === id); return c ? `${c.first} ${c.last}` : id; };
  function toggle(force) {
    open = force ?? !open; pill.setAttribute('aria-expanded', String(open));
    if (menu) { menu.remove(); menu = null; }
    if (!open) return;
    const select = el('select', { onchange: (e) => { const s = loadState(); s.session.consumerId = e.target.value; s.session.role = 'consumer'; saveState(s); if (location.pathname.includes('/portal/') && onConsumerChange) { onConsumerChange(); toggle(false); } else location.href = root + 'portal/'; } },
      consumers.map((id) => el('option', { value: id, selected: state.session.consumerId === id }, consumerName(id))));
    menu = el('div', { class: 'demo-menu', role: 'menu' },
      el('div', { class: 'demo-head' }, 'Surfaces'),
      el('a', { href: root + 'index.html' }, '◎ ReadyIQ website'),
      el('a', { href: root + 'check/' }, '⌂ Lender front door'),
      el('a', { href: root + 'check/?c=harbor-smiller' }, '✉ Personal invitation (Sarah)'),
      el('a', { href: root + 'portal/' }, '◈ Consumer portal'),
      el('a', { href: root + 'lo/' }, '♙ Loan officer'),
      el('a', { href: root + 'lo/#feed' }, '▤ Status feed'),
      el('a', { href: root + 'p/?c=harbor-dkim' }, '⌁ Partner (agent) page'),
      el('a', { href: root + 'integrations/' }, '⇄ Integrations'),
      el('div', { class: 'demo-head' }, 'Consumer'),
      el('label', {}, 'Viewing ', select),
      el('div', { class: 'demo-head' }, 'Demo'),
      el('button', { onclick: () => { resetState(); location.reload(); } }, '↻ Reset demo data'),
      el('button', { onclick: () => { sessionStorage.setItem('readyiq2:demo', 'off'); pill.remove(); toggle(false); } }, '× Hide this switcher (session)'));
    document.body.append(menu);
    setTimeout(() => document.addEventListener('click', onDoc, { once: true }), 0);
  }
  const onDoc = (e) => { if (menu && !menu.contains(e.target) && e.target !== pill && !pill.contains(e.target)) toggle(false); };
  document.body.append(pill);
}
