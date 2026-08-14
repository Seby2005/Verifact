'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/i18n';
import { JsonLd } from '@/components/JsonLd';
import shell from '../../page-shell.module.css';
import styles from './glosar.module.css';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.verifact.ro';

export default function GlosarPage() {
  const { t, locale } = useLanguage();

  const terms = [
    {
      id: 'dezinformare-misinformare-malinformare',
      title: t('glossaryPage.terms.0.title'),
      definition: t('glossaryPage.terms.0.definition'),
    },
    {
      id: 'deepfake',
      title: t('glossaryPage.terms.1.title'),
      definition: t('glossaryPage.terms.1.definition'),
    },
    {
      id: 'fact-checking',
      title: t('glossaryPage.terms.2.title'),
      definition: t('glossaryPage.terms.2.definition'),
    },
    {
      id: 'sursa-primara-vs-secundara',
      title: t('glossaryPage.terms.3.title'),
      definition: t('glossaryPage.terms.3.definition'),
    },
    {
      id: 'bot-farm-cont-fals',
      title: t('glossaryPage.terms.4.title'),
      definition: t('glossaryPage.terms.4.definition'),
    },
    {
      id: 'bula-informationala',
      title: t('glossaryPage.terms.5.title'),
      definition: t('glossaryPage.terms.5.definition'),
    },
  ];

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: t('glossaryPage.title'),
    description: t('glossaryPage.lead'),
    url: `${baseUrl}/resurse/glosar-dezinformare`,
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

  const definedTermSetSchema = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: t('glossaryPage.title'),
    url: `${baseUrl}/resurse/glosar-dezinformare`,
    hasDefinedTerm: terms.map((term) => ({
      '@type': 'DefinedTerm',
      name: term.title,
      description: term.definition,
      url: `${baseUrl}/resurse/glosar-dezinformare#${term.id}`,
    })),
  };

  return (
    <div className={`container ${shell.page}`}>
      <JsonLd data={[articleSchema, definedTermSetSchema]} />

      <header className={shell.head}>
        <p className="eyebrow">{t('glossaryPage.eyebrow')}</p>
        <h1 className={shell.title}>{t('glossaryPage.title')}</h1>
        <p className={shell.lead}>{t('glossaryPage.lead')}</p>
      </header>

      <div className={shell.body}>
        <nav className={styles.quickNav} aria-label={t('glossaryPage.quickNavTitle')}>
          <p className={styles.quickNavTitle}>{t('glossaryPage.quickNavTitle')}</p>
          <ul className={styles.quickNavList}>
            {terms.map((term) => (
              <li key={term.id}>
                <a href={`#${term.id}`} className={styles.quickNavLink}>
                  {term.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-label="Definitions">
          {terms.map((term) => (
            <article key={term.id} className={styles.termCard}>
              <h2 id={term.id} className={styles.termTitle}>
                <a href={`#${term.id}`} className={styles.termAnchor}>
                  {term.title}
                </a>
              </h2>
              <p className={styles.termDefinition}>{term.definition}</p>
            </article>
          ))}
        </section>

        <section className={shell.sectionRule}>
          <p className={styles.closing}>
            {t('glossaryPage.closingText')}
            <Link href="/" className={styles.textLink}>
              {t('glossaryPage.verifyLink')}
            </Link>
            {t('glossaryPage.orText')}
            <Link href="/resurse" className={styles.textLink}>
              {t('glossaryPage.resourcesLink')}
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
