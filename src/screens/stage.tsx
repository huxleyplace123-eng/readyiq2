// src/screens/stage.tsx — the four-stage vocabulary, once, for every LO/CR surface — and the one
// table both sides read it from, so a credit-repair firm and a loan officer see the same row.
import { useState, type ReactNode } from "react";

export type Stage = 'not_ready' | 'working' | 'approaching' | 'ready_to_review';
export const STAGE_LABEL: Record<Stage, string> = { not_ready: 'Not ready', working: 'Working', approaching: 'Approaching ready', ready_to_review: 'Ready to review' };
// Tones are the portal's own palette (v11.css: blue · mint · gold · lime), so a stage pill sits in a
// table next to a person-avatar without looking like it came from somewhere else.
export const STAGE_TONE: Record<Stage, string> = { not_ready: 'blue', working: 'mint', approaching: 'gold', ready_to_review: 'lime' };
export type Bucket = 'not_ready' | 'working' | 'ready';
export const BUCKETS: [Bucket, string][] = [['not_ready', 'Not ready'], ['working', 'Progressing'], ['ready', 'Ready to review']];
export function bucketOf(s: Stage): Bucket { return s === 'not_ready' ? 'not_ready' : s === 'working' ? 'working' : 'ready'; }
export function StagePill({ stage }: { stage: Stage }) { return <span className={`status-cell ${STAGE_TONE[stage]}`}>● {STAGE_LABEL[stage]}</span>; }

/** One row of the shared table. `action` is the one thing to do next; `secondary` is optional and quieter. */
export type StageRow = {
  key: string; name: string; initials: string; tone: string; sub: string; stage: Stage; blocker: string;
  when: string; source: string; action: { label: string; run: () => void }; secondary?: ReactNode; onOpen?: () => void;
};

/**
 * The readiness table, in the portal's own table style (borrower-table): column headers, avatars,
 * stage pills, one blocker per person, one action. Filter tabs stand in for the three buckets.
 */
export function StageTable({ rows, columns, kicker, title, foot }: { rows: StageRow[]; columns: { who: string; when: string; source: string }; kicker: string; title: string; foot?: ReactNode }) {
  const [filter, setFilter] = useState<'all' | Bucket>('all');
  const count = (b: Bucket) => rows.filter((r) => bucketOf(r.stage) === b).length;
  const shown = filter === 'all' ? rows : rows.filter((r) => bucketOf(r.stage) === filter);
  return <section className="borrower-table-card pipeline-table stage-card">
    <div className="card-title-row">
      <div><span className="section-kicker">{kicker}</span><h3>{title}</h3></div>
      <div className="filter-tabs stage-tabs" role="tablist">
        <button role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All<b>{rows.length}</b></button>
        {BUCKETS.map(([key, label]) => <button key={key} role="tab" aria-selected={filter === key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}<b>{count(key)}</b></button>)}
      </div>
    </div>
    <div className="table-wrap"><table className="borrower-table stage-table">
      <thead><tr><th>{columns.who}</th><th>Stage</th><th>What's in the way</th><th>{columns.when}</th><th>{columns.source}</th><th /></tr></thead>
      <tbody>{shown.map((r) => <tr key={r.key} onClick={r.onOpen}>
        <td data-label={columns.who}><span className={`person-avatar ${r.tone}`}>{r.initials}</span><div><strong>{r.name}</strong><small>{r.sub}</small></div></td>
        <td data-label="Stage"><StagePill stage={r.stage} /></td>
        <td data-label="What's in the way" className="stage-blocker">{r.blocker}</td>
        <td data-label={columns.when}>{r.when}</td>
        <td data-label={columns.source}>{r.source}</td>
        <td className="stage-cell-actions"><div className="stage-actions"><button className="cx-inline" onClick={(e) => { e.stopPropagation(); r.action.run(); }}>{r.action.label}</button>{r.secondary}</div></td>
      </tr>)}</tbody>
    </table></div>
    {shown.length === 0 && <p className="stage-empty">Nobody here right now.</p>}
    {foot}
  </section>;
}
