'use client';

import React from 'react';
import Link from 'next/link';
import type { UserTier } from '@/types/user';
import styles from './UsageCard.module.css';

interface UsageCardProps {
  tier: UserTier;
  current: number;
  limit: number;
  resetDate: string;
}

export function UsageCard({ tier, current, limit, resetDate }: UsageCardProps) {
  const percentage = Math.min(100, Math.round((current / limit) * 100));

  let barClass = styles.blueBar;
  if (percentage >= 86) {
    barClass = `${styles.redBar} ${percentage >= 100 ? styles.pulse : ''}`;
  } else if (percentage >= 61) {
    barClass = styles.yellowBar;
  }

  const formatResetDate = (isoDate: string): string => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>📊 Utilizare luna aceasta</span>
        <span className={styles.tierBadge}>{tier}</span>
      </div>

      <div className={styles.progressContainer}>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressBar} ${barClass}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className={styles.statsRow}>
          <span>
            <strong className={styles.countText}>{current}</strong> / {limit} verificări
          </span>
          <span>Se resetează: {formatResetDate(resetDate)}</span>
        </div>

        {percentage >= 100 ? (
          <div className={styles.warningText}>
            ⚠️ Ai atins limita lunară. Upgrade pentru a continua.
          </div>
        ) : percentage >= 86 ? (
          <div className={styles.warningText}>⚠️ Aproape de limită</div>
        ) : null}
      </div>

      <Link
        href="/pricing"
        className={`${styles.upgradeBtn} ${percentage >= 100 ? styles.upgradeBtnRed : ''}`}
      >
        🚀 Upgrade la Pro — 200 verificări/lună
      </Link>
    </div>
  );
}
