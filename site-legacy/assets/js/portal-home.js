// site/assets/js/portal-home.js — Home v3: hero panel (greeting + the number) → the path → one next action → toolkit → LO card.
import { PATHWAY_LABELS, PATHWAY_BLURBS, fmtDate } from './state.js';
import { el, engineTag, regB, countUp, ringGauge } from './ui.js';
import { renderPath } from './path.js';
import { icon } from './icons.js';

const HOUR = new Date().getHours();
const greeting = HOUR < 12 ? 'Good morning' : HOUR < 17 ? 'Good afternoon' : 'Good evening';

/** The number: ring + delta + honest caption + bureau pills. Used on Home (hero) and Progress. */
export function numberBlock(c, { animate = true, size = 156 } = {}) {
  const s = c.score;
  const d = s.value != null && s.prev != null ? s.value - s.prev : 0;
  const ring = ringGauge({ value: s.value, label: s.value == null ? 'no score yet' : 'FICO® Score', size, stroke: Math.round(size * 0.075) });
  if (s.value != null && animate) { const b = ring.querySelector('b'); b.textContent = String(s.prev ?? s.value); setTimeout(() => countUp(b, s.prev ?? s.value, s.value, 1100), 200); }
  const delta = s.value == null ? null : el('a', { class: `number-delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}`, href: '#progress', title: 'See why it moved' }, d > 0 ? `↑ ${d}` : d < 0 ? `↓ ${Math.abs(d)}` : '— no change', el('span', { style: { fontWeight: 500, opacity: .8 } }, ' since last check'));
  const bureaus = s.value == null ? null : el('div', { class: 'bureau-pills' },
    Object.entries(s.bureaus).map(([k, v]) => el('span', { class: 'bureau-pill' }, el('small', {}, k[0].toUpperCase() + k.slice(1)), el('b', {}, v ?? '—'))));
  return el('div', { class: 'number-hero' }, ring,
    el('div', { class: 'number-copy' },
      el('div', { class: 'row wrap' }, el('span', { class: 'kicker accent' }, 'Your number'), delta),
      el('p', { class: 'number-caption' }, s.value == null
        ? 'Not enough history for a score yet — here’s how we build one, starting with rent.'
        : 'FICO® Score — not the mortgage-industry version lenders pull. A guide, not a preapproval.'),
      el('div', { class: 'number-meta' }, el('span', {}, `Updated ${fmtDate(s.updated)}`), engineTag(s.value == null ? 'CreditBuilderIQ' : 'MyScoreIQ')),
      bureaus));
}

