import React from 'react';
import { VerdictLabel, Callout } from '@/components/ui';
import type { VerificationReport } from '@/types/verification';
import styles from './ReportView.module.css';

export interface ReportViewProps {
  report: VerificationReport;
  /** Rendered above the verdict, e.g. "Exemplu de raport" on the homepage. */
  eyebrow?: string;
}

const DATE_FORMAT = new Intl.DateTimeFormat('ro-RO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : DATE_FORMAT.format(parsed);
}

export const ReportView: React.FC<ReportViewProps> = ({ report, eyebrow }) => {
  return (
    <article className={styles.report}>
      <header className={styles.head}>
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <VerdictLabel kind={report.verdict} score={report.score} />
        </div>
        <p className={styles.meta}>
          {formatDate(report.createdAt)}
          {typeof report.processingTime === 'number'
            ? ` · analizat în ${report.processingTime.toFixed(1)}s`
            : null}
        </p>
      </header>

      <div>
        <p className={styles.sectionLabel}>Afirmația verificată</p>
        <p className={styles.claim}>&ldquo;{report.claim}&rdquo;</p>
      </div>

      <div>
        <p className={styles.sectionLabel}>Rezumat</p>
        <p className={styles.summary}>{report.summary}</p>
      </div>

      <div>
        <p className={styles.sectionLabel}>
          Surse ({report.sources.length})
        </p>
        <ol className={styles.sources}>
          {report.sources.map((source, index) => (
            <li key={source.url} className={styles.source}>
              <span className={styles.sourceIndex}>{String(index + 1).padStart(2, '0')}</span>
              <span className={styles.sourceBody}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={styles.sourceTitle}
                >
                  {source.title}
                </a>
                <span className={styles.sourceMeta}>
                  {source.publisher}
                  {formatDate(source.date) ? ` · ${formatDate(source.date)}` : null}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <Callout label="Disclaimer" tone="plain">
        Raportul este generat automat și nu reprezintă o decizie editorială
        finală. Citește sursele citate pentru contextul complet.
      </Callout>
    </article>
  );
};
