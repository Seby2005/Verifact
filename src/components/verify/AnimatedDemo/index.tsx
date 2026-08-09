'use client';

import React, { useEffect, useRef } from 'react';
import { useLanguage } from '@/i18n';
import styles from './AnimatedDemo.module.css';

const COPY = {
  ro: {
    claim: 'Antibioticele tratează gripa.',
    label: 'Afirmație',
    steps: ['Caut surse…', 'Compar sursele…', 'Formulez verdictul…'],
    layers: ['Fact-checking', 'Presă', 'Surse oficiale', 'Declarații publice'],
    verdict: 'Probabil fals',
    summary: 'Antibioticele acționează asupra bacteriilor, nu a virusurilor. Răceala și gripa sunt cauzate de virusuri.',
  },
  en: {
    claim: 'Antibiotics treat the flu.',
    label: 'Claim',
    steps: ['Searching sources…', 'Comparing sources…', 'Forming a verdict…'],
    layers: ['Fact-checking', 'Press', 'Official sources', 'Public statements'],
    verdict: 'Likely false',
    summary: 'Antibiotics act on bacteria, not viruses. Colds and flu are caused by viruses.',
  },
} as const;

const BAR_SCALES = [0.96, 0.88, 0.92, 0.74];

/**
 * A looping, stylised illustration of the verification flow: the claim types
 * itself in, four source layers fill, and a verdict resolves. It is marketing —
 * never presented as a live result — so the sample stays politically neutral.
 */
export const AnimatedDemo: React.FC = () => {
  const { locale } = useLanguage();
  const copy = COPY[locale === 'en' ? 'en' : 'ro'];

  const rootRef = useRef<HTMLDivElement>(null);
  const typedRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const statusTextRef = useRef<HTMLSpanElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timers: ReturnType<typeof setTimeout>[] = [];
    let raf = 0;
    const wait = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));
    const bars = () => Array.from(barsRef.current?.querySelectorAll('i') ?? []);
    const setVisible = (el: HTMLElement | null, on: boolean) => {
      if (el) el.style.visibility = on ? 'visible' : 'hidden';
    };

    const showFinal = () => {
      if (typedRef.current) typedRef.current.textContent = copy.claim;
      setVisible(layersRef.current, true);
      bars().forEach((b) => (b.style.transform = 'scaleX(1)'));
      verdictRef.current?.classList.add(styles.verdictShown);
      if (scoreRef.current) scoreRef.current.textContent = '9';
    };

    const reset = () => {
      if (typedRef.current) typedRef.current.textContent = '';
      setVisible(statusRef.current, false);
      setVisible(layersRef.current, false);
      bars().forEach((b) => (b.style.transform = 'scaleX(0)'));
      verdictRef.current?.classList.remove(styles.verdictShown);
      if (scoreRef.current) scoreRef.current.textContent = '0';
    };

    const type = (i: number) => {
      if (typedRef.current) typedRef.current.textContent = copy.claim.slice(0, i);
      if (i <= copy.claim.length) wait(() => type(i + 1), 55);
      else search();
    };

    const search = () => {
      setVisible(statusRef.current, true);
      if (statusTextRef.current) statusTextRef.current.textContent = copy.steps[0];
      setVisible(layersRef.current, true);
      wait(() => bars().forEach((b, k) => (b.style.transform = `scaleX(${BAR_SCALES[k % 4]})`)), 120);
      wait(() => { if (statusTextRef.current) statusTextRef.current.textContent = copy.steps[1]; }, 1500);
      wait(() => { if (statusTextRef.current) statusTextRef.current.textContent = copy.steps[2]; }, 2700);
      wait(verdict, 3700);
    };

    const verdict = () => {
      setVisible(statusRef.current, false);
      verdictRef.current?.classList.add(styles.verdictShown);
      let start: number | null = null;
      const step = (ts: number) => {
        if (start === null) start = ts;
        const p = Math.min((ts - start) / 900, 1);
        if (scoreRef.current) scoreRef.current.textContent = String(Math.round(p * 9));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      wait(loop, 3400);
    };

    const loop = () => {
      timers.forEach(clearTimeout);
      timers = [];
      reset();
      wait(() => type(0), 600);
    };

    if (reduce) showFinal();
    else loop();

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
    // Restart the loop when the language changes so the copy stays in sync.
  }, [copy]);

  return (
    <div className={styles.demo} ref={rootRef} aria-hidden="true">
      <div className={styles.bar}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.url}>verifact.ro</span>
      </div>
      <div className={styles.body}>
        <p className={styles.label}>{copy.label}</p>
        <div className={styles.input}>
          <span ref={typedRef} />
          <span className={styles.caret} />
        </div>

        <div className={styles.status} ref={statusRef} style={{ visibility: 'hidden' }}>
          <span className={styles.pulse} />
          <span ref={statusTextRef}>{copy.steps[0]}</span>
        </div>

        <div className={styles.layers} ref={layersRef} style={{ visibility: 'hidden' }}>
          <div ref={barsRef} style={{ display: 'contents' }}>
            {copy.layers.map((name) => (
              <div className={styles.layer} key={name}>
                <span>{name}</span>
                <div className={styles.track}>
                  <i />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.verdict} ref={verdictRef}>
          <div className={styles.vhead}>
            <span className={styles.score} ref={scoreRef}>
              0
            </span>
            <span className={styles.of}>/100</span>
            <span className={styles.verdictLabel}>{copy.verdict}</span>
          </div>
          <p className={styles.claim}>
            {copy.summary}
            <span className={styles.cite}>1</span>
          </p>
          <div className={styles.sources}>
            <span>who.int</span>
            <span>ecdc.europa.eu</span>
            <span>reuters.com</span>
          </div>
        </div>
      </div>
    </div>
  );
};
