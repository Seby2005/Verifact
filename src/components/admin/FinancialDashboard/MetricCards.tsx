'use client';

import React from 'react';
import type { FinancialMetrics } from '@/lib/financial/stats';
import styles from './FinancialDashboard.module.css';

interface MetricCardsProps {
  metrics: FinancialMetrics;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics }) => {
  const { variableCosts } = metrics;

  const formatCostEur = (val: number) => {
    if (val < 0.01 && val > 0) {
      return `€${val.toFixed(4)}`;
    }
    return `€${val.toFixed(2)}`;
  };

  const formatCostUsd = (val: number) => {
    if (val < 0.01 && val > 0) {
      return `$${val.toFixed(4)}`;
    }
    return `$${val.toFixed(2)}`;
  };

  return (
    <div className={styles.kpiGrid}>
      {/* 1. Cost Mediu per Verificare */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiHead}>
          <span className={styles.kpiLabel}>Cost Mediu / Verificare</span>
        </div>
        <div>
          <div className={styles.kpiValue}>
            {formatCostEur(variableCosts.averageCostPerVerificationEur)}
          </div>
          <div className={styles.kpiSubValue}>
            {formatCostUsd(variableCosts.averageCostPerVerificationUsd)} · ~{variableCosts.averageInputTokensPerVerification + variableCosts.averageOutputTokensPerVerification} tokeni
          </div>
        </div>
        <div className={styles.kpiFoot}>
          Medie calculată din {variableCosts.allTime.verificationsCount} verificări reale
        </div>
      </div>

      {/* 2. Cost Proiectat per 100 Verificări */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiHead}>
          <span className={styles.kpiLabel}>Cost per 100 Verificări</span>
        </div>
        <div>
          <div className={styles.kpiValue}>
            {formatCostEur(variableCosts.projectedCostPer100VerificationsEur)}
          </div>
          <div className={styles.kpiSubValue}>
            Proiecție bazată pe consumul mediu real
          </div>
        </div>
        <div className={styles.kpiFoot}>
          La 1.000 verificări = {formatCostEur(variableCosts.projectedCostPer100VerificationsEur * 10)}
        </div>
      </div>

      {/* 3. Cost Variabil Luna Curentă & Proiecție 30z */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiHead}>
          <span className={styles.kpiLabel}>Cost Variabil Lună</span>
        </div>
        <div>
          <div className={styles.kpiValue}>
            {formatCostEur(variableCosts.thisMonth.costEur)}
          </div>
          <div className={styles.kpiSubValue}>
            Proiecție 30z: {formatCostEur(variableCosts.monthlyProjection7DaysEur || variableCosts.monthlyProjection30DaysEur)}
          </div>
        </div>
        <div className={styles.kpiFoot}>
          Ritm estimat: ~{variableCosts.projectedMonthlyVerifications7d || variableCosts.projectedMonthlyVerifications30d} verificări/lună
        </div>
      </div>

      {/* 4. Volum Verificări (Azi / 7z / 30z) */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiHead}>
          <span className={styles.kpiLabel}>Volum Verificări</span>
        </div>
        <div>
          <div className={styles.kpiValue}>
            {variableCosts.allTime.verificationsCount}
          </div>
          <div className={styles.kpiSubValue}>
            Azi: {variableCosts.today.verificationsCount} · 7 zile: {variableCosts.thisWeek.verificationsCount} · 30z: {variableCosts.thisMonth.verificationsCount}
          </div>
        </div>
        <div className={styles.kpiFoot}>
          Tokeni procesați total: {variableCosts.allTime.inputTokens + variableCosts.allTime.outputTokens}
        </div>
      </div>
    </div>
  );
};
