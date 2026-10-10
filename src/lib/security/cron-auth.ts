import { timingSafeEqual } from 'crypto';
import { logger } from '@/lib/utils/logger';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Whether a request may trigger a cron job. Accepts the CRON_SECRET as
 * `Authorization: Bearer <secret>` (what Vercel Cron sends) or as the
 * `x-cron-secret` header. Without a CRON_SECRET only local development passes.
 */
export function isCronAuthorized(request: Request, service: string): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('CRON_SECRET is not configured; allowing in development mode', { service });
      return true;
    }
    return false;
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (safeCompare(token, cronSecret)) return true;
  }

  const customHeader = request.headers.get('x-cron-secret');
  return Boolean(customHeader && safeCompare(customHeader.trim(), cronSecret));
}
