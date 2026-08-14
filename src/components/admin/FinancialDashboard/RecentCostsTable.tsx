'use client';

import React from 'react';
import type { FinancialMetrics } from '@/lib/financial/stats';
import styles from './FinancialDashboard.module.css';

interface RecentCostsTableProps {
  recentVerifications: FinancialMetrics['recentVerifications'];
}

export const RecentCostsTable: React.FC<RecentCostsTableProps> = ({
  recentVerifications,
}) => {
  return (
    <div className={styles.sectionBlock}>
      <div className={styles.cardBox}>
        <div className={styles.cardBoxHeader}>
          <div>
            <h3 className={styles.sectionTitle}>Jurnal Costuri Recente (Ultimele Verificări)</h3>
            <p className={styles.sectionSubtitle}>
              Date reale de intrare/ieșire tokeni și costuri calculate per verificare.
            </p>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data / Ora</th>
                <th>Afirmație Verificată</th>
                <th>Verdict</th>
                <th>Tokeni In</th>
                <th>Tokeni Out</th>
                <th>Total Tokeni</th>
                <th>Cost Estimat ($)</th>
                <th>Cost Estimat (€)</th>
              </tr>
            </thead>
            <tbody>
              {recentVerifications.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    Nu există verificări înregistrate recent în baza de date.
                  </td>
                </tr>
              ) : (
                recentVerifications.map((item) => (
                  <tr key={item.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#767064' }}>
                      {new Date(item.createdAt).toLocaleString('ro-RO', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.inputText}
                    </td>
                    <td>
                      <span
                        className={styles.categoryTag}
                        style={{
                          backgroundColor:
                            item.verdict === 'true'
                              ? '#dcfce7'
                              : item.verdict === 'false'
                              ? '#fee2e2'
                              : '#fef3c7',
                          color:
                            item.verdict === 'true'
                              ? '#15803d'
                              : item.verdict === 'false'
                              ? '#dc2626'
                              : '#b45309',
                        }}
                      >
                        {item.verdict || '—'}
                      </span>
                    </td>
                    <td>{item.inputTokens.toLocaleString('ro-RO')}</td>
                    <td>{item.outputTokens.toLocaleString('ro-RO')}</td>
                    <td>
                      <strong>{(item.inputTokens + item.outputTokens).toLocaleString('ro-RO')}</strong>
                    </td>
                    <td>${item.costUsd < 0.0001 && item.costUsd > 0 ? item.costUsd.toFixed(6) : item.costUsd.toFixed(4)}</td>
                    <td>
                      <strong>€{item.costEur < 0.0001 && item.costEur > 0 ? item.costEur.toFixed(6) : item.costEur.toFixed(4)}</strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
