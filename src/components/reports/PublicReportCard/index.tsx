'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/i18n';
import type { PublicReportSummary, PublicReportDetail } from '@/lib/verification/public-reports-query';
import type { Verdict, CombinedSource } from '@/types/verification';
import { AdminDeleteReportButton } from '@/components/public-reports/AdminDeleteReportButton';
import styles from './PublicReportCard.module.css';

export interface PublicReportCardProps {
  report: PublicReportSummary | PublicReportDetail;
  variant?: 'feed' | 'detail';
}

function getVerdictInfo(verdict: Verdict | null, score?: number | null, t?: (k: string) => string): { label: string; badgeClass: string } {
  if (typeof score === 'number') {
    if (score >= 85) {
      return { label: t ? t('publicReports.verdictTrue') : 'Probabil Adevărat', badgeClass: styles.badgeTrue };
    }
    if (score <= 39) {
      return { label: t ? t('publicReports.verdictFalse') : 'Probabil Fals', badgeClass: styles.badgeFalse };
    }
  }

  switch (verdict) {
    case 'true':
      return { label: t ? t('publicReports.verdictTrue') : 'Probabil Adevărat', badgeClass: styles.badgeTrue };
    case 'false':
      return { label: t ? t('publicReports.verdictFalse') : 'Probabil Fals', badgeClass: styles.badgeFalse };
    case 'partial':
      return { label: t ? t('publicReports.verdictPartial') : 'Parțial Adevărat', badgeClass: styles.badgePartial };
    case 'unclear':
    default:
      return { label: t ? t('publicReports.verdictUnclear') : 'Neclar', badgeClass: styles.badgeUnclear };
  }
}

export const PublicReportCard: React.FC<PublicReportCardProps> = ({ report, variant = 'feed' }) => {
  const { locale, t } = useLanguage();
  const verdictInfo = getVerdictInfo(report.verdict, report.score, t);
  const displayDate = report.publishedAt || report.createdAt;
  const langTag = locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'ro-RO';
  const formattedDate = new Date(displayDate).toLocaleDateString(langTag, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const authorLabel = report.showAuthor && report.authorName ? `@${report.authorName}` : t('publicReports.authorDefault');

  // Extract sources if reportDetail is passed
  const reportDetail = 'reportJson' in report ? report.reportJson : null;
  const sources: CombinedSource[] = reportDetail?.sources || [];
  const rawAnalysisText =
    reportDetail?.executiveSummary ||
    (typeof reportDetail?.aiAnalysis === 'string' ? reportDetail.aiAnalysis : reportDetail?.aiAnalysis?.summary);

  const [claimText, setClaimText] = useState<string>(report.inputText);
  const [analysisText, setAnalysisText] = useState<string>(rawAnalysisText || '');

  // Automatic translation effect when user toggles RO <-> EN
  useEffect(() => {
    let isMounted = true;
    const reportLang = ('language' in report && report.language) ? report.language : 'ro';

    if (locale === reportLang) {
      setClaimText(report.inputText);
      setAnalysisText(rawAnalysisText || '');
      return;
    }

    Promise.all([
      fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: report.inputText, targetLang: locale }),
      }).then(r => r.json()).then(d => d.translatedText).catch(() => report.inputText),
      rawAnalysisText ? fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawAnalysisText, targetLang: locale }),
      }).then(r => r.json()).then(d => d.translatedText).catch(() => rawAnalysisText) : Promise.resolve(''),
    ]).then(([claimRes, analysisRes]) => {
      if (isMounted) {
        if (claimRes) setClaimText(claimRes);
        if (analysisRes) setAnalysisText(analysisRes);
      }
    });

    return () => { isMounted = false; };
  }, [locale, report.inputText, rawAnalysisText, 'language' in report ? (report as PublicReportDetail).language : 'ro']);

  if (variant === 'feed') {
    return (
      <Link href={`/rapoarte/${report.id}`} className={`${styles.card} ${styles.feedVariant}`}>
        <div className={styles.cardHeader}>
          <div className={styles.badgeGroup}>
            <span className={`${styles.verdictBadge} ${verdictInfo.badgeClass}`}>{verdictInfo.label}</span>
            {typeof report.score === 'number' && <span className={styles.scoreBadge}>{report.score}%</span>}
          </div>
          <AdminDeleteReportButton reportId={report.id} variant="icon" />
        </div>
        {report.imageUrls.length > 0 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={report.imageUrls[0]} alt="" className={styles.feedThumb} loading="lazy" />
        )}
        <h2 className={`${styles.claimTitle} ${styles.feedTitle}`}>&ldquo;{claimText}&rdquo;</h2>
        <div className={styles.metaRow}>
          <span className={styles.authorText}>{authorLabel}</span>
          <time dateTime={displayDate}>{formattedDate}</time>
        </div>
      </Link>
    );
  }

  return (
    <article className={`${styles.card} ${styles.detailVariant}`}>
      <div className={styles.cardHeader}>
        <div className={styles.badgeGroup}>
          <span className={`${styles.verdictBadge} ${verdictInfo.badgeClass}`}>{verdictInfo.label}</span>
          {typeof report.score === 'number' && (
            <span className={styles.scoreBadge}>{t('publicReports.scoreLabel', { score: String(report.score) })}</span>
          )}
        </div>
        <AdminDeleteReportButton reportId={report.id} variant="button" />
      </div>

      <h1 className={styles.claimTitle}>&ldquo;{claimText}&rdquo;</h1>

      <div className={styles.metaRow}>
        <span className={styles.authorText}>{authorLabel}</span>
        <time dateTime={displayDate}>{formattedDate}</time>
      </div>

      {analysisText && (
        <div className={styles.analysisBlock}>
          <div className={styles.analysisTitle}>{t('publicReports.analysisTitle')}</div>
          <div className={styles.analysisText}>{analysisText}</div>
        </div>
      )}

      {/* HTML native <details> / <summary> elements for SEO Crawler accessibility */}
      {sources && sources.length > 0 && (
        <details className={styles.sourcesDetails} open>
          <summary className={styles.sourcesSummary}>{t('publicReports.sourcesCount', { count: String(sources.length) })}</summary>
          <ul className={styles.sourcesList}>
            {sources.map((src, idx) => (
              <li key={idx} className={styles.sourceItem}>
                <a href={src.url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                  {src.publisher || src.title}
                </a>
                {src.title && src.publisher && <span className={styles.sourceTitleText}> — {src.title}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
};
