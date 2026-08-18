// scripts/gen-qr.mjs — dev-time: pre-generate scannable QR SVGs for every link code in the fixtures.
import { mkdirSync, writeFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { fixtures } from '../src/state.js';
const BASE = process.env.READYIQ_BASE || 'https://ready.harborhomeloans.com/r/?c=';
mkdirSync('site/assets/qr', { recursive: true });
for (const code of Object.keys(fixtures().links)) {
  const svg = await QRCode.toString(BASE + code, { type: 'svg', margin: 1, color: { dark: '#0D2024', light: '#FFFFFF' }, errorCorrectionLevel: 'M' });
  writeFileSync(`site/assets/qr/${code}.svg`, svg);
  console.log('wrote', code);
}
