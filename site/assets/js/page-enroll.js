// site/assets/js/page-enroll.js — three screens, then "Your path is ready."
import { loadState, saveState, enrollConsumer, getLO, getLender, PATHWAY_LABELS, PATHWAY_BLURBS } from './state.js';
import { applyBrand, el, mount, qs, qsa, engineTag, regB, countUp, initDev, toast } from './ui.js';
import { renderPath } from './path.js';

const state = loadState();
const lender = getLender(state);
applyBrand(lender);
const attr = state.session.attribution;
let lo = getLO(state, attr?.lo || 'sarah') || state.los[0];
const form = { first: '', last: '', mobile: '', email: '', timeline: '3-6', address: '', city: '', st: 'CA', zip: '', dob: '', ssn4: '', c1: false, c2: false, c3: false, verified: false };

const STEPS = ['you', 'verify', 'lo', 'done'];
const stepIndex = () => Math.max(0, STEPS.indexOf((location.hash || '#you').slice(1)));

function drawHero() {
  const i = stepIndex();
  const nodes = [
    { label: 'You', state: i > 0 ? 'done' : 'current' },
    { label: 'Verify', state: i > 1 ? 'done' : i === 1 ? 'current' : 'upcoming' },
    { label: 'Your loan officer', state: i > 2 ? 'done' : i === 2 ? 'current' : 'upcoming' },
  ];
  renderPath('#path-hero', { variant: 'hero', nodes });
}

function field(label, key, attrs = {}) {
  return el('label', { class: 'field' }, el('span', { class: 'label' }, label),
    el('input', { class: 'input', value: form[key], ...attrs, oninput: (e) => { form[key] = e.target.value.trim(); refreshContinue(); } }));
}
function consent(key, title, text) {
  return el('label', { class: 'consent' },
    el('input', { type: 'checkbox', checked: form[key], onchange: (e) => { form[key] = e.target.checked; refreshContinue(); } }),
    el('div', {}, el('b', {}, title), el('span', {}, text)));
}
function refreshContinue() {
  const b = qs('#continue'); if (!b) return;
  const ok = form.first && form.last && form.mobile && form.email && form.c1 && form.c2 && form.c3;
  b.toggleAttribute('disabled', !ok);
}

function renderYou() {
  return el('section', { class: 'step' },
    el('div', { class: 'step-head' }, el('p', { class: 'eyebrow' }, 'Step 1 of 3'), el('h1', { class: 'h2' }, 'Let’s start with you.'), el('p', { class: 'muted' }, 'Three short screens. Nothing here is an application, and nothing affects your score.')),
    el('div', { class: 'grid-2' }, field('First name', 'first', { autocomplete: 'given-name', placeholder: 'Maria' }), field('Last name', 'last', { autocomplete: 'family-name', placeholder: 'Delgado' })),
    field('Mobile', 'mobile', { type: 'tel', autocomplete: 'tel', placeholder: '(510) 555-0119', inputmode: 'tel' }),
    field('Email', 'email', { type: 'email', autocomplete: 'email', placeholder: 'you@example.com', inputmode: 'email' }),
    el('div', { class: 'stack-2' }, el('span', { class: 'label' }, 'What best describes you?'), el('div', { class: 'choice-row' }, [['now', 'Ready to buy now', 'Looking at homes'], ['3-6', 'Buying in 3–6 months', 'Getting ready'], ['exploring', 'Exploring my options', 'No timeline yet']].map(([v, t, sub]) => el('button', { type: 'button', class: 'choice' + (form.timeline === v ? ' on' : ''), onclick: (e) => { form.timeline = v; qsa('.choice', e.target.closest('.choice-row')).forEach((b) => b.classList.remove('on')); e.target.closest('.choice').classList.add('on'); } }, el('b', {}, t), el('small', {}, sub))))),
    el('div', { class: 'stack-2' },
      consent('c1', 'Let ReadyIQ pull my credit for my own review.', 'MyScoreIQ and CreditBuilderIQ obtain my reports and FICO® Score for me. This is a soft check — it does not affect my score.'),
      consent('c2', `Share my status — never my report — with my loan officer.`, `${lo.first} sees where I am on the path (like “Round 2, utilization goal met”). ${lo.first} never sees my credit report or score details unless I request a review.`),
      consent('c3', 'Text me.', `ReadyIQ and ${lo.first} may text me about my path. Message rates may apply; reply STOP any time.`)),
    el('div', { class: 'actions' },
      el('button', { class: 'btn btn-primary btn-lg btn-block', id: 'continue', disabled: true, onclick: () => { location.hash = '#verify'; } }, 'Continue ', el('span', { class: 'arrow' }, '→')),
      regB()));
}

