// site/assets/js/ui.js — shared DOM helpers for the ReadyIQ 2 prototype.
import { resetState, saveState, fixtures } from './state.js';
import { initDemo } from './demo.js';

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** el('div', {class:'card', onclick: fn, dataset:{id:1}}, child, ...) */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  append(node, children);
  return node;
}
function append(node, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
export function mount(target, ...children) { const t = typeof target === 'string' ? qs(target) : target; t.innerHTML = ''; append(t, children); return t; }

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
export const fmtMoney = (n) => (n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US'));
export const pct = (x) => (x == null ? '—' : Math.round(x * 100) + '%');

/** Wear the lender's brand: data-brand + CSS vars + name/mark slots. */
export function applyBrand(lender) {
  const root = document.documentElement;
  root.dataset.brand = lender.id;
  root.style.setProperty('--brand', lender.brand.primary);
  root.style.setProperty('--brand-soft', lender.brand.soft);
  root.style.setProperty('--brand-ink', lender.brand.ink);
  qsa('[data-lender-name]').forEach((n) => (n.textContent = lender.name));
  qsa('[data-lender-mark]').forEach((n) => (n.textContent = initials(lender.name).slice(0, 1)));
}

/** Count a number up with ease-out; respects reduced motion. */
export function countUp(node, from, to, ms = 900) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || ms === 0 || from === to || document.visibilityState === 'hidden') { node.textContent = String(to); return; }
  const t0 = performance.now();
  let done = false;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
    node.textContent = String(Math.round(from + (to - from) * e));
    if (p < 1) requestAnimationFrame(step); else done = true;
  };
  requestAnimationFrame(step);
  setTimeout(() => { if (!done) node.textContent = String(to); }, ms + 120); // rAF can stall in background tabs
}

/** Bottom sheet on mobile, centered modal on desktop. Returns {close}. */
export function sheet({ title, body, actions = [], onClose } = {}) {
  const backdrop = el('div', { class: 'sheet-backdrop', role: 'dialog', 'aria-modal': 'true', 'aria-label': title || 'Dialog' });
  const panel = el('div', { class: 'sheet stack-4' }, el('div', { class: 'sheet-handle' }));
  if (title) panel.append(el('h2', { class: 'h3' }, title));
  if (body) panel.append(typeof body === 'string' ? el('div', { html: body }) : body);
  const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); onClose?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  if (actions.length) {
    panel.append(el('div', { class: 'sheet-actions' }, actions.map((a) => el('button', {
      class: `btn ${a.kind === 'primary' ? 'btn-primary' : a.kind === 'ghost' ? 'btn-ghost' : 'btn-secondary'}`,
      onclick: () => { const r = a.onClick?.(); if (a.close !== false && r !== false) close(); },
    }, a.label))));
  }
  backdrop.append(panel);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);
  return { close, panel };
}

let toastTimer;
export function toast(msg, ms = 2400) {
  qsa('.toast').forEach((t) => t.remove());
  const t = el('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), ms);
  return t;
}

export const engineTag = (name) => el('span', { class: 'engine-tag' }, `Powered by ${name}`);
export const regB = () => el('p', { class: 'reg-b' }, 'You can apply for a mortgage at any time — this is not required.');

/** Demo chrome on every page (?demo=0 hides; ?reset=1 restores fixtures). Name kept for callers. */
export function initDev(state, { onChange } = {}) { initDemo({ onConsumerChange: onChange }); }

/** Ring gauge for the Number — value on a 300–850 scale. */
export function ringGauge({ value, min = 300, max = 850, label = 'FICO®', size = 148, stroke = 10 }) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r;
  const frac = value == null ? 0 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${size} ${size}`); svg.setAttribute('width', size); svg.setAttribute('height', size);
  const mk = (cls) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('class', cls); c.setAttribute('cx', size / 2); c.setAttribute('cy', size / 2); c.setAttribute('r', r); return c; };
  const track = mk('track'), fill = mk('fill');
  fill.style.strokeDasharray = String(C); fill.style.strokeDashoffset = String(C);
  svg.append(track, fill);
  const wrap = el('div', { class: 'ring', style: { width: size + 'px', height: size + 'px' } }, svg,
    el('div', { class: 'ring-inner' }, el('div', {}, el('b', {}, value == null ? '—' : String(value)), el('span', { style: { display: 'block' } }, label))));
  setTimeout(() => { fill.style.strokeDashoffset = String(C * (1 - frac)); }, 60);
  return wrap;
}
