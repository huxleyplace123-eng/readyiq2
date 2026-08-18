// site/assets/js/portal-tools.js — Plan (+Clock, +DTI), Disputes, Build history, Why it moved.
import { eligibilityDates, dti, fmtDate, daysBetween, addMonths, TODAY, PATHWAY_LABELS } from './state.js';
import { el, engineTag, regB, toast, pct, fmtMoney } from './ui.js';

const head = (eyebrow, title, sub, engine) => el('div', { class: 'view-head' },
  el('p', { class: 'eyebrow' }, eyebrow), el('h1', { class: 'h2' }, title), sub ? el('p', { class: 'muted' }, sub) : null, engine ? engineTag(engine) : null);

const lever = (title, body, meta) => el('div', { class: 'card card-pad lever-card' },
  el('div', { class: 'row-between wrap' }, el('h2', { class: 'h3' }, title), meta || null), body);

// ---------- Plan ----------
export function renderPlan(ctx) {
  const c = ctx.c, lo = ctx.lo, cr = c.credit;
  const cards = [];
  const elig = eligibilityDates(c.publicRecords);
  if (elig.length) cards.push(clockCard(elig[0]));

  // payment history
  if (cr.latesLast24mo > 0) {
    const cleanDate = addMonths(TODAY, 12 - cr.lastLateMonthsAgo);
    cards.push(lever('Payment history', el('div', { class: 'stack-2' },
      el('p', {}, `Your last late payment is ${cr.lastLateMonthsAgo} months old. Underwriting looks hardest at the last 12–24 months — twelve clean months lands ${fmtDate(cleanDate)}.`),
      el('div', { class: 'progress' }, el('i', { style: { width: Math.min(100, Math.round((cr.lastLateMonthsAgo / 24) * 100)) + '%' } })),
      el('p', { class: 'small muted' }, `${cr.lastLateMonthsAgo} of 24 months. Nothing to pay here — just keep every account current.`)), engineTag('CreditBuilderIQ')));
  } else if (c.score.value != null) {
    cards.push(lever('Payment history', el('p', {}, 'No late payments in the last 24 months — the single most important thing on the report. Keep it that way.'), el('span', { class: 'tick' }, '✓ clean')));
  }
  // derogatories & collections
  if (cr.collections.length || c.publicRecords.length) {
    cards.push(lever('Derogatories & collections', el('div', { class: 'stack-2' },
      cr.collections.length ? el('ul', { class: 'list-rows' }, cr.collections.map((k) => el('li', { class: 'row-between' }, el('span', {}, k.name), el('b', {}, fmtMoney(k.amount), k.paid ? ' · paid' : '')))) : null,
      el('p', { class: 'small muted' }, `Paying a collection doesn't raise the FICO® Score you see here — removing an inaccurate one can. Ask ${lo.first} what ${ctx.lender.name} requires for your program before you pay anything.`)), engineTag('CreditBuilderIQ')));
  }
  // utilization
  {
    const target = 0.3, now = cr.utilization;
    cards.push(lever('Utilization', el('div', { class: 'stack-2' },
      el('div', { class: 'row', style: { gap: '18px' } }, el('span', { class: 'h2 tabular' }, pct(now)), el('span', { class: 'muted' }, now > target ? `→ target under ${pct(target)}` : 'under target — hold it here'), cr.prevUtilization !== now ? el('span', { class: 'chip' }, `was ${pct(cr.prevUtilization)}`) : null),
      el('div', { class: 'progress' }, el('i', { style: { width: Math.min(100, Math.round(now * 100)) + '%', background: now > 0.5 ? 'var(--danger)' : now > target ? 'var(--warn)' : 'var(--success)' } })),
      el('p', { class: 'small muted' }, now > target
        ? `The fastest lever there is. Pay balances down before each card's statement date — that's the number the bureaus see. ${c.nextAction.lever === 'utilization' ? c.nextAction.detail : ''}`
        : 'Balances are low. Avoid maxing any single card, even briefly, in the months before you apply.')), engineTag('CreditBuilderIQ')));
  }
  // inquiries
  cards.push(lever('Inquiries', el('p', {}, cr.inquiriesLast6mo > 0
    ? `${cr.inquiriesLast6mo} hard ${cr.inquiriesLast6mo === 1 ? 'inquiry' : 'inquiries'} in the last 6 months. Pause new applications — each one costs a few points and lenders ask about all of them.`
    : 'No hard inquiries in 6 months. Keep it that way until you apply.'), engineTag('MyScoreIQ')));
  // DTI
  cards.push(dtiCard(ctx));
  // thin file
  if (c.pathway === 'thin') {
    cards.push(lever('Thin file', el('div', { class: 'stack-2' },
      el('p', {}, `${cr.tradelines} tradelines on file. Lenders can also qualify you without a score using 12 months of rent plus two other regular payments — that's why rent and utilities come first.`),
      el('a', { class: 'btn btn-secondary btn-sm', href: '#build', style: { justifySelf: 'start' } }, 'Build history →')), engineTag('CreditBuilderIQ')));
  }
  return el('div', { class: 'stack-4' },
    head('Your plan', 'In the order underwriting cares.', `${PATHWAY_LABELS[c.pathway]} · Round ${c.round} of ~${c.roundsEstimated}. Each card names the lever it moves — and none of it is a promise.`),
    ...cards, regB());
}