function renderVerify() {
  const otp = el('div', { class: 'otp' }, Array.from({ length: 6 }, (_, k) => el('input', { maxlength: '1', inputmode: 'numeric', 'aria-label': `Digit ${k + 1}`, oninput: (e) => { if (e.target.value && e.target.nextElementSibling) e.target.nextElementSibling.focus(); checkVerify(); } })));
  const idField = (label, key, attrs = {}) => el('label', { class: 'field' }, el('span', { class: 'label' }, label), el('input', { class: 'input', value: form[key], ...attrs, oninput: (e) => { form[key] = e.target.value.trim(); checkVerify(); } }));
  function checkVerify() {
    const digits = qsa('input', otp).every((i) => i.value.length === 1);
    const ok = digits && form.address && form.city && form.zip && form.dob && form.ssn4.length === 4;
    qs('#verify-btn')?.toggleAttribute('disabled', !ok);
  }
  const fill = () => {
    Object.assign(form, { address: '1420 Cedar Street, Apt 4', city: 'Oakland', st: 'CA', zip: '94612', dob: '08/14/1991', ssn4: '4419' });
    qsa('#identity input.input').forEach((i) => { const key = i.dataset.key; if (key) i.value = form[key]; });
    '481206'.split('').forEach((d, k) => (qsa('input', otp)[k].value = d));
    checkVerify();
  };
  const identity = el('div', { class: 'stack-3', id: 'identity' },
    idField('Home address', 'address', { autocomplete: 'street-address', placeholder: '1420 Cedar Street, Apt 4', 'data-key': 'address' }),
    el('div', { class: 'grid-3', style: { gap: '10px' } }, idField('City', 'city', { autocomplete: 'address-level2', placeholder: 'Oakland', 'data-key': 'city' }), idField('State', 'st', { placeholder: 'CA', maxlength: '2', 'data-key': 'st' }), idField('ZIP', 'zip', { inputmode: 'numeric', placeholder: '94612', 'data-key': 'zip' })),
    el('div', { class: 'grid-2' }, idField('Date of birth', 'dob', { placeholder: 'MM/DD/YYYY', inputmode: 'numeric', 'data-key': 'dob' }), idField('Last 4 of SSN', 'ssn4', { type: 'password', inputmode: 'numeric', maxlength: '4', placeholder: '••••', 'data-key': 'ssn4' })),
    el('p', { class: 'help' }, 'Encrypted and used only to complete your authorized soft check. Never shared with ' + lender.name + '.'));
  return el('section', { class: 'step' },
    el('div', { class: 'step-head' }, el('p', { class: 'eyebrow' }, 'Step 2 of 3'), el('h1', { class: 'h2' }, 'Verify it’s you.'), el('p', { class: 'muted' }, `A few details to match your credit file, and the code we texted to ${form.mobile || 'your mobile'}.`), engineTag('IDIQ')),
    identity,
    el('div', { class: 'stack-2' }, el('span', { class: 'label' }, 'One-time code'), otp,
      el('button', { class: 'link-btn small', style: { justifySelf: 'start' }, onclick: fill }, 'Demo: fill everything for me')),
    el('div', { class: 'actions' },
      el('button', { class: 'btn btn-primary btn-lg btn-block', id: 'verify-btn', disabled: true, onclick: () => { form.verified = true; toast('Verified'); location.hash = '#lo'; } }, 'Verify ', el('span', { class: 'arrow' }, '→')),
      regB()));
}

