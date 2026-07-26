'use client';

import React from 'react';
import { AuthPanel } from '@/components/auth';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export default function ContPage() {
  const { t } = useLanguage();

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{t('contPage.eyebrow')}</p>
        <h1 className={shell.title}>{t('contPage.title')}</h1>
        <p className={shell.lead}>{t('contPage.lead')}</p>
      </header>

      <div className={`${shell.body} ${styles.layout}`}>
        <AuthPanel />

        <aside className={styles.aside}>
          <h2 className={styles.asideTitle}>{t('contPage.aside.title')}</h2>
          <ul className={styles.asideList}>
            <li className={styles.asideItem}>
              <strong className={styles.asideStrong}>{t('contPage.aside.bullet1Strong')}</strong>
              {t('contPage.aside.bullet1Text')}
            </li>
            <li className={styles.asideItem}>
              <strong className={styles.asideStrong}>{t('contPage.aside.bullet2Strong')}</strong>
              {t('contPage.aside.bullet2Text')}
            </li>
            <li className={styles.asideItem}>
              <strong className={styles.asideStrong}>{t('contPage.aside.bullet3Strong')}</strong>
              {t('contPage.aside.bullet3Text')}
            </li>
            <li className={styles.asideItem}>
              <strong className={styles.asideStrong}>{t('contPage.aside.bullet4Strong')}</strong>
              {t('contPage.aside.bullet4Text')}
            </li>
          </ul>
          <p className={styles.asideNote}>
            {t('contPage.aside.noteText')}
            <a href="/open-source" className={styles.textLink}>
              {t('contPage.aside.noteLink')}
            </a>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}