function clockCard(e) {
  const total = daysBetween(e.event, e.fha), elapsed = daysBetween(e.event, TODAY);
  const remaining = Math.max(0, total - elapsed), frac = Math.min(1, elapsed / total);
  const C = 2 * Math.PI * 46;
  const ring = el('div', { class: 'clock-ring' });
  ring.innerHTML = `<svg viewBox="0 0 104 104"><circle class="track" cx="52" cy="52" r="46"/><circle class="fill" cx="52" cy="52" r="46" style="stroke-dasharray:${C};stroke-dashoffset:${C}"/></svg>`;
  ring.append(el('div', { class: 'days' }, el('b', {}, String(remaining)), el('span', {}, 'days')));
  setTimeout(() => { ring.querySelector('.fill').style.strokeDashoffset = String(C * (1 - frac)); }, 60);
  return el('div', { class: 'card card-pad stack-3' },
    el('div', { class: 'row-between' }, el('p', { class: 'eyebrow' }, 'The clock'), engineTag('CreditBuilderIQ')),
    el('div', { class: 'clock' }, ring,
      el('div', { class: 'stack-1' },
        el('span', { class: 'clock-date' }, `FHA · ${fmtDate(e.fha)}`),
        el('span', { class: 'muted' }, `Conventional · ${fmtDate(e.conventional)}`),
        el('span', { class: 'small muted' }, `${e.label} on ${fmtDate(e.event)}. Earliest eligibility, subject to lender review — waiting periods and overlays vary.`))),
    el('p', { class: 'small' }, `Every month until then is building time. Your plan below is ordered so the file is clean the day the clock runs out.`));
}

function dtiCard(ctx) {
  const c = ctx.c;
  const debt = c.credit.monthlyDebts.reduce((a, d) => a + (d.payment || 0), 0);
  const out = el('div', { class: 'stack-1' });
  const draw = () => {
    const r = dti(c.credit.monthlyDebts, c.income);
    out.replaceChildren(
      el('div', { class: 'row', style: { gap: '18px' } }, el('span', { class: 'h2 tabular' }, r == null ? '—' : pct(r)), el('span', { class: 'muted' }, r == null ? 'enter income to estimate' : r > 0.45 ? 'above where most programs want it' : r > 0.36 ? 'workable — housing payment will decide it' : 'healthy')),
      el('p', { class: 'small muted' }, 'Estimate. Lenders compute DTI from the tri-merge report and verified income, plus the new housing payment.'));
  };
  draw();
  const input = el('input', { class: 'input', type: 'number', inputmode: 'numeric', placeholder: '6,500', value: c.income ?? '', 'aria-label': 'Gross monthly income',
    onchange: (e) => { c.income = Number(e.target.value) || null; ctx.save(); draw(); toast('Income saved — estimate updated'); } });
  return lever('Debt-to-income', el('div', { class: 'stack-3' },
    el('dl', { class: 'kv' }, el('dt', {}, 'Monthly debts on your report'), el('dd', {}, fmtMoney(debt)),
      ...c.credit.monthlyDebts.map((d) => [el('dt', { class: 'small' }, d.name), el('dd', { class: 'small', style: { fontWeight: 500 } }, fmtMoney(d.payment))]).flat()),
    el('label', { class: 'field' }, el('span', { class: 'label' }, 'Your gross monthly income (before taxes)'), input),
    out,
    c.disputes.some((d) => d.dtiImpact && d.status !== 'resolved') ? el('div', { class: 'banner banner-info', style: { gridTemplateColumns: '1fr' } }, el('span', {}, `An open dispute could remove ${fmtMoney(c.disputes.find((d) => d.dtiImpact).dtiImpact)}/mo of reported debt — see Disputes.`)) : null),
    engineTag('CreditBuilderIQ'));
}

