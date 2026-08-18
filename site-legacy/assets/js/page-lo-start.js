// site/assets/js/page-lo-start.js — LO sign-up: email + NMLS ID → autofill → brand pull → your link. Under a minute.
import { loadState, saveState, findLOByNmls, getLender } from './state.js';
import { el, mount, qs, toast, regB } from './ui.js';
import { renderPath } from './path.js';
import { initDemo } from './demo.js';

const state = loadState();
const lender = getLender(state);
const form = { email: '', nmls: '', lo: null };
const t0 = performance.now();
const elapsed = () => Math.round((performance.now() - t0) / 1000);

const STEPS = ['you', 'found', 'brand', 'done'];
const stepIndex = () => Math.max(0, STEPS.indexOf((location.hash || '#you').slice(1)));
function hero() {
  const i = stepIndex();
  renderPath('#path-hero', { variant: 'hero', nodes: [
    { label: 'Email + NMLS', state: i > 0 ? 'done' : 'current' },
    { label: 'We fill the rest', state: i > 1 ? 'done' : i === 1 ? 'current' : 'upcoming' },
    { label: 'Your brand', state: i > 2 ? 'done' : i === 2 ? 'current' : 'upcoming' },
    { label: 'Your link', state: i > 3 ? 'done' : i === 3 ? 'current' : 'upcoming' },
  ] });
}

