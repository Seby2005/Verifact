'use client';

import React from 'react';
import { VerdictLabel, Callout } from '@/components/ui';
import type { VerificationReport } from '@/types/verification';
import { useLanguage } from '@/i18n';
import { CiteButton } from './CiteButton';
import { DisputeButton } from './DisputeButton';
import { DownloadButton } from './DownloadButton';
import styles from './ReportView.module.css';

export interface ReportViewProps {
  report: VerificationReport;
  /** Rendered above the verdict, e.g. "Exemplu de raport" on the homepage. */
  eyebrow?: string;
}

function formatDate(iso?: string, locale: string = 'ro'): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;

  const dateStyle = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return dateStyle.format(parsed);
}

export const ReportView: React.FC<ReportViewProps> = ({ report, eyebrow }) => {
  const { locale, t } = useLanguage();

  return (
    <article className={styles.report} data-print-root>
      {/* The site header does not print, so the sheet carries its own
          provenance: who produced it and which report it is. */}
      <div className={styles.printHeader}>
        <span className={styles.printBrand}>Verifact</span>
        <span className={styles.printId}>
          {t('reportView.printId')}: {report.id}
        </span>
      </div>

      <header className={styles.head}>
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <VerdictLabel kind={report.verdict} score={report.score} />
        </div>
        <p className={styles.meta}>
          {formatDate(report.createdAt, locale)}
          {typeof report.processingTimeMs === 'number'
            ? ` · ${t('reportView.analyzedIn', { seconds: (report.processingTimeMs / 1000).toFixed(1) })}`
            : null}
          {report.scoreBreakdown?.availableLayers !== undefined
            ? ` · ${t('reportView.layersWithEvidence', { count: report.scoreBreakdown.availableLayers })}`
            : null}
        </p>
      </header>

      <div>
        <p className={styles.sectionLabel}>{t('reportView.claimLabel')}</p>
        <p className={styles.claim}>&ldquo;{report.claim ?? report.inputText}&rdquo;</p>
      </div>

      {report.aiAvailable === false ? (
        <Callout label={t('reportView.partialAnalysisLabel')} tone="plain">
          {t('reportView.partialAnalysisText')}
        </Callout>
      ) : null}

      <div>
        <p className={styles.sectionLabel}>{t('reportView.summaryLabel')}</p>
        <p className={styles.summary}>{report.executiveSummary}</p>
      </div>

      <div>
        <p className={styles.sectionLabel}>
          {t('reportView.sourcesLabel', { count: report.sources.length })}
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
                  {formatDate(source.date, locale) ? ` · ${formatDate(source.date, locale)}` : null}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.footer}>
        <Callout label={t('reportView.disclaimerLabel')} tone="plain">
          {t('reportView.disclaimerText')}
        </Callout>
        <div className={styles.footerActions} data-print-hide>
          <CiteButton report={report} />
          <DownloadButton />
          <DisputeButton reportId={report.id} />
        </div>
      </div>
    </article>
  );
};
