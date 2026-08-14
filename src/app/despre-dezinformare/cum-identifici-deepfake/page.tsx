'use client';

import React from 'react';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import shell from '../../page-shell.module.css';
import styles from './page.module.css';

export default function DeepfakeGuidePage() {
  const { t } = useLanguage();

  return (
    <div className={`container ${styles.guidePage}`}>
      <header className={styles.guideHeader}>
        <span className={styles.categoryTag}>{t('deepfakeGuide.categoryTag')}</span>
        <h1 className={styles.guideTitle}>{t('deepfakeGuide.title')}</h1>
        <p className={styles.guideLead}>{t('deepfakeGuide.lead')}</p>
      </header>

      <div className={styles.guideBody}>
        <Callout label={t('deepfakeGuide.calloutLabel')}>
          {t('deepfakeGuide.calloutText')}
        </Callout>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>{t('deepfakeGuide.sec1Title')}</h2>
          <p className={styles.paragraph}>{t('deepfakeGuide.sec1Text')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>{t('deepfakeGuide.sec2Title')}</h2>
          <p className={styles.paragraph}>{t('deepfakeGuide.sec2Text')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>{t('deepfakeGuide.sec3Title')}</h2>
          <p className={styles.paragraph}>{t('deepfakeGuide.sec3Text')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>{t('deepfakeGuide.sec4Title')}</h2>
          <p className={styles.paragraph}>{t('deepfakeGuide.sec4Text')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>{t('deepfakeGuide.sec5Title')}</h2>
          <p className={styles.paragraph}>{t('deepfakeGuide.sec5Text')}</p>
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
