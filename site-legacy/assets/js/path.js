// site/assets/js/path.js — the Path: one continuous line through milestones.
// renderPath(target, { nodes:[{label,state:'done'|'current'|'upcoming'}], variant:'hero'|'timeline'|'sparkline', animate, height })
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

export function renderPath(target, { nodes, variant = 'timeline', animate = true, height } = {}) {
  if (typeof target === 'string') target = document.querySelector(target);
  if (!target || !nodes?.length) return null;
  const n = nodes.length;
  const H = height || (variant === 'hero' ? 92 : variant === 'sparkline' ? 26 : 100);
  const W = variant === 'sparkline' ? 120 : 640;
  const padX = variant === 'sparkline' ? 6 : variant === 'hero' ? 60 : 36;
  const r = variant === 'sparkline' ? 3 : variant === 'hero' ? 10 : 7;
  const baseY = variant === 'hero' ? H - 30 : variant === 'sparkline' ? H / 2 : 40;
  const xs = nodes.map((_, i) => (n === 1 ? W / 2 : padX + (i * (W - padX * 2)) / (n - 1)));
  const wave = variant === 'sparkline' ? 3 : 7;
  const ys = xs.map((_, i) => baseY + Math.sin(i * 1.7 + 0.6) * wave);
  const d = xs.map((x, i) => {
    if (i === 0) return `M${x},${ys[i]}`;
    const px = xs[i - 1], py = ys[i - 1], cx = (px + x) / 2;
    return `C${cx},${py} ${cx},${ys[i]} ${x},${ys[i]}`;
  }).join(' ');
  const currentIdx = nodes.findIndex((m) => m.state === 'current');
  const doneCount = nodes.filter((m) => m.state === 'done').length;
  const drawTo = currentIdx >= 0 ? currentIdx : Math.max(0, doneCount - 1);

  target.classList.add('path', variant);
  target.innerHTML = '';
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Path: ${nodes.map((m) => m.label).join(' → ')}` });
  svg.appendChild(svgEl('path', { class: 'track', d }));
  const drawn = svgEl('path', { class: 'drawn', d });
  svg.appendChild(drawn);
  nodes.forEach((m, i) => {
    if (m.state === 'current') svg.appendChild(svgEl('circle', { class: 'pulse', cx: xs[i], cy: ys[i], r }));
    svg.appendChild(svgEl('circle', { class: `node ${m.state}`, cx: xs[i], cy: ys[i], r }));
    if (m.state === 'done' && variant !== 'sparkline') {
      const s = r * 0.5;
      svg.appendChild(svgEl('path', { class: 'check', d: `M${xs[i] - s},${ys[i]} l${s * 0.7},${s * 0.7} l${s * 1.2},${-s * 1.3}` }));
    }
    if (variant !== 'sparkline') {
      // timeline labels alternate between two rows so neighbours never collide
      const stagger = variant === 'timeline' && n > 4 && i % 2 ? 15 : 0;
      const t = svgEl('text', { class: `path-label ${m.state}`, x: xs[i], y: variant === 'hero' ? ys[i] - 24 : ys[i] + 26 + stagger });
      t.textContent = m.label;
      svg.appendChild(t);
    }
  });
  target.appendChild(svg);

  // draw the done portion up to the current node (final state also set on a timer so a
  // background tab still lands in the right place)
  const total = drawn.getTotalLength();
  const frac = n > 1 ? drawTo / (n - 1) : 1;
  const finalOffset = total * (1 - frac);
  drawn.style.strokeDasharray = `${total}`;
  drawn.style.strokeDashoffset = animate ? `${total}` : `${finalOffset}`;
  if (animate) {
    drawn.style.transition = 'stroke-dashoffset var(--dur-3) var(--ease)';
    const go = () => { drawn.style.strokeDashoffset = `${finalOffset}`; };
    requestAnimationFrame(() => requestAnimationFrame(go));
    setTimeout(go, 80);
  }
  return svg;
}
