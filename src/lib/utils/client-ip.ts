/**
 * Utility for extracting the real client IP address safely in a reverse-proxy / Vercel environment.
 *
 * Why this is needed:
 * Standard `request.headers.get('x-forwarded-for')?.split(',')[0]` blindly trusts the first entry
 * in the X-Forwarded-For header, which can be forged / spoofed by an attacker sending custom headers.
 *
 * In Vercel and edge infrastructure:
 * - `x-real-ip`: Set by the edge proxy, representing the actual connected client IP (unspoofable).
 * - `x-vercel-forwarded-for`: Set by Vercel's routing infrastructure.
 * - `x-forwarded-for`: Appended list where client-supplied IPs may be at the start.
 *
 * This function checks trusted platform headers first before falling back to X-Forwarded-For.
 */
export function getClientIp(request: Request): string {
  // 1. Vercel edge trusted client IP
  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  // 2. Vercel forwarded IP
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwarded && vercelForwarded.trim()) {
    const firstVercel = vercelForwarded.split(',')[0].trim();
    if (firstVercel) return firstVercel;
  }

  // 3. Standard forwarded-for fallback (take first if present)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded && forwarded.trim()) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[0];
    }
  }

  // 4. Default fallback
  return '127.0.0.1';
}
