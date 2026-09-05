'use client';

// App Router global error boundary. Reports uncaught React render errors to
// GlitchTip via the Sentry SDK (a no-op when no DSN is configured). Recommended
// by @sentry/nextjs — without it, render errors in the root layout aren't
// captured. Kept minimal; the app's normal error/not-found UI handles the rest.
//
// This boundary renders its own <html> and sits ABOVE the LanguageProvider, so
// it cannot use useLanguage(). It reads the persisted locale cookie directly and
// carries its own three-string map — the one place a UI string is duplicated,
// justified by keeping the crash path free of app context.
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

const MESSAGES: Record<'ro' | 'en' | 'fr', string> = {
  ro: 'A apărut o eroare neașteptată. Reîncarcă pagina.',
  en: 'An unexpected error occurred. Reload the page.',
  fr: 'Une erreur inattendue s’est produite. Rechargez la page.',
};

function detectLocale(): 'ro' | 'en' | 'fr' {
  if (typeof document === 'undefined') return 'ro';
  const match = document.cookie.split('; ').find((row) => row.startsWith('NEXT_LOCALE='));
  const value = match?.split('=')[1];
  return value === 'en' || value === 'fr' ? value : 'ro';
}

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const locale = detectLocale();

  return (
    <html lang={locale} translate="no">
      <body>
        <h2>{MESSAGES[locale]}</h2>
      </body>
    </html>
  );
}