function renderLO() {
  const card = () => el('div', { class: 'card card-pad lo-card' },
    el('span', { class: 'avatar avatar-lg' }, lo.first[0] + lo.last[0]),
    el('div', { class: 'stack-1' }, el('div', { class: 'h3' }, `${lo.first} ${lo.last}`), el('div', { class: 'lo-meta' }, `${lender.name} · NMLS ${lo.nmls}`), el('div', { class: 'lo-meta' }, `Licensed in ${lo.states.join(' · ')} · ${lo.mobile}`)));
  const holder = el('div', {}, card());
  const picker = attr?.lo ? null : el('label', { class: 'field' }, el('span', { class: 'label' }, 'Choose your loan officer'),
    el('select', { class: 'input', onchange: (e) => { lo = getLO(state, e.target.value); holder.replaceChildren(card()); } }, state.los.map((l) => el('option', { value: l.id, selected: l.id === lo.id }, `${l.first} ${l.last} — NMLS ${l.nmls}`))));
  return el('section', { class: 'step' },
    el('div', { class: 'step-head' }, el('p', { class: 'eyebrow' }, 'Step 3 of 3'), el('h1', { class: 'h2' }, 'Meet your loan officer.'), el('p', { class: 'muted' }, `${lo.first} will see your progress — never your report — and be told the day you’re ready.`)),
    holder, picker,
    el('div', { class: 'actions' },
      el('button', { class: 'btn btn-primary btn-lg btn-block', onclick: finish }, `That’s my loan officer `, el('span', { class: 'arrow' }, '→')),
      el('p', { class: 'reg-b' }, 'You can change this later in Settings. You can apply for a mortgage at any time — this is not required.')));
}

function finish() {
  const attribution = attr ? { ...attr, lo: lo.id } : { lender: lender.id, lo: lo.id, source: 'direct', partner: null, campaign: null };
  enrollConsumer(state, { first: form.first || 'Alex', last: form.last || 'Kim', email: form.email, mobile: form.mobile, timeline: form.timeline }, attribution);
  saveState(state);
  location.hash = '#done';
}

function renderDone() {
  const you = state.consumers.find((c) => c.id === 'you');
  if (!you) { location.hash = '#you'; return el('div'); }
  const num = el('span', { class: 'number-value' }, '—');
  setTimeout(() => countUp(num, 500, you.score.value, 1400), 350);
  return el('section', { class: 'reveal' },
    el('p', { class: 'eyebrow' }, 'Your path is ready'),
    el('h1', { class: 'h1' }, `Here’s where you stand, ${you.first}.`),
    el('div', { class: 'number' }, el('div', { class: 'number-top', style: { justifyContent: 'center' } }, num), el('p', { class: 'number-caption', style: { margin: '0 auto' } }, 'FICO® Score — not the mortgage-industry version lenders pull. A guide, not a preapproval.'), el('div', { class: 'number-meta', style: { justifyContent: 'center' } }, engineTag('MyScoreIQ'))),
    el('span', { class: `badge badge-${you.pathway}` }, PATHWAY_LABELS[you.pathway]),
    el('p', { class: 'lead', style: { maxWidth: '34ch' } }, PATHWAY_BLURBS[you.pathway], ' ', `${lo.first} can see you enrolled.`),
    el('a', { class: 'btn btn-primary btn-lg', href: '../portal/' }, 'Open my portal ', el('span', { class: 'arrow' }, '→')),
    regB());
}

const RENDER = { you: renderYou, verify: renderVerify, lo: renderLO, done: renderDone };
function render() {
  const key = STEPS[stepIndex()];
  if ((key === 'verify' || key === 'lo') && !(form.first && form.c1)) { location.hash = '#you'; return; }
  if (key === 'lo' && !form.verified) { location.hash = '#verify'; return; }
  drawHero();
  mount('#step', RENDER[key]());
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
addEventListener('hashchange', render);
if (!location.hash) history.replaceState(null, '', '#you');
render();
initDev(state);
