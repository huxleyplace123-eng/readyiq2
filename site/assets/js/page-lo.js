// site/assets/js/page-lo.js — the loan officer surface: your link · status feed · organization. Thin by design — not a CRM.
import { loadState, saveState, getLO, getLender, statusCard, addInvite, PATHWAY_LABELS, fmtDate, STATUS_LABELS } from './state.js';
import { el, mount, qs, toast, sheet, engineTag } from './ui.js';
import { renderPath } from './path.js';
import { initDemo } from './demo.js';

const state = loadState();
const lender = getLender(state);
const lo = getLO(state, state.session.loId) || state.los[0];
const link = `ready.harborhomeloans.com/${lo.code.split('-')[1]}`;
const smsBody = `Hi — it's ${lo.first} at ${lender.name}. Here's a 3-minute credit readiness check (no application, soft pull) with a plan built for you: https://${link}`;

const TABS = [['link', 'Your link'], ['feed', 'Status feed'], ['org', 'Organization']];
const current = () => { const k = (location.hash || '#link').slice(1); return TABS.some((t) => t[0] === k) ? k : 'link'; };

function nav() {
  const key = current();
  mount('#lo-tabs', TABS.map(([k, l]) => el('a', { href: `#${k}`, class: k === key ? 'active' : '' }, l)));
  mount('#lo-bottom', TABS.map(([k, l]) => el('a', { href: `#${k}`, class: k === key ? 'active' : '' }, l)));
  mount('#lo-user', el('span', {}, `${lo.first} ${lo.last} · ${lender.name}`), el('span', { class: 'avatar' }, lo.first[0] + lo.last[0]));
}

// ---------- your link ----------
function renderLink() {
  const copy = () => { navigator.clipboard?.writeText('https://' + link); toast('Link copied'); };
  const counts = el('div', { class: 'counts' }, [['Invited this month', state.org.invitesThisMonth], ['Enrolled', state.org.enrolledThisMonth], ['Review requested', state.org.reviewsThisMonth]].map(([l, v]) => el('div', { class: 'card' }, el('span', { class: 'small muted' }, l), el('b', { class: 'tabular' }, String(v)))));
  return el('div', { class: 'stack-6' },
    el('div', { class: 'stack-1' }, el('p', { class: 'kicker accent' }, `Good morning, ${lo.first}`), el('h1', { class: 'h1' }, 'Your link. Text it, print it, send it.'), el('p', { class: 'lead' }, 'Everyone who uses it stays attributed to you — branch, source, and all. You see status, never their report.')),
    el('div', { class: 'link-hero' },
      el('div', { class: 'card card-pad link-box' },
        el('div', { class: 'row-between wrap' }, el('span', { class: 'eyebrow' }, 'Your personal link'), el('span', { class: 'chip chip-round' }, `NMLS ${lo.nmls}`)),
        el('div', { class: 'link-url' }, el('code', {}, `https://${link}`), el('button', { class: 'btn btn-outline btn-sm', onclick: copy }, 'Copy')),
        el('div', { class: 'row wrap' },
          el('a', { class: 'btn btn-primary', href: `sms:?&body=${encodeURIComponent(smsBody)}` }, '💬 Text this to a client'),
          el('button', { class: 'btn btn-secondary', onclick: openInvite }, '✉ Send an invitation'),
          el('a', { class: 'btn btn-outline', href: `../check/?c=${lo.code}`, target: '_blank', rel: 'noopener' }, 'Preview my front door ↗')),
        el('div', { class: 'msg-preview' }, el('span', { class: 'small muted' }, 'What the text looks like'), el('div', { class: 'bubble' }, smsBody.replace('https://' + link, ''), el('div', { class: 'link-card', style: { marginTop: '8px' } }, el('div', { class: 'lc-img' }, `${lender.name} · ReadyIQ`), el('div', { class: 'lc-body' }, el('b', {}, 'Check your homebuyer credit readiness — 3 minutes, no application'), el('div', { class: 'muted' }, link))))),
        counts),
      el('div', { class: 'card card-pad qr' }, el('span', { class: 'eyebrow' }, 'Your QR code'), el('img', { src: `../assets/qr/${lo.code}.svg`, alt: `QR code for ${link}`, width: 180, height: 180 }), el('b', {}, link), el('span', { class: 'small muted' }, 'Scannable. Put it on a card, an open-house flyer, a slide.'), el('button', { class: 'btn btn-outline btn-sm', onclick: () => toast('Print-ready PDF opens here in the product') }, 'Print'))),
    el('div', { class: 'card card-soft card-pad row-between wrap' }, el('div', {}, el('b', {}, 'Not a CRM, on purpose.'), el('div', { class: 'small', style: { color: 'var(--brand-ink)' } }, 'ReadyIQ gives you a link, a status feed, and a review-requested alert. Notes, tasks, and pipeline live where they already do — your CRM gets our status through Zapier or a connector.')), el('a', { class: 'btn btn-outline btn-sm', href: '../integrations/' }, 'Integrations →')));
}

