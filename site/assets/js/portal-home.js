// site/assets/js/portal-home.js — Home v2: greeting → number (ring) beside path → next action → toolkit → LO card.
import { PATHWAY_LABELS, PATHWAY_BLURBS, fmtDate, packet } from './state.js';
import { el, engineTag, regB, countUp, ringGauge } from './ui.js';
import { renderPath } from './path.js';

const HOUR = new Date().getHours();
const greeting = HOUR < 12 ? 'Good morning' : HOUR < 17 ? 'Good afternoon' : 'Good evening';

export function numberBlock(c, { animate = true, compact = false } = {}) {
  const s = c.score;
  const d = s.value != null && s.prev != null ? s.value - s.prev : 0;
  const delta = s.value == null ? null : el('a', { class: `number-delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}`, href: '#progress', title: 'See why it moved' }, d > 0 ? `↑ ${d}` : d < 0 ? `↓ ${Math.abs(d)}` : '— no change', el('span', { style: { fontWeight: 500, opacity: .8 } }, ' since last check'));
  const bureaus = s.value == null || compact ? null : el('div', { class: 'number-bureaus' },
    Object.entries(s.bureaus).map(([k, v]) => el('span', {}, k[0].toUpperCase() + k.slice(1), el('b', {}, v ?? '—'))));
  const ring = ringGauge({ value: s.value, label: s.value == null ? 'no score yet' : 'FICO® Score' });
  if (s.value != null && animate) { const b = ring.querySelector('b'); b.textContent = String(s.prev ?? s.value); setTimeout(() => countUp(b, s.prev ?? s.value, s.value, 1100), 200); }
  return el('div', { class: 'card card-pad number' },
    el('div', { class: 'number-with-ring' }, ring,
      el('div', { class: 'stack-2' },
        el('div', { class: 'row wrap' }, el('span', { class: 'eyebrow' }, s.value == null ? 'Your number' : 'Your number'), delta),
        el('p', { class: 'number-caption' }, s.value == null
          ? `Not enough history for a score yet — here's how we build one, starting with rent.`
          : 'FICO® Score — not the mortgage-industry version lenders pull. A guide, not a preapproval.'),
        el('div', { class: 'number-meta' }, el('span', {}, `Updated ${fmtDate(s.updated)}`), engineTag(s.value == null ? 'CreditBuilderIQ' : 'MyScoreIQ')))),
    bureaus);
}

