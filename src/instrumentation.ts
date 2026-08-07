// Next.js instrumentation hook — runs once per server runtime at startup and
// loads the matching Sentry/GlitchTip config. The client config is injected
// separately by the Sentry build plugin (see sentry.client.config.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
