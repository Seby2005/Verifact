'use client';

import React from 'react';
import { useI18n, Locale } from '@/i18n';
import styles from './LanguageSwitcher.module.css';

export interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'buttons';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  className = '',
}) => {
  const { locale, setLocale } = useI18n();

  if (variant === 'buttons') {
    return (
      <div className={`${styles.buttonGroup} ${className}`} role="radiogroup" aria-label="Selectează limba">
        <button
          type="button"
          role="radio"
          aria-checked={locale === 'ro'}
          className={`${styles.langBtn} ${locale === 'ro' ? styles.active : ''}`}
          onClick={() => setLocale('ro')}
        >
          🇷🇴 Română
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={locale === 'en'}
          className={`${styles.langBtn} ${locale === 'en' ? styles.active : ''}`}
          onClick={() => setLocale('en')}
        >
          🇬🇧 English
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.dropdownWrapper} ${className}`}>
      <select
        aria-label="Selectează limba (Language)"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className={styles.select}
      >
        <option value="ro">🇷🇴 RO</option>
        <option value="en">🇬🇧 EN</option>
      </select>
    </div>
  );
};