// ---------- Disputes ----------
const CATS = {
  payment_amount: { label: 'Wrong payment amount', why: (d) => `Inflates your DTI by ${fmtMoney(d.dtiImpact)}/mo` },
  duplicate: { label: 'Duplicate account', why: () => 'Counts one debt twice' },
  late: { label: 'Late payment you didn’t make', why: () => 'Inside the 24 months underwriting weighs most' },
  collection: { label: 'Collection that isn’t accurate', why: () => 'Derogatory — may block a program' },
  date: { label: 'Wrong date', why: () => 'Extends how long a derogatory stays' },
  not_mine: { label: 'Not my account', why: () => 'Possible fraud or mixed file' },
};
const ORDER = Object.keys(CATS);
export function renderDisputes(ctx) {
  const c = ctx.c, lo = ctx.lo;
  const list = [...c.disputes].sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));
  const advance = (d) => {
    const next = { draft: 'sent', sent: 'responded', responded: 'resolved' }[d.status];
    if (!next) return;
    d.status = next; if (next === 'sent') d.sentAt = TODAY;
    if (next === 'resolved' && d.category === 'payment_amount' && d.dtiImpact) { const t = c.credit.monthlyDebts.find((x) => x.name.startsWith('Navient')); if (t) t.payment = 0; }
    if (c.disputes.every((x) => x.status === 'resolved')) { const m = c.milestones.find((x) => x.label === 'Disputes resolved'); if (m) { m.state = 'done'; m.date = TODAY; } }
    ctx.save(); toast(next === 'sent' ? 'Dispute sent — 30-day clock started' : next === 'responded' ? 'Response logged' : 'Resolved'); ctx.rerender();
  };
  const row = (d) => el('div', { class: 'dispute' },
    el('div', { class: 'row-between wrap' }, el('span', { class: 'chip chip-outline' }, CATS[d.category].label), el('span', { class: `pill pill-${d.status}` }, d.status)),
    el('p', {}, d.item),
    el('div', { class: 'row-between wrap' }, el('span', { class: 'small muted' }, CATS[d.category].why(d), d.sentAt ? ` · sent ${fmtDate(d.sentAt)}` : ''),
      c.guardian || d.status === 'resolved' ? null : el('button', { class: 'btn btn-secondary btn-sm', onclick: () => advance(d) }, { draft: 'Send', sent: 'Mark responded', responded: 'Mark resolved' }[d.status])));
  return el('div', { class: 'stack-4' },
    head('Disputes', 'Fix what’s wrong before you apply.', 'Priority goes to inaccuracies that block a mortgage — wrong payment amounts, duplicates, recent lates, collections, dates, accounts that aren’t yours.', 'CreditBuilderIQ'),
    c.guardian ? el('div', { class: 'banner banner-warn', style: { gridTemplateColumns: '1fr' } }, el('span', {}, `Disputes are paused while your loan file is active. Ask ${lo.first} before sending anything.`)) : null,
    list.length ? el('div', { class: 'card card-pad list-rows' }, list.map(row))
      : el('div', { class: 'card card-pad stack-2' }, el('h2', { class: 'h3' }, 'Nothing flagged.'), el('p', { class: 'muted' }, 'We check every refresh — once a month — for negative items and mismatches across bureaus. If something looks wrong, it shows up here with a letter ready to go.')),
    el('div', { class: 'card card-soft card-pad stack-1' }, el('b', {}, 'We sequence disputes to finish before your review.'), el('p', { class: 'small', style: { color: 'var(--brand-ink)' } }, `Lenders don’t like open disputes on a file. Every letter here runs on the same 30-day clock so they close together — and we never suggest a dispute during an active loan.`)),
    regB());
}

