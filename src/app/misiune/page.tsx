'use client';

import React from 'react';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import { useLanguage } from '@/i18n';
import shell from '../page-shell.module.css';
import styles from './page.module.css';

export default function MisiunePage() {
  const { dict } = useLanguage();
  const content = dict.misiunePage;

  return (
    <div className={`container ${shell.page}`}>
      <header className={shell.head}>
        <p className="eyebrow">{content.eyebrow}</p>
        <h1 className={shell.title}>{content.title}</h1>
      </header>

      <div className={shell.body}>
        <Callout label={content.calloutLabel}>
          {content.calloutText}
        </Callout>

        <div className={`${shell.prose} ${styles.prose}`}>
          <h2>{content.problemTitle}</h2>
          <p>{content.problemText1}</p>
          <p>{content.problemText2}</p>

          <h2>{content.criticalThinkingTitle}</h2>
          <p>{content.criticalThinkingText1}</p>
          <p>{content.criticalThinkingText2}</p>

          <h2>{content.algorithmTitle}</h2>
          <ul>
            {content.algorithmSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>

          <h2>{content.romaniaTitle}</h2>
          <ul>
            {content.romaniaBullets.map((bullet, idx) => (
              <li key={idx}>{bullet}</li>
            ))}
          </ul>

          <h2>{content.notTitle}</h2>
          <p>{content.notText}</p>
        </div>

        <section className={shell.sectionRule}>
          <h2 className={styles.valuesTitle}>{content.valuesTitle}</h2>
          <dl className={styles.values}>
            {content.values.map((value) => (
              <div key={value.title} className={styles.value}>
                <dt className={styles.valueTitle}>{value.title}</dt>
                <dd className={styles.valueText}>{value.text}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.follow}>
            {content.followText}
            <Link href="/transparenta" className={styles.textLink}>
              {content.methodologyLink}
            </Link>
            {content.orText}
            <Link href="/open-source" className={styles.textLink}>
              {content.openSourceLink}
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
