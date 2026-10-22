import { timingSafeEqual } from 'crypto';
import { logger } from '@/lib/utils/logger';
import { checkRateLimit } from '@/lib/utils/rate-limit';

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

/**
 * Whether a cron job may run now: at most `maxPerHour` runs per job, well
 * above the real schedule. A leaked CRON_SECRET then cannot be looped into a
 * stream of paid provider calls, emails and overlapping writes.
 */
export async function cronRunAllowed(job: string, maxPerHour: number): Promise<boolean> {
  const result = await checkRateLimit(`cron:${job}`, maxPerHour, 60 * 60 * 1000);
  if (!result.success) {
    logger.warn('Cron job throttled: too many runs this hour', { service: job });
  }
  return result.success;
}
