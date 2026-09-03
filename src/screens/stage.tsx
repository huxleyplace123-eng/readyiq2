// src/screens/stage.tsx — the four-stage vocabulary, once, for every LO/CR surface.
export type Stage = 'not_ready' | 'working' | 'approaching' | 'ready_to_review';
export const STAGE_LABEL: Record<Stage, string> = { not_ready: 'Not ready', working: 'Working', approaching: 'Approaching ready', ready_to_review: 'Ready to review' };
export const STAGE_TONE: Record<Stage, string> = { not_ready: 'muted', working: 'teal', approaching: 'gold', ready_to_review: 'lime' };
export const BUCKETS: [string, string][] = [['not_ready', 'Not ready'], ['working', 'Progressing'], ['ready', 'Ready to review']];
export function bucketOf(s: Stage): 'not_ready' | 'working' | 'ready' { return s === 'not_ready' ? 'not_ready' : s === 'working' ? 'working' : 'ready'; }
export function StagePill({ stage }: { stage: Stage }) { return <span className={`status-cell ${STAGE_TONE[stage]}`}>● {STAGE_LABEL[stage]}</span>; }
