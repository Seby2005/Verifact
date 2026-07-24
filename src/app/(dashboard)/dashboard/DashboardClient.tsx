'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { UsageCard } from '@/components/dashboard/UsageCard';
import { VerificationHistory } from '@/components/dashboard/VerificationHistory';
import { VerificationItem } from '@/components/dashboard/VerificationHistoryRow';
import styles from './Dashboard.module.css';

export function DashboardClient() {
  const { isAuthenticated, isLoading: isAuthLoading } = useRequireAuth('/login');
  const { user } = useAuth();

  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [isVerificationsLoading, setIsVerificationsLoading] = useState(true);
  const [verdictFilter, setVerdictFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchVerifications = useCallback(async () => {
    setIsVerificationsLoading(true);
    try {
      const url = new URL('/api/user/verifications', window.location.origin);
      url.searchParams.set('page', String(page));
      if (verdictFilter) {
        url.searchParams.set('verdict', verdictFilter);
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setVerifications(data.verifications || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching verifications:', err);
    } finally {
      setIsVerificationsLoading(false);
    }
  }, [page, verdictFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchVerifications();
    }
  }, [isAuthenticated, fetchVerifications]);

  const handleFilterChange = (verdict: string) => {
    setVerdictFilter(verdict);
    setPage(1);
  };

  const handleToggleVisibility = async (id: string, currentPublic: boolean) => {
    try {
      const res = await fetch(`/api/user/verifications/${id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !currentPublic }),
      });

      if (res.ok) {
        setVerifications((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, is_public: !currentPublic } : item
          )
        );
      }
    } catch (err) {
      console.error('Error toggling visibility:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/user/verifications/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setVerifications((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('Error deleting verification:', err);
    }
  };

  if (isAuthLoading || !isAuthenticated || !user) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBox}>
          Se încarcă dashboard-ul...
        </div>
      </div>
    );
  }

  const userInitials = user.username
    ? user.username.slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <aside className={styles.leftColumn}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>{userInitials}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>
                {user.username || user.email.split('@')[0]}
              </div>
              <div className={styles.userEmail}>{user.email}</div>
            </div>
          </div>

          <UsageCard
            tier={user.tier}
            current={user.verificationsCount}
            limit={user.verificationsLimit}
            resetDate={user.verificationsResetDate}
          />

          <div className={styles.quickLinksCard}>
            <div className={styles.quickLinksTitle}>Navigare rapidă</div>
            <Link href="/settings" className={styles.quickLink}>
              ⚙️ Setări cont <span>→</span>
            </Link>
            <Link href="/pricing" className={styles.quickLink}>
              🚀 Planuri & Upgrade <span>→</span>
            </Link>
            <Link href="/transparency" className={styles.quickLink}>
              📖 Transparență algoritm <span>→</span>
            </Link>
          </div>
        </aside>

        <main className={styles.rightColumn}>
          <VerificationHistory
            items={verifications}
            isLoading={isVerificationsLoading}
            activeVerdictFilter={verdictFilter}
            onFilterChange={handleFilterChange}
            onToggleVisibility={handleToggleVisibility}
            onDelete={handleDelete}
            page={page}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </main>
      </div>
    </div>
  );
}
