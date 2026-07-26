'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Callout, VerdictLabel } from '@/components/ui';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

const EXAMPLE_ENTRIES = [
  {
    claim: 'Vaccinurile ARNm modifică ADN-ul uman.',
    verdict: 'false' as const,
    score: 6,
    date: '25 iulie 2026',
    sources: 3,
  },
  {
    claim:
      'România a atras în 2025 cea mai mare sumă din PNRR dintre statele membre.',
    verdict: 'partial' as const,
    score: 71,
    date: '24 iulie 2026',
    sources: 5,
  },
  {
    claim: 'Un studiu arată că cititul a 20 de minute pe zi prelungește viața cu 2 ani.',
    verdict: 'unclear' as const,
    score: 48,
    date: '22 iulie 2026',
    sources: 4,
  },
];

export default function RapoarteClient() {
  const { t } = useLanguage();

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{t('rapoartePage.eyebrow')}</p>
        <h1 className={shell.title}>{t('rapoartePage.title')}</h1>
        <p className={shell.lead}>{t('rapoartePage.lead')}</p>
      </header>

      <div className={shell.body}>
        <Callout label={t('rapoartePage.calloutTitle')} tone="plain">
          {t('rapoartePage.calloutText')}
        </Callout>

        <ol className={styles.list} aria-label={t('rapoartePage.listAriaLabel')}>
          {EXAMPLE_ENTRIES.map((entry) => (
            <li key={entry.claim} className={styles.item}>
              <div className={styles.itemMain}>
                <p className={styles.claim}>{entry.claim}</p>
                <p className={styles.itemMeta}>
                  {entry.date} · {t('rapoartePage.sourcesCount', { count: entry.sources })}
                </p>
              </div>
              <div className={styles.itemVerdict}>
                <VerdictLabel kind={entry.verdict} score={entry.score} />
              </div>
            </li>
          ))}
        </ol>

        <div className={shell.sectionRule}>
          <h2 className={styles.subhead}>{t('rapoartePage.yourHistoryTitle')}</h2>
          <p className={styles.subtext}>{t('rapoartePage.yourHistoryText')}</p>
          <div className={styles.actions}>
            <Button variant="secondary" size="md" href="/cont">
              {t('rapoartePage.loginBtn')}
            </Button>
            <Link href="/" className={styles.textLink}>
              {t('rapoartePage.verifyLink')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
