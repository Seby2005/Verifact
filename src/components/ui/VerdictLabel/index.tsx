'use client';

import React from 'react';
import { useLanguage } from '@/i18n';
import type { EvidenceStatus, PlausibilityTilt } from '@/types/verification';
import { getEvidenceStatusConfig } from '@/lib/constants/verdicts';
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
  evidenceStatus?: EvidenceStatus;
  plausibilityTilt?: PlausibilityTilt;
  /** Veracity score 0-100. Rendered as plain text, never as a chip. */
  score?: number;
  layout?: 'stacked' | 'inline';
}

export const VerdictLabel: React.FC<VerdictLabelProps> = ({
  kind,
  evidenceStatus,
  plausibilityTilt,
  score,
  layout = 'stacked',
}) => {
  const { locale, t } = useLanguage();

  const statusConfig = evidenceStatus ? getEvidenceStatusConfig(evidenceStatus) : null;
  const statusClass = evidenceStatus ? styles[evidenceStatus] : '';

  // The band class sets the semantic verdict colour that the label and the
  // score both inherit — the one place colour appears in this design.
  const classNames = [
    styles.verdict,
    styles[kind],
    statusClass,
    layout === 'inline' ? styles.inline : '',
  ]
    .filter(Boolean)
    .join(' ');

  let labelText: string;
  if (kind === 'false') {
    if (evidenceStatus === 'contradicted') {
      labelText =
        locale === 'en'
          ? 'Contradicted by documented facts'
          : locale === 'fr'
          ? 'Contredit par les faits documentés'
          : 'Contrazis de sursele oficiale / presă';
    } else {
      labelText =
        locale === 'en'
          ? 'Likely False / Unverified claim'
          : locale === 'fr'
          ? 'Information probablement fausse / non vérifiée'
          : 'Informație posibil falsă / neverificată';
    }
  } else if (statusConfig) {
    labelText =
      locale === 'en'
        ? statusConfig.labelEn
        : locale === 'fr'
        ? statusConfig.labelFr
        : statusConfig.labelRo;
  } else {
    labelText = t(`verdict.copy.${kind}`);
  }

  const noteText = plausibilityTilt?.label
    ? plausibilityTilt.label
    : kind === 'partial' || kind === 'unclear'
    ? t(`verdict.note.${kind}`)
    : null;

  return (
    <div className={classNames}>
      <span className={styles.label}>{labelText}</span>
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
