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

const connectSrc = [
  "'self'",
  supabaseOrigin,
  'https://*.supabase.co',
  'wss://*.supabase.co',
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
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
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

export default nextConfig;
