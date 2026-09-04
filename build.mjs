// build.mjs — bundle the React app into ./site as a static site. `node build.mjs` (add --watch to rebuild on change).
// Emits one index.html per route (clean URLs on GitHub Pages, no server), each with <base href> back to the site root,
// its own <title>/<meta>, and window.__ROUTE__ so the app knows which page it is. Also writes sitemap.xml + robots.txt.
import { build, context } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const watch = process.argv.includes('--watch');
const V = Date.now().toString(36); // cache-buster for app.js / app.css (GitHub Pages caches assets for 10 minutes)
const SITE_URL = 'https://huxleyplace123-eng.github.io/readyiq2/';
mkdirSync('site', { recursive: true });

const css = ['src/styles/inter.css', 'src/styles/v11.css', 'src/styles/additions.css', 'src/styles/consumer-v2.css', 'src/styles/leader.css', 'src/styles/site.css', 'src/styles/premium.css']
  .map((f) => { try { return readFileSync(f, 'utf8'); } catch { return ''; } }).join('\n');
writeFileSync('site/app.css', css);

// path → [title, description]
const ROUTES = {
  '': ['ReadyIQ — turn declines into a managed pipeline', 'Every not-ready borrower gets a readiness stage, a plan, and a way back to the loan officer. Credit-repair partners work the file. One signal comes back when it is time: ready to review.'],
  'platform': ['How ReadyIQ works — four stages, one buffer, one signal', 'A decline is a stage, not an ending. The loop between loan officers and credit-repair partners, with a buffer so nobody is called ready on a non-mortgage score.'],
  'credit-repair': ['ReadyIQ for credit repair firms — win and keep LO referral relationships', 'Send a client back to their loan officer with consent, in one screen: a stage and the blockers, never a score or the report.'],
  'loan-officers': ['ReadyIQ for loan officers — who’s not ready, progressing, ready to review', 'One feed, one blocker per person, one signal when a soft pull is worth your money.'],
  'consumers': ['ReadyIQ for borrowers — your stage and your next step', 'You are not a decline. See where you are, the one thing to do next, and who can see what.'],
  'partners': ['ReadyIQ for partners — realtors and property managers', 'Partner links and QR for realtors and buildings. Renters start rent history 12–24 months early. Coarse status only.'],
  'products/check': ['Check your credit without hurting your score | ReadyIQ', 'With your permission, see information from Equifax, Experian, and TransUnion through a soft credit check.'],
  'products/dispute-hub': ['Dispute Hub — by bureau, one item at a time | ReadyIQ', 'Negative items by bureau, handled one at a time: is this right → reason → letter → track. CreditBuilderIQ.'],
  'products/build-report': ['Add eligible rent and bill history | ReadyIQ', 'See whether eligible rent and everyday bills can help add positive payment history to your credit files.'],
  'products/protect-mode': ['Protect Mode — from application to closing | ReadyIQ', 'Disputes paused, report watched daily, ask before you act. Keeps files from blowing up before closing.'],
  'products/passport': ['Share your ReadyIQ progress | ReadyIQ', 'A simple progress summary the consumer controls and chooses when to share.'],
  'products/ask': ['Ask ReadyIQ — mortgage guidance in plain English', 'Clear explanations of common mortgage questions. ReadyIQ never predicts an approval.'],
  'integrations': ['Integrations — CSV, Zapier and webhooks today; connectors by agreement | ReadyIQ', 'Reach every CRM through a signed webhook today. Shape and Total Expert connectors available; DisputeChat native on the credit-repair side.'],
  'trust': ['Privacy and trust | ReadyIQ', 'See what is shared, what stays private, and how the consumer stays in control.'],
  'resources': ['Resources — guide, explainers, FAQ | ReadyIQ', 'The guide to the eight leader moves, consumer score vs. mortgage score, and frequent questions.'],
  'resources/guide': ['The ReadyIQ Guide — eight ways to make the next step easier', 'Eight clear examples, each linked to the live product tour.'],
  'book-a-demo': ['Book a ReadyIQ demo', 'See how ReadyIQ works with your leads and the tools your team already uses.'],
  'sign-in': ['Sign in | ReadyIQ', 'Loan officers and organizations sign in; consumers use the link their loan officer sent.'],
  'demo': ['ReadyIQ — live demo', 'The interactive prototype: website, organization portal, consumer portal, integration hub.'],
};

const html = (route, title, desc) => {
  const depth = route === '' ? 0 : route.split('/').length;
  const base = depth === 0 ? './' : '../'.repeat(depth);
  const canonical = SITE_URL + (route ? route + '/' : '');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base href="${base}">
<title>${title}</title>
<meta name="description" content="${desc.replace(/"/g, '&quot;')}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${title.replace(/"/g, '&quot;')}"><meta property="og:description" content="${desc.replace(/"/g, '&quot;')}"><meta property="og:type" content="website"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${SITE_URL}readyiq-social.png"><meta property="og:image:width" content="1736"><meta property="og:image:height" content="909"><meta property="og:image:alt" content="ReadyIQ — a clear path from not yet to ready">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${SITE_URL}readyiq-social.png">
<meta name="theme-color" content="#0d2024">
<link rel="icon" href="brands/favicon.svg"><link rel="stylesheet" href="app.css?v=${V}">
<script>window.__ROUTE__=${JSON.stringify(route)};</script></head>
<body><div id="root"></div><script src="app.js?v=${V}"></script></body></html>
`;
};
for (const [route, [title, desc]] of Object.entries(ROUTES)) {
  const dir = route ? join('site', route) : 'site';
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html(route, title, desc));
}
writeFileSync('site/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(ROUTES).filter((r) => r !== 'demo').map((r) => `  <url><loc>${SITE_URL}${r ? r + '/' : ''}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync('site/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);
writeFileSync('site/.nojekyll', '');

const opts = { entryPoints: ['src/main.tsx'], bundle: true, outfile: 'site/app.js', format: 'iife', jsx: 'automatic', loader: { '.tsx': 'tsx', '.ts': 'ts', '.js': 'jsx' }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'info', minify: !watch, sourcemap: watch };
if (watch) { const ctx = await context(opts); await ctx.watch(); console.log('watching…'); } else { await build(opts); }
