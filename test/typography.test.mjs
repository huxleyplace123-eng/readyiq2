import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/styles/premium.css', import.meta.url), 'utf8');

test('portal typography uses a restrained four-level weight system', () => {
  assert.match(css, /--type-regular:400/);
  assert.match(css, /--type-control:540/);
  assert.match(css, /--type-emphasis:610/);
  assert.match(css, /--type-value:660/);
  assert.match(css, /\.demo-canvas :where\(h1,h2,h3,h4\)\{font-weight:var\(--type-emphasis\)\}/);
  assert.match(css, /\.demo-canvas :where\(p,li,td,dd,label,small\)\{font-weight:var\(--type-regular\)\}/);
});

test('navigation, controls, statuses, and scores have distinct emphasis', () => {
  assert.match(css, /\.demo-toolbar \.mode-switch button\{font-weight:var\(--type-control\)\}/);
  assert.match(css, /\.demo-canvas \.lender-sidebar nav button,/);
  assert.match(css, /\.status-cell,\.status-pill,\.info-badge/);
  assert.match(css, /\.large-score-ring strong,\.score-ring strong,\.bureau-score-values article strong/);
});

test('dense public sections inherit the lighter hierarchy without changing heroes', () => {
  assert.match(css, /\.site \.site-section :where\(h2,h3,h4\)\{font-weight:600\}/);
  assert.match(css, /\.site \.site-section \.steps small\{font-weight:580/);
  assert.doesNotMatch(css, /\.site-hero h1\{font-weight:var\(--type-emphasis\)/);
  assert.doesNotMatch(css, /\.b2b-hero h1\{font-weight:var\(--type-emphasis\)/);
});
