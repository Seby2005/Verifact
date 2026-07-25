/**
 * Verdict Constants & Single Source of Truth
 * Maps fact-checking verdict keys to scores, colors, icons, and i18n keys.
 */

export type VerdictKey = 'true' | 'partial' | 'unclear' | 'false' | 'neutral';

export interface VerdictConfig {
  key: VerdictKey;
  scoreMin: number;
  scoreMax: number;
  colorVar: string;
  bgTintVar: string;
  iconName: 'CheckCircle' | 'AlertTriangle' | 'HelpCircle' | 'XCircle' | 'Info';
  i18nKey: string;
  defaultLabelRo: string;
  defaultLabelEn: string;
}

export const VERDICTS: Record<VerdictKey, VerdictConfig> = {
  true: {
    key: 'true',
    scoreMin: 85,
    scoreMax: 100,
    colorVar: 'var(--color-green-500)',
    bgTintVar: 'var(--color-green-50)',
    iconName: 'CheckCircle',
    i18nKey: 'verify.verdict.true',
    defaultLabelRo: 'PROBABIL ADEVĂRAT',
    defaultLabelEn: 'PROBABLY TRUE',
  },
  partial: {
    key: 'partial',
    scoreMin: 60,
    scoreMax: 84,
    colorVar: 'var(--color-yellow-500)',
    bgTintVar: 'var(--color-yellow-50)',
    iconName: 'AlertTriangle',
    i18nKey: 'verify.verdict.partial',
    defaultLabelRo: 'PARȚIAL ADEVĂRAT',
    defaultLabelEn: 'PARTIALLY TRUE',
  },
  unclear: {
    key: 'unclear',
    scoreMin: 40,
    scoreMax: 59,
    colorVar: 'var(--color-orange-500)',
    bgTintVar: 'var(--color-orange-50)',
    iconName: 'HelpCircle',
    i18nKey: 'verify.verdict.unclear',
    defaultLabelRo: 'NECLAR / CONTEXT LIPSĂ',
    defaultLabelEn: 'UNCLEAR / MISSING CONTEXT',
  },
  false: {
    key: 'false',
    scoreMin: 0,
    scoreMax: 39,
    colorVar: 'var(--color-red-500)',
    bgTintVar: 'var(--color-red-50)',
    iconName: 'XCircle',
    i18nKey: 'verify.verdict.false',
    defaultLabelRo: 'PROBABIL FALS',
    defaultLabelEn: 'PROBABLY FALSE',
  },
  neutral: {
    key: 'neutral',
    scoreMin: 0,
    scoreMax: 0,
    colorVar: 'var(--color-gray-500)',
    bgTintVar: 'var(--color-gray-100)',
    iconName: 'Info',
    i18nKey: 'verify.verdict.neutral',
    defaultLabelRo: 'NEVERIFICAT',
    defaultLabelEn: 'UNVERIFIED',
  },
};

/**
 * Get verdict configuration from numerical score (0-100)
 */
export function getVerdictFromScore(score: number): VerdictConfig {
  if (score >= 85) return VERDICTS.true;
  if (score >= 60) return VERDICTS.partial;
  if (score >= 40) return VERDICTS.unclear;
  return VERDICTS.false;
}

/**
 * Interpolate RGB color dynamically based on score (0-100)
 */
export function getScoreColor(score: number): string {
  if (score >= 85) return '#16A34A'; // Green
  if (score >= 60) return '#D97706'; // Amber / Yellow
  if (score >= 40) return '#EA580C'; // Orange
  return '#DC2626'; // Red
}
