'use client';

import React from 'react';
import { VerificationHistoryRow, VerificationItem } from '../VerificationHistoryRow';
import { EmptyState } from '../EmptyState';
import styles from './VerificationHistory.module.css';

interface VerificationHistoryProps {
  items: VerificationItem[];
  isLoading: boolean;
  activeVerdictFilter: string;
  onFilterChange: (verdict: string) => void;
  onToggleVisibility: (id: string, currentPublic: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export function VerificationHistory({
  items,
  isLoading,
  activeVerdictFilter,
  onFilterChange,
  onToggleVisibility,
  onDelete,
  page,
  totalPages,
  onPageChange,
}: VerificationHistoryProps) {
  const filterOptions = [
    { value: '', label: 'Toate' },
    { value: 'true', label: '✅ Adevărat' },
    { value: 'partial', label: '⚠️ Parțial' },
    { value: 'false', label: '❌ Fals' },
    { value: 'unclear', label: '🟠 Neclar' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Verificările tale recente</h2>

        <div className={styles.filterGroup}>
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.filterBtn} ${
                activeVerdictFilter === opt.value ? styles.filterActive : ''
              }`}
              onClick={() => onFilterChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.tableHeader}>
        <div>Afirmație</div>
        <div>Verdict</div>
        <div>Data</div>
        <div>Vizibilitate</div>
        <div>Acțiuni</div>
      </div>

      {isLoading ? (
        Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className={styles.skeletonRow} />
        ))
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        items.map((item) => (
          <VerificationHistoryRow
            key={item.id}
            item={item}
            onToggleVisibility={onToggleVisibility}
            onDelete={onDelete}
          />
        ))
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            ← Înapoi
          </button>
          <span>
            Pagina {page} din {totalPages}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Înainte →
          </button>
        </div>
      )}
    </div>
  );
}
