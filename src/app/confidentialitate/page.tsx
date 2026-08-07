'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';

export default function ConfidentialitatePage() {
  const { t } = useLanguage();

  const sec2AccountList = [
    t('confidentialitatePage.sec2AccountList.0'),
    t('confidentialitatePage.sec2AccountList.1'),
    t('confidentialitatePage.sec2AccountList.2'),
    t('confidentialitatePage.sec2AccountList.3'),
  ];

  const sec2ContentList = [
    t('confidentialitatePage.sec2ContentList.0'),
    t('confidentialitatePage.sec2ContentList.1'),
    t('confidentialitatePage.sec2ContentList.2'),
  ];

  const sec2TechList = [
    t('confidentialitatePage.sec2TechList.0'),
    t('confidentialitatePage.sec2TechList.1'),
  ];

  const sec3List = [
    t('confidentialitatePage.sec3List.0'),
    t('confidentialitatePage.sec3List.1'),
    t('confidentialitatePage.sec3List.2'),
  ];

  const sec4Vendors = [
    { name: 'Supabase', desc: t('confidentialitatePage.sec4Vendors.0.desc') },
    { name: 'Google Cloud Vision', desc: t('confidentialitatePage.sec4Vendors.1.desc') },
    { name: 'Google Gemini', desc: t('confidentialitatePage.sec4Vendors.2.desc') },
    { name: 'Google Fact Check Tools / Custom Search', desc: t('confidentialitatePage.sec4Vendors.3.desc') },
    { name: 'Tavily', desc: t('confidentialitatePage.sec4Vendors.4.desc') },
    { name: 'Creem', desc: t('confidentialitatePage.sec4Vendors.5.desc') },
    { name: 'Vercel', desc: t('confidentialitatePage.sec4Vendors.6.desc') },
  ];

  const sec5List = [
    t('confidentialitatePage.sec5List.0'),
    t('confidentialitatePage.sec5List.1'),
    t('confidentialitatePage.sec5List.2'),
    t('confidentialitatePage.sec5List.3'),
  ];

  const sec7List = [
    t('confidentialitatePage.sec7List.0'),
    t('confidentialitatePage.sec7List.1'),
    t('confidentialitatePage.sec7List.2'),
    t('confidentialitatePage.sec7List.3'),
  ];

  const sec9List = [
    t('confidentialitatePage.sec9List.0'),
    t('confidentialitatePage.sec9List.1'),
    t('confidentialitatePage.sec9List.2'),
    t('confidentialitatePage.sec9List.3'),
  ];

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{t('confidentialitatePage.eyebrow')}</p>
        <h1 className={shell.title}>{t('confidentialitatePage.title')}</h1>
        <p className={shell.lead}>
          {t('confidentialitatePage.leadPrefix')}
          <Link href="/open-source" className={shell.textLink}>
            {t('confidentialitatePage.shortVersionLink')}
          </Link>
          {t('confidentialitatePage.leadSuffix')}
        </p>
      </header>

      <div className={shell.body}>
        <div className={shell.prose}>
          <h2>{t('confidentialitatePage.sec1Title')}</h2>
          <p>
            {t('confidentialitatePage.sec1Text')}
            <a href="mailto:verifactro@gmail.com" className={shell.textLink}>
              verifactro@gmail.com
            </a>
            .
          </p>

          <h2>{t('confidentialitatePage.sec2Title')}</h2>
          <h3>{t('confidentialitatePage.sec2AccountTitle')}</h3>
          <ul>
            {sec2AccountList.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <h3>{t('confidentialitatePage.sec2ContentTitle')}</h3>
          <ul>
            {sec2ContentList.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <h3>{t('confidentialitatePage.sec2TechTitle')}</h3>
          <ul>
            {sec2TechList.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
          <p>{t('confidentialitatePage.sec2SocialNote')}</p>

          <h2>{t('confidentialitatePage.sec3Title')}</h2>
          <ul>
            {sec3List.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>

          <h2>{t('confidentialitatePage.sec4Title')}</h2>
          <p>{t('confidentialitatePage.sec4Intro')}</p>
          <ul>
            {sec4Vendors.map((vendor) => (
              <li key={vendor.name}>
                <strong>{vendor.name}</strong> — {vendor.desc}
              </li>
            ))}
          </ul>
          <p>{t('confidentialitatePage.sec4Outro')}</p>

          <h2>{t('confidentialitatePage.sec5Title')}</h2>
          <ul>
            {sec5List.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>

          <h2>{t('confidentialitatePage.sec6Title')}</h2>
          <p>{t('confidentialitatePage.sec6Text')}</p>

          <h2>{t('confidentialitatePage.sec7Title')}</h2>
          <p>{t('confidentialitatePage.sec7Intro')}</p>
          <ul>
            {sec7List.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
            <li>
              {t('confidentialitatePage.sec7List.4')}{' '}
              <a href="https://www.dataprotection.ro" target="_blank" rel="noreferrer noopener" className={shell.textLink}>
                dataprotection.ro
              </a>
              .
            </li>
          </ul>
          <p>{t('confidentialitatePage.sec7Outro')}</p>

          <h2>{t('confidentialitatePage.sec8Title')}</h2>
          <p>{t('confidentialitatePage.sec8Text1')}</p>
          <p>{t('confidentialitatePage.sec8Text2')}</p>

          <h2>{t('confidentialitatePage.sec9Title')}</h2>
          <ul>
            {sec9List.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>

          <h2>{t('confidentialitatePage.sec10Title')}</h2>
          <p>{t('confidentialitatePage.sec10Text')}</p>
        </div>
      </div>
    </div>
  );
}
