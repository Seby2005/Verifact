'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Reveal } from '@/components/ui';
import { VerifyTool } from '@/components/verify';
import { useLanguage } from '@/i18n';
import { Logo } from '@/components/layout/Logo';
import styles from './page.module.css';

const AnimatedDemo = dynamic(
  () => import('@/components/verify/AnimatedDemo').then((mod) => mod.AnimatedDemo),
  {
    ssr: false,
    loading: () => <div style={{ minHeight: '320px' }} />,
  }
);

// A quiet, slowly-drifting wall of duotone news photography behind the hero —
// the "claims in circulation" the tool cuts through. Public-domain placeholders
// for now; swap for licensed editorial photography in production.
const HERO_PHOTOS = ['face', 'podium', 'jet', 'crowd', 'anchor', 'handshake', 'chamber', 'globe'];
const HERO_ROWS = [
  [0, 2, 3, 6, 1, 7, 4, 5],
  [4, 7, 0, 3, 6, 1, 5, 2],
];

function heroFrames(order: number[]): React.ReactNode {
  // Rendered twice so the marquee can translate -50% and loop seamlessly.
  // Initial visible images (k < 2) are loaded eagerly with high fetch priority for LCP optimization.
  return [...order, ...order].map((i, k) => {
    const isInitialVisible = k < 2;
    return (
      <span className={styles.heroFrame} key={`${i}-${k}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/hero/${HERO_PHOTOS[i]}.jpg`}
          alt=""
          loading={isInitialVisible ? 'eager' : 'lazy'}
          fetchPriority={isInitialVisible ? 'high' : 'auto'}
          decoding="async"
        />
        <span className={styles.heroLo} />
        <span className={styles.heroHi} />
      </span>
    );
  });
}

/**
 * The home page is arranged around a single action: check a claim. The tool
 * sits in the first viewport, the specimen below it shows what an answer looks
 * like, and everything else is kept short — a visitor who sees a wall of text
 * leaves before reaching the thing they came for.
 */
export default function HomePage() {
  const { t, locale } = useLanguage();

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
      {/* Stage: headline and the tool, together in the first viewport, over a
          quiet drifting wall of news photography. */}
      <section className={styles.stage}>
        <div className={styles.heroBackground} aria-hidden="true">
          <div className={styles.heroWall}>
            <div className={styles.heroRow}>{heroFrames(HERO_ROWS[0])}</div>
            <div className={`${styles.heroRow} ${styles.heroRowB}`}>{heroFrames(HERO_ROWS[1])}</div>
          </div>
          <div className={styles.heroScrim} />
        </div>

        <div className={`container-narrow ${styles.stageInner}`}>
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
            <Suspense fallback={<div style={{ minHeight: '180px' }} />}>
              <VerifyTool examples={examples} />
            </Suspense>
          </Reveal>
        </div>
      </section>

      {/* Specimen: what an answer looks like. */}
      <section className={`container-narrow ${styles.specimen}`}>
        <Reveal>
          <p className={`eyebrow ${styles.centered}`}>{t('home.sample.eyebrow')}</p>
          <h2 className={styles.specimenTitle}>{t('home.sample.title')}</h2>
        </Reveal>

        <Reveal delay={80}>
          <AnimatedDemo />
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

      {/* The promise, in one line — signed off with the mark. */}
      <section className={`container-narrow ${styles.trust}`}>
        <Reveal>
          <p className={styles.trustLine}>{t('home.trust.line')}</p>
          <Logo className={styles.trustMark} />
          <p className={styles.trustLinks}>
            <Link href="/resurse" className={styles.textLink}>
              Resurse & Glosar
            </Link>
            <span className={styles.trustDot}>·</span>
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
