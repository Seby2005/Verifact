/**
 * CORS for endpoints that trusted cross-origin clients call: the Chrome
 * extension (`chrome-extension://<id>`) and the Capacitor mobile shell
 * (`https://localhost` on Android, `capacitor://localhost` on iOS). We echo the
 * request Origin only when it is on an explicit allowlist — never a wildcard,
 * because these responses can travel with `Authorization` and a reflected `*`
 * would let any site read an authenticated user's result.
 *
 * Allowed origins come from ALLOWED_EXTENSION_ORIGINS (comma-separated; the name
 * predates the mobile shell but the list now covers both clients). The website's
 * own same-origin calls send no Origin and are unaffected.
 */

function allowlist(): string[] {
  return (process.env.ALLOWED_EXTENSION_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Returns the CORS headers to attach to a response for this request, or an
 * empty object when the origin is absent (same-origin) or not allowlisted.
 */
export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  if (!origin || !allowlist().includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/** Preflight handler shared by a route's OPTIONS export. */
export function handlePreflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
