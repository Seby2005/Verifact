'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/i18n';
import styles from '@/app/rapoarte/[id]/page.module.css';

export const ReportPageCta: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className={styles.ctaBox}>
      <h2 className={styles.ctaTitle}>{t('publicReports.ctaTitle')}</h2>
      <p className={styles.ctaText}>{t('publicReports.ctaText')}</p>
      <Link href="/" className={styles.ctaButton}>
        <span>{t('publicReports.ctaBtn')}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
    </div>
  );
};
