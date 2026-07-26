'use client';

import React from 'react';
import Link from 'next/link';
import { REPO_URL } from '@/components/layout/routes';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';

export default function TermeniPage() {
  const { t } = useLanguage();

  const sec4List = [
    t('termeniPage.sec4List.0'),
    t('termeniPage.sec4List.1'),
    t('termeniPage.sec4List.2'),
    t('termeniPage.sec4List.3'),
  ];

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{t('termeniPage.eyebrow')}</p>
        <h1 className={shell.title}>{t('termeniPage.title')}</h1>
        <p className={shell.lead}>{t('termeniPage.lead')}</p>
      </header>

      <div className={shell.body}>
        <div className={shell.prose}>
          <p>{t('termeniPage.intro')}</p>

          <h2>{t('termeniPage.sec1Title')}</h2>
          <p>{t('termeniPage.sec1Text1')}</p>
          <p>
            {t('termeniPage.sec1Text2Prefix')}
            <Link href="/preturi" className={shell.textLink}>
              {t('termeniPage.pricingLinkText')}
            </Link>
            {t('termeniPage.sec1Text2Suffix')}
          </p>

          <h2>{t('termeniPage.sec2Title')}</h2>
          <p>{t('termeniPage.sec2Text')}</p>

          <h2>{t('termeniPage.sec3Title')}</h2>
          <p>
            <strong>{t('termeniPage.sec3Text1Strong')}</strong>
            {t('termeniPage.sec3Text1Text')}
          </p>
          <p>{t('termeniPage.sec3Text2')}</p>
          <p>
            {t('termeniPage.sec3Text3Prefix')}
            <Link href="/transparenta" className={shell.textLink}>
              {t('termeniPage.transparencyLinkText')}
            </Link>
            {t('termeniPage.sec3Text3Suffix')}
          </p>

          <h2>{t('termeniPage.sec4Title')}</h2>
          <p>{t('termeniPage.sec4Intro')}</p>
          <ul>
            {sec4List.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>

          <h2>{t('termeniPage.sec5Title')}</h2>
          <p>
            {t('termeniPage.sec5Text1Prefix')}
            <a href={REPO_URL} target="_blank" rel="noreferrer noopener" className={shell.textLink}>
              {t('termeniPage.repoLinkText')}
            </a>
            {t('termeniPage.sec5Text1Suffix')}
          </p>
          <p>
            {t('termeniPage.sec5Text2Prefix')}
            <Link href="/confidentialitate" className={shell.textLink}>
              {t('termeniPage.privacyLinkText')}
            </Link>
            {t('termeniPage.sec5Text2Suffix')}
          </p>
          <p>{t('termeniPage.sec5Text3')}</p>

          <h2>{t('termeniPage.sec6Title')}</h2>
          <p>
            {t('termeniPage.sec6TextPrefix')}
            <a href={REPO_URL} target="_blank" rel="noreferrer noopener" className={shell.textLink}>
              {t('termeniPage.issueLinkText')}
            </a>
            {t('termeniPage.sec6TextSuffix')}
          </p>

          <h2>{t('termeniPage.sec7Title')}</h2>
          <p>{t('termeniPage.sec7Text')}</p>

          <h2>{t('termeniPage.sec8Title')}</h2>
          <p>
            {t('termeniPage.sec8TextPrefix')}
            <Link href="/confidentialitate" className={shell.textLink}>
              {t('termeniPage.sec8PrivacyLinkText')}
            </Link>
            {t('termeniPage.sec8TextSuffix')}
          </p>

          <h2>{t('termeniPage.sec9Title')}</h2>
          <p>{t('termeniPage.sec9Text')}</p>

          <h2>{t('termeniPage.sec10Title')}</h2>
          <p>{t('termeniPage.sec10Text')}</p>

          <h2>{t('termeniPage.sec11Title')}</h2>
          <p>
            {t('termeniPage.sec11Text')}
            <a href="mailto:sebi.iancu23@gmail.com" className={shell.textLink}>
              sebi.iancu23@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
