'use client';

import React, { useMemo, useRef } from 'react';
import { VerdictLabel, Callout } from '@/components/ui';
import type { VerificationReport } from '@/types/verification';
import { useLanguage } from '@/i18n';
import { ReportDeepDive } from '@/components/report/ReportDeepDive';
import { ProReportDossier } from '@/components/report/ProReportDossier';
import { DisputeButton } from './DisputeButton';
import { DownloadButton } from './DownloadButton';
import { PublishReportButton } from './PublishReportButton';
import { ShareCardButton } from './ShareCardButton';
import { StickyVerdict } from './StickyVerdict';
import { useUserTier } from './useUserTier';
import { sourceHref } from './sourceLink';
import { stripMarkdown } from '@/lib/utils/romanian-text';
import { calculatePlausibilityTilt } from '@/lib/verification/scoring';
import { generateKeyTakeaways } from '@/lib/verification/report-builder';
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

  const langTag = locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'ro-RO';
  const dateStyle = new Intl.DateTimeFormat(langTag, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return dateStyle.format(parsed);
}

function getDomain(url?: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export const ReportView: React.FC<ReportViewProps> = ({ report, eyebrow, interactive = true }) => {
  const { locale, t } = useLanguage();
  const { tier, isPremium, unlimited, ready } = useUserTier();
  const canAccessDossier = unlimited || tier === 'business';
  const showSummary = isPremium && Boolean(report.executiveSummary);
  // A search provider that failed (quota, outage) leaves its layer unavailable;
  // say so, or the reader takes "few sources" for "little evidence exists".
  const searchDegraded = report.layers
    ? [report.layers.layer1, report.layers.layer2, report.layers.layer3, report.layers.layer4].some(
        (l) => l?.status === 'unavailable'
      )
    : false;
  const headRef = useRef<HTMLElement>(null);

  const activeTilt = useMemo(() => {
    if (report.evidenceStatus) {
      return calculatePlausibilityTilt(report.evidenceStatus, report.score, undefined, locale);
    }
    return report.plausibilityTilt;
  }, [report.evidenceStatus, report.score, report.plausibilityTilt, locale]);

  const activeTakeaways = useMemo(() => {
    return generateKeyTakeaways(
      report.claim ?? report.inputText,
      report.executiveSummary,
      report.sources,
      report.score,
      locale,
      report.verifiedClaim,
      report.inputText,
      report.evidenceStatus
    );
  }, [report, locale]);

  const claimText = report.verifiedClaim ?? report.claim ?? report.inputText;

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
          <VerdictLabel
            kind={report.verdict}
            evidenceStatus={report.evidenceStatus}
            plausibilityTilt={activeTilt}
            score={report.score}
          />
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
          evidenceStatus={report.evidenceStatus}
          score={report.score}
          claim={claimText}
          watch={headRef}
        />
      ) : null}

      <div>
        <p className={styles.sectionLabel}>{t('reportView.claimLabel')}</p>
        <p className={styles.claim}>&ldquo;{claimText}&rdquo;</p>
      </div>

      {activeTilt?.rationale ? (
        <div className={styles.plausibilityBlock}>
          <p className={styles.plausibilityRationale}>{activeTilt.rationale}</p>
        </div>
      ) : null}

      {report.posterCommentary ? (
        <div className={styles.commentaryBlock}>
          <p className={styles.sectionLabel}>{t('reportView.commentaryLabel')}</p>
          <p className={styles.commentary}>&ldquo;{report.posterCommentary}&rdquo;</p>
          <p className={styles.commentaryNote}>{t('reportView.commentaryNote')}</p>
        </div>
      ) : null}

      {!showSummary && activeTakeaways && activeTakeaways.length > 0 ? (
        <div className={styles.takeawaysContainer}>
          <p className={styles.sectionLabel}>{t('reportView.keyIdeasLabel')}</p>
          <ul className={styles.takeawaysList}>
            {activeTakeaways.map((item, idx) => (
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

      {searchDegraded ? (
        <Callout label={t('reportView.searchDegradedLabel')} tone="plain">
          {t('reportView.searchDegradedText')}
        </Callout>
      ) : null}

      {showSummary && report.executiveSummary ? (
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
          {report.sources.map((source, index) => {
            const domain = getDomain(source.url);
            const faviconUrl = domain
              ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
              : null;

            return (
              <li key={source.url ?? index} className={styles.source}>
                <span className={styles.sourceIndex}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.sourceBody}>
                  <div className={styles.sourceHeaderLine}>
                    {faviconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={faviconUrl}
                        alt=""
                        width={16}
                        height={16}
                        className={styles.sourceFavicon}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    <a
                      href={sourceHref(source.url, source.excerpt, isPremium)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={styles.sourceTitle}
                    >
                      {source.title}
                    </a>
                    {source.tier === 1 ? (
                      <span className={styles.tier1Badge}>
                        {t('reportView.evidenceCards.tier1Label')}
                      </span>
                    ) : source.tier === 3 ? (
                      <span className={styles.tier3Badge}>
                        {t('reportView.evidenceCards.tier3Label')}
                      </span>
                    ) : (
                      <span className={styles.tier2Badge}>
                        {t('reportView.evidenceCards.tier2Label')}
                      </span>
                    )}
                  </div>
                  <span className={styles.sourceMeta}>
                    {source.publisher}
                    {formatDate(source.publishedAt ?? source.date, locale)
                      ? ` · ${formatDate(source.publishedAt ?? source.date, locale)}`
                      : null}
                  </span>
                  {source.excerpt ? (
                    <q className={styles.sourceExcerpt}>{source.excerpt.slice(0, 300)}</q>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <ProReportDossier report={report} isPremium={isPremium} canAccessDossier={canAccessDossier} />

      {interactive ? <ReportDeepDive report={report} /> : null}

      <div className={styles.footer}>
        <Callout label={t('reportView.disclaimerLabel')} tone="plain">
          {t('reportView.disclaimerText')}
        </Callout>
        {interactive ? (
          <div className={styles.footerActions} data-print-hide>
            <ShareCardButton report={report} />
            <PublishReportButton report={report} />
            <DownloadButton report={report} isPremium={isPremium} ready={ready} />
            <DisputeButton reportId={report.id} />
          </div>
        ) : null}
      </div>
    </article>
  );
};
