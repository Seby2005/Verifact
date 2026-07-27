'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './Reveal.module.css';

export interface RevealProps {
  children: React.ReactNode;
  /** Stagger, in ms, applied when several siblings reveal together. */
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'p';
}

/**
 * Fades and lifts its children into place the first time they scroll into
 * view. Content is always present in the DOM — only the transition is gated,
 * and it is skipped entirely under prefers-reduced-motion.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}) => {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(true);
      return;
    }
    const el = ref.current;
    // Content must never depend on the observer to become visible: if it is
    // missing, show everything rather than leaving the page blank.
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement & HTMLLIElement & HTMLParagraphElement>}
      className={[styles.reveal, shown ? styles.in : '', className].filter(Boolean).join(' ')}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
};
