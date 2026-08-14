'use client';

import React, { useState, useCallback } from 'react';
import type { FinancialMetrics } from '@/lib/financial/stats';
import { MetricCards } from './MetricCards';
import { BreakEvenCard } from './BreakEvenCard';
import { FixedCostsTable } from './FixedCostsTable';
import { ApiPricingTable } from './ApiPricingTable';
import { RecentCostsTable } from './RecentCostsTable';
import styles from './FinancialDashboard.module.css';

interface FinancialDashboardProps {
  initialMetrics: FinancialMetrics;
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  initialMetrics,
}) => {
  const [metrics, setMetrics] = useState<FinancialMetrics>(initialMetrics);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refreshData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch('/api/admin/financial/summary');
      if (!res.ok) {
        const data = await res.json();
        setRefreshError(data.error || 'Eroare la reîncărcarea datelor.');
        return;
      }
      const data = await res.json();
      if (data.metrics) {
        setMetrics(data.metrics);
        setLastRefreshedAt(new Date());
      }
    } catch {
      if (!silent) setRefreshError('Eroare de rețea la actualizarea datelor.');
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Real-time automatic polling every 10 seconds
  React.useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      void refreshData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refreshData]);

  return (
    <div className={styles.container}>
      {/* Top Bar with Admin Badge & Refresh */}
      <div className={styles.topBar}>
        <div className={styles.topBarInfo}>
          <span className={styles.adminBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
            Zonă Securizată Admin
          </span>

          <button
            type="button"
            className={`${styles.liveBadge} ${!autoRefreshEnabled ? styles.liveBadgePaused : ''}`}
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            title={autoRefreshEnabled ? 'Apasă pentru a pune pe pauză sincronizarea automată' : 'Apasă pentru a activa sincronizarea automată'}
          >
            <span className={`${styles.liveDot} ${!autoRefreshEnabled ? styles.liveDotPaused : ''}`} />
            <span>{autoRefreshEnabled ? 'Live Auto-Sync (10s)' : 'Sincronizare pe pauză'}</span>
          </button>

          <span className={styles.lastUpdated}>
            Actualizat la {lastRefreshedAt.toLocaleTimeString('ro-RO')}
          </span>
        </div>

        <button
          type="button"
          disabled={isRefreshing}
          className={styles.refreshButton}
          onClick={() => refreshData(false)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            }}
          >
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          {isRefreshing ? 'Se actualizează...' : 'Reîmprospătează Acum'}
        </button>
      </div>

      {refreshError && (
        <div className={`${styles.statusMessage} ${styles.statusMessageError}`}>
          {refreshError}
        </div>
      )}

      {/* 1. KPI Metric Cards */}
      <MetricCards metrics={metrics} />

      {/* 2. Break-Even & MRR */}
      <BreakEvenCard metrics={metrics} />

      {/* 3. Fixed Costs CRUD */}
      <FixedCostsTable
        initialItems={metrics.fixedCosts.items}
        onCostsChanged={refreshData}
      />

      {/* 4. API Pricing Config */}
      <ApiPricingTable
        initialPricing={metrics.apiPricing}
        onPricingChanged={refreshData}
      />

      {/* 5. Recent Verifications Token Log */}
      <RecentCostsTable recentVerifications={metrics.recentVerifications} />
    </div>
  );
};
