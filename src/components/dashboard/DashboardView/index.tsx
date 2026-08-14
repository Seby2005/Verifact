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
            <Link href="/admin/oportunitati" className={styles.adminLinkBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              {t('dashboard.adminLink')}
            </Link>
          )}

          <Button type="button" variant="secondary" size="sm" onClick={handleSignOut}>
            {t('auth.session.signOut')}
          </Button>
        </div>
      </section>

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
