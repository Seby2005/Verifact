// Browser-side error tracking. The Sentry Next.js plugin injects this into the
// client bundle at build time. Uses the public DSN and is DSN-gated, so with no
// GlitchTip configured it adds an init call that does nothing.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // No Session Replay: it adds bundle weight and streams to an ingest path
    // GlitchTip doesn't fully implement. Errors + basic tracing only.
    debug: false,
  });
}
