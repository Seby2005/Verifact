'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export default function ResursePage() {
  const { t } = useLanguage();

  const articles = [
    {
      slug: 'glosar-dezinformare',
      href: '/resurse/glosar-dezinformare',
      category: t('resourcesPage.articles.glosar.category'),
      readingTime: t('resourcesPage.readingTime', { time: t('resourcesPage.articles.glosar.readingTime') }),
      title: t('resourcesPage.articles.glosar.title'),
      description: t('resourcesPage.articles.glosar.description'),
      author: 'Verifact',
    },
    {
      slug: 'cum-verifici-o-sursa-de-incredere',
      href: '/resurse/cum-verifici-o-sursa-de-incredere',
      category: t('resourcesPage.articles.surse.category'),
      readingTime: t('resourcesPage.readingTime', { time: t('resourcesPage.articles.surse.readingTime') }),
      title: t('resourcesPage.articles.surse.title'),
      description: t('resourcesPage.articles.surse.description'),
      author: 'Verifact',
    },
    {
      slug: 'cum-identifici-deepfake',
      href: '/despre-dezinformare/cum-identifici-deepfake',
      category: t('resourcesPage.articles.deepfake.category'),
      readingTime: t('resourcesPage.readingTime', { time: t('resourcesPage.articles.deepfake.readingTime') }),
      title: t('resourcesPage.articles.deepfake.title'),
      description: t('resourcesPage.articles.deepfake.description'),
      author: 'Verifact',
    },
    {
      slug: 'scheme-phishing-social-media',
      href: '/despre-dezinformare/scheme-phishing-social-media',
      category: t('resourcesPage.articles.phishing.category'),
      readingTime: t('resourcesPage.readingTime', { time: t('resourcesPage.articles.phishing.readingTime') }),
      title: t('resourcesPage.articles.phishing.title'),
      description: t('resourcesPage.articles.phishing.description'),
      author: 'Verifact',
    },
  ];

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{t('resourcesPage.eyebrow')}</p>
        <h1 className={shell.title}>{t('resourcesPage.title')}</h1>
        <p className={shell.lead}>{t('resourcesPage.lead')}</p>
      </header>

      <div className={shell.body}>
        <section>
          <h2 className={styles.sectionTitle}>{t('resourcesPage.sectionTitle')}</h2>
          <div className={styles.grid}>
            {articles.map((article) => (
              <Link key={article.slug} href={article.href} className={styles.card}>
                <div className={styles.meta}>
                  <span className={styles.category}>{article.category}</span>
                  <span className={styles.dot}>·</span>
                  <span>{article.readingTime}</span>
                </div>
                <h3 className={styles.title}>{article.title}</h3>
                <p className={styles.description}>{article.description}</p>
                <div className={styles.footer}>
                  <span>{t('resourcesPage.author', { author: article.author })}</span>
                  <span className={styles.readLink}>{t('resourcesPage.readArticle')}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={shell.sectionRule} style={{ marginTop: '3rem' }}>
          <p className={styles.intro}>
            {t('resourcesPage.closingText')}
            <Link href="/" className={shell.textLink}>
              {t('resourcesPage.verifyLink')}
            </Link>
            {t('resourcesPage.orText')}
            <Link href="/transparenta" className={shell.textLink}>
              {t('resourcesPage.methodologyLink')}
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
