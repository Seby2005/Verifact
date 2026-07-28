'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthPanel } from '@/components/auth';
import { Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export default function ContPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error') === 'oauth_failed';

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{t('contPage.eyebrow')}</p>
        <h1 className={shell.title}>{t('contPage.title')}</h1>
        <p className={shell.lead}>{t('contPage.lead')}</p>
      </header>

      <div className={shell.body}>
        <div className={styles.layout}>
          <div className={styles.formSide}>
            {oauthError && (
              <Callout label={t('contPage.oauthError.label')} tone="plain">
                {t('contPage.oauthError.message')}
              </Callout>
            )}
            <AuthPanel />
          </div>

          <aside className={styles.aside}>
            <h2 className={styles.asideTitle}>{t('contPage.aside.title')}</h2>
            <ul className={styles.asideList}>
              <li className={styles.asideItem}>
                <span>
                  <strong className={styles.asideStrong}>
                    {t('contPage.aside.bullet1Strong')}
                  </strong>
                  {t('contPage.aside.bullet1Text')}
                </span>
              </li>
              <li className={styles.asideItem}>
                <span>
                  <strong className={styles.asideStrong}>
                    {t('contPage.aside.bullet2Strong')}
                  </strong>
                  {t('contPage.aside.bullet2Text')}
                </span>
              </li>
              <li className={styles.asideItem}>
                <span>
                  <strong className={styles.asideStrong}>
                    {t('contPage.aside.bullet3Strong')}
                  </strong>
                  {t('contPage.aside.bullet3Text')}
                </span>
              </li>
              <li className={styles.asideItem}>
                <span>
                  <strong className={styles.asideStrong}>
                    {t('contPage.aside.bullet4Strong')}
                  </strong>
                  {t('contPage.aside.bullet4Text')}
                </span>
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
    </div>
  );
}
