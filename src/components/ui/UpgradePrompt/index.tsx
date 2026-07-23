'use client';

import React from 'react';
import Link from 'next/link';
import styles from './UpgradePrompt.module.css';

interface UpgradePromptProps {
  variant?: 'inline' | 'modal';
  resetDate?: string;
  limitCount?: number;
  onCloseModal?: () => void;
}

export function UpgradePrompt({
  variant = 'inline',
  resetDate = '1 septembrie',
  limitCount = 10,
  onCloseModal,
}: UpgradePromptProps) {
  if (variant === 'modal') {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <svg
            className={styles.rocketIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-3.05 11a22.35 22.35 0 0 1-3.95 2z" />
          </svg>

          <h2 className={styles.modalTitle}>Ai descoperit puterea verificărilor AI!</h2>
          <p className={styles.modalText}>
            Treci la Pro și verifică fără limite. De la doar 7.99€ / lună.
          </p>

          <ul className={styles.benefitsList}>
            <li className={styles.benefitItem}>
              <span>✓</span> 200 verificări pe lună
            </li>
            <li className={styles.benefitItem}>
              <span>✓</span> Raport detaliat cu export PDF
            </li>
            <li className={styles.benefitItem}>
              <span>✓</span> Prioritate la procesare & suport
            </li>
          </ul>

          <Link href="/pricing" className={styles.modalCta}>
            Upgrade la Pro — €7.99/lună
          </Link>

          {onCloseModal && (
            <button type="button" className={styles.closeLink} onClick={onCloseModal}>
              Nu acum, rămân pe Free
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.inlineBanner}>
      <div className={styles.bannerHeader}>
        <span className={styles.bannerIcon}>⚠️</span>
        <div className={styles.bannerTitle}>
          Ai atins limita de {limitCount} verificări pentru această lună.
          Se resetează pe {resetDate}.
        </div>
      </div>

      <div className={styles.bannerActions}>
        <Link href="/pricing" className={styles.btnPrimary}>
          🚀 Upgrade la Pro — €7.99/lună
        </Link>
        <Link href="/pricing" className={styles.btnSecondary}>
          Află mai mult
        </Link>
      </div>
    </div>
  );
}
