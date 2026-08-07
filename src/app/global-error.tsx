'use client';

// App Router global error boundary. Reports uncaught React render errors to
// GlitchTip via the Sentry SDK (a no-op when no DSN is configured). Recommended
// by @sentry/nextjs — without it, render errors in the root layout aren't
// captured. Kept minimal; the app's normal error/not-found UI handles the rest.
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ro">
      <body>
        <h2>A apărut o eroare neașteptată. Reîncarcă pagina.</h2>
      </body>
    </html>
  );
}
