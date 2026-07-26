'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { VerdictKind } from '../VerdictLabel';
import styles from './ScoreRing.module.css';

const R = 52;
const CIRC = 2 * Math.PI * R;

export interface ScoreRingProps {
  /** Veracity score, 0–100. */
  score: number;
  kind: VerdictKind;
  /** Diameter in px. */
  size?: number;
  /** Small caption under the figure. */
  label?: string;
}

/**
 * The score as a thin, measured ring — coloured by verdict band, never a neon
 * gauge. It counts up and draws itself in when scrolled into view; with reduced
 * motion it simply shows the final value.
 */
export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  kind,
  size = 128,
  label = 'scor',
}) => {
  const target = Math.max(0, Math.min(100, Math.round(score)));
  const [prog, setProg] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setProg(target);
      return;
    }
    const el = wrapRef.current;
    if (!el) {
      setProg(target);
      return;
    }
    let raf = 0;
    const animate = () => {
      if (started.current) return;
      started.current = true;
      const duration = 1100;
      let t0: number | null = null;
      const step = (ts: number) => {
        if (t0 === null) t0 = ts;
        const k = Math.min((ts - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - k, 3);
        setProg(eased * target);
        if (k < 1) raf = requestAnimationFrame(step);
        else setProg(target);
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate();
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target]);

  const offset = CIRC * (1 - prog / 100);

  return (
    <div
      ref={wrapRef}
      className={[styles.ring, styles[kind]].filter(Boolean).join(' ')}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 120 120" className={styles.svg} aria-hidden="true">
        <circle className={styles.track} cx="60" cy="60" r={R} />
        <circle
          className={styles.value}
          cx="60"
          cy="60"
          r={R}
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={styles.num}>
        <span className={styles.n}>
          {Math.round(prog)}
          <span className={styles.pct}>%</span>
        </span>
        {label ? <span className={styles.lab}>{label}</span> : null}
      </div>
    </div>
  );
};
