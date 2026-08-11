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
import { stripMarkdown } from '@/lib/utils/romanian-text';
import styles from './ReportView.module.css';

export interface ReportViewProps {
  report: VerificationReport;
  eyebrow?: string;
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

function renderTierBadge(tier?: 1 | 2 | 3): React.ReactNode {
  if (tier === 1) {
    return <span className={styles.tier1Badge}>Tier 1: Sursă de Încredere / Fact-Checker</span>;
  }
  if (tier === 3) {
    return <span className={styles.tier3Badge}>Tier 3: Social / Web General</span>;
  }
  return <span className={styles.tier2Badge}>Tier 2: Presă Generală</span>;
}

export const ReportView: React.FC<ReportViewProps> = ({ report, eyebrow, interactive = true }) => {
  const { locale, t } = useLanguage();
  const { isPremium, ready } = useUserTier();
  const headRef = useRef<HTMLElement>(null);

  return (
    <article className={styles.report} data-print-root>
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

      {report.posterCommentary ? (
        <div className={styles.commentaryBlock}>
          <p className={styles.sectionLabel}>{t('reportView.commentaryLabel')}</p>
          <p className={styles.commentary}>&ldquo;{report.posterCommentary}&rdquo;</p>
          <p className={styles.commentaryNote}>{t('reportView.commentaryNote')}</p>
        </div>
      ) : null}

      {report.keyTakeaways && report.keyTakeaways.length > 0 ? (
        <div className={styles.takeawaysContainer}>
          <p className={styles.sectionLabel}>{t('reportView.keyIdeasLabel')}</p>
          <ul className={styles.takeawaysList}>
            {report.keyTakeaways.map((item, idx) => (
              <li key={idx} className={styles.takeawayItem}>
                {stripMarkdown(item)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.aiAvailable === false ? (
        <Callout label={t('reportView.partialAnalysisLabel')} tone="plain">
          {t('reportView.partialAnalysisText')}
        </Callout>
      ) : null}

      {isPremium && report.executiveSummary ? (
        <div>
          <p className={styles.sectionLabel}>{t('reportView.summaryLabel')}</p>
          <p className={styles.summary}>{stripMarkdown(report.executiveSummary)}</p>
        </div>
      ) : null}

      <div>
        <p className={styles.sectionLabel}>
          {t('reportView.sourcesLabel', { count: report.sources.length })}
        </p>
        <ol className={styles.sources}>
          {report.sources.map((source, index) => (
            <li key={source.url} className={styles.source}>
              <span className={styles.sourceIndex}>{String(index + 1).padStart(2, '0')}</span>
              <span className={styles.sourceBody}>
                <div className={styles.sourceHeaderLine}>
                  <a
                    href={sourceHref(source.url, source.excerpt, isPremium)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.sourceTitle}
                  >
                    {source.title}
                  </a>
                  {renderTierBadge(source.tier)}
                </div>
                <span className={styles.sourceMeta}>
                  {source.publisher}
                  {formatDate(source.date, locale) ? ` · ${formatDate(source.date, locale)}` : null}
                </span>
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
            <DownloadButton report={report} isPremium={isPremium} ready={ready} />
            <DisputeButton reportId={report.id} />
          </div>
        ) : null}
      </div>
    </article>
  );
};
