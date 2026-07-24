/**
 * The browser talks to Supabase directly (auth, profile reads), so the
 * configured Supabase origin has to be in `connect-src`. Hardcoding
 * `https://*.supabase.co` only covers hosted projects: a local stack from
 * `supabase start` (http://127.0.0.1:54321) or a custom domain gets blocked by
 * CSP, and the browser reports that as a bare `TypeError: Failed to fetch`
 * with no indication that CSP was the cause. Deriving the origin from the same
 * env var the client uses keeps the two in step.
 */
function supabaseConnectSources() {
  const sources = new Set(['https://*.supabase.co']);
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (configured) {
    try {
      sources.add(new URL(configured).origin);
    } catch {
      console.warn(
        `[next.config] NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${configured}". ` +
        'Browser requests to Supabase will be blocked by the Content-Security-Policy.'
      );
    }
  }

  // Supabase Realtime uses a WebSocket on the same host.
  for (const origin of Array.from(sources)) {
    sources.add(origin.replace(/^http/, 'ws'));
  }

  return Array.from(sources).join(' ');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              `connect-src 'self' ${supabaseConnectSources()} https://generativelanguage.googleapis.com`,
            ].join('; '),
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
