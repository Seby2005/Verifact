'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './WeightBar.module.css';

export interface WeightBarProps {
  /** Percentage 0–100. */
  value: number;
  /** Stagger, in ms, when several bars draw together. */
  delay?: number;
}

/**
 * A layer's weight, drawn as a thin ink rule when it scrolls into view. It
 * restates the number beside it rather than replacing it — the figure stays
 * the source of truth, the bar just makes the proportions comparable at a
 * glance (and makes it obvious that the AI layer carries the least).
 */
export const WeightBar: React.FC<WeightBarProps> = ({ value, delay = 0 }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDrawn(true);
      return;
    }
    const el = ref.current;
    // Without an observer the bar simply starts drawn rather than empty.
    if (!el || typeof IntersectionObserver === 'undefined') {
      setDrawn(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setDrawn(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span ref={ref} className={styles.track} aria-hidden="true">
      <span
        className={styles.fill}
        style={{
          transform: `scaleX(${drawn ? Math.max(0, Math.min(100, value)) / 100 : 0})`,
          transitionDelay: `${delay}ms`,
        }}
      />
    </span>
  );
};
