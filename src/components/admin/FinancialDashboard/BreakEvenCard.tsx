'use client';

import React from 'react';
import type { FinancialMetrics } from '@/lib/financial/stats';
import styles from './FinancialDashboard.module.css';

interface BreakEvenCardProps {
  metrics: FinancialMetrics;
}

export const BreakEvenCard: React.FC<BreakEvenCardProps> = ({ metrics }) => {
  const { subscribers, fixedCosts, variableCosts, breakEven } = metrics;

  const activeVariableProjection =
    variableCosts.monthlyProjection7DaysEur > 0
      ? variableCosts.monthlyProjection7DaysEur
      : variableCosts.monthlyProjection30DaysEur;

  const isProfitable = subscribers.totalActivePremium >= breakEven.breakEvenSubscribersNeeded && breakEven.breakEvenSubscribersNeeded > 0;

  return (
    <div className={styles.sectionBlock}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Venituri Recurente (MRR) & Prag Rentabilitate (Break-Even)</h2>
          <p className={styles.sectionSubtitle}>
            Comparație între veniturile din abonamente plătite și totalul cheltuielilor (fixe + variabile).
          </p>
        </div>
      </div>

      <div className={styles.breakEvenGrid}>
        {/* Card 1: Venituri & Abonați */}
        <div className={styles.breakEvenCard}>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Abonați Pro Activi</span>
            <span className={styles.statValue}>{subscribers.proCount} utilizatori</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Abonați Business Activi</span>
            <span className={styles.statValue}>{subscribers.businessCount} conturi</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Total Abonați Plătitori</span>
            <span className={styles.statValue}>{subscribers.totalActivePremium} abonați</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Preț Standard Pro</span>
            <span className={styles.statValue}>€{subscribers.proPricePerMonthEur.toFixed(2)} / lună</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>MRR Curent (Venit Lunar)</span>
            <span className={`${styles.statValue} ${styles.statValueLarge}`}>
              €{subscribers.currentMrrEur.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Card 2: Break-Even Calculation */}
        <div className={`${styles.breakEvenCard} ${styles.breakEvenHighlight}`}>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Total Costuri Fixe Lunare</span>
            <span className={styles.statValue}>€{fixedCosts.totalMonthlyEur.toFixed(2)}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Costuri Variabile Proiectate (30z)</span>
            <span className={styles.statValue}>€{activeVariableProjection.toFixed(2)}</span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Total Cheltuieli Lunare Estimate</span>
            <span className={`${styles.statValue} ${styles.statValueLarge}`}>
              €{breakEven.totalMonthlyCostEur.toFixed(2)}
            </span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Prag Rentabilitate (Abonați Pro Necesari)</span>
            <span className={`${styles.statValue} ${styles.statValueLarge}`}>
              {breakEven.breakEvenSubscribersNeeded} abonați
            </span>
          </div>

          {/* Progress Bar */}
          <div className={styles.progressBarContainer}>
            <div className={styles.progressLabel}>
              <span>Progres prag rentabilitate:</span>
              <span>
                {subscribers.totalActivePremium} / {breakEven.breakEvenSubscribersNeeded} ({breakEven.targetProgressPercentage}%)
              </span>
            </div>
            <div className={styles.progressBarTrack}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${breakEven.targetProgressPercentage}%` }}
              />
            </div>
          </div>

          <div
            className={`${styles.breakEvenBadge} ${
              isProfitable ? styles.badgeSuccess : styles.badgeWarning
            }`}
          >
            {isProfitable ? (
              <span>✓ Felicitări! Proiectul este profitabil (acoperă 100% din cheltuieli).</span>
            ) : (
              <span>
                Mai ai nevoie de <strong>{breakEven.subscribersGap} abonați Pro</strong> (€{(breakEven.subscribersGap * subscribers.proPricePerMonthEur).toFixed(2)} MRR adițional) pentru a atinge pragul de rentabilitate.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
