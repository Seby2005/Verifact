'use client';

import React from 'react';
import Link from 'next/link';
import type { UsageLimitCheck, UserTier } from '@/types/user';
import { useLanguage } from '@/i18n';
import styles from './UsageCard.module.css';

export interface UsageCardProps {
  usage: UsageLimitCheck | null;
  isLoading?: boolean;
}

function formatResetDate(dateString?: string, locale: string = 'ro'): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export const UsageCard: React.FC<UsageCardProps> = ({ usage, isLoading = false }) => {
  const { locale, t } = useLanguage();

  if (isLoading || !usage) {
    return (
      <section className={styles.card} aria-labelledby="usage-card-title">
        <div className={styles.skeleton}>
          <div className={styles.skeletonLine} style={{ width: '40%' }} />
          <div className={styles.skeletonLine} style={{ width: '80%', height: '24px' }} />
          <div className={styles.skeletonLine} style={{ width: '100%', height: '8px' }} />
          <div className={styles.skeletonLine} style={{ width: '60%' }} />
        </div>
      </section>
    );
  }

  const isUnlimited = Boolean(usage.unlimited);
  const tier = usage.tier;
  const current = usage.current ?? 0;
  const limit = usage.limit ?? 0;

  const percentageUsed = isUnlimited
    ? 0
    : usage.percentageUsed ?? (limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0);

  const statusTone: 'normal' | 'warning' | 'danger' = isUnlimited
    ? 'normal'
    : percentageUsed >= 100
      ? 'danger'
      : percentageUsed >= 80
        ? 'warning'
        : 'normal';

  const tierClassMap: Record<UserTier, string> = {
    free: styles.tierFree,
    pro: styles.tierPro,
    business: styles.tierBusiness,
  };

  const badgeClass = isUnlimited ? styles.tierAdmin : tierClassMap[tier] || styles.tierFree;
  const tierName = isUnlimited
    ? t('dashboard.usageCard.unlimited')
    : (t(`auth.tiers.${tier}`) || tier.toUpperCase());

  const formattedResetDate = formatResetDate(usage.resetDate, locale);

  const usageText = isUnlimited
    ? t('dashboard.usageCard.unlimited')
    : tier === 'free'
      ? t('dashboard.usageCard.usedValue', { current, limit })
      : t('dashboard.usageCard.usedProValue', { current });

  const showWarning = !isUnlimited && statusTone === 'warning';
  const showDanger = !isUnlimited && statusTone === 'danger';

  return (
    <section className={styles.card} aria-labelledby="usage-card-title">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.eyebrow}>{t('dashboard.usageCard.planLabel')}</span>
          <h2 id="usage-card-title" className={styles.title}>
            {t('dashboard.usageCard.title')}
          </h2>
        </div>
        <span className={`${styles.badge} ${badgeClass}`}>{tierName}</span>
      </div>

      <div className={styles.progressContainer}>
        <div className={styles.progressHeader}>
          <span className={styles.usageCount}>{usageText}</span>
          {!isUnlimited && (
            <span className={styles.percentageLabel}>
              {t('dashboard.usageCard.percentage', { percent: percentageUsed })}
            </span>
          )}
        </div>

        {!isUnlimited && (
          <div
            className={styles.progressBarTrack}
            role="progressbar"
            aria-valuenow={percentageUsed}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('dashboard.usageCard.title')}
          >
            <div
              className={styles.progressBarFill}
              data-status={statusTone}
              style={{ width: `${Math.max(4, Math.min(100, percentageUsed))}%` }}
            />
          </div>
        )}
      </div>

      {showWarning && (
        <div className={styles.warningBox} role="alert">
          {t('dashboard.usageCard.nearLimitWarning')}
        </div>
      )}

      {showDanger && (
        <div className={styles.dangerBox} role="alert">
          {t('dashboard.usageCard.atLimitWarning')}
        </div>
      )}

      <div className={styles.metaRow}>
        {!isUnlimited && usage.resetDate ? (
          <span className={styles.resetDate}>
            {t('dashboard.usageCard.resetDate', { date: formattedResetDate })}
          </span>
        ) : (
          <span className={styles.resetDate}>{t('dashboard.stats.statusActive')}</span>
        )}

        <div className={styles.actions}>
          {tier === 'free' && (
            <Link href="/preturi" className={styles.upgradeButton}>
              {t('dashboard.usageCard.upgradeBtn')} →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};
