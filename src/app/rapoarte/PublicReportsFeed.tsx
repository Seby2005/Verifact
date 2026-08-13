'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/i18n';
import type { PublicReportSummary } from '@/lib/verification/public-reports-query';
import { PublicReportCard } from '@/components/reports/PublicReportCard';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

interface PublicReportsFeedProps {
  reports: PublicReportSummary[];
  page: number;
  totalPages: number;
}

export const PublicReportsFeed: React.FC<PublicReportsFeedProps> = ({ reports, page, totalPages }) => {
  const { t } = useLanguage();

  return (
    <div className={`container ${styles.feedPage}`}>
      <header className={styles.feedHeader}>
        <h1 className={styles.feedTitle}>{t('publicReports.title')}</h1>
        <p className={styles.feedLead}>{t('publicReports.lead')}</p>
      </header>

      {reports.length === 0 ? (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>{t('publicReports.emptyTitle')}</h2>
          <p className={styles.emptyText}>{t('publicReports.emptyText')}</p>
          <Link href="/" className={shell.primaryBtn}>
            {t('publicReports.verifyBtn')}
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.reportsGrid}>
            {reports.map((report) => (
              <PublicReportCard key={report.id} report={report} variant="feed" />
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              {page > 1 ? (
                <Link href={`/rapoarte?page=${page - 1}`} className={styles.pageBtn}>
                  &larr; {t('publicReports.pagePrevious')}
                </Link>
              ) : (
                <span className={`${styles.pageBtn} ${styles.disabledBtn}`}>
                  &larr; {t('publicReports.pagePrevious')}
                </span>
              )}

              <span className={styles.pageIndicator}>
                {t('publicReports.pageIndicator', { page: String(page), total: String(totalPages) })}
              </span>

              {page < totalPages ? (
                <Link href={`/rapoarte?page=${page + 1}`} className={styles.pageBtn}>
                  {t('publicReports.pageNext')} &rarr;
                </Link>
              ) : (
                <span className={`${styles.pageBtn} ${styles.disabledBtn}`}>
                  {t('publicReports.pageNext')} &rarr;
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
