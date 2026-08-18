// site/assets/js/portal-more.js — Request review, Guardian, Ask ReadyIQ, Protected homebuying, Settings.
import { packet, requestReview, setGuardian, resetState, fmtDate, daysBetween, TODAY, PATHWAY_LABELS, PATHWAY_BLURBS, dti } from './state.js';
import { el, engineTag, regB, toast, sheet, pct, fmtMoney } from './ui.js';

const head = (eyebrow, title, sub, engine) => el('div', { class: 'view-head' },
  el('p', { class: 'eyebrow' }, eyebrow), el('h1', { class: 'h2' }, title), sub ? el('p', { class: 'muted' }, sub) : null, engine ? engineTag(engine) : null);

// ---------- Request review ----------
export function renderReview(ctx) {
  const c = ctx.c, lo = ctx.lo, p = packet(ctx.state, c.id);
  if (c.status === 'review_requested' || c.status === 'applied' || c.status === 'handed_off') {
    return el('div', { class: 'stack-4' },
      head('Request review', c.status === 'review_requested' ? `${lo.first} has your packet.` : `You're with ${lo.first} now.`, c.status === 'review_requested' ? `Requested ${fmtDate(c.reviewRequestedAt)}. ${lo.first} will reach out to schedule — keep balances where they are until you talk.` : `Your application is in progress. Guardian is watching the file with you.`),
      el('div', { class: 'card card-pad stack-3' },
        el('div', { class: 'lo-card' }, el('span', { class: 'avatar avatar-lg' }, lo.first[0] + lo.last[0]), el('div', { class: 'stack-1' }, el('b', {}, `${lo.first} ${lo.last}`), el('span', { class: 'small muted' }, `${ctx.lender.name} · NMLS ${lo.nmls}`))),
        el('div', { class: 'row wrap' }, el('a', { class: 'btn btn-primary', href: `tel:${lo.mobile.replace(/\D/g, '')}` }, `Call ${lo.first}`), el('a', { class: 'btn btn-secondary', href: `sms:${lo.mobile.replace(/\D/g, '')}` }, 'Text'), el('a', { class: 'btn btn-ghost', href: `mailto:${lo.email}` }, 'Email'))),
      packetCard(ctx, p, true), regB());
  }
  const consent = el('input', { type: 'checkbox' });
  const income = el('input', { class: 'input', type: 'number', inputmode: 'numeric', placeholder: '6,500', value: c.income ?? '', 'aria-label': 'Gross monthly income' });
  const send = () => {
    if (!consent.checked) { toast('Please confirm the hard-pull consent first'); return; }
    requestReview(ctx.state, c.id, { income: Number(income.value) || c.income });
    ctx.save(); toast(`${lo.first} has been notified`); ctx.go('#home');
  };
  return el('div', { class: 'stack-4' },
    head('Request review', 'Ready for a real look?', `${lo.first} gets a consumer-authorized packet — your status, never your report — and pulls the real mortgage credit report when you talk.`),
    packetCard(ctx, p, false),
    c.income == null ? el('div', { class: 'card card-pad stack-2' }, el('label', { class: 'field' }, el('span', { class: 'label' }, 'Your gross monthly income (before taxes) — helps the DTI estimate'), income)) : null,
    p.disputesOpen > 0 ? el('div', { class: 'banner banner-warn', style: { gridTemplateColumns: '1fr' } }, el('span', {}, `${p.disputesOpen} dispute${p.disputesOpen > 1 ? 's' : ''} still open. They usually need to finish first — ask ${lo.first} whether to send now or wait.`)) : null,
    el('label', { class: 'consent' }, consent, el('div', {}, el('b', {}, `${lo.first} may pull my mortgage credit report when we talk.`), el('span', {}, `That's a hard inquiry, done by ${ctx.lender.name} with my permission, and it's how the real qualification starts. Nothing is pulled until we speak.`))),
    el('div', { class: 'stack-2' }, el('button', { class: 'btn btn-primary btn-lg btn-block', onclick: send }, `Send to ${lo.first} `, el('span', { class: 'arrow' }, '→')), regB()));
}
function packetCard(ctx, p, sent) {
  const c = ctx.c;
  return el('div', { class: 'card card-pad stack-3' },
    el('div', { class: 'row-between' }, el('p', { class: 'eyebrow' }, sent ? 'What your loan officer received' : 'Your readiness packet'), engineTag('MyScoreIQ')),
    el('dl', { class: 'kv' },
      el('dt', {}, 'Pathway'), el('dd', {}, PATHWAY_LABELS[c.pathway]),
      el('dt', {}, `${ctx.lender.name} floors met`), el('dd', {}, p.floorsMet.length ? p.floorsMet.join(' · ') : 'none yet'),
      el('dt', {}, 'DTI estimate'), el('dd', {}, p.dtiEstimate == null ? '— (add income)' : pct(p.dtiEstimate)),
      el('dt', {}, 'Rent history'), el('dd', {}, p.rentMonths ? `${p.rentMonths} months` : 'not linked'),
      el('dt', {}, 'Disputes'), el('dd', {}, `${p.disputesOpen} open · ${p.disputesResolved} resolved`),
      el('dt', {}, 'Income (self-reported)'), el('dd', {}, p.income ? fmtMoney(p.income) + '/mo' : '—'),
      el('dt', {}, 'Round'), el('dd', {}, `${c.round} of ~${c.roundsEstimated}`)),
    el('p', { class: 'small muted' }, `Status and summary only. Your credit report and score details are never shared — ${ctx.lo.first} pulls the real mortgage report with your consent.`));
}

