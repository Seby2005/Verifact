'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './AnimatedStats.module.css';

interface StatConfig {
  target: number;
  suffix: string;
  label: string;
}

const stats: StatConfig[] = [
  { target: 1247, suffix: '+', label: 'Verificări astăzi' },
  { target: 94, suffix: '%', label: 'Acuratețe medie' },
  { target: 3, suffix: '', label: 'Straturi de verificare' },
];

export const AnimatedStats: React.FC = () => {
  const [counts, setCounts] = useState<number[]>([1247, 94, 3]);
  const [hasAnimated, setHasAnimated] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only animate on client after hydration
    const node = containerRef.current;
    if (!node || hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateCounters();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasAnimated]);

  const animateCounters = (): void => {
    const duration = 1500; // 1.5s
    const startTime = performance.now();

    const update = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // ease-out quad
      const easedProgress = 1 - (1 - progress) * (1 - progress);

      const nextCounts = stats.map((s) => Math.floor(easedProgress * s.target));
      setCounts(nextCounts);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setCounts(stats.map((s) => s.target));
      }
    };

    requestAnimationFrame(update);
  };

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.grid}>
        {stats.map((stat, idx) => (
          <div key={stat.label} className={styles.statItem}>
            <span className={styles.number}>
              {counts[idx].toLocaleString('ro-RO')}
              {stat.suffix}
            </span>
            <span className={styles.label}>{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
