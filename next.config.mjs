import { withSentryConfig } from '@sentry/nextjs';

/**
 * The browser only ever talks directly to this app's own origin and to
 * Supabase (REST + Auth, from the browser client in src/lib/supabase/client.ts).
 * Google Fact Check / Custom Search / Vision, Gemini, NewsAPI, and Tavily are
 * all called server-side only (src/lib/verification/*, src/lib/ai/gemini.ts,
 * src/lib/ocr/vision.ts run in Next.js API routes, never in the browser), so
 * they have no reason to appear in a browser-enforced Content-Security-Policy
 * — CSP governs what the page can be tricked into connecting to, and adding
 * server-only hosts here would widen that without protecting anything.
 */
const supabaseOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : '';
  } catch {
    return '';
  }
})();

// Self-hosted tools the BROWSER talks to directly need their origin in the CSP,
// or the browser silently blocks the request. Each is derived from env and
// collapses to '' (filtered out) when the tool isn't configured — so a stock
// setup keeps exactly the old, tight policy and only widens when you opt in.
const originOf = (value) => {
  try {
    return value ? new URL(value).origin : '';
  } catch {
    return '';
  }
};
// GlitchTip DSN host: the Sentry browser SDK POSTs events here. new URL().origin
// drops the public key in the DSN userinfo, leaving just scheme + host.
const glitchtipOrigin = originOf(process.env.NEXT_PUBLIC_SENTRY_DSN);
// Formbricks: loads its UMD script and calls its ingest API from the browser.
const formbricksOrigin = originOf(process.env.NEXT_PUBLIC_FORMBRICKS_APP_URL);

const connectSrc = [
  "'self'",
  supabaseOrigin,
  'https://*.supabase.co',
  'wss://*.supabase.co',
  glitchtipOrigin,
  formbricksOrigin,
]
  .filter(Boolean)
  .join(' ');

// next dev's Fast Refresh / HMR runtime evaluates module code via eval(),
// which a CSP without 'unsafe-eval' blocks outright — not a slow-down, a
// hard failure: React never hydrates, every button silently falls back to
// native (non-JS) form behavior, and the page looks fine while being
// completely dead to clicks. `next build` output doesn't use eval(), so
// production keeps the tighter policy; only the dev server gets the
// looser one, scoped by NODE_ENV rather than hand-toggled.
const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  // Next.js's App Router hydration payload ships as inline <script> tags
  // (no nonce plumbing set up yet) — 'unsafe-inline' is required for the
  // app to boot, not an oversight. Tightening this to a nonce-based policy
  // is tracked as follow-up work, not part of this pass.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}${formbricksOrigin ? ` ${formbricksOrigin}` : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src ${connectSrc}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The PDF route (/api/report/pdf) reads the report fonts from
  // process.cwd()/public/fonts at render time. `public/` is served by the CDN
  // but is NOT in a serverless function's filesystem by default, so without
  // this the font read throws in production and the download 500s. Trace the
  // fonts into that one function's bundle.
  outputFileTracingIncludes: {
    '/api/report/pdf': ['./public/fonts/**'],
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

// withSentryConfig injects the client config into the browser bundle and wires
// the server/edge instrumentation. Source-map upload is intentionally left off
// (no org/project/authToken): self-hosted GlitchTip doesn't require it, and the
// build must not depend on a token. When NEXT_PUBLIC_SENTRY_DSN is unset the
// whole SDK is inert (see the sentry.*.config.ts guards).
export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
  sourcemaps: { disable: true },
});