function openInvite() {
  const f = { first: '', last: '', email: '', mobile: '', branch: state.org.branches[0], source: 'Website', channel: 'Email + text', message: `Hi — I'm sending you a private ReadyIQ invitation so you can see where your credit stands and get a clear path forward. I'll stay connected as you make progress. — ${lo.first}` };
  const input = (label, key, attrs = {}) => el('label', { class: 'field' }, el('span', { class: 'label' }, label), el('input', { class: 'input', value: f[key], ...attrs, oninput: (e) => (f[key] = e.target.value.trim()) }));
  const select = (label, key, opts) => el('label', { class: 'field' }, el('span', { class: 'label' }, label), el('select', { class: 'input', onchange: (e) => (f[key] = e.target.value) }, opts.map((o) => el('option', { value: o, selected: f[key] === o }, o))));
  const body = el('div', { class: 'stack-3' },
    el('div', { class: 'row', style: { gap: '10px' } }, el('span', { class: 'avatar' }, lo.first[0] + lo.last[0]), el('div', {}, el('span', { class: 'small muted' }, 'Invitation owner'), el('div', {}, el('b', {}, `${lo.first} ${lo.last}`), ' · ', el('span', { class: 'small muted' }, 'Original LO protected ✓')))),
    el('div', { class: 'grid-2', style: { gap: '10px' } }, input('First name', 'first', { placeholder: 'Luis' }), input('Last name', 'last', { placeholder: 'Herrera' })),
    el('div', { class: 'grid-2', style: { gap: '10px' } }, input('Email', 'email', { type: 'email', placeholder: 'luis@example.com' }), input('Mobile', 'mobile', { type: 'tel', placeholder: '(510) 555-0171' })),
    el('div', { class: 'grid-3', style: { gap: '10px' } }, select('Branch', 'branch', state.org.branches), select('Lead source', 'source', ['Website', 'Agent referral', 'Open house', 'Past client', 'Purchased lead']), select('Send by', 'channel', ['Email + text', 'Email', 'Text'])),
    el('label', { class: 'field' }, el('span', { class: 'label' }, 'Personal message'), el('textarea', { class: 'input', oninput: (e) => (f.message = e.target.value) }, f.message)),
    el('p', { class: 'small muted' }, 'The consumer gets a co-branded invitation, three screens, three consents. You get status — never their report.'));
  const s = sheet({ title: 'Send an invitation', body, actions: [
    { label: 'Send invitation', kind: 'primary', onClick: () => { if (!f.first || !(f.email || f.mobile)) { toast('Name and email or mobile, please'); return false; } addInvite(state, { ...f, loId: lo.id }); saveState(state); toast(`Invitation sent to ${f.first} by ${f.channel.toLowerCase()}`); location.hash = '#feed'; render(); } },
    { label: 'Cancel', kind: 'ghost' }] });
}

