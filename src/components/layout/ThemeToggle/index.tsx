'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n';
import { THEME_KEY, type Theme } from './theme-script';
import styles from './ThemeToggle.module.css';

/**
 * Switches between the light and dark grounds and remembers the choice.
 *
 * The button renders the same markup on the server and on first paint; the
 * actual theme is read from the attribute the head script already set, in an
 * effect, so there is no hydration mismatch. Until then it is inert rather
 * than guessing, which keeps the label honest.
 *
 * A visitor who has not chosen follows the system preference, including when
 * that changes mid-session. Choosing once ends that — an explicit choice
 * should not be overridden by the OS.
 */
export const ThemeToggle: React.FC = () => {
  const { t } = useLanguage();
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'dark' : 'light');

    // Keep following the system while no explicit choice is stored.
    if (!window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(THEME_KEY);
      } catch {
        stored = null;
      }
      if (stored === 'light' || stored === 'dark') return;
      const next: Theme = event.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      setTheme(next);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // A rejected write only costs persistence, not the switch itself.
    }
  };

  const isDark = theme === 'dark';
  const label = isDark ? t('header.theme.toLight') : t('header.theme.toDark');

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={label}
      title={label}
      disabled={theme === null}
    >
      {isDark ? (
        // Sun — switches back to the light ground.
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.6v2.2M12 19.2v2.2M4.3 4.3l1.6 1.6M18.1 18.1l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.3 19.7l1.6-1.6M18.1 5.9l1.6-1.6" />
        </svg>
      ) : (
        // Moon — switches to the dark ground.
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.5 14.3A8.6 8.6 0 1 1 9.7 3.5a6.9 6.9 0 0 0 10.8 10.8Z" />
        </svg>
      )}
    </button>
  );
};
