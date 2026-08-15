'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button, Input, Modal, Callout } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import type { UsageLimitCheck } from '@/types/user';
import { useLanguage } from '@/i18n';
import { UsageCard } from '../UsageCard';
import { HistoryTable } from '../HistoryTable';
import { BookmarksList } from '../BookmarksList';
import { useBookmarks } from '../useBookmarks';
import styles from './DashboardView.module.css';

const DELETE_CONFIRM_PHRASE = 'ȘTERGE';

export interface DashboardViewProps {
  user: {
    id: string;
    email: string | null;
  };
  onSignOut?: () => void;
}

type TabType = 'history' | 'bookmarks';

export const DashboardView: React.FC<DashboardViewProps> = ({ user, onSignOut }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [usage, setUsage] = useState<UsageLimitCheck | null>(null);
  const [isUsageLoading, setIsUsageLoading] = useState<boolean>(true);

  const { count: bookmarkCount } = useBookmarks(user.id);

  // Delete account state
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [deleteStatus, setDeleteStatus] = useState<{ state: 'idle' | 'loading' | 'error'; message?: string }>({
    state: 'idle',
  });

  const fetchUsage = useCallback(async () => {
    setIsUsageLoading(true);
    try {
      const res = await fetch('/api/user/usage');
      if (res.ok) {
        const data = await res.json();
        setUsage(data?.usage ?? null);
      }
    } catch {
      setUsage(null);
    } finally {
      setIsUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    if (onSignOut) {
      onSignOut();
    } else {
      window.location.reload();
    }
  };

  const closeDeleteModal = () => {
    setIsDeleteOpen(false);
    setDeleteConfirmText('');
    setDeleteStatus({ state: 'idle' });
  };

  const handleDeleteAccount = async () => {
    setDeleteStatus({ state: 'loading' });
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || t('auth.deleteModal.errorGeneric'));
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.deleteModal.errorGeneric');
      setDeleteStatus({ state: 'error', message });
    }
  };

  const userInitial = (user.email ? user.email.charAt(0).toUpperCase() : 'U');

  return (
    <div className={styles.dashboard}>
      {/* Profile Header */}
      <section className={styles.profileHeader} aria-labelledby="user-profile-heading">
        <div className={styles.userSummary}>
          <div className={styles.avatar} aria-hidden="true">
            {userInitial}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userGreeting}>{t('dashboard.welcomeBack')}</span>
            <h2 id="user-profile-heading" className={styles.userEmail}>
              {user.email || 'Utilizator'}
            </h2>
          </div>
        </div>

        <div className={styles.userActions}>
          {usage?.unlimited && (
            <>
              <Link href="/admin/financiar" className={styles.adminFinancialBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                {t('dashboard.adminFinancialLink')}
              </Link>

              <Link href="/admin/oportunitati" className={styles.adminLinkBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                {t('dashboard.adminOpportunitiesLink')}
              </Link>
            </>
          )}

          <Button type="button" variant="secondary" size="sm" onClick={handleSignOut}>
            {t('auth.session.signOut')}
          </Button>
        </div>
      </section>

      {/* Admin Quick Section for Staff */}
      {usage?.unlimited && (
        <div className={styles.adminQuickSection}>
          <div className={styles.adminSectionHeader}>
            <span className={styles.adminSectionBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
              </svg>
              Panou Administrator
            </span>
            <span className={styles.adminSectionHint}>Acces exclusiv pentru echipa internă Verifact</span>
          </div>

          <div className={styles.adminCardsGrid}>
            <Link href="/admin/financiar" className={styles.adminActionCard}>
              <div className={styles.adminActionIconWrap} style={{ background: '#ecfdf5', color: '#059669' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <div className={styles.adminActionContent}>
                <div className={styles.adminActionTitle}>Dashboard Financiar & Costuri</div>
                <div className={styles.adminActionDesc}>Calcul cost per verificare, consum tokeni AI în timp real, costuri fixe și prag de rentabilitate.</div>
              </div>
              <span className={styles.adminActionArrow}>→</span>
            </Link>

            <Link href="/admin/oportunitati" className={styles.adminActionCard}>
              <div className={styles.adminActionIconWrap} style={{ background: '#fef3c7', color: '#d97706' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <div className={styles.adminActionContent}>
                <div className={styles.adminActionTitle}>Oportunități de Conținut</div>
                <div className={styles.adminActionDesc}>Tendințe și afirmații virale agregate automat pentru generare de conținut și fact-checking proactiv.</div>
              </div>
              <span className={styles.adminActionArrow}>→</span>
            </Link>
          </div>
        </div>
      )}

      {/* Top Grid: Usage & Stats */}
      <div className={styles.topGrid}>
        <UsageCard usage={usage} isLoading={isUsageLoading} />

        <div className={styles.statsColumn}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t('dashboard.stats.totalVerifications')}</span>
            <span className={styles.statValue}>
              {usage?.unlimited ? '∞' : (usage?.current ?? '0')}
            </span>
            <span className={styles.statSub}>{t('dashboard.stats.currentUsage')}</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>{t('dashboard.stats.bookmarked')}</span>
            <span className={styles.statValue}>{bookmarkCount}</span>
            <span className={styles.statSub}>{t('dashboard.bookmarks.title')}</span>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className={styles.mainTabsArea}>
        <div className={styles.tabNavigation} role="tablist" aria-label={t('dashboard.tabs.ariaLabel')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('history')}
          >
            {t('dashboard.tabs.history')}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'bookmarks'}
            className={`${styles.tabBtn} ${activeTab === 'bookmarks' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('bookmarks')}
          >
            {t('dashboard.tabs.bookmarks')}
            {bookmarkCount > 0 && <span className={styles.tabCount}>{bookmarkCount}</span>}
          </button>
        </div>

        {activeTab === 'history' ? (
          <HistoryTable userId={user.id} onVerificationDeleted={fetchUsage} />
        ) : (
          <BookmarksList userId={user.id} onGoToHistory={() => setActiveTab('history')} />
        )}
      </div>

      {/* Danger Zone: Account Deletion (GDPR) */}
      <section className={styles.dangerSection} aria-labelledby="danger-zone-heading">
        <div className={styles.dangerInfo}>
          <h3 id="danger-zone-heading" className={styles.dangerTitle}>
            {t('auth.session.deleteBtn')}
          </h3>
          <p className={styles.dangerLead}>
            {t('auth.session.dangerLead')}{' '}
            <Link href="/confidentialitate" style={{ color: 'inherit', textDecoration: 'underline' }}>
              {t('footer.sections.legal.privacy')}
            </Link>
            .
          </p>
        </div>

        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => setIsDeleteOpen(true)}
        >
          {t('auth.session.deleteBtn')}
        </Button>
      </section>

      {/* Delete Account Modal */}
      <Modal isOpen={isDeleteOpen} onClose={closeDeleteModal} title={t('auth.deleteModal.title')}>
        <p className={styles.modalLead}>{t('auth.deleteModal.lead')}</p>
        <Input
          label={t('auth.deleteModal.confirmLabel', { phrase: DELETE_CONFIRM_PHRASE })}
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          autoComplete="off"
          fullWidth
        />
        <div className={styles.modalActions}>
          <Button type="button" variant="ghost" size="md" onClick={closeDeleteModal}>
            {t('auth.deleteModal.cancelBtn')}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            disabled={deleteConfirmText.trim() !== DELETE_CONFIRM_PHRASE}
            isLoading={deleteStatus.state === 'loading'}
            onClick={handleDeleteAccount}
          >
            {t('auth.deleteModal.confirmBtn')}
          </Button>
        </div>
        {deleteStatus.state === 'error' && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Callout label={t('auth.deleteModal.errorLabel')} tone="plain">
              {deleteStatus.message}
            </Callout>
          </div>
        )}
      </Modal>
    </div>
  );
};
