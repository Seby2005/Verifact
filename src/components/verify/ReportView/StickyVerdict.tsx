'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { VerdictKind } from '@/components/ui';
import { useLanguage } from '@/i18n';
import styles from './StickyVerdict.module.css';

export interface StickyVerdictProps {
  kind: VerdictKind;
  score: number;
  claim: string;
  /** The report header. The bar appears once this scrolls out of view. */
  watch: React.RefObject<HTMLElement>;
}

/**
 * Keeps the verdict, its score and the claim in view once the report's own
 * header has scrolled away. By source nine a reader has usually lost track of
 * which verdict the evidence belongs to; this is the anchor for that, not
 * decoration.
 *
 * The site header is itself sticky, so the offset is measured from it rather
 * than hard-coded — the header's height differs between the stacked mobile
 * layout and the desktop row, and guessing it would leave the bar tucked
 * underneath.
 */
export const StickyVerdict: React.FC<StickyVerdictProps> = ({ kind, score, claim, watch }) => {
  const { t } = useLanguage();
  const [shown, setShown] = useState(false);
  const [offset, setOffset] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  // Track the site header's height so the bar parks directly beneath it.
  useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;

    const measure = () => setOffset(header.getBoundingClientRect().height);
    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // Reveal once the report header has left the top of the viewport.
  useEffect(() => {
    const target = watch.current;
    if (!target || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Only once it has passed *above* the viewport, never when the reader
          // has simply not reached the report yet.
          setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        });
      },
      { threshold: 0, rootMargin: `-${Math.round(offset) + 8}px 0px 0px 0px` },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watch, offset]);

  return (
    <div
      ref={barRef}
      className={[styles.bar, shown ? styles.isShown : ''].filter(Boolean).join(' ')}
      style={{ top: offset }}
      aria-hidden="true"
      data-print-hide
    >
      <span className={[styles.verdict, styles[kind]].filter(Boolean).join(' ')}>
        {t(`verdict.copy.${kind}`)}
      </span>
      <span className={[styles.score, styles[kind]].filter(Boolean).join(' ')}>{score}%</span>
      <span className={styles.claim}>&ldquo;{claim}&rdquo;</span>
    </div>
  );
};
