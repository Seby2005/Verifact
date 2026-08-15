'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { Button, Modal, useToast, VerdictLabel, type VerdictKind } from '@/components/ui';
import { useLanguage } from '@/i18n';
import { useBookmarks, type BookmarkedVerification } from '../useBookmarks';
import styles from './HistoryTable.module.css';

export interface UserVerificationItem {
  id: string;
  input_text: string;
  input_type?: string;
  verdict: 'true' | 'partial' | 'unclear' | 'false' | null;
  score: number | null;
  is_public: boolean;
  created_at: string;
}

export interface HistoryTableProps {
  userId?: string;
  onVerificationDeleted?: () => void;
}

type VerdictFilter = 'all' | 'true' | 'partial' | 'unclear' | 'false';

function formatDate(iso?: string, locale: string = 'ro'): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const langTag = locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : 'ro-RO';
    return new Intl.DateTimeFormat(langTag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return iso;
  }
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ userId, onVerificationDeleted }) => {
  const { locale, t } = useLanguage();
  const { notify } = useToast();
  const { isBookmarked, toggleBookmark } = useBookmarks(userId);

  const [items, setItems] = useState<UserVerificationItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [itemToDelete, setItemToDelete] = useState<UserVerificationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  // Debounce search query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchVerifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (verdictFilter !== 'all') {
        params.set('verdict', verdictFilter);
      }
      if (debouncedSearch) {
        params.set('q', debouncedSearch);
      }

      const res = await fetch(`/api/user/verifications?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setItems(data.verifications || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [page, verdictFilter, debouncedSearch]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const handleFilterChange = (filter: VerdictFilter) => {
    startTransition(() => {
      setVerdictFilter(filter);
      setPage(1);
    });
  };

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

  const handleToggleBookmark = (item: UserVerificationItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const bookmarkedItem: BookmarkedVerification = {
      id: item.id,
      input_text: item.input_text,
      verdict: item.verdict,
      score: item.score,
      created_at: item.created_at,
      is_public: item.is_public,
    };
    toggleBookmark(bookmarkedItem);
    const nowSaved = !isBookmarked(item.id);
    notify(
      nowSaved
        ? t('dashboard.history.actions.bookmark')
        : t('dashboard.history.actions.removeBookmark'),
      'success'
    );
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/user/verifications/${itemToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(t('dashboard.history.deleteModal.errorGeneric'));
      }
      notify(t('dashboard.history.deleteModal.successToast'), 'success');
      setItemToDelete(null);
      fetchVerifications();
      if (onVerificationDeleted) onVerificationDeleted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('dashboard.history.deleteModal.errorGeneric');
      notify(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filterTabs: ReadonlyArray<{ id: VerdictFilter; label: string }> = [
    { id: 'all', label: t('dashboard.history.filterAll') },
    { id: 'true', label: t('dashboard.history.filterTrue') },
    { id: 'partial', label: t('dashboard.history.filterPartial') },
    { id: 'unclear', label: t('dashboard.history.filterUnclear') },
    { id: 'false', label: t('dashboard.history.filterFalse') },
  ];

  return (
    <div className={styles.container}>
      {/* Toolbar: Search + Verdict Filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg
            className={styles.searchIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('dashboard.history.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('dashboard.history.searchPlaceholder')}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className={styles.filters} role="group" aria-label={t('dashboard.history.filterAriaLabel')}>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.filterChip} ${verdictFilter === tab.id ? styles.filterChipActive : ''}`}
              onClick={() => handleFilterChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content: Loading Skeleton / Empty State / Table + Cards */}
      {isLoading ? (
        <div className={styles.tableCard} style={{ padding: 'var(--space-4)' }}>
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          {searchQuery || verdictFilter !== 'all' ? (
            <>
              <h3 className={styles.emptyTitle}>{t('dashboard.history.empty.noResultsTitle')}</h3>
              <p className={styles.emptyLead}>{t('dashboard.history.empty.noResultsLead')}</p>
              <div className={styles.emptyAction}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setVerdictFilter('all');
                  }}
                >
                  {t('dashboard.history.empty.resetFiltersBtn')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className={styles.emptyTitle}>{t('dashboard.history.empty.noVerificationsTitle')}</h3>
              <p className={styles.emptyLead}>{t('dashboard.history.empty.noVerificationsLead')}</p>
              <div className={styles.emptyAction}>
                <Link href="/" className={styles.pageBtn} style={{ textDecoration: 'none', background: 'var(--color-ink)', color: 'var(--color-paper)' }}>
                  {t('dashboard.history.empty.verifyBtn')} →
                </Link>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className={styles.tableCard}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>{t('dashboard.history.columns.claim')}</th>
                    <th className={styles.th}>{t('dashboard.history.columns.verdict')}</th>
                    <th className={styles.th}>{t('dashboard.history.columns.date')}</th>
                    <th className={styles.th}>{t('dashboard.history.columns.status')}</th>
                    <th className={styles.th} style={{ textAlign: 'right' }}>
                      {t('dashboard.history.columns.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const bookmarked = isBookmarked(item.id);
                    const verdictKind: VerdictKind = (item.verdict as VerdictKind) || 'unclear';

                    return (
                      <tr key={item.id} className={styles.tr}>
                        <td className={`${styles.td} ${styles.claimCell}`}>
                          <Link
                            href={`/rapoarte/${item.id}`}
                            className={styles.claimText}
                            style={{ color: 'inherit', textDecoration: 'none' }}
                          >
                            {item.input_text || '—'}
                          </Link>
                        </td>
                        <td className={styles.td}>
                          <VerdictLabel
                            kind={verdictKind}
                            score={typeof item.score === 'number' ? item.score : undefined}
                            layout="inline"
                          />
                        </td>
                        <td className={`${styles.td} ${styles.dateCell}`}>
                          {formatDate(item.created_at, locale)}
                        </td>
                        <td className={styles.td}>
                          <span
                            className={`${styles.statusBadge} ${
                              item.is_public ? styles.statusPublic : styles.statusPrivate
                            }`}
                          >
                            {item.is_public
                              ? t('dashboard.history.statusPublic')
                              : t('dashboard.history.statusPrivate')}
                          </span>
                        </td>
                        <td className={`${styles.td} ${styles.actionsCell}`} style={{ textAlign: 'right' }}>
                          <div className={styles.actionButtons} style={{ justifyContent: 'flex-end' }}>
                            <Link
                              href={`/rapoarte/${item.id}`}
                              className={styles.iconButton}
                              title={t('dashboard.history.actions.viewReport')}
                              aria-label={t('dashboard.history.actions.viewReport')}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </Link>

                            <button
                              type="button"
                              className={styles.iconButton}
                              onClick={(e) => handleCopyLink(item.id, e)}
                              title={t('dashboard.history.actions.copyLink')}
                              aria-label={t('dashboard.history.actions.copyLink')}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              className={`${styles.iconButton} ${bookmarked ? styles.iconButtonBookmarked : ''}`}
                              onClick={(e) => handleToggleBookmark(item, e)}
                              title={
                                bookmarked
                                  ? t('dashboard.history.actions.removeBookmark')
                                  : t('dashboard.history.actions.bookmark')
                              }
                              aria-label={
                                bookmarked
                                  ? t('dashboard.history.actions.removeBookmark')
                                  : t('dashboard.history.actions.bookmark')
                              }
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill={bookmarked ? 'currentColor' : 'none'}
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                              onClick={() => setItemToDelete(item)}
                              title={t('dashboard.history.actions.delete')}
                              aria-label={t('dashboard.history.actions.delete')}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className={styles.mobileCards}>
            {items.map((item) => {
              const bookmarked = isBookmarked(item.id);
              const verdictKind: VerdictKind = (item.verdict as VerdictKind) || 'unclear';

              return (
                <div key={item.id} className={styles.mobileCard}>
                  <div className={styles.mobileCardHeader}>
                    <span className={styles.mobileCardDate}>{formatDate(item.created_at, locale)}</span>
                    <span
                      className={`${styles.statusBadge} ${
                        item.is_public ? styles.statusPublic : styles.statusPrivate
                      }`}
                    >
                      {item.is_public
                        ? t('dashboard.history.statusPublic')
                        : t('dashboard.history.statusPrivate')}
                    </span>
                  </div>

                  <Link
                    href={`/rapoarte/${item.id}`}
                    className={styles.mobileCardClaim}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {item.input_text || '—'}
                  </Link>

                  <div>
                    <VerdictLabel
                      kind={verdictKind}
                      score={typeof item.score === 'number' ? item.score : undefined}
                      layout="inline"
                    />
                  </div>

                  <div className={styles.mobileCardFooter}>
                    <Link
                      href={`/rapoarte/${item.id}`}
                      className={styles.pageBtn}
                      style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    >
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
                        className={`${styles.iconButton} ${bookmarked ? styles.iconButtonBookmarked : ''}`}
                        onClick={(e) => handleToggleBookmark(item, e)}
                        title={
                          bookmarked
                            ? t('dashboard.history.actions.removeBookmark')
                            : t('dashboard.history.actions.bookmark')
                        }
                        aria-label={
                          bookmarked
                            ? t('dashboard.history.actions.removeBookmark')
                            : t('dashboard.history.actions.bookmark')
                        }
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill={bookmarked ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                        onClick={() => setItemToDelete(item)}
                        title={t('dashboard.history.actions.delete')}
                        aria-label={t('dashboard.history.actions.delete')}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <span className={styles.paginationInfo}>
                {t('dashboard.history.pagination.pageInfo', { page, totalPages })} ·{' '}
                {t('dashboard.history.pagination.totalCount', { total })}
              </span>

              <div className={styles.paginationControls}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← {t('dashboard.history.pagination.prev')}
                </button>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t('dashboard.history.pagination.next')} →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        title={t('dashboard.history.deleteModal.title')}
      >
        <p className={styles.modalLead}>
          {t('dashboard.history.deleteModal.lead')}
        </p>

        {itemToDelete && (
          <blockquote
            style={{
              margin: '0 0 var(--space-4) 0',
              padding: 'var(--space-3)',
              background: 'var(--color-paper)',
              borderLeft: '3px solid var(--color-line-strong)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'var(--font-size-body-sm)',
              color: 'var(--color-ink)',
            }}
          >
            "{itemToDelete.input_text.slice(0, 160)}
            {itemToDelete.input_text.length > 160 ? '...' : ''}"
          </blockquote>
        )}

        <div className={styles.modalActions}>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => setItemToDelete(null)}
            disabled={isDeleting}
          >
            {t('dashboard.history.deleteModal.cancelBtn')}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            isLoading={isDeleting}
            onClick={handleDeleteConfirm}
          >
            {t('dashboard.history.deleteModal.confirmBtn')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
