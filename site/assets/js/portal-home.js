// site/assets/js/portal-home.js — the portal home: number, path, one next action.
import { PATHWAY_LABELS, PATHWAY_BLURBS, fmtDate } from './state.js';
import { el, engineTag, regB, countUp } from './ui.js';
import { renderPath } from './path.js';

const HOUR = new Date().getHours();
const greeting = HOUR < 12 ? 'Good morning' : HOUR < 17 ? 'Good afternoon' : 'Good evening';

export function numberBlock(c, { animate = true, compact = false } = {}) {
  const s = c.score;
  const val = el('span', { class: 'number-value' + (s.value == null ? ' none' : '') }, s.value == null ? 'No score yet' : (animate ? String(s.prev ?? s.value) : String(s.value)));
  if (s.value != null && animate) setTimeout(() => countUp(val, s.prev ?? s.value, s.value, 1100), 200);
  const d = s.value != null && s.prev != null ? s.value - s.prev : 0;
  const delta = s.value == null ? null : el('a', { class: `number-delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}`, href: '#number', title: 'Why it moved' }, d > 0 ? `↑ ${d}` : d < 0 ? `↓ ${Math.abs(d)}` : '— no change', ' ', el('span', { class: 'muted', style: { fontWeight: 500 } }, 'since last check'));
  const bureaus = s.value == null ? null : el('div', { class: 'number-bureaus' },
    Object.entries(s.bureaus).map(([k, v]) => el('span', {}, k[0].toUpperCase() + k.slice(1), el('b', {}, v ?? '—'))));
  return el('div', { class: 'card card-pad number' },
    el('div', { class: 'number-top' }, val, delta),
    el('p', { class: 'number-caption' }, s.value == null
      ? `Not enough history for a score yet — here's how we build one, starting with rent.`
      : 'FICO® Score — not the mortgage-industry version lenders pull. A guide, not a preapproval.'),
    el('div', { class: 'number-meta' }, el('span', {}, `Updated ${fmtDate(s.updated)}`), engineTag(s.value == null ? 'CreditBuilderIQ' : 'MyScoreIQ')),
    compact ? null : bureaus);
}

export function renderHome(ctx) {
  const c = ctx.c, lo = ctx.lo;
  const path = el('div');
  setTimeout(() => renderPath(path, { nodes: c.milestones }), 0);
  const requested = c.status === 'review_requested';
  const inFile = c.status === 'applied' || c.status === 'handed_off';
  return el('div', { class: 'home-hero' },
    c.guardian ? el('div', { class: 'banner banner-guardian' }, el('span', { class: 'icon' }, '🛡'),
      el('div', {}, el('b', {}, 'Your loan file is active — Guardian is on.'), el('div', { class: 'muted small' }, `Dispute suggestions are paused. Ask ${lo.first} before you open, close, or pay off anything.`)),
      el('a', { href: '#guardian' }, 'Open →')) : null,
    el('div', { class: 'view-head' },
      el('p', { class: 'eyebrow' }, `${greeting}, ${c.first}`),
      el('div', { class: 'greet' }, el('h1', { class: 'h2' }, 'Your path'), el('span', { class: `badge badge-${c.pathway}` }, PATHWAY_LABELS[c.pathway]), el('span', { class: 'chip chip-round' }, `Round ${c.round} of ~${c.roundsEstimated}`)),
      el('p', { class: 'muted' }, PATHWAY_BLURBS[c.pathway])),
    numberBlock(c),
    el('div', { class: 'card card-pad stack-2' }, el('div', { class: 'row-between' }, el('p', { class: 'eyebrow' }, 'Your path'), el('span', { class: 'small muted' }, `${c.milestones.filter((m) => m.state === 'done').length} of ${c.milestones.length} milestones`)), path),
    el('div', { class: 'card card-pad next-action card-enter stack-2' },
      el('p', { class: 'eyebrow' }, 'Next action'),
      el('h2', { class: 'h3' }, c.nextAction.title),
      el('p', { class: 'muted' }, c.nextAction.detail),
      el('div', { class: 'row-between wrap' }, engineTag(c.nextAction.engine), el('a', { class: 'btn btn-secondary btn-sm', href: c.nextAction.href }, 'Open ', el('span', { class: 'arrow' }, '→')))),
    el('div', { class: 'home-cta' },
      inFile ? el('a', { class: 'btn btn-outline btn-lg btn-block', href: '#guardian' }, `Application in progress with ${lo.first} · Guardian on`)
        : requested ? el('a', { class: 'btn btn-secondary btn-lg btn-block', href: '#review' }, `Review requested ${fmtDate(c.reviewRequestedAt)} · ${lo.first} has your packet`)
        : el('a', { class: 'btn btn-primary btn-lg btn-block', href: '#review' }, 'Request review ', el('span', { class: 'arrow' }, '→')),
      regB()),
    el('form', { class: 'card ask-bar', onsubmit: (e) => { e.preventDefault(); const q = e.target.q.value.trim(); ctx.state.session.askDraft = q; ctx.save(); ctx.go('#ask'); } },
      el('input', { name: 'q', placeholder: `Ask ReadyIQ — “why did my score move?”`, 'aria-label': 'Ask ReadyIQ' }),
      el('button', { class: 'btn btn-primary btn-sm', type: 'submit' }, 'Ask')));
}
