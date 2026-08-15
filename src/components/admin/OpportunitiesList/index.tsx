'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ContentOpportunity, OpportunityStatus } from '@/types/database';
import styles from './OpportunitiesList.module.css';

interface OpportunitiesListProps {
  initialOpportunities: ContentOpportunity[];
}

interface ToastMessage {
  id: string;
  text: string;
  opportunity?: ContentOpportunity;
}

function formatDateGroup(dateString: string): string {
  try {
    const d = new Date(dateString);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    const formatted = d.toLocaleDateString('ro-RO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    if (isToday) return `Astăzi — ${formatted}`;
    if (isYesterday) return `Ieri — ${formatted}`;
    return formatted;
  } catch {
    return dateString;
  }
}

function formatTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const OpportunitiesList: React.FC<OpportunitiesListProps> = ({
  initialOpportunities,
}) => {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<ContentOpportunity[]>(initialOpportunities);
  const [currentStatus, setCurrentStatus] = useState<OpportunityStatus>('new');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'Google Trends' | 'Google News'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [fetchingTab, setFetchingTab] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Switch status tab (fetch opportunities with that status)
  const handleTabChange = async (status: OpportunityStatus) => {
    setCurrentStatus(status);
    setFetchingTab(true);
    try {
      const res = await fetch(`/api/admin/oportunitati?status=${status}`);
      if (res.ok) {
        const data = (await res.json()) as { opportunities: ContentOpportunity[] };
        setOpportunities(data.opportunities ?? []);
      }
    } catch {
      // Fallback to local filter if fetch fails
    } finally {
      setFetchingTab(false);
    }
  };

  // Manual on-demand aggregation from Google Trends & Google News
  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/oportunitati', { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as {
          success: boolean;
          opportunities: ContentOpportunity[];
          result?: { inserted: number; totalFetched: number };
        };
        setOpportunities(data.opportunities ?? []);
        setCurrentStatus('new');
        setToast({
          id: 'sync-success',
          text: `S-au sincronizat ${data.result?.totalFetched ?? 0} subiecte trending (${data.result?.inserted ?? 0} noi adăugate).`,
        });
      } else {
        setToast({
          id: 'sync-error',
          text: 'A apărut o eroare la agregarea subiectelor trending.',
        });
      }
    } catch {
      setToast({
        id: 'sync-error',
        text: 'Eroare de conexiune la server.',
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setToast((prev) => (prev?.id.startsWith('sync-') ? null : prev));
      }, 5000);
    }
  };

  // Filter and search
  const filtered = useMemo(() => {
    return opportunities.filter((item) => {
      if (sourceFilter !== 'all' && item.source_name !== sourceFilter) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(query);
      }
      return true;
    });
  }, [opportunities, sourceFilter, searchQuery]);

  // Group by day (fetched_at date)
  const groupedByDay = useMemo(() => {
    const groups: Array<{ dayKey: string; dayLabel: string; items: ContentOpportunity[] }> = [];
    const map = new Map<string, ContentOpportunity[]>();

    for (const item of filtered) {
      const dayKey = item.fetched_at ? item.fetched_at.slice(0, 10) : 'unknown';
      const existing = map.get(dayKey);
      if (existing) {
        existing.push(item);
      } else {
        const list = [item];
        map.set(dayKey, list);
        groups.push({
          dayKey,
          dayLabel: formatDateGroup(item.fetched_at),
          items: list,
        });
      }
    }

    return groups;
  }, [filtered]);

  const updateOpportunityStatus = async (
    opportunity: ContentOpportunity,
    newStatus: OpportunityStatus
  ): Promise<boolean> => {
    setLoadingIds((prev) => ({ ...prev, [opportunity.id]: true }));

    try {
      const res = await fetch(`/api/admin/oportunitati/${opportunity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        return false;
      }

      // Optimistically remove from current status view if it changed
      if (newStatus !== currentStatus) {
        setOpportunities((prev) => prev.filter((o) => o.id !== opportunity.id));
      }

      return true;
    } catch {
      return false;
    } finally {
      setLoadingIds((prev) => ({ ...prev, [opportunity.id]: false }));
    }
  };

  const handleVerifyNow = async (opportunity: ContentOpportunity) => {
    // 1. Mark as reviewed in database
    await updateOpportunityStatus(opportunity, 'reviewed');

    // 2. Navigate to homepage with prefilled claim query parameter
    const encodedClaim = encodeURIComponent(opportunity.title);
    router.push(`/?claim=${encodedClaim}`);
  };

  const handleDismiss = async (opportunity: ContentOpportunity) => {
    const success = await updateOpportunityStatus(opportunity, 'dismissed');
    if (success) {
      setToast({
        id: opportunity.id,
        text: `Subiectul "${opportunity.title.slice(0, 40)}..." a fost ignorat.`,
        opportunity,
      });

      // Auto clear toast after 6s
      setTimeout(() => {
        setToast((prev) => (prev?.id === opportunity.id ? null : prev));
      }, 6000);
    }
  };

  const handleUndoDismiss = async () => {
    if (!toast || !toast.opportunity) return;
    const item = toast.opportunity;
    setToast(null);

    await updateOpportunityStatus(item, 'new');
    if (currentStatus === 'new') {
      setOpportunities((prev) => [item, ...prev]);
    }
  };

  return (
    <div className={styles.container}>
      {/* Controls: status tabs, search, source filter & manual sync */}
      <div className={styles.controlsBar}>
        <nav className={styles.statusTabs} aria-label="Filtrare status oportunități">
          <button
            type="button"
            className={`${styles.statusTab} ${currentStatus === 'new' ? styles.statusTabActive : ''}`}
            onClick={() => handleTabChange('new')}
          >
            Noi
            {currentStatus === 'new' && (
              <span className={styles.tabBadge}>{opportunities.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.statusTab} ${currentStatus === 'reviewed' ? styles.statusTabActive : ''}`}
            onClick={() => handleTabChange('reviewed')}
          >
            Verificate
          </button>
          <button
            type="button"
            className={`${styles.statusTab} ${currentStatus === 'dismissed' ? styles.statusTabActive : ''}`}
            onClick={() => handleTabChange('dismissed')}
          >
            Ignorate
          </button>
        </nav>

        <div className={styles.filterGroup}>
          <button
            type="button"
            className={styles.syncBtn}
            onClick={handleSyncNow}
            disabled={isSyncing}
            aria-label="Actualizează oportunitățile acum din Google Trends"
          >
            {isSyncing ? 'Se agregă...' : '🔄 Actualizează acum'}
          </button>

          <input
            type="search"
            className={styles.searchInput}
            placeholder="Caută subiecte..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Caută în oportunități"
          />

          <select
            className={styles.sourceSelect}
            value={sourceFilter}
            onChange={(e) =>
              setSourceFilter(e.target.value as 'all' | 'Google Trends' | 'Google News')
            }
            aria-label="Filtrează după sursă"
          >
            <option value="all">Toate sursele</option>
            <option value="Google Trends">Google Trends</option>
            <option value="Google News">Google News</option>
          </select>
        </div>
      </div>

      {/* Content list */}
      {fetchingTab || isSyncing ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            {isSyncing
              ? 'Se agregă cele mai recente căutări din Google Trends & Google News...'
              : 'Se încarcă oportunitățile...'}
          </p>
        </div>
      ) : groupedByDay.length === 0 ? (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>Nicio oportunitate găsită</h2>
          <p className={styles.emptyText}>
            {searchQuery || sourceFilter !== 'all'
              ? 'Niciun subiect nu corespunde filtrelor selectate.'
              : currentStatus === 'new'
                ? 'Nu există oportunități noi neprocesate în baza de date. Apasă butonul de mai jos pentru a agrega subiectele trending chiar acum.'
                : `Nu există oportunități marcate ca ${currentStatus === 'reviewed' ? 'verificate' : 'ignorate'}.`}
          </p>
          {currentStatus === 'new' && !searchQuery && sourceFilter === 'all' && (
            <button
              type="button"
              className={styles.verifyBtn}
              onClick={handleSyncNow}
              disabled={isSyncing}
            >
              {isSyncing ? 'Se agregă...' : '⚡ Agregă acum subiectele de azi'}
            </button>
          )}
        </div>
      ) : (
        groupedByDay.map((group) => (
          <section key={group.dayKey} className={styles.dayGroup}>
            <header className={styles.dayHeading}>
              <h2 className={styles.dayTitle}>{group.dayLabel}</h2>
              <span className={styles.dayCount}>{group.items.length} subiecte</span>
            </header>

            <ul className={styles.cardsList}>
              {group.items.map((item) => {
                const isLoading = Boolean(loadingIds[item.id]);

                return (
                  <li key={item.id} className={styles.card}>
                    <div className={styles.cardMain}>
                      <div className={styles.metaRow}>
                        {typeof item.trend_rank === 'number' && (
                          <span className={styles.rankBadge}>#{item.trend_rank}</span>
                        )}

                        <span
                          className={`${styles.sourceBadge} ${
                            item.source_name === 'Google Trends'
                              ? styles.sourceGoogleTrends
                              : styles.sourceGoogleNews
                          }`}
                        >
                          {item.source_name}
                        </span>

                        <time className={styles.timeTag} dateTime={item.fetched_at}>
                          {formatTime(item.fetched_at)}
                        </time>
                      </div>

                      <h3 className={styles.cardTitle}>{item.title}</h3>

                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.sourceLink}
                          aria-label={`Deschide sursa originală pentru ${item.title}`}
                        >
                          Vezi sursa ↗
                        </a>
                      )}
                    </div>

                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={styles.verifyBtn}
                        onClick={() => handleVerifyNow(item)}
                        disabled={isLoading}
                        aria-label={`Verifică acum afirmația: ${item.title}`}
                      >
                        {isLoading ? 'Se procesează...' : 'Verifică acum'}
                      </button>

                      {currentStatus === 'new' && (
                        <button
                          type="button"
                          className={styles.dismissBtn}
                          onClick={() => handleDismiss(item)}
                          disabled={isLoading}
                          aria-label={`Ignoră afirmația: ${item.title}`}
                        >
                          Ignoră
                        </button>
                      )}

                      {currentStatus !== 'new' && (
                        <button
                          type="button"
                          className={styles.dismissBtn}
                          onClick={() => updateOpportunityStatus(item, 'new')}
                          disabled={isLoading}
                          aria-label={`Re-activează ca nouă: ${item.title}`}
                        >
                          Restabilește
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {/* Floating toast notification for Undo action & sync feedback */}
      {toast && (
        <div className={styles.toastNotice} role="status" aria-live="polite">
          <span>{toast.text}</span>
          {toast.opportunity && (
            <button type="button" className={styles.toastUndoBtn} onClick={handleUndoDismiss}>
              Anulează
            </button>
          )}
        </div>
      )}
    </div>
  );
};