// ---------- status feed ----------
function renderFeed() {
  const ui = (state.session.feedFilter = state.session.feedFilter || 'all');
  const mine = state.consumers.filter((c) => c.loId === lo.id);
  const cards = mine.map((c) => ({ c, s: statusCard(state, c.id) }));
  const pinned = cards.filter((x) => x.s.status === 'review_requested');
  const rest = cards.filter((x) => x.s.status !== 'review_requested').filter((x) => ui === 'all' || x.s.pathway === ui);
  const invites = state.invites.filter((i) => i.loId === lo.id);
  const filters = ['all', 'ready_now', 'near_ready', 'build', 'thin', 'dispute'];
  const row = ({ c, s }, pin) => {
    const spark = el('div', { class: 'spark' }); setTimeout(() => renderPath(spark, { variant: 'sparkline', nodes: c.milestones, animate: false }), 0);
    return el('div', { class: 'feed-row' + (pin ? ' pinned' : '') },
      el('div', {}, el('div', { class: 'name' }, s.name, el('span', { class: `badge badge-${s.pathway}` }, PATHWAY_LABELS[s.pathway]), s.guardian ? el('span', { class: 'chip', style: { height: '24px', fontSize: '11px' } }, '🛡 Guardian on') : null),
        el('div', { class: 'meta' }, pin ? `Review requested ${fmtDate(s.reviewRequestedAt)} — call ${c.first} to schedule` : `Round ${s.round} of ~${s.roundsEstimated} · ${s.nextMilestone ? 'next: ' + s.nextMilestone : STATUS_LABELS[s.status]}${s.eligibilityDate ? ' · FHA date ' + fmtDate(s.eligibilityDate) : ''} · last activity ${fmtDate(s.lastActivity)}`)),
      el('div', { class: 'row', style: { gap: '10px' } }, spark, el('div', { class: 'acts' }, el('a', { class: 'btn btn-outline btn-sm', href: `tel:${c.mobile.replace(/\D/g, '')}` }, 'Call'), el('a', { class: 'btn btn-outline btn-sm', href: `sms:${c.mobile.replace(/\D/g, '')}` }, 'Text'))));
  };
  return el('div', { class: 'stack-4' },
    el('div', { class: 'row-between wrap' }, el('div', { class: 'stack-1' }, el('p', { class: 'kicker accent' }, 'Status feed · read-only'), el('h1', { class: 'h1' }, 'Where your people are.'), el('p', { class: 'muted' }, 'Pathway, round, milestones, review requests. Never the report. Notes and tasks belong in your CRM.')), el('button', { class: 'btn btn-primary', onclick: openInvite }, '✉ Send an invitation')),
    el('div', { class: 'tabs' }, filters.map((f) => el('button', { class: ui === f ? 'active' : '', onclick: () => { state.session.feedFilter = f; saveState(state); render(); } }, f === 'all' ? `All ${cards.length}` : PATHWAY_LABELS[f]))),
    pinned.length ? el('div', { class: 'card feed-list' }, el('div', { class: 'row-between', style: { padding: '12px 16px', borderBottom: '1px solid var(--line-2)' } }, el('span', { class: 'eyebrow' }, 'Review requested'), el('span', { class: 'chip chip-round' }, `${pinned.length} waiting on you`)), pinned.map((x) => row(x, true))) : null,
    el('div', { class: 'card feed-list' }, el('div', { class: 'row-between', style: { padding: '12px 16px', borderBottom: '1px solid var(--line-2)' } }, el('span', { class: 'eyebrow' }, 'Working'), el('span', { class: 'small muted' }, `${rest.length} of ${cards.length}`)), rest.length ? rest.map((x) => row(x, false)) : el('div', { class: 'muted', style: { padding: '16px' } }, 'No one in this pathway right now.')),
    el('div', { class: 'card feed-list' }, el('div', { class: 'row-between', style: { padding: '12px 16px', borderBottom: '1px solid var(--line-2)' } }, el('span', { class: 'eyebrow' }, 'Invited · not enrolled yet'), el('span', { class: 'small muted' }, `${invites.length}`)),
      invites.map((i) => el('div', { class: 'feed-row' }, el('div', {}, el('div', { class: 'name' }, `${i.first} ${i.last}`, el('span', { class: 'pill' }, i.status)), el('div', { class: 'meta' }, `Invited ${fmtDate(i.invitedAt)} by ${i.channel.toLowerCase()} · ${i.source} · ${i.branch}`)), el('div', { class: 'acts' }, el('button', { class: 'btn btn-outline btn-sm', onclick: () => toast(`Reminder sent to ${i.first}`) }, 'Remind'))))),
    el('p', { class: 'small muted' }, 'Consumers control what you see. A review request shares a status packet — pathway, floors met, DTI estimate, rent months, disputes closed — with consent for the hard pull when you talk.'));
}

