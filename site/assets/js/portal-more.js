// site/assets/js/portal-more.js — placeholders replaced in Task 11
import { el } from './ui.js';
const stub = (t) => () => el('div', { class: 'card card-pad' }, el('p', { class: 'eyebrow' }, t), el('p', { class: 'muted' }, 'Coming in the next task.'));
export const renderReview = stub('Request review');
export const renderGuardian = stub('Guardian');
export const renderAsk = stub('Ask ReadyIQ');
export const renderProtect = stub('Protected homebuying');
export const renderSettings = stub('Settings');
