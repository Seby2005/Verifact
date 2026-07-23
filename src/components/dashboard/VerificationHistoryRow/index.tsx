'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './VerificationHistoryRow.module.css';

export interface VerificationItem {
  id: string;
  input_text: string;
  verdict: 'true' | 'false' | 'partial' | 'unclear';
  score: number;
  is_public: boolean;
  created_at: string;
}

interface VerificationHistoryRowProps {
  item: VerificationItem;
  onToggleVisibility: (id: string, currentPublic: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function VerificationHistoryRow({
  item,
  onToggleVisibility,
  onDelete,
}: VerificationHistoryRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const truncatedText =
    item.input_text.length > 60
      ? `${item.input_text.slice(0, 60)}...`
      : item.input_text;

  const formatRelativeDate = (isoDate: string): string => {
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 3600 * 24)
      );

      if (diffDays === 0) return 'Astăzi';
      if (diffDays === 1) return 'Ieri';
      if (diffDays <= 7) return `Acum ${diffDays} zile`;

      return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
    } catch {
      return isoDate;
    }
  };

  const getVerdictBadge = () => {
    switch (item.verdict) {
      case 'true':
        return <span className={`${styles.verdictBadge} ${styles.badgeTrue}`}>✅ Adevărat {item.score}%</span>;
      case 'partial':
        return <span className={`${styles.verdictBadge} ${styles.badgePartial}`}>⚠️ Parțial {item.score}%</span>;
      case 'unclear':
        return <span className={`${styles.verdictBadge} ${styles.badgeUnclear}`}>🟠 Neclar {item.score}%</span>;
      case 'false':
      default:
        return <span className={`${styles.verdictBadge} ${styles.badgeFalse}`}>❌ Fals {item.score}%</span>;
    }
  };

  const handleVisibilityClick = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      await onToggleVisibility(item.id, item.is_public);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDeleteClick = async () => {
    if (isDeleting) return;
    if (window.confirm('Sigur dorești să ștergi această verificare?')) {
      setIsDeleting(true);
      try {
        await onDelete(item.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className={styles.row}>
      <div className={styles.claimCell} title={item.input_text}>
        &quot;{truncatedText}&quot;
      </div>

      <div>{getVerdictBadge()}</div>

      <div className={styles.dateCell}>{formatRelativeDate(item.created_at)}</div>

      <div>
        <button
          type="button"
          className={styles.visibilityBtn}
          onClick={handleVisibilityClick}
          disabled={isToggling}
          title="Apasă pentru a schimba vizibilitatea"
        >
          {item.is_public ? '🌐 Public' : '🔒 Privat'}
        </button>
      </div>

      <div className={styles.actionsCell}>
        <Link
          href={`/reports/${item.id}`}
          className={styles.iconBtn}
          title="Vezi raportul"
        >
          →
        </Link>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.deleteBtn}`}
          onClick={handleDeleteClick}
          disabled={isDeleting}
          title="Șterge verificarea"
        >
          🗑
        </button>
      </div>
    </div>
  );
}
