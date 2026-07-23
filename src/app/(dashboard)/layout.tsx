'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isDashboardActive = pathname === '/dashboard';
  const isSettingsActive = pathname === '/settings';

  const tier = user?.tier || 'free';

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div>
          <Link href="/" className={styles.brand}>
            <div className={styles.logoIcon}>AI</div>
            <span>FactCheck AI</span>
          </Link>

          <nav className={styles.nav}>
            <Link
              href="/dashboard"
              className={`${styles.navItem} ${isDashboardActive ? styles.active : ''}`}
            >
              📊 <span>Dashboard</span>
            </Link>
            <Link
              href="/dashboard#history"
              className={styles.navItem}
            >
              🕒 <span>Istoric</span>
            </Link>
            <Link
              href="/settings"
              className={`${styles.navItem} ${isSettingsActive ? styles.active : ''}`}
            >
              ⚙️ <span>Setări</span>
            </Link>
            <Link
              href="/pricing"
              className={styles.navItem}
            >
              ⭐ <span>Upgrade</span>
            </Link>
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.tierCard}>
            <span className={styles.tierLabel}>Abonament</span>
            <span className={styles.tierBadge}>{tier}</span>
          </div>
        </div>
      </aside>

      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
