'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { Locale, TranslationParams } from './language';
import { getTranslation } from './language';
import { ro, type Translations } from './dictionaries/ro';
import { en } from './dictionaries/en';

interface LanguageContextType {
  locale: Locale;
  setLocale: (nextLocale: Locale) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const dictionaries: Record<Locale, Translations> = { ro, en };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const COOKIE_NAME = 'NEXT_LOCALE';
const LOCAL_STORAGE_KEY = 'verifact_locale';

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'ro';

  try {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${COOKIE_NAME}=`));
    if (match) {
      const val = match.split('=')[1];
      if (val === 'ro' || val === 'en') return val;
    }

    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored === 'ro' || stored === 'en') return stored;
  } catch {
    // Ignore storage / cookie errors
  }

  return 'ro';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('ro');

  useEffect(() => {
    const initial = getInitialLocale();
    setLocaleState(initial);
    document.documentElement.lang = initial;
  }, []);

  const setLocale = (nextLocale: Locale) => {
    setLocaleState(nextLocale);

    if (typeof window !== 'undefined') {
      try {
        document.cookie = `${COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
        localStorage.setItem(LOCAL_STORAGE_KEY, nextLocale);
        document.documentElement.lang = nextLocale;
      } catch {
        // Ignore storage write errors
      }
    }
  };

  const t = useMemo(() => {
    const dict = dictionaries[locale] as unknown as Record<string, unknown>;
    return (key: string, params?: TranslationParams): string => {
      return getTranslation(dict, key, params);
    };
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
