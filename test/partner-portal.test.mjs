// test/partner-portal.test.mjs — the credit-repair portal is built from the lender portal's own parts,
// and both feeds read stages from one table. If this fails, one side of the handoff drifted into a
// different-looking product.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const partner = read('../src/screens/partner.tsx');
const stage = read('../src/screens/stage.tsx');
const lo = read('../src/screens/lo.tsx');
const css = read('../src/styles/additions.css');
const page = read('../src/v11-page.tsx');

test('the partner portal uses the lender shell: sidebar, header, hero, KPIs, table', () => {
  for (const c of ['lender-app', 'lender-sidebar', 'lender-header', 'header-search', 'user-menu', 'cx-hero lx-hero', 'kpi-grid lx-kpis', 'sidebar-support', 'brand-mark inverse']) assert.ok(partner.includes(c), c);
  assert.ok(partner.includes('<StageTable'), 'cases render through the shared table');
  for (const p of ['LoanOfficersPage', 'ReferralLogPage', 'CompanyPage']) assert.ok(partner.includes(`function ${p}`), `${p} is a real page`);
  assert.ok(!partner.includes('Referral log</button>') || !partner.includes('alert("Every send'), 'the nav items open pages, not alerts');
});

test('both sides read stages from one table with real column headers', () => {
  assert.ok(stage.includes('export function StageTable'));
  assert.ok(stage.includes('<th>{columns.who}</th><th>Stage</th>'), 'a real table, not stacked cards');
  assert.ok(stage.includes('filter-tabs'), 'the three buckets are filter tabs, the portal way');
  assert.ok(lo.includes('<StageTable'), 'the LO feed uses it too');
  assert.ok(!lo.includes('lx-row') && !partner.includes('partner-row'), 'the ad-hoc row grids are gone');
  assert.ok(!css.includes('.lx-row{') && !css.includes('.partner-row{'), 'and so are their styles');
});

test('stage tones come from the portal palette', () => {
  const tones = stage.match(/STAGE_TONE[^}]*}/)[0];
  for (const t of ['blue', 'mint', 'gold', 'lime']) assert.ok(tones.includes(`'${t}'`), t);
  assert.ok(!/teal|muted/.test(tones), 'no off-palette tones');
  assert.ok(!css.includes('.status-cell.teal') && !css.includes('.status-cell.muted'), 'the off-palette pill colors are gone');
});

test('the referral log reads the rail when one is connected, and shows consent per row', () => {
  assert.ok(partner.includes('listReferrals('));
  assert.ok(partner.includes('<th>Consent</th>'));
  assert.ok(partner.includes('r.consent.granted_at'), 'the consent stamp comes from the referral itself');
});

test('the tour hands the partner portal a door into Connections', () => {
  assert.ok(page.includes('<PartnerApp openIntegrations='));
});

test('the stage table collapses to cards on phones', () => {
  assert.match(css, /@media\(max-width:767px\)\{[\s\S]*?\.stage-table thead\{display:none\}/);
  assert.match(css, /\.stage-table td::before\{content:attr\(data-label\)/);
});
