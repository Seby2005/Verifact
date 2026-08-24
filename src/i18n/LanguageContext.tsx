'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { Locale, TranslationParams } from './language';
import { getTranslation } from './language';
import { ro, type Translations } from './dictionaries/ro';
import { en } from './dictionaries/en';
import { fr } from './dictionaries/fr';

interface LanguageContextType {
  locale: Locale;
  setLocale: (nextLocale: Locale) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const dictionaries: Record<Locale, Translations> = { ro, en, fr };

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
      if (val === 'ro' || val === 'en' || val === 'fr') return val;
    }

    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored === 'ro' || stored === 'en' || stored === 'fr') return stored;
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

/**
 * Pins a subtree to one fixed locale, ignoring the viewer's site language.
 *
 * A published report is a fixed artifact written in one language: its claim and
 * analysis are stored in that language and are not re-generated per viewer.
 * Rendering its chrome (verdict, audit trail, flag button) in the *viewer's*
 * language instead produces a report that is half English and half Romanian.
 * Wrapping the report subtree in this provider makes every `useLanguage()`
 * consumer below it resolve to the report's own language, so chrome and content
 * always match. `setLocale` is a no-op here — a report does not switch tongue.
 */
export const FixedLocaleProvider: React.FC<{ locale: Locale; children: React.ReactNode }> = ({
  locale,
  children,
}) => {
  const value = useMemo<LanguageContextType>(() => {
    const dict = dictionaries[locale] as unknown as Record<string, unknown>;
    return {
      locale,
      setLocale: () => {},
      t: (key: string, params?: TranslationParams) => getTranslation(dict, key, params),
    };
  }, [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
