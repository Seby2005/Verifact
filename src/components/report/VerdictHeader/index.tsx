import type { Verdict } from '@/types/verification';
import styles from './VerdictHeader.module.css';

interface VerdictHeaderProps {
  verdict: Verdict;
  score: number;
  inputText: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  availableLayers: number;
  processingTime: number;
  createdAt: string;
}

const VERDICT_LABELS: Record<Verdict, string> = {
  true: 'PROBABIL ADEVARAT',
  partial: 'PARTIAL ADEVARAT',
  unclear: 'NECLAR / INSUFICIENT VERIFICAT',
  false: 'PROBABIL FALS',
};

const VERDICT_ICONS: Record<Verdict, string> = {
  true: '✅',
  partial: '⚠️',
  unclear: '🟠',
  false: '❌',
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: 'Ridicat',
  medium: 'Mediu',
  low: 'Scazut',
};

export function VerdictHeader({
  verdict,
  score,
  inputText,
  confidenceLevel,
  availableLayers,
  processingTime,
  createdAt,
}: VerdictHeaderProps) {
  const formattedDate = new Date(createdAt).toLocaleString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const processingSeconds = (processingTime / 1000).toFixed(1);

  return (
    <header className={`${styles.header} ${styles[verdict]}`} role="banner">
      <div className={styles.inner}>
        <div className={styles.verdictRow}>
          <span className={styles.icon} aria-hidden="true">
            {VERDICT_ICONS[verdict]}
          </span>
          <h1 className={styles.verdict}>{VERDICT_LABELS[verdict]}</h1>
          <span className={styles.score} aria-label={`Scor ${score} din 100`}>
            {score}%
          </span>
        </div>

        <blockquote className={styles.claim}>
          <span className={styles.claimQuote}>
            {inputText.length > 240 ? `${inputText.slice(0, 240)}...` : inputText}
          </span>
        </blockquote>

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Verificat la:</span>{' '}
            {formattedDate}
          </span>
          <span className={styles.metaDivider} aria-hidden="true">·</span>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Timp procesare:</span>{' '}
            {processingSeconds}s
          </span>
          <span className={styles.metaDivider} aria-hidden="true">·</span>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Incredere:</span>{' '}
            {CONFIDENCE_LABELS[confidenceLevel]} ({availableLayers}/4 straturi)
          </span>
        </div>
      </div>
    </header>
  );
}
