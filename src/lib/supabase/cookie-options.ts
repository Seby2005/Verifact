/**
 * Session cookie attributes shared by the browser, server and middleware
 * Supabase clients, so the three can never write the same cookie differently.
 *
 * @supabase/ssr never sets `Secure` on its own, which lets the session ride a
 * plain-HTTP request. Production is HTTPS-only, so the flag is always safe
 * there; local `next dev` on http://localhost keeps working without it.
 * `httpOnly` stays off by necessity: the browser client reads the token.
 */
export const SESSION_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};
