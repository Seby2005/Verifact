'use client';

import React, { useRef } from 'react';
import { VerdictLabel, Callout } from '@/components/ui';
import type { VerificationReport } from '@/types/verification';
import { useLanguage } from '@/i18n';
import { CiteButton } from './CiteButton';
import { DisputeButton } from './DisputeButton';
import { DownloadButton } from './DownloadButton';
import { StickyVerdict } from './StickyVerdict';
import { useUserTier } from './useUserTier';
import { sourceHref } from './sourceLink';
import styles from './ReportView.module.css';

export interface ReportViewProps {
  report: VerificationReport;
  /** Rendered above the verdict, e.g. "Exemplu de raport" on the homepage. */
  eyebrow?: string;
  /**
   * When false, the sticky verdict bar and the cite/download/dispute actions are
   * omitted — used for the static homepage specimen, which is illustrative and
   * isn't the reader's own report to act on. Defaults to true (a real result).
   */
  interactive?: boolean;
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

export const ReportView: React.FC<ReportViewProps> = ({ report, eyebrow, interactive = true }) => {
  const { locale, t } = useLanguage();
  const { isPremium } = useUserTier();
  const headRef = useRef<HTMLElement>(null);

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

      <header className={styles.head} ref={headRef}>
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

      {/* Anchors the verdict once the header above has scrolled away. Omitted
          for the static specimen, which shouldn't pop a sticky bar mid-homepage. */}
      {interactive ? (
        <StickyVerdict
          kind={report.verdict}
          score={report.score}
          claim={report.claim ?? report.inputText ?? ''}
          watch={headRef}
        />
      ) : null}

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
                  href={sourceHref(source.url, source.excerpt, isPremium)}
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
                {/* The passage the search matched on. Without it a citation is
                    just a title, and a document that only shares a few words
                    with the claim looks identical to one that addresses it. */}
                {source.excerpt ? (
                  <q className={styles.sourceExcerpt}>{source.excerpt.slice(0, 300)}</q>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.footer}>
        <Callout label={t('reportView.disclaimerLabel')} tone="plain">
          {t('reportView.disclaimerText')}
        </Callout>
        {interactive ? (
          <div className={styles.footerActions} data-print-hide>
            <CiteButton report={report} />
            <DownloadButton report={report} isPremium={isPremium} />
            <DisputeButton reportId={report.id} />
          </div>
        ) : null}
      </div>
    </article>
  );
};
