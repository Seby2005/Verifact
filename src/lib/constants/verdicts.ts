/**
 * Verdict Constants & Single Source of Truth
 * Maps fact-checking verdict keys to scores, colors, icons, and i18n keys.
 */

import type { EvidenceStatus } from '@/types/verification';

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

export interface EvidenceStatusConfig {
  status: EvidenceStatus;
  colorVar: string;
  bgTintVar: string;
  iconName: 'CheckCircle' | 'AlertTriangle' | 'HelpCircle' | 'XCircle' | 'Info';
  labelRo: string;
  labelEn: string;
  labelFr: string;
  descriptionRo: string;
  descriptionEn: string;
  descriptionFr: string;
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
    defaultLabelRo: 'CONFIRMAT DE DOCUMENTE / SURSE',
    defaultLabelEn: 'CORROBORATED BY PRIMARY SOURCES',
  },
  partial: {
    key: 'partial',
    scoreMin: 60,
    scoreMax: 84,
    colorVar: 'var(--color-yellow-500)',
    bgTintVar: 'var(--color-yellow-50)',
    iconName: 'AlertTriangle',
    i18nKey: 'verify.verdict.partial',
    defaultLabelRo: 'LIPSIT DE CONTEXT VERIFICABIL',
    defaultLabelEn: 'MISSING VERIFIABLE CONTEXT',
  },
  unclear: {
    key: 'unclear',
    scoreMin: 40,
    scoreMax: 59,
    colorVar: 'var(--color-orange-500)',
    bgTintVar: 'var(--color-orange-50)',
    iconName: 'HelpCircle',
    i18nKey: 'verify.verdict.unclear',
    defaultLabelRo: 'FĂRĂ SURSE CREDIBILE IDENTIFICATE',
    defaultLabelEn: 'NO CREDIBLE EVIDENCE FOUND',
  },
  false: {
    key: 'false',
    scoreMin: 0,
    scoreMax: 39,
    colorVar: 'var(--color-red-500)',
    bgTintVar: 'var(--color-red-50)',
    iconName: 'XCircle',
    i18nKey: 'verify.verdict.false',
    defaultLabelRo: 'CONTRAZIS DE SURSELE OFICIALE / PRESĂ',
    defaultLabelEn: 'CONTRADICTED BY DOCUMENTED FACTS',
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

export const EVIDENCE_STATUSES: Record<EvidenceStatus, EvidenceStatusConfig> = {
  corroborated: {
    status: 'corroborated',
    colorVar: 'var(--color-green-500)',
    bgTintVar: 'var(--color-green-50)',
    iconName: 'CheckCircle',
    labelRo: 'Confirmat de documente / surse multiple',
    labelEn: 'Corroborated by primary sources',
    labelFr: 'Confirmé par des sources multiples',
    descriptionRo: 'Afirmația este susținută convergent de documente primare, evidențe oficiale sau investigații independente.',
    descriptionEn: 'The claim is consistently corroborated by primary documents, official records, or independent reporting.',
    descriptionFr: 'L’affirmation est confirmée de manière convergente par des documents officiels ou des enquêtes indépendantes.',
  },
  contradicted: {
    status: 'contradicted',
    colorVar: 'var(--color-red-500)',
    bgTintVar: 'var(--color-red-50)',
    iconName: 'XCircle',
    labelRo: 'Contrazis de sursele oficiale / presă',
    labelEn: 'Contradicted by documented facts',
    labelFr: 'Contredit par les faits documentés',
    descriptionRo: 'Înregistrările oficiale, datele istorice sau verificările independente infirmă direct afirmația.',
    descriptionEn: 'Official records, historical data, or independent fact-checks directly refute the claim.',
    descriptionFr: 'Les registres officiels, les données historiques ou les vérifications réfutent directement l’affirmation.',
  },
  missing_context: {
    status: 'missing_context',
    colorVar: 'var(--color-yellow-500)',
    bgTintVar: 'var(--color-yellow-50)',
    iconName: 'AlertTriangle',
    labelRo: 'Lipsit de context verificabil',
    labelEn: 'Missing verifiable context',
    labelFr: 'Contexte vérifiable manquant',
    descriptionRo: 'Faptul de bază conține elemente reale, dar este prezentat trunchiat sau cu o interpretare deformată.',
    descriptionEn: 'The underlying event contains factual elements, but is presented with distorted spin or key context omitted.',
    descriptionFr: 'Le fait de base contient des éléments réels, mais est présenté de manière tronquée ou déformée.',
  },
  unverified_no_sources: {
    status: 'unverified_no_sources',
    colorVar: 'var(--color-orange-500)',
    bgTintVar: 'var(--color-orange-50)',
    iconName: 'HelpCircle',
    labelRo: 'Fără surse credibile identificate',
    labelEn: 'No credible evidence found',
    labelFr: 'Aucune source crédible identifiée',
    descriptionRo: 'Nu a fost identificată nicio dovadă primară sau atestare credibilă pentru această afirmație.',
    descriptionEn: 'No primary evidence or credible documentation could be identified to substantiate this claim.',
    descriptionFr: 'Aucune preuve primaire ni documentation fiable n’a pu être identifiée pour étayer cette affirmation.',
  },
  open_debate: {
    status: 'open_debate',
    colorVar: 'var(--color-blue-500)',
    bgTintVar: 'var(--color-blue-50)',
    iconName: 'Info',
    labelRo: 'Dezbatere deschisă / Opinii divergente',
    labelEn: 'Open debate / Divergent opinions',
    labelFr: 'Débat ouvert / Opinions divergentes',
    descriptionRo: 'Subiectul vizează opinii prospective, dispute metodologice sau interpretări fără consens absolut.',
    descriptionEn: 'The topic concerns forward-looking opinions, policy debates, or matters without absolute factual consensus.',
    descriptionFr: 'Le sujet relève d’analyses prospectives ou de controverses d’experts sans consensus factuel universel.',
  },
};

export function getEvidenceStatusConfig(status: EvidenceStatus): EvidenceStatusConfig {
  return EVIDENCE_STATUSES[status] ?? EVIDENCE_STATUSES.unverified_no_sources;
}

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
