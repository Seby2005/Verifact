'use client';

import React from 'react';
import Link from 'next/link';
import { Callout } from '@/components/ui';
import { VerifyTool, ReportView } from '@/components/verify';
import type { VerificationReport } from '@/types/verification';
import { useLanguage } from '@/i18n';
import styles from './page.module.css';

export default function HomePage() {
  const { t } = useLanguage();

  const sampleReport: VerificationReport = {
    id: 'exemplu',
    claim: t('home.sample.claim'),
    inputText: t('home.sample.claim'),
    inputType: 'text',
    language: 'ro',
    verdict: 'false',
    score: 6,
    confidenceLevel: 'high',
    scoreBreakdown: {
      finalScore: 6,
      availableLayers: 4,
      weights: { factCheck: 0.35, news: 0.3, official: 0.25, social: 0.1 },
    },
    executiveSummary: t('home.sample.summary'),
    sources: [
      {
        title: 'Understanding How COVID-19 Vaccines Work',
        publisher: 'Centers for Disease Control and Prevention',
        date: '2024-09-12',
        url: 'https://www.cdc.gov/covid/vaccines/how-they-work.html',
        sourceType: 'official',
        relevance: 0.98,
      },
      {
        title: 'mRNA vaccines — a new era in vaccinology',
        publisher: 'Nature Reviews Drug Discovery',
        date: '2018-01-12',
        url: 'https://www.nature.com/articles/nrd.2017.243',
        sourceType: 'official',
        relevance: 0.95,
      },
      {
        title: 'Fact check: mRNA vaccines do not alter human DNA',
        publisher: 'Reuters',
        date: '2021-05-21',
        url: 'https://www.reuters.com/article/factcheck-dna-vaccine-idUSL2N2N918K',
        sourceType: 'fact_check',
        relevance: 0.92,
      },
    ],
    layers: {
      layer1: { status: 'success', layerScore: 0, results: [] },
      layer2: { status: 'success', layerScore: 0, results: [] },
      layer3: { status: 'success', layerScore: 0, results: [] },
      layer4: { status: 'success', layerScore: 0, results: [] },
    },
    processingTime: 12.3,
    processingTimeMs: 12300,
    createdAt: '2026-07-25T09:00:00.000Z',
    isPublic: false,
    fromCache: false,
  };

  const steps = [
    {
      number: t('home.steps.step1.number'),
      title: t('home.steps.step1.title'),
      text: t('home.steps.step1.text'),
    },
    {
      number: t('home.steps.step2.number'),
      title: t('home.steps.step2.title'),
      text: t('home.steps.step2.text'),
    },
    {
      number: t('home.steps.step3.number'),
      title: t('home.steps.step3.title'),
      text: t('home.steps.step3.text'),
    },
  ];

  return (
    <div className={styles.page}>
      <section className={`container ${styles.hero}`}>
        <p className="eyebrow">{t('home.hero.eyebrow')}</p>
        <h1 className={styles.heroTitle}>{t('home.hero.title')}</h1>
        <p className={styles.heroLead}>{t('home.hero.lead')}</p>
      </section>

      <section className={`container ${styles.toolSection}`}>
        <VerifyTool />
      </section>

      <section className={`container ${styles.section}`}>
        <p className="eyebrow">{t('home.sample.eyebrow')}</p>
        <h2 className={styles.sectionTitle}>{t('home.sample.title')}</h2>
        <div className={styles.sampleWrap}>
          <ReportView report={sampleReport} />
        </div>
      </section>

      <section className={`container ${styles.section}`}>
        <h2 className={styles.sectionTitle}>{t('home.steps.title')}</h2>
        <ol className={styles.steps}>
          {steps.map((step) => (
            <li key={step.number} className={styles.step}>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepText}>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`container ${styles.section}`}>
        <Callout label={t('home.callout.label')}>
          {t('home.callout.text')}
        </Callout>
        <p className={styles.calloutFollow}>
          <Link href="/transparenta" className={styles.textLink}>
            {t('home.callout.methodologyLink')}
          </Link>
          {' · '}
          <Link href="/open-source" className={styles.textLink}>
            {t('home.callout.openSourceLink')}
          </Link>
        </p>
      </section>
    </div>
  );
}
