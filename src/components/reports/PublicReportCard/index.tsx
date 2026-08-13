import React from 'react';
import Link from 'next/link';
import type { PublicReportSummary, PublicReportDetail } from '@/lib/verification/public-reports-query';
import type { Verdict, CombinedSource } from '@/types/verification';
import styles from './PublicReportCard.module.css';

export interface PublicReportCardProps {
  report: PublicReportSummary | PublicReportDetail;
  variant?: 'feed' | 'detail';
}

function getVerdictInfo(verdict: Verdict | null, score?: number | null): { label: string; badgeClass: string } {
  if (typeof score === 'number') {
    if (score >= 85) {
      return { label: 'Probabil Adevărat', badgeClass: styles.badgeTrue };
    }
    if (score <= 39) {
      return { label: 'Probabil Fals', badgeClass: styles.badgeFalse };
    }
  }

  switch (verdict) {
    case 'true':
      return { label: 'Probabil Adevărat', badgeClass: styles.badgeTrue };
    case 'false':
      return { label: 'Probabil Fals', badgeClass: styles.badgeFalse };
    case 'partial':
      return { label: 'Parțial Adevărat', badgeClass: styles.badgePartial };
    case 'unclear':
    default:
      return { label: 'Neclar', badgeClass: styles.badgeUnclear };
  }
}

export const PublicReportCard: React.FC<PublicReportCardProps> = ({ report, variant = 'feed' }) => {
  const verdictInfo = getVerdictInfo(report.verdict, report.score);
  const displayDate = report.publishedAt || report.createdAt;
  const formattedDate = new Date(displayDate).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const authorLabel = report.showAuthor && report.authorName ? `@${report.authorName}` : 'Verificat de un utilizator Verifact';

  // Extract sources if reportDetail is passed
  const reportDetail = 'reportJson' in report ? report.reportJson : null;
  const sources: CombinedSource[] = reportDetail?.sources || [];
  const analysisText =
    reportDetail?.executiveSummary ||
    (typeof reportDetail?.aiAnalysis === 'string' ? reportDetail.aiAnalysis : reportDetail?.aiAnalysis?.summary);

  if (variant === 'feed') {
    return (
      <Link href={`/rapoarte/${report.id}`} className={`${styles.card} ${styles.feedVariant}`}>
        <div className={styles.cardHeader}>
          <div className={styles.badgeGroup}>
            <span className={`${styles.verdictBadge} ${verdictInfo.badgeClass}`}>{verdictInfo.label}</span>
            {typeof report.score === 'number' && <span className={styles.scoreBadge}>{report.score}%</span>}
          </div>
        </div>
        <h2 className={`${styles.claimTitle} ${styles.feedTitle}`}>&ldquo;{report.inputText}&rdquo;</h2>
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
            <span className={styles.scoreBadge}>Scor veridicitate: {report.score}%</span>
          )}
        </div>
      </div>

      <h1 className={styles.claimTitle}>&ldquo;{report.inputText}&rdquo;</h1>

      <div className={styles.metaRow}>
        <span className={styles.authorText}>{authorLabel}</span>
        <time dateTime={displayDate}>{formattedDate}</time>
      </div>

      {analysisText && (
        <div className={styles.analysisBlock}>
          <div className={styles.analysisTitle}>Analiză Factuală &amp; Context</div>
          <div className={styles.analysisText}>{analysisText}</div>
        </div>
      )}

      {/* HTML native <details> / <summary> elements for SEO Crawler accessibility */}
      {sources && sources.length > 0 && (
        <details className={styles.sourcesDetails} open>
          <summary className={styles.sourcesSummary}>Surse citate ({sources.length})</summary>
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
