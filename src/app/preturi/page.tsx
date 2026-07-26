'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export default function PreturiPage() {
  const { t } = useLanguage();

  const plans = [
    {
      name: 'Free',
      price: t('preturiPage.plans.0.price'),
      cadence: null,
      forWho: t('preturiPage.plans.0.forWho'),
      checks: t('preturiPage.plans.0.checks'),
      features: [
        t('preturiPage.plans.0.features.0'),
        t('preturiPage.plans.0.features.1'),
        t('preturiPage.plans.0.features.2'),
        t('preturiPage.plans.0.features.3'),
      ],
      cta: t('preturiPage.plans.0.cta'),
      highlight: false,
    },
    {
      name: 'Pro',
      price: '€7,99',
      cadence: t('preturiPage.plans.1.cadence'),
      forWho: t('preturiPage.plans.1.forWho'),
      checks: t('preturiPage.plans.1.checks'),
      features: [
        t('preturiPage.plans.1.features.0'),
        t('preturiPage.plans.1.features.1'),
        t('preturiPage.plans.1.features.2'),
        t('preturiPage.plans.1.features.3'),
      ],
      cta: t('preturiPage.plans.1.cta'),
      highlight: true,
    },
    {
      name: 'Business',
      price: '€49',
      cadence: t('preturiPage.plans.2.cadence'),
      forWho: t('preturiPage.plans.2.forWho'),
      checks: t('preturiPage.plans.2.checks'),
      features: [
        t('preturiPage.plans.2.features.0'),
        t('preturiPage.plans.2.features.1'),
        t('preturiPage.plans.2.features.2'),
        t('preturiPage.plans.2.features.3'),
      ],
      cta: t('preturiPage.plans.2.cta'),
      highlight: false,
    },
  ];

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{t('preturiPage.eyebrow')}</p>
        <h1 className={shell.title}>{t('preturiPage.title')}</h1>
        <p className={shell.lead}>{t('preturiPage.lead')}</p>
      </header>

      <div className={shell.body}>
        <div className={styles.grid}>
          {plans.map((plan) => (
            <section
              key={plan.name}
              className={[styles.plan, plan.highlight ? styles.planHighlight : '']
                .filter(Boolean)
                .join(' ')}
            >
              <div className={styles.planHead}>
                <h2 className={styles.planName}>{plan.name}</h2>
                <p className={styles.priceRow}>
                  <span className={styles.price}>{plan.price}</span>
                  {plan.cadence ? <span className={styles.cadence}>{plan.cadence}</span> : null}
                </p>
                <p className={styles.checks}>{plan.checks}</p>
                <p className={styles.forWho}>{plan.forWho}</p>
              </div>

              <ul className={styles.features}>
                {plan.features.map((feature) => (
                  <li key={feature} className={styles.feature}>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className={styles.planCta}>
                <Button
                  variant={plan.highlight ? 'primary' : 'secondary'}
                  size="md"
                  fullWidth
                  href="/cont"
                >
                  {plan.cta}
                </Button>
              </div>
            </section>
          ))}
        </div>

        <div className={shell.sectionRule}>
          <Callout label={t('preturiPage.callout.label')}>
            {t('preturiPage.callout.text')}
          </Callout>
          <p className={styles.footnote}>
            {t('preturiPage.footnote.text')}
            <Link href="/cont" className={styles.textLink}>
              {t('preturiPage.footnote.linkText')}
            </Link>
            {t('preturiPage.footnote.suffix')}
          </p>
        </div>
      </div>
    </div>
  );
}
