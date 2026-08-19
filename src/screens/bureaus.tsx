export type BureauScoreSet = {
  equifax: number;
  experian: number;
  transunion: number;
  deltas?: Partial<Record<"equifax" | "experian" | "transunion", string>>;
};

const BUREAUS = [
  ["equifax", "EQ", "Equifax"],
  ["experian", "EX", "Experian"],
  ["transunion", "TU", "TransUnion"],
] as const;

export const MAYA_BUREAU_SCORES: BureauScoreSet = {
  equifax: 608,
  experian: 615,
  transunion: 612,
  deltas: { equifax: "+9", experian: "+14", transunion: "+12" },
};

export function BureauScores({
  scores,
  compact = false,
  dark = false,
  showNotice = true,
  label = "Three-bureau FICO® scores",
}: {
  scores: BureauScoreSet;
  compact?: boolean;
  dark?: boolean;
  showNotice?: boolean;
  label?: string;
}) {
  return <div className={`bureau-score-set${compact ? " compact" : ""}${dark ? " dark" : ""}`} aria-label={label}>
    {!compact && <div className="bureau-score-set-head"><span>{label}</span><small><i /> Updated Aug 18</small></div>}
    <div className="bureau-score-values">
      {BUREAUS.map(([key, short, name]) => <article key={key} className={key}>
        <i>{short}</i>
        <span><small>{name}</small><strong>{scores[key]}</strong></span>
        {scores.deltas?.[key] && <em>{scores.deltas[key]}</em>}
      </article>)}
    </div>
    {showNotice && <p><b>MyScoreIQ FICO® scores</b> · Consumer scores may differ from the mortgage scores a lender pulls. Not a preapproval.</p>}
  </div>;
}
