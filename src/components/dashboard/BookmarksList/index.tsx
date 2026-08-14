'use client';

import React from 'react';
import Link from 'next/link';
import { Button, useToast, VerdictLabel, type VerdictKind } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { useBookmarks } from '../useBookmarks';
import styles from './BookmarksList.module.css';

export interface BookmarksListProps {
  userId?: string;
  onGoToHistory?: () => void;
}

function formatDate(iso?: string, locale: string = 'ro'): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ro-RO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return iso;
  }
}

export const BookmarksList: React.FC<BookmarksListProps> = ({ userId, onGoToHistory }) => {
  const { locale, t } = useLanguage();
  const { notify } = useToast();
  const { bookmarks, removeBookmark, count } = useBookmarks(userId);

  const handleCopyLink = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/rapoarte/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      notify(t('dashboard.history.actions.linkCopied'), 'success');
    } catch {
      notify('Link: ' + url, 'success');
    }
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeBookmark(id);
    notify(t('dashboard.bookmarks.removedToast'), 'success');
  };

  if (bookmarks.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h3 className={styles.emptyTitle}>{t('dashboard.bookmarks.emptyTitle')}</h3>
          <p className={styles.emptyLead}>{t('dashboard.bookmarks.emptyLead')}</p>
          {onGoToHistory && (
            <div className={styles.emptyAction}>
              <Button type="button" variant="secondary" size="sm" onClick={onGoToHistory}>
                {t('dashboard.bookmarks.goToHistoryBtn')} →
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h3 className={styles.title}>
            {t('dashboard.bookmarks.title')}
            <span className={styles.countBadge}>{t('dashboard.bookmarks.countLabel', { count })}</span>
          </h3>
          <p className={styles.lead}>{t('dashboard.bookmarks.lead')}</p>
        </div>
      </div>

      <div className={styles.grid}>
        {bookmarks.map((item) => {
          const verdictKind: VerdictKind = (item.verdict as VerdictKind) || 'unclear';

          return (
            <article key={item.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.cardDate}>{formatDate(item.created_at, locale)}</span>
                <VerdictLabel
                  kind={verdictKind}
                  score={typeof item.score === 'number' ? item.score : undefined}
                  layout="inline"
                />
              </div>

              <Link href={`/rapoarte/${item.id}`} className={styles.cardClaim}>
                {item.input_text || '—'}
              </Link>

              <div className={styles.cardFooter}>
                <Link href={`/rapoarte/${item.id}`} className={styles.viewBtn}>
                  {t('dashboard.history.actions.viewReport')} →
                </Link>

                <div className={styles.actionButtons}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={(e) => handleCopyLink(item.id, e)}
                    title={t('dashboard.history.actions.copyLink')}
                    aria-label={t('dashboard.history.actions.copyLink')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                    onClick={(e) => handleRemove(item.id, e)}
                    title={t('dashboard.bookmarks.removeFromBookmarks')}
                    aria-label={t('dashboard.bookmarks.removeFromBookmarks')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
