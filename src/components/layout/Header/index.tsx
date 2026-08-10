'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/i18n';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '../ThemeToggle';
import { Logo } from '../Logo';
import styles from './Header.module.css';

const NAV_ITEMS = [
  { href: '/despre-dezinformare', key: 'header.nav.disinformation' },
  { href: '/transparenta', key: 'header.nav.transparency' },
  { href: '/preturi', key: 'header.nav.pricing' },
];

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLanguage();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  // On phones the nav collapses into a dropdown behind a menu button so the
  // sticky bar stays a single compact row instead of a tall stacked block.
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  // Close the mobile menu whenever navigation lands on a new route.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const toggleLanguage = () => {
    setLocale(locale === 'ro' ? 'en' : 'ro');
  };

  const displayAccountText = userEmail
    ? userEmail.length > 22
      ? `${userEmail.slice(0, 20)}...`
      : userEmail
    : t('header.nav.account');

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.wordmark} aria-label="Verifact — acasă">
          <Logo />
        </Link>

        <div className={styles.actions}>
          <nav
            id="site-nav"
            className={[styles.nav, menuOpen ? styles.navOpen : ''].filter(Boolean).join(' ')}
            aria-label={t('header.nav.ariaNav')}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[styles.navLink, isActive ? styles.navLinkActive : '']
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {t(item.key)}
                </Link>
              );
            })}
            <Link
              href="/cont"
              className={[styles.accountLink, pathname === '/cont' ? styles.navLinkActive : '']
                .filter(Boolean)
                .join(' ')}
              title={userEmail ?? undefined}
              onClick={() => setMenuOpen(false)}
            >
              {displayAccountText}
            </Link>
            <button
              type="button"
              className={styles.langToggle}
              onClick={toggleLanguage}
              aria-label={locale === 'ro' ? 'Switch to English' : 'Schimbă în română'}
            >
              {locale === 'ro' ? 'RO | EN' : 'EN | RO'}
            </button>
          </nav>

          <ThemeToggle />

          <button
            type="button"
            className={styles.menuBtn}
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            aria-label={menuOpen ? t('header.nav.menuClose') : t('header.nav.menuOpen')}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              {menuOpen ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