// ---------- Build history ----------
export function renderBuild(ctx) {
  const c = ctx.c, r = c.rentReporting;
  c.utilities = c.utilities || [];
  const link = () => { r.linked = true; ctx.save(); toast('Bank linked — read-only, via MX'); ctx.rerender(); };
  const report = () => {
    r.backfilled = true;
    const m = c.milestones.find((x) => /rent/i.test(x.label)); if (m) { m.state = 'done'; m.date = TODAY; const nxt = c.milestones.find((x) => x.state === 'upcoming'); const cur = c.milestones.find((x) => x.state === 'current'); if (cur && cur === m && nxt) nxt.state = 'current'; else if (!c.milestones.some((x) => x.state === 'current') && nxt) nxt.state = 'current'; }
    if (c.pathway === 'thin') c.nextAction = { title: 'Add two utilities', detail: 'Rent is reporting. Two more regular payments — gas, electric, phone — complete the nontraditional credit file lenders can use.', lever: 'thin-file', engine: 'CreditBuilderIQ', href: '#build' };
    ctx.save(); toast(`${r.monthsAvailable} months of rent reported to all three bureaus`); ctx.rerender();
  };
  const rent = el('div', { class: 'card card-pad stack-3' },
    el('div', { class: 'row-between' }, el('h2', { class: 'h3' }, 'Rent'), engineTag('CreditBuilderIQ')),
    !r.linked ? el('div', { class: 'stack-2' }, el('p', {}, 'Link the account you pay rent from. We read it — never move money — and find your on-time rent payments, up to 24 months back.'),
        el('button', { class: 'btn btn-primary', style: { justifySelf: 'start' }, onclick: link }, 'Link bank (MX)'))
      : r.backfilled ? el('div', { class: 'stack-2' }, el('div', { class: 'row' }, el('span', { class: 'tick' }, '✓'), el('b', {}, `${r.monthsAvailable} months of on-time rent reporting to Experian, TransUnion and Equifax`)), el('p', { class: 'small muted' }, 'New months report automatically. Missed or late months are never reported.'))
      : el('div', { class: 'stack-2' }, el('div', { class: 'row' }, el('span', { class: 'h2 tabular' }, String(r.monthsAvailable)), el('span', { class: 'muted' }, 'on-time rent payments found in your bank history')),
        el('button', { class: 'btn btn-primary', style: { justifySelf: 'start' }, onclick: report }, `Report ${r.monthsAvailable} months`)),
    el('p', { class: 'small muted' }, 'Reported rent adds history to all three bureaus. Twelve months of on-time rent in your bank data can also count directly with your lender (DU rent history — payments of $300 or more).'));
  const UTIL = ['Gas', 'Electric', 'Water', 'Phone'];
  const utilities = el('div', { class: 'card card-pad stack-3' },
    el('div', { class: 'row-between' }, el('h2', { class: 'h3' }, 'Utilities'), engineTag('CreditBuilderIQ')),
    el('p', {}, 'Pick the bills you pay on time. We report them monthly with 24 months of history where it exists.'),
    el('div', { class: 'util-chips' }, UTIL.map((u) => el('button', { class: 'chip' + (c.utilities.includes(u) ? ' on' : ''), type: 'button', onclick: () => { c.utilities = c.utilities.includes(u) ? c.utilities.filter((x) => x !== u) : c.utilities.concat(u); ctx.save(); ctx.rerender(); } }, (c.utilities.includes(u) ? '✓ ' : '+ ') + u))),
    c.utilities.length ? el('p', { class: 'small muted' }, `${c.utilities.length} reporting${c.utilities.length >= 2 ? ' — with rent, that’s a nontraditional credit file lenders can use.' : '.'}`) : null);
  return el('div', { class: 'stack-4' },
    head('Build history', 'Turn bills you already pay into history.', 'On-time payments only — misses are never reported.'),
    rent, utilities, regB());
}

// ---------- Why it moved ----------
export function renderNumber(ctx) {
  const c = ctx.c, s = c.score;
  if (s.value == null) return el('div', { class: 'stack-4' }, head('Why it moved', 'No score yet — and that’s the plan.', 'Scores need history. Rent and utilities give the bureaus something to score; a first FICO® Score usually follows within a few months of reporting.', 'MyScoreIQ'), regB());
  const d = s.value - (s.prev ?? s.value);
  return el('div', { class: 'stack-4' },
    head('Why it moved', 'Every point, tied to a cause.', `Updated ${fmtDate(s.updated)}.`, 'MyScoreIQ'),
    el('div', { class: 'card card-pad stack-3' },
      el('div', { class: 'row', style: { gap: '14px' } }, el('span', { class: 'number-value', style: { fontSize: 'var(--fs-44)' } }, String(s.prev ?? s.value)), el('span', { class: 'muted h2' }, '→'), el('span', { class: 'number-value', style: { fontSize: 'var(--fs-44)' } }, String(s.value)), el('span', { class: `number-delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}` }, d > 0 ? `+${d}` : String(d))),
      c.deltas.length ? el('ul', { class: 'list-rows' }, c.deltas.map((x) => el('li', { class: 'row-between' }, el('span', {}, x.cause), el('b', { class: 'tabular', style: { color: x.points >= 0 ? 'var(--success)' : 'var(--danger)' } }, (x.points > 0 ? '+' : '') + x.points)))) : el('p', { class: 'muted' }, 'No change since your last check.'),
      el('div', { class: 'number-bureaus' }, Object.entries(s.bureaus).map(([k, v]) => el('span', {}, k[0].toUpperCase() + k.slice(1), el('b', {}, v ?? '—'))))),
    el('p', { class: 'small muted' }, 'FICO® Score — not the mortgage-industry version lenders pull. A guide, not a preapproval.'), regB());
}
