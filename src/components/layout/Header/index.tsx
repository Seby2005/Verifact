'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage, type Locale } from '@/i18n';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '../ThemeToggle';
import { Logo } from '../Logo';
import styles from './Header.module.css';

const NAV_ITEMS = [
  { href: '/', key: 'header.nav.home' },
  { href: '/rapoarte', key: 'header.nav.reports' },
  { href: '/despre-dezinformare', key: 'header.nav.disinformation' },
  { href: '/preturi', key: 'header.nav.pricing' },
];

const LANGUAGES: ReadonlyArray<{ code: Locale; label: string; flag: string; nativeName: string }> = [
  { code: 'ro', label: 'RO', flag: '🇷🇴', nativeName: 'Română' },
  { code: 'en', label: 'EN', flag: '🇬🇧', nativeName: 'English' },
  { code: 'fr', label: 'FR', flag: '🇫🇷', nativeName: 'Français' },
];

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLanguage();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  // On phones the nav collapses into a dropdown behind a menu button so the
  // sticky bar stays a single compact row instead of a tall stacked block.
  const [menuOpen, setMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

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

  // Close the mobile menu and language menu whenever navigation lands on a new route.
  useEffect(() => {
    setMenuOpen(false);
    setLangMenuOpen(false);
  }, [pathname]);

  // Outside click & Escape key listeners for language dropdown
  useEffect(() => {
    if (!langMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLangMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [langMenuOpen]);

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  const displayAccountText = userEmail
    ? userEmail.length > 22
      ? `${userEmail.slice(0, 20)}...`
      : userEmail
    : t('header.nav.account');

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.wordmark} aria-label={t('header.nav.homeAria')}>
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
            
            <div className={styles.langDropdownWrapper} ref={langMenuRef}>
              <button
                type="button"
                className={styles.langToggle}
                onClick={() => setLangMenuOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={langMenuOpen}
                aria-label={`${t('header.nav.toggleLangAria')} (${locale.toUpperCase()})`}
              >
                <span className={styles.langFlag}>{currentLang.flag}</span>
                <span className={styles.langCode}>{currentLang.label}</span>
                <svg
                  className={[styles.chevron, langMenuOpen ? styles.chevronOpen : ''].filter(Boolean).join(' ')}
                  viewBox="0 0 16 16"
                  width="12"
                  height="12"
                  aria-hidden="true"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {langMenuOpen && (
                <ul className={styles.langMenu} role="menu" aria-label={t('header.nav.langOptions')}>
                  {LANGUAGES.map((l) => {
                    const isSelected = locale === l.code;
                    return (
                      <li key={l.code} role="none">
                        <button
                          type="button"
                          role="menuitem"
                          className={[styles.langMenuItem, isSelected ? styles.langMenuItemActive : '']
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => {
                            setLocale(l.code);
                            setLangMenuOpen(false);
                          }}
                          aria-current={isSelected ? 'true' : undefined}
                        >
                          <span className={styles.menuFlag}>{l.flag}</span>
                          <span className={styles.menuName}>{l.nativeName}</span>
                          <span className={styles.menuCode}>{l.label}</span>
                          {isSelected && (
                            <svg className={styles.checkIcon} viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                              <path
                                d="M3.5 8.5l3 3 6-6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
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