export function renderHome(ctx) {
  const c = ctx.c, lo = ctx.lo, p = packet(ctx.state, c.id);
  const path = el('div');
  setTimeout(() => renderPath(path, { nodes: c.milestones }), 0);
  const requested = c.status === 'review_requested';
  const inFile = c.status === 'applied' || c.status === 'handed_off';
  const openDisputes = c.disputes.filter((d) => d.status !== 'resolved').length;
  const done = c.milestones.filter((m) => m.state === 'done').length;
  const nextMs = c.milestones.find((m) => m.state === 'upcoming');
  const tool = (href, ico, tone, title, status) => el('a', { href }, el('span', { class: `ico ${tone}` }, ico), el('b', {}, title), el('small', {}, status));
  return el('div', { class: 'home-hero' },
    c.guardian ? el('div', { class: 'banner banner-guardian' }, el('span', { class: 'icon' }, '🛡'),
      el('div', {}, el('b', {}, 'Your loan file is active — Guardian is on.'), el('div', { class: 'muted small' }, `Dispute suggestions are paused. Ask ${lo.first} before you open, close, or pay off anything.`)),
      el('a', { href: '#guardian' }, 'Open →')) : null,
    el('div', { class: 'view-head' },
      el('p', { class: 'eyebrow' }, `${greeting}, ${c.first}`),
      el('div', { class: 'greet' }, el('h1', { class: 'h2' }, 'Your path'), el('span', { class: `badge badge-${c.pathway}` }, PATHWAY_LABELS[c.pathway]), el('span', { class: 'chip chip-round' }, `Round ${c.round} of ~${c.roundsEstimated}`)),
      el('p', { class: 'muted' }, PATHWAY_BLURBS[c.pathway])),
    el('div', { class: 'home-two' },
      numberBlock(c),
      el('div', { class: 'card card-pad stack-2', style: { display: 'grid', alignContent: 'space-between' } },
        el('div', { class: 'row-between' }, el('p', { class: 'eyebrow' }, 'Your path'), el('span', { class: 'small muted' }, `${done} of ${c.milestones.length} milestones`)),
        path,
        el('p', { class: 'small muted' }, nextMs ? `Next milestone: ${nextMs.label}${nextMs.date ? ` · ${fmtDate(nextMs.date)}` : ''}` : 'Every milestone reached.'))),
    el('div', { class: 'card card-pad next-action card-enter stack-2' },
      el('p', { class: 'eyebrow' }, 'Next action'),
      el('h2', { class: 'h3' }, c.nextAction.title),
      el('p', { class: 'muted' }, c.nextAction.detail),
      el('div', { class: 'row-between wrap' }, engineTag(c.nextAction.engine), el('a', { class: 'btn btn-secondary btn-sm', href: c.nextAction.href }, 'Open ', el('span', { class: 'arrow' }, '→')))),
    el('div', { class: 'stack-2' },
      el('div', { class: 'row-between' }, el('p', { class: 'eyebrow' }, 'Your toolkit'), el('span', { class: 'small muted' }, 'MyScoreIQ + CreditBuilderIQ')),
      el('div', { class: 'toolkit' },
        tool('#plan', '✓', 'tone-purple', 'Plan', `Round ${c.round} · ${PATHWAY_LABELS[c.pathway]}`),
        tool('#disputes', '◇', 'tone-coral', 'Disputes', c.guardian ? 'Paused — file active' : openDisputes ? `${openDisputes} open` : 'Nothing flagged'),
        tool('#build', '⌂', 'tone-mint', 'Build history', c.rentReporting.backfilled ? `${c.rentReporting.monthsAvailable} months reporting` : c.rentReporting.linked ? `${c.rentReporting.monthsAvailable} months found` : 'Link your bank'),
        tool('#progress', '↗', 'tone-gold', 'Progress', c.score.value == null ? 'No score yet' : `${c.score.value} · ${c.deltas.length ? (c.score.value - c.score.prev >= 0 ? '+' : '') + (c.score.value - c.score.prev) : 'steady'}`))),
    el('div', { class: 'card card-pad lo-connect' },
      el('div', { class: 'lo-card' }, el('span', { class: 'avatar avatar-lg' }, lo.first[0] + lo.last[0]),
        el('div', { class: 'stack-1' }, el('p', { class: 'eyebrow' }, 'Your lender connection'), el('h2', { class: 'h3' }, `${lo.first} ${lo.last} is still with you.`), el('p', { class: 'muted small' }, `${ctx.lender.name} · NMLS ${lo.nmls}. ${lo.first} sees your milestones — never your report — and is told the day you're ready.`))),
      el('div', { class: 'row wrap', style: { marginTop: '14px' } },
        inFile ? el('a', { class: 'btn btn-outline', href: '#guardian' }, `Application in progress · Guardian on`)
          : requested ? el('a', { class: 'btn btn-secondary', href: '#review' }, `Review requested ${fmtDate(c.reviewRequestedAt)} ✓`)
          : el('a', { class: 'btn btn-primary', href: '#review' }, 'Request review ', el('span', { class: 'arrow' }, '→')),
        el('a', { class: 'btn btn-ghost', href: `sms:${lo.mobile.replace(/\D/g, '')}` }, `Message ${lo.first}`)),
      el('p', { class: 'reg-b', style: { marginTop: '10px' } }, 'You can apply for a mortgage at any time — this is not required.')));
}
