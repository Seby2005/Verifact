'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import ro from './locales/ro.json';
import en from './locales/en.json';

export type Locale = 'ro' | 'en';

type Dictionaries = typeof ro;

const dictionaries: Record<Locale, Dictionaries> = {
  ro,
  en,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (keyPath: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('ro');

  useEffect(() => {
    const saved = localStorage.getItem('verifact_locale') as Locale;
    if (saved && (saved === 'ro' || saved === 'en')) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('verifact_locale', newLocale);
  };

  const t = (keyPath: string): string => {
    const keys = keyPath.split('.');
    let current: unknown = dictionaries[locale];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return keyPath;
      }
    }

    return typeof current === 'string' ? current : keyPath;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: 'ro',
      setLocale: () => {},
      t: (keyPath: string) => {
        const keys = keyPath.split('.');
        let current: unknown = ro;
        for (const key of keys) {
          if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
            current = (current as Record<string, unknown>)[key];
          } else {
            return keyPath;
          }
        }
        return typeof current === 'string' ? current : keyPath;
      },
    };
  }
  return context;
}
