// site/assets/js/portal-progress.js — Progress: score history, the path in full, milestones, why it moved.
import { fmtDate, PATHWAY_LABELS } from './state.js';
import { el, engineTag, regB } from './ui.js';
import { renderPath } from './path.js';

const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

/** Score history chart — SVG area + line + points; deterministic from c.history. */
export function scoreChart(history, { width = 640, height = 200 } = {}) {
  const wrap = el('div', { class: 'chart' });
  if (!history || history.length < 2) {
    wrap.append(el('div', { class: 'chart-empty muted small' }, history?.length === 1 ? `One check so far (${history[0][1]} on ${fmtDate(history[0][0])}). The line starts next month.` : 'No score yet — the line starts when your first FICO® Score arrives.'));
    return wrap;
  }
  const vals = history.map((h) => h[1]);
  const min = Math.min(...vals) - 12, max = Math.max(...vals) + 12;
  const padL = 40, padR = 20, padT = 18, padB = 30;
  const x = (i) => padL + (i * (width - padL - padR)) / (history.length - 1);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (height - padT - padB);
  const pts = history.map((h, i) => [x(i), y(h[1])]);
  const line = pts.map((p, i) => (i ? `L${p[0]},${p[1]}` : `M${p[0]},${p[1]}`)).join(' ');
  const area = `${line} L${pts[pts.length - 1][0]},${height - padB} L${pts[0][0]},${height - padB} Z`;
  const svg = sv('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': `Score history from ${vals[0]} to ${vals[vals.length - 1]}` });
  const defs = sv('defs'); const grad = sv('linearGradient', { id: 'chartFill', x1: '0', y1: '0', x2: '0', y2: '1' });
  grad.append(sv('stop', { offset: '0%', 'stop-color': 'var(--brand)', 'stop-opacity': '.28' }), sv('stop', { offset: '100%', 'stop-color': 'var(--brand)', 'stop-opacity': '0' }));
  defs.append(grad); svg.append(defs);
  // gridlines + y labels
  const ticks = 4;
  for (let t = 0; t <= ticks; t++) {
    const v = Math.round(min + ((max - min) * t) / ticks), yy = y(v);
    svg.append(sv('line', { x1: padL, x2: width - padR, y1: yy, y2: yy, class: 'grid' }));
    const tx = sv('text', { x: padL - 8, y: yy + 4, class: 'ylab' }); tx.textContent = String(v); svg.append(tx);
  }
  svg.append(sv('path', { d: area, class: 'area' }));
  svg.append(sv('path', { d: line, class: 'line' }));
  pts.forEach((p, i) => {
    svg.append(sv('circle', { cx: p[0], cy: p[1], r: i === pts.length - 1 ? 6 : 4, class: i === pts.length - 1 ? 'pt last' : 'pt' }));
    const tx = sv('text', { x: p[0], y: height - 10, class: 'xlab' }); tx.textContent = fmtDate(history[i][0]).replace(/, \d{4}$/, ''); svg.append(tx);
  });
  const last = pts[pts.length - 1];
  const tip = sv('g', { class: 'tip' });
  const rect = sv('rect', { x: last[0] - 26, y: last[1] - 34, width: 52, height: 24, rx: 12 });
  const tt = sv('text', { x: last[0], y: last[1] - 18 }); tt.textContent = String(vals[vals.length - 1]);
  tip.append(rect, tt); svg.append(tip);
  wrap.append(svg);
  return wrap;
}

export function renderProgress(ctx) {
  const c = ctx.c, lo = ctx.lo, s = c.score;
  const d = s.value != null && s.prev != null ? s.value - s.prev : 0;
  const path = el('div'); setTimeout(() => renderPath(path, { nodes: c.milestones }), 0);
  const done = c.milestones.filter((m) => m.state === 'done').length;
  return el('div', { class: 'stack-4' },
    el('div', { class: 'view-head' }, el('p', { class: 'eyebrow' }, 'Progress'), el('h1', { class: 'h2' }, 'Momentum you can see.'), el('p', { class: 'muted' }, `${PATHWAY_LABELS[c.pathway]} · Round ${c.round} of ~${c.roundsEstimated} · ${done} of ${c.milestones.length} milestones.`)),
    el('div', { class: 'card card-pad stack-3' },
      el('div', { class: 'row-between wrap' },
        el('div', { class: 'row', style: { gap: '14px' } }, el('span', { class: 'eyebrow' }, 'Score history'), s.value != null ? el('span', { class: `number-delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}` }, d > 0 ? `+${d}` : d < 0 ? String(d) : 'steady', ' since last check') : null),
        engineTag(s.value == null ? 'CreditBuilderIQ' : 'MyScoreIQ')),
      scoreChart(c.history),
      el('p', { class: 'small muted' }, 'FICO® Score — not the mortgage-industry version lenders pull. A guide, not a preapproval.')),
    el('div', { class: 'card card-pad stack-2' }, el('div', { class: 'row-between' }, el('p', { class: 'eyebrow' }, 'Your path'), el('span', { class: 'small muted' }, `${done} of ${c.milestones.length}`)), path),
    el('div', { class: 'grid-2' },
      el('div', { class: 'card card-pad stack-3' }, el('p', { class: 'eyebrow' }, 'Milestones'),
        el('div', { class: 'list-rows' }, c.milestones.map((m) => el('div', { class: 'row-between' }, el('div', { class: 'row' }, el('span', { class: m.state === 'done' ? 'tick' : 'muted' }, m.state === 'done' ? '✓' : m.state === 'current' ? '●' : '○'), el('span', { style: m.state === 'upcoming' ? { color: 'var(--ink-3)' } : {} }, m.label)), el('span', { class: 'small muted tabular' }, m.date ? fmtDate(m.date) : m.state === 'current' ? 'now' : ''))))),
      el('div', { class: 'card card-pad stack-3' }, el('div', { class: 'row-between' }, el('p', { class: 'eyebrow' }, 'Why it moved'), s.value != null ? el('span', { class: 'small muted' }, `${s.prev} → ${s.value}`) : null),
        s.value == null ? el('p', { class: 'muted' }, 'Scores need history. Rent and utilities give the bureaus something to score; a first FICO® Score usually follows within a few months of reporting.')
          : c.deltas.length ? el('div', { class: 'list-rows' }, c.deltas.map((x) => el('div', { class: 'row-between' }, el('span', {}, x.cause), el('b', { class: 'tabular', style: { color: x.points >= 0 ? 'var(--teal-ink)' : 'var(--danger)' } }, (x.points > 0 ? '+' : '') + x.points))))
          : el('p', { class: 'muted' }, `No change since your last check (${fmtDate(s.updated)}). Steady is fine — the plan is what moves it.`),
        el('p', { class: 'small muted' }, 'Every point of the change, tied to a cause.'))),
    el('div', { class: 'card card-soft card-pad row-between wrap' },
      el('div', {}, el('b', {}, c.status === 'review_requested' ? `${lo.first} has your packet.` : `Ready for ${lo.first} to take a look?`), el('div', { class: 'small', style: { color: 'var(--brand-ink)' } }, c.status === 'review_requested' ? `Requested ${fmtDate(c.reviewRequestedAt)}.` : 'You decide when. Requesting a review shares your status — never your report.')),
      el('a', { class: 'btn btn-primary', href: '#review' }, c.status === 'review_requested' ? 'View request' : 'Request review')),
    regB());
}
