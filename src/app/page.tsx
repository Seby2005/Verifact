'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Reveal } from '@/components/ui';
import { VerifyTool, ReportView } from '@/components/verify';
import type { VerificationReport } from '@/types/verification';
import { useLanguage } from '@/i18n';
import styles from './page.module.css';

/**
 * The home page is arranged around a single action: check a claim. The tool
 * sits in the first viewport, the specimen below it shows what an answer looks
 * like, and everything else is kept short — a visitor who sees a wall of text
 * leaves before reaching the thing they came for.
 */
export default function HomePage() {
  const { t, locale } = useLanguage();

  // A fixed, clearly-labelled specimen, rendered through the real ReportView so
  // it matches an actual report exactly. Never presented as a live result.
  const sampleReport: VerificationReport = {
    id: 'exemplu-verifact',
    claim: t('home.sample.claim'),
    inputText: t('home.sample.claim'),
    inputType: 'text',
    verdict: 'false',
    score: 9,
    confidenceLevel: 'high',
    processingTimeMs: 12300,
    executiveSummary: t('home.sample.summary'),
    aiAvailable: true,
    createdAt: '2026-08-01T09:00:00.000Z',
    isPublic: false,
    language: locale === 'en' ? 'en' : 'ro',
    scoreBreakdown: {
      finalScore: 9,
      availableLayers: 3,
      weights: { factCheck: 0.35, news: 0.3, official: 0.25 },
    },
    sources: [
      {
        title: 'Antibiotic resistance',
        publisher: 'World Health Organization',
        url: 'https://www.who.int/news-room/fact-sheets/detail/antibiotic-resistance',
        date: '2023-11-21',
        sourceType: 'official',
        relevance: 0.96,
        excerpt:
          'Antibiotics are used to prevent and treat bacterial infections. Antibiotics do not work against viral infections such as colds and flu.',
      },
      {
        title: 'Antimicrobial resistance',
        publisher: 'ECDC',
        url: 'https://www.ecdc.europa.eu/en/antimicrobial-resistance',
        date: '2024-11-18',
        sourceType: 'official',
        relevance: 0.9,
        excerpt:
          'Antibiotics have no effect on viruses such as those causing the common cold or influenza.',
      },
      {
        title: 'Fact check: antibiotics do not treat viral infections like colds and flu',
        publisher: 'Reuters',
        url: 'https://www.reuters.com/fact-check/',
        date: '2021-09-30',
        sourceType: 'fact_check',
        relevance: 0.88,
        excerpt:
          'Health authorities confirm antibiotics target bacteria, not viruses; taking them for a cold is ineffective and fuels resistance.',
      },
    ],
  };

  // Curated evergreen claims shown instantly; upgraded to live trending
  // Romanian claims once /api/trending-examples responds (falls back to these).
  const fallbackExamples = useMemo(
    () => [t('home.try.example1'), t('home.try.example2'), t('home.try.example3')],
    [t]
  );
  const [examples, setExamples] = useState<string[]>(fallbackExamples);

  useEffect(() => {
    let active = true;
    setExamples(fallbackExamples);
    fetch(`/api/trending-examples?lang=${locale}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && Array.isArray(data?.examples) && data.examples.length > 0) {
          setExamples(data.examples as string[]);
        }
      })
      .catch(() => {
        /* keep the curated fallback */
      });
    return () => {
      active = false;
    };
  }, [locale, fallbackExamples]);

  const steps = [
    { number: t('home.steps.step1.number'), title: t('home.steps.step1.title') },
    { number: t('home.steps.step2.number'), title: t('home.steps.step2.title') },
    { number: t('home.steps.step3.number'), title: t('home.steps.step3.title') },
  ];

  return (
    <div className={styles.page}>
      {/* Stage: headline and the tool, together in the first viewport. */}
      <section className={`container-narrow ${styles.stage}`}>
        <Reveal>
          <p className={`eyebrow ${styles.stageEyebrow}`}>{t('home.hero.eyebrow')}</p>
        </Reveal>

        <Reveal delay={70}>
          <h1 className={styles.stageTitle}>
            {t('home.hero.title')}{' '}
            <em className={styles.stageTitleAccent}>{t('home.hero.titleAccent')}</em>
          </h1>
        </Reveal>

        <Reveal delay={140}>
          <p className={styles.stageLead}>{t('home.hero.lead')}</p>
        </Reveal>

        <Reveal delay={210} className={styles.stageTool}>
          <VerifyTool examples={examples} />
        </Reveal>
      </section>

      {/* Specimen: what an answer looks like. */}
      <section className={`container-narrow ${styles.specimen}`}>
        <Reveal>
          <p className={`eyebrow ${styles.centered}`}>{t('home.sample.eyebrow')}</p>
          <h2 className={styles.specimenTitle}>{t('home.sample.title')}</h2>
        </Reveal>

        <Reveal delay={80} className={styles.card}>
          <ReportView report={sampleReport} interactive={false} />
        </Reveal>
      </section>

      {/* How it works: three short beats, not three paragraphs. */}
      <section className={styles.how}>
        <div className="container-narrow">
          <ol className={styles.steps}>
            {steps.map((step, index) => (
              <Reveal as="li" key={step.number} delay={index * 90} className={styles.step}>
                <span className={styles.stepNumber}>{step.number}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* The promise, in one line. */}
      <section className={`container-narrow ${styles.trust}`}>
        <Reveal>
          <p className={styles.trustLine}>{t('home.trust.line')}</p>
          <p className={styles.trustLinks}>
            <Link href="/transparenta" className={styles.textLink}>
              {t('home.callout.methodologyLink')}
            </Link>
            <span className={styles.trustDot}>·</span>
            <Link href="/open-source" className={styles.textLink}>
              {t('home.callout.openSourceLink')}
            </Link>
          </p>
        </Reveal>
      </section>
    </div>
  );
}
