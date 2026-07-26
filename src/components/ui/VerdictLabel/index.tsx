'use client';

import React from 'react';
import { useLanguage } from '@/i18n';
import styles from './VerdictLabel.module.css';

export type VerdictKind = 'true' | 'partial' | 'unclear' | 'false';

export const VERDICT_COPY: Record<VerdictKind, string> = {
  true: 'Probabil adevărat',
  partial: 'Parțial adevărat',
  unclear: 'Neclar',
  false: 'Probabil fals',
};

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
  const { t } = useLanguage();

  const classNames = [styles.verdict, layout === 'inline' ? styles.inline : '']
    .filter(Boolean)
    .join(' ');

  const labelText = t(`verdict.copy.${kind}`);
  const noteText = kind === 'partial' || kind === 'unclear' ? t(`verdict.note.${kind}`) : null;

  return (
    <div className={classNames}>
      <span
        className={[styles.label, kind === 'false' ? styles.labelFalse : '']
          .filter(Boolean)
          .join(' ')}
      >
        {labelText}
      </span>
      {noteText ? <span className={styles.note}>{noteText}</span> : null}
      {typeof score === 'number' ? (
        <span className={styles.score}>
          {t('verdict.scoreLabel')}
          <span className={styles.scoreValue}>{score}%</span>
        </span>
      ) : null}
    </div>
  );
};
