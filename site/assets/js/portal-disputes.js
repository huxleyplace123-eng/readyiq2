// site/assets/js/portal-disputes.js — Dispute Hub: four-step guided flow per item
// (Review item → Choose reason → Build letter → Track response), mortgage-priority ordering,
// sequenced to finish before review, paused while a loan file is active.
import { fmtDate, addDays, TODAY } from './state.js';
import { el, engineTag, regB, toast, fmtMoney } from './ui.js';

const head = (eyebrow, title, sub, engine) => el('div', { class: 'view-head' },
  el('p', { class: 'eyebrow' }, eyebrow), el('h1', { class: 'h2' }, title), sub ? el('p', { class: 'muted' }, sub) : null, engine ? engineTag(engine) : null);

const CATS = {
  payment_amount: { label: 'Wrong payment amount', why: (d) => `Inflates your DTI by ${fmtMoney(d.dtiImpact)}/mo — this one can decide whether you qualify.`, reasons: ['The reported monthly payment is incorrect', 'The account is in deferment / forbearance', 'The balance is incorrect'] },
  duplicate: { label: 'Duplicate account', why: () => 'Counts one debt twice — inflates balances and DTI.', reasons: ['This account appears more than once', 'A collection duplicates the original account', 'The balance is reported twice'] },
  late: { label: 'Late payment you didn’t make', why: () => 'Inside the 24 months underwriting weighs most.', reasons: ['Payment history is inaccurate', 'The payment was made on time', 'The account was current on that date'] },
  collection: { label: 'Collection that isn’t accurate', why: () => 'Derogatory — some programs require it resolved.', reasons: ['The reported balance is incorrect', 'This debt was paid or settled', 'This account is not mine'] },
  date: { label: 'Wrong date', why: () => 'Extends how long a derogatory stays on the report.', reasons: ['Account dates are incorrect', 'Date of first delinquency is wrong'] },
  not_mine: { label: 'Not my account', why: () => 'Possible fraud or a mixed file — resolve before applying.', reasons: ['I do not recognize this account', 'This account belongs to someone else'] },
};
const ORDER = Object.keys(CATS);
const BUREAUS = ['Experian', 'TransUnion', 'Equifax'];

