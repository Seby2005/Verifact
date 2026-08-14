'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/i18n';
import { Callout } from '@/components/ui';
import { JsonLd } from '@/components/JsonLd';
import shell from '../../page-shell.module.css';
import styles from '../glosar-dezinformare/glosar.module.css';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.verifact.ro';

export default function SourceVerificationGuidePage() {
  const { t, locale } = useLanguage();

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: t('sourceVerificationGuide.title'),
    description: t('sourceVerificationGuide.lead'),
    url: `${baseUrl}/resurse/cum-verifici-o-sursa-de-incredere`,
    datePublished: '2026-08-12',
    dateModified: '2026-08-12',
    inLanguage: locale === 'en' ? 'en-US' : 'ro-RO',
    author: {
      '@type': 'Organization',
      name: 'Verifact',
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Verifact',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo/verifact-v-logo-transparent.png`,
      },
    },
  };

  return (
    <div className={`container ${shell.page}`}>
      <JsonLd data={articleSchema} />

      <header className={shell.head}>
        <p className="eyebrow">{t('sourceVerificationGuide.eyebrow')}</p>
        <h1 className={shell.title}>{t('sourceVerificationGuide.title')}</h1>
        <p className={shell.lead}>{t('sourceVerificationGuide.lead')}</p>
      </header>

      <div className={shell.body}>
        <Callout label={t('sourceVerificationGuide.calloutLabel')}>
          {t('sourceVerificationGuide.calloutText')}
        </Callout>

        <div className={shell.prose} style={{ marginTop: '2rem', marginBottom: '2.5rem' }}>
          <h2>{t('sourceVerificationGuide.step1Title')}</h2>
          <p>
            {t('sourceVerificationGuide.step1TextPrefix')}
            <strong>{t('sourceVerificationGuide.step1PrimaryStrong')}</strong>
            {t('sourceVerificationGuide.step1Text1')}
            <Link href="/resurse/glosar-dezinformare#sursa-primara-vs-secundara" className={styles.textLink}>
              {t('sourceVerificationGuide.step1GlossaryLink')}
            </Link>
            {t('sourceVerificationGuide.step1TextSuffix')}
          </p>

          <h2>{t('sourceVerificationGuide.step2Title')}</h2>
          <p>{t('sourceVerificationGuide.step2Text')}</p>

          <h2>{t('sourceVerificationGuide.step3Title')}</h2>
          <p>{t('sourceVerificationGuide.step3Text')}</p>

          <h2>{t('sourceVerificationGuide.step4Title')}</h2>
          <p>{t('sourceVerificationGuide.step4Text')}</p>

          <h2>{t('sourceVerificationGuide.step5Title')}</h2>
          <p>
            {t('sourceVerificationGuide.step5TextPrefix')}
            <Link href="/" className={styles.textLink}>
              {t('sourceVerificationGuide.step5VerifactLink')}
            </Link>
            {t('sourceVerificationGuide.step5TextSuffix')}
          </p>
        </div>

        <section className={shell.sectionRule}>
          <p className={styles.closing}>
            {t('sourceVerificationGuide.closingText')}
            <Link href="/" className={styles.textLink}>
              {t('sourceVerificationGuide.verifyLink')}
            </Link>
            {t('sourceVerificationGuide.orText')}
            <Link href="/resurse/glosar-dezinformare" className={styles.textLink}>
              {t('sourceVerificationGuide.glossaryLink')}
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
