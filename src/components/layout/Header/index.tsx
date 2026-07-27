'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/i18n';
import { ThemeToggle } from '../ThemeToggle';
import styles from './Header.module.css';

const NAV_ITEMS = [
  { href: '/rapoarte', key: 'header.nav.reports' },
  { href: '/transparenta', key: 'header.nav.transparency' },
  { href: '/preturi', key: 'header.nav.pricing' },
];

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLanguage();

  const toggleLanguage = () => {
    setLocale(locale === 'ro' ? 'en' : 'ro');
  };

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
          <Link href="/cont" className={styles.accountLink}>
            {t('header.nav.account')}
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
