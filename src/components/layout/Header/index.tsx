'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/i18n';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '../ThemeToggle';
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
        <Link href="/" className={styles.wordmark}>
          Verifact
        </Link>

        <nav className={styles.nav} aria-label={t('header.nav.ariaNav')}>
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
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
};