function renderYou() {
  const check = () => { qs('#go')?.toggleAttribute('disabled', !(form.email.includes('@') && form.nmls.length >= 5)); };
  return el('section', { class: 'step' },
    el('div', { class: 'stack-1' }, el('p', { class: 'kicker accent' }, '60 seconds to a link'), el('h1', { class: 'h1' }, 'Get your ReadyIQ link.'), el('p', { class: 'lead' }, 'Two fields. We fill in the rest from your NMLS ID and pull your company’s brand from its website.')),
    el('label', { class: 'field' }, el('span', { class: 'label' }, 'Work email'), el('input', { class: 'input', type: 'email', placeholder: 'sarah@harborhomeloans.com', autocomplete: 'email', oninput: (e) => { form.email = e.target.value.trim(); check(); } })),
    el('label', { class: 'field' }, el('span', { class: 'label' }, 'NMLS ID'), el('input', { class: 'input', inputmode: 'numeric', placeholder: '1234567', oninput: (e) => { form.nmls = e.target.value.trim(); check(); } }), el('span', { class: 'help' }, 'Demo IDs: 1234567 (Sarah Miller) · 2345678 (Marcus Webb)')),
    el('button', { class: 'btn btn-primary btn-lg btn-block', id: 'go', disabled: true, onclick: () => {
      form.lo = findLOByNmls(state, form.nmls) || { ...state.los[0], email: form.email, nmls: form.nmls, first: form.email.split('@')[0].split('.')[0].replace(/^\w/, (c) => c.toUpperCase()) || 'You', last: '' };
      location.hash = '#found';
    } }, 'Continue ', el('span', { class: 'arrow' }, '→')),
    el('button', { class: 'link-btn small', style: { justifySelf: 'start' }, onclick: () => { qs('input[type=email]').value = 'sarah@harborhomeloans.com'; form.email = 'sarah@harborhomeloans.com'; qs('input[inputmode=numeric]').value = '1234567'; form.nmls = '1234567'; check(); } }, 'Demo: fill for me'));
}
function renderFound() {
  const lo = form.lo;
  return el('section', { class: 'step' },
    el('div', { class: 'stack-1' }, el('p', { class: 'kicker accent' }, 'Found you'), el('h1', { class: 'h1' }, `Hi ${lo.first}.`), el('p', { class: 'lead' }, 'We matched your NMLS ID. Confirm and we’ll pull your brand.')),
    el('div', { class: 'card card-pad lo-found' }, el('span', { class: 'avatar avatar-lg', style: { background: 'var(--navy)', color: '#fff' } }, (lo.first[0] || 'Y') + (lo.last[0] || '')),
      el('dl', { class: 'kv', style: { gridTemplateColumns: 'auto 1fr', textAlign: 'left' } }, el('dt', {}, 'Name'), el('dd', { style: { textAlign: 'left' } }, `${lo.first} ${lo.last}`.trim()), el('dt', {}, 'NMLS'), el('dd', { style: { textAlign: 'left' } }, lo.nmls), el('dt', {}, 'Company'), el('dd', { style: { textAlign: 'left' } }, lender.name), el('dt', {}, 'Licensed in'), el('dd', { style: { textAlign: 'left' } }, (lo.states || ['CA']).join(' · ')))),
    el('div', { class: 'row wrap' }, el('button', { class: 'btn btn-primary btn-lg', onclick: () => (location.hash = '#brand') }, 'That’s me ', el('span', { class: 'arrow' }, '→')), el('button', { class: 'btn btn-outline btn-lg', onclick: () => (location.hash = '#you') }, 'Not me')));
}
function renderBrand() {
  const box = el('div', { class: 'card card-pad stack-3' }, el('div', { class: 'row' }, el('span', { class: 'chip' }, el('span', { class: 'dot' }), `Looking at ${lender.site}…`)));
  setTimeout(() => {
    box.replaceChildren(
      el('div', { class: 'brand-found' }, el('span', { class: 'brand-mark', style: { background: lender.brand.primary } }, lender.name[0]), el('div', {}, el('b', {}, lender.name), el('div', { class: 'small muted' }, `Logo and colors pulled from ${lender.site}`)), el('span', { class: 'row', style: { gap: '6px' } }, el('i', { class: 'swatch', style: { background: lender.brand.primary } }), el('i', { class: 'swatch', style: { background: lender.brand.soft } }))),
      el('div', { class: 'card', style: { padding: '12px 14px', background: 'var(--paper-2)' } }, el('div', { class: 'row' }, el('span', { class: 'brand-mark', style: { background: lender.brand.primary, width: '24px', height: '24px', fontSize: '11px' } }, lender.name[0]), el('b', { class: 'small' }, lender.name), el('span', { class: 'small muted', style: { marginLeft: 'auto' } }, 'Powered by ReadyIQ')), el('div', { class: 'h3', style: { marginTop: '8px', color: 'var(--ink)' } }, 'Check your homebuyer credit readiness.'), el('div', { class: 'small muted' }, `3 minutes. No application. With ${form.lo.first} on your side.`)),
      el('div', { class: 'row wrap' }, el('button', { class: 'btn btn-primary btn-lg', onclick: finish }, 'Looks right — make my link ', el('span', { class: 'arrow' }, '→')), el('button', { class: 'btn btn-outline', onclick: () => toast('Brand editor opens here in the product') }, 'Adjust')));
  }, 900);
  return el('section', { class: 'step' },
    el('div', { class: 'stack-1' }, el('p', { class: 'kicker accent' }, 'Your brand'), el('h1', { class: 'h1' }, 'Consumers see your company, not ours.'), el('p', { class: 'lead' }, 'We pull your logo and colors so the front door looks like yours. ReadyIQ stays small — “powered by.”')),
    box);
}
function finish() {
  state.session.role = 'lo'; state.session.loId = form.lo.id || state.los[0].id; state.session.loSignup = { email: form.email, nmls: form.nmls, seconds: elapsed() };
  saveState(state); location.hash = '#done';
}
function renderDone() {
  const lo = form.lo || state.los.find((l) => l.id === state.session.loId) || state.los[0];
  const secs = state.session.loSignup?.seconds ?? elapsed();
  return el('section', { class: 'step', style: { textAlign: 'center', justifyItems: 'center' } },
    el('p', { class: 'kicker accent' }, `Done in ${secs} seconds`), el('h1', { class: 'h1' }, 'Your link is ready.'),
    el('div', { class: 'card card-pad stack-2', style: { width: '100%' } }, el('code', { style: { fontSize: 'var(--fs-17)', fontFamily: 'ui-monospace, Menlo, Consolas, monospace' } }, `ready.harborhomeloans.com/${lo.code ? lo.code.split('-')[1] : 'you'}`), el('span', { class: 'small muted' }, 'One link per human. Every consumer who uses it stays attributed to you.')),
    el('a', { class: 'btn btn-primary btn-lg', href: '../' }, 'Open your link page ', el('span', { class: 'arrow' }, '→')),
    el('p', { class: 'small muted' }, 'Next: text it to a client, print the QR, or send an invitation.'));
}
const RENDER = { you: renderYou, found: renderFound, brand: renderBrand, done: renderDone };
function render() {
  const key = STEPS[stepIndex()];
  if ((key === 'found' || key === 'brand') && !form.lo) { location.hash = '#you'; return; }
  hero(); mount('#step', RENDER[key]()); window.scrollTo({ top: 0 });
}
addEventListener('hashchange', render);
if (!location.hash) history.replaceState(null, '', '#you');
render();
initDemo();
