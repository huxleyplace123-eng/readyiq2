import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/styles/premium.css', import.meta.url), 'utf8');
const lenderScreens = await readFile(new URL('../src/screens/lo.tsx', import.meta.url), 'utf8');

test('mobile portal layouts use contained, responsive compositions', () => {
  assert.match(css, /\.consumer-app \.plan-percent\{[^}]*transform:none/);
  assert.match(css, /\.filter-tabs\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)[^}]*overflow:visible/);
  assert.match(css, /\.borrower-identity\{[^}]*width:100%[^}]*min-width:0/);
  assert.match(css, /\.contact-row\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.lx-body\{[^}]*grid-template-columns:92px minmax\(0,1fr\)/);
});

test('partner dashboard replaces fixed inline grids with responsive classes', () => {
  assert.match(lenderScreens, /className="partner-detail-grid"/);
  assert.match(lenderScreens, /className="kpi-grid partner-kpis"/);
  assert.doesNotMatch(lenderScreens, /gridTemplateColumns: "148px 1fr"/);
  assert.match(css, /\.partner-detail-grid\{display:grid;grid-template-columns:148px minmax\(0,1fr\)/);
  assert.match(css, /@media\(max-width:380px\)[\s\S]*\.partner-detail-grid\{grid-template-columns:76px minmax\(0,1fr\)/);
});

test('narrow-screen text is allowed to wrap instead of clipping', () => {
  assert.match(css, /\.cx-pill\{[^}]*max-width:100%[^}]*white-space:normal/);
  assert.match(css, /\.letter-preview-head h3,\.letter-preview-head p\{[^}]*overflow-wrap:anywhere/);
  assert.match(css, /\.attention-list \.attention-tag\{[^}]*white-space:normal/);
});