// ---------- Guardian ----------
export function renderGuardian(ctx) {
  const c = ctx.c, lo = ctx.lo;
  if (!c.guardian) {
    return el('div', { class: 'stack-4' },
      head('Guardian', 'Turns on when your loan file is active.', `From application to closing, Guardian pauses dispute suggestions, watches your report daily, and reminds you to ask ${lo.first} before you open, close, or pay off anything.`, 'MyScoreIQ'),
      el('div', { class: 'card card-pad stack-2' }, el('h2', { class: 'h3' }, 'What it does'),
        el('ul', { class: 'list-rows' }, ['Pauses dispute suggestions — open disputes complicate underwriting.', 'Alerts you and your loan officer to new inquiries, new accounts and balance jumps.', 'A closing countdown with the handful of things that blow up files.', 'Wire-fraud coaching before you send closing funds.'].map((t) => el('li', {}, t)))),
      el('button', { class: 'btn btn-outline', style: { justifySelf: 'start' }, onclick: () => { setGuardian(ctx.state, c.id, true); c.loanFile = c.loanFile || { active: true, closingDate: '2026-10-02' }; ctx.save(); toast('Guardian on (demo)'); ctx.rerender(); } }, 'Simulate an active loan file (demo)'), regB());
  }
  const days = c.loanFile?.closingDate ? daysBetween(TODAY, c.loanFile.closingDate) : null;
  return el('div', { class: 'stack-4' },
    el('div', { class: 'card card-ink card-pad stack-2' }, el('p', { class: 'eyebrow', style: { color: 'rgba(255,255,255,.7)' } }, 'Guardian is on'),
      el('h1', { class: 'h2' }, c.loanFile?.closingDate ? `Closing ${fmtDate(c.loanFile.closingDate)} · ${days} days` : 'Your loan file is active'),
      el('p', { class: 'muted' }, `Nothing changes on your report without ${lo.first} knowing. Nothing should change on purpose without asking first.`)),
    el('div', { class: 'card card-pad stack-2' }, el('h2', { class: 'h3' }, `Ask ${lo.first} before you…`),
      el('ul', { class: 'list-rows' }, ['open a new account or card', 'close an account', 'pay off a loan or collection', 'co-sign for anyone', 'move or deposit large sums', 'change jobs'].map((t) => el('li', { class: 'row' }, el('span', { class: 'icon-dot' }), t)))),
    el('div', { class: 'card card-pad stack-2' }, el('div', { class: 'row-between' }, el('h2', { class: 'h3' }, 'Recent alerts'), engineTag('MyScoreIQ')),
      c.alerts.length ? el('div', { class: 'list-rows' }, c.alerts.map((a) => el('div', { class: 'alert-row' }, el('span', { class: 'icon-dot' }), el('div', {}, el('div', {}, a.text), el('div', { class: 'small muted' }, `Tell ${lo.first} if this wasn't you — or if it was.`)), el('span', { class: 'small muted' }, fmtDate(a.date))))) : el('p', { class: 'muted' }, 'Quiet. We check daily.')),
    el('div', { class: 'card card-pad stack-2' }, el('h2', { class: 'h3' }, 'Closing checklist'),
      el('div', { class: 'checklist' }, ['Answer any letter-of-explanation request within 24 hours', 'Keep balances where they are', 'No new credit, no new debt, no new job without a call', 'Before wiring closing funds, call the title company at a number you already have — never one from an email'].map((t) => el('label', {}, el('input', { type: 'checkbox' }), el('span', {}, t))))),
    el('div', { class: 'card card-soft card-pad' }, el('b', {}, 'Paused: dispute suggestions.'), el('p', { class: 'small', style: { color: 'var(--brand-ink)' } }, 'Disputes filed during underwriting can stall a file. Anything worth disputing waits until after closing — or goes through your loan officer.')),
    el('button', { class: 'btn btn-outline btn-sm', style: { justifySelf: 'start' }, onclick: () => { setGuardian(ctx.state, c.id, false); ctx.save(); toast('Guardian off (demo)'); ctx.rerender(); } }, 'Turn Guardian off (demo)'), regB());
}

