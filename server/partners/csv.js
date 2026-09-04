// server/partners/csv.js — Level 0. The operator already pulls the report; they type blocker-level facts, never the report.
import { normalizeUpdate } from './normalize.js';

export const CSV_COLUMNS = ['consumer_ref', 'occurred_at', 'disputes_open', 'disputes_resolved', 'round_completed', 'rent_months_verified', 'blockers_cleared', 'note'];
const TRUTHY = new Set(['yes', 'true', '1', 'y']);

export function parseCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const header = splitRow(lines[0]);
  for (const h of header) if (!CSV_COLUMNS.includes(h)) throw new RangeError(`unknown column "${h}"`);
  return lines.slice(1).map((line) => {
    const cells = splitRow(line);
    const row = Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']));
    return normalizeUpdate({
      source: 'csv',
      consumer_ref: row.consumer_ref,
      occurred_at: row.occurred_at ? `${row.occurred_at}T00:00:00Z` : undefined,
      disputes: { open: row.disputes_open, resolved: row.disputes_resolved },
      round_completed: TRUTHY.has(String(row.round_completed).trim().toLowerCase()),
      rent_months_verified: row.rent_months_verified,
      blockers_cleared: row.blockers_cleared ? row.blockers_cleared.split('|').map((s) => s.trim()).filter(Boolean) : [],
      note: row.note || null,
    });
  });
}

/** Minimal RFC-4180 split: commas, double quotes, doubled quotes inside quotes. */
function splitRow(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
