'use client';

import React from 'react';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import shell from '../../page-shell.module.css';
import styles from './page.module.css';

export default function PhishingGuidePage() {
  const { t } = useLanguage();

  return (
    <div className={`container ${styles.guidePage}`}>
      <header className={styles.guideHeader}>
        <span className={styles.categoryTag}>{t('phishingGuide.categoryTag')}</span>
        <h1 className={styles.guideTitle}>{t('phishingGuide.title')}</h1>
        <p className={styles.guideLead}>{t('phishingGuide.lead')}</p>
      </header>

      <div className={styles.guideBody}>
        <Callout label={t('phishingGuide.calloutLabel')}>
          {t('phishingGuide.calloutText')}
        </Callout>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>{t('phishingGuide.sec1Title')}</h2>
          <p className={styles.paragraph}>{t('phishingGuide.sec1Text')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>{t('phishingGuide.sec2Title')}</h2>
          <p className={styles.paragraph}>{t('phishingGuide.sec2Text')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>{t('phishingGuide.sec3Title')}</h2>
          <p className={styles.paragraph}>{t('phishingGuide.sec3Text')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>{t('phishingGuide.sec4Title')}</h2>
          <p className={styles.paragraph}>{t('phishingGuide.sec4Text')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>{t('phishingGuide.sec5Title')}</h2>
          <p className={styles.paragraph}>{t('phishingGuide.sec5Text')}</p>
        </section>

        <div className={shell.sectionRule}>
          <Link href="/despre-dezinformare" className={styles.backLink}>
            ← {t('despreDezinformarePage.eyebrow')}
          </Link>
        </div>
      </div>
    </div>
  );
}
