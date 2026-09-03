'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Reveal } from '@/components/ui';
import { VerifyTool } from '@/components/verify';
import { useLanguage } from '@/i18n';
import { Logo } from '@/components/layout/Logo';
import { JsonLd } from '@/components/JsonLd';
import styles from './page.module.css';

// Substantive, crawlable copy the tool-first hero deliberately omits. Kept low
// on the page so it never competes with the input box, but present in the HTML
// so search engines and AI assistants can read what Verifact is and answer for
// it. The FAQ is mirrored into FAQPage structured data below — same words, so
// the markup always matches what a visitor actually sees.
const FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'Ce este Verifact?',
    a: 'Verifact este o platformă independentă și open source din România pentru verificarea informației. Analizează o afirmație, un articol, o captură de ecran sau un clip scurt și returnează un scor de veridicitate cu sursele citate integral.',
  },
  {
    q: 'Cum verifică Verifact o afirmație?',
    a: 'Separă afirmația factuală de comentariul celui care a distribuit-o, apoi caută dovezi în surse publice verificabile — fact-checkeri, presă și instituții oficiale. Compară afirmația cu ce găsește și calculează un scor de veridicitate de la 0 la 100.',
  },
  {
    q: 'Pot avea încredere în rezultate?',
    a: 'Fiecare raport citează integral sursele folosite, ca să poți verifica singur. Scorul este o estimare bazată pe sursele disponibile la momentul verificării, nu o decizie editorială finală, iar algoritmul este open source.',
  },
  {
    q: 'Ce tipuri de conținut pot verifica?',
    a: 'Un text (o afirmație scrisă), un link către un articol, o captură de ecran dintr-o rețea socială sau un clip video scurt. Verifact extrage afirmația și o verifică la fel în toate cazurile.',
  },
  {
    q: 'Cât costă verificarea?',
    a: 'Verificarea de bază este gratuită, cu 3 verificări pe lună. Planul Pro oferă de peste 10 ori mai multe verificări, raport PDF descărcabil și link direct către pasajul exact din sursă.',
  },
];

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

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

      {/* Substance for readers who scroll and for crawlers: what Verifact is,
          in prose, plus the questions people actually ask. Kept below the tool. */}
      <section className={`container-narrow ${styles.faq}`}>
        <JsonLd data={FAQ_SCHEMA} />
        <Reveal>
          <h2 className={styles.faqTitle}>Verificare independentă a informației</h2>
          <p className={styles.faqIntro}>
            Verifact este un instrument românesc de verificare a informației
            (fact-checking) asistat de inteligență artificială. Îl folosești când
            vezi o știre, o afirmație sau o postare și vrei să afli dacă e adevărată
            înainte să o distribui. Introduci textul, linkul, captura de ecran sau
            clipul, iar Verifact caută în surse publice verificabile — fact-checkeri,
            presă și instituții oficiale — și îți dă un scor de veridicitate cu
            sursele citate integral, ca să pleci mai bine informat.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <ul className={styles.faqList}>
            {FAQ.map((item) => (
              <li key={item.q}>
                <details className={styles.faqItem}>
                  <summary className={styles.faqQ}>{item.q}</summary>
                  <p className={styles.faqA}>{item.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </Reveal>
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
