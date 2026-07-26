'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Callout } from '@/components/ui';
import { REPO_URL } from '@/components/layout/routes';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export default function OpenSourcePage() {
  const { t } = useLanguage();

  const auditList = [
    t('openSourcePage.auditList.0'),
    t('openSourcePage.auditList.1'),
    t('openSourcePage.auditList.2'),
    t('openSourcePage.auditList.3'),
  ];

  const notDoBullets = [
    t('openSourcePage.notDoBullets.0'),
    t('openSourcePage.notDoBullets.1'),
    t('openSourcePage.notDoBullets.2'),
    t('openSourcePage.notDoBullets.3'),
  ];

  const controlBullets = [
    t('openSourcePage.controlBullets.0'),
    t('openSourcePage.controlBullets.1'),
    t('openSourcePage.controlBullets.2'),
  ];

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{t('openSourcePage.eyebrow')}</p>
        <h1 className={shell.title}>{t('openSourcePage.title')}</h1>
        <p className={shell.lead}>{t('openSourcePage.lead')}</p>
      </header>

      <nav className={styles.jump} aria-label={t('openSourcePage.jumpNavAria')}>
        <a href="#open-source" className={styles.jumpLink}>
          {t('openSourcePage.jumpOpenSource')}
        </a>
        <a href="#confidentialitate" className={styles.jumpLink}>
          {t('openSourcePage.jumpPrivacy')}
        </a>
      </nav>

      <div className={shell.body}>
        <section id="open-source" className={styles.section}>
          <p className="eyebrow">{t('openSourcePage.part1Eyebrow')}</p>
          <h2 className={styles.sectionTitle}>{t('openSourcePage.part1Title')}</h2>

          <div className={shell.prose}>
            <p>{t('openSourcePage.part1Intro')}</p>

            <h3>{t('openSourcePage.auditTitle')}</h3>
            <ul>
              {auditList.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>

            <h3>{t('openSourcePage.licenseTitle')}</h3>
            <p>{t('openSourcePage.licenseText')}</p>
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" size="md" href={REPO_URL}>
              {t('openSourcePage.seeCodeBtn')}
            </Button>
            <Link href="/transparenta" className={styles.textLink}>
              {t('openSourcePage.methodologyLink')}
            </Link>
          </div>
        </section>

        <section id="confidentialitate" className={`${styles.section} ${shell.sectionRule}`}>
          <p className="eyebrow">{t('openSourcePage.part2Eyebrow')}</p>
          <h2 className={styles.sectionTitle}>{t('openSourcePage.part2Title')}</h2>

          <Callout label={t('openSourcePage.calloutLabel')}>
            {t('openSourcePage.calloutText')}
          </Callout>

          <div className={shell.prose}>
            <h3>{t('openSourcePage.collectTitle')}</h3>
            <ul>
              <li>
                <strong>{t('openSourcePage.collectBullets.noAccStrong')}</strong>
                {t('openSourcePage.collectBullets.noAccText')}
              </li>
              <li>
                <strong>{t('openSourcePage.collectBullets.withAccStrong')}</strong>
                {t('openSourcePage.collectBullets.withAccText')}
              </li>
              <li>
                <strong>{t('openSourcePage.collectBullets.techStrong')}</strong>
                {t('openSourcePage.collectBullets.techText')}
              </li>
            </ul>

            <h3>{t('openSourcePage.notDoTitle')}</h3>
            <ul>
              {notDoBullets.map((bullet, idx) => (
                <li key={idx}>{bullet}</li>
              ))}
            </ul>

            <h3>{t('openSourcePage.controlTitle')}</h3>
            <ul>
              {controlBullets.map((bullet, idx) => (
                <li key={idx}>{bullet}</li>
              ))}
            </ul>
          </div>

          <p className={styles.note}>
            {t('openSourcePage.privacyQuestionText')}
            <a href={REPO_URL} target="_blank" rel="noreferrer noopener" className={styles.textLink}>
              {t('openSourcePage.repoLinkText')}
            </a>
            {t('openSourcePage.orWriteFromText')}
            <Link href="/cont" className={styles.textLink}>
              {t('openSourcePage.accountLinkText')}
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
