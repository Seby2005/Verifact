'use client';

import React, { useRef } from 'react';
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

function renderTierBadge(tier?: 1 | 2 | 3, locale: string = 'ro'): React.ReactNode {
  const isEn = locale === 'en';
  const isFr = locale === 'fr';

  if (tier === 1) {
    const text = isEn
      ? 'Tier 1: Trusted Source / Fact-Checker'
      : isFr
      ? 'Tier 1: Source de Confiance / Fact-Checker'
      : 'Tier 1: Sursă de Încredere / Fact-Checker';
    return <span className={styles.tier1Badge}>{text}</span>;
  }
  if (tier === 3) {
    const text = isEn
      ? 'Tier 3: Social / General Web'
      : isFr
      ? 'Tier 3: Réseaux Sociaux / Web Général'
      : 'Tier 3: Social / Web General';
    return <span className={styles.tier3Badge}>{text}</span>;
  }
  const text = isEn
    ? 'Tier 2: Mainstream Press'
    : isFr
    ? 'Tier 2: Presse de Référence'
    : 'Tier 2: Presă Generală';
  return <span className={styles.tier2Badge}>{text}</span>;
}

export const ReportView: React.FC<ReportViewProps> = ({ report, eyebrow, interactive = true }) => {
  const { locale, t } = useLanguage();
  const { tier, isPremium, unlimited, ready } = useUserTier();
  // The Pro Dossier is a Business-tier feature (admins/unlimited included). Pro
  // keeps the Deep-Dive below, but the dossier upsells to Business.
  const canAccessDossier = unlimited || tier === 'business';
  const showSummary = isPremium && Boolean(report.executiveSummary);
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

      {/* Key ideas and the executive summary say the same thing, so show only
         one: the richer prose summary for premium, the concise bullets otherwise. */}
      {!showSummary && report.keyTakeaways && report.keyTakeaways.length > 0 ? (
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

      {showSummary ? (
        <div>
          <p className={styles.sectionLabel}>{t('reportView.summaryLabel')}</p>
          <p className={styles.summary}>{stripMarkdown(report.executiveSummary!)}</p>
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
                  {renderTierBadge(source.tier, locale)}
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