// ---------- Ask ReadyIQ ----------
export function renderAsk(ctx, { compact = false, draft: draftIn = null } = {}) {
  const c = ctx.c, lo = ctx.lo, p = packet(ctx.state, c.id);
  const chat = el('div', { class: 'chat' });
  const bot = (text, pre) => chat.append(el('div', { class: 'msg msg-bot' }, text, pre ? el('pre', {}, pre) : null, pre ? el('div', { class: 'row', style: { marginTop: '8px' } }, el('button', { class: 'btn btn-secondary btn-sm', onclick: () => { navigator.clipboard?.writeText(pre); toast('Copied'); } }, 'Copy')) : null));
  const user = (text) => chat.append(el('div', { class: 'msg msg-user' }, text));
  const answer = (q) => {
    const t = q.toLowerCase();
    if (/letter|explanation|loe/.test(t)) {
      const late = c.credit.latesLast24mo > 0 ? `In ${fmtDate(TODAY).slice(-4) - (c.credit.lastLateMonthsAgo > 12 ? 2 : 1)} I was late on two payments during a stretch when my hours were cut. I brought the accounts current within 60 days and have paid every account on time since — ${c.credit.lastLateMonthsAgo} months and counting.` : 'I have had no late payments in the last 24 months.';
      const inq = c.credit.inquiriesLast6mo > 0 ? ` The recent inquiry on my report was for an auto loan I did not take.` : '';
      bot(`Here's a truthful first draft in your own words — edit anything that isn't exactly right. Underwriters want plain facts and what changed.`, `To whom it may concern,\n\n${late}${inq}\n\nI am writing to explain these items in support of my mortgage application. Please let me know if you need documentation.\n\nSincerely,\n${c.first} ${c.last}`);
    } else if (/why|moved|drop|went (up|down)|change/.test(t)) {
      if (c.score.value == null) bot(`You don't have a score yet — that's the thin-file story, not a bad one. Rent and utilities give the bureaus something to score; a first FICO® Score usually follows within a few months of reporting.`);
      else bot(c.deltas.length ? `Your FICO® moved ${c.score.value - c.score.prev > 0 ? 'up' : 'down'} ${Math.abs(c.score.value - c.score.prev)} points since your last check. Every point has a cause: ${c.deltas.map((d) => `${d.points > 0 ? '+' : ''}${d.points} ${d.cause.toLowerCase()}`).join('; ')}. The full list is under “Why it moved.”` : `No change since your last check (${fmtDate(c.score.updated)}). Steady is fine — the plan is what moves it.`);
    } else if (/next|should|do now|first/.test(t)) {
      bot(`One thing: ${c.nextAction.title}. ${c.nextAction.detail}`);
    } else if (/apply|ready|qualify|approve/.test(t)) {
      bot(`You can apply for a mortgage at any time — this isn't required. Right now you're in ${PATHWAY_LABELS[c.pathway]}: ${PATHWAY_BLURBS[c.pathway]} ${p.floorsMet.length ? `Your FICO® meets ${ctx.lender.name}'s directional floor for ${p.floorsMet.join(' and ')}.` : `Your FICO® isn't at ${ctx.lender.name}'s directional floors yet.`} What that means for a specific program is ${lo.first}'s call — I don't predict approvals.`);
    } else if (/dispute/.test(t)) {
      bot(c.disputes.length ? `You have ${p.disputesOpen} open dispute${p.disputesOpen === 1 ? '' : 's'} and ${p.disputesResolved} resolved. ${c.guardian ? 'They’re paused while your loan file is active.' : 'They run on a 30-day clock and we sequence them to finish before your review.'}` : `Nothing is flagged on your report right now. We check every refresh — once a month.`);
    } else if (/dti|debt/.test(t)) {
      const r = dti(c.credit.monthlyDebts, c.income);
      bot(r == null ? `Add your gross monthly income under Plan → Debt-to-income and I'll estimate your DTI from the debts on your report.` : `Your debts on the report add up to ${fmtMoney(c.credit.monthlyDebts.reduce((a, d) => a + d.payment, 0))}/mo — about ${pct(r)} of the income you entered, before a housing payment. Lenders compute it from verified income and the tri-merge, so treat this as a guide.`);
    } else {
      bot(`I can explain your number, your plan, and what happens next — and help you draft a letter of explanation. I don't predict scores or approvals; ${lo.first} does the qualifying. Try “why did my score move?”, “what should I do next?”, or “can I apply?”`);
    }
    chat.scrollTop = chat.scrollHeight;
  };
  const input = el('input', { name: 'q', placeholder: 'Ask about your number, your plan, or what’s next…', 'aria-label': 'Ask ReadyIQ' });
  const form = el('form', { class: 'card ask-bar', onsubmit: (e) => { e.preventDefault(); const q = input.value.trim(); if (!q) return; user(q); input.value = ''; setTimeout(() => answer(q), 350); } }, input, el('button', { class: 'btn btn-primary btn-sm', type: 'submit' }, 'Ask'));
  bot(`Hi ${c.first}. I explain and organize — I never promise deletions, points, or approvals. What would you like to know?`);
  const draft = draftIn || ctx.state.session.askDraft; if (draft) { ctx.state.session.askDraft = null; ctx.save(); user(draft); setTimeout(() => answer(draft), 400); }
  return el('div', { class: 'stack-4' },
    compact ? el('div', { class: 'row-between' }, el('p', { class: 'muted small' }, 'Plain answers about your own path.'), engineTag('CreditBuilderIQ')) : head('Ask ReadyIQ', 'Plain answers about your own path.', null, 'CreditBuilderIQ'),
    el('div', { class: 'row wrap' }, ['Why did my score move?', 'What should I do next?', 'Can I apply?', 'Draft a letter of explanation'].map((s) => el('button', { class: 'chip', type: 'button', onclick: () => { user(s); setTimeout(() => answer(s), 300); } }, s))),
    chat, form,
    el('p', { class: 'small muted' }, 'ReadyIQ explains and organizes. It never promises deletions, points, or approvals.'), compact ? null : regB());
}

// ---------- Protected homebuying ----------
export function renderProtect(ctx) {
  const lo = ctx.lo;
  const item = (title, body, on = true) => el('div', { class: 'card card-pad stack-1' }, el('div', { class: 'row-between' }, el('h2', { class: 'h3' }, title), el('span', { class: 'chip', style: on ? { background: 'var(--success-soft)', color: 'var(--success)' } : {} }, on ? '● on' : 'included')), el('p', { class: 'muted' }, body));
  return el('div', { class: 'stack-4' },
    head('Protected homebuying', 'The months before a closing are peak season for identity theft and wire fraud.', 'Your MyScoreIQ protection runs the whole way — quietly.', 'MyScoreIQ'),
    item('Dark web & SSN monitoring', 'We watch for your Social Security number, email and accounts showing up where they shouldn’t.'),
    item('Address-change & new-account alerts', 'A change of address or a new account you didn’t open is the first sign of a problem — you hear about it the day it happens.'),
    item('Identity theft insurance & U.S.-based restoration', 'If something happens, a dedicated case manager restores your identity, and insurance covers eligible costs — included with MyScoreIQ.', false),
    el('div', { class: 'card card-ink card-pad stack-1' }, el('h2', { class: 'h3' }, 'Before you wire closing funds'), el('p', { class: 'muted' }, `Call the title company at a number you already have — never one from an email — and confirm the instructions out loud. ${lo.first} will never change wiring instructions by email. This one habit stops most closing-day fraud.`)),
    regB());
}

// ---------- Settings ----------
export function renderSettings(ctx) {
  const c = ctx.c, lo = ctx.lo;
  c.consents = c.consents || { credit: true, status: true, text: true };
  const sw = (key, title, body) => el('div', { class: 'row-between', style: { alignItems: 'flex-start', gap: '16px' } }, el('div', {}, el('b', {}, title), el('div', { class: 'small muted' }, body)),
    el('span', { class: 'switch', role: 'switch', 'aria-checked': String(!!c.consents[key]), tabindex: '0', onclick: (e) => { c.consents[key] = !c.consents[key]; e.currentTarget.setAttribute('aria-checked', String(c.consents[key])); ctx.save(); if (key === 'status' && !c.consents.status) toast(`${lo.first} will stop receiving your status`); } }));
  return el('div', { class: 'stack-4' },
    head('Settings', `${c.first} ${c.last}`, `${c.email || '—'} · ${c.mobile || '—'}`),
    el('div', { class: 'card card-pad stack-2' }, el('p', { class: 'eyebrow' }, 'Your loan officer'), el('div', { class: 'lo-card' }, el('span', { class: 'avatar avatar-lg' }, lo.first[0] + lo.last[0]), el('div', { class: 'stack-1' }, el('b', {}, `${lo.first} ${lo.last}`), el('span', { class: 'small muted' }, `${ctx.lender.name} · NMLS ${lo.nmls} · ${lo.mobile}`)))),
    el('div', { class: 'card card-pad stack-3' }, el('p', { class: 'eyebrow' }, 'Consents — change any time'),
      sw('credit', 'ReadyIQ may pull my credit for my own review', 'Soft check via MyScoreIQ and CreditBuilderIQ. Turning this off pauses your monthly refresh.'),
      sw('status', `Share my status — never my report — with ${lo.first}`, 'Where you are on the path, milestones, and review requests. Never your report or score details.'),
      sw('text', 'Text me about my path', 'Reply STOP any time.')),
    el('div', { class: 'card card-pad stack-2' }, el('p', { class: 'eyebrow' }, 'Demo'),
      el('div', { class: 'row wrap' }, el('button', { class: 'btn btn-outline btn-sm', onclick: () => { resetState(); toast('Demo data reset'); location.hash = '#home'; location.reload(); } }, 'Reset demo data'),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: () => sheet({ title: 'Leave ReadyIQ?', body: el('p', { class: 'muted' }, `Your account closes, monitoring stops, and ${lo.first} stops receiving your status. You can apply for a mortgage at any time regardless.`), actions: [{ label: 'Leave', kind: 'primary', onClick: () => { resetState(); location.href = '../check/'; } }, { label: 'Stay', kind: 'ghost' }] }) }, 'Leave ReadyIQ'))),
    regB());
}
