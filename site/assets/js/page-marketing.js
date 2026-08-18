// site/assets/js/page-marketing.js — the ReadyIQ website: product-suite tabs, live hero window, org UI, event stream.
import { fixtures, statusCard, PATHWAY_LABELS } from './state.js';
import { el, mount, qs, ringGauge, countUp } from './ui.js';
import { renderPath } from './path.js';
import { initDemo } from './demo.js';

const state = fixtures();
const maria = state.consumers.find((c) => c.id === 'maria');

// hero window
qs('#hero-ring').append(ringGauge({ value: 611, label: 'FICO® Score', size: 104, stroke: 8 }));
setTimeout(() => countUp(qs('#hero-ring b'), 611, 625, 1200), 800);
renderPath('#hero-path', { nodes: maria.milestones.slice(0, 5) });
qs('#phone-ring').append(ringGauge({ value: 625, label: 'FICO®', size: 84, stroke: 7 }));

// logos
mount('#logos', [['TE', 'Total Expert'], ['B', 'Blend'], ['E', 'Encompass'], ['S', 'Shape'], ['SF', 'Salesforce'], ['LH', 'LenderHomePage'], ['Z', 'Zapier']].map(([i, n]) => el('b', {}, el('i', {}, i), n)));

// product suite tabs
const window_ = (title, ...body) => el('div', { class: 'window' }, el('div', { class: 'window-bar' }, el('i'), title), el('div', { class: 'window-body' }, ...body));
const SUITE = [
  { id: 'dispute', label: 'Dispute Hub', num: '01 · Flagship', h: 'Find it. Dispute it. Track it — in one guided hub.', p: 'CreditBuilderIQ flags items that may deserve review. The consumer — not the lender — confirms what is inaccurate, picks the reason, and approves a bureau-ready letter. Priority goes to what blocks a mortgage.',
    bullets: [['Mortgage-priority flags', 'Wrong payment amounts that inflate DTI, duplicates, recent lates, collections, dates, accounts that aren’t theirs.'], ['Four guided steps', 'Review item → choose reason → build letter → track response. Nothing is disputed automatically.'], ['Sequenced to finish before review', 'One 30-day clock so letters close together — and paused while a loan file is active.']],
    href: 'portal/#disputes', cta: 'Open the Dispute Hub',
    win: () => window_('ReadyIQ Dispute Hub · Harbor Home Loans',
      el('div', { class: 'grid-4', style: { gap: '8px' } }, [['Flagged', '2'], ['Drafts', '1'], ['Sent', '1'], ['Next due', 'Sep 8']].map(([l, v]) => el('div', { class: 'card', style: { padding: '10px 12px' } }, el('span', { class: 'small muted' }, l), el('b', { style: { display: 'block', fontSize: '18px' } }, v)))),
      el('div', { class: 'tabs steps-tabs', style: { padding: '4px' } }, ['Review item', 'Choose reason', 'Build letter', 'Track'].map((t, i) => el('button', { class: i === 2 ? 'active' : '', style: { height: '32px', fontSize: '12px' } }, t))),
      el('div', { class: 'card', style: { padding: '12px 14px', display: 'grid', gap: '6px' } }, el('span', { class: 'chip chip-outline', style: { justifySelf: 'start' } }, 'Wrong payment amount'), el('b', {}, 'Navient shows $412/mo — loan is in deferment, actual $0'), el('span', { class: 'small muted' }, 'Inflates DTI by $412/mo · Experian + TransUnion + Equifax'), el('div', { class: 'row', style: { marginTop: '4px' } }, el('span', { class: 'pill pill-draft' }, 'draft'), el('span', { class: 'small', style: { color: 'var(--teal-ink)', fontWeight: 620 } }, 'Custom letter ready → Approve & mark sent')))) },
  { id: 'rent', label: 'Rent & bills', num: '02 · Positive history', h: 'Turn rent and everyday payments into history.', p: 'Through CreditBuilderIQ, consumers link the account they pay rent from — read-only — and report on-time rent and utilities to all three bureaus, with up to 24 months of history. Twelve months of on-time rent in bank data can also count directly with the lender.',
    bullets: [['Rent reporting, 24 months back', 'On-time payments only. Missed months are never reported.'], ['Utilities and everyday bills', 'Gas, electric, water, phone — pick the ones you pay on time.'], ['A nontraditional credit file lenders accept', 'Rent plus two utilities is how a no-score renter becomes a file DU can read.']],
    href: 'portal/#build', cta: 'Explore build history',
    win: () => window_('Build history · CreditBuilderIQ',
      el('div', { class: 'card', style: { padding: '14px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '14px', alignItems: 'center' } }, ringGauge({ value: 850, min: 0, max: 850, label: '24 of 24', size: 84, stroke: 7 }), el('div', {}, el('b', {}, '24 on-time rent payments found'), el('div', { class: 'small muted' }, 'Harbor Pointe Apartments · $1,840/mo · linked read-only via MX'), el('div', { class: 'row', style: { marginTop: '6px' } }, el('span', { class: 'pill pill-resolved' }, 'ready to report')))),
      el('div', { class: 'row wrap' }, ['✓ Gas', '✓ Electric', '+ Water', '+ Phone'].map((t) => el('span', { class: 'chip' + (t.startsWith('✓') ? ' chip-round' : '') }, t))),
      el('p', { class: 'small muted' }, 'Reported rent adds history to all three bureaus. Twelve months of on-time rent in bank data can also count directly with your lender (DU rent history).')) },
  { id: 'plan', label: 'Build the plan', num: '03 · Personalized plan', h: 'Know what to work on — in the order underwriting cares.', p: 'Payment history, derogatories, utilization, inquiries, DTI computed from the report, thin-file steps — one next action at a time. If a waiting period applies, the plan works backward from the date.',
    bullets: [['One next action', 'Never a dashboard of twelve widgets. One thing to do, and why.'], ['The eligibility clock', '“FHA-eligible March 12, 2027.” A date, not a score.'], ['Guardian', 'When a loan file goes active: disputes paused, ask-before-you-act, a closing checklist, alerts to the LO.']],
    href: 'portal/#plan', cta: 'View the plan',
    win: () => window_('Your plan · Round 2 of ~5',
      el('div', { class: 'card next-action', style: { padding: '12px 14px 12px 18px', display: 'grid', gap: '4px' } }, el('span', { class: 'eyebrow', style: { fontSize: '10px' } }, 'Next action'), el('b', {}, 'Pay Capital One below 30% before the 22nd'), el('span', { class: 'small muted' }, 'The fastest lever you have this round.')),
      el('div', { class: 'card', style: { padding: '12px 14px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'center' } }, ringGauge({ value: 372, min: 0, max: 730, label: '206 days', size: 84, stroke: 7 }), el('div', {}, el('span', { class: 'eyebrow', style: { fontSize: '10px' } }, 'The clock'), el('b', { style: { display: 'block' } }, 'FHA · Mar 12, 2027'), el('span', { class: 'small muted' }, 'Conventional · Mar 12, 2029 · earliest eligibility, subject to lender review'))),
      el('div', { class: 'row wrap' }, ['Payment history ✓', 'Utilization 41% → 30%', 'Inquiries 1', 'DTI 31%'].map((t) => el('span', { class: 'chip' }, t)))) },
  { id: 'track', label: 'Track & learn', num: '04 · Score center & progress', h: 'See the number, understand every point, track the work.', p: 'MyScoreIQ powers a 3-bureau FICO® Score labeled honestly, daily monitoring, and every movement reconciled to a cause. Progress shows rounds and milestones — never a “readiness percentage.”',
    bullets: [['The number, honestly', 'FICO® Score — not the mortgage-industry version lenders pull. A guide, not a preapproval.'], ['Why it moved', '“+14 — utilization down, Capital One paid.” Every point, tied to a cause.'], ['Protected homebuying', 'Dark-web and SSN monitoring, insurance and restoration, wire-fraud coaching at closing.']],
    href: 'portal/#progress', cta: 'See progress',
    win: () => window_('Progress · MyScoreIQ',
      el('div', { class: 'card', style: { padding: '14px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '14px', alignItems: 'center' } }, ringGauge({ value: 625, label: 'FICO® Score', size: 96, stroke: 8 }), el('div', { class: 'stack-1' }, el('span', { class: 'number-delta up', style: { justifySelf: 'start' } }, '↑ 14 since last check'), el('div', { class: 'small' }, '+14 Utilization down — Capital One paid to $210'), el('div', { class: 'small' }, '+6 Lates aging — now 14 months old'), el('div', { class: 'small' }, '−6 New inquiry — Honda Financial'))),
      el('div', { class: 'card', style: { padding: '10px 14px' } }, el('div', { id: 'track-path' }))) },
];
let active = 'dispute';
function drawSuite() {
  mount('#suite-tabs', SUITE.map((s) => el('button', { class: s.id === active ? 'active' : '', role: 'tab', 'aria-selected': String(s.id === active), onclick: () => { active = s.id; drawSuite(); } }, s.label)));
  const s = SUITE.find((x) => x.id === active);
  mount('#suite-panel', el('div', { class: 'suite-panel card-enter' },
    el('div', { class: 'suite-copy' }, el('p', { class: 'kicker accent' }, s.num), el('h3', { class: 'h2' }, s.h), el('p', { class: 'muted' }, s.p),
      el('ul', {}, s.bullets.map(([b, t]) => el('li', {}, el('i', {}, '✓'), el('span', {}, el('b', {}, b), t)))),
      el('a', { class: 'btn btn-primary', href: s.href, style: { justifySelf: 'start' } }, s.cta, ' ', el('span', { class: 'arrow' }, '→'))),
    s.win()));
  if (active === 'track') setTimeout(() => renderPath('#track-path', { nodes: maria.milestones }), 0);
}
drawSuite();

// modules
const MODULES = [
  ['◇', 'tone-coral', 'Dispute Hub', 'Flag potential inaccuracies, build guided letters, track bureau responses. Priority by mortgage impact.', 'CreditBuilderIQ'],
  ['◎', 'tone-purple', 'Credit report review', 'Monthly 3-bureau reports with flagged items and plain-language explanations.', 'CreditBuilderIQ'],
  ['⌂', 'tone-mint', 'Rent & utility reporting', 'Report on-time rent and bills to all three bureaus, up to 24 months back.', 'CreditBuilderIQ'],
  ['✓', 'tone-gold', 'Personalized plan', 'One next action, in the order underwriting cares — with the eligibility clock and DTI.', 'CreditBuilderIQ'],
  ['↗', 'tone-blue', 'Score center & progress', '3-bureau FICO® Score, daily monitoring, every point tied to a cause.', 'MyScoreIQ'],
  ['🛡', 'tone-lime', 'Guardian & protection', 'Ask-before-you-act during a loan file, closing checklist, identity protection and restoration.', 'MyScoreIQ'],
];
mount('#modules', MODULES.map(([i, tone, t, p, eng], k) => el('div', { class: 'card card-pad card-hover' + (k === 0 ? ' featured' : '') }, el('span', { class: `ico ${tone}` }, i), el('h3', { class: 'h3' }, t), el('p', { class: 'muted' }, p), el('span', { class: 'engine-tag' }, `Powered by ${eng}`))));

// org UI (thin — not a CRM)
const feed = ['priya', 'denise', 'maria'].map((id) => statusCard(state, id));
mount('#org-ui',
  el('div', { class: 'card card-pad', style: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', color: 'var(--ink)' } }, el('div', {}, el('span', { class: 'eyebrow' }, 'Sarah Miller · your link'), el('div', { style: { fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '13px' } }, 'ready.harborhomeloans.com/smiller')), el('span', { class: 'btn btn-primary btn-sm' }, 'Text this to a client')),
  el('div', { class: 'card', style: { color: 'var(--ink)' } }, el('div', { class: 'row-between', style: { padding: '12px 16px', borderBottom: '1px solid var(--line-2)' } }, el('span', { class: 'eyebrow' }, 'Status feed · read-only'), el('span', { class: 'chip chip-round' }, '1 review requested')),
    feed.map((f) => el('div', { class: 'status-card', style: { borderTop: '1px solid var(--line-2)' } }, el('div', {}, el('div', { class: 'name' }, f.name, ' ', el('span', { class: `badge badge-${f.pathway}` }, PATHWAY_LABELS[f.pathway])), el('div', { class: 'meta' }, f.status === 'review_requested' ? `Review requested · ${f.reviewRequestedAt}` : `Round ${f.round} of ~${f.roundsEstimated} · next: ${f.nextMilestone}`)), el('span', { class: 'small muted' }, f.status === 'review_requested' ? '↗ Call' : '')))),
  el('div', { class: 'card card-pad', style: { color: 'var(--ink)', display: 'grid', gap: '8px' } }, el('span', { class: 'eyebrow' }, 'Product configuration'), ...[['Dispute Hub', 'Lender-sponsored'], ['Rent & utility reporting', 'Consumer-paid'], ['Protected homebuying', 'Lender-sponsored']].map(([n, m]) => el('div', { class: 'row-between' }, el('span', {}, n), el('span', { class: 'row' }, el('span', { class: 'small muted' }, m), el('span', { class: 'switch', 'aria-checked': 'true', role: 'switch' }))))));

// event stream
const EVENTS = [['10:42:18', 'ReadyIQ', 'review.requested', 'Total Expert', 'Delivered'], ['10:38:05', 'CreditBuilderIQ', 'progress.milestone_reached', 'Shape', 'Delivered'], ['10:21:44', 'Blend', 'consumer.application_started', 'ReadyIQ', 'Received'], ['09:55:12', 'Encompass', 'loan.file_active → protect_mode.activated', 'ReadyIQ', 'Received'], ['09:31:07', 'MyScoreIQ', 'readiness.trigger', 'Zapier → HubSpot', 'Delivered']];
mount('#events', el('div', {}, el('span', {}, 'Time'), el('span', {}, 'Source'), el('span', {}, 'Event'), el('span', {}, 'Destination'), el('span', {}, 'Status')),
  EVENTS.map((e) => el('div', {}, el('span', { class: 'tabular' }, e[0]), el('span', {}, e[1]), el('code', {}, e[2]), el('span', {}, e[3]), el('span', { class: 'ok' }, `✓ ${e[4]}`))));

initDemo();
