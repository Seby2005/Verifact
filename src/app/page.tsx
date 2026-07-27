'use client';

import React from 'react';
import Link from 'next/link';
import { Reveal, ScoreRing, verdictFromScore } from '@/components/ui';
import { VerifyTool } from '@/components/verify';
import { useLanguage } from '@/i18n';
import styles from './page.module.css';

/**
 * The home page is arranged around a single action: check a claim. The tool
 * sits in the first viewport, the specimen below it shows what an answer looks
 * like, and everything else is kept short — a visitor who sees a wall of text
 * leaves before reaching the thing they came for.
 */
export default function HomePage() {
  const { t } = useLanguage();

  // A fixed, clearly-labelled specimen. Never presented as a live result.
  const sample = {
    claim: t('home.sample.claim'),
    summary: t('home.sample.summary'),
    score: 6,
    sources: [
      {
        title: 'Understanding How COVID-19 Vaccines Work',
        publisher: 'Centers for Disease Control',
        year: '2024',
        url: 'https://www.cdc.gov/covid/vaccines/how-they-work.html',
      },
      {
        title: 'mRNA vaccines — a new era in vaccinology',
        publisher: 'Nature Reviews Drug Discovery',
        year: '2018',
        url: 'https://www.nature.com/articles/nrd.2017.243',
      },
      {
        title: 'Fact check: mRNA vaccines do not alter human DNA',
        publisher: 'Reuters',
        year: '2021',
        url: 'https://www.reuters.com/article/factcheck-dna-vaccine-idUSL2N2N918K',
      },
    ],
  };

  const sampleVerdict = verdictFromScore(sample.score);

  const examples = [
    t('home.try.example1'),
    t('home.try.example2'),
    t('home.try.example3'),
  ];

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
          <p className={styles.claim}>&ldquo;{sample.claim}&rdquo;</p>

          <div className={styles.verdictRow}>
            <ScoreRing score={sample.score} kind={sampleVerdict} label={t('home.sample.scoreCaption')} />
            <div>
              <p className={`${styles.verdictWord} ${styles[sampleVerdict]}`}>
                {t(`verdict.copy.${sampleVerdict}`)}
              </p>
              <p className={styles.verdictMeta}>{t('home.sample.meta')}</p>
            </div>
          </div>

          <p className={styles.summary}>{sample.summary}</p>

          <div className={styles.sources}>
            <p className={styles.sourcesLabel}>{t('home.sample.sourcesLabel')}</p>
            {sample.sources.map((source, index) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer noopener"
                className={styles.source}
              >
                <span className={styles.sourceIndex}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className={styles.sourceTitle}>{source.title}</span>
                <span className={styles.sourceMeta}>
                  {source.publisher} · {source.year}
                </span>
              </a>
            ))}
          </div>
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