// ---------- organization ----------
function renderOrg() {
  const prod = (p) => el('div', { class: 'prod-row' }, el('span', { class: 'step-num' }, p.engine === 'MyScoreIQ' ? 'M' : 'C'), el('div', {}, el('b', {}, p.name), el('div', { class: 'small muted' }, `${p.desc} · ${p.engine}`)),
    el('span', { class: 'seg' }, ['lender', 'consumer'].map((m) => el('button', { class: p.mode === m ? 'on' : '', onclick: () => { p.mode = m; saveState(state); render(); } }, m === 'lender' ? 'Lender-sponsored' : 'Consumer-paid'))),
    el('button', { class: 'switch', role: 'switch', 'aria-checked': String(p.on), onclick: (e) => { p.on = !p.on; e.currentTarget.setAttribute('aria-checked', String(p.on)); saveState(state); } }));
  return el('div', { class: 'stack-4' },
    el('div', { class: 'stack-1' }, el('p', { class: 'kicker accent' }, 'Organization'), el('h1', { class: 'h1' }, `${lender.name} owns the program.`), el('p', { class: 'muted' }, 'Brand, routing, products, consent copy, connections. That’s the whole admin — everything else stays in your CRM.')),
    el('div', { class: 'org-grid' },
      el('div', { class: 'card card-pad stack-3' }, el('div', { class: 'row-between' }, el('span', { class: 'eyebrow' }, 'Brand'), el('button', { class: 'link-btn small', onclick: () => toast('Brand editor opens here in the product') }, 'Edit')),
        el('div', { class: 'row' }, el('span', { class: 'brand-mark', style: { background: lender.brand.primary } }, lender.name[0]), el('div', {}, el('b', {}, lender.name), el('div', { class: 'small muted' }, `Pulled from ${lender.site} · NMLS ${lender.nmls}`)), el('span', { class: 'row', style: { marginLeft: 'auto', gap: '6px' } }, el('i', { class: 'swatch', style: { background: lender.brand.primary, width: '24px', height: '24px', borderRadius: '7px', display: 'block' } }), el('i', { style: { background: lender.brand.soft, width: '24px', height: '24px', borderRadius: '7px', display: 'block', border: '1px solid var(--line-2)' } }))),
        el('div', { class: 'card', style: { padding: '12px 14px', background: 'var(--paper-2)' } }, el('span', { class: 'small muted' }, 'Organization invitation link'), el('div', { class: 'row-between' }, el('code', { style: { fontFamily: 'ui-monospace, Menlo, Consolas, monospace' } }, 'ready.harborhomeloans.com/start'), el('button', { class: 'btn btn-outline btn-sm', onclick: () => { navigator.clipboard?.writeText('https://ready.harborhomeloans.com/start'); toast('Copied'); } }, 'Copy'))), el('p', { class: 'small muted' }, 'Dynamic links preserve loan officer, branch, campaign and lead-source attribution.')),
      el('div', { class: 'card card-pad stack-3' }, el('span', { class: 'eyebrow' }, 'Routing'),
        el('label', { class: 'field' }, el('span', { class: 'label' }, 'Default assignment'), el('select', { class: 'input' }, ['Route by invitation owner (never unassigned)', 'Round-robin within branch', 'Named LO per campaign'].map((o) => el('option', {}, o)))),
        el('label', { class: 'field' }, el('span', { class: 'label' }, 'Directional FICO® floors shown to consumers'), el('div', { class: 'grid-3', style: { gap: '8px' } }, lender.programs.map((p) => el('div', { class: 'card', style: { padding: '10px 12px' } }, el('span', { class: 'small muted' }, p.name), el('b', { style: { display: 'block' } }, String(p.floor)))))),
        el('p', { class: 'small muted' }, 'Floors are directional — they shape the pathway and the trigger. Qualification is yours, on the real mortgage report.')),
      el('div', { class: 'card card-pad stack-2', style: { gridColumn: '1 / -1' } }, el('div', { class: 'row-between' }, el('span', { class: 'eyebrow' }, 'Consumer product configuration'), el('span', { class: 'chip chip-round' }, `${state.org.products.filter((p) => p.on).length} products on`)), el('div', {}, state.org.products.map(prod)), el('p', { class: 'small muted' }, 'Sponsor a product and consumers never see a price. Consumer-paid products enroll through IDIQ with one-tap cancellation.')),
      el('div', { class: 'card card-pad stack-2' }, el('span', { class: 'eyebrow' }, 'Consent copy consumers see'), ['Let ReadyIQ pull my credit for my own review.', 'Share my status — never my report — with my loan officer.', 'Text me.', 'You can apply for a mortgage at any time — this is not required.'].map((t) => el('div', { class: 'row' }, el('span', { class: 'tick' }, '✓'), el('span', { class: 'small' }, t))), el('button', { class: 'link-btn small', style: { justifySelf: 'start' }, onclick: () => toast('Compliance review opens here in the product') }, 'Request wording change')),
      el('div', { class: 'card card-pad stack-2' }, el('div', { class: 'row-between' }, el('span', { class: 'eyebrow' }, 'Connections'), el('a', { class: 'link-btn small', href: '../integrations/' }, 'Integrations →')), state.org.connectors.map((k) => el('div', { class: 'row-between' }, el('span', {}, k.name), el('span', { class: 'chip' + (k.status === 'connected' ? ' chip-round' : '') }, k.status === 'connected' ? '● connected' : 'available'))), engineTag('MyScoreIQ + CreditBuilderIQ'))));
}

const RENDER = { link: renderLink, feed: renderFeed, org: renderOrg };
function render() { nav(); document.title = `${TABS.find((t) => t[0] === current())[1]} — ReadyIQ for loan officers`; mount('#view', RENDER[current()]()); window.scrollTo({ top: 0 }); }
addEventListener('hashchange', render);
render();
initDemo();
