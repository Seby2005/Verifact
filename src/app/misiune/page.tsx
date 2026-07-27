'use client';

import React from 'react';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export default function MisiunePage() {
  const { t } = useLanguage();

  const romaniaBullets = [
    t('misiunePage.romaniaBullets.0'),
    t('misiunePage.romaniaBullets.1'),
    t('misiunePage.romaniaBullets.2'),
  ];

  const values = [
    { title: t('misiunePage.values.0.title'), text: t('misiunePage.values.0.text') },
    { title: t('misiunePage.values.1.title'), text: t('misiunePage.values.1.text') },
    { title: t('misiunePage.values.2.title'), text: t('misiunePage.values.2.text') },
    { title: t('misiunePage.values.3.title'), text: t('misiunePage.values.3.text') },
    { title: t('misiunePage.values.4.title'), text: t('misiunePage.values.4.text') },
  ];

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{t('misiunePage.eyebrow')}</p>
        <h1 className={shell.title}>{t('misiunePage.title')}</h1>
      </header>

      <div className={shell.body}>
        <Callout label={t('misiunePage.calloutLabel')}>
          {t('misiunePage.calloutText')}
        </Callout>

        <div className={`${shell.prose} ${styles.prose}`}>
          <h2>{t('misiunePage.problemTitle')}</h2>
          <p>{t('misiunePage.problemText1')}</p>
          <p>{t('misiunePage.problemText2')}</p>

          <h2>{t('misiunePage.romaniaTitle')}</h2>
          <ul>
            {romaniaBullets.map((bullet, idx) => (
              <li key={idx}>{bullet}</li>
            ))}
          </ul>

          <h2>{t('misiunePage.notTitle')}</h2>
          <p>{t('misiunePage.notText')}</p>
        </div>

        <section className={shell.sectionRule}>
          <h2 className={styles.valuesTitle}>{t('misiunePage.valuesTitle')}</h2>
          <dl className={styles.values}>
            {values.map((value) => (
              <div key={value.title} className={styles.value}>
                <dt className={styles.valueTitle}>{value.title}</dt>
                <dd className={styles.valueText}>{value.text}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.follow}>
            {t('misiunePage.followText')}
            <Link href="/transparenta" className={styles.textLink}>
              {t('misiunePage.methodologyLink')}
            </Link>
            {t('misiunePage.orText')}
            <Link href="/open-source" className={styles.textLink}>
              {t('misiunePage.openSourceLink')}
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