export function renderDisputes(ctx) {
  const c = ctx.c, lo = ctx.lo;
  const list = [...c.disputes].sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));
  const ui = (ctx.state.session.disputeUI = ctx.state.session.disputeUI || { selected: null, step: 1 });
  if (!list.some((d) => d.id === ui.selected)) { ui.selected = list[0]?.id || null; ui.step = 1; }
  const d = list.find((x) => x.id === ui.selected) || null;
  if (d && d.status !== 'draft') ui.step = 4;
  const counts = {
    flagged: list.length, drafts: list.filter((x) => x.status === 'draft').length,
    sent: list.filter((x) => x.status === 'sent' || x.status === 'responded').length,
    due: list.filter((x) => x.responseDue && x.status === 'sent').map((x) => x.responseDue).sort()[0] || null,
  };
  const setStep = (n) => { ui.step = n; ctx.save(); ctx.rerender(); };
  const select = (id) => { ui.selected = id; ui.step = 1; ctx.save(); ctx.rerender(); };
  const advance = () => {
    const next = { draft: 'sent', sent: 'responded', responded: 'resolved' }[d.status]; if (!next) return;
    d.status = next;
    if (next === 'sent') { d.sentAt = TODAY; d.responseDue = addDays(TODAY, 33); const m = c.milestones.find((x) => x.label === 'Disputes sent'); if (m && m.state === 'upcoming') { m.state = 'done'; m.date = TODAY; } }
    if (next === 'resolved') {
      if (d.category === 'payment_amount' && d.dtiImpact) { const t = c.credit.monthlyDebts.find((x) => /navient/i.test(x.name)); if (t) t.payment = 0; }
      if (c.disputes.every((x) => x.status === 'resolved')) {
        c.milestones.forEach((m) => { if (m.state === 'current') { m.state = 'done'; m.date = m.date || TODAY; } });
        const m = c.milestones.find((x) => x.label === 'Disputes resolved'); if (m) { m.state = 'current'; m.date = TODAY; }
      }
    }
    ctx.save(); toast(next === 'sent' ? 'Letter approved — 30-day clock started' : next === 'responded' ? 'Bureau response logged' : 'Resolved'); ctx.rerender();
  };

  const summary = el('div', { class: 'grid-4 dispute-summary' },
    [['Items flagged', counts.flagged, '◇'], ['Draft letters', counts.drafts, '▤'], ['Sent to bureaus', counts.sent, '↗'], ['Next response due', counts.due ? fmtDate(counts.due).replace(/, \d{4}$/, '') : '—', '⌁']].map(([l, v, i]) =>
      el('div', { class: 'card stack-1', style: { padding: '14px 16px' } }, el('span', { class: 'small muted' }, `${i} ${l}`), el('b', { class: 'h3 tabular' }, String(v)))));

  const steps = el('div', { class: 'tabs steps-tabs' }, [[1, 'Review item'], [2, 'Choose reason'], [3, 'Build letter'], [4, 'Track response']].map(([n, l]) =>
    el('button', { class: ui.step === n ? 'active' : '', disabled: !d || (n > ui.step && d.status === 'draft'), onclick: () => n <= ui.step && setStep(n) }, el('span', { class: 'small', style: { opacity: .7 } }, ui.step > n ? '✓' : String(n)), l)));

  const itemRow = (x) => el('button', { class: 'dispute-item' + (x.id === ui.selected ? ' selected' : ''), onclick: () => select(x.id) },
    el('div', { class: 'row-between' }, el('span', { class: 'chip chip-outline' }, CATS[x.category].label), el('span', { class: `pill pill-${x.status}` }, x.status)),
    el('p', {}, x.item), el('span', { class: 'small muted' }, CATS[x.category].why(x)));

  const detail = () => {
    if (!d) return el('div', { class: 'card card-pad stack-2' }, el('h2', { class: 'h3' }, 'Nothing flagged.'), el('p', { class: 'muted' }, 'We check every refresh — once a month — for negative items and mismatches across bureaus. If something looks wrong, it shows up here with a guided letter.'));
    const cat = CATS[d.category];
    const facts = el('dl', { class: 'kv' }, el('dt', {}, 'Item'), el('dd', {}, cat.label), el('dt', {}, 'Reported by'), el('dd', {}, (d.bureaus || BUREAUS).join(' · ')), el('dt', {}, 'Why it matters for a mortgage'), el('dd', { style: { textAlign: 'right', maxWidth: '30ch', fontWeight: 500 } }, cat.why(d)), el('dt', {}, 'Status'), el('dd', {}, d.status));
    if (ui.step === 1) return el('div', { class: 'card card-pad stack-3' },
      el('div', { class: 'row-between wrap' }, el('div', {}, el('p', { class: 'eyebrow' }, `Item ${list.indexOf(d) + 1} of ${list.length}`), el('h2', { class: 'h3' }, d.item)), el('span', { class: `pill pill-${d.status}` }, d.status)),
      facts,
      el('div', { class: 'card card-soft', style: { padding: '12px 14px' } }, el('b', {}, 'CreditBuilderIQ flagged this for review.'), el('p', { class: 'small', style: { color: 'var(--brand-ink)' } }, 'Compare it with your own records. Only dispute information you believe is incomplete or inaccurate — nothing is disputed automatically.')),
      el('div', { class: 'row-between wrap' },
        el('button', { class: 'btn btn-outline btn-sm', onclick: () => ctx.openAsk?.(`Explain the ${cat.label.toLowerCase()} on my report`) }, 'Explain this item'),
        c.guardian ? el('span', { class: 'small muted' }, 'Paused while your file is active')
          : d.status === 'draft' ? el('button', { class: 'btn btn-primary', onclick: () => setStep(2) }, 'This information is inaccurate ', el('span', { class: 'arrow' }, '→'))
          : el('button', { class: 'btn btn-secondary', onclick: () => setStep(4) }, 'Track response →')));
    if (ui.step === 2) return el('div', { class: 'card card-pad stack-3' },
      el('p', { class: 'eyebrow' }, 'Why are you disputing this item?'), el('h2', { class: 'h3' }, 'Pick the statement that fits best.'),
      el('div', { class: 'stack-2' }, cat.reasons.map((r) => el('label', { class: 'radio' }, el('input', { type: 'radio', name: 'reason', checked: (d.reason || cat.reasons[0]) === r, onchange: () => { d.reason = r; ctx.save(); } }), r))),
      el('div', { class: 'stack-2' }, el('span', { class: 'label' }, 'Dispute with'), el('div', { class: 'row wrap' }, BUREAUS.map((b) => el('label', { class: 'chip', style: { cursor: 'pointer', gap: '8px' } }, el('input', { type: 'checkbox', style: { accentColor: 'var(--brand)' }, checked: (d.bureaus || BUREAUS).includes(b), onchange: (e) => { const set = new Set(d.bureaus || BUREAUS); e.target.checked ? set.add(b) : set.delete(b); d.bureaus = BUREAUS.filter((x) => set.has(x)); ctx.save(); } }), b)))),
      el('div', { class: 'row-between' }, el('button', { class: 'btn btn-outline btn-sm', onclick: () => setStep(1) }, 'Back'), el('button', { class: 'btn btn-primary', onclick: () => { d.reason = d.reason || cat.reasons[0]; ctx.save(); setStep(3); } }, 'Build my letter ', el('span', { class: 'arrow' }, '→'))));
    if (ui.step === 3) return el('div', { class: 'card card-pad stack-3' },
      el('div', { class: 'row-between wrap' }, el('div', {}, el('p', { class: 'eyebrow' }, 'Custom dispute letter'), el('h2', { class: 'h3' }, `${(d.bureaus || BUREAUS).join(' + ')} · ready to review`)), el('span', { class: 'pill pill-draft' }, 'draft')),
      el('div', { class: 'letter' },
        el('span', { class: 'small muted' }, fmtDate(TODAY, { long: true })),
        el('b', {}, 'Re: Request to investigate inaccurate account information'),
        el('p', {}, 'To whom it may concern,'),
        el('p', {}, 'I am writing to dispute information appearing on my consumer credit report for the account below.'),
        el('dl', { class: 'kv' }, el('dt', {}, 'Item'), el('dd', {}, d.item), el('dt', {}, 'Reason'), el('dd', {}, d.reason || cat.reasons[0])),
        el('p', {}, 'Please investigate this information and correct or delete any information that cannot be verified as complete and accurate, and send me the results of your investigation.'),
        el('p', {}, `Sincerely,\n${c.first} ${c.last}`),
        el('span', { class: 'small muted', style: { fontStyle: 'italic' } }, 'Letter shortened for this prototype.')),
      el('div', { class: 'row wrap' }, ['✎ Edit letter', '＋ Attach evidence', '↓ Download PDF'].map((t) => el('button', { class: 'btn btn-outline btn-sm', onclick: () => toast(`${t.slice(2)} — opens here in the product`) }, t))),
      el('div', { class: 'row-between' }, el('button', { class: 'btn btn-outline btn-sm', onclick: () => setStep(2) }, 'Back'), el('button', { class: 'btn btn-primary', onclick: advance }, 'Approve & mark sent ', el('span', { class: 'arrow' }, '→'))),
      el('p', { class: 'small muted' }, 'You approve every letter. ReadyIQ never claims accurate information can be removed and never guarantees a result.'));
    // step 4 — track
    return el('div', { class: 'card card-pad stack-3' },
      el('div', { class: 'row-between wrap' }, el('div', {}, el('p', { class: 'eyebrow' }, 'Tracking'), el('h2', { class: 'h3' }, d.status === 'resolved' ? 'Resolved.' : d.status === 'responded' ? 'The bureau responded.' : 'Your letter is on the clock.')), el('span', { class: `pill pill-${d.status}` }, d.status)),
      el('div', { class: 'grid-3' }, [['Sent to', (d.bureaus || BUREAUS).join(' + ')], ['Sent date', d.sentAt ? fmtDate(d.sentAt) : '—'], ['Response target', d.responseDue ? fmtDate(d.responseDue) : '—']].map(([l, v]) => el('div', { class: 'card stack-1', style: { padding: '12px 14px', background: 'var(--paper-2)' } }, el('span', { class: 'small muted' }, l), el('b', {}, v)))),
      el('p', { class: 'muted' }, d.status === 'resolved' ? (d.dtiImpact ? `The reported payment is corrected — ${fmtMoney(d.dtiImpact)}/mo of debt comes off your DTI estimate.` : 'This item is resolved. It no longer blocks your review.') : `Bureaus have about 30 days to investigate. Log the response when it arrives — ${lo.first} sees “disputes resolved” as a milestone, never the letters.`),
      el('div', { class: 'row wrap' },
        d.status === 'sent' ? el('button', { class: 'btn btn-primary', onclick: advance }, 'Log bureau response') : null,
        d.status === 'responded' ? el('button', { class: 'btn btn-primary', onclick: advance }, 'Mark resolved') : null,
        list.filter((x) => x.id !== d.id && x.status !== 'resolved').length ? el('button', { class: 'btn btn-secondary', onclick: () => select(list.find((x) => x.id !== d.id && x.status !== 'resolved').id) }, 'Next flagged item →') : null));
  };

  return el('div', { class: 'stack-4' },
    head('Dispute Hub', 'Find it. Dispute it. Track it.', 'Priority goes to inaccuracies that block a mortgage — wrong payment amounts, duplicates, recent lates, collections, dates, accounts that aren’t yours. Nothing is disputed automatically.', 'CreditBuilderIQ'),
    c.guardian ? el('div', { class: 'banner banner-warn', style: { gridTemplateColumns: '1fr' } }, el('span', {}, `Disputes are paused while your loan file is active. Ask ${lo.first} before sending anything.`)) : null,
    summary, steps,
    el('div', { class: 'dispute-layout' },
      el('div', { class: 'card dispute-list' }, el('div', { class: 'small muted', style: { padding: '12px 16px 4px' } }, 'Credit report items'), list.length ? list.map(itemRow) : el('div', { class: 'muted', style: { padding: '12px 16px 16px' } }, 'Nothing flagged right now.')),
      detail()),
    el('div', { class: 'card card-soft card-pad stack-1' }, el('b', {}, 'We sequence disputes to finish before your review.'), el('p', { class: 'small', style: { color: 'var(--brand-ink)' } }, 'Lenders don’t like open disputes on a file. Every letter here runs on the same 30-day clock so they close together — and we never suggest a dispute during an active loan.')),
    regB());
}
