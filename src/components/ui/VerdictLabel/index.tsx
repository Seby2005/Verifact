import React from 'react';
import styles from './VerdictLabel.module.css';

export type VerdictKind = 'true' | 'partial' | 'unclear' | 'false';

/**
 * Display-only mapping of a veracity score to its verdict band. Mirrors the
 * bands defined in docs/PRD.md §3.2 — this does not compute or influence the
 * score itself, it only decides how an already-computed score is labelled.
 */
export const VERDICT_COPY: Record<VerdictKind, string> = {
  true: 'Probabil adevărat',
  partial: 'Parțial adevărat',
  unclear: 'Neclar',
  false: 'Probabil fals',
};

/**
 * The qualifier that the PRD attaches to the middle two bands. Kept out of the
 * uppercase label and set in sentence case instead — all-caps costs legibility
 * past a couple of words, so the label stays short and the nuance reads as text.
 */
export const VERDICT_NOTE: Partial<Record<VerdictKind, string>> = {
  partial: 'Context lipsă',
  unclear: 'Insuficient verificat',
};

export function verdictFromScore(score: number): VerdictKind {
  if (score >= 85) return 'true';
  if (score >= 60) return 'partial';
  if (score >= 40) return 'unclear';
  return 'false';
}

export interface VerdictLabelProps {
  kind: VerdictKind;
  /** Veracity score 0-100. Rendered as plain text, never as a chip. */
  score?: number;
  layout?: 'stacked' | 'inline';
}

export const VerdictLabel: React.FC<VerdictLabelProps> = ({
  kind,
  score,
  layout = 'stacked',
}) => {
  const classNames = [styles.verdict, layout === 'inline' ? styles.inline : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      <span
        className={[styles.label, kind === 'false' ? styles.labelFalse : '']
          .filter(Boolean)
          .join(' ')}
      >
        {VERDICT_COPY[kind]}
      </span>
      {VERDICT_NOTE[kind] ? (
        <span className={styles.note}>{VERDICT_NOTE[kind]}</span>
      ) : null}
      {typeof score === 'number' ? (
        <span className={styles.score}>
          Scor de veridicitate: <span className={styles.scoreValue}>{score}%</span>
        </span>
      ) : null}
    </div>
  );
};
