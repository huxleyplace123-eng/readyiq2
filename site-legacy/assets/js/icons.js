// site/assets/js/icons.js — a small line-icon set (24px grid, 1.75 stroke). icon(name, size?) → <svg>
const P = {
  home: 'M3 11.5 12 4l9 7.5M5 10v10h14V10M10 20v-6h4v6',
  list: 'M4 6h16M4 12h10M4 18h7',
  'list-check': 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  shield: 'M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z',
  'shield-check': 'M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3zM9 12l2 2 4-4',
  trend: 'M4 17l6-6 4 4 6-7M14 8h6v6',
  chart: 'M4 19V9M10 19V5M16 19v-8M22 19H2',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z',
  message: 'M4 5h16v11H9l-5 4V5z',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  file: 'M6 3h9l5 5v13H6zM14 3v6h6M9 14h6M9 17h4',
  lock: 'M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8 4l2 1-1 3-2-.5-1.5 1.5.5 2-3 1-1-2h-2l-1 2-3-1 .5-2L6 15.5 4 16l-1-3 2-1v-2l-2-1 1-3 2 .5L7.5 5 7 3l3-1 1 2h2l1-2 3 1-.5 2 1.5 1.5 2-.5 1 3-2 1z',
  check: 'M5 12l4 4L19 6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  alert: 'M12 3l10 18H2L12 3zM12 10v4M12 17v.5',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  house: 'M4 11l8-7 8 7v9H4z M10 20v-6h4v6',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6l1-7z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  users: 'M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 21v-2a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zM3 7V5a1 1 0 0 1 1-1h12M16 13h.5',
  card: 'M3 7h18v11H3zM3 10h18M7 15h4',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 12h8',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  plug: 'M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8zM12 17v4',
  building: 'M4 21V5l8-3v19M12 21V9l8 3v9M8 8h.5M8 12h.5M8 16h.5',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  bank: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z',
  x: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  logo: 'M6 4h7a5 5 0 0 1 0 10H6zM6 14l7 6',
};
const NS = 'http://www.w3.org/2000/svg';
export function icon(name, size = 20, stroke = 1.75) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', size); s.setAttribute('height', size);
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', stroke);
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
  s.classList.add('ic');
  const p = document.createElementNS(NS, 'path'); p.setAttribute('d', P[name] || P.sparkle); s.append(p);
  return s;
}
export const ICON_NAMES = Object.keys(P);
