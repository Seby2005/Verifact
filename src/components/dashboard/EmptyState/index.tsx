'use client';

import React from 'react';
import Link from 'next/link';
import styles from './EmptyState.module.css';

export function EmptyState() {
  return (
    <div className={styles.container}>
      <svg
        className={styles.svgIcon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <circle cx="11.5" cy="14.5" r="2.5" />
        <path d="M13.25 16.25L15 18" />
      </svg>

      <div className={styles.title}>Nu ai făcut nicio verificare încă.</div>

      <Link href="/#verify-section" className={styles.ctaBtn}>
        Verifică prima ta știre →
      </Link>
    </div>
  );
}
