'use client';

import React from 'react';
import Link from 'next/link';
import { Callout, Disclosure, WeightBar } from '@/components/ui';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export default function TransparentaPage() {
  const { t } = useLanguage();

  const layers = [
    {
      number: '01',
      title: t('transparentaPage.layers.0.title'),
      weight: t('transparentaPage.layers.0.weight'),
      text: t('transparentaPage.layers.0.text'),
    },
    {
      number: '02',
      title: t('transparentaPage.layers.1.title'),
      weight: t('transparentaPage.layers.1.weight'),
      text: t('transparentaPage.layers.1.text'),
    },
    {
      number: '03',
      title: t('transparentaPage.layers.2.title'),
      weight: t('transparentaPage.layers.2.weight'),
      text: t('transparentaPage.layers.2.text'),
    },
    {
      number: '04',
      title: t('transparentaPage.layers.3.title'),
      weight: t('transparentaPage.layers.3.weight'),
      text: t('transparentaPage.layers.3.text'),
    },
  ];

  const bands = [
    {
      range: '85–100%',
      kind: 'true' as const,
      label: t('transparentaPage.bands.0.label'),
      text: t('transparentaPage.bands.0.text'),
    },
    {
      range: '60–84%',
      kind: 'partial' as const,
      label: t('transparentaPage.bands.1.label'),
      text: t('transparentaPage.bands.1.text'),
    },
    {
      range: '40–59%',
      kind: 'unclear' as const,
      label: t('transparentaPage.bands.2.label'),
      text: t('transparentaPage.bands.2.text'),
    },
    {
      range: '0–39%',
      kind: 'false' as const,
      label: t('transparentaPage.bands.3.label'),
      text: t('transparentaPage.bands.3.text'),
    },
  ];

  const limits = [
    { title: t('transparentaPage.limits.0.title'), text: t('transparentaPage.limits.0.text') },
    { title: t('transparentaPage.limits.1.title'), text: t('transparentaPage.limits.1.text') },
    { title: t('transparentaPage.limits.2.title'), text: t('transparentaPage.limits.2.text') },
    { title: t('transparentaPage.limits.3.title'), text: t('transparentaPage.limits.3.text') },
  ];

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{t('transparentaPage.eyebrow')}</p>
        <h1 className={shell.title}>{t('transparentaPage.title')}</h1>
        <p className={shell.lead}>{t('transparentaPage.lead')}</p>
      </header>

      <div className={shell.body}>
        <section>
          <h2 className={styles.sectionTitle}>{t('transparentaPage.layersTitle')}</h2>
          <ol className={styles.layers}>
            {layers.map((layer, index) => (
              <li key={layer.number} className={styles.layer}>
                <div className={styles.layerHead}>
                  <span className={styles.layerNumber}>{layer.number}</span>
                  <span className={styles.layerWeight}>
                    {t('transparentaPage.layersWeight', { weight: layer.weight })}
                  </span>
                </div>
                <WeightBar value={parseInt(layer.weight, 10)} delay={index * 110} />
                <h3 className={styles.layerTitle}>{layer.title}</h3>
                <p className={styles.layerText}>{layer.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={shell.sectionRule}>
          <h2 className={styles.sectionTitle}>{t('transparentaPage.scoreTitle')}</h2>
          <p className={styles.intro}>{t('transparentaPage.scoreIntro')}</p>
          <dl className={styles.bands}>
            {bands.map((band) => (
              <div key={band.range} className={styles.band}>
                <dt className={styles.bandRange}>{band.range}</dt>
                <dd className={styles.bandBody}>
                  <span className={`${styles.bandLabel} ${styles[band.kind]}`}>
                    {band.label}
                  </span>
                  <span className={styles.bandText}>{band.text}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={shell.sectionRule}>
          <h2 className={styles.sectionTitle}>{t('transparentaPage.limitsTitle')}</h2>
          <div className={styles.limits}>
            {limits.map((item) => (
              <Disclosure key={item.title} summary={item.title}>
                {item.text}
              </Disclosure>
            ))}
          </div>
          <Callout label={t('transparentaPage.calloutLabel')} tone="plain">
            {t('transparentaPage.calloutText')}
          </Callout>
          <p className={styles.follow}>
            {t('transparentaPage.openSourceLead')}
            <Link href="/open-source" className={styles.textLink}>
              {t('transparentaPage.openSourceLink')}
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
