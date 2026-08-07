// Server-side error tracking, loaded by src/instrumentation.ts on the Node
// runtime. Points at a self-hosted, Sentry-compatible GlitchTip instance via
// SENTRY_DSN (or NEXT_PUBLIC_SENTRY_DSN). No DSN -> init is skipped entirely,
// so this is inert until you configure GlitchTip.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // GlitchTip bills/limits on event volume; keep tracing modest by default.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // GlitchTip implements the error ingest API, not every Sentry SDK feature —
    // leave the extras off so payloads stay within what it accepts.
    debug: false,
  });
}
