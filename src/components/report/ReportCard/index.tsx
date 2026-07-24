'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './ReportCard.module.css';

export interface ReportCardProps {
  id: string;
  verdict: 'true' | 'false' | 'partial' | 'unclear' | string;
  score: number;
  inputText: string;
  createdAt: string;
}

const VERDICT_LABELS: Record<string, string> = {
  true: 'Adevărat',
  false: 'Fals',
  partial: 'Parțial Adevărat',
  unclear: 'Neclar',
};

const VERDICT_CLASSES: Record<string, string> = {
  true: styles.verdictTrue,
  false: styles.verdictFalse,
  partial: styles.verdictPartial,
  unclear: styles.verdictUnclear,
};

const VERDICT_COLORS: Record<string, string> = {
  true: '#16a34a',
  false: '#dc2626',
  partial: '#d97706',
  unclear: '#6c757d',
};

export const ReportCard: React.FC<ReportCardProps> = ({
  id,
  verdict,
  score,
  inputText,
  createdAt,
}) => {
  const [copied, setCopied] = useState(false);

  const formattedDate = new Date(createdAt).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/reports/${id}`;

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback if clipboard fails
      }
    }
  };

  const truncatedText =
    inputText.length > 120 ? `${inputText.slice(0, 120)}...` : inputText;

  const verdictLabel = VERDICT_LABELS[verdict] || 'Necunoscut';
  const verdictClass = VERDICT_CLASSES[verdict] || styles.verdictUnclear;
  const scoreColor = VERDICT_COLORS[verdict] || '#2563eb';

  return (
    <article className={styles.card} data-testid="report-card">
      <div className={styles.header}>
        <span
          className={`${styles.verdictBadge} ${verdictClass}`}
          data-testid="verdict-badge"
        >
          {verdictLabel}
        </span>
        <time className={styles.date} dateTime={createdAt}>
          {formattedDate}
        </time>
      </div>

      <p className={styles.statement} title={inputText}>
        &ldquo;{truncatedText}&rdquo;
      </p>

      <div className={styles.scoreContainer}>
        <div className={styles.scoreBar}>
          <div
            className={styles.scoreFill}
            style={{
              width: `${Math.min(100, Math.max(0, score))}%`,
              backgroundColor: scoreColor,
            }}
          />
        </div>
        <span className={styles.scoreText}>{score}%</span>
      </div>

      <div className={styles.footer}>
        <Link
          href={`/reports/${id}`}
          className={styles.viewLink}
          data-testid="view-report-link"
        >
          Vezi raport &rarr;
        </Link>
        <button
          type="button"
          onClick={handleShare}
          className={`${styles.shareButton} ${copied ? styles.copiedToast : ''}`}
          aria-label="Partajează raportul"
          data-testid="share-report-button"
        >
          {copied ? 'Link copiat!' : '🔗 Partajează'}
        </button>
      </div>
    </article>
  );
};