export function renderHome(ctx) {
  const c = ctx.c, lo = ctx.lo;
  const path = el('div');
  setTimeout(() => renderPath(path, { nodes: c.milestones }), 0);
  const requested = c.status === 'review_requested';
  const inFile = c.status === 'applied' || c.status === 'handed_off';
  const openDisputes = c.disputes.filter((d) => d.status !== 'resolved').length;
  const done = c.milestones.filter((m) => m.state === 'done').length;
  const nextMs = c.milestones.find((m) => m.state === 'upcoming');
  const tool = (href, ico, tone, title, status) => el('a', { href, class: 'tool' }, el('span', { class: `ico ${tone}` }, icon(ico, 18)), el('b', {}, title), el('small', {}, status));
  return el('div', { class: 'home-hero' },
    c.guardian ? el('div', { class: 'banner banner-guardian' }, el('span', { class: 'icon' }, icon('shield', 18)),
      el('div', {}, el('b', {}, 'Your loan file is active — Guardian is on.'), el('div', { class: 'muted small' }, `Dispute suggestions are paused. Ask ${lo.first} before you open, close, or pay off anything.`)),
      el('a', { href: '#guardian' }, 'Open →')) : null,
    // hero panel: greeting + the number
    el('section', { class: 'hero-panel card-enter' },
      el('div', { class: 'hero-panel-copy' },
        el('p', { class: 'kicker accent' }, `${greeting}, ${c.first}`),
        el('h1', { class: 'h1' }, 'Your path to ', el('em', {}, 'ready.')),
        el('div', { class: 'greet' }, el('span', { class: `badge badge-${c.pathway}` }, PATHWAY_LABELS[c.pathway]), el('span', { class: 'chip chip-round' }, `Round ${c.round} of ~${c.roundsEstimated}`), el('span', { class: 'chip' }, `${done} of ${c.milestones.length} milestones`)),
        el('p', { class: 'lead' }, PATHWAY_BLURBS[c.pathway]),
        el('div', { class: 'row wrap' },
          inFile ? el('a', { class: 'btn btn-outline', href: '#guardian' }, 'Application in progress · Guardian on')
            : requested ? el('a', { class: 'btn btn-secondary', href: '#review' }, `Review requested ${fmtDate(c.reviewRequestedAt)} ✓`)
            : el('a', { class: 'btn btn-primary', href: '#review' }, 'Request review ', el('span', { class: 'arrow' }, '→')),
          el('a', { class: 'btn btn-ghost', href: '#plan' }, 'See my plan'))),
      numberBlock(c)),
    // the path
    el('section', { class: 'card card-lg card-pad path-card' },
      el('div', { class: 'row-between wrap' }, el('div', {}, el('p', { class: 'kicker accent' }, 'Your path'), el('h2', { class: 'h3' }, nextMs ? `Next milestone: ${nextMs.label}${nextMs.date ? ` · ${fmtDate(nextMs.date)}` : ''}` : 'Every milestone reached.')), el('a', { class: 'link-btn small', href: '#progress' }, 'Full progress →')),
      path),
    // one next action — the one dark card on the page
    el('section', { class: 'card card-lg card-pad next-action-dark card-enter' },
      el('div', { class: 'row-between wrap' }, el('span', { class: 'chip chip-accent' }, icon('sparkle', 14), 'Next action'), engineTag(c.nextAction.engine)),
      el('h2', { class: 'h2' }, c.nextAction.title),
      el('p', { class: 'lead' }, c.nextAction.detail),
      el('div', { class: 'row wrap' }, el('a', { class: 'btn btn-accent', href: c.nextAction.href }, 'Open ', el('span', { class: 'arrow' }, '→')), el('button', { class: 'btn btn-ghost', onclick: () => ctx.openAsk?.('Why is this my next action?') }, 'Why this?'))),
    // toolkit
    el('section', { class: 'stack-2' },
      el('div', { class: 'row-between' }, el('p', { class: 'kicker accent' }, 'Your toolkit'), el('span', { class: 'small muted' }, 'MyScoreIQ + CreditBuilderIQ')),
      el('div', { class: 'toolkit' },
        tool('#plan', 'list-check', 'tone-purple', 'Plan', `Round ${c.round} · ${PATHWAY_LABELS[c.pathway]}`),
        tool('#disputes', 'shield-check', 'tone-coral', 'Disputes', c.guardian ? 'Paused — file active' : openDisputes ? `${openDisputes} open` : 'Nothing flagged'),
        tool('#build', 'house', 'tone-mint', 'Build history', c.rentReporting.backfilled ? `${c.rentReporting.monthsAvailable} months reporting` : c.rentReporting.linked ? `${c.rentReporting.monthsAvailable} months found` : 'Link your bank'),
        tool('#progress', 'trend', 'tone-gold', 'Progress', c.score.value == null ? 'No score yet' : `${c.score.value} · ${c.deltas.length ? (c.score.value - c.score.prev >= 0 ? '+' : '') + (c.score.value - c.score.prev) : 'steady'}`))),
    // LO card
    el('section', { class: 'card card-lg card-pad lo-connect' },
      el('div', { class: 'lo-card' }, el('span', { class: 'avatar avatar-lg' }, lo.first[0] + lo.last[0]),
        el('div', { class: 'stack-1' }, el('p', { class: 'kicker accent' }, 'Your lender connection'), el('h2', { class: 'h3' }, `${lo.first} ${lo.last} is still with you.`), el('p', { class: 'muted' }, `${ctx.lender.name} · NMLS ${lo.nmls}. ${lo.first} sees your milestones — never your report — and is told the day you’re ready.`))),
      el('div', { class: 'row wrap', style: { marginTop: '14px' } },
        el('a', { class: 'btn btn-outline', href: `sms:${lo.mobile.replace(/\D/g, '')}` }, `Message ${lo.first}`),
        el('a', { class: 'btn btn-ghost', href: `tel:${lo.mobile.replace(/\D/g, '')}` }, `Call ${lo.mobile}`)),
      regB()));
}
