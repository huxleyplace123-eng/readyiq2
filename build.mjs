// build.mjs — bundle the React app (v11 look) into ./site as a static site. `node build.mjs` (add --watch to rebuild on change).
import { build, context } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');
mkdirSync('site', { recursive: true });

const css = ['src/styles/inter.css', 'src/styles/v11.css', 'src/styles/additions.css', 'src/styles/consumer-v2.css'].map((f) => { try { return readFileSync(f, 'utf8'); } catch { return ''; } }).join('\n');
writeFileSync('site/app.css', css);
writeFileSync('site/index.html', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ReadyIQ for mortgage companies</title>
<meta name="description" content="A lender-owned credit-readiness platform that turns credit-challenged leads into future borrowers — check, plan, dispute, build, and return to the original loan officer. Not a CRM.">
<link rel="icon" href="brands/favicon.svg"><link rel="stylesheet" href="app.css"></head>
<body><div id="root"></div><script src="app.js"></script></body></html>
`);

const opts = { entryPoints: ['src/main.tsx'], bundle: true, outfile: 'site/app.js', format: 'iife', jsx: 'automatic', loader: { '.tsx': 'tsx', '.ts': 'ts', '.js': 'jsx' }, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'info', minify: !watch, sourcemap: watch };
if (watch) { const ctx = await context(opts); await ctx.watch(); console.log('watching…'); } else { await build(opts); }
